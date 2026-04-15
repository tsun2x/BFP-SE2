import express from "express";
import { randomUUID } from "crypto";
import multer from "multer";
import { supabase } from "../supabaseClient.js";
import {
  authenticateToken,
  optionalAuthenticateToken,
} from "../middleware/auth.js";
import {
  requireRoles,
  isAdminUser,
  getUserStationId,
} from "../middleware/role.js";
import {
  acceptIncident,
  dispatchIncidentToGroup,
  startFailover,
  startMainAdminFailover,
  getRankedStations,
  cancelFailover,
} from "../services/dispatchService.js";
import { getOnlineStationIds } from "../services/onlineStations.js";
import { markOfficerBusy } from "../services/officerDispatchService.js";
import { emitIncomingIncidentWithDismissGuard } from "../services/incidentDismissGuardService.js";

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 30 * 1024 * 1024 },
});

const INCIDENT_EVIDENCE_BUCKET = "incident-evidence";
const ALLOWED_EVIDENCE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]);
const MAX_EVIDENCE_SIZE_BYTES = 8 * 1024 * 1024;
const POST_CALL_UPLOAD_WINDOW_MS = 5 * 60 * 1000;

function normalizeMimeType(value) {
  return String(value || "").trim().toLowerCase();
}

function isAllowedEvidenceMimeType(value) {
  return ALLOWED_EVIDENCE_MIME_TYPES.has(normalizeMimeType(value));
}

