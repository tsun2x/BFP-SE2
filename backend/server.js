import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import { createServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import { supabase } from "./supabaseClient.js";

// ── Route imports ────────────────────────────────────────────────────
import authRoutes from "./routes/authRoutes.js";
import incidentRoutes from "./routes/incidentRoutes.js";
import fireStationsRoutes from "./routes/fireStations.js";
import readinessRoutes from "./routes/readinessRoutes.js";
import compatibilityRoutes from "./routes/compatibilityRoutes.js";
import firetruckTrackingRoutes from "./routes/firetruckTrackingRoutes.js";
import newsRoutes from "./routes/newsRoutes.js";
import safetyRoutes from "./routes/safetyRoutes.js";
import contactRoutes from "./routes/contactRoutes.js";
import messageRoutes from "./routes/messageRoutes.js";
import geocodeRoutes from "./routes/geocodeRoutes.js";
import twilioCallbacksRoutes from "./routes/twilioCallbacks.js";
import twilioTokenRoutes from "./routes/twilioTokenRoutes.js";
import fcmRoutes from "./routes/fcmRoutes.js";

// ── Service imports (mark2 — station online tracking + dispatch) ─────
import {
  stationConnected,
  stationDisconnected,
  socketDisconnected,
  getOnlineStationsSummary,
} from "./services/onlineStations.js";
import {
  cancelFailover,
  getFailoverEntry,
  ackIncidentReceived,
} from "./services/dispatchService.js";
import {
  getDispatchGroupForUser,
  getOfficerRoomForUser,
  markOfficerOffline,
  releaseOfficerByAlarm,
  upsertOfficerDispatchStatus,
} from "./services/officerDispatchService.js";
import {
  clearIncidentDismissedByDispatcher,
  markIncidentDismissedByDispatcher,
} from "./services/incidentDismissGuardService.js";

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret_key";

if (!process.env.JWT_SECRET) {
  console.warn(
    "[SECURITY] WARNING: JWT_SECRET is not set — using insecure default. Set JWT_SECRET in production env vars.",
  );
}

const app = express();
const PORT = process.env.PORT || 5000;

// Trust proxy (Cloudflare tunnel) so express-rate-limit reads X-Forwarded-For correctly
app.set("trust proxy", 1);

// ── Security headers ─────────────────────────────────────────────────
app.use(helmet());

// ── CORS ─────────────────────────────────────────────────────────────

// Improved: trim and normalize allowed origins (remove trailing slashes)
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map((origin) =>
      origin.trim().replace(/\/$/, ""),
    )
  : ["http://localhost:5173", "http://localhost:5174", "http://localhost:3000"];

app.use(
  cors({
    origin: (origin, callback) => {
      // Normalize origin for comparison (remove trailing slash)
      const normalizedOrigin = origin ? origin.replace(/\/$/, "") : origin;
      // Allow requests with no origin (mobile apps, server-to-server, Postman)
      if (!normalizedOrigin || allowedOrigins.includes(normalizedOrigin))
        return callback(null, true);
      // Allow Cloudflare tunnel origins
      if (normalizedOrigin && normalizedOrigin.endsWith(".trycloudflare.com"))
        return callback(null, true);
      // Allow Render deployment origins
      if (normalizedOrigin && normalizedOrigin.endsWith(".onrender.com"))
        return callback(null, true);
      // Allow Railway deployment origins
      if (normalizedOrigin && normalizedOrigin.endsWith(".up.railway.app"))
        return callback(null, true);
      callback(new Error(`CORS blocked: ${origin}`));
    },
    credentials: true,
  }),
);

app.use(express.json({ limit: "30mb" }));

// ── Auth rate limiting (brute-force protection) ───────────────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many login attempts. Please try again in 15 minutes.",
  },
});

// Create an HTTP server and attach Socket.IO
const httpServer = createServer(app);
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin))
        return callback(null, true);
      if (origin.endsWith(".trycloudflare.com")) return callback(null, true);
      if (origin.endsWith(".onrender.com")) return callback(null, true);
      if (origin.endsWith(".up.railway.app")) return callback(null, true);
      callback(null, false);
    },
    methods: ["GET", "POST"],
  },
  pingInterval: 10000,
  pingTimeout: 20000,
  connectionStateRecovery: {
    maxDisconnectionDuration: 120000,
    skipMiddlewares: true,
  },
});

