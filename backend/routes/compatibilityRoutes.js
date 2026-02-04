import express from 'express';
import { supabase } from '../supabaseClient.js';

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

    // Check if user already exists
    const { data: existingUser, error: existingErr } = await supabase
      .from('users')
      .select('user_id')
      .eq('phone_number', phone_number)
      .limit(1);

    if (existingErr) throw existingErr;

    if (existingUser && existingUser.length > 0) {
      return res.status(200).json({
        success: true,
        message: 'User already registered',
        user_id: existingUser[0].user_id
      });
    }

    const fullName = `${first_name || 'User'} ${last_name || ''}`.trim();
    const { data: result, error: insertErr } = await supabase
      .from('users')
      .insert([
        {
          first_name: first_name || 'User',
          last_name: last_name || '',
          full_name: fullName,
          phone_number,
          password: 'temp_' + Date.now(),
          role: 'end_user',
          email: `mobile_${Date.now()}@bfp.gov`
        }
      ])
      .select('user_id')
      .single();

    if (insertErr) throw insertErr;

    res.status(201).json({ success: true, message: 'User registered successfully', user_id: result.user_id });
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

    const { data: user, error: userErr } = await supabase
      .from('users')
      .select('user_id, full_name')
      .eq('phone_number', phone_number)
      .limit(1);

    if (userErr) throw userErr;

    if (!user || user.length === 0) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    res.json({ success: true, message: 'OTP verified successfully', user_id: user[0].user_id, full_name: user[0].full_name });
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

    try {
      const { error: updateErr } = await supabase
        .from('firetrucks')
        .update({
          current_latitude: latitude,
          current_longitude: longitude,
          last_online: new Date().toISOString(),
          battery_level: battery_level || null,
          last_location_update: new Date().toISOString(),
          current_alarm_id: alarm_id || null,
          is_active: 1,
          status: alarm_id ? 'on_mission' : 'available'
        })
        .eq('truck_id', truck_id);

      if (updateErr) throw updateErr;

      res.json({ success: true, message: 'Location updated successfully', truck_id, updated_at: new Date().toISOString() });
    } catch (error) {
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

    // Build Supabase query with filters
    try {
      let query = supabase.from('firetrucks').select('truck_id,plate_number,model,current_latitude,current_longitude,last_location_update,last_online,battery_level,status,current_alarm_id,station_id,fire_stations(station_name,contact_number),alarms(status,user_latitude,user_longitude,initial_alarm_level,current_alarm_level),users(full_name,phone_number)');

      if (truck_id) query = query.eq('truck_id', truck_id);
      if (station_id) query = query.eq('station_id', station_id);
      if (active_only === 'true') query = query.eq('status', 'on_mission').not('current_alarm_id', 'is', null);

      // show trucks active recently (last 3 minutes)
      if (active_only === 'true') {
        const threeMinAgo = new Date(Date.now() - 3 * 60000).toISOString();
        query = query.gte('last_online', threeMinAgo);
      }

      if (limit) query = query.limit(parseInt(limit) || 50);

      query = query.order('last_online', { ascending: false });

      const { data: trucks, error: trucksErr } = await query;

      if (trucksErr) throw trucksErr;

      const response = {
        success: true,
        timestamp: new Date().toISOString(),
        data: (trucks || []).map(truck => ({
          ...truck,
          last_update_ago: truck.last_online ? `${Math.round((Date.now() - new Date(truck.last_online).getTime()) / 60000)} minutes ago` : null
        }))
      };

      res.json(response);
    } catch (error) {
      throw error;
    }
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

    try {
      const status = is_active ? 'available' : 'offline';
      const { error: updateErr } = await supabase
        .from('firetrucks')
        .update({ is_active: is_active ? 1 : 0, status, last_online: new Date().toISOString() })
        .eq('truck_id', truck_id);

      if (updateErr) throw updateErr;

      res.json({ success: true, message: `Firetruck ${is_active ? 'activated' : 'deactivated'} successfully`, truck_id, is_active });
    } catch (error) {
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
