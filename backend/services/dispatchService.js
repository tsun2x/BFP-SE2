import { supabase } from "../supabaseClient.js";
import {
  getOfficerRoomForUser,
  releaseOfficerByAlarm,
  reserveAvailableOfficer,
  markOfficerOffline,
} from "./officerDispatchService.js";
import {
  emitIncomingIncidentWithDismissGuard,
  isIncidentDismissedByDispatcher,
} from "./incidentDismissGuardService.js";

// ── In-memory failover timers ────────────────────────────────────────
// Maps alarmId → { timerId, stationId, stationQueue }
const failoverTimers = new Map();

const FAILOVER_TIMEOUT_MS = 60_000; // 60 seconds per station

// Timestamped log for failover debugging
function flog(msg) {
  const ts = new Date().toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  console.log(`[Failover ${ts}] ${msg}`);
}

function getOnlineDispatcherUserIdFromGroup(io, dispatchGroup) {
  const roomMembers = io?.sockets?.adapter?.rooms?.get(dispatchGroup);
  if (!roomMembers || roomMembers.size === 0) {
    return null;
  }

  const candidateUserIds = [];
  for (const socketId of roomMembers) {
    const socket = io?.sockets?.sockets?.get(socketId);
    const userId = Number(socket?._dispatcherUserId || 0) || null;
    if (userId) {
      candidateUserIds.push(userId);
    }
  }

  if (candidateUserIds.length === 0) {
    return null;
  }

  candidateUserIds.sort((a, b) => a - b);
  return candidateUserIds[0] || null;
}