let cachedMainStationId = null;
let cachedMainStationIdAt = 0;
const MAIN_STATION_CACHE_TTL_MS = 60_000;

async function getMainStationId() {
  const now = Date.now();
  if (
    cachedMainStationIdAt &&
    now - cachedMainStationIdAt < MAIN_STATION_CACHE_TTL_MS
  ) {
    return cachedMainStationId;
  }

  try {
    const { data, error } = await supabase
      .from("fire_stations")
      .select("station_id")
      .ilike("station_type", "%main%")
      .order("station_id", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.warn(
        `[MainStation] Failed to load main station id: ${error.message}`,
      );
      cachedMainStationId = 1;
    } else {
      cachedMainStationId = Number(data?.station_id || 0) || 1;
    }
  } catch (error) {
    console.warn(
      `[MainStation] Unexpected error while loading main station id: ${error?.message || error}`,
    );
    cachedMainStationId = 1;
  }

  cachedMainStationIdAt = now;
  return cachedMainStationId;
}

// Expose io to routes via app.get('io')
app.set("io", io);

io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id);

  const getDecodedToken = (token) => {
    if (!token) return null;

    try {
      return jwt.verify(token, JWT_SECRET);
    } catch (error) {
      console.warn(
        `[Socket] Token verification failed (socket ${socket.id}): ${error.message}`,
      );
      return null;
    }
  };

  // ── Station online tracking (mark2) ───────────────────────────────
  socket.on("station-online", async (data) => {
    console.log(
      "[OnlineStations] Raw station-online data:",
      JSON.stringify(data),
      "type:",
      typeof data,
    );
    const stationId = data?.stationId || data;
    console.log(
      "[OnlineStations] Resolved stationId:",
      stationId,
      "type:",
      typeof stationId,
    );
    if (stationId) {
      socket._stationId = Number(stationId);
      await stationConnected(Number(stationId), socket.id);
      socket.join(`station-${stationId}`);
      io.emit("stations-online-update", getOnlineStationsSummary());
    }
  });

  // ── join-station (redundant room join for reconnect resilience) ────
  socket.on("join-station", async (data) => {
    const stationId = data?.stationId || data;
    if (stationId) {
      socket.join(`station-${stationId}`);
      // Treat join-station as a lightweight online announcement so
      // clients that only emit join-station are still tracked as online.
      socket._stationId = Number(stationId);
      try {
        await stationConnected(Number(stationId), socket.id);
      } catch (err) {
        console.warn(
          `[Socket] stationConnected failed for station=${stationId} socket=${socket.id}: ${err.message}`,
        );
      }
      io.emit("stations-online-update", getOnlineStationsSummary());
      console.log(
        `[Socket] Station joined room station-${stationId} via join-station (socket ${socket.id})`,
      );
    }
  });

  // ── Main admin room (mark2) ────────────────────────────────────────
  socket.on("join-main-admin", async (data = {}) => {
    const token = data?.token;

    if (!token) {
      console.warn(
        `[Socket] Rejected join-main-admin without token (socket ${socket.id})`,
      );
      return;
    }

    let decoded = null;
    try {
      decoded = jwt.verify(token, JWT_SECRET);

      if (decoded?.role !== "admin") {
        console.warn(
          `[Socket] Rejected join-main-admin for non-admin role=${decoded?.role || "unknown"} user=${decoded?.id || "unknown"} (socket ${socket.id})`,
        );
        return;
      }
    } catch (error) {
      console.warn(
        `[Socket] Rejected join-main-admin with invalid token (socket ${socket.id}): ${error.message}`,
      );
      return;
    }

    socket.join("main-admin");
    const assignedStationId =
      Number(decoded?.assignedStationId || decoded?.assigned_station_id || 0) ||
      null;

    // Mark the assigned station (or main station) as online
    if (assignedStationId) {
      socket._stationId = assignedStationId;
      try {
        await stationConnected(assignedStationId, socket.id);
      } catch (error) {
        console.warn(
          `[Socket] Failed to mark station online for main admin user=${decoded?.id} station=${assignedStationId}:`,
          error.message,
        );
      }
    }

    console.log(
      `[Socket] Main admin joined room main-admin (socket ${socket.id})`,
    );
  });

  socket.on("join-dispatcher", async (data = {}) => {
    const decoded = getDecodedToken(data?.token);

    if (!decoded) {
      console.warn(
        `[Socket] Rejected join-dispatcher without valid token (socket ${socket.id})`,
      );
      return;
    }

    const role = String(decoded?.role || "").toLowerCase();
    if (!["admin", "substation_admin"].includes(role)) {
      console.warn(
        `[Socket] Rejected join-dispatcher for unsupported role=${decoded?.role || "unknown"} user=${decoded?.id || "unknown"} (socket ${socket.id})`,
      );
      return;
    }

    const user = {
      id: decoded?.id,
      role,
      assignedStationId:
        Number(
          decoded?.assignedStationId || decoded?.assigned_station_id || 0,
        ) || null,
    };
    const dispatchGroup = getDispatchGroupForUser(user);
    const officerRoom = getOfficerRoomForUser(user.id);

    if (!dispatchGroup || !officerRoom) {
      console.warn(
        `[Socket] Rejected join-dispatcher without dispatch metadata user=${decoded?.id || "unknown"} (socket ${socket.id})`,
      );
      return;
    }

    socket._dispatcherUserId = Number(user.id);
    socket._dispatcherDispatchGroup = dispatchGroup;
    socket._stationId = user.assignedStationId; // Track station on socket
    socket.join(officerRoom);

    if (dispatchGroup === "main-admin") {
      socket.join("main-admin");
    }

    // Mark station as online if dispatcher belongs to a station
    if (user.assignedStationId) {
      try {
        await stationConnected(user.assignedStationId, socket.id);
      } catch (error) {
        console.warn(
          `[Socket] Failed to mark station online for dispatcher user=${user.id} station=${user.assignedStationId}:`,
          error.message,
        );
      }
    }

    try {
      await upsertOfficerDispatchStatus({
        userId: user.id,
        stationId: user.assignedStationId,
        role,
        dispatchGroup,
        isOnline: true,
        isBusy: false,
        currentAlarmId: null,
      });
    } catch (error) {
      console.error(
        `[Socket] Failed to upsert dispatcher status user=${user.id}:`,
        error.message,
      );
    }

    console.log(
      `[Socket] Dispatcher user ${user.id} joined ${officerRoom} (${dispatchGroup}) (socket ${socket.id})`,
    );
  });

  socket.on("dispatcher-dismiss-incident", (data = {}) => {
    const dispatcherUserId = Number(socket?._dispatcherUserId || 0) || null;
    const alarmId = Number(data?.alarmId || 0) || null;
    const cooldownMs = Number(data?.cooldownMs || 0) || undefined;

    if (!dispatcherUserId || !alarmId) {
      return;
    }

    const marked = markIncidentDismissedByDispatcher({
      alarmId,
      dispatcherUserId,
      cooldownMs,
    });

    if (marked) {
      console.log(
        `[Socket] Dispatcher user ${dispatcherUserId} dismissed alarm ${alarmId} (cooldown=${cooldownMs || 30000}ms)`,
      );
    }
  });

  socket.on("dispatcher-undo-dismiss-incident", (data = {}) => {
    const dispatcherUserId = Number(socket?._dispatcherUserId || 0) || null;
    const alarmId = Number(data?.alarmId || 0) || null;

    if (!dispatcherUserId || !alarmId) {
      return;
    }

    const cleared = clearIncidentDismissedByDispatcher({
      alarmId,
      dispatcherUserId,
    });

    if (cleared) {
      console.log(
        `[Socket] Dispatcher user ${dispatcherUserId} cleared dismiss for alarm ${alarmId}`,
      );
    }
  });

  socket.on("join-driver-station", (data = {}) => {
    const token = data?.token;
    const requestedStationId = Number(data?.stationId || 0) || null;
    const decoded = getDecodedToken(token);

    if (!decoded) {
      console.warn(
        `[Socket] Rejected join-driver-station without valid token (socket ${socket.id})`,
      );
      return;
    }

    if (String(decoded?.role || "").toLowerCase() !== "driver") {
      console.warn(
        `[Socket] Rejected join-driver-station for non-driver role=${decoded?.role || "unknown"} user=${decoded?.id || "unknown"} (socket ${socket.id})`,
      );
      return;
    }

    const assignedStationId =
      Number(decoded?.assignedStationId || decoded?.assigned_station_id || 0) ||
      null;

    if (!assignedStationId) {
      console.warn(
        `[Socket] Rejected join-driver-station without assigned station user=${decoded?.id || "unknown"} (socket ${socket.id})`,
      );
      return;
    }

    if (requestedStationId && requestedStationId !== assignedStationId) {
      console.warn(
        `[Socket] Rejected join-driver-station station mismatch requested=${requestedStationId} assigned=${assignedStationId} user=${decoded?.id || "unknown"} (socket ${socket.id})`,
      );
      return;
    }

    socket.join(`driver-station-${assignedStationId}`);
    socket._driverStationId = assignedStationId;
    socket._driverUserId = decoded.id || null;
    console.log(
      `[Socket] Driver user ${decoded.id} joined room driver-station-${assignedStationId} (socket ${socket.id})`,
    );
  });

  // ── Civilian alarm room (mark2) ────────────────────────────────────
  socket.on("join-alarm", (data) => {
    const alarmId = data?.alarmId;
    if (alarmId) {
      socket.join(`alarm-${alarmId}`);
      console.log(
        `[Socket] Civilian joined room alarm-${alarmId} (socket ${socket.id})`,
      );
    }
  });

  // ── Civilian cancels call (mark2) ─────────────────────────────────
  socket.on("call-cancelled", async (data) => {
    const alarmId = data?.alarmId;
    if (!alarmId) return;
    console.log(`[Socket] Civilian cancelled call for alarm ${alarmId}`);
    const entry = getFailoverEntry(alarmId);
    const requestedStationIdRaw = data?.stationId;
    const requestedStationId =
      requestedStationIdRaw === "main"
        ? "main"
        : Number(requestedStationIdRaw || 0) || null;
    const currentStationId = entry?.stationId || requestedStationId;
    const payload = {
      alarmId: Number(alarmId),
      initiator: "civilian",
      stationId: currentStationId,
      stationName: data?.stationName || null,
      endedAt: new Date().toISOString(),
    };
    cancelFailover(alarmId);
    await releaseOfficerByAlarm(alarmId);

    // Stamp call_ended_at so the 5-minute post-call evidence window starts
    try {
      await supabase
        .from("alarms")
        .update({ call_ended_at: new Date().toISOString() })
        .eq("alarm_id", Number(alarmId))
        .is("call_ended_at", null);
    } catch (ceErr) {
      console.warn(
        `[Socket] Failed to set call_ended_at for alarm ${alarmId}: ${ceErr.message}`,
      );
    }

    io.to(`alarm-${alarmId}`).emit("call-ended", payload);
    if (currentStationId && currentStationId !== "main") {
      io.to(`station-${currentStationId}`).emit("call-ended", payload);
    }
    io.to("main-admin").emit("call-ended", payload);
    if (currentStationId && currentStationId !== "main") {
      io.to(`station-${currentStationId}`).emit("auto-reject", { alarmId });
      console.log(
        `[Socket] Sent auto-reject to station-${currentStationId} (civilian cancelled)`,
      );
    }
    io.to("main-admin").emit("auto-reject", { alarmId });
    console.log(`[Socket] Sent auto-reject to main-admin (civilian cancelled)`);
  });

  socket.on("dispatcher-end-call", async (data = {}) => {
    const alarmId = Number(data?.alarmId || 0) || null;
    if (!alarmId) return;

    const stationIdRaw = data?.stationId;
    const stationId =
      stationIdRaw === "main" ? "main" : Number(stationIdRaw || 0) || null;
    const payload = {
      alarmId,
      initiator: data?.initiator || "dispatcher",
      stationId,
      stationName: data?.stationName || null,
      endedAt: data?.endedAt || new Date().toISOString(),
    };

    console.log(
      `[Socket] Dispatcher ended call for alarm ${alarmId} from ${stationId || "unknown-station"}`,
    );

    // Backend ownership guard: only the currently assigned handler can end a call globally.
    // This prevents a previously transferred-from station tab from terminating the active call.
    try {
      const { data: alarmRow, error: alarmErr } = await supabase
        .from("alarms")
        .select("alarm_id, assigned_station_id")
        .eq("alarm_id", alarmId)
        .maybeSingle();

      if (alarmErr) {
        console.warn(
          `[Socket] dispatcher-end-call ownership lookup failed for alarm ${alarmId}: ${alarmErr.message}`,
        );
        return;
      }

      const assignedStationId =
        Number(alarmRow?.assigned_station_id || 0) || null;
      const requesterIsMain = stationId === "main";
      const mainStationId = await getMainStationId();
      const requesterStationId = requesterIsMain
        ? mainStationId
        : Number(stationId || 0) || null;
      const mainOwnershipMatch =
        requesterIsMain &&
        (assignedStationId === mainStationId ||
          assignedStationId === 1 ||
          assignedStationId === null);

      if (!mainOwnershipMatch && assignedStationId !== requesterStationId) {
        console.warn(
          `[Socket] Ignored dispatcher-end-call for alarm ${alarmId}: requester station=${stationId || "none"}, assigned station=${assignedStationId || "none"}`,
        );
        return;
      }
    } catch (ownershipErr) {
      console.warn(
        `[Socket] dispatcher-end-call ownership guard error for alarm ${alarmId}: ${ownershipErr.message}`,
      );
      return;
    }

    cancelFailover(alarmId);
    await releaseOfficerByAlarm(alarmId);

    // Stamp call_ended_at so the 5-minute post-call evidence window starts
    try {
      await supabase
        .from("alarms")
        .update({ call_ended_at: new Date().toISOString() })
        .eq("alarm_id", alarmId)
        .is("call_ended_at", null);
    } catch (ceErr) {
      console.warn(
        `[Socket] Failed to set call_ended_at for alarm ${alarmId}: ${ceErr.message}`,
      );
    }

    io.to(`alarm-${alarmId}`).emit("call-ended", payload);
    io.to("main-admin").emit("call-ended", payload);

    if (stationId && stationId !== "main") {
      io.to(`station-${stationId}`).emit("call-ended", payload);
    }
  });

  // ── Station acknowledges it received the incident (handshake) ────────
  socket.on("incident-received", (data) => {
    const alarmId = data?.alarmId;
    if (!alarmId) return;
    console.log(`[Socket] Station acknowledged incident ${alarmId}`);
    ackIncidentReceived(alarmId);
  });

  // ── New incident from mobile/station (both branches) ─────────────
  socket.on("new-incident", async (data) => {
    console.log("[Socket] Received new-incident event:", data);
    try {
      const { data: callerRows } = await supabase
        .from("users")
        .select("user_id")
        .eq("phone_number", data.phoneNumber)
        .single();

      let callerId;

      if (!callerRows) {
        const names = `${data.firstName || ""} ${data.lastName || ""}`
          .trim()
          .split(" ");
        const fname = names[0] || "Unknown";
        const lname = names[1] || "Caller";
        const fullName = `${fname} ${lname}`;

        const { data: newUser } = await supabase
          .from("users")
          .insert([
            {
              first_name: fname,
              last_name: lname,
              full_name: fullName,
              phone_number: data.phoneNumber,
              password: "temp_" + Date.now(),
              role: "end_user",
              email: `caller_${Date.now()}@bfp.gov`,
              id_number: `caller_${Date.now()}`,
            },
          ])
          .select("user_id")
          .single();

        callerId = newUser?.user_id;
      } else {
        callerId = callerRows.user_id;
      }

      const alarmLevelEnum = (data.alarmLevel || "").includes("Alarm")
        ? data.alarmLevel.replace(/st|nd|rd|th\s/, "")
        : "Alarm 1";

      const { data: alarmResult } = await supabase
        .from("alarms")
        .insert([
          {
            end_user_id: callerId,
            user_latitude:
              data.coordinates?.latitude || data.coordinates?.lat || 0,
            user_longitude:
              data.coordinates?.longitude || data.coordinates?.lng || 0,
            initial_alarm_level: alarmLevelEnum,
            current_alarm_level: alarmLevelEnum,
            status: "Pending Dispatch",
          },
        ])
        .select("alarm_id")
        .single();

      const alarmId = alarmResult?.alarm_id;
      console.log("[Socket] Incident saved to database - alarmId:", alarmId);

      io.emit("incident-created", {
        alarmId,
        callerId,
        phoneNumber: data.phoneNumber,
        coordinates: {
          latitude: data.coordinates?.latitude,
          longitude: data.coordinates?.longitude,
        },
        alarmLevel: alarmLevelEnum,
        status: "Pending Dispatch",
        createdAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error("[Socket] Error saving incident to database:", error);
    }
  });

  // ── Firetruck driver room + status broadcasting ──────────────────
  socket.on("join-truck", (data) => {
    const truckId = data?.truckId;
    if (truckId) {
      socket.join(`truck-${truckId}`);
      socket._truckId = truckId;
      console.log(
        `[Socket] Truck ${truckId} joined room truck-${truckId} (socket ${socket.id})`,
      );
    }
  });

  // Driver broadcasts status/alarm update via socket (real-time, no REST needed)
  socket.on("truck-status-update", (data) => {
    const truckId = Number(data?.truckId || 0) || null;
    if (!truckId) {
      console.warn(
        `[Socket] Ignored truck-status-update without valid truckId (socket ${socket.id})`,
      );
      return;
    }

    console.log(
      "[Socket] truck-status-update from driver:",
      JSON.stringify(data),
    );
    // Re-broadcast to all clients (admins, end-users, other trucks)
    socket.broadcast.emit("truck-status-update", {
      ...data,
      truckId,
    });

    // Also persist location to DB so the admin map polling endpoint picks it up
    const lat = Number(data?.latitude);
    const lng = Number(data?.longitude);
    if (truckId && Number.isFinite(lat) && Number.isFinite(lng)) {
      supabase
        .from("firetruck_location_history")
        .insert([
          {
            truck_id: truckId,
            latitude: lat,
            longitude: lng,
            recorded_at: new Date().toISOString(),
          },
        ])
        .then(({ error }) => {
          if (error)
            console.error(
              "[Socket] Failed to save firetruck location:",
              error.message,
            );
        });
    }
  });

  // ── Alarm subscription (both branches) ───────────────────────────
  socket.on("subscribe-to-alarm", (alarmId) => {
    console.log(`[Socket] Client ${socket.id} subscribed to alarm ${alarmId}`);
    socket.join(`alarm-${alarmId}`);
  });

  socket.on("unsubscribe-from-alarm", (alarmId) => {
    console.log(
      `[Socket] Client ${socket.id} unsubscribed from alarm ${alarmId}`,
    );
    socket.leave(`alarm-${alarmId}`);
  });

  // ── Disconnect (mark2 — includes online station cleanup) ──────────
  socket.on("disconnect", async () => {
    console.log("Socket disconnected:", socket.id);
    if (socket._stationId) {
      await stationDisconnected(socket._stationId, socket.id);
    } else {
      await socketDisconnected(socket.id);
    }

    if (socket._dispatcherUserId) {
      try {
        await markOfficerOffline(socket._dispatcherUserId);
      } catch (error) {
        console.error(
          `[Socket] Failed to mark dispatcher offline user=${socket._dispatcherUserId}:`,
          error.message,
        );
      }
    }

    io.emit("stations-online-update", getOnlineStationsSummary());
  });
});

