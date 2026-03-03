import express from 'express';
import { supabase } from '../supabaseClient.js';
import { authenticateToken } from '../middleware/auth.js';
import twilioClient from '../config/twilioClient.js';
import { acceptIncident, startFailover, getRankedStations, cancelFailover } from '../services/dispatchService.js';
import { getOnlineStationIds } from '../services/onlineStations.js';

const router = express.Router();

// ── Haversine distance (km) between two lat/lng pairs ───────────────
function haversineKm(lat1, lon1, lat2, lon2) {
  const toRad = (v) => (v * Math.PI) / 180;
  const R = 6371; // Earth radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const ensurePublicBaseUrl = () => {
  const url = process.env.PUBLIC_BASE_URL;
  if (!url) throw new Error('PUBLIC_BASE_URL is required for Twilio webhooks (set it to your ngrok/public URL)');
  return url.replace(/\/$/, ''); // trim trailing slash
};

const buildQueueName = (stationId) => `station-${stationId}`;

// Twilio: enqueue call for station
router.get('/twilio/station-queue-twiml', async (req, res) => {
  try {
    const { stationId, alarmId, phone, lat, lon } = req.query;
    if (!stationId) return res.status(400).send('stationId is required');

    const queue = buildQueueName(stationId);
    // Simple hold music twimlet; replace if desired
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

// Twilio: dequeue for station agents (station phone/browser hits this)
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

// Create a new incident/alarm
// NOTE: authentication temporarily disabled for debugging create-incident errors
// Remove the `authenticateToken` middleware to allow reproducing errors from the frontend
const createIncidentHandler = async (req, res) => {
  try {
    // Debug logging: print authorization, authenticated user, and incoming body
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

    // Validate required fields
    if (!phoneNumber || !latitude || !longitude || !alarmLevel) {
      return res.status(400).json({
        message: 'Phone number, coordinates, and alarm level are required'
      });
    }

    // Check if caller exists or create new end user via Supabase
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
      
      // Generate unique phone for this user if caller doesn't have one
      const uniquePhone = phoneNumber || `end_user_${Date.now()}@temp`;

      const { data: insertResult, error: insertError } = await supabase
        .from('users')
        .insert([
          {
            first_name: fname,
            last_name: lname,
            full_name: `${fname} ${lname}`,
            id_number: `caller_${Date.now()}`,
            phone_number: uniquePhone,
            password: 'temp_' + Date.now(),
            role: 'end_user'
          }
        ])
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

      // Map incident type to alarm level if not provided
      // Handle formats like "1st Alarm", "2nd Alarm", etc. -> "Alarm 1", "Alarm 2"
      let alarmLevelEnum = alarmLevel;
      if (alarmLevel.includes('Alarm')) {
        // Extract the number from "1st Alarm", "2nd Alarm", etc.
        const match = alarmLevel.match(/(\d+)/);
        if (match) {
          alarmLevelEnum = `Alarm ${match[1]}`;
        }
      }
      console.log('[CreateIncident] Mapped alarm level from:', alarmLevel, 'to:', alarmLevelEnum);

      // Create the alarm/incident
      console.log('[CreateIncident] Inserting alarm with end_user_id:', callerId, 'and alarm_level:', alarmLevelEnum);
    const { data: alarmResult, error: alarmErr } = await supabase
      .from('alarms')
      .insert([
        {
          end_user_id: callerId,
          user_latitude: latitude,
          user_longitude: longitude,
          initial_alarm_level: alarmLevelEnum,
          current_alarm_level: alarmLevelEnum,
          status: 'Pending Dispatch'
        }
      ])
      .select('alarm_id')
      .single();

    if (alarmErr) {
      console.error('[CreateIncident] Alarm insert error:', alarmErr);
      throw alarmErr;
    }

    const alarmId = alarmResult.alarm_id;
    console.log('[CreateIncident] Successfully created alarm with id:', alarmId);

    // Log the incident creation
    const { error: logErr } = await supabase.from('alarm_response_log').insert([
      {
        alarm_id: alarmId,
        action_type: 'Initial Dispatch',
        details: `Incident: ${incidentType || 'Not specified'} | Location: ${location} | Narrative: ${narrative || 'No details'}`,
        performed_by_user_id: (req.user && req.user.id) ? req.user.id : null
      }
    ]);

    if (logErr) throw logErr;

      // Broadcast to connected clients so other stations receive the incident
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

    // ── 5) KNN: find nearest READY station ──────────────────────────
    let dispatchedStationId = null;
    let stationName = null;
    let stationPhone = null;

    try {
      const forceStationId = req.body.forceStationId; // dev-only override

      // Fetch all stations
      const { data: stations, error: stErr } = await supabase
        .from('fire_stations')
        .select('station_id, station_name, latitude, longitude, contact_number');

      if (stErr) throw stErr;

      if (stations && stations.length > 0) {
        // Optionally check readiness — skip stations that are NOT_READY
        const { data: readinessRows } = await supabase
          .from('station_readiness')
          .select('station_id, status')
          .order('submitted_at', { ascending: false });

        // Build map: station_id → latest readiness status
        const readinessMap = new Map();
        (readinessRows || []).forEach((r) => {
          if (!readinessMap.has(r.station_id)) readinessMap.set(r.station_id, r.status);
        });

        // Get currently online station IDs
        const onlineIds = getOnlineStationIds();
        console.log(`[KNN] Online stations: [${[...onlineIds].join(', ')}]`);

        // Score each station by distance, filter out NOT_READY unless forceStationId
        const allEligible = stations
          .filter((s) => {
            if (forceStationId) return s.station_id === Number(forceStationId);
            const rs = readinessMap.get(s.station_id);
            // Allow if no readiness record yet (new station) or READY/PARTIALLY_READY
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

        // Prefer online stations; fall back to all eligible if none are online
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
          stationPhone = nearest.contact_number || null;
          console.log(
            `[KNN] Nearest station: ${nearest.station_name} (id=${nearest.station_id}, dist=${nearest.distance.toFixed(2)}km, phone=${stationPhone})`
          );

          // Update alarm with assigned station
          await supabase
            .from('alarms')
            .update({ assigned_station_id: dispatchedStationId })
            .eq('alarm_id', alarmId);

          // Notify the assigned station AND main admin via Socket.IO rooms
          const io = req.app.get('io');
          if (io) {
            const incidentPayload = {
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
            };
            io.to(`station-${dispatchedStationId}`).emit('incoming-incident', incidentPayload);
          }

          // Start failover timer: if station doesn't accept within 20s, reassign
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

          // VoIP call will be added later when mobile app has a
          // custom dev build with the native Twilio SDK.
          // For now, the socket 'incoming-incident' event (above)
          // triggers the incoming call modal in the admin browser.

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
      coordinates: {
        latitude,
        longitude,
      },
    });
  } catch (error) {
    // Log full error object for debugging
    console.error('Create incident error:', error);
    if (error && error.message) console.error('Create incident error message:', error.message);
    if (error && error.details) console.error('Create incident error details:', error.details);
    if (error && error.hint) console.error('Create incident error hint:', error.hint);
    if (error && error.code) console.error('Create incident error code:', error.code);
    res.status(500).json({
      message: 'Failed to create incident',
      error: (error && error.message) || String(error)
    });
  }
};

// Register on both paths so civilian app (/enduser/create-alarm) and admin (/create-incident) both work
router.post('/create-incident', createIncidentHandler);
router.post('/enduser/create-alarm', createIncidentHandler);

// ── Accept incident (atomic lock — first-accept wins) ───────────────
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

    // Notify all clients that this incident was accepted
    const io = req.app.get('io');
    if (io) {
      io.emit('incident-accepted', {
        alarmId: Number(alarmId),
        stationId: isMainAdmin ? 'main' : Number(stationId),
        acceptedBy: userId,
      });

      // Look up station name for the civilian app
      let stationName = null;
      if (isMainAdmin) {
        stationName = 'Central Fire Station (Main)';
      } else {
        try {
          const { data: stationRow } = await supabase
            .from('fire_stations')
            .select('station_name')
            .eq('station_id', Number(stationId))
            .single();
          stationName = stationRow?.station_name || null;
        } catch (_) {}
      }

      // Tell the civilian mobile app that a station picked up
      io.to(`alarm-${alarmId}`).emit('call-accepted', {
        alarmId: Number(alarmId),
        stationId: isMainAdmin ? 'main' : Number(stationId),
        stationName,
      });
      console.log(`[AcceptAPI] Emitted call-accepted to alarm-${alarmId} (station ${stationId} / ${stationName})`);
    }

    res.json({ message: 'Incident accepted', alarm: result.alarm });
  } catch (error) {
    console.error('Accept incident error:', error);
    res.status(500).json({ message: 'Failed to accept incident', error: error.message });
  }
});

// ── Reject / decline incident (triggers immediate failover) ─────────
router.post('/incidents/:alarmId/reject', authenticateToken, async (req, res) => {
  try {
    const { alarmId } = req.params;
    const stationId = req.body.stationId || req.user.assignedStationId;

    // Cancel existing failover and trigger reassignment immediately
    cancelFailover(Number(alarmId));

    // Fetch alarm coordinates for re-ranking
    const { data: alarm } = await supabase
      .from('alarms')
      .select('alarm_id, user_latitude, user_longitude, status')
      .eq('alarm_id', alarmId)
      .single();

    if (!alarm || alarm.status !== 'Pending Dispatch') {
      return res.status(409).json({ message: 'Incident is no longer pending' });
    }

    // Get ranked stations excluding the rejecting station
    const ranked = await getRankedStations(alarm.user_latitude, alarm.user_longitude);
    const remaining = ranked.filter((s) => s.station_id !== Number(stationId));

    if (remaining.length === 0) {
      return res.status(200).json({ message: 'No other stations available for reassignment' });
    }

    const nextStation = remaining[0];

    // Reassign
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

    // Notify new station
    const io = req.app.get('io');
    if (io) {
      io.to(`station-${nextStation.station_id}`).emit('incoming-incident', {
        alarmId: Number(alarmId),
        assignedStationId: nextStation.station_id,
        stationName: nextStation.station_name,
        failover: true,
      });
    }

    // Start failover timer for the new station
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

// Get all incidents/alarms
router.get('/incidents', authenticateToken, async (req, res) => {
  try {
    // Fetch alarms with correct table names and try to get related data
    let query = supabase
      .from('alarms')
      .select(
        `alarm_id,end_user_id,user_latitude,user_longitude,initial_alarm_level,current_alarm_level,status,call_time,dispatch_time,resolve_time,assigned_station_id,assigned_truck_id`
      )
      .order('call_time', { ascending: false })
      .limit(50);

    const { data: alarms, error: alarmsErr } = await query;

    if (alarmsErr) throw alarmsErr;

    // Fetch user and station data separately for each alarm
    const enhanced = await Promise.all((alarms || []).map(async (a) => {
      let userData = {};
      let stationName = 'Unassigned Station';

      // Fetch user data if end_user_id exists
      if (a.end_user_id) {
        const { data: user } = await supabase
          .from('users')
          .select('full_name,phone_number')
          .eq('user_id', a.end_user_id)
          .single();
        if (user) {
          userData = user;
        }
      }

      // Fetch station name if assigned_station_id exists
      if (a.assigned_station_id) {
        const { data: station } = await supabase
          .from('fire_stations')
          .select('station_name')
          .eq('station_id', a.assigned_station_id)
          .single();
        if (station) {
          stationName = station.station_name;
        }
      }

      return {
        alarm_id: a.alarm_id,
        end_user_id: a.end_user_id,
        full_name: userData.full_name || 'Unknown Caller',
        phone_number: userData.phone_number || 'N/A',
        user_latitude: a.user_latitude,
        user_longitude: a.user_longitude,
        initial_alarm_level: a.initial_alarm_level,
        current_alarm_level: a.current_alarm_level,
        status: a.status,
        call_time: a.call_time,
        dispatch_time: a.dispatch_time,
        resolve_time: a.resolve_time,
        station_name: stationName,
        details: null
      };
    }));

    res.json({ incidents: enhanced, total: enhanced.length });
  } catch (error) {
    console.error('Get incidents error:', error);
    res.status(500).json({
      message: 'Failed to fetch incidents',
      error: error.message
    });
  }
});

// Get latest firetruck locations from history table (one latest point per truck)
router.get('/firetruck-locations', async (req, res) => {
  try {
    // Only consider locations from the last 30 seconds so we show "active" trucks
    const now = new Date();
    const cutoff = new Date(now.getTime() - 30_000).toISOString();

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
    res.status(500).json({
      message: 'Failed to fetch firetruck locations',
      error: error.message,
    });
  }
});

// Get incident details
router.get('/incidents/:alarmId', authenticateToken, async (req, res) => {
  try {
    const { alarmId } = req.params;

    const { data: alarms, error: alarmErr } = await supabase
      .from('alarms')
      .select('alarm_id,end_user_id,user_latitude,user_longitude,initial_alarm_level,current_alarm_level,status,call_time,dispatch_time,resolve_time')
      .eq('alarm_id', alarmId)
      .limit(1);

    if (alarmErr) throw alarmErr;

    if (!alarms || alarms.length === 0) {
      return res.status(404).json({ message: 'Incident not found' });
    }

    const alarm = alarms[0];
    
    // Fetch user data separately if end_user_id exists
    let userData = {};
    if (alarm.end_user_id) {
      const { data: user } = await supabase
        .from('users')
        .select('full_name,phone_number')
        .eq('user_id', alarm.end_user_id)
        .single();
      if (user) {
        userData = user;
      }
    }

    const { data: logs, error: logsErr } = await supabase
      .from('alarm_response_log')
      .select('log_id,action_timestamp,action_type,details,performed_by_user_id')
      .eq('alarm_id', alarmId)
      .order('action_timestamp', { ascending: false });

    if (logsErr) throw logsErr;

    const incident = {
      ...alarm,
      full_name: userData.full_name || 'Unknown Caller',
      phone_number: userData.phone_number || 'N/A'
    };

    res.json({ incident, timeline: logs || [] });
  } catch (error) {
    console.error('Get incident details error:', error);
    res.status(500).json({
      message: 'Failed to fetch incident details',
      error: error.message
    });
  }
});

// Update incident alarm level
router.patch('/incidents/:alarmId/update-alarm-level', authenticateToken, async (req, res) => {
  try {
    const { alarmId } = req.params;
    const { newAlarmLevel } = req.body;

    if (!newAlarmLevel) {
      return res.status(400).json({
        message: 'New alarm level is required'
      });
    }

    const { error: updateErr } = await supabase
      .from('alarms')
      .update({ current_alarm_level: newAlarmLevel })
      .eq('alarm_id', alarmId);

    if (updateErr) throw updateErr;

    const { error: logInsertErr } = await supabase.from('alarm_response_log').insert([
      {
        alarm_id: alarmId,
        action_type: 'Alarm Level Change',
        details: `Changed to ${newAlarmLevel}`,
        performed_by_user_id: req.user.id
      }
    ]);

    if (logInsertErr) throw logInsertErr;

    res.json({ message: 'Alarm level updated', alarmId, newAlarmLevel });
  } catch (error) {
    console.error('Update alarm level error:', error);
    res.status(500).json({
      message: 'Failed to update alarm level',
      error: error.message
    });
  }
});

export default router;
