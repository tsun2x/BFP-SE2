import express from 'express';
import { supabase } from '../supabaseClient.js';
import { authenticateToken } from '../middleware/auth.js';
import { requireRoles, isAdminUser, getUserStationId } from '../middleware/role.js';

const router = express.Router();


// POST /api/firetrucks/track
// Receives firetruck location + status from the mobile app and stores it in Supabase
router.post('/firetrucks/track', authenticateToken, requireRoles(['admin', 'substation_admin', 'driver']), async (req, res) => {
  try {
    const {
      truck_id,
      latitude,
      longitude,
      speed,
      heading,
      accuracy,
      battery_level,
      alarm_level,
      fire_status,
    } = req.body;

    if (!truck_id || latitude === undefined || longitude === undefined) {
      return res.status(400).json({
        success: false,
        error: 'truck_id, latitude, and longitude are required',
      });
    }

    const isAdmin = isAdminUser(req.user);
    const stationId = getUserStationId(req.user);

    if (!isAdmin && !stationId) {
      return res.status(403).json({
        success: false,
        error: 'You are not assigned to any station',
      });
    }

    if (!isAdmin) {
      const { data: truck, error: truckErr } = await supabase
        .from('firetrucks')
        .select('truck_id, assigned_station_id')
        .eq('truck_id', truck_id)
        .single();

      if (truckErr) {
        return res.status(500).json({
          success: false,
          error: 'Failed to validate firetruck assignment: ' + truckErr.message,
        });
      }

      if (String(truck?.assigned_station_id ?? '') !== String(stationId)) {
        return res.status(403).json({
          success: false,
          error: 'Forbidden: firetruck is not assigned to your station',
        });
      }
    }

    const payload = {
      truck_id,
      latitude,
      longitude,
      speed: speed ?? null,
      heading: heading ?? null,
      accuracy: accuracy ?? null,
      battery_level: battery_level ?? null,
      alarm_level: alarm_level ?? null,
      fire_status: fire_status ?? null,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('firetruck_locations')
      .insert([payload])
      .select('*')
      .single();

    if (error) {
      console.error('Supabase insert error (firetruck_locations):', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to save location to Supabase: ' + error.message,
      });
    }

    return res.json({
      success: true,
      message: 'Location stored in Supabase',
      data,
    });
  } catch (error) {
    console.error('Firetruck tracking error:', error);
    return res.status(500).json({
      success: false,
      error: 'Unexpected server error: ' + (error && error.message ? error.message : 'Unknown error'),
    });
  }
});

// GET /api/firetrucks/current-alarm?truck_id=1
// Returns the current active alarm (if any) for the given firetruck
router.get('/firetrucks/current-alarm', authenticateToken, requireRoles(['admin', 'substation_admin', 'driver']), async (req, res) => {
  try {
    const { truck_id } = req.query;

    if (!truck_id) {
      return res.status(400).json({
        success: false,
        message: 'truck_id query parameter is required',
      });
    }

    // Get firetruck with current alarm
    const { data: truck, error: truckError } = await supabase
      .from('firetrucks')
      .select(`
        truck_id,
        plate_number,
        assigned_station_id,
        current_alarm_id,
        alarms!current_alarm_id (
          alarm_id,
          user_latitude,
          user_longitude,
          initial_alarm_level,
          current_alarm_level,
          status,
          call_time,
          dispatch_time,
          resolve_time
        )
      `)
      .eq('truck_id', truck_id)
      .single();

    const isAdmin = isAdminUser(req.user);
    const stationId = getUserStationId(req.user);

    if (!isAdmin) {
      if (!stationId) {
        return res.status(403).json({
          success: false,
          message: 'You are not assigned to any station',
        });
      }
      if (String(truck?.assigned_station_id ?? '') !== String(stationId)) {
        return res.status(403).json({
          success: false,
          message: 'Forbidden: firetruck is not assigned to your station',
        });
      }
    }

    if (truckError && truckError.code !== 'PGRST116') throw truckError;

    if (!truck || !truck.alarms) {
      return res.json({
        success: true,
        hasAlarm: false,
        alarm: null,
      });
    }

    const alarm_data = truck.alarms;
    const alarm = {
      alarmId: alarm_data.alarm_id,
      truckId: truck.truck_id,
      plateNumber: truck.plate_number,
      stationId: truck.assigned_station_id,
      userLatitude: Number(alarm_data.user_latitude),
      userLongitude: Number(alarm_data.user_longitude),
      initialAlarmLevel: alarm_data.initial_alarm_level,
      currentAlarmLevel: alarm_data.current_alarm_level,
      status: alarm_data.status,
      callTime: alarm_data.call_time,
      dispatchTime: alarm_data.dispatch_time,
      resolveTime: alarm_data.resolve_time,
    };

    return res.json({
      success: true,
      hasAlarm: true,
      alarm,
    });
  } catch (error) {
    console.error('GET /firetrucks/current-alarm error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch current alarm for firetruck',
      error: error.message,
    });
  }
});