async function updateAssignedOfficer(alarmId, officerId) {
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

export async function dispatchIncidentToGroup({
  io,
  alarmId,
  dispatchGroup,
  fallbackRoom,
  payload,
}) {
  let assignedOfficerId = null;
  let reservation = { supported: false, officer: null };

  try {
    reservation = await reserveAvailableOfficer({
      dispatchGroup,
      alarmId,
    });

    if (reservation.supported && reservation.officer?.user_id) {
      assignedOfficerId = Number(reservation.officer.user_id);

      // Verify the reserved officer actually has an active socket connection.
      // Stale officer_dispatch_status rows can route Twilio calls to offline identities.
      const officerRoom = getOfficerRoomForUser(assignedOfficerId);
      const roomSockets = officerRoom
        ? io?.sockets?.adapter?.rooms?.get(officerRoom)
        : null;
      const isActuallyConnected = roomSockets && roomSockets.size > 0;

      if (!isActuallyConnected) {
        flog(
          `alarm ${alarmId}: reserved officer ${assignedOfficerId} (${dispatchGroup}) has NO active socket — releasing and falling through`,
        );
        // Clean up the stale reservation so future dispatches skip this officer
        try {
          await markOfficerOffline(assignedOfficerId);
        } catch (_) { /* best-effort */ }
        assignedOfficerId = null;
      } else {
        await updateAssignedOfficer(alarmId, assignedOfficerId);

        const suppressedForOfficer = isIncidentDismissedByDispatcher({
          alarmId,
          dispatcherUserId: assignedOfficerId,
        });

        if (suppressedForOfficer) {
          flog(
            `alarm ${alarmId}: skipped officer ${assignedOfficerId} (${dispatchGroup}) due to dismiss cooldown`,
          );
        } else {
          io.to(officerRoom).emit(
            "incoming-incident",
            {
              ...payload,
              assignedOfficerId,
              dispatchGroup,
            },
          );

          flog(
            `alarm ${alarmId}: → officer ${assignedOfficerId} (${dispatchGroup}) notified via incoming-incident`,
          );

          return { assignedOfficerId, deliveryMode: "officer" };
        }
      }
    }
  } catch (error) {
    flog(
      `alarm ${alarmId}: officer reservation failed for ${dispatchGroup} — ${error.message}`,
    );
  }

  // When the DB-based reservation found no usable officer (stale or none available),
  // always try the socket-based connected-dispatcher fallback.
  const connectedFallbackOfficerId = getOnlineDispatcherUserIdFromGroup(io, dispatchGroup);
  if (connectedFallbackOfficerId) {
    await updateAssignedOfficer(alarmId, connectedFallbackOfficerId);

    const suppressedForFallbackOfficer = isIncidentDismissedByDispatcher({
      alarmId,
      dispatcherUserId: connectedFallbackOfficerId,
    });

    if (suppressedForFallbackOfficer) {
      flog(
        `alarm ${alarmId}: skipped fallback officer ${connectedFallbackOfficerId} (${dispatchGroup}) due to dismiss cooldown`,
      );
    } else {
      io.to(getOfficerRoomForUser(connectedFallbackOfficerId)).emit(
        "incoming-incident",
        {
          ...payload,
          assignedOfficerId: connectedFallbackOfficerId,
          dispatchGroup,
        },
      );

      flog(
        `alarm ${alarmId}: → connected fallback officer ${connectedFallbackOfficerId} (${dispatchGroup}) notified via incoming-incident`,
      );

      return {
        assignedOfficerId: connectedFallbackOfficerId,
        deliveryMode: "connected-fallback-officer",
      };
    }
  }

  await updateAssignedOfficer(alarmId, null);
  const roomTarget = fallbackRoom || dispatchGroup;
  const guardedEmitResult = emitIncomingIncidentWithDismissGuard({
    io,
    targetRoom: roomTarget,
    payload: {
      ...payload,
      assignedOfficerId: null,
    },
    dispatchGroup,
  });
  flog(
    `alarm ${alarmId}: → ${roomTarget} notified via fallback incoming-incident (delivered=${guardedEmitResult.deliveredCount}, skipped=${guardedEmitResult.skippedCount})`,
  );

  return { assignedOfficerId: null, deliveryMode: "group" };
}

// ── Haversine distance (km) ─────────────────────────────────────────
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

// ── Atomic incident accept ──────────────────────────────────────────
// Uses conditional update: only succeeds if status is still 'Pending Dispatch'.
// Returns { success, alarm } or { success: false, reason }.
export async function acceptIncident(alarmId, stationId, userId) {
  // Atomic: update only if still pending
  const { data: updated, error } = await supabase
    .from("alarms")
    .update({
      status: "Dispatched",
      assigned_station_id: stationId,
      dispatch_time: new Date().toISOString(),
    })
    .eq("alarm_id", alarmId)
    .eq("status", "Pending Dispatch") // race-condition guard
    .select("alarm_id, status, assigned_station_id")
    .single();

  if (error || !updated) {
    return {
      success: false,
      reason: "Incident already accepted by another station or not pending",
    };
  }

  // Log acceptance
  await supabase.from("alarm_response_log").insert([
    {
      alarm_id: alarmId,
      action_type: "Received from Station",
      details: `Accepted by station ${stationId}`,
      performed_by_user_id: userId || null,
    },
  ]);

  // Cancel any failover timer
  cancelFailover(alarmId);

  return { success: true, alarm: updated };
}

// ── Start failover timer ────────────────────────────────────────────
// Called after dispatching to a station. If no accept within timeout,
// reassign to the next nearest eligible station.
// alarmMeta = { callerId, phoneNumber, firstName, lastName, incidentType, alarmLevel, location, narrative, coordinates }
export function startFailover(
  alarmId,
  currentStationId,
  rankedStations,
  io,
  alarmMeta = {},
) {
  cancelFailover(alarmId); // clear any existing timer

  // Remaining stations after the current one
  const remaining = rankedStations.filter(
    (s) => s.station_id !== currentStationId,
  );

  if (remaining.length === 0) {
    flog(
      `alarm ${alarmId}: LAST SUBSTATION (${currentStationId}). Waiting ${FAILOVER_TIMEOUT_MS / 1000}s before main admin.`,
    );

    // Still wait for the current (last) substation before going to main admin
    const lastSubTimerId = setTimeout(async () => {
      failoverTimers.delete(alarmId);
      try {
        // Check if still pending
        const { data: alarm } = await supabase
          .from("alarms")
          .select("alarm_id, status")
          .eq("alarm_id", alarmId)
          .single();
        if (!alarm || alarm.status !== "Pending Dispatch") {
          flog(
            `alarm ${alarmId}: SKIPPED — already handled (status=${alarm?.status})`,
          );
          return;
        }

        await releaseOfficerByAlarm(alarmId);
        await updateAssignedOfficer(alarmId, null);

        // Auto-reject the last substation
        if (io) {
          io.to(`station-${currentStationId}`).emit("auto-reject", { alarmId });
          flog(
            `alarm ${alarmId}: → station ${currentStationId}: auto-reject sent (last sub timeout)`,
          );
        }

        flog(
          `alarm ${alarmId}: ALL SUBSTATIONS EXHAUSTED. Notifying main admin.`,
        );
        if (io) {
          const dispatchResult = await dispatchIncidentToGroup({
            io,
            alarmId,
            dispatchGroup: "main-admin",
            fallbackRoom: "main-admin",
            payload: {
              alarmId,
              callerId: alarmMeta.callerId || null,
              phoneNumber: alarmMeta.phoneNumber || null,
              firstName: alarmMeta.firstName || null,
              lastName: alarmMeta.lastName || null,
              incidentType: alarmMeta.incidentType || null,
              alarmLevel: alarmMeta.alarmLevel || null,
              location: alarmMeta.location || null,
              narrative: alarmMeta.narrative || null,
              coordinates: alarmMeta.coordinates || {},
              assignedStationId: "main",
              stationName: "Central Fire Station (Main)",
              failover: true,
            },
          });

          io.to(`alarm-${alarmId}`).emit("failover-redirect", {
            alarmId,
            fromStationId: currentStationId,
            toStationId: "main",
            toStationName: "Central Fire Station (Main)",
            assignedOfficerId: dispatchResult.assignedOfficerId || null,
          });
          flog(`alarm ${alarmId}: → MAIN ADMIN notified via incoming-incident`);

          // Start a final failover timer for the main admin
          const mainTimerId = setTimeout(async () => {
            failoverTimers.delete(alarmId);
            const { data: activeAlarm } = await supabase
              .from("alarms")
              .select("alarm_id, status")
              .eq("alarm_id", alarmId)
              .single();

            if (!activeAlarm || activeAlarm.status !== "Pending Dispatch") {
              flog(
                `alarm ${alarmId}: MAIN ADMIN TIMEOUT skipped — already handled (status=${activeAlarm?.status})`,
              );
              return;
            }

            await releaseOfficerByAlarm(alarmId);
            await updateAssignedOfficer(alarmId, null);
            flog(
              `alarm ${alarmId}: MAIN ADMIN TIMEOUT — no one answered. Emitting failover-exhausted.`,
            );
            io.to("main-admin").emit("auto-reject", { alarmId });
            flog(`alarm ${alarmId}: → main-admin: auto-reject sent`);
            io.to(`alarm-${alarmId}`).emit("failover-exhausted", { alarmId });
          }, FAILOVER_TIMEOUT_MS);
          failoverTimers.set(alarmId, {
            timerId: mainTimerId,
            stationId: "main",
            remaining: [],
          });
          flog(
            `alarm ${alarmId}: ⏱ Timer started → MAIN ADMIN (${FAILOVER_TIMEOUT_MS / 1000}s)`,
          );
        }
      } catch (err) {
        flog(`alarm ${alarmId}: ERROR in last-sub timer — ${err.message}`);
        console.error(err);
      }
    }, FAILOVER_TIMEOUT_MS);

    failoverTimers.set(alarmId, {
      timerId: lastSubTimerId,
      stationId: currentStationId,
      remaining: [],
    });
    flog(
      `alarm ${alarmId}: ⏱ Timer started → station ${currentStationId} (LAST SUB, ${FAILOVER_TIMEOUT_MS / 1000}s)`,
    );
    return;
  }

  const timerId = setTimeout(async () => {
    failoverTimers.delete(alarmId);
    try {
      // Check if still pending
      const { data: alarm } = await supabase
        .from("alarms")
        .select("alarm_id, status")
        .eq("alarm_id", alarmId)
        .single();

      if (!alarm || alarm.status !== "Pending Dispatch") {
        flog(
          `alarm ${alarmId}: SKIPPED — already handled (status=${alarm?.status})`,
        );
        return;
      }

      await releaseOfficerByAlarm(alarmId);
      await updateAssignedOfficer(alarmId, null);

      // Auto-reject the previous station so its modal and Twilio call are dismissed
      if (io) {
        io.to(`station-${currentStationId}`).emit("auto-reject", { alarmId });
        flog(
          `alarm ${alarmId}: → station ${currentStationId}: auto-reject sent`,
        );
      }

      const nextStation = remaining[0];
      flog(
        `alarm ${alarmId}: TIMEOUT on station ${currentStationId} → reassigning to station ${nextStation.station_id} (${nextStation.station_name})`,
      );

      // Update assigned station
      await supabase
        .from("alarms")
        .update({ assigned_station_id: nextStation.station_id })
        .eq("alarm_id", alarmId);

      // Log failover
      await supabase.from("alarm_response_log").insert([
        {
          alarm_id: alarmId,
          action_type: "Initial Dispatch",
          details: `Failover: reassigned from station ${currentStationId} to station ${nextStation.station_id} (${nextStation.station_name})`,
        },
      ]);

      // Tell the civilian app we're redirecting to another station
      let dispatchResult = { assignedOfficerId: null };

      // Notify the next dispatcher group
      if (io) {
        dispatchResult = await dispatchIncidentToGroup({
          io,
          alarmId,
          dispatchGroup: `station-${nextStation.station_id}`,
          fallbackRoom: `station-${nextStation.station_id}`,
          payload: {
            alarmId,
            callerId: alarmMeta.callerId || null,
            phoneNumber: alarmMeta.phoneNumber || null,
            firstName: alarmMeta.firstName || null,
            lastName: alarmMeta.lastName || null,
            incidentType: alarmMeta.incidentType || null,
            alarmLevel: alarmMeta.alarmLevel || null,
            location: alarmMeta.location || null,
            narrative: alarmMeta.narrative || null,
            coordinates: alarmMeta.coordinates || {},
            assignedStationId: nextStation.station_id,
            stationName: nextStation.station_name,
            failover: true,
          },
        });
      }

      if (io) {
        io.to(`alarm-${alarmId}`).emit("failover-redirect", {
          alarmId,
          fromStationId: currentStationId,
          toStationId: nextStation.station_id,
          toStationName: nextStation.station_name,
          assignedOfficerId: dispatchResult.assignedOfficerId || null,
        });
        flog(
          `alarm ${alarmId}: → civilian app: failover-redirect to ${nextStation.station_name}`,
        );
      }

      // Start another failover timer for the next station in line
      startFailover(alarmId, nextStation.station_id, remaining, io, alarmMeta);
    } catch (err) {
      flog(`alarm ${alarmId}: ERROR — ${err.message}`);
      console.error(err);
    }
  }, FAILOVER_TIMEOUT_MS);

  failoverTimers.set(alarmId, {
    timerId,
    stationId: currentStationId,
    remaining,
  });

  flog(
    `alarm ${alarmId}: ⏱ Timer started → station ${currentStationId} (${FAILOVER_TIMEOUT_MS / 1000}s)`,
  );
}

// ── Cancel failover timer ───────────────────────────────────────────
export function cancelFailover(alarmId) {
  const entry = failoverTimers.get(alarmId);
  if (entry) {
    clearTimeout(entry.timerId);
    failoverTimers.delete(alarmId);
    flog(
      `alarm ${alarmId}: ✅ Timer CANCELLED (station ${entry.stationId} accepted)`,
    );
  }
}

// ── Get current failover entry (for cancel by civilian) ─────────────
export function getFailoverEntry(alarmId) {
  return failoverTimers.get(alarmId) || null;
}

// ── Get ranked stations by distance (reusable) ─────────────────────
export async function getRankedStations(latitude, longitude, options = {}) {
  const { forceStationId = null, includeMain = false } = options;

  const { data: stations, error: stErr } = await supabase
    .from("fire_stations")
    .select(
      "station_id, station_name, station_type, latitude, longitude, contact_number",
    );

  if (stErr) throw stErr;
  if (!stations || stations.length === 0) return [];

  const { data: statusRows, error: statusErr } = await supabase
    .from("station_current_status")
    .select(
      "station_id, readiness_status, readiness_percentage, active_incident_count, is_online, updated_at",
    );

  if (statusErr) throw statusErr;

  const statusMap = new Map();
  (statusRows || []).forEach((row) => {
    statusMap.set(row.station_id, row);
  });

  return stations
    .filter((s) => {
      if (forceStationId) {
        return s.station_id === Number(forceStationId);
      }

      if (
        !includeMain &&
        s.station_type &&
        s.station_type.toLowerCase() === "main"
      ) {
        return false;
      }

      const currentStatus = statusMap.get(s.station_id);
      return !currentStatus || currentStatus.readiness_status !== "NOT_READY";
    })
    .map((s) => ({
      ...s,
      readiness_status: statusMap.get(s.station_id)?.readiness_status || null,
      readiness_percentage:
        statusMap.get(s.station_id)?.readiness_percentage ?? null,
      active_incident_count:
        statusMap.get(s.station_id)?.active_incident_count ?? 0,
      is_online: statusMap.get(s.station_id)?.is_online ?? false,
      distance: haversineKm(
        parseFloat(latitude),
        parseFloat(longitude),
        parseFloat(s.latitude),
        parseFloat(s.longitude),
      ),
    }))
    .sort((a, b) => {
      if (a.distance !== b.distance) return a.distance - b.distance;
      return (a.active_incident_count || 0) - (b.active_incident_count || 0);
    });
}

// ── Start failover timer for main admin only (no substations) ──────────
// Properly tracked in failoverTimers so cancelFailover works on accept.
export function startMainAdminFailover(alarmId, io, alarmMeta = {}) {
  cancelFailover(alarmId); // clear any existing timer

  const timerId = setTimeout(async () => {
    failoverTimers.delete(alarmId);
    const { data: alarm } = await supabase
      .from("alarms")
      .select("alarm_id, status")
      .eq("alarm_id", alarmId)
      .single();

    if (!alarm || alarm.status !== "Pending Dispatch") {
      flog(
        `alarm ${alarmId}: MAIN ADMIN TIMEOUT skipped — already handled (status=${alarm?.status})`,
      );
      return;
    }

    await releaseOfficerByAlarm(alarmId);
    await updateAssignedOfficer(alarmId, null);
    flog(
      `alarm ${alarmId}: MAIN ADMIN TIMEOUT — no one answered. Emitting failover-exhausted.`,
    );
    io.to("main-admin").emit("auto-reject", { alarmId });
    io.to(`alarm-${alarmId}`).emit("failover-exhausted", { alarmId });
  }, FAILOVER_TIMEOUT_MS);

  failoverTimers.set(alarmId, { timerId, stationId: "main", remaining: [] });
  flog(
    `alarm ${alarmId}: ⏱ Timer started → MAIN ADMIN (direct, ${FAILOVER_TIMEOUT_MS / 1000}s)`,
  );
}

// ── Acknowledge handshake: station confirms it received the incident ───
// Called when a station emits 'incident-received'. Starts the failover timer.
// Before this ack, no failover timer is running (grace period for connection).
export function ackIncidentReceived(alarmId) {
  const entry = failoverTimers.get(alarmId);
  if (entry && entry.ackPending) {
    clearTimeout(entry.ackTimeoutId);
    entry.ackPending = false;
    flog(
      `alarm ${alarmId}: ✓ ACK received from station ${entry.stationId}. Starting ${FAILOVER_TIMEOUT_MS / 1000}s failover timer.`,
    );

    // Now start the real failover timer
    const timerId = setTimeout(async () => {
      failoverTimers.delete(alarmId);
      // Re-run the failover logic (same as the existing timer callback)
      entry.timerCallback();
    }, FAILOVER_TIMEOUT_MS);

    entry.timerId = timerId;
  }
}
