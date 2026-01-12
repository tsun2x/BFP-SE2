import express from 'express';
import { pool } from '../config/database.js';

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

    const connection = await pool.getConnection();

    try {
      // Join firetrucks with alarms using current_alarm_id
      const [rows] = await connection.query(
        `SELECT 
           f.truck_id,
           f.plate_number,
           f.station_id,
           f.current_alarm_id,
           a.alarm_id,
           a.user_latitude,
           a.user_longitude,
           a.initial_alarm_level,
           a.current_alarm_level,
           a.status,
           a.call_time,
           a.dispatch_time,
           a.resolve_time
         FROM firetrucks f
         LEFT JOIN alarms a ON a.alarm_id = f.current_alarm_id
         WHERE f.truck_id = ?
         LIMIT 1`,
        [truck_id]
      );

      connection.release();

      if (!rows.length || !rows[0].alarm_id) {
        return res.json({
          success: true,
          hasAlarm: false,
          alarm: null,
        });
      }

      const row = rows[0];

      const alarm = {
        alarmId: row.alarm_id,
        truckId: row.truck_id,
        plateNumber: row.plate_number,
        stationId: row.station_id,
        userLatitude: Number(row.user_latitude),
        userLongitude: Number(row.user_longitude),
        initialAlarmLevel: row.initial_alarm_level,
        currentAlarmLevel: row.current_alarm_level,
        status: row.status,
        callTime: row.call_time,
        dispatchTime: row.dispatch_time,
        resolveTime: row.resolve_time,
      };

      return res.json({
        success: true,
        hasAlarm: true,
        alarm,
      });
    } catch (err) {
      connection.release();
      throw err;
    }
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
