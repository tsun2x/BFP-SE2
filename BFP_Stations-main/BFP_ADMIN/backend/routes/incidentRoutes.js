import express from 'express';
import { supabase, db } from '../config/supabase.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Create a new incident/alarm
router.post('/create-incident', authenticateToken, async (req, res) => {
  try {
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

    try {
      // Check if caller exists or create new end user
      let caller = await db.getUser(phoneNumber);
      let callerId;

      if (!caller) {
        // Create new end user
        const names = `${firstName || ''} ${lastName || ''}`.trim().split(' ');
        const fname = names[0] || 'Unknown';
        const lname = names[1] || 'Caller';
        const fullName = `${fname} ${lname}`;
        
        const newUser = await db.createUser({
          first_name: fname,
          last_name: lname,
          full_name: fullName,
          phone_number: phoneNumber,
          password: 'temp_' + Date.now(),
          role: 'end_user',
          email: `caller_${Date.now()}@bfp.gov`
        });
        callerId = newUser.user_id;
      } else {
        callerId = caller.user_id;
      }

      // Map incident type to alarm level if not provided
      const alarmLevelEnum = alarmLevel.includes('Alarm') 
        ? alarmLevel.replace(/st|nd|rd|th\s/, '')
        : 'Alarm 1';

      // Create the alarm/incident
      const alarmData = await db.createAlarm({
        end_user_id: callerId,
        user_latitude: latitude,
        user_longitude: longitude,
        initial_alarm_level: alarmLevelEnum,
        current_alarm_level: alarmLevelEnum,
        status: 'Pending Dispatch'
      });

      const alarmId = alarmData.alarm_id;

      // Log the incident creation
      await db.logAlarmResponse({
        alarm_id: alarmId,
        action_type: 'Initial Dispatch',
        details: `Incident: ${incidentType || 'Not specified'} | Location: ${location} | Narrative: ${narrative || 'No details'}`,
        performed_by_user_id: req.user.id
      });

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

      res.status(201).json({
        message: 'Incident created successfully',
        alarmId,
        callerId,
        status: 'Pending Dispatch',
        coordinates: {
          latitude,
          longitude
        }
      });
    } catch (error) {
      throw error;
    }
  } catch (error) {
    console.error('Create incident error:', error);
    res.status(500).json({
      message: 'Failed to create incident',
      error: error.message
    });
  }
});

// Get all incidents/alarms
router.get('/incidents', authenticateToken, async (req, res) => {
  try {
    const alarms = await db.getAlarms(50);

    res.json({
      incidents: alarms,
      total: alarms.length
    });
  } catch (error) {
    console.error('Get incidents error:', error);
    res.status(500).json({
      message: 'Failed to fetch incidents',
      error: error.message
    });
  }
});

// Get incident details
router.get('/incidents/:alarmId', authenticateToken, async (req, res) => {
  try {
    const { alarmId } = req.params;

    const alarm = await db.getAlarmById(alarmId);

    if (!alarm) {
      return res.status(404).json({
        message: 'Incident not found'
      });
    }

    // Get logs for this alarm
    const { data: logs, error: logsError } = await supabase
      .from('alarm_response_log')
      .select('*')
      .eq('alarm_id', alarmId)
      .order('action_timestamp', { ascending: false });
    
    if (logsError) throw logsError;

    res.json({
      incident: alarm,
      timeline: logs || []
    });
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

    await db.updateAlarm(alarmId, { current_alarm_level: newAlarmLevel });

    await db.logAlarmResponse({
      alarm_id: alarmId,
      action_type: 'Alarm Level Change',
      details: `Changed to ${newAlarmLevel}`,
      performed_by_user_id: req.user.id
    });

    res.json({
      message: 'Alarm level updated',
      alarmId,
      newAlarmLevel
    });
  } catch (error) {
    console.error('Update alarm level error:', error);
    res.status(500).json({
      message: 'Failed to update alarm level',
      error: error.message
    });
  }
});

