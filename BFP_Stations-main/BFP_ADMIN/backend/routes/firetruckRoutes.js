import express from 'express';
import { supabase, db } from '../config/supabase.js';

const router = express.Router();

// GET /api/firetrucks/current-alarm?truck_id=1
// Returns the current active alarm (if any) for the given firetruck
router.get('/firetrucks/current-alarm', async (req, res) => {
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
