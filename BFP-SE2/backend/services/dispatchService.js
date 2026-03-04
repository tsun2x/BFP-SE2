import { supabase } from '../supabaseClient.js';

// ── In-memory failover timers ────────────────────────────────────────
// Maps alarmId → { timerId, stationId, stationQueue }
const failoverTimers = new Map();

const FAILOVER_TIMEOUT_MS = 15_000; // 15 seconds (testing)

// Timestamped log for failover debugging
function flog(msg) {
  const ts = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
  console.log(`[Failover ${ts}] ${msg}`);
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
    .from('alarms')
    .update({
      status: 'Dispatched',
      assigned_station_id: stationId,
      dispatch_time: new Date().toISOString(),
    })
    .eq('alarm_id', alarmId)
    .eq('status', 'Pending Dispatch') // race-condition guard
    .select('alarm_id, status, assigned_station_id')
    .single();

  if (error || !updated) {
    return { success: false, reason: 'Incident already accepted by another station or not pending' };
  }

  // Log acceptance
  await supabase.from('alarm_response_log').insert([{
    alarm_id: alarmId,
    action_type: 'Received from Station',
    details: `Accepted by station ${stationId}`,
    performed_by_user_id: userId || null,
  }]);

  // Cancel any failover timer
  cancelFailover(alarmId);

  return { success: true, alarm: updated };
}

// ── Start failover timer ────────────────────────────────────────────
// Called after dispatching to a station. If no accept within timeout,
// reassign to the next nearest eligible station.
// alarmMeta = { callerId, phoneNumber, firstName, lastName, incidentType, alarmLevel, location, narrative, coordinates }
export function startFailover(alarmId, currentStationId, rankedStations, io, alarmMeta = {}) {
  cancelFailover(alarmId); // clear any existing timer

  // Remaining stations after the current one
  const remaining = rankedStations.filter((s) => s.station_id !== currentStationId);

  if (remaining.length === 0) {
    flog(`alarm ${alarmId}: LAST SUBSTATION (${currentStationId}). Waiting ${FAILOVER_TIMEOUT_MS / 1000}s before main admin.`);

    // Still wait for the current (last) substation before going to main admin
    const lastSubTimerId = setTimeout(async () => {
      failoverTimers.delete(alarmId);
      try {
        // Check if still pending
        const { data: alarm } = await supabase
          .from('alarms')
          .select('alarm_id, status')
          .eq('alarm_id', alarmId)
          .single();
        if (!alarm || alarm.status !== 'Pending Dispatch') {
          flog(`alarm ${alarmId}: SKIPPED — already handled (status=${alarm?.status})`);
          return;
        }

        // Auto-reject the last substation
        if (io) {
          io.to(`station-${currentStationId}`).emit('auto-reject', { alarmId });
          flog(`alarm ${alarmId}: → station ${currentStationId}: auto-reject sent (last sub timeout)`);
        }

        flog(`alarm ${alarmId}: ALL SUBSTATIONS EXHAUSTED. Notifying main admin.`);
        if (io) {
          io.to(`alarm-${alarmId}`).emit('failover-redirect', {
            alarmId,
            fromStationId: currentStationId,
            toStationId: 'main',
            toStationName: 'Central Fire Station (Main)',
          });
          io.to('main-admin').emit('incoming-incident', {
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
            assignedStationId: 'main',
            stationName: 'Central Fire Station (Main)',
            failover: true,
          });
          flog(`alarm ${alarmId}: → MAIN ADMIN notified via incoming-incident`);

          // Start a final failover timer for the main admin
          const mainTimerId = setTimeout(() => {
            failoverTimers.delete(alarmId);
            flog(`alarm ${alarmId}: MAIN ADMIN TIMEOUT — no one answered. Emitting failover-exhausted.`);
            io.to('main-admin').emit('auto-reject', { alarmId });
            flog(`alarm ${alarmId}: → main-admin: auto-reject sent`);
            io.to(`alarm-${alarmId}`).emit('failover-exhausted', { alarmId });
          }, FAILOVER_TIMEOUT_MS);
          failoverTimers.set(alarmId, { timerId: mainTimerId, stationId: 'main', remaining: [] });
          flog(`alarm ${alarmId}: ⏱ Timer started → MAIN ADMIN (${FAILOVER_TIMEOUT_MS / 1000}s)`);
        }
      } catch (err) {
        flog(`alarm ${alarmId}: ERROR in last-sub timer — ${err.message}`);
        console.error(err);
      }
    }, FAILOVER_TIMEOUT_MS);

    failoverTimers.set(alarmId, { timerId: lastSubTimerId, stationId: currentStationId, remaining: [] });
    flog(`alarm ${alarmId}: ⏱ Timer started → station ${currentStationId} (LAST SUB, ${FAILOVER_TIMEOUT_MS / 1000}s)`);
    return;
  }

  const timerId = setTimeout(async () => {
    failoverTimers.delete(alarmId);
    try {
      // Check if still pending
      const { data: alarm } = await supabase
        .from('alarms')
        .select('alarm_id, status')
        .eq('alarm_id', alarmId)
        .single();

      if (!alarm || alarm.status !== 'Pending Dispatch') {
        flog(`alarm ${alarmId}: SKIPPED — already handled (status=${alarm?.status})`);
        return;
      }

      // Auto-reject the previous station so its modal and Twilio call are dismissed
      if (io) {
        io.to(`station-${currentStationId}`).emit('auto-reject', { alarmId });
        flog(`alarm ${alarmId}: → station ${currentStationId}: auto-reject sent`);
      }

      const nextStation = remaining[0];
      flog(`alarm ${alarmId}: TIMEOUT on station ${currentStationId} → reassigning to station ${nextStation.station_id} (${nextStation.station_name})`);

      // Update assigned station
      await supabase
        .from('alarms')
        .update({ assigned_station_id: nextStation.station_id })
        .eq('alarm_id', alarmId);

      // Log failover
      await supabase.from('alarm_response_log').insert([{
        alarm_id: alarmId,
        action_type: 'Initial Dispatch',
        details: `Failover: reassigned from station ${currentStationId} to station ${nextStation.station_id} (${nextStation.station_name})`,
      }]);

      // Tell the civilian app we're redirecting to another station
      if (io) {
        io.to(`alarm-${alarmId}`).emit('failover-redirect', {
          alarmId,
          fromStationId: currentStationId,
          toStationId: nextStation.station_id,
          toStationName: nextStation.station_name,
        });
        flog(`alarm ${alarmId}: → civilian app: failover-redirect to ${nextStation.station_name}`);
      }

      // Notify ONLY the new substation via Socket.IO (main admin waits its turn)
      if (io) {
        const failoverPayload = {
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
        };
        io.to(`station-${nextStation.station_id}`).emit('incoming-incident', failoverPayload);
      }

      // Start another failover timer for the next station in line
      startFailover(alarmId, nextStation.station_id, remaining, io, alarmMeta);
    } catch (err) {
      flog(`alarm ${alarmId}: ERROR — ${err.message}`); console.error(err);
    }
  }, FAILOVER_TIMEOUT_MS);

  failoverTimers.set(alarmId, {
    timerId,
    stationId: currentStationId,
    remaining,
  });

  flog(`alarm ${alarmId}: ⏱ Timer started → station ${currentStationId} (${FAILOVER_TIMEOUT_MS / 1000}s)`);
}

