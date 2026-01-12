import express from 'express';
import { pool } from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Create a new incident/alarm
router.post('/create-incident', authenticateToken, async (req, res) => {
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

    const connection = await pool.getConnection();

    try {
      // Check if caller exists or create new end user
      let [callerRows] = await connection.query(
        'SELECT user_id FROM users WHERE phone_number = ?',
        [phoneNumber]
      );

      let callerId;

      if (callerRows.length === 0) {
        // Create new end user
        const names = `${firstName || ''} ${lastName || ''}`.trim().split(' ');
        const fname = names[0] || 'Unknown';
        const lname = names[1] || 'Caller';
        const fullName = `${fname} ${lname}`;
        
        const [insertResult] = await connection.query(
          'INSERT INTO users (first_name, last_name, full_name, phone_number, password, role, email) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [fname, lname, fullName, phoneNumber, 'temp_' + Date.now(), 'end_user', `caller_${Date.now()}@bfp.gov`]
        );
        callerId = insertResult.insertId;
      } else {
        callerId = callerRows[0].user_id;
      }

      // Map incident type to alarm level if not provided
      const alarmLevelEnum = alarmLevel.includes('Alarm') 
        ? alarmLevel.replace(/st|nd|rd|th\s/, '')
        : 'Alarm 1';

      // Create the alarm/incident
      const [alarmResult] = await connection.query(
        `INSERT INTO alarms (
          end_user_id,
          user_latitude,
          user_longitude,
          initial_alarm_level,
          current_alarm_level,
          status
        ) VALUES (?, ?, ?, ?, ?, ?)`,
        [
          callerId,
          latitude,
          longitude,
          alarmLevelEnum,
          alarmLevelEnum,
          'Pending Dispatch'
        ]
      );

      const alarmId = alarmResult.insertId;

      // Log the incident creation
      await connection.query(
        `INSERT INTO alarm_response_log (
          alarm_id,
          action_type,
          details,
          performed_by_user_id
        ) VALUES (?, ?, ?, ?)`,
        [
          alarmId,
          'Initial Dispatch',
          `Incident: ${incidentType || 'Not specified'} | Location: ${location} | Narrative: ${narrative || 'No details'}`,
          req.user.id
        ]
      );

      connection.release();

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
      connection.release();
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
    const connection = await pool.getConnection();

    const [alarms] = await connection.query(
      `SELECT 
        a.alarm_id,
        a.end_user_id,
        u.full_name,
        u.phone_number,
        a.user_latitude,
        a.user_longitude,
        a.initial_alarm_level,
        a.current_alarm_level,
        a.status,
        a.call_time,
        a.dispatch_time,
        a.resolve_time,
        fs.station_name,
        ft.plate_number
      FROM alarms a
      JOIN users u ON a.end_user_id = u.user_id
      LEFT JOIN fire_stations fs ON a.dispatched_station_id = fs.station_id
      LEFT JOIN firetrucks ft ON a.dispatched_truck_id = ft.truck_id
      ORDER BY a.call_time DESC
      LIMIT 50`
    );

    connection.release();

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

    const connection = await pool.getConnection();

    const [alarms] = await connection.query(
      `SELECT 
        a.alarm_id,
        a.end_user_id,
        u.full_name,
        u.phone_number,
        a.user_latitude,
        a.user_longitude,
        a.initial_alarm_level,
        a.current_alarm_level,
        a.status,
        a.call_time,
        a.dispatch_time,
        a.resolve_time
      FROM alarms a
      JOIN users u ON a.end_user_id = u.user_id
      WHERE a.alarm_id = ?`,
      [alarmId]
    );

    const [logs] = await connection.query(
      `SELECT 
        log_id,
        action_timestamp,
        action_type,
        details,
        performed_by_user_id
      FROM alarm_response_log
      WHERE alarm_id = ?
      ORDER BY action_timestamp DESC`,
      [alarmId]
    );

    connection.release();

    if (alarms.length === 0) {
      return res.status(404).json({
        message: 'Incident not found'
      });
    }

    res.json({
      incident: alarms[0],
      timeline: logs
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

    const connection = await pool.getConnection();

    await connection.query(
      'UPDATE alarms SET current_alarm_level = ? WHERE alarm_id = ?',
      [newAlarmLevel, alarmId]
    );

    await connection.query(
      `INSERT INTO alarm_response_log (
        alarm_id,
        action_type,
        details,
        performed_by_user_id
      ) VALUES (?, ?, ?, ?)`,
      [alarmId, 'Alarm Level Change', `Changed to ${newAlarmLevel}`, req.user.id]
    );

    connection.release();

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

    const connection = await pool.getConnection();
    try {
      // 1) Resolve / create end user
      let callerId = endUserId || null;
      if (!callerId && phoneNumber) {
        const [rows] = await connection.query(
          'SELECT user_id FROM users WHERE phone_number = ?',
          [phoneNumber]
        );
        if (rows.length) {
          callerId = rows[0].user_id;
        } else {
          const [ins] = await connection.query(
            'INSERT INTO users (full_name, phone_number, password_hash, role) VALUES (?, ?, ?, ?)',
            ['End User', phoneNumber, 'temp_' + Date.now(), 'end_user']
          );
          callerId = ins.insertId;
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
        const [forcedRows] = await connection.query(
          `SELECT station_id, latitude, longitude
           FROM fire_stations
           WHERE station_id = ? AND is_ready = 1`,
          [forcedId]
        );

        if (!forcedRows.length) {
          connection.release();
          return res.status(400).json({
            message: 'Forced station is not ready or does not exist',
          });
        }

        const st = forcedRows[0];
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
        const [stations] = await connection.query(
          `SELECT station_id, latitude, longitude, is_ready
           FROM fire_stations
           WHERE is_ready = 1`
        );

        if (!stations.length) {
          connection.release();
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
      const [alarmResult] = await connection.query(
        `INSERT INTO alarms (
           end_user_id,
           user_latitude,
           user_longitude,
           initial_alarm_level,
           current_alarm_level,
           status,
           dispatched_station_id
         ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          callerId,
          latitude,
          longitude,
          alarmLevelEnum,
          alarmLevelEnum,
          'Pending Dispatch',
          dispatchedStationId,
        ]
      );

      const alarmId = alarmResult.insertId;

      // 4) Log
      await connection.query(
        `INSERT INTO alarm_response_log (
           alarm_id,
           action_type,
           details,
           performed_by_user_id
         ) VALUES (?, ?, ?, ?)`,
        [
          alarmId,
          'Initial Dispatch',
          `End-user alarm: ${incidentType || 'Not specified'} | Location: ${
            location || ''
          } | ${narrative || ''}`,
          null,
        ]
      );

      connection.release();

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
      connection.release();
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