// ── Route registration ───────────────────────────────────────────────

// Auth routes — rate limit only login endpoints, not all auth routes
app.post("/api/login", authLimiter);
app.post("/api/substation-login", authLimiter);
app.use("/api", authRoutes);

// News routes (web admin — mine/UI-redesign)
app.use("/api", newsRoutes);

// Safety tips + categories routes (web admin — mine/UI-redesign)
app.use("/api", safetyRoutes);

// Emergency contacts routes
app.use("/api", contactRoutes);

// Incident routes
app.use("/api", incidentRoutes);

// Readiness routes
app.use("/api", readinessRoutes);

// Fire stations resource
app.use("/api", fireStationsRoutes);

// Firetruck tracking routes (web admin — mine/UI-redesign)
app.use("/api", firetruckTrackingRoutes);

// Compatibility routes — old PHP endpoint paths for mobile app backward compat
app.use("/api", compatibilityRoutes);

// Messaging routes (web admin — mine/UI-redesign)
app.use("/api", messageRoutes);

// Geocoding proxy routes (Nominatim)
app.use("/api", geocodeRoutes);

// Twilio callbacks — unauthenticated, accepts Twilio webhooks only (mark2/main)
app.use("/api", twilioCallbacksRoutes);

// Twilio token generation + voice TwiML webhook (mark2/main)
app.use(express.urlencoded({ extended: false, limit: "30mb" })); // Twilio sends form-encoded POSTs
app.use("/api", twilioTokenRoutes);

