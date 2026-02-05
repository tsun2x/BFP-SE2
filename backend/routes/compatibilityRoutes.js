import express from 'express';
import { pool } from '../config/database.js';

const router = express.Router();

/**
 * COMPATIBILITY ROUTES
 * These endpoints maintain backward compatibility with old PHP API endpoints
 * So mobile apps don't need code changes after migration
 */

// ============================================================
// MOBILE APP ENDPOINTS - Compatibility Layer (OLD PHP Paths)
// ============================================================

// POST /api/register_start.php - End-user registration (phone-based)
router.post('/register_start.php', async (req, res) => {
  try {
    const { phone_number, first_name, last_name } = req.body;

    if (!phone_number) {
      return res.status(400).json({
        success: false,
        error: 'Phone number is required'
      });
    }

    const connection = await pool.getConnection();

    // Check if user already exists
    const [existingUser] = await connection.query(
      'SELECT user_id FROM users WHERE phone_number = ?',
      [phone_number]
    );

    if (existingUser.length > 0) {
      connection.release();
      return res.status(200).json({
        success: true,
        message: 'User already registered',
        user_id: existingUser[0].user_id
      });
    }

    // Create new end-user
    const fullName = `${first_name || 'User'} ${last_name || ''}`.trim();
    const [result] = await connection.query(
      'INSERT INTO users (first_name, last_name, full_name, phone_number, password, role, email) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [
        first_name || 'User',
        last_name || '',
        fullName,
        phone_number,
        'temp_' + Date.now(),
        'end_user',
        `mobile_${Date.now()}@bfp.gov`
      ]
    );

    connection.release();

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      user_id: result.insertId
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({
      success: false,
      error: 'Registration failed: ' + error.message
    });
  }
});

// POST /api/verify_phone_otp.php - OTP verification (stub - basic implementation)
router.post('/verify_phone_otp.php', async (req, res) => {
  try {
    const { phone_number, otp } = req.body;

    if (!phone_number || !otp) {
      return res.status(400).json({
        success: false,
        error: 'Phone number and OTP are required'
      });
    }

    // For now, accept any OTP (in production, validate against stored OTP)
    // This is a placeholder - implement real OTP logic in production
    if (otp.length < 4) {
      return res.status(400).json({
        success: false,
        error: 'Invalid OTP'
      });
    }

    const connection = await pool.getConnection();

    // Get user
    const [user] = await connection.query(
      'SELECT user_id, full_name FROM users WHERE phone_number = ?',
      [phone_number]
    );

    connection.release();

    if (user.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'OTP verified successfully',
      user_id: user[0].user_id,
      full_name: user[0].full_name
    });
  } catch (error) {
    console.error('OTP verification error:', error);
    res.status(500).json({
      success: false,
      error: 'OTP verification failed: ' + error.message
    });
  }
});

// POST /api/update_firetruck_location.php - Update firetruck real-time location
router.post('/update_firetruck_location.php', async (req, res) => {
  try {
    const {
      truck_id,
      latitude,
      longitude,
      speed,
      heading,
      battery_level,
      accuracy,
      alarm_id
    } = req.body;

    if (!truck_id || latitude === undefined || longitude === undefined) {
      return res.status(400).json({
        success: false,
        error: 'truck_id, latitude, and longitude are required'
      });
    }

    const connection = await pool.getConnection();

    try {
      // Update firetruck location
      await connection.query(
        `UPDATE firetrucks 
         SET current_latitude = ?, 
             current_longitude = ?, 
             last_online = NOW(),
             battery_level = ?,
             last_location_update = NOW(),
             current_alarm_id = ?,
             is_active = 1,
             status = ?
         WHERE truck_id = ?`,
        [
          latitude,
          longitude,
          battery_level || null,
          alarm_id || null,
          alarm_id ? 'on_mission' : 'available',
          truck_id
        ]
      );

      connection.release();

      res.json({
        success: true,
        message: 'Location updated successfully',
        truck_id: truck_id,
        updated_at: new Date().toISOString()
      });
    } catch (error) {
      connection.release();
      throw error;
    }
  } catch (error) {
    console.error('Update firetruck location error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update location: ' + error.message
    });
  }
});

// GET /api/get_firetruck_locations.php - Get active firetruck locations
router.get('/get_firetruck_locations.php', async (req, res) => {
  try {
    const { truck_id, station_id, active_only, limit } = req.query;

    const connection = await pool.getConnection();

    let query = `
      SELECT 
        f.truck_id,
        f.plate_number,
        f.model,
        f.current_latitude as latitude,
        f.current_longitude as longitude,
        f.last_location_update,
        f.last_online,
        f.battery_level,
        f.status,
        f.current_alarm_id,
        f.station_id,
        fs.station_name,
        fs.contact_number as station_contact,
        a.status as alarm_status,
        a.user_latitude as alarm_latitude,
        a.user_longitude as alarm_longitude,
        a.initial_alarm_level,
        a.current_alarm_level,
        u.full_name as driver_name,
        u.phone_number as driver_phone
      FROM firetrucks f
      LEFT JOIN fire_stations fs ON f.station_id = fs.station_id
      LEFT JOIN users u ON f.driver_user_id = u.user_id
      LEFT JOIN alarms a ON f.current_alarm_id = a.alarm_id
      WHERE 1=1
    `;

    const params = [];

    if (truck_id) {
      query += ' AND f.truck_id = ?';
      params.push(truck_id);
    }

    if (station_id) {
      query += ' AND f.station_id = ?';
      params.push(station_id);
    }

    if (active_only === 'true') {
      query += ' AND f.status = "on_mission" AND f.current_alarm_id IS NOT NULL';
    }

    // Only show trucks with valid coordinates and recently online
    query += ' AND f.is_active = 1 AND f.current_latitude IS NOT NULL AND f.current_longitude IS NOT NULL AND f.last_online >= DATE_SUB(NOW(), INTERVAL 3 MINUTE)';

    query += ' ORDER BY f.last_online DESC';

    if (limit) {
      query += ' LIMIT ?';
      params.push(parseInt(limit) || 50);
    }

    const [trucks] = await connection.query(query, params);
    connection.release();

    // Format response
    const response = {
      success: true,
      timestamp: new Date().toISOString(),
      data: trucks.map(truck => ({
        ...truck,
        last_update_ago: `${Math.round((Date.now() - new Date(truck.last_online).getTime()) / 60000)} minutes ago`
      }))
    };

    res.json(response);
  } catch (error) {
    console.error('Get firetruck locations error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve locations: ' + error.message
    });
  }
});

// POST /api/set_firetruck_active.php - Set firetruck active/inactive status
router.post('/set_firetruck_active.php', async (req, res) => {
  try {
    const { truck_id, is_active } = req.body;

    if (!truck_id || is_active === undefined) {
      return res.status(400).json({
        success: false,
        error: 'truck_id and is_active are required'
      });
    }

    const connection = await pool.getConnection();

    try {
      const status = is_active ? 'available' : 'offline';
      await connection.query(
        'UPDATE firetrucks SET is_active = ?, status = ?, last_online = NOW() WHERE truck_id = ?',
        [is_active ? 1 : 0, status, truck_id]
      );

      connection.release();

      res.json({
        success: true,
        message: `Firetruck ${is_active ? 'activated' : 'deactivated'} successfully`,
        truck_id: truck_id,
        is_active: is_active
      });
    } catch (error) {
      connection.release();
      throw error;
    }
  } catch (error) {
    console.error('Set firetruck active error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update firetruck status: ' + error.message
    });
  }
});

export default router;
