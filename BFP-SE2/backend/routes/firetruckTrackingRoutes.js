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

export default router;
