import express from 'express';
import { supabase } from '../supabaseClient.js';
import { authenticateToken } from '../middleware/auth.js';
import { requireRoles, isAdminUser, getUserStationId } from '../middleware/role.js';
import { acceptIncident, startFailover, getRankedStations, cancelFailover } from '../services/dispatchService.js';
import { getOnlineStationIds } from '../services/onlineStations.js';

const router = express.Router();

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

const buildQueueName = (stationId) => `station-${stationId}`;

// ── Twilio: enqueue call for station (mark2) ──────────────────────────
router.get('/twilio/station-queue-twiml', async (req, res) => {
  try {
    const { stationId, alarmId, phone, lat, lon } = req.query;
    if (!stationId) return res.status(400).send('stationId is required');

    const queue = buildQueueName(stationId);
    const waitUrl = 'http://twimlets.com/holdmusic?Bucket=com.twilio.music.classical';

    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Enqueue waitUrl="${waitUrl}">
    ${queue}
  </Enqueue>
  <Say voice="alice">Emergency call from ${phone || 'unknown caller'} latitude ${lat || 'n'} longitude ${lon || 'n'} alarm ${alarmId || ''}</Say>
</Response>`;
    res.type('text/xml').send(twiml);
  } catch (err) {
    console.error('station-queue-twiml error:', err);
    res.status(500).send('Server error');
  }
});

// ── Twilio: dequeue for station agents (mark2) ────────────────────────
router.get('/twilio/station-queue-answer', async (req, res) => {
  try {
    const { stationId } = req.query;
    if (!stationId) return res.status(400).send('stationId is required');
    const queue = buildQueueName(stationId);
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial>
    <Queue>${queue}</Queue>
  </Dial>
</Response>`;
    res.type('text/xml').send(twiml);
  } catch (err) {
    console.error('station-queue-answer error:', err);
    res.status(500).send('Server error');
  }
});

