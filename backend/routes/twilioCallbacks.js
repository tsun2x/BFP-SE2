import express from "express";
import { cancelFailover } from "../services/dispatchService.js";
import { supabase } from "../supabaseClient.js";

// In-memory set to track recently transferred call SIDs
const recentlyTransferredCallSids = new Set();

// Helper to mark a callSid as transferred
export function markCallSidTransferred(callSid) {
  if (callSid) {
    recentlyTransferredCallSids.add(callSid);
    // Remove after 30 seconds to avoid memory leak
    setTimeout(() => recentlyTransferredCallSids.delete(callSid), 30000);
  }
}

const router = express.Router();

function normalizeIdentity(value) {
  return String(value || "").replace(/^client:/i, "").trim();
}

function getStationIdFromTwilioIdentity(identity) {
  const normalized = normalizeIdentity(identity);
  if (!normalized) return null;

  if (/^ADM_MAIN(?:_\d+)?$/i.test(normalized)) {
    return 1;
  }

  const subMatch = normalized.match(/^ADM_SUB_(\d+)(?:_\d+)?$/i);
  if (subMatch) {
    return Number(subMatch[1]) || null;
  }

  return null;
}

// ── Twilio call-status webhook ──────────────────────────────────────
// Twilio call-status webhook is the source of truth for media connection.
// When a station leg reaches in-progress, emit call-accepted (voice-connected semantics).
router.post("/twilio/call-status", async (req, res) => {
  try {
    const { CallStatus, To, From, CallSid } = req.body;
    console.log(
      `[CallStatus] ${CallStatus} | To=${To} From=${From} CallSid=${CallSid}`,
    );

    // Ignore completed events for recently transferred calls (dispatcher leg hangup after transfer)
    if (
      CallStatus === "completed" &&
      recentlyTransferredCallSids.has(CallSid)
    ) {
      console.log(
        `[CallStatus] Ignoring completed event for transferred callSid ${CallSid}`,
      );
      recentlyTransferredCallSids.delete(CallSid);
      res.sendStatus(200);
      return;
    }

    if (CallStatus === "in-progress") {
      const stationId = getStationIdFromTwilioIdentity(To);
      if (stationId) {
        // Find the most recent dispatched/pending alarm assigned to this station.
        const { data: alarm } = await supabase
          .from("alarms")
          .select("alarm_id, status")
          .eq("assigned_station_id", stationId)
          .in("status", ["Dispatched", "Pending Dispatch"])
          .order("call_time", { ascending: false })
          .limit(1)
          .single();

        if (alarm) {
          const { data: stn } = await supabase
            .from("fire_stations")
            .select("station_name")
            .eq("station_id", stationId)
            .single();
          const friendlyName = stn?.station_name || `Station ${stationId}`;

          const io = req.app.get("io");
          if (io) {
            io.to(`alarm-${alarm.alarm_id}`).emit("call-accepted", {
              alarmId: alarm.alarm_id,
              stationId,
              stationName: friendlyName,
              callSid: CallSid,
            });
          }
          console.log(
            `[CallStatus] Emitted call-accepted (voice connected) alarm ${alarm.alarm_id} for ${friendlyName} (status=${alarm.status})`,
          );
        }
      }
    }
  } catch (err) {
    console.error("[CallStatus] Error:", err.message);
  }
  res.sendStatus(200);
});

router.post("/twilio/recording-status", (req, res) => {
  try {
    console.log("[Twilio Recording Status] payload:", req.body);
  } catch (err) {
    console.error("Error logging Twilio recording status:", err);
  }
  res.sendStatus(200);
});

export default router;
