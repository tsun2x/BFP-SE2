import express from 'express';
import bcrypt from 'bcrypt';
import { supabase } from '../supabaseClient.js';

const router = express.Router();

/**
 * COMPATIBILITY ROUTES
 * These endpoints maintain backward compatibility with old PHP API endpoints
 * so mobile apps don't need code changes after migration.
 */

// ============================================================
// MOBILE APP ENDPOINTS - Compatibility Layer (OLD PHP Paths)
// ============================================================

// POST /api/register_start.php — legacy path, delegates to /enduser/register (mark2)
router.post('/register_start.php', async (req, res) => {
  try {
    console.log('[register_start.php] Body:', req.body);
    req.url = '/enduser/register';
    return router.handle(req, res);
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ success: false, error: 'Registration failed: ' + error.message });
  }
});

// POST /api/enduser/register — full mobile registration (mark2)
// Accepts: phone_number OR phone, optional middle_name, gmail/email, password
// Updates existing user if already registered instead of erroring
router.post('/enduser/register', async (req, res) => {
  try {
    console.log('[enduser/register] Body:', req.body);
    const {
      phone_number,
      phone,
      first_name,
      last_name,
      middle_name,
      email,
      gmail,
      password
    } = req.body;

    const phoneValue = phone_number || phone;

    if (!phoneValue) {
      return res.status(400).json({ success: false, error: 'Phone number is required' });
    }

    const { data: existingUser, error: existingErr } = await supabase
      .from('users')
      .select('user_id')
      .eq('phone_number', phoneValue)
      .limit(1);

    if (existingErr) throw existingErr;

    const fullName = `${first_name || 'User'} ${last_name || ''}`.trim();

    if (existingUser && existingUser.length > 0) {
      const userId = existingUser[0].user_id;
      const { error: updateErr } = await supabase
        .from('users')
        .update({
          first_name: first_name || 'User',
          last_name: last_name || '',
          middle_name: middle_name || null,
          full_name: fullName,
          email: gmail || email || null
        })
        .eq('user_id', userId);

      if (updateErr) throw updateErr;

      return res.status(200).json({ success: true, message: 'User already registered', user_id: userId });
    }

    const { data: result, error: insertErr } = await supabase
      .from('users')
      .insert([{
        first_name: first_name || 'User',
        last_name: last_name || '',
        middle_name: middle_name || null,
        full_name: fullName,
        phone_number: phoneValue,
        id_number: phoneValue,
        password: password ? await bcrypt.hash(password, 10) : 'temp_' + Date.now(),
        role: 'end_user',
        email: gmail || email || `mobile_${Date.now()}@bfp.gov`
      }])
      .select('user_id')
      .single();

    if (insertErr) throw insertErr;

    res.status(201).json({ success: true, message: 'User registered successfully', user_id: result.user_id });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ success: false, error: 'Registration failed: ' + error.message });
  }
});

// POST /api/verify_phone_otp.php — OTP verification (mark2)
// Accepts: phone_number OR phone, otp OR code, OR user_id
router.post('/verify_phone_otp.php', async (req, res) => {
  try {
    const { phone_number, phone, otp, code, user_id } = req.body;

    const phoneValue = phone_number || phone;
    const otpValue = otp || code;

    if ((!phoneValue && !user_id) || !otpValue) {
      return res.status(400).json({ success: false, error: 'Phone/user and OTP are required' });
    }

    let query = supabase.from('users').select('user_id, full_name');
    if (user_id) {
      query = query.eq('user_id', user_id);
    } else {
      query = query.eq('phone_number', phoneValue).limit(1);
    }

    const { data: user, error: userErr } = await query;
    if (userErr) throw userErr;

    const record = Array.isArray(user) ? user[0] : user;
    if (!record) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    // Stub: accept any OTP >= 4 chars (replace with real OTP logic in production)
    if (String(otpValue).length < 4) {
      return res.status(400).json({ success: false, error: 'Invalid OTP' });
    }

    res.json({ success: true, message: 'OTP verified successfully', user_id: record.user_id, full_name: record.full_name });
  } catch (error) {
    console.error('OTP verification error:', error);
    res.status(500).json({ success: false, error: 'OTP verification failed: ' + error.message });
  }
});

// POST /api/enduser/verify-otp — second OTP path used by mobile app (mark2)
router.post('/enduser/verify-otp', async (req, res) => {
  try {
    const { phone_number, phone, otp, code, user_id } = req.body;

    const phoneValue = phone_number || phone;
    const otpValue = otp || code;

    if ((!phoneValue && !user_id) || !otpValue) {
      return res.status(400).json({ success: false, error: 'Phone/user and OTP are required' });
    }

    let query = supabase.from('users').select('user_id, full_name');
    if (user_id) {
      query = query.eq('user_id', user_id);
    } else {
      query = query.eq('phone_number', phoneValue).limit(1);
    }

    const { data: user, error: userErr } = await query;
    if (userErr) throw userErr;

    const record = Array.isArray(user) ? user[0] : user;
    if (!record) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    if (String(otpValue).length < 4) {
      return res.status(400).json({ success: false, error: 'Invalid OTP' });
    }

    res.json({ success: true, message: 'OTP verified successfully', user_id: record.user_id, full_name: record.full_name });
  } catch (error) {
    console.error('OTP verification error:', error);
    res.status(500).json({ success: false, error: 'OTP verification failed: ' + error.message });
  }
});