// ── Cancel failover timer ───────────────────────────────────────────
export function cancelFailover(alarmId) {
  const entry = failoverTimers.get(alarmId);
  if (entry) {
    clearTimeout(entry.timerId);
    failoverTimers.delete(alarmId);
    flog(`alarm ${alarmId}: ✅ Timer CANCELLED (station ${entry.stationId} accepted)`);
  }
}

// ── Get current failover entry (for cancel by civilian) ─────────────
export function getFailoverEntry(alarmId) {
  return failoverTimers.get(alarmId) || null;
}

// ── Get ranked stations by distance (reusable) ─────────────────────
export async function getRankedStations(latitude, longitude) {
  const { data: stations, error: stErr } = await supabase
    .from('fire_stations')
    .select('station_id, station_name, latitude, longitude, contact_number');

  if (stErr) throw stErr;
  if (!stations || stations.length === 0) return [];

  // Get latest readiness per station
  const { data: readinessRows } = await supabase
    .from('station_readiness')
    .select('station_id, status')
    .order('submitted_at', { ascending: false });

  const readinessMap = new Map();
  (readinessRows || []).forEach((r) => {
    if (!readinessMap.has(r.station_id)) readinessMap.set(r.station_id, r.status);
  });

  return stations
    .filter((s) => {
      const rs = readinessMap.get(s.station_id);
      return !rs || rs !== 'NOT_READY';
    })
    .map((s) => ({
      ...s,
      distance: haversineKm(
        parseFloat(latitude),
        parseFloat(longitude),
        parseFloat(s.latitude),
        parseFloat(s.longitude)
      ),
    }))
    .sort((a, b) => a.distance - b.distance);
}