// PUT /api/firetrucks/status
// Driver updates their truck's alarm level and/or fire status.
// Broadcasts the update via Socket.IO to all admins and end-users.
router.put('/firetrucks/status', authenticateToken, requireRoles(['admin', 'substation_admin', 'driver']), async (req, res) => {
  try {
    const {
      truck_id,
      alarm_id,
      alarm_level,
      fire_status,
      latitude,
      longitude,
      driver_name,
    } = req.body;

    if (!truck_id) {
      return res.status(400).json({ success: false, error: 'truck_id is required' });
    }

    // Upsert into firetruck_status table (live status, one row per truck)
    const payload = {
      truck_id,
      alarm_id: alarm_id ?? null,
      alarm_level: alarm_level ?? null,
      fire_status: fire_status ?? null,
      latitude: latitude ?? null,
      longitude: longitude ?? null,
      driver_name: driver_name ?? req.user?.name ?? null,
      updated_at: new Date().toISOString(),
    };

    // Try update first, then insert if not exists
    const { data: existing } = await supabase
      .from('firetruck_status')
      .select('id')
      .eq('truck_id', truck_id)
      .maybeSingle();

    let result;
    if (existing) {
      const { data, error } = await supabase
        .from('firetruck_status')
        .update(payload)
        .eq('truck_id', truck_id)
        .select('*')
        .single();
      if (error) throw error;
      result = data;
    } else {
      const { data, error } = await supabase
        .from('firetruck_status')
        .insert([payload])
        .select('*')
        .single();
      if (error) throw error;
      result = data;
    }

    // Also update the _alarms table current_alarm_level if we have an alarm_id
    if (alarm_id && alarm_level) {
      await supabase
        .from('_alarms')
        .update({ current_alarm_level: alarm_level })
        .eq('alarm_id', alarm_id)
        .then(({ error }) => {
          if (error) console.error('[firetrucks/status] Failed to update _alarms alarm level:', error.message);
        });
    }

    // Broadcast to everyone via Socket.IO
    const io = req.app.get('io');
    if (io) {
      const broadcast = {
        truckId: truck_id,
        alarmId: alarm_id,
        alarmLevel: alarm_level,
        fireStatus: fire_status,
        latitude,
        longitude,
        driverName: payload.driver_name,
        updatedAt: payload.updated_at,
      };
      io.emit('truck-status-update', broadcast);
      console.log('[firetrucks/status] Broadcasted truck-status-update:', JSON.stringify(broadcast));
    }

    return res.json({ success: true, data: result });
  } catch (error) {
    console.error('PUT /firetrucks/status error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/firetrucks/active
// Returns all active firetrucks with their current status (for map display)
router.get('/firetrucks/active', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('firetruck_status')
      .select('*')
      .order('updated_at', { ascending: false });

    if (error) throw error;

    return res.json({ success: true, data: data || [] });
  } catch (error) {
    console.error('GET /firetrucks/active error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
