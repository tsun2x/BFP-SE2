import express from 'express';
import { supabase } from '../supabaseClient.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Create a new incident/alarm
// NOTE: authentication temporarily disabled for debugging create-incident errors
// Remove the `authenticateToken` middleware to allow reproducing errors from the frontend
router.post('/create-incident', async (req, res) => {
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
