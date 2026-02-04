import express from 'express';
import { supabase } from '../supabaseClient.js';
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
      const fullName = `${fname} ${lname}`;

      const { data: insertResult, error: insertError } = await supabase
        .from('users')
        .insert([
          {
            first_name: fname,
            last_name: lname,
            full_name: fullName,
            phone_number: phoneNumber,
            password: 'temp_' + Date.now(),
            role: 'end_user',
            email: `caller_${Date.now()}@bfp.gov`
          }
        ])
        .select('user_id')
        .single();

      if (insertError) throw insertError;
      callerId = insertResult.user_id;
    } else {
      callerId = callerRows[0].user_id;
    }

      // Map incident type to alarm level if not provided
      const alarmLevelEnum = alarmLevel.includes('Alarm') 
        ? alarmLevel.replace(/st|nd|rd|th\s/, '')
        : 'Alarm 1';

      // Create the alarm/incident
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

    if (alarmErr) throw alarmErr;

    const alarmId = alarmResult.alarm_id;

    // Log the incident creation
    const { error: logErr } = await supabase.from('alarm_response_log').insert([
      {
        alarm_id: alarmId,
        action_type: 'Initial Dispatch',
        details: `Incident: ${incidentType || 'Not specified'} | Location: ${location} | Narrative: ${narrative || 'No details'}`,
        performed_by_user_id: req.user.id
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
    // Fetch alarms with related user/station/truck/log details (embeds require foreign keys)
    const { data: alarms, error: alarmsErr } = await supabase
      .from('alarms')
      .select(
        `alarm_id,end_user_id,user_latitude,user_longitude,initial_alarm_level,current_alarm_level,status,call_time,dispatch_time,resolve_time,users(full_name,phone_number),fire_stations(station_name),firetrucks(plate_number),alarm_response_log(details)`
      )
      .order('call_time', { ascending: false })
      .limit(50);

    if (alarmsErr) throw alarmsErr;

    // Flatten embedded relations for response
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
      .select('alarm_id,end_user_id,user_latitude,user_longitude,initial_alarm_level,current_alarm_level,status,call_time,dispatch_time,resolve_time,users(full_name,phone_number)')
      .eq('alarm_id', alarmId)
      .limit(1);

    if (alarmErr) throw alarmErr;

    if (!alarms || alarms.length === 0) {
      return res.status(404).json({ message: 'Incident not found' });
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