function toIsoOrNull(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function resolveCallEndedAt(alarmRow) {
  const callEndedAt = alarmRow?.call_ended_at || alarmRow?.resolve_time || null;
  if (!callEndedAt) return null;
  const date = new Date(callEndedAt);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getUploadWindowForAlarm(alarmRow) {
  const callEndedAtDate = resolveCallEndedAt(alarmRow);
  if (!callEndedAtDate) {
    return {
      uploadAllowed: true,
      callEndedAt: null,
      allowedUntil: null,
      secondsRemaining: null,
    };
  }

  const allowedUntil = new Date(
    callEndedAtDate.getTime() + POST_CALL_UPLOAD_WINDOW_MS,
  );
  const msRemaining = allowedUntil.getTime() - Date.now();

  return {
    uploadAllowed: msRemaining >= 0,
    callEndedAt: callEndedAtDate.toISOString(),
    allowedUntil: allowedUntil.toISOString(),
    secondsRemaining: Math.max(0, Math.floor(msRemaining / 1000)),
  };
}

function buildIncidentEvidenceStoragePath({ alarmId, userId, mimeType }) {
  const now = new Date();
  const yyyy = String(now.getUTCFullYear());
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(now.getUTCDate()).padStart(2, "0");
  const unixTs = String(Math.floor(now.getTime() / 1000)).padStart(10, "0");
  const ext = extFromMime(mimeType);
  return `alarms/${alarmId}/caller/${userId}/${yyyy}/${mm}/${dd}/${unixTs}_${randomUUID()}.${ext}`;
}

function isStoragePathOwnedByCaller({ storagePath, alarmId, userId }) {
  const expectedPrefix = `alarms/${alarmId}/caller/${userId}/`;
  return String(storagePath || "").startsWith(expectedPrefix);
}

async function getAlarmForEvidence(alarmId) {
  const withCallEndedFields =
    "alarm_id,end_user_id,assigned_station_id,call_time,call_ended_at,resolve_time,status,users!end_user_id(full_name,phone_number)";
  const fallbackFields =
    "alarm_id,end_user_id,assigned_station_id,call_time,resolve_time,status,users!end_user_id(full_name,phone_number)";

  let query = await supabase
    .from("alarms")
    .select(withCallEndedFields)
    .eq("alarm_id", alarmId)
    .maybeSingle();

  if (
    query?.error &&
    String(query.error.message || "")
      .toLowerCase()
      .includes("call_ended_at")
  ) {
    query = await supabase
      .from("alarms")
      .select(fallbackFields)
      .eq("alarm_id", alarmId)
      .maybeSingle();
  }

  return query;
}

function canUserReadIncidentEvidence({ alarm, user }) {
  const role = String(user?.role || "").toLowerCase();
  const userId = Number(user?.id || 0) || null;
  const userStationId =
    Number(user?.assignedStationId || user?.assigned_station_id || 0) || null;
  const alarmStationId = Number(alarm?.assigned_station_id || 0) || null;

  if (!userId) return false;
  if (role === "admin" || role === "super_admin") return true;
  if (role === "end_user") return Number(alarm?.end_user_id || 0) === userId;

  if (role === "substation_admin") {
    return Boolean(alarmStationId && userStationId && alarmStationId === userStationId);
  }

  return false;
}

async function createSignedEvidenceUrl(path, ttlSec = 3600) {
  console.log(`[SignedUrl] Creating signed URL for bucket=${INCIDENT_EVIDENCE_BUCKET}, path=${path}`);
  const { data, error } = await supabase.storage
    .from(INCIDENT_EVIDENCE_BUCKET)
    .createSignedUrl(path, ttlSec);

  if (error) {
    console.error(`[SignedUrl] Failed to create signed URL:`, error);
    // Fallback to public URL if signed URL fails
    console.log(`[SignedUrl] Falling back to public URL...`);
    const { data: publicData } = await supabase.storage
      .from(INCIDENT_EVIDENCE_BUCKET)
      .getPublicUrl(path);
    return publicData?.publicUrl || null;
  }

  console.log(`[SignedUrl] Signed URL created successfully: ${data?.signedUrl ? 'YES' : 'NO'}`);
  return data?.signedUrl || null;
}

async function insertIncidentEvidenceRecord({
  alarmId,
  userId,
  stationId,
  bucket,
  storagePath,
  mimeType,
  fileSizeBytes,
  capturePhase,
  uploadedAt,
}) {
  const payload = {
    alarm_id: alarmId,
    uploaded_by_user_id: userId,
    station_id: stationId || null,
    storage_bucket: bucket,
    storage_path: storagePath,
    mime_type: mimeType,
    file_size_bytes: fileSizeBytes || null,
    capture_phase: capturePhase,
    source: capturePhase === "post_call" ? "caller_post_call" : "caller_in_call",
    uploaded_at: uploadedAt || new Date().toISOString(),
  };

  console.log("[EvidenceInsert] Attempting insert with payload:", {
    alarmId,
    userId,
    stationId,
    storagePath,
    mimeType,
    capturePhase,
  });

  // Guard against duplicate inserts (e.g. network retry sending complete twice)
  const { data: existing, error: existingError } = await supabase
    .from("incident_evidence")
    .select("*")
    .eq("storage_path", storagePath)
    .maybeSingle();

  if (existingError) {
    console.error("[EvidenceInsert] Duplicate check query failed:", existingError);
  }

  if (existing) {
    console.log("[EvidenceInsert] Found existing record, returning it:", existing.evidence_id);
    return existing;
  }

  console.log("[EvidenceInsert] No duplicate found, inserting new record...");
  const { data, error } = await supabase
    .from("incident_evidence")
    .insert([payload])
    .select("*")
    .single();

  if (error) {
    console.error("[EvidenceInsert] Insert failed:", error);
    console.error("[EvidenceInsert] Full error details:", JSON.stringify(error, null, 2));
    throw error;
  }

  console.log("[EvidenceInsert] Insert succeeded, evidence_id:", data.evidence_id);
  return data;
}

function isDataUrl(value) {
  return typeof value === "string" && value.startsWith("data:");
}

function dataUrlToBuffer(dataUrl) {
  const match = String(dataUrl).match(/^data:(.+);base64,(.*)$/);
  if (!match) {
    throw new Error("Invalid evidence image data URL");
  }

  const mime = match[1];
  const base64 = match[2];
  return { mime, buffer: Buffer.from(base64, "base64") };
}

function extFromMime(mime) {
  if (!mime) return "jpg";
  if (mime.includes("png")) return "png";
  if (mime.includes("webp")) return "webp";
  if (mime.includes("gif")) return "gif";
  if (mime.includes("jpeg") || mime.includes("jpg")) return "jpg";
  return "jpg";
}

async function uploadIncidentEvidence(dataUrl, alarmId) {
  const { mime, buffer } = dataUrlToBuffer(dataUrl);
  const ext = extFromMime(mime);
  const filePath = `incident_evidence/alarm_${alarmId}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(INCIDENT_EVIDENCE_BUCKET)
    .upload(filePath, buffer, {
      contentType: mime,
      upsert: true,
    });

  if (uploadError) {
    throw new Error(uploadError.message || "Failed to upload incident evidence image");
  }

  const { data } = supabase.storage
    .from(INCIDENT_EVIDENCE_BUCKET)
    .getPublicUrl(filePath);

  return data?.publicUrl || null;
}

async function uploadIncidentEvidenceBuffer({ buffer, mime, alarmId, prefix }) {
  const ext = extFromMime(mime);
  const safePrefix = prefix || "media";
  const filePath = `incident_evidence/alarm_${alarmId}_${safePrefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(INCIDENT_EVIDENCE_BUCKET)
    .upload(filePath, buffer, {
      contentType: mime,
      upsert: true,
    });

  if (uploadError) {
    throw new Error(uploadError.message || "Failed to upload incident evidence media");
  }

  const { data } = supabase.storage
    .from(INCIDENT_EVIDENCE_BUCKET)
    .getPublicUrl(filePath);

  return data?.publicUrl || null;
}

// ── Haversine distance (km) between two lat/lng pairs (mark2) ────────
function haversineKm(lat1, lon1, lat2, lon2) {
  const toRad = (v) => (v * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function getOnlineFallbackStations(latitude, longitude, onlineIds) {
  if (!onlineIds || onlineIds.size === 0) return [];

  const { data: stations, error } = await supabase
    .from("fire_stations")
    .select(
      "station_id, station_name, station_type, latitude, longitude, contact_number",
    )
    .in("station_id", [...onlineIds]);

  if (error) throw error;

  return (stations || [])
    .filter(
      (station) => String(station.station_type || "").toLowerCase() !== "main",
    )
    .map((station) => ({
      ...station,
      distance: haversineKm(
        parseFloat(latitude),
        parseFloat(longitude),
        parseFloat(station.latitude),
        parseFloat(station.longitude),
      ),
    }))
    .sort((a, b) => a.distance - b.distance);
}

function isMainAdminOnline(io) {
  const room = io?.sockets?.adapter?.rooms?.get("main-admin");
  return Boolean(room && room.size > 0);
}

async function getMainStationInfo() {
  const { data, error } = await supabase
    .from("fire_stations")
    .select("station_id, station_name")
    .ilike("station_type", "main")
    .order("station_id", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data || null;
}

function splitCallerName(fullName) {
  const normalized = String(fullName || "").trim();
  if (!normalized) {
    return {
      firstName: null,
      lastName: null,
    };
  }

  const parts = normalized.split(/\s+/);
  return {
    firstName: parts[0] || null,
    lastName: parts.slice(1).join(" ") || null,
  };
}

function buildTwilioDispatcherIdentity({ isMain, stationId, officerId }) {
  const normalizedOfficerId = Number(officerId || 0) || null;
  const normalizedStationId = Number(stationId || 0) || null;

  if (isMain || normalizedStationId === 1) {
    return normalizedOfficerId ? `ADM_MAIN_${normalizedOfficerId}` : "ADM_MAIN";
  }

  if (!normalizedStationId) {
    return null;
  }

  return normalizedOfficerId
    ? `ADM_SUB_${normalizedStationId}_${normalizedOfficerId}`
    : `ADM_SUB_${normalizedStationId}`;
}

async function resolveFallbackOfficerId({ isMain, stationId }) {
  try {
    if (isMain || Number(stationId || 0) === 1) {
      const { data } = await supabase
        .from("users")
        .select("user_id")
        .eq("role", "admin")
        .order("user_id", { ascending: true })
        .limit(1)
        .maybeSingle();

      return Number(data?.user_id || 0) || null;
    }

    const normalizedStationId = Number(stationId || 0) || null;
    if (!normalizedStationId) return null;

    const { data } = await supabase
      .from("users")
      .select("user_id")
      .eq("assigned_station_id", normalizedStationId)
      .in("role", ["admin", "substation_admin"])
      .order("user_id", { ascending: true })
      .limit(1)
      .maybeSingle();

    return Number(data?.user_id || 0) || null;
  } catch (error) {
    console.warn(
      `[CreateIncident] Failed to resolve fallback officer identity: ${error?.message || error}`,
    );
    return null;
  }
}

function isPlaceholderCallerName(fullName, firstName, lastName) {
  const normalizedFullName = String(fullName || "")
    .trim()
    .toLowerCase();
  const normalizedFirstName = String(firstName || "")
    .trim()
    .toLowerCase();
  const normalizedLastName = String(lastName || "")
    .trim()
    .toLowerCase();

  return (
    !normalizedFullName ||
    normalizedFullName === "unknown caller" ||
    normalizedFirstName === "unknown" ||
    normalizedLastName === "caller"
  );
}

function buildDriverDispatchPayload({ alarm, report }) {
  const callerFullName = alarm?.users?.full_name || null;
  const callerPhone = alarm?.users?.phone_number || null;
  const stationName = alarm?.fire_stations?.station_name || null;
  const { firstName, lastName } = splitCallerName(callerFullName);

  return {
    alarmId: alarm.alarm_id,
    callerId: alarm.end_user_id,
    callerFullName,
    firstName,
    lastName,
    phoneNumber: callerPhone,
    incidentType: report?.incident_type || null,
    alarmLevel: alarm.current_alarm_level || alarm.initial_alarm_level || null,
    location: report?.location || null,
    narrative: report?.narrative || null,
    coordinates: {
      latitude: alarm.user_latitude,
      longitude: alarm.user_longitude,
    },
    assignedStationId: alarm.assigned_station_id,
    stationName,
    reportType: report?.report_type || null,
    dispatchSource: "station-report",
  };
}

function parseIncidentLogDetails(details) {
  const text = String(details || "");

  const incidentTypeMatch = text.match(/Incident:\s*([^|]+)/i);
  const locationMatch = text.match(/Location:\s*([^|]+)/i);
  const narrativeMatch = text.match(/Narrative:\s*(.+)$/i);

  return {
    incidentType: incidentTypeMatch?.[1]?.trim() || null,
    location: locationMatch?.[1]?.trim() || null,
    narrative: narrativeMatch?.[1]?.trim() || null,
  };
}

async function findNearbyActiveAlarm(latitude, longitude) {
  const duplicateRadiusKm = 0.5;
  const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const latitudeDelta = duplicateRadiusKm / 110.574;
  const longitudeDelta =
    duplicateRadiusKm /
    Math.max(111.32 * Math.cos((Number(latitude) * Math.PI) / 180), 0.0001);

  const { data: recentAlarms, error } = await supabase
    .from("alarms")
    .select("alarm_id, user_latitude, user_longitude")
    .in("status", [
      "Pending Dispatch",
      "Dispatched",
      "On Scene",
      "Under Control",
    ])
    .gte("call_time", tenMinAgo)
    .gte("user_latitude", Number(latitude) - latitudeDelta)
    .lte("user_latitude", Number(latitude) + latitudeDelta)
    .gte("user_longitude", Number(longitude) - longitudeDelta)
    .lte("user_longitude", Number(longitude) + longitudeDelta)
    .order("call_time", { ascending: false })
    .limit(25);

  if (error) throw error;

  for (const existing of recentAlarms || []) {
    const dist = haversineKm(
      latitude,
      longitude,
      existing.user_latitude,
      existing.user_longitude,
    );

    if (dist <= duplicateRadiusKm) {
      return {
        alarmId: existing.alarm_id,
        distanceKm: dist,
      };
    }
  }

  return null;
}

const buildQueueName = (stationId) => `station-${stationId}`;

async function getMainStationId() {
  const { data, error } = await supabase
    .from("fire_stations")
    .select("station_id")
    .ilike("station_type", "%main%")
    .order("station_id", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.warn(
      `[MainStation] Failed to resolve main station id: ${error.message}`,
    );
    return 1;
  }

  return Number(data?.station_id || 0) || 1;
}

async function updateAcceptedOfficer(alarmId, officerId) {
  const { error } = await supabase
    .from("alarms")
    .update({ assigned_officer_id: officerId })
    .eq("alarm_id", alarmId);

  if (
    error &&
    !String(error?.message || "")
      .toLowerCase()
      .includes("assigned_officer_id")
  ) {
    throw error;
  }
}

// ── Twilio: enqueue call for station (mark2) ──────────────────────────
router.get("/twilio/station-queue-twiml", async (req, res) => {
  try {
    const { stationId, alarmId, phone, lat, lon } = req.query;
    if (!stationId) return res.status(400).send("stationId is required");

    const queue = buildQueueName(stationId);
    const waitUrl =
      "http://twimlets.com/holdmusic?Bucket=com.twilio.music.classical";

    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Enqueue waitUrl="${waitUrl}">
    ${queue}
  </Enqueue>
  <Say voice="alice">Emergency call from ${phone || "unknown caller"} latitude ${lat || "n"} longitude ${lon || "n"} alarm ${alarmId || ""}</Say>
</Response>`;
    res.type("text/xml").send(twiml);
  } catch (err) {
    console.error("station-queue-twiml error:", err);
    res.status(500).send("Server error");
  }
});

// ── Twilio: dequeue for station agents (mark2) ────────────────────────
router.get("/twilio/station-queue-answer", async (req, res) => {
  try {
    const { stationId } = req.query;
    if (!stationId) return res.status(400).send("stationId is required");
    const queue = buildQueueName(stationId);
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial>
    <Queue>${queue}</Queue>
  </Dial>
</Response>`;
    res.type("text/xml").send(twiml);
  } catch (err) {
    console.error("station-queue-answer error:", err);
    res.status(500).send("Server error");
  }
});

// ── Create a new incident/alarm ───────────────────────────────────────
// Intentionally unauthenticated — civilian mobile app users don't have a JWT (mark2)
const createIncidentHandler = async (req, res) => {
  try {
    try {
      console.log(
        "[CreateIncident] Authorization header:",
        req.headers && req.headers.authorization,
      );
      console.log("[CreateIncident] User from token:", req.user);
      console.log("[CreateIncident] Request body:", JSON.stringify(req.body));
    } catch (logErr) {
      console.error("[CreateIncident] Error logging request details:", logErr);
    }

    let {
      firstName,
      lastName,
      phoneNumber,
      location,
      incidentType,
      alarmLevel,
      narrative,
      latitude,
      longitude,
      evidenceImageDataUrl,
    } = req.body;

    let tokenUserRecord = null;
    if (
      req.user?.id &&
      String(req.user?.role || "").toLowerCase() === "end_user"
    ) {
      try {
        const { data: tokenUser } = await supabase
          .from("users")
          .select("user_id, phone_number, first_name, last_name, full_name")
          .eq("user_id", req.user.id)
          .maybeSingle();

        if (tokenUser) {
          tokenUserRecord = tokenUser;
          phoneNumber = tokenUser.phone_number || phoneNumber;
          firstName = tokenUser.first_name || firstName;
          lastName = tokenUser.last_name || lastName;
        }
      } catch (tokenUserErr) {
        console.warn(
          "[CreateIncident] Failed to load token user profile:",
          tokenUserErr?.message || tokenUserErr,
        );
      }
    }

    if (
      !phoneNumber ||
      latitude == null ||
      longitude == null ||
      !alarmLevel
    ) {
      return res.status(400).json({
        message: "Phone number, coordinates, and alarm level are required",
      });
    }

    let callerRows = null;
    if (!tokenUserRecord?.user_id) {
      // Check if caller exists, create if not
      const { data: callerLookupRows, error: callerErr } = await supabase
        .from("users")
        .select("user_id, full_name, first_name, last_name")
        .eq("phone_number", phoneNumber)
        .limit(1);

      if (callerErr) throw callerErr;
      callerRows = callerLookupRows;
    }

    let callerId;
    let callerFullName = null;
    let callerFirstName = firstName || null;
    let callerLastName = lastName || null;

    if (tokenUserRecord?.user_id) {
      callerId = tokenUserRecord.user_id;
      callerFirstName = tokenUserRecord.first_name || firstName || null;
      callerLastName = tokenUserRecord.last_name || lastName || null;
      callerFullName =
        tokenUserRecord.full_name ||
        `${callerFirstName || ""} ${callerLastName || ""}`.trim() ||
        null;
      console.log("[CreateIncident] Using authenticated end_user id:", callerId);
    } else if (!callerRows || callerRows.length === 0) {
      const names = `${firstName || ""} ${lastName || ""}`.trim().split(" ");
      const fname = names[0] || "Unknown";
      const lname = names[1] || "Caller";
      const fullName = `${fname} ${lname}`;

      const { data: insertResult, error: insertError } = await supabase
        .from("users")
        .insert([
          {
            first_name: fname,
            last_name: lname,
            full_name: fullName,
            id_number: `caller_${Date.now()}`,
            phone_number: phoneNumber,
            password: "temp_" + Date.now(),
            role: "end_user",
            email: `caller_${Date.now()}@bfp.gov`,
          },
        ])
        .select("user_id, full_name, first_name, last_name")
        .single();

      if (insertError) {
        console.error("[CreateIncident] Error creating end_user:", insertError);
        throw insertError;
      }
      callerId = insertResult.user_id;
      callerFullName = insertResult.full_name || fullName;
      callerFirstName = insertResult.first_name || fname;
      callerLastName = insertResult.last_name || lname;
      console.log("[CreateIncident] Created new end_user with id:", callerId);
    } else {
      const existingCaller = callerRows[0];
      callerId = existingCaller.user_id;
      callerFullName = existingCaller.full_name || null;
      callerFirstName = existingCaller.first_name || firstName || null;
      callerLastName = existingCaller.last_name || lastName || null;

      const submittedFirstName = String(firstName || "").trim();
      const submittedLastName = String(lastName || "").trim();
      const hasSubmittedName = Boolean(submittedFirstName || submittedLastName);
      const shouldUpgradeCallerName =
        hasSubmittedName &&
        isPlaceholderCallerName(
          existingCaller.full_name,
          existingCaller.first_name,
          existingCaller.last_name,
        );

      if (shouldUpgradeCallerName) {
        const upgradedFirstName =
          submittedFirstName || existingCaller.first_name || "Unknown";
        const upgradedLastName =
          submittedLastName || existingCaller.last_name || "Caller";
        const upgradedFullName =
          `${upgradedFirstName} ${upgradedLastName}`.trim();

        const { data: updatedCaller, error: updateCallerErr } = await supabase
          .from("users")
          .update({
            first_name: upgradedFirstName,
            last_name: upgradedLastName,
            full_name: upgradedFullName,
          })
          .eq("user_id", callerId)
          .select("user_id, full_name, first_name, last_name")
          .single();

        if (updateCallerErr) {
          console.warn(
            "[CreateIncident] Failed to upgrade existing caller name:",
            updateCallerErr,
          );
        } else if (updatedCaller) {
          callerFullName = updatedCaller.full_name || upgradedFullName;
          callerFirstName = updatedCaller.first_name || upgradedFirstName;
          callerLastName = updatedCaller.last_name || upgradedLastName;
          console.log(
            "[CreateIncident] Updated existing caller with submitted name:",
            callerId,
            callerFullName,
          );
        }
      }

      console.log(
        "[CreateIncident] Found existing end_user with id:",
        callerId,
      );
    }

    // Map alarm level: "1st Alarm" → "Alarm 1" (mark2 regex approach — more robust)
    let alarmLevelEnum = alarmLevel;
    if (alarmLevel.includes("Alarm")) {
      const match = alarmLevel.match(/(\d+)/);
      if (match) {
        alarmLevelEnum = `Alarm ${match[1]}`;
      }
    }
    console.log(
      "[CreateIncident] Mapped alarm level:",
      alarmLevel,
      "→",
      alarmLevelEnum,
    );

    // ── Duplicate incident clustering (within 0.5km & 10min) ────────────
    let parentAlarmId = null;
    try {
      const nearbyAlarm = await findNearbyActiveAlarm(latitude, longitude);

      if (nearbyAlarm) {
        parentAlarmId = nearbyAlarm.alarmId;
        console.log(
          `[DuplicateCluster] New alarm is ${(nearbyAlarm.distanceKm * 1000).toFixed(0)}m from alarm ${nearbyAlarm.alarmId} — linking as duplicate`,
        );
      }
    } catch (clusterErr) {
      console.error(
        "[DuplicateCluster] Check failed (non-fatal):",
        clusterErr.message,
      );
    }

    const alarmInsertData = {
      end_user_id: callerId,
      user_latitude: latitude,
      user_longitude: longitude,
      initial_alarm_level: alarmLevelEnum,
      current_alarm_level: alarmLevelEnum,
      status: "Pending Dispatch",
      parent_alarm_id: parentAlarmId,
    };

    let { data: alarmResult, error: alarmErr } = await supabase
      .from("alarms")
      .insert([alarmInsertData])
      .select("alarm_id")
      .single();

    if (
      alarmErr?.code === "PGRST204" &&
      alarmErr?.message?.includes("parent_alarm_id")
    ) {
      console.warn(
        "[CreateIncident] parent_alarm_id missing from Supabase schema cache. Retrying insert without duplicate-link column.",
      );

      const { parent_alarm_id, ...fallbackAlarmInsertData } = alarmInsertData;

      ({ data: alarmResult, error: alarmErr } = await supabase
        .from("alarms")
        .insert([fallbackAlarmInsertData])
        .select("alarm_id")
        .single());
    }

    if (alarmErr) {
      console.error("[CreateIncident] Alarm insert error:", alarmErr);
      throw alarmErr;
    }

    const alarmId = alarmResult.alarm_id;
    console.log("[CreateIncident] Created alarm id:", alarmId);

    // Log incident creation
    const { error: logErr } = await supabase.from("alarm_response_log").insert([
      {
        alarm_id: alarmId,
        action_type: "Initial Dispatch",
        details: `Incident: ${incidentType || "Not specified"} | Location: ${location} | Narrative: ${narrative || "No details"}`,
        performed_by_user_id: req.user && req.user.id ? req.user.id : null,
      },
    ]);

    if (logErr) throw logErr;

    let evidenceImageUrl = null;
    if (isDataUrl(evidenceImageDataUrl)) {
      try {
        evidenceImageUrl = await uploadIncidentEvidence(
          evidenceImageDataUrl,
          alarmId,
        );

        if (evidenceImageUrl) {
          await supabase.from("alarm_response_log").insert([
            {
              alarm_id: alarmId,
              action_type: "Incident Evidence Uploaded",
              details: `Evidence image URL: ${evidenceImageUrl}`,
              performed_by_user_id: req.user && req.user.id ? req.user.id : null,
            },
          ]);
        }
      } catch (uploadErr) {
        console.warn(
          "[CreateIncident] Evidence upload failed:",
          uploadErr?.message || uploadErr,
        );
      }
    }

    // Broadcast generic new-incident to all connected clients
    try {
      const io = req.app.get("io");
      if (io) {
        io.emit("new-incident", {
          alarmId,
          callerId,
          callerFullName,
          firstName: callerFirstName,
          lastName: callerLastName,
          phoneNumber: phoneNumber || null,
          incidentType: incidentType || null,
          alarmLevel: alarmLevel || null,
          location: location || null,
          narrative: narrative || null,
          coordinates: { latitude, longitude },
          status: "Pending Dispatch",
        });
      }
    } catch (emitErr) {
      console.error("Error emitting new-incident event:", emitErr);
    }

    // ── KNN dispatch: find nearest READY + online station (mark2) ────
    let dispatchedStationId = null;
    let stationName = null;
    let dispatchedOfficerId = null;
    let dispatchedStationType = null;
    let twilioTargetIdentity = null;

    try {
      const forceStationId = req.body.forceStationId;
      const rankedStations = await getRankedStations(latitude, longitude, {
        forceStationId,
        includeMain: true,
      });
      const onlineIds = getOnlineStationIds();
      const io = req.app.get("io");
      const mainAdminOnline = isMainAdminOnline(io);
      console.log(`[KNN] Online stations: [${[...onlineIds].join(", ")}]`);

      const allEligible = rankedStations;

      // Only dispatch to ONLINE stations (skip offline ones entirely)
      const onlineEligible = forceStationId
        ? allEligible
        : allEligible.filter((s) => {
            const stationType = String(s.station_type || "").toLowerCase();
            if (stationType === "main") {
              return mainAdminOnline;
            }
            // Consider a station online if either it has an active socket
            // connection OR the DB `station_current_status.is_online` flag is true.
            const socketOnline = onlineIds.has(s.station_id);
            const dbOnline = Boolean(s.is_online);
            if (!socketOnline && dbOnline) {
              console.log(
                `[KNN] Using DB is_online fallback for station ${s.station_id}`,
              );
            }
            return socketOnline || dbOnline;
          });
      let scored = onlineEligible;

      if (scored.length === 0 && !forceStationId && onlineIds.size > 0) {
        const fallbackOnlineStations = await getOnlineFallbackStations(
          latitude,
          longitude,
          onlineIds,
        );

        if (fallbackOnlineStations.length > 0) {
          scored = fallbackOnlineStations;
          console.log(
            `[KNN] No READY online substations. Falling back to online substations regardless of readiness: ${fallbackOnlineStations.map((s) => `${s.station_id}(${s.station_name})`).join(", ")}`,
          );
        }
      }

      console.log(
        `[KNN] ${scored.length} online substation(s) out of ${allEligible.length} total eligible`,
      );
      if (scored.length === 0 && allEligible.length > 0) {
        console.log(
          `[KNN] Eligible but offline: ${allEligible.map((s) => `${s.station_id}(${s.station_name})`).join(", ")}`,
        );
      }

      if (scored.length > 0) {
        const nearest = scored[0];
        const nearestIsMain =
          String(nearest.station_type || "").toLowerCase() === "main";
        dispatchedStationId = nearestIsMain ? null : nearest.station_id;
        dispatchedStationType = nearestIsMain ? "main" : "substation";
        stationName = nearest.station_name || null;

        console.log(
          `[KNN] Nearest: ${nearest.station_name} (id=${nearest.station_id}, dist=${nearest.distance.toFixed(2)}km)`,
        );

        await supabase
          .from("alarms")
          .update({
            assigned_station_id: nearestIsMain ? null : nearest.station_id,
          })
          .eq("alarm_id", alarmId);

        // Notify assigned station via socket
        if (io) {
          const dispatchGroup = nearestIsMain
            ? "main-admin"
            : `station-${nearest.station_id}`;
          const dispatchResult = await dispatchIncidentToGroup({
            io,
            alarmId,
            dispatchGroup,
            fallbackRoom: dispatchGroup,
            payload: {
              alarmId,
              callerId,
              callerFullName,
              phoneNumber,
              firstName: callerFirstName,
              lastName: callerLastName,
              incidentType: incidentType || null,
              alarmLevel: alarmLevelEnum,
              location: location || null,
              narrative: narrative || null,
              coordinates: { latitude, longitude },
              assignedStationId: nearestIsMain ? "main" : nearest.station_id,
              stationName: nearest.station_name,
              failover: nearestIsMain,
            },
          });
          dispatchedOfficerId = dispatchResult.assignedOfficerId || null;
          let twilioOfficerId = dispatchedOfficerId;
          if (!twilioOfficerId) {
            twilioOfficerId = await resolveFallbackOfficerId({
              isMain: nearestIsMain,
              stationId: nearest.station_id,
            });
            if (twilioOfficerId) {
              console.log(
                `[CreateIncident] Resolved fallback officer for Twilio target: ${twilioOfficerId}`,
              );
            }
          }
          twilioTargetIdentity = buildTwilioDispatcherIdentity({
            isMain: nearestIsMain,
            stationId: nearest.station_id,
            officerId: twilioOfficerId,
          });

          // Fallback if no identity could be built
          if (!twilioTargetIdentity) {
            twilioTargetIdentity = nearestIsMain
              ? "ADM_MAIN"
              : `ADM_SUB_${nearest.station_id}`;
          }

          console.log(
            `[CreateIncident] ${nearestIsMain ? "Main admin" : "Substation"} dispatch - dispatchedOfficerId: ${dispatchedOfficerId}, twilioTargetIdentity: ${twilioTargetIdentity}`,
          );

          // Immediately notify the end-user app which station will handle this
          io.to(`alarm-${alarmId}`).emit("dispatch-confirmed", {
            alarmId,
            dispatchedStationId: nearestIsMain ? null : nearest.station_id,
            dispatchedStationType: nearestIsMain ? "main" : "substation",
            dispatchedStationName: nearest.station_name,
            dispatchedOfficerId: dispatchedOfficerId,
            twilioTargetIdentity,
          });

          // --- Notify firetruck/driver room for this station ---
          io.to(`driver-station-${nearest.station_id}`).emit(
            "incoming-incident",
            {
              alarmId,
              callerId,
              callerFullName,
              phoneNumber,
              firstName: callerFirstName,
              lastName: callerLastName,
              incidentType: incidentType || null,
              alarmLevel: alarmLevelEnum,
              location: location || null,
              narrative: narrative || null,
              coordinates: { latitude, longitude },
              assignedStationId: nearestIsMain ? "main" : nearest.station_id,
              stationName: nearest.station_name,
              failover: nearestIsMain,
            },
          );
        }

        // Start failover timer: main gets direct-main failover; substations use ranked failover
        if (nearestIsMain) {
          startMainAdminFailover(alarmId, io, {
            callerId,
            phoneNumber,
            firstName,
            lastName,
            incidentType,
            alarmLevel: alarmLevelEnum,
            location,
            narrative,
            coordinates: { latitude, longitude },
          });
        } else {
          startFailover(alarmId, nearest.station_id, scored, io, {
            callerId,
            phoneNumber,
            firstName,
            lastName,
            incidentType,
            alarmLevel: alarmLevelEnum,
            location,
            narrative,
            coordinates: { latitude, longitude },
          });
        }
      } else {
        if (isMainAdminOnline(io)) {
          const rankedMainStation = allEligible.find(
            (s) => String(s.station_type || "").toLowerCase() === "main",
          );
          const mainStation = rankedMainStation || (await getMainStationInfo());
          const mainStationId = Number(mainStation?.station_id || 0) || null;
          const mainStationName =
            mainStation?.station_name || "Central Fire Station (Main)";

          console.log(
            "[KNN] No online substations available. Dispatching directly to MAIN ADMIN.",
          );
          dispatchedStationId = null;
          dispatchedStationType = "main";
          stationName = mainStationName;

          const dispatchResult = await dispatchIncidentToGroup({
            io,
            alarmId,
            dispatchGroup: "main-admin",
            fallbackRoom: "main-admin",
            payload: {
              alarmId,
              callerId,
              callerFullName,
              phoneNumber,
              firstName: callerFirstName,
              lastName: callerLastName,
              incidentType: incidentType || null,
              alarmLevel: alarmLevelEnum,
              location: location || null,
              narrative: narrative || null,
              coordinates: { latitude, longitude },
              assignedStationId: "main",
              stationName: mainStationName,
              failover: true,
            },
          });
          dispatchedOfficerId = dispatchResult.assignedOfficerId || null;
          let twilioOfficerId = dispatchedOfficerId;
          if (!twilioOfficerId) {
            twilioOfficerId = await resolveFallbackOfficerId({
              isMain: true,
              stationId: mainStationId,
            });
            if (twilioOfficerId) {
              console.log(
                `[CreateIncident] Resolved fallback main officer for Twilio target: ${twilioOfficerId}`,
              );
            }
          }
          twilioTargetIdentity = buildTwilioDispatcherIdentity({
            isMain: true,
            stationId: mainStationId,
            officerId: twilioOfficerId,
          });

          // Fallback if no identity could be built
          if (!twilioTargetIdentity) {
            twilioTargetIdentity = "ADM_MAIN";
          }

          console.log(
            `[CreateIncident] Main admin dispatch - dispatchedOfficerId: ${dispatchedOfficerId}, twilioTargetIdentity: ${twilioTargetIdentity}`,
          );

          // Immediately notify the end-user app which station will handle this
          io.to(`alarm-${alarmId}`).emit("dispatch-confirmed", {
            alarmId,
            dispatchedStationId: null,
            dispatchedStationType: "main",
            dispatchedStationName: mainStationName,
            dispatchedOfficerId: dispatchedOfficerId,
            twilioTargetIdentity,
          });

          console.log(`[KNN] Main admin notified for alarm ${alarmId}`);

          if (mainStationId) {
            io.to(`driver-station-${mainStationId}`).emit("incoming-incident", {
              alarmId,
              callerId,
              callerFullName,
              phoneNumber,
              firstName: callerFirstName,
              lastName: callerLastName,
              incidentType: incidentType || null,
              alarmLevel: alarmLevelEnum,
              location: location || null,
              narrative: narrative || null,
              coordinates: { latitude, longitude },
              assignedStationId: "main",
              stationName: mainStationName,
              failover: true,
            });
          } else {
            console.warn(
              `[KNN] Main admin is online but no main station_id found; skipped driver-station room emit for alarm ${alarmId}`,
            );
          }

          startMainAdminFailover(alarmId, io, {
            callerId,
            phoneNumber,
            firstName,
            lastName,
            incidentType,
            alarmLevel: alarmLevelEnum,
            location,
            narrative,
            coordinates: { latitude, longitude },
          });
        } else {
          console.log(
            "[KNN] No online substations and main admin is offline. Alarm created without a live dispatch target.",
          );
          dispatchedStationId = null;
          dispatchedStationType = null;
          stationName = null;
        }
      }
    } catch (knnErr) {
      console.error("[KNN] Station lookup error:", knnErr);
    }

    console.log(`[CreateIncident] Sending response for alarm ${alarmId}:`, {
      dispatchedStationId,
      dispatchedStationType,
      dispatchedStationName: stationName,
      dispatchedOfficerId,
      twilioTargetIdentity,
    });

    // SAFETY CHECK: Ensure twilioTargetIdentity is never null
    if (!twilioTargetIdentity && dispatchedStationType === "main") {
      console.warn(
        `[CreateIncident] WARNING: null twilioTargetIdentity for main dispatch. Setting fallback to ADM_MAIN`,
      );
      twilioTargetIdentity = "ADM_MAIN";
    } else if (
      !twilioTargetIdentity &&
      dispatchedStationType === "substation"
    ) {
      console.warn(
        `[CreateIncident] WARNING: null twilioTargetIdentity for substation dispatch. Setting fallback to ADM_SUB_${dispatchedStationId}`,
      );
      twilioTargetIdentity = `ADM_SUB_${dispatchedStationId}`;
    } else if (!twilioTargetIdentity) {
      console.warn(
        `[CreateIncident] WARNING: null twilioTargetIdentity with unknown type. Setting fallback to ADM_MAIN`,
      );
      twilioTargetIdentity = "ADM_MAIN";
    }

    res.status(201).json({
      message: "Alarm created and nearest station notified",
      alarmId,
      dispatchedStationId,
      dispatchedStationType,
      dispatchedStationName: stationName || null,
      dispatchedOfficerId,
      twilioTargetIdentity,
      evidenceImageUrl,
      coordinates: { latitude, longitude },
    });
  } catch (error) {
    console.error("Create incident error:", error);
    if (error?.message)
      console.error("Create incident error message:", error.message);
    if (error?.details)
      console.error("Create incident error details:", error.details);
    if (error?.hint) console.error("Create incident error hint:", error.hint);
    if (error?.code) console.error("Create incident error code:", error.code);
    res.status(500).json({
      message: "Failed to create incident",
      error: (error && error.message) || String(error),
    });
  }
};

// Both paths: admin/station UI + civilian mobile app (mark2)
router.post(
  "/create-incident",
  optionalAuthenticateToken,
  createIncidentHandler,
);
router.post(
  "/enduser/create-alarm",
  optionalAuthenticateToken,
  createIncidentHandler,
);

router.post(
  "/incidents/:alarmId/evidence/init",
  authenticateToken,
  async (req, res) => {
    try {
      const alarmId = Number(req.params.alarmId || 0) || null;
      if (!alarmId) {
        return res.status(400).json({
          success: false,
          error: { code: "ALARM_NOT_FOUND", message: "Valid alarmId is required" },
        });
      }

      const userId = Number(req.user?.id || 0) || null;
      if (!userId) {
        return res.status(401).json({
          success: false,
          error: { code: "UNAUTHORIZED", message: "Missing valid user token" },
        });
      }

      const mimeType = normalizeMimeType(req.body?.mimeType);
      const fileSizeBytes = Number(req.body?.fileSizeBytes || 0) || 0;
      const capturePhase = String(req.body?.capturePhase || "in_call").toLowerCase();

      if (!isAllowedEvidenceMimeType(mimeType)) {
        return res.status(400).json({
          success: false,
          error: {
            code: "INVALID_MIME_TYPE",
            message: "Only image/jpeg, image/png, and image/webp are allowed",
          },
        });
      }

      if (fileSizeBytes <= 0 || fileSizeBytes > MAX_EVIDENCE_SIZE_BYTES) {
        return res.status(400).json({
          success: false,
          error: {
            code: "FILE_TOO_LARGE",
            message: `fileSizeBytes must be between 1 and ${MAX_EVIDENCE_SIZE_BYTES}`,
          },
        });
      }

      if (!["in_call", "post_call"].includes(capturePhase)) {
        return res.status(400).json({
          success: false,
          error: {
            code: "INVALID_CAPTURE_PHASE",
            message: "capturePhase must be in_call or post_call",
          },
        });
      }

      const { data: alarm, error } = await getAlarmForEvidence(alarmId);
      if (error) throw error;
      if (!alarm) {
        return res.status(404).json({
          success: false,
          error: { code: "ALARM_NOT_FOUND", message: "Incident not found" },
        });
      }

      if (Number(alarm.end_user_id || 0) !== userId) {
        return res.status(403).json({
          success: false,
          error: {
            code: "ALARM_NOT_OWNED",
            message: "You can only upload evidence for your own incident",
          },
        });
      }

      const uploadWindow = getUploadWindowForAlarm(alarm);
      if (!uploadWindow.uploadAllowed) {
        return res.status(403).json({
          success: false,
          error: {
            code: "WINDOW_EXPIRED",
            message: "Upload window expired",
            details: uploadWindow,
          },
        });
      }

      const storagePath = buildIncidentEvidenceStoragePath({
        alarmId,
        userId,
        mimeType,
      });

      return res.json({
        success: true,
        data: {
          alarmId,
          bucket: INCIDENT_EVIDENCE_BUCKET,
          storagePath,
          uploadWindow,
          constraints: {
            allowedMimeTypes: [...ALLOWED_EVIDENCE_MIME_TYPES],
            maxFileSizeBytes: MAX_EVIDENCE_SIZE_BYTES,
          },
        },
      });
    } catch (error) {
      console.error("[EvidenceInit] error:", error);
      return res.status(500).json({
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to initialize evidence upload",
        },
      });
    }
  },
);

router.post(
  "/incidents/:alarmId/evidence/complete",
  authenticateToken,
  async (req, res) => {
    try {
      const alarmId = Number(req.params.alarmId || 0) || null;
      const userId = Number(req.user?.id || 0) || null;
      console.log("[EvidenceComplete] Received request:", { alarmId, userId });

      if (!alarmId || !userId) {
        console.log("[EvidenceComplete] Missing alarmId or userId");
        return res.status(400).json({
          success: false,
          error: { code: "ALARM_NOT_FOUND", message: "Valid alarmId is required" },
        });
      }

      const bucket = String(req.body?.bucket || INCIDENT_EVIDENCE_BUCKET).trim();
      const storagePath = String(req.body?.storagePath || "").trim();
      const mimeType = normalizeMimeType(req.body?.mimeType);
      const fileSizeBytes = Number(req.body?.fileSizeBytes || 0) || 0;
      const capturePhase = String(req.body?.capturePhase || "in_call").toLowerCase();

      console.log("[EvidenceComplete] Request body:", { bucket, storagePath, mimeType, fileSizeBytes, capturePhase });

      if (bucket !== INCIDENT_EVIDENCE_BUCKET) {
        console.log("[EvidenceComplete] Invalid bucket:", bucket);
        return res.status(400).json({
          success: false,
          error: {
            code: "STORAGE_PATH_INVALID",
            message: `Bucket must be ${INCIDENT_EVIDENCE_BUCKET}`,
          },
        });
      }

      if (!isAllowedEvidenceMimeType(mimeType)) {
        console.log("[EvidenceComplete] Invalid MIME type:", mimeType);
        return res.status(400).json({
          success: false,
          error: {
            code: "INVALID_MIME_TYPE",
            message: "Only image/jpeg, image/png, and image/webp are allowed",
          },
        });
      }

      if (fileSizeBytes <= 0 || fileSizeBytes > MAX_EVIDENCE_SIZE_BYTES) {
        console.log("[EvidenceComplete] Invalid file size:", fileSizeBytes);
        return res.status(400).json({
          success: false,
          error: {
            code: "FILE_TOO_LARGE",
            message: `fileSizeBytes must be between 1 and ${MAX_EVIDENCE_SIZE_BYTES}`,
          },
        });
      }

      if (!["in_call", "post_call"].includes(capturePhase)) {
        console.log("[EvidenceComplete] Invalid capture phase:", capturePhase);
        return res.status(400).json({
          success: false,
          error: {
            code: "INVALID_CAPTURE_PHASE",
            message: "capturePhase must be in_call or post_call",
          },
        });
      }

      const pathOwned = isStoragePathOwnedByCaller({ storagePath, alarmId, userId });
      console.log("[EvidenceComplete] Storage path ownership check:", { pathOwned, expectedPrefix: `alarms/${alarmId}/caller/${userId}/`, actualPath: storagePath });

      if (!pathOwned) {
        return res.status(400).json({
          success: false,
          error: {
            code: "STORAGE_PATH_INVALID",
            message: "storagePath is invalid for this caller/alarm",
          },
        });
      }

      console.log("[EvidenceComplete] Fetching alarm for validation...");
      const { data: alarm, error } = await getAlarmForEvidence(alarmId);
      if (error) throw error;
      if (!alarm) {
        console.log("[EvidenceComplete] Alarm not found:", alarmId);
        return res.status(404).json({
          success: false,
          error: { code: "ALARM_NOT_FOUND", message: "Incident not found" },
        });
      }

      console.log("[EvidenceComplete] Alarm found, checking ownership:", { alarmUserId: alarm.end_user_id, requestUserId: userId });

      if (Number(alarm.end_user_id || 0) !== userId) {
        return res.status(403).json({
          success: false,
          error: {
            code: "ALARM_NOT_OWNED",
            message: "You can only upload evidence for your own incident",
          },
        });
      }

      const uploadWindow = getUploadWindowForAlarm(alarm);
      console.log("[EvidenceComplete] Upload window check:", uploadWindow);

      if (!uploadWindow.uploadAllowed) {
        return res.status(403).json({
          success: false,
          error: {
            code: "WINDOW_EXPIRED",
            message: "Upload window expired",
            details: uploadWindow,
          },
        });
      }

      console.log("[EvidenceComplete] Verifying storage object exists...");
      // Verify object exists in storage before writing metadata.
      const signedPreview = await createSignedEvidenceUrl(storagePath, 120);
      if (!signedPreview) {
        console.log("[EvidenceComplete] Storage object not found:", storagePath);
        return res.status(409).json({
          success: false,
          error: {
            code: "STORAGE_UPLOAD_NOT_FOUND",
            message: "Storage object not found for provided storagePath",
          },
        });
      }

      console.log("[EvidenceComplete] Storage object verified, inserting database record...");
      const inserted = await insertIncidentEvidenceRecord({
        alarmId,
        userId,
        stationId: Number(alarm.assigned_station_id || 0) || null,
        bucket,
        storagePath,
        mimeType,
        fileSizeBytes,
        capturePhase,
        uploadedAt: new Date().toISOString(),
      });

      await supabase.from("alarm_response_log").insert([
        {
          alarm_id: alarmId,
          action_type: "Incident Evidence Uploaded",
          details: `Caller photo evidence uploaded: ${storagePath}`,
          performed_by_user_id: userId,
        },
      ]);

      const callerName = alarm?.users?.full_name || null;
      const callerPhoneNumber = alarm?.users?.phone_number || null;
      const previewUrl = (await createSignedEvidenceUrl(storagePath, 3600)) || signedPreview;

      console.log("[EvidenceComplete] Database insert succeeded, evidence_id:", inserted?.evidence_id);

      const io = req.app.get("io");
      if (io) {
        const payload = {
          alarmId,
          evidenceId: inserted?.evidence_id || null,
          mediaType: "image",
          capturePhase,
          callerName,
          callerPhoneNumber,
          previewUrl,
          storagePath,
          uploadedAt: inserted?.uploaded_at || new Date().toISOString(),
        };
        console.log("[EvidenceComplete] Emitting socket event:", payload);

        io.to(`alarm-${alarmId}`).emit("incident-evidence-uploaded", payload);

        // Always notify main-admin so the central dashboard sees all evidence
        io.to("main-admin").emit("incident-evidence-uploaded", payload);

        // Also notify the specific assigned substation (if any)
        const stationId = Number(alarm.assigned_station_id || 0) || null;
        if (stationId) {
          io.to(`station-${stationId}`).emit("incident-evidence-uploaded", payload);
        }
      }

      return res.status(201).json({
        success: true,
        data: {
          evidenceId: inserted?.evidence_id || null,
          alarmId,
          stationId: Number(alarm.assigned_station_id || 0) || null,
          bucket,
          storagePath,
          mimeType,
          fileSizeBytes,
          capturePhase,
          uploadedAt: inserted?.uploaded_at || null,
          previewUrl,
        },
      });
    } catch (error) {
      console.error("[EvidenceComplete] error:", error);
      console.error("[EvidenceComplete] error stack:", error?.stack);
      return res.status(500).json({
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to complete evidence upload",
        },
      });
    }
  },
);

router.get(
  "/incidents/:alarmId/evidence/window",
  authenticateToken,
  async (req, res) => {
    try {
      const alarmId = Number(req.params.alarmId || 0) || null;
      if (!alarmId) {
        return res.status(400).json({
          success: false,
          error: { code: "ALARM_NOT_FOUND", message: "Valid alarmId is required" },
        });
      }

      const { data: alarm, error } = await getAlarmForEvidence(alarmId);
      if (error) throw error;
      if (!alarm) {
        return res.status(404).json({
          success: false,
          error: { code: "ALARM_NOT_FOUND", message: "Incident not found" },
        });
      }

      if (!canUserReadIncidentEvidence({ alarm, user: req.user })) {
        return res.status(403).json({
          success: false,
          error: {
            code: "FORBIDDEN",
            message: "Not allowed to access this incident evidence window",
          },
        });
      }

      const uploadWindow = getUploadWindowForAlarm(alarm);
      return res.json({
        success: true,
        data: {
          alarmId,
          ...uploadWindow,
        },
      });
    } catch (error) {
      console.error("[EvidenceWindow] error:", error);
      return res.status(500).json({
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to get evidence upload window",
        },
      });
    }
  },
);

router.get(
  "/incidents/:alarmId/evidence",
  authenticateToken,
  async (req, res) => {
    try {
      const alarmId = Number(req.params.alarmId || 0) || null;
      if (!alarmId) {
        return res.status(400).json({
          success: false,
          error: { code: "ALARM_NOT_FOUND", message: "Valid alarmId is required" },
        });
      }

      const { data: alarm, error } = await getAlarmForEvidence(alarmId);
      if (error) throw error;
      if (!alarm) {
        return res.status(404).json({
          success: false,
          error: { code: "ALARM_NOT_FOUND", message: "Incident not found" },
        });
      }

      if (!canUserReadIncidentEvidence({ alarm, user: req.user })) {
        return res.status(403).json({
          success: false,
          error: {
            code: "FORBIDDEN",
            message: "Not allowed to read this incident evidence",
          },
        });
      }

      const limit = Math.min(100, Math.max(1, Number(req.query.limit || 20) || 20));
      const { data: evidenceRows, error: evidenceError } = await supabase
        .from("incident_evidence")
        .select(
          "evidence_id,alarm_id,uploaded_by_user_id,station_id,storage_bucket,storage_path,mime_type,file_size_bytes,capture_phase,uploaded_at",
        )
        .eq("alarm_id", alarmId)
        .order("uploaded_at", { ascending: false })
        .limit(limit);

      if (evidenceError) throw evidenceError;

      console.log(`[EvidenceList] Found ${evidenceRows?.length || 0} evidence rows for alarm ${alarmId}`);
      const items = await Promise.all(
        (evidenceRows || []).map(async (row) => {
          const previewUrl = await createSignedEvidenceUrl(row.storage_path, 3600);
          console.log(`[EvidenceList] Evidence ${row.evidence_id}: previewUrl=${previewUrl ? 'OK' : 'NULL'}, storagePath=${row.storage_path}`);
          // Fetch caller info directly from uploaded_by_user_id
          const { data: uploader } = await supabase
            .from("users")
            .select("full_name,phone_number")
            .eq("id", row.uploaded_by_user_id)
            .maybeSingle();
          console.log(`[EvidenceList] Evidence ${row.evidence_id}: uploader=${uploader?.full_name || 'NULL'}`);
          return {
            evidenceId: row.evidence_id,
            alarmId: row.alarm_id,
            caller: {
              userId: row.uploaded_by_user_id,
              name: uploader?.full_name || alarm?.users?.full_name || null,
              phoneNumber: uploader?.phone_number || alarm?.users?.phone_number || null,
            },
            stationId: row.station_id,
            bucket: row.storage_bucket,
            storagePath: row.storage_path,
            mimeType: row.mime_type,
            fileSizeBytes: row.file_size_bytes,
            capturePhase: row.capture_phase,
            uploadedAt: toIsoOrNull(row.uploaded_at),
            previewUrl,
          };
        }),
      );
      console.log(`[EvidenceList] Returning ${items.length} items for alarm ${alarmId}`);

      return res.json({
        success: true,
        data: {
          alarmId,
          items,
        },
      });
    } catch (error) {
      console.error("[EvidenceList] error:", error);
      return res.status(500).json({
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to list incident evidence",
        },
      });
    }
  },
);

router.post(
  "/incidents/:alarmId/evidence-media",
  authenticateToken,
  upload.single("media"),
  async (req, res) => {
    try {
      const alarmId = Number(req.params.alarmId || 0) || null;
      if (!alarmId) {
        return res.status(400).json({ message: "Valid alarmId is required" });
      }

      const mediaFile = req.file;
      if (!mediaFile?.buffer) {
        return res
          .status(400)
          .json({ message: "media file is required (multipart field: media)" });
      }

      const mime = normalizeMimeType(mediaFile.mimetype);
      if (!isAllowedEvidenceMimeType(mime)) {
        return res
          .status(400)
          .json({ message: "Only JPEG, PNG, and WEBP images are allowed" });
      }

      if ((Number(mediaFile.size || 0) || 0) > MAX_EVIDENCE_SIZE_BYTES) {
        return res.status(400).json({
          message: `Image too large. Max size is ${MAX_EVIDENCE_SIZE_BYTES} bytes`,
        });
      }

      const userId = Number(req.user?.id || 0) || null;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { data: alarm, error: alarmErr } = await getAlarmForEvidence(alarmId);

      if (alarmErr) throw alarmErr;
      if (!alarm) {
        return res.status(404).json({ message: "Incident not found" });
      }

      if (Number(alarm.end_user_id || 0) !== userId) {
        return res.status(403).json({
          message: "You can only upload evidence for your own incident",
        });
      }

      const uploadWindow = getUploadWindowForAlarm(alarm);
      if (!uploadWindow.uploadAllowed) {
        return res.status(403).json({
          message: "Upload window expired",
          details: uploadWindow,
        });
      }

      const storagePath = buildIncidentEvidenceStoragePath({
        alarmId,
        userId,
        mimeType: mime,
      });

      const { error: storageUploadError } = await supabase.storage
        .from(INCIDENT_EVIDENCE_BUCKET)
        .upload(storagePath, mediaFile.buffer, {
          contentType: mime,
          upsert: true,
        });

      if (storageUploadError) {
        throw new Error(storageUploadError.message || "Failed to upload evidence to storage");
      }

      const { data: publicUrlData } = supabase.storage
        .from(INCIDENT_EVIDENCE_BUCKET)
        .getPublicUrl(storagePath);
      const mediaUrl = publicUrlData?.publicUrl || null;

      const evidenceRow = await insertIncidentEvidenceRecord({
        alarmId,
        userId,
        stationId: Number(alarm.assigned_station_id || 0) || null,
        bucket: INCIDENT_EVIDENCE_BUCKET,
        storagePath,
        mimeType: mime,
        fileSizeBytes: Number(mediaFile.size || 0) || null,
        capturePhase: "in_call",
        uploadedAt: new Date().toISOString(),
      });

      await supabase.from("alarm_response_log").insert([
        {
          alarm_id: alarmId,
          action_type: "Incident Evidence Uploaded",
          details: `IMAGE evidence uploaded: ${mediaUrl}`,
          performed_by_user_id: userId,
        },
      ]);

      const io = req.app.get("io");
      if (io) {
        const payload = {
          alarmId,
          evidenceId: evidenceRow?.evidence_id || null,
          mediaType: "image",
          mediaUrl,
          callerName: alarm?.users?.full_name || null,
          callerPhoneNumber: alarm?.users?.phone_number || null,
          uploadedAt: new Date().toISOString(),
        };

        io.to(`alarm-${alarmId}`).emit("incident-evidence-uploaded", payload);

        // Always notify main-admin so the central dashboard sees all evidence
        io.to("main-admin").emit("incident-evidence-uploaded", payload);

        // Also notify the specific assigned substation (if any)
        const stationId = Number(alarm.assigned_station_id || 0) || null;
        if (stationId) {
          io.to(`station-${stationId}`).emit("incident-evidence-uploaded", payload);
        }
      }

      return res.json({
        success: true,
        alarmId,
        mediaType: "image",
        evidenceId: evidenceRow?.evidence_id || null,
        mediaUrl,
      });
    } catch (error) {
      console.error("Upload incident evidence media error:", error);
      return res.status(500).json({
        message: "Failed to upload incident evidence media",
        error: error.message,
      });
    }
  },
);

// ── Accept incident — atomic lock, first-accept wins (mark2) ─────────
router.post(
  "/incidents/:alarmId/accept",
  authenticateToken,
  async (req, res) => {
    try {
      const { alarmId } = req.params;
      const userRole = String(req.user?.role || "").toLowerCase();
      const userStationId =
        Number(
          req.user?.assignedStationId || req.user?.assigned_station_id || 0,
        ) || null;
      const requestStationId = req.body.stationId || userStationId;
      const isMainAdmin = userRole === "admin" || requestStationId === "main";
      const mainStationId = isMainAdmin ? await getMainStationId() : null;
      const stationId = isMainAdmin
        ? "main"
        : Number(requestStationId || 0) || null;
      const userId = req.user.id;
      console.log(
        `[AcceptAPI] alarmId=${alarmId} stationId=${stationId} userId=${userId}`,
      );

      if (!stationId) {
        return res.status(400).json({ message: "stationId is required" });
      }

      let assignedOfficerId = null;
      let alarmBeforeAccept = null;
      const { data: alarmWithOfficer, error: alarmWithOfficerErr } =
        await supabase
          .from("alarms")
          .select("alarm_id, status, assigned_officer_id")
          .eq("alarm_id", Number(alarmId))
          .maybeSingle();

      if (alarmWithOfficerErr) {
        const assignedOfficerColumnMissing = String(
          alarmWithOfficerErr?.message || "",
        )
          .toLowerCase()
          .includes("assigned_officer_id");

        if (!assignedOfficerColumnMissing) {
          throw alarmWithOfficerErr;
        }

        const { data: alarmWithoutOfficer, error: alarmWithoutOfficerErr } =
          await supabase
            .from("alarms")
            .select("alarm_id, status")
            .eq("alarm_id", Number(alarmId))
            .maybeSingle();

        if (alarmWithoutOfficerErr) {
          throw alarmWithoutOfficerErr;
        }

        alarmBeforeAccept = alarmWithoutOfficer;
      } else {
        alarmBeforeAccept = alarmWithOfficer;
        assignedOfficerId =
          Number(alarmWithOfficer?.assigned_officer_id || 0) || null;
      }

      if (!alarmBeforeAccept) {
        return res.status(404).json({ message: "Incident not found" });
      }

      if (assignedOfficerId && assignedOfficerId !== Number(userId)) {
        return res.status(409).json({
          message: "Incident is assigned to another dispatcher",
          assignedOfficerId,
        });
      }

      const numericStationId = isMainAdmin ? mainStationId : Number(stationId);
      const result = await acceptIncident(
        Number(alarmId),
        numericStationId,
        userId,
      );

      if (!result.success) {
        return res.status(409).json({ message: result.reason });
      }

      await Promise.all([
        updateAcceptedOfficer(Number(alarmId), userId),
        markOfficerBusy({ userId, alarmId: Number(alarmId) }),
      ]);

      const io = req.app.get("io");
      if (io) {
        io.emit("incident-accepted", {
          alarmId: Number(alarmId),
          stationId: isMainAdmin ? "main" : Number(stationId),
          acceptedBy: userId,
          assignedOfficerId: userId,
        });

        let stationNameAccepted = null;
        if (isMainAdmin) {
          stationNameAccepted = "Central Fire Station (Main)";
        } else {
          try {
            const { data: stationRow } = await supabase
              .from("fire_stations")
              .select("station_name")
              .eq("station_id", Number(stationId))
              .single();
            stationNameAccepted = stationRow?.station_name || null;
          } catch (_) {}
        }

        io.to(`alarm-${alarmId}`).emit("dispatch-accepted", {
          alarmId: Number(alarmId),
          dispatchedStationId: isMainAdmin ? "main" : Number(stationId),
          dispatchedStationType: isMainAdmin ? "main" : "substation",
          dispatchedStationName: stationNameAccepted,
          dispatchedOfficerId: userId,
        });
        io.to(isMainAdmin ? "main-admin" : `station-${Number(stationId)}`).emit(
          "station-cleanup",
          {
            alarmId: Number(alarmId),
            winnerUserId: userId,
            action: "dismiss-and-reject-ringing",
          },
        );
        console.log(
          `[AcceptAPI] Emitted dispatch-accepted to alarm-${alarmId} (station ${stationId})`,
        );
        console.log(
          `[AcceptAPI] Emitted station-cleanup for alarm-${alarmId} (winner user ${userId})`,
        );
      }

      res.json({
        message: "Incident accepted",
        alarm: result.alarm,
        assignedOfficerId: userId,
      });
    } catch (error) {
      console.error("Accept incident error:", error);
      res
        .status(500)
        .json({ message: "Failed to accept incident", error: error.message });
    }
  },
);

router.post(
  "/incidents/:alarmId/driver-accept",
  authenticateToken,
  requireRoles(["driver"]),
  async (req, res) => {
    try {
      const { alarmId } = req.params;
      const numericAlarmId = Number(alarmId);
      const stationId = getUserStationId(req.user);
      const truckId = Number(req.body?.truckId || 0) || null;

      if (!numericAlarmId) {
        return res.status(400).json({ message: "Valid alarmId is required" });
      }

      if (!stationId) {
        return res
          .status(400)
          .json({ message: "Driver has no assigned station" });
      }

      if (!truckId) {
        return res.status(400).json({ message: "truckId is required" });
      }

      const { data: truck, error: truckErr } = await supabase
        .from("firetrucks")
        .select("truck_id, assigned_station_id")
        .eq("truck_id", truckId)
        .maybeSingle();

      if (truckErr) throw truckErr;

      if (!truck) {
        return res.status(404).json({ message: "Firetruck not found" });
      }

      if (String(truck.assigned_station_id || "") !== String(stationId)) {
        return res.status(403).json({
          message: "Forbidden: firetruck is not assigned to your station",
        });
      }

      const { data: alarmBeforeUpdate, error: alarmLookupErr } = await supabase
        .from("alarms")
        .select(
          "alarm_id, assigned_station_id, assigned_truck_id, status, current_alarm_level, initial_alarm_level, dispatch_time",
        )
        .eq("alarm_id", numericAlarmId)
        .maybeSingle();

      if (alarmLookupErr) throw alarmLookupErr;

      if (!alarmBeforeUpdate) {
        return res.status(404).json({ message: "Incident not found" });
      }

      const mainStationId = await getMainStationId();
      const driverStationId = Number(stationId || 0) || null;
      const driverIsMainStation =
        Boolean(driverStationId) && driverStationId === mainStationId;
      const assignedStationId =
        Number(alarmBeforeUpdate.assigned_station_id || 0) || null;
      const assignedToMainByNull =
        !assignedStationId && driverIsMainStation;

      if (!assignedToMainByNull && assignedStationId !== driverStationId) {
        return res.status(403).json({
          message: "Forbidden: incident is not assigned to your station",
        });
      }

      if (["Resolved", "Cancelled"].includes(alarmBeforeUpdate.status)) {
        return res.status(409).json({
          message: "Incident is no longer available for driver dispatch",
        });
      }

      if (alarmBeforeUpdate.assigned_truck_id) {
        return res.status(409).json({
          message: "This mission has already been claimed by another driver",
          assignedTruckId: alarmBeforeUpdate.assigned_truck_id,
        });
      }

      const updatePayload = {
        assigned_truck_id: truckId,
      };

      // Normalize "main station" incidents that were stored with null station id.
      if (assignedToMainByNull) {
        updatePayload.assigned_station_id = driverStationId;
      }

      if (!alarmBeforeUpdate.dispatch_time) {
        updatePayload.dispatch_time = new Date().toISOString();
      }

      let alarmUpdateQuery = supabase
        .from("alarms")
        .update(updatePayload)
        .eq("alarm_id", numericAlarmId)
        .is("assigned_truck_id", null);

      if (assignedToMainByNull) {
        alarmUpdateQuery = alarmUpdateQuery.is("assigned_station_id", null);
      } else {
        alarmUpdateQuery = alarmUpdateQuery.eq("assigned_station_id", stationId);
      }

      const { data: updatedAlarm, error: updateErr } = await alarmUpdateQuery
        .select(
          "alarm_id, assigned_station_id, assigned_truck_id, status, current_alarm_level, initial_alarm_level",
        )
        .maybeSingle();

      if (updateErr) throw updateErr;

      if (!updatedAlarm) {
        return res.status(409).json({
          message: "This mission has already been claimed by another driver",
        });
      }

      const { error: truckUpdateErr } = await supabase
        .from("firetrucks")
        .update({ current_alarm_id: numericAlarmId })
        .eq("truck_id", truckId);

      if (truckUpdateErr) {
        console.warn(
          `[DriverAccept] Failed to update firetruck ${truckId} current_alarm_id: ${truckUpdateErr.message}`,
        );
      }

      const driverName =
        req.user?.name ||
        [req.user?.firstName, req.user?.lastName].filter(Boolean).join(" ") ||
        "Unknown Driver";

      const claimDetails = `Mission claimed by ${driverName} using truck #${truckId}`;

      const { error: claimLogErr } = await supabase
        .from("alarm_response_log")
        .insert([
          {
            alarm_id: numericAlarmId,
            action_type: "Driver Dispatch",
            details: claimDetails,
            performed_by_user_id: req.user.id,
          },
        ]);

      if (claimLogErr) {
        console.warn(
          `[DriverAccept] Failed to log driver claim for alarm ${numericAlarmId}: ${claimLogErr.message}`,
        );
      }

      const io = req.app.get("io");
      if (io) {
        const claimEvent = {
          alarmId: numericAlarmId,
          stationId: Number(stationId),
          truckId,
          driverUserId: req.user.id,
          driverName,
          claimedAt: new Date().toISOString(),
        };

        io.to(`driver-station-${stationId}`).emit(
          "driver-mission-claimed",
          claimEvent,
        );
        io.to(`alarm-${numericAlarmId}`).emit("driver-mission-claimed", {
          ...claimEvent,
          alarmLevel:
            updatedAlarm.current_alarm_level ||
            updatedAlarm.initial_alarm_level,
        });
      }

      return res.json({
        message: "Mission claimed successfully",
        alarm: updatedAlarm,
        truck: {
          truckId: truck.truck_id,
          plateNumber: null,
        },
      });
    } catch (error) {
      console.error("Driver accept incident error:", error);
      return res.status(500).json({
        message: "Failed to claim mission",
        error: error.message,
      });
    }
  },
);

// ── Reject incident — triggers immediate failover to next station (mark2) ─
router.post(
  "/incidents/:alarmId/reject",
  authenticateToken,
  async (req, res) => {
    try {
      const { alarmId } = req.params;
      const stationId = req.body.stationId || req.user.assignedStationId;

      cancelFailover(Number(alarmId));

      const { data: alarm } = await supabase
        .from("alarms")
        .select("alarm_id, user_latitude, user_longitude, status")
        .eq("alarm_id", alarmId)
        .single();

      if (!alarm || alarm.status !== "Pending Dispatch") {
        return res
          .status(409)
          .json({ message: "Incident is no longer pending" });
      }

      const ranked = await getRankedStations(
        alarm.user_latitude,
        alarm.user_longitude,
      );
      const remaining = ranked.filter(
        (s) => s.station_id !== Number(stationId),
      );

      if (remaining.length === 0) {
        return res
          .status(200)
          .json({ message: "No other stations available for reassignment" });
      }

      const nextStation = remaining[0];

      await supabase
        .from("alarms")
        .update({ assigned_station_id: nextStation.station_id })
        .eq("alarm_id", alarmId);

      await supabase.from("alarm_response_log").insert([
        {
          alarm_id: Number(alarmId),
          action_type: "Initial Dispatch",
          details: `Rejected by station ${stationId}. Reassigned to station ${nextStation.station_id} (${nextStation.station_name})`,
          performed_by_user_id: req.user.id || null,
        },
      ]);

      const io = req.app.get("io");
      if (io) {
        emitIncomingIncidentWithDismissGuard({
          io,
          targetRoom: `station-${nextStation.station_id}`,
          payload: {
            alarmId: Number(alarmId),
            assignedStationId: nextStation.station_id,
            stationName: nextStation.station_name,
            failover: true,
          },
          dispatchGroup: `station-${nextStation.station_id}`,
        });
      }

      startFailover(Number(alarmId), nextStation.station_id, remaining, io);

      res.json({
        message: "Incident rejected, reassigned to next station",
        nextStationId: nextStation.station_id,
        nextStationName: nextStation.station_name,
      });
    } catch (error) {
      console.error("Reject incident error:", error);
      res
        .status(500)
        .json({ message: "Failed to reject incident", error: error.message });
    }
  },
);

// ── Get all incidents — role-filtered (mine: admin sees all, stations see own) ─
router.get(
  "/incidents",
  authenticateToken,
  requireRoles(["admin", "substation_admin", "driver"]),
  async (req, res) => {
    try {
      const isAdmin = isAdminUser(req.user);
      const stationId = getUserStationId(req.user);

      if (!isAdmin && !stationId) {
        return res
          .status(400)
          .json({ message: "User has no assigned station" });
      }

      let query = supabase
        .from("alarms")
        .select(
          `alarm_id,end_user_id,user_latitude,user_longitude,initial_alarm_level,current_alarm_level,status,assigned_station_id,call_time,dispatch_time,resolve_time,users!end_user_id(full_name,phone_number),fire_stations!assigned_station_id(station_name),alarm_response_log!alarm_id(action_type,action_timestamp,details)`,
        )
        .order("call_time", { ascending: false })
        .limit(2000);

      if (!isAdmin) {
        query = query.eq("assigned_station_id", stationId);
      }

      const { data: alarms, error: alarmsErr } = await query;
      if (alarmsErr) throw alarmsErr;

      const flattened = (alarms || []).map((a) => {
        const logs = Array.isArray(a.alarm_response_log)
          ? [...a.alarm_response_log]
          : a.alarm_response_log
            ? [a.alarm_response_log]
            : [];

        logs.sort(
          (left, right) =>
            new Date(right?.action_timestamp || 0).getTime() -
            new Date(left?.action_timestamp || 0).getTime(),
        );

        const initialDispatchLog =
          logs.find((log) => log?.action_type === "Initial Dispatch") ||
          logs[0] ||
          null;
        const parsedDetails = parseIncidentLogDetails(
          initialDispatchLog?.details,
        );

        return {
          alarm_id: a.alarm_id,
          end_user_id: a.end_user_id,
          full_name: a.users?.full_name || a.users?.[0]?.full_name || null,
          phone_number:
            a.users?.phone_number || a.users?.[0]?.phone_number || null,
          user_latitude: a.user_latitude,
          user_longitude: a.user_longitude,
          initial_alarm_level: a.initial_alarm_level,
          current_alarm_level: a.current_alarm_level,
          status: a.status,
          assigned_station_id: a.assigned_station_id ?? null,
          call_time: a.call_time,
          dispatch_time: a.dispatch_time,
          resolve_time: a.resolve_time,
          station_name:
            a.fire_stations?.station_name ||
            a.fire_stations?.[0]?.station_name ||
            null,
          details: initialDispatchLog?.details || null,
          incident_type: parsedDetails.incidentType,
          location: parsedDetails.location,
          narrative: parsedDetails.narrative,
          timeline: logs
            .filter((log) => log?.action_timestamp)
            .map((log) => ({
              status: log.action_type || "Update",
              time: log.action_timestamp,
              details: log.details || null,
            })),
        };
      });

      res.json({ incidents: flattened, total: flattened.length });
    } catch (error) {
      console.error("Get incidents error:", error);
      res
        .status(500)
        .json({ message: "Failed to fetch incidents", error: error.message });
    }
  },
);

// ── Get latest firetruck locations (mark2) ────────────────────────────
router.get("/firetruck-locations", async (req, res) => {
  try {
    const minutes = Number(req.query.minutes);
    const recencyMinutes = Number.isFinite(minutes) && minutes > 0 ? minutes : 5;
    const cutoff = new Date(Date.now() - recencyMinutes * 60_000).toISOString();

    const { data: rows, error } = await supabase
      .from("firetruck_location_history")
      .select("truck_id, latitude, longitude, recorded_at")
      .gte("recorded_at", cutoff)
      .order("recorded_at", { ascending: false })
      .limit(2000);

    if (error) throw error;

    // Keep only the newest coordinate per truck.
    const latestByTruck = new Map();
    for (const row of rows || []) {
      if (row?.truck_id == null) continue;
      if (!latestByTruck.has(row.truck_id)) {
        latestByTruck.set(row.truck_id, row);
      }
    }
    const latestRows = Array.from(latestByTruck.values());

    // Fetch live status info (driver name, fire status, alarm level) from firetruck_status
    const truckIds = latestRows
      .map((row) => row.truck_id)
      .filter((truckId) => truckId != null);
    let statusMap = new Map();
    if (truckIds.length > 0) {
      const { data: statusRows } = await supabase
        .from("firetruck_status")
        .select("truck_id, driver_name, fire_status, alarm_level")
        .in("truck_id", truckIds);
      (statusRows || []).forEach((s) => statusMap.set(s.truck_id, s));
    }

    const locations = latestRows.map((r) => {
      const status = statusMap.get(r.truck_id) || {};
      return {
        truck_id: r.truck_id,
        latitude: r.latitude,
        longitude: r.longitude,
        recorded_at: r.recorded_at,
        driver_name: status.driver_name || null,
        fire_status: status.fire_status || null,
        alarm_level: status.alarm_level || null,
      };
    });

    res.json({ locations, total: locations.length });
  } catch (error) {
    console.error("Get firetruck-locations error:", error);
    res.status(500).json({
      message: "Failed to fetch firetruck locations",
      error: error.message,
    });
  }
});

// ── Get incident details — role + station isolation (mine) ────────────
router.get(
  "/incidents/:alarmId",
  authenticateToken,
  requireRoles(["admin", "substation_admin", "driver"]),
  async (req, res) => {
    try {
      const { alarmId } = req.params;
      const isAdmin = isAdminUser(req.user);
      const stationId = getUserStationId(req.user);

      if (!isAdmin && !stationId) {
        return res
          .status(400)
          .json({ message: "User has no assigned station" });
      }

      const { data: alarms, error: alarmErr } = await supabase
        .from("alarms")
        .select(
          "alarm_id,end_user_id,user_latitude,user_longitude,initial_alarm_level,current_alarm_level,status,assigned_station_id,call_time,dispatch_time,resolve_time,users(full_name,phone_number)",
        )
        .eq("alarm_id", alarmId)
        .limit(1);

      if (alarmErr) throw alarmErr;

      if (!alarms || alarms.length === 0) {
        return res.status(404).json({ message: "Incident not found" });
      }

      if (!isAdmin) {
        const incidentStationId = alarms[0]?.assigned_station_id ?? null;
        if (String(incidentStationId) !== String(stationId)) {
          return res.status(403).json({
            message: "Forbidden: incident is not assigned to your station",
          });
        }
      }

      const { data: logs, error: logsErr } = await supabase
        .from("alarm_response_log")
        .select(
          "log_id,action_timestamp,action_type,details,performed_by_user_id",
        )
        .eq("alarm_id", alarmId)
        .order("action_timestamp", { ascending: false });

      if (logsErr) throw logsErr;

      res.json({ incident: alarms[0], timeline: logs || [] });
    } catch (error) {
      console.error("Get incident details error:", error);
      res.status(500).json({
        message: "Failed to fetch incident details",
        error: error.message,
      });
    }
  },
);

// ── Update alarm level — role + station isolation (mine) ──────────────
router.patch(
  "/incidents/:alarmId/update-alarm-level",
  authenticateToken,
  requireRoles(["admin", "substation_admin", "driver"]),
  async (req, res) => {
    try {
      const { alarmId } = req.params;
      const { newAlarmLevel } = req.body;
      const isAdmin = isAdminUser(req.user);
      const stationId = getUserStationId(req.user);

      if (!isAdmin && !stationId) {
        return res
          .status(400)
          .json({ message: "User has no assigned station" });
      }

      if (!newAlarmLevel) {
        return res.status(400).json({ message: "New alarm level is required" });
      }

      if (!isAdmin) {
        const { data: incidentRow, error: incidentErr } = await supabase
          .from("alarms")
          .select("alarm_id, assigned_station_id")
          .eq("alarm_id", alarmId)
          .single();

        if (incidentErr) throw incidentErr;

        if (
          String(incidentRow?.assigned_station_id ?? "") !== String(stationId)
        ) {
          return res.status(403).json({
            message: "Forbidden: incident is not assigned to your station",
          });
        }
      }

      const { error: updateErr } = await supabase
        .from("alarms")
        .update({ current_alarm_level: newAlarmLevel })
        .eq("alarm_id", alarmId);

      if (updateErr) throw updateErr;

      const { error: logInsertErr } = await supabase
        .from("alarm_response_log")
        .insert([
          {
            alarm_id: alarmId,
            action_type: "Alarm Level Change",
            details: `Changed to ${newAlarmLevel}`,
            performed_by_user_id: req.user.id,
          },
        ]);

      if (logInsertErr) throw logInsertErr;

      res.json({ message: "Alarm level updated", alarmId, newAlarmLevel });
    } catch (error) {
      console.error("Update alarm level error:", error);
      res.status(500).json({
        message: "Failed to update alarm level",
        error: error.message,
      });
    }
  },
);

// ── Get full report data for PDF/DOCX generation ─────────────────────
router.get(
  "/incidents/:alarmId/report-data",
  authenticateToken,
  requireRoles(["admin", "substation_admin"]),
  async (req, res) => {
    try {
      const { alarmId } = req.params;

      const { data: alarm, error: alarmErr } = await supabase
        .from("alarms")
        .select(
          "alarm_id,end_user_id,user_latitude,user_longitude,initial_alarm_level,current_alarm_level,status,assigned_station_id,assigned_truck_id,call_time,dispatch_time,resolve_time,users!end_user_id(full_name,phone_number),fire_stations!assigned_station_id(station_name,address,contact_number)",
        )
        .eq("alarm_id", alarmId)
        .single();

      if (alarmErr || !alarm)
        return res.status(404).json({ message: "Incident not found" });

      const { data: logs } = await supabase
        .from("alarm_response_log")
        .select("action_type,details,action_timestamp,performed_by_user_id")
        .eq("alarm_id", alarmId)
        .order("action_timestamp", { ascending: true });

      const { data: report } = await supabase
        .from("incident_reports")
        .select("*")
        .eq("alarm_id", alarmId)
        .maybeSingle();

      let submitterName = null;
      if (report?.submitted_by_user_id) {
        const { data: submitter } = await supabase
          .from("users")
          .select("full_name")
          .eq("user_id", report.submitted_by_user_id)
          .single();
        submitterName = submitter?.full_name || null;
      }

      res.json({
        alarm: {
          ...alarm,
          caller_full_name: alarm.users?.full_name || null,
          caller_phone: alarm.users?.phone_number || null,
          station_name: alarm.fire_stations?.station_name || null,
          station_address: alarm.fire_stations?.address || null,
          station_contact: alarm.fire_stations?.contact_number || null,
          truck_plate: alarm.assigned_truck_id
            ? `Truck #${alarm.assigned_truck_id}`
            : null,
        },
        timeline: logs || [],
        report: report ? { ...report, submitter_name: submitterName } : null,
      });
    } catch (error) {
      console.error("Get report-data error:", error);
      res
        .status(500)
        .json({ message: "Failed to fetch report data", error: error.message });
    }
  },
);

// ── Save / update formal incident report ─────────────────────────────
router.post(
  "/incidents/:alarmId/submit-report",
  authenticateToken,
  requireRoles(["admin", "substation_admin"]),
  async (req, res) => {
    try {
      const { alarmId } = req.params;
      const {
        incident_type,
        narrative,
        injuries_reported,
        deaths_reported,
        property_affected,
        report_type,
        location,
      } = req.body;
      const isAdmin = isAdminUser(req.user);
      const stationId = getUserStationId(req.user);

      const { data: alarm, error: alarmErr } = await supabase
        .from("alarms")
        .select("alarm_id,assigned_station_id,user_latitude,user_longitude")
        .eq("alarm_id", alarmId)
        .single();

      if (alarmErr || !alarm)
        return res.status(404).json({ message: "Incident not found" });

      if (!isAdmin && String(alarm.assigned_station_id) !== String(stationId)) {
        return res.status(403).json({
          message: "Forbidden: this incident is not assigned to your station",
        });
      }

      const normalizedLocation =
        typeof location === "string" ? location.trim() : "";
      const alarmLatitude = Number(alarm.user_latitude);
      const alarmLongitude = Number(alarm.user_longitude);
      const hasAlarmCoordinates =
        Number.isFinite(alarmLatitude) && Number.isFinite(alarmLongitude);

      const locationFallback =
        normalizedLocation ||
        (hasAlarmCoordinates
          ? `${alarmLatitude}, ${alarmLongitude}`
          : "Unknown Location");

      const { data: existing } = await supabase
        .from("incident_reports")
        .select("report_id")
        .eq("alarm_id", alarmId)
        .maybeSingle();

      let result;
      const payload = {
        report_type: report_type || "Incident Report",
        incident_type,
        location: locationFallback,
        narrative,
        injuries_reported: injuries_reported ?? 0,
        deaths_reported: deaths_reported ?? 0,
        property_affected,
        submitted_by_user_id: req.user.id,
        submitted_at: new Date().toISOString(),
      };

      if (existing) {
        const { data, error } = await supabase
          .from("incident_reports")
          .update(payload)
          .eq("report_id", existing.report_id)
          .select()
          .single();
        if (error) throw error;
        result = data;
      } else {
        const { data, error } = await supabase
          .from("incident_reports")
          .insert([{ alarm_id: Number(alarmId), ...payload }])
          .select()
          .single();
        if (error) throw error;
        result = data;
      }

      res.json({ message: "Report saved", report: result });
    } catch (error) {
      console.error("Submit report error:", error);
      res
        .status(500)
        .json({ message: "Failed to save report", error: error.message });
    }
  },
);

// ── Update incident status ────────────────────────────────────────────
router.patch(
  "/incidents/:alarmId/status",
  authenticateToken,
  requireRoles(["admin", "substation_admin"]),
  async (req, res) => {
    try {
      const { alarmId } = req.params;
      const { status } = req.body;

      // Map UI display labels → DB CHECK constraint values
      const UI_TO_DB = {
        Pending: "Pending Dispatch",
        "Dispatch On the Way": "Dispatched",
        "Ongoing Response": "On Scene",
        "Fire Under Control": "Under Control",
        Resolved: "Resolved",
        Cancelled: "Cancelled",
      };
      const DB_VALUES = [
        "Pending Dispatch",
        "Dispatched",
        "On Scene",
        "Under Control",
        "Resolved",
        "Cancelled",
      ];
      // Accept either UI label or raw DB value
      const dbStatus = DB_VALUES.includes(status) ? status : UI_TO_DB[status];
      if (!dbStatus) {
        return res
          .status(400)
          .json({ message: "Invalid or missing status value" });
      }

      const now = new Date().toISOString();
      const updatePayload = { status: dbStatus };
      if (dbStatus === "Dispatched") updatePayload.dispatch_time = now;
      if (dbStatus === "Resolved") updatePayload.resolve_time = now;

      const { error: updateErr } = await supabase
        .from("alarms")
        .update(updatePayload)
        .eq("alarm_id", alarmId);

      if (updateErr) throw updateErr;

      const { error: logErr } = await supabase
        .from("alarm_response_log")
        .insert([
          {
            alarm_id: Number(alarmId),
            action_type: "Status Change",
            details: `Status changed to ${dbStatus}`,
            performed_by_user_id: req.user.id,
          },
        ]);

      if (logErr) console.warn("Failed to log status change:", logErr.message);

      const io = req.app.get("io");
      if (io) {
        io.emit("incident-status-updated", {
          alarmId: Number(alarmId),
          status: dbStatus,
        });
      }

      res.json({ message: "Status updated", alarmId, status: dbStatus });
    } catch (error) {
      console.error("Update incident status error:", error);
      res
        .status(500)
        .json({ message: "Failed to update status", error: error.message });
    }
  },
);

export default router;
