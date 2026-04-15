import express from "express";
import twilio from "twilio";
import { authenticateToken } from "../middleware/auth.js";
import { supabase } from "../supabaseClient.js";
import {
  getOfficerTwilioIdentity,
  getPreferredOfficerTwilioIdentity,
} from "../services/officerDispatchService.js";
import { markCallSidTransferred } from "./twilioCallbacks.js";
import { sendIncomingCallNotification } from "../services/fcmService.js";

const router = express.Router();

const { AccessToken } = twilio.jwt;
const { VoiceGrant } = AccessToken;
let lastSyncedVoiceUrl = null;

function getExpectedStationIdentity(user) {
  if (!user) return null;

  const role = String(user.role || "").toLowerCase();
  const userId = user.id || user.user_id || null;

  if (role === "driver") {
    return userId ? `TRUCK_${userId}` : null;
  }

  if (role === "admin") {
    return "ADM_MAIN";
  }

  const assignedStationId =
    user.assignedStationId || user.assigned_station_id || null;
  if (!assignedStationId) return null;

  return `ADM_SUB_${assignedStationId}`;
}

function getAllowedClientIdentities(user) {
  const identities = new Set();
  const legacyIdentity = getExpectedStationIdentity(user);
  const officerIdentity = getOfficerTwilioIdentity(user);

  if (legacyIdentity) identities.add(legacyIdentity);
  if (officerIdentity) identities.add(officerIdentity);

  return [...identities];
}

function getStationIdentityById(stationId) {
  const normalized = Number(stationId);
  if (!Number.isFinite(normalized)) return null;
  if (normalized === 1) return "ADM_MAIN";
  return `ADM_SUB_${normalized}`;
}

function getDispatchGroupFromLegacyIdentity(identity) {
  const normalized = normalizeClientIdentity(identity);

  if (normalized === "ADM_MAIN") {
    return "main-admin";
  }

  const stationMatch = normalized.match(/^ADM_SUB_(\d+)$/i);
  if (stationMatch) {
    return `station-${Number(stationMatch[1])}`;
  }

  return null;
}

async function fallbackResolveIdentityFromUsers(legacyIdentity) {
  try {
    if (legacyIdentity === "ADM_MAIN") {
      const { data, error } = await supabase
        .from("users")
        .select("user_id")
        .eq("role", "admin")
        .limit(1)
        .maybeSingle();
      if (!error && data?.user_id) {
        const resolved = `ADM_MAIN_${data.user_id}`;
        console.log(`[TwilioVoice] Fallback resolved ${legacyIdentity} -> ${resolved}`);
        return resolved;
      }
    }

    const subMatch = legacyIdentity.match(/^ADM_SUB_(\d+)$/i);
    if (subMatch) {
      const stationId = Number(subMatch[1]);
      const { data, error } = await supabase
        .from("users")
        .select("user_id")
        .eq("assigned_station_id", stationId)
        .in("role", ["admin", "substation_admin"])
        .limit(1)
        .maybeSingle();
      if (!error && data?.user_id) {
        const resolved = `ADM_SUB_${stationId}_${data.user_id}`;
        console.log(`[TwilioVoice] Fallback resolved ${legacyIdentity} -> ${resolved}`);
        return resolved;
      }
    }
  } catch (err) {
    console.warn(`[TwilioVoice] Fallback identity resolution failed:`, err?.message || err);
  }
  return legacyIdentity;
}

async function resolveTwilioTargetIdentity(identity) {
  const normalized = normalizeClientIdentity(identity);
  const dispatchGroup = getDispatchGroupFromLegacyIdentity(normalized);

  if (!dispatchGroup) {
    return normalized;
  }

  try {
    const preferred = await getPreferredOfficerTwilioIdentity(dispatchGroup);
    if (preferred.identity) {
      console.log(
        `[TwilioVoice] Resolved legacy target ${normalized} -> ${preferred.identity}`,
      );
      return preferred.identity;
    }
  } catch (error) {
    console.error(
      `[TwilioVoice] Failed resolving legacy target ${normalized}:`,
      error?.message || error,
    );
  }

  // Fallback: query users table directly when officer_dispatch_status is unavailable
  return fallbackResolveIdentityFromUsers(normalized);
}

function normalizeClientIdentity(value) {
  return String(value || "")
    .replace(/^client:/i, "")
    .trim();
}