// End-user creates an alarm; backend picks nearest ready station (KNN)
router.post('/enduser/create-alarm', async (req, res) => {
  try {
    const {
      endUserId,
      phoneNumber,
      latitude,
      longitude,
      incidentType,
      alarmLevel,
      location,
      narrative,
      forceStationId,
    } = req.body;

    const hasLat = latitude !== undefined && latitude !== null;
    const hasLng = longitude !== undefined && longitude !== null;

    if (!hasLat || !hasLng) {
      return res.status(400).json({
        message: 'Coordinates (latitude and longitude) are required',
      });
    }

    try {
      // 1) Resolve / create end user
      let callerId = endUserId || null;
      if (!callerId && phoneNumber) {
        let user = await db.getUser(phoneNumber);
        if (user) {
          callerId = user.user_id;
        } else {
          const newUser = await db.createUser({
            full_name: 'End User',
            phone_number: phoneNumber,
            password: 'temp_' + Date.now(),
            role: 'end_user',
            email: `enduser_${Date.now()}@bfp.gov`
          });
          callerId = newUser.user_id;
        }
      }

      // 2) Find nearest ready station using simple distance (KNN on fire_stations)
      let dispatchedStationId;
      const stationDistances = [];
      let bestDistanceKm = null;

      const toRad = (deg) => (deg * Math.PI) / 180;
      const earthR = 6371; // km

      const forcedId = forceStationId ? Number(forceStationId) : null;

      if (forcedId) {
        const { data: forcedStations, error: forcedError } = await supabase
          .from('_fire_stations')
          .select('station_id, latitude, longitude')
          .eq('station_id', forcedId)
          .eq('is_ready', true)
          .single();

        if (forcedError || !forcedStations) {
          return res.status(400).json({
            message: 'Forced station is not ready or does not exist',
          });
        }

        const st = forcedStations;
        const dLat = toRad(Number(st.latitude) - Number(latitude));
        const dLon = toRad(Number(st.longitude) - Number(longitude));
        const a =
          Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos(toRad(latitude)) *
            Math.cos(toRad(Number(st.latitude))) *
            Math.sin(dLon / 2) *
            Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const dist = earthR * c;

        stationDistances.push({ stationId: st.station_id, distanceKm: dist });
        bestDistanceKm = dist;
        dispatchedStationId = forcedId;
      } else {
        const { data: stations, error: stationsError } = await supabase
          .from('_fire_stations')
          .select('station_id, latitude, longitude, is_ready')
          .eq('is_ready', true);

        if (stationsError || !stations || stations.length === 0) {
          return res.status(503).json({
            message: 'No ready stations available',
          });
        }

        // Debug: log which stations KNN is considering as ready
        try {
          console.log('[KNN] Ready stations for enduser/create-alarm:',
            stations.map((s) => ({
              station_id: s.station_id,
              latitude: s.latitude,
              longitude: s.longitude,
              is_ready: s.is_ready,
            }))
          );
        } catch (logErr) {
          console.error('[KNN] Error logging ready stations:', logErr);
        }

        let bestStation = null;
        let bestDist = Infinity;

        for (const st of stations) {
          const dLat = toRad(Number(st.latitude) - Number(latitude));
          const dLon = toRad(Number(st.longitude) - Number(longitude));
          const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(toRad(latitude)) *
              Math.cos(toRad(Number(st.latitude))) *
              Math.sin(dLon / 2) *
              Math.sin(dLon / 2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
          const dist = earthR * c;

          stationDistances.push({ stationId: st.station_id, distanceKm: dist });

          if (dist < bestDist) {
            bestDist = dist;
            bestStation = st;
          }
        }

        dispatchedStationId = bestStation.station_id;
        bestDistanceKm = bestDist;

        try {
          console.log('[KNN] Chosen station', dispatchedStationId, 'distanceKm=', bestDistanceKm,
            'all distances=', stationDistances);
        } catch (logErr) {
          console.error('[KNN] Error logging chosen station:', logErr);
        }
      }

      // Coverage radius rule (informational for now)
      const MAX_RADIUS_KM = 50; // adjust as needed
      const withinRadius =
        typeof bestDistanceKm === 'number' ? bestDistanceKm <= MAX_RADIUS_KM : null;

      const alarmLevelEnum =
        (alarmLevel || '').includes('Alarm')
          ? alarmLevel.replace(/st|nd|rd|th\s/, '')
          : 'Alarm 1';

      // 3) Insert alarm
      const alarmData = await db.createAlarm({
        end_user_id: callerId,
        user_latitude: latitude,
        user_longitude: longitude,
        initial_alarm_level: alarmLevelEnum,
        current_alarm_level: alarmLevelEnum,
        status: 'Pending Dispatch',
        dispatched_station_id: dispatchedStationId
      });

      const alarmId = alarmData.alarm_id;

      // 4) Log
      await db.logAlarmResponse({
        alarm_id: alarmId,
        action_type: 'Initial Dispatch',
        details: `End-user alarm: ${incidentType || 'Not specified'} | Location: ${
          location || ''
        } | ${narrative || ''}`,
        performed_by_user_id: null
      });

      // 5) Notify chosen station only
      try {
        const io = req.app.get('io');
        if (io) {
          io.to(`station-${dispatchedStationId}`).emit('incoming-incident', {
            alarmId,
            callerId,
            phoneNumber: phoneNumber || null,
            incidentType: incidentType || null,
            alarmLevel: alarmLevelEnum,
            location: location || null,
            narrative: narrative || null,
            coordinates: { latitude, longitude },
            dispatchedStationId,
            status: 'Pending Dispatch',
          });
        }
      } catch (emitErr) {
        console.error('Error emitting incoming-incident:', emitErr);
      }

      res.status(201).json({
        message: 'Alarm created and dispatched',
        alarmId,
        dispatchedStationId,
        callerId,
        coordinates: { latitude, longitude },
        status: 'Pending Dispatch',
        distances: stationDistances,
        chosenDistanceKm: bestDistanceKm,
        withinRadius,
        maxRadiusKm: MAX_RADIUS_KM,
      });
    } catch (err) {
      throw err;
    }
  } catch (error) {
    console.error('End-user create-alarm error:', error);
    res.status(500).json({
      message: 'Failed to create alarm',
      error: error.message,
    });
  }
});

export default router;