// ── Create a new incident/alarm ───────────────────────────────────────
// Intentionally unauthenticated — civilian mobile app users don't have a JWT (mark2)
const createIncidentHandler = async (req, res) => {
  try {
    try {
      console.log('[CreateIncident] Authorization header:', req.headers && req.headers.authorization);
      console.log('[CreateIncident] User from token:', req.user);
      console.log('[CreateIncident] Request body:', JSON.stringify(req.body));
    } catch (logErr) {
      console.error('[CreateIncident] Error logging request details:', logErr);
    }

    const {
      firstName,
      lastName,
      phoneNumber,
      location,
      incidentType,
      alarmLevel,
      narrative,
      latitude,
      longitude
    } = req.body;

    if (!phoneNumber || !latitude || !longitude || !alarmLevel) {
      return res.status(400).json({
        message: 'Phone number, coordinates, and alarm level are required'
      });
    }

    // Check if caller exists, create if not
    const { data: callerRows, error: callerErr } = await supabase
      .from('users')
      .select('user_id')
      .eq('phone_number', phoneNumber)
      .limit(1);

    if (callerErr) throw callerErr;

    let callerId;

    if (!callerRows || callerRows.length === 0) {
      const names = `${firstName || ''} ${lastName || ''}`.trim().split(' ');
      const fname = names[0] || 'Unknown';
      const lname = names[1] || 'Caller';
      const fullName = `${fname} ${lname}`;

      const { data: insertResult, error: insertError } = await supabase
        .from('users')
        .insert([{
          first_name: fname,
          last_name: lname,
          full_name: fullName,
          id_number: `caller_${Date.now()}`,
          phone_number: phoneNumber,
          password: 'temp_' + Date.now(),
          role: 'end_user',
          email: `caller_${Date.now()}@bfp.gov`
        }])
        .select('user_id')
        .single();

      if (insertError) {
        console.error('[CreateIncident] Error creating end_user:', insertError);
        throw insertError;
      }
      callerId = insertResult.user_id;
      console.log('[CreateIncident] Created new end_user with id:', callerId);
    } else {
      callerId = callerRows[0].user_id;
      console.log('[CreateIncident] Found existing end_user with id:', callerId);
    }

    // Map alarm level: "1st Alarm" → "Alarm 1" (mark2 regex approach — more robust)
    let alarmLevelEnum = alarmLevel;
    if (alarmLevel.includes('Alarm')) {
      const match = alarmLevel.match(/(\d+)/);
      if (match) {
        alarmLevelEnum = `Alarm ${match[1]}`;
      }
    }
    console.log('[CreateIncident] Mapped alarm level:', alarmLevel, '→', alarmLevelEnum);

    const { data: alarmResult, error: alarmErr } = await supabase
      .from('alarms')
      .insert([{
        end_user_id: callerId,
        user_latitude: latitude,
        user_longitude: longitude,
        initial_alarm_level: alarmLevelEnum,
        current_alarm_level: alarmLevelEnum,
        status: 'Pending Dispatch'
      }])
      .select('alarm_id')
      .single();

    if (alarmErr) {
      console.error('[CreateIncident] Alarm insert error:', alarmErr);
      throw alarmErr;
    }

    const alarmId = alarmResult.alarm_id;
    console.log('[CreateIncident] Created alarm id:', alarmId);

    // Log incident creation
    const { error: logErr } = await supabase.from('alarm_response_log').insert([{
      alarm_id: alarmId,
      action_type: 'Initial Dispatch',
      details: `Incident: ${incidentType || 'Not specified'} | Location: ${location} | Narrative: ${narrative || 'No details'}`,
      performed_by_user_id: (req.user && req.user.id) ? req.user.id : null
    }]);

    if (logErr) throw logErr;

    // Broadcast generic new-incident to all connected clients
    try {
      const io = req.app.get('io');
      if (io) {
        io.emit('new-incident', {
          alarmId,
          callerId,
          firstName: firstName || null,
          lastName: lastName || null,
          phoneNumber: phoneNumber || null,
          incidentType: incidentType || null,
          alarmLevel: alarmLevel || null,
          location: location || null,
          narrative: narrative || null,
          coordinates: { latitude, longitude },
          status: 'Pending Dispatch'
        });
      }
    } catch (emitErr) {
      console.error('Error emitting new-incident event:', emitErr);
    }

    // ── KNN dispatch: find nearest READY + online station (mark2) ────
    let dispatchedStationId = null;
    let stationName = null;

    try {
      const forceStationId = req.body.forceStationId;

      const { data: stations, error: stErr } = await supabase
        .from('fire_stations')
        .select('station_id, station_name, latitude, longitude, contact_number');

      if (stErr) throw stErr;

      if (stations && stations.length > 0) {
        const { data: readinessRows } = await supabase
          .from('station_readiness')
          .select('station_id, status')
          .order('submitted_at', { ascending: false });

        // Build map: station_id → latest readiness status
        const readinessMap = new Map();
        (readinessRows || []).forEach((r) => {
          if (!readinessMap.has(r.station_id)) readinessMap.set(r.station_id, r.status);
        });

        const onlineIds = getOnlineStationIds();
        console.log(`[KNN] Online stations: [${[...onlineIds].join(', ')}]`);

        const allEligible = stations
          .filter((s) => {
            if (forceStationId) return s.station_id === Number(forceStationId);
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

        // Prefer online stations; fall back to all eligible if none online
        const onlineEligible = allEligible.filter((s) => onlineIds.has(s.station_id));
        const scored = onlineEligible.length > 0 ? onlineEligible : allEligible;

        if (onlineEligible.length > 0) {
          console.log(`[KNN] Dispatching from ${onlineEligible.length} ONLINE station(s)`);
        } else {
          console.warn(`[KNN] No online stations — falling back to all ${allEligible.length} eligible station(s)`);
        }

        if (scored.length > 0) {
          const nearest = scored[0];
          dispatchedStationId = nearest.station_id;
          stationName = nearest.station_name || null;

          console.log(`[KNN] Nearest: ${nearest.station_name} (id=${nearest.station_id}, dist=${nearest.distance.toFixed(2)}km)`);

          await supabase
            .from('alarms')
            .update({ assigned_station_id: dispatchedStationId })
            .eq('alarm_id', alarmId);

          // Notify assigned station via socket
          const io = req.app.get('io');
          if (io) {
            io.to(`station-${dispatchedStationId}`).emit('incoming-incident', {
              alarmId,
              callerId,
              phoneNumber,
              firstName: firstName || null,
              lastName: lastName || null,
              incidentType: incidentType || null,
              alarmLevel: alarmLevelEnum,
              location: location || null,
              narrative: narrative || null,
              coordinates: { latitude, longitude },
              assignedStationId: dispatchedStationId,
              stationName: nearest.station_name,
            });
          }

          // Start failover timer: auto-reassign if station doesn't respond in 20s
          startFailover(alarmId, dispatchedStationId, scored, req.app.get('io'), {
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
          console.warn('[KNN] No eligible stations found');
        }
      }
    } catch (knnErr) {
      console.error('[KNN] Station lookup error:', knnErr);
    }

    res.status(201).json({
      message: 'Alarm created and nearest station notified',
      alarmId,
      dispatchedStationId,
      dispatchedStationName: stationName || null,
      coordinates: { latitude, longitude },
    });
  } catch (error) {
    console.error('Create incident error:', error);
    if (error?.message) console.error('Create incident error message:', error.message);
    if (error?.details) console.error('Create incident error details:', error.details);
    if (error?.hint)    console.error('Create incident error hint:', error.hint);
    if (error?.code)    console.error('Create incident error code:', error.code);
    res.status(500).json({
      message: 'Failed to create incident',
      error: (error && error.message) || String(error)
    });
  }
};

// Both paths: admin/station UI + civilian mobile app (mark2)
router.post('/create-incident', createIncidentHandler);
router.post('/enduser/create-alarm', createIncidentHandler);

// ── Accept incident — atomic lock, first-accept wins (mark2) ─────────
router.post('/incidents/:alarmId/accept', authenticateToken, async (req, res) => {
  try {
    const { alarmId } = req.params;
    const stationId = req.body.stationId || req.user.assignedStationId;
    const userId = req.user.id;
    console.log(`[AcceptAPI] alarmId=${alarmId} stationId=${stationId} userId=${userId}`);

    if (!stationId) {
      return res.status(400).json({ message: 'stationId is required' });
    }

    const isMainAdmin = stationId === 'main';
    const numericStationId = isMainAdmin ? null : Number(stationId);
    const result = await acceptIncident(Number(alarmId), numericStationId, userId);

    if (!result.success) {
      return res.status(409).json({ message: result.reason });
    }

    const io = req.app.get('io');
    if (io) {
      io.emit('incident-accepted', {
        alarmId: Number(alarmId),
        stationId: isMainAdmin ? 'main' : Number(stationId),
        acceptedBy: userId,
      });

      let stationNameAccepted = null;
      if (isMainAdmin) {
        stationNameAccepted = 'Central Fire Station (Main)';
      } else {
        try {
          const { data: stationRow } = await supabase
            .from('fire_stations')
            .select('station_name')
            .eq('station_id', Number(stationId))
            .single();
          stationNameAccepted = stationRow?.station_name || null;
        } catch (_) {}
      }

      io.to(`alarm-${alarmId}`).emit('call-accepted', {
        alarmId: Number(alarmId),
        stationId: isMainAdmin ? 'main' : Number(stationId),
        stationName: stationNameAccepted,
      });
      console.log(`[AcceptAPI] Emitted call-accepted to alarm-${alarmId} (station ${stationId})`);
    }

    res.json({ message: 'Incident accepted', alarm: result.alarm });
  } catch (error) {
    console.error('Accept incident error:', error);
    res.status(500).json({ message: 'Failed to accept incident', error: error.message });
  }
});

// ── Reject incident — triggers immediate failover to next station (mark2) ─
router.post('/incidents/:alarmId/reject', authenticateToken, async (req, res) => {
  try {
    const { alarmId } = req.params;
    const stationId = req.body.stationId || req.user.assignedStationId;

    cancelFailover(Number(alarmId));

    const { data: alarm } = await supabase
      .from('alarms')
      .select('alarm_id, user_latitude, user_longitude, status')
      .eq('alarm_id', alarmId)
      .single();

    if (!alarm || alarm.status !== 'Pending Dispatch') {
      return res.status(409).json({ message: 'Incident is no longer pending' });
    }

    const ranked = await getRankedStations(alarm.user_latitude, alarm.user_longitude);
    const remaining = ranked.filter((s) => s.station_id !== Number(stationId));

    if (remaining.length === 0) {
      return res.status(200).json({ message: 'No other stations available for reassignment' });
    }

    const nextStation = remaining[0];

    await supabase
      .from('alarms')
      .update({ assigned_station_id: nextStation.station_id })
      .eq('alarm_id', alarmId);

    await supabase.from('alarm_response_log').insert([{
      alarm_id: Number(alarmId),
      action_type: 'Initial Dispatch',
      details: `Rejected by station ${stationId}. Reassigned to station ${nextStation.station_id} (${nextStation.station_name})`,
      performed_by_user_id: req.user.id || null,
    }]);

    const io = req.app.get('io');
    if (io) {
      io.to(`station-${nextStation.station_id}`).emit('incoming-incident', {
        alarmId: Number(alarmId),
        assignedStationId: nextStation.station_id,
        stationName: nextStation.station_name,
        failover: true,
      });
    }

    startFailover(Number(alarmId), nextStation.station_id, remaining, io);

    res.json({
      message: 'Incident rejected, reassigned to next station',
      nextStationId: nextStation.station_id,
      nextStationName: nextStation.station_name,
    });
  } catch (error) {
    console.error('Reject incident error:', error);
    res.status(500).json({ message: 'Failed to reject incident', error: error.message });
  }
});

// ── Get all incidents — role-filtered (mine: admin sees all, stations see own) ─
router.get('/incidents', authenticateToken, requireRoles(['admin', 'substation_admin', 'driver']), async (req, res) => {
  try {
    const isAdmin = isAdminUser(req.user);
    const stationId = getUserStationId(req.user);

    if (!isAdmin && !stationId) {
      return res.status(400).json({ message: 'User has no assigned station' });
    }

    let query = supabase
      .from('alarms')
      .select(
        `alarm_id,end_user_id,user_latitude,user_longitude,initial_alarm_level,current_alarm_level,status,assigned_station_id,call_time,dispatch_time,resolve_time,users(full_name,phone_number),fire_stations(station_name),firetrucks(plate_number),alarm_response_log(details)`
      )
      .order('call_time', { ascending: false })
      .limit(50);

    if (!isAdmin) {
      query = query.eq('assigned_station_id', stationId);
    }

    const { data: alarms, error: alarmsErr } = await query;
    if (alarmsErr) throw alarmsErr;

    const flattened = (alarms || []).map(a => ({
      alarm_id: a.alarm_id,
      end_user_id: a.end_user_id,
      full_name: a.users?.[0]?.full_name || null,
      phone_number: a.users?.[0]?.phone_number || null,
      user_latitude: a.user_latitude,
      user_longitude: a.user_longitude,
      initial_alarm_level: a.initial_alarm_level,
      current_alarm_level: a.current_alarm_level,
      status: a.status,
      assigned_station_id: a.assigned_station_id ?? null,
      call_time: a.call_time,
      dispatch_time: a.dispatch_time,
      resolve_time: a.resolve_time,
      station_name: a.fire_stations?.[0]?.station_name || null,
      plate_number: a.firetrucks?.[0]?.plate_number || null,
      details: a.alarm_response_log?.[0]?.details || null
    }));

    res.json({ incidents: flattened, total: flattened.length });
  } catch (error) {
    console.error('Get incidents error:', error);
    res.status(500).json({ message: 'Failed to fetch incidents', error: error.message });
  }
});

// ── Get latest firetruck locations (mark2) ────────────────────────────
router.get('/firetruck-locations', async (req, res) => {
  try {
    const cutoff = new Date(Date.now() - 30_000).toISOString();

    const { data: rows, error } = await supabase
      .from('firetruck_location_history')
      .select('truck_id, latitude, longitude, recorded_at')
      .gte('recorded_at', cutoff)
      .order('recorded_at', { ascending: false })
      .limit(200);

    if (error) throw error;

    const latestByTruck = new Map();
    (rows || []).forEach((row) => {
      if (!row || row.truck_id == null) return;
      if (!latestByTruck.has(row.truck_id)) {
        latestByTruck.set(row.truck_id, row);
      }
    });

    const locations = Array.from(latestByTruck.values()).map((r) => ({
      truck_id: r.truck_id,
      latitude: r.latitude,
      longitude: r.longitude,
      recorded_at: r.recorded_at,
    }));

    res.json({ locations, total: locations.length });
  } catch (error) {
    console.error('Get firetruck-locations error:', error);
    res.status(500).json({ message: 'Failed to fetch firetruck locations', error: error.message });
  }
});

// ── Get incident details — role + station isolation (mine) ────────────
router.get('/incidents/:alarmId', authenticateToken, requireRoles(['admin', 'substation_admin', 'driver']), async (req, res) => {
  try {
    const { alarmId } = req.params;
    const isAdmin = isAdminUser(req.user);
    const stationId = getUserStationId(req.user);

    if (!isAdmin && !stationId) {
      return res.status(400).json({ message: 'User has no assigned station' });
    }

    const { data: alarms, error: alarmErr } = await supabase
      .from('alarms')
      .select('alarm_id,end_user_id,user_latitude,user_longitude,initial_alarm_level,current_alarm_level,status,assigned_station_id,call_time,dispatch_time,resolve_time,users(full_name,phone_number)')
      .eq('alarm_id', alarmId)
      .limit(1);

    if (alarmErr) throw alarmErr;

    if (!alarms || alarms.length === 0) {
      return res.status(404).json({ message: 'Incident not found' });
    }

    if (!isAdmin) {
      const incidentStationId = alarms[0]?.assigned_station_id ?? null;
      if (String(incidentStationId) !== String(stationId)) {
        return res.status(403).json({ message: 'Forbidden: incident is not assigned to your station' });
      }
    }

    const { data: logs, error: logsErr } = await supabase
      .from('alarm_response_log')
      .select('log_id,action_timestamp,action_type,details,performed_by_user_id')
      .eq('alarm_id', alarmId)
      .order('action_timestamp', { ascending: false });

    if (logsErr) throw logsErr;

    res.json({ incident: alarms[0], timeline: logs || [] });
  } catch (error) {
    console.error('Get incident details error:', error);
    res.status(500).json({ message: 'Failed to fetch incident details', error: error.message });
  }
});

// ── Update alarm level — role + station isolation (mine) ──────────────
router.patch('/incidents/:alarmId/update-alarm-level', authenticateToken, requireRoles(['admin', 'substation_admin', 'driver']), async (req, res) => {
  try {
    const { alarmId } = req.params;
    const { newAlarmLevel } = req.body;
    const isAdmin = isAdminUser(req.user);
    const stationId = getUserStationId(req.user);

    if (!isAdmin && !stationId) {
      return res.status(400).json({ message: 'User has no assigned station' });
    }

    if (!newAlarmLevel) {
      return res.status(400).json({ message: 'New alarm level is required' });
    }

    if (!isAdmin) {
      const { data: incidentRow, error: incidentErr } = await supabase
        .from('alarms')
        .select('alarm_id, assigned_station_id')
        .eq('alarm_id', alarmId)
        .single();

      if (incidentErr) throw incidentErr;

      if (String(incidentRow?.assigned_station_id ?? '') !== String(stationId)) {
        return res.status(403).json({ message: 'Forbidden: incident is not assigned to your station' });
      }
    }

    const { error: updateErr } = await supabase
      .from('alarms')
      .update({ current_alarm_level: newAlarmLevel })
      .eq('alarm_id', alarmId);

    if (updateErr) throw updateErr;

    const { error: logInsertErr } = await supabase.from('alarm_response_log').insert([{
      alarm_id: alarmId,
      action_type: 'Alarm Level Change',
      details: `Changed to ${newAlarmLevel}`,
      performed_by_user_id: req.user.id
    }]);

    if (logInsertErr) throw logInsertErr;

    res.json({ message: 'Alarm level updated', alarmId, newAlarmLevel });
  } catch (error) {
    console.error('Update alarm level error:', error);
    res.status(500).json({ message: 'Failed to update alarm level', error: error.message });
  }
});

export default router;