async function getDriverParentIdentity(fromIdentity) {
  const normalized = normalizeClientIdentity(fromIdentity);
  const match = normalized.match(/^TRUCK_(\d+)$/i);
  if (!match) return null;

  const driverId = Number(match[1]);
  if (!Number.isFinite(driverId)) return null;

  const { data: driver, error: driverError } = await supabase
    .from("users")
    .select("user_id,role,assigned_station_id")
    .eq("user_id", driverId)
    .maybeSingle();

  if (driverError) {
    console.error("[TwilioVoice] Driver lookup failed:", driverError);
  }

  const driverRole = String(driver?.role || "")
    .trim()
    .toLowerCase();
  if (driver && driverRole && driverRole !== "driver") {
    console.warn(
      `[TwilioVoice] TRUCK identity user_id=${driverId} has unexpected role=${driverRole}`,
    );
  }

  const stationFromUser = getStationIdentityById(driver?.assigned_station_id);
  if (stationFromUser) {
    return stationFromUser;
  }

  // Fallback: some deployments rely on firetruck assignment rather than users.assigned_station_id.
  const { data: truckRows, error: truckError } = await supabase
    .from("firetrucks")
    .select("truck_id,assigned_station_id,is_active")
    .eq("driver_id", driverId)
    .order("updated_at", { ascending: false })
    .limit(1);

  if (truckError) {
    console.error("[TwilioVoice] Driver firetruck lookup failed:", truckError);
    return null;
  }

  const truck = Array.isArray(truckRows) ? truckRows[0] : null;
  if (!truck) return null;

  return getStationIdentityById(truck.assigned_station_id);
}

async function syncTwimlVoiceUrlIfNeeded() {
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
    return;
  }

  const normalizedBase = PUBLIC_BASE_URL.replace(/\/$/, "");
  const voiceUrl = `${normalizedBase}/api/twilio/voice`;
  if (voiceUrl === lastSyncedVoiceUrl) {
    return;
  }

  const twilioClient = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
  await twilioClient.applications(TWILIO_TWIML_APP_SID).update({
    voiceUrl,
    voiceMethod: "POST",
  });
  lastSyncedVoiceUrl = voiceUrl;
  console.log(`[TwilioToken] Synced TwiML App voice URL -> ${voiceUrl}`);
}

// ── POST /api/twilio/token ──────────────────────────────────────────
// Returns a short-lived Twilio Access Token with a Voice grant.
// The client passes its identity (e.g. ADM_MAIN, ADM_SUB_2, CIV_123, TRUCK_5).
// The token lets the Twilio Voice SDK register and receive/make calls.
// CIV_ identities skip JWT auth (emergency calls must work without login).
router.post(
  "/twilio/token",
  (req, res, next) => {
    const { identity } = req.body || {};
    if (identity && identity.startsWith("CIV_")) {
      return next();
    }
    return authenticateToken(req, res, next);
  },
  async (req, res) => {
    try {
      const { identity } = req.body;

      if (!identity) {
        return res.status(400).json({ message: "identity is required" });
      }

      if (!identity.startsWith("CIV_")) {
        const allowedIdentities = getAllowedClientIdentities(req.user);
        if (allowedIdentities.length === 0) {
          return res.status(403).json({
            message: "Authenticated user has no station identity assigned",
          });
        }

        if (!allowedIdentities.includes(identity)) {
          return res.status(403).json({
            message:
              "Requested Twilio identity does not match the authenticated user station",
            expectedIdentity: allowedIdentities[0],
            allowedIdentities,
          });
        }
      }

      const accountSid = process.env.TWILIO_ACCOUNT_SID;
      const apiKey = process.env.TWILIO_API_KEY;
      const apiSecret = process.env.TWILIO_API_SECRET;
      const twimlAppSid = process.env.TWILIO_TWIML_APP_SID;

      if (!accountSid || !apiKey || !apiSecret || !twimlAppSid) {
        console.error(
          "[TwilioToken] Missing env vars: TWILIO_ACCOUNT_SID, TWILIO_API_KEY, TWILIO_API_SECRET, TWILIO_TWIML_APP_SID",
        );
        return res
          .status(500)
          .json({ message: "Twilio credentials not configured on server" });
      }

      try {
        await syncTwimlVoiceUrlIfNeeded();
      } catch (syncError) {
        console.error(
          "[TwilioToken] Failed to sync TwiML App voice URL:",
          syncError?.message || syncError,
        );
      }

      const token = new AccessToken(accountSid, apiKey, apiSecret, {
        identity,
        ttl: 3600, // 1 hour
      });

      const voiceGrant = new VoiceGrant({
        outgoingApplicationSid: twimlAppSid,
        incomingAllow: true, // allow receiving incoming calls to this identity
      });

      token.addGrant(voiceGrant);

      console.log(`[TwilioToken] Issued token for identity=${identity}`);
      res.json({ token: token.toJwt(), identity });
    } catch (error) {
      console.error("[TwilioToken] Error:", error);
      res.status(500).json({
        message: "Failed to generate Twilio token",
        error: error.message,
      });
    }
  },
);