// FCM push notification token registration
app.use("/api", fcmRoutes);

// ── Online stations endpoint (mark2/main) — merge socket + DB is_online ─
app.get("/api/stations/online", async (req, res) => {
  try {
    const socketList = getOnlineStationsSummary(); // [{ stationId, connections }]
    const map = new Map();
    (socketList || []).forEach((s) => {
      const id = Number(s.stationId);
      map.set(id, {
        stationId: id,
        connections: s.connections || 0,
        socketOnline: true,
        dbOnline: false,
      });
    });

    // Fetch DB rows where is_online = true
    const { data: rows, error } = await supabase
      .from("station_current_status")
      .select("station_id, readiness_status, readiness_percentage, is_online")
      .eq("is_online", true);

    if (error) {
      console.warn("[OnlineStationsAPI] Supabase query error:", error);
    } else {
      (rows || []).forEach((r) => {
        const id = Number(r.station_id);
        if (map.has(id)) {
          const e = map.get(id);
          e.dbOnline = true;
          if (typeof e.readiness_status === "undefined")
            e.readiness_status = r.readiness_status;
          if (typeof e.readiness_percentage === "undefined")
            e.readiness_percentage = r.readiness_percentage;
        } else {
          map.set(id, {
            stationId: id,
            connections: 0,
            socketOnline: false,
            dbOnline: true,
            readiness_status: r.readiness_status,
            readiness_percentage: r.readiness_percentage,
          });
        }
      });
    }

    const online = Array.from(map.values());
    res.json({ online });
  } catch (err) {
    console.error("[OnlineStationsAPI] error:", err);
    res.status(500).json({ error: err.message || String(err) });
  }
});