// POST /api/login.php — compatibility login for mobile app (mark2)
// Looks up by id_number OR phone_number, checks bcrypt password
router.post('/login.php', async (req, res) => {
  try {
    const { idNumber, password } = req.body;

    if (!idNumber || !password) {
      return res.status(400).json({ success: false, error: 'ID Number and password are required' });
    }

    const { data: user, error: userErr } = await supabase
      .from('users')
      .select('*')
      .or(`id_number.eq.${idNumber},phone_number.eq.${idNumber}`)
      .limit(1);

    if (userErr) throw userErr;

    if (!user || user.length === 0) {
      return res.status(401).json({ success: false, error: 'Invalid ID Number or password' });
    }

    const record = user[0];

    let passwordMatch = false;
    try {
      passwordMatch = await bcrypt.compare(password, record.password);
    } catch (e) {
      // ignore bcrypt error
    }
    if (!passwordMatch && password === record.password) {
      passwordMatch = true;
    }

    if (!passwordMatch) {
      return res.status(401).json({ success: false, error: 'Invalid ID Number or password' });
    }

    return res.json({ success: true, message: 'Login successful', user: record });
  } catch (error) {
    console.error('Compatibility login error:', error);
    res.status(500).json({ success: false, error: 'Login failed: ' + error.message });
  }
});

// POST /api/update_firetruck_location.php — update firetruck real-time location
router.post('/update_firetruck_location.php', async (req, res) => {
  try {
    const { truck_id, latitude, longitude, battery_level, alarm_id } = req.body;

    if (!truck_id || latitude === undefined || longitude === undefined) {
      return res.status(400).json({ success: false, error: 'truck_id, latitude, and longitude are required' });
    }

    const { error: updateErr } = await supabase
      .from('_firetrucks')
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
    console.error('Update firetruck location error:', error);
    res.status(500).json({ success: false, error: 'Failed to update location: ' + error.message });
  }
});

// GET /api/get_firetruck_locations.php — get active firetruck locations
router.get('/get_firetruck_locations.php', async (req, res) => {
  try {
    const { truck_id, station_id, active_only, limit } = req.query;

    let query = supabase
      .from('_firetrucks')
      .select('truck_id,model,current_latitude,current_longitude,last_location_update,last_online,battery_level,status,current_alarm_id,station_id');

    if (truck_id) query = query.eq('truck_id', truck_id);
    if (station_id) query = query.eq('station_id', station_id);
    if (active_only === 'true') {
      query = query.eq('status', 'on_mission').not('current_alarm_id', 'is', null);
      const threeMinAgo = new Date(Date.now() - 3 * 60000).toISOString();
      query = query.gte('last_online', threeMinAgo);
    }
    if (limit) query = query.limit(parseInt(limit) || 50);
    query = query.order('last_online', { ascending: false });

    const { data: trucks, error: trucksErr } = await query;
    if (trucksErr) throw trucksErr;

    const enhanced = await Promise.all((trucks || []).map(async (truck) => {
      let stationName = 'Unknown Station';
      let alarmData = null;

      if (truck.station_id) {
        const { data: station } = await supabase
          .from('fire_stations')
          .select('station_name,contact_number')
          .eq('station_id', truck.station_id)
          .single();
        if (station) stationName = station.station_name;
      }

      if (truck.current_alarm_id) {
        const { data: alarm } = await supabase
          .from('_alarms')
          .select('status,user_latitude,user_longitude,initial_alarm_level,current_alarm_level')
          .eq('alarm_id', truck.current_alarm_id)
          .single();
        if (alarm) alarmData = alarm;
      }

      return {
        ...truck,
        station_name: stationName,
        alarm: alarmData,
        last_update_ago: truck.last_online
          ? `${Math.round((Date.now() - new Date(truck.last_online).getTime()) / 60000)} minutes ago`
          : null
      };
    }));

    res.json({ success: true, timestamp: new Date().toISOString(), data: enhanced });
  } catch (error) {
    console.error('Get firetruck locations error:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve locations: ' + error.message });
  }
});

// POST /api/set_firetruck_active.php — set firetruck active/inactive status
router.post('/set_firetruck_active.php', async (req, res) => {
  try {
    const { truck_id, is_active } = req.body;

    if (!truck_id || is_active === undefined) {
      return res.status(400).json({ success: false, error: 'truck_id and is_active are required' });
    }

    const status = is_active ? 'available' : 'offline';
    const { error: updateErr } = await supabase
      .from('_firetrucks')
      .update({ is_active: is_active ? 1 : 0, status, last_online: new Date().toISOString() })
      .eq('truck_id', truck_id);

    if (updateErr) throw updateErr;

    res.json({ success: true, message: `Firetruck ${is_active ? 'activated' : 'deactivated'} successfully`, truck_id, is_active });
  } catch (error) {
    console.error('Set firetruck active error:', error);
    res.status(500).json({ success: false, error: 'Failed to update firetruck status: ' + error.message });
  }
});

export default router;