// ── POST /api/twilio/voice ──────────────────────────────────────────
// TwiML App voice webhook. Twilio hits this when a Client-initiated
// call is made. We route based on the "To" parameter:
//   - If To starts with "ADM_" or "SUB_"  → dial that Client identity
//   - If To starts with "CIV_"            → dial that Client identity
//   - If To starts with "+"               → dial PSTN number
//   - Otherwise                           → reject
router.post("/twilio/voice", async (req, res) => {
  try {
    const { To, From, CallSid } = req.body;
    const rawToIdentity = normalizeClientIdentity(To);
    const toIdentity = await resolveTwilioTargetIdentity(rawToIdentity);
    const fromIdentity = normalizeClientIdentity(From);
    console.log(
      `[TwilioVoice] Incoming voice webhook: From=${From} To=${To} ResolvedTo=${toIdentity} CallSid=${CallSid}`,
    );

    const VoiceResponse = twilio.twiml.VoiceResponse;
    const twiml = new VoiceResponse();

    if (!To || To === "") {
      twiml.say({ voice: "alice" }, "No destination specified.");
      twiml.hangup();
    } else if (fromIdentity.startsWith("TRUCK_")) {
      const allowedParentIdentity = await getDriverParentIdentity(fromIdentity);
      // Compare the RAW (unresolved) identity against the allowed parent station identity.
      // resolveTwilioTargetIdentity may map ADM_SUB_6 → a specific officer identity,
      // so we must check the raw target first, then resolve only for dialing.
      console.log(
        `[TwilioVoice] Truck parent identity check: from=${fromIdentity} rawTo=${rawToIdentity} resolvedTo=${toIdentity} allowed=${allowedParentIdentity || "<none>"}`,
      );
      if (!allowedParentIdentity) {
        twiml.say(
          { voice: "alice" },
          "This truck account is missing a valid parent station assignment.",
        );
        twiml.hangup();
      } else if (rawToIdentity !== allowedParentIdentity) {
        console.warn(
          `[TwilioVoice] Blocked truck call ${fromIdentity} -> ${rawToIdentity}. Allowed target=${allowedParentIdentity}`,
        );
        twiml.say(
          { voice: "alice" },
          "You can only call your assigned parent station from this device.",
        );
        twiml.hangup();
      } else {
        // Use the resolved identity (may be officer-specific) for dialing
        const dialTarget = toIdentity;
        const dial = twiml.dial({
          callerId: From || process.env.TWILIO_CALLER_ID,
          record: "record-from-answer",
          ringTone: "us",
          statusCallbackEvent: "initiated ringing answered completed",
          statusCallback: `${(process.env.PUBLIC_BASE_URL || "").replace(/\/$/, "")}/api/twilio/call-status`,
        });
        dial.client(dialTarget);
        console.log(
          `[TwilioVoice] Truck call allowed ${fromIdentity} -> ${dialTarget} (raw=${rawToIdentity})`,
        );
      }
    } else if (
      toIdentity.startsWith("ADM_") ||
      toIdentity.startsWith("SUB_") ||
      toIdentity.startsWith("CIV_") ||
      toIdentity.startsWith("TRUCK_")
    ) {
      // Route to a Twilio Client identity with ringback tone so caller hears ringing
      const dial = twiml.dial({
        callerId: From || process.env.TWILIO_CALLER_ID,
        record: "record-from-answer",
        ringTone: "us",
        statusCallbackEvent: "initiated ringing answered completed",
        statusCallback: `${(process.env.PUBLIC_BASE_URL || "").replace(/\/$/, "")}/api/twilio/call-status`,
      });
      dial.client(toIdentity);
      console.log(`[TwilioVoice] Ringing ${toIdentity} with US ringback tone`);

      // Send FCM push for mobile identities so the app wakes up
      if (toIdentity.startsWith("TRUCK_") || toIdentity.startsWith("CIV_")) {
        sendIncomingCallNotification({
          targetIdentity: toIdentity,
          callerIdentity: fromIdentity,
          callSid: CallSid,
          callerName: fromIdentity,
        }).catch((err) =>
          console.error("[TwilioVoice] FCM push error:", err.message),
        );
      }
    } else if (To.startsWith("+")) {
      // Route to PSTN number
      twiml.say(
        { voice: "alice" },
        "Connecting you to the fire station. Please stay on the line.",
      );
      const dial = twiml.dial({
        callerId: process.env.TWILIO_CALLER_ID,
        record: "record-from-answer",
        statusCallbackEvent: "initiated ringing answered completed",
        statusCallback: `${(process.env.PUBLIC_BASE_URL || "").replace(/\/$/, "")}/api/twilio/call-status`,
      });
      dial.number(To);
    } else {
      twiml.say({ voice: "alice" }, "Invalid destination.");
      twiml.hangup();
    }

    res.type("text/xml").send(twiml.toString());
  } catch (error) {
    console.error("[TwilioVoice] Error:", error);
    const VoiceResponse = twilio.twiml.VoiceResponse;
    const twiml = new VoiceResponse();
    twiml.say({ voice: "alice" }, "An error occurred. Please try again.");
    res.type("text/xml").send(twiml.toString());
  }
});