// ── Health check ──────────────────────────────────────────────────────
app.get("/api/health", async (req, res) => {
  try {
    // Use a non-aggregate query for health check
    const { error } = await supabase
      .from("users")
      .select("*", { head: true, limit: 1 });
    if (error) {
      return res.status(500).json({
        status: "ERROR",
        message: "Failed to connect to database",
        error: error.message,
      });
    }
    res.json({
      status: "OK",
      message: "Server is running",
      database: "Connected to Supabase",
    });
  } catch (error) {
    console.error("Database connection error:", error);
    res.status(500).json({
      status: "ERROR",
      message: "Failed to connect to database",
      error: error.message,
    });
  }
});

// ── Auto-update TwiML App Voice URL on startup (mark2/main) ──────────
async function updateTwimlAppUrl() {
  const {
    TWILIO_ACCOUNT_SID,
    TWILIO_AUTH_TOKEN,
    TWILIO_TWIML_APP_SID,
    PUBLIC_BASE_URL,
  } = process.env;
  if (
    !TWILIO_ACCOUNT_SID ||
    !TWILIO_AUTH_TOKEN ||
    !TWILIO_TWIML_APP_SID ||
    !PUBLIC_BASE_URL
  ) {
    console.warn("[TwiML] Skipping TwiML App URL update — missing env vars");
    return;
  }
  const voiceUrl = `${PUBLIC_BASE_URL.replace(/\/$/, "")}/api/twilio/voice`;
  try {
    const twilioModule = await import("twilio");
    const twilioClient = twilioModule.default(
      TWILIO_ACCOUNT_SID,
      TWILIO_AUTH_TOKEN,
    );
    await twilioClient.applications(TWILIO_TWIML_APP_SID).update({
      voiceUrl,
      voiceMethod: "POST",
    });
    console.log(`[TwiML] Updated TwiML App voice URL → ${voiceUrl}`);
  } catch (err) {
    console.error("[TwiML] Failed to update TwiML App URL:", err.message);
  }
}

// Start HTTP server (with Socket.IO)
httpServer.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  updateTwimlAppUrl();
});

// ── Global error handler ──────────────────────────────────────────────
// Must be defined after all routes
app.use((err, req, res, next) => {
  // eslint-disable-line no-unused-vars
  const status = err.status || 500;
  const message =
    process.env.NODE_ENV === "production"
      ? "Internal server error"
      : err.message || "Internal server error";
  console.error(`[Error] ${req.method} ${req.path} →`, err.message);
  res.status(status).json({ success: false, message });
});