// ── POST /api/twilio/transfer ────────────────────────────────────────
// Blind-transfer an active call to another station identity.
// The current admin's leg is disconnected and the caller hears ringing
// while being connected to the target station.
router.post("/twilio/transfer", authenticateToken, async (req, res) => {
  try {
    const { callSid, targetIdentity } = req.body;

    if (!callSid || !targetIdentity) {
      return res
        .status(400)
        .json({ message: "callSid and targetIdentity are required" });
    }

    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const publicBase = (process.env.PUBLIC_BASE_URL || "").replace(/\/$/, "");

    if (!accountSid || !authToken) {
      return res
        .status(500)
        .json({ message: "Twilio credentials not configured" });
    }

    const client = twilio(accountSid, authToken);

    // The frontend sends the child-leg CallSid (the station's leg).
    // We need the PARENT call SID to redirect the entire call.
    let parentCallSid = callSid;
    try {
      const childCall = await client.calls(callSid).fetch();
      if (childCall.parentCallSid) {
        parentCallSid = childCall.parentCallSid;
        console.log(
          `[TwilioTransfer] Resolved child ${callSid} → parent ${parentCallSid}`,
        );
      }
    } catch (lookupErr) {
      console.warn(
        `[TwilioTransfer] Could not fetch parent for ${callSid}, using as-is:`,
        lookupErr.message,
      );
    }

    // Redirect the parent call to TwiML that dials the target identity
    const transferUrl = `${publicBase}/api/twilio/transfer-twiml?target=${encodeURIComponent(targetIdentity)}`;

    await client.calls(parentCallSid).update({ url: transferUrl, method: "POST" });
    // Mark both SIDs as transferred so webhook ignores hangup
    markCallSidTransferred(callSid);
    if (parentCallSid !== callSid) markCallSidTransferred(parentCallSid);

    console.log(
      `[TwilioTransfer] Transferred call ${parentCallSid} → ${targetIdentity}`,
    );
    res.json({ success: true, callSid: parentCallSid, targetIdentity });
  } catch (error) {
    console.error("[TwilioTransfer] Error:", error);
    res.status(500).json({ message: "Transfer failed", error: error.message });
  }
});

// ── POST /api/twilio/transfer-twiml ─────────────────────────────────
// Returns TwiML that connects the caller to the target station identity.
router.post("/twilio/transfer-twiml", async (req, res) => {
  try {
    const target = req.body.target || req.query.target;
    const VoiceResponse = twilio.twiml.VoiceResponse;
    const twiml = new VoiceResponse();

    console.log(
      "[TwilioTransferTwiml] Incoming transfer request. Target:",
      target,
    );

    if (!target) {
      console.warn("[TwilioTransferTwiml] No target specified for transfer.");
      twiml.say({ voice: "alice" }, "Transfer failed. No target specified.");
      twiml.hangup();
    } else {
      // Resolve legacy identity (e.g. ADM_SUB_2) to actual officer identity
      const resolvedTarget = await resolveTwilioTargetIdentity(target);
      console.log(
        `[TwilioTransferTwiml] Resolved target: ${target} → ${resolvedTarget}`,
      );
      twiml.say({ voice: "alice" }, "Please hold while we transfer your call.");
      const dial = twiml.dial({
        callerId: process.env.TWILIO_CALLER_ID,
        ringTone: "us",
        record: "record-from-answer",
      });
      dial.client(resolvedTarget);
      console.log("[TwilioTransferTwiml] Dialing client identity:", resolvedTarget);
    }

    res.type("text/xml").send(twiml.toString());
  } catch (error) {
    console.error("[TwilioTransferTwiml] Error:", error);
    const VoiceResponse = twilio.twiml.VoiceResponse;
    const twiml = new VoiceResponse();
    twiml.say({ voice: "alice" }, "Transfer error.");
    res.type("text/xml").send(twiml.toString());
  }
});

export default router;
