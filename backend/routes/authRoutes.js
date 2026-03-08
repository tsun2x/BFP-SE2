import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import { supabase } from '../supabaseClient.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key';

// POST /api/verify-password
router.post('/verify-password', authenticateToken, async (req, res) => {
  const { password } = req.body;
  if (!password) return res.status(400).json({ success: false, message: 'Password required' });

  // Fetch user by ID from token
  const { id } = req.user;
  const { data: user, error } = await supabase
    .from('users')
    .select('password') // adjust if your password field is named differently
    .eq('user_id', id)
    .single();

  if (error || !user) return res.status(401).json({ success: false, message: 'User not found' });

  // Use bcrypt to compare
  const match = await bcrypt.compare(password, user.password);
  if (!match) return res.status(401).json({ success: false, message: 'Incorrect password' });

  return res.json({ success: true });
});

// Login endpoint
router.post('/login', async (req, res) => {
  try {
    const { idNumber, password } = req.body;

    if (!idNumber || !password) {
      return res.status(400).json({
        message: 'ID Number and password are required'
      });
    }

    console.log('[POST /login] Attempt login for idNumber:', idNumber);

    // Query users table in Supabase — try id_number first, then phone_number
    // (phone_number fallback needed for mobile end-users/civilians — from mark2/main branch)
    let user = null;
    const { data: rowsById, error: errById } = await supabase
      .from('users')
      .select('*')
      .eq('id_number', idNumber)
      .single();

    if (!errById && rowsById) {
      user = rowsById;
    } else {
      const { data: rowsByPhone, error: errByPhone } = await supabase
        .from('users')
        .select('*')
        .eq('phone_number', idNumber)
        .single();

      if (!errByPhone && rowsByPhone) {
        user = rowsByPhone;
      }
    }

    if (!user) {
      console.log('[POST /login] No user found for idNumber/phone:', idNumber);
      return res.status(401).json({ message: 'No account found with this ID Number. Please check your BFP badge number.' });
    }
    console.log('[POST /login] Found user id:', user.user_id, 'role:', user.role, 'assigned_station_id:', user.assigned_station_id);

    // Compare password
    let passwordMatch = false;
    try {
      passwordMatch = await bcrypt.compare(password, user.password);
    } catch (err) {
      console.error('[POST /login] bcrypt error:', err.message);
      if (password === user.password) {
        passwordMatch = true;
      }
    }

    if (!passwordMatch) {
      return res.status(401).json({ message: 'Incorrect password. Please try again.' });
    }

    // Insert officer login history after successful login
    if (user.user_id && user.assigned_station_id) {
      const loginHistoryRecord = {
        user_id: user.user_id,
        station_id: user.assigned_station_id,
        login_time: new Date().toISOString(),
        status: 'Online'
      };
      console.log('[POST /login] Inserting login history:', loginHistoryRecord);
      const { error: loginHistoryError } = await supabase
        .from('officer_login_history')
        .insert([loginHistoryRecord]);
      if (loginHistoryError) {
        console.error('[POST /login] officer_login_history insert error:', loginHistoryError.message);
      }
    }

    // Generate JWT token (include role)
    const token = jwt.sign(
      { 
        id: user.user_id,
        idNumber: user.id_number,
        name: `${user.first_name} ${user.last_name}`,
        substation: user.substation,
        assignedStationId: user.assigned_station_id,
        role: user.role
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Fetch station info if user is assigned to a station
    let stationInfo = null;
    if (user.assigned_station_id) {
      const { data: stations } = await supabase
        .from('fire_stations')
        .select('*')
        .eq('station_id', user.assigned_station_id)
        .single();
      stationInfo = stations || null;
    }

    res.json({
      token,
      user: {
        id: user.user_id,
        idNumber: user.id_number,
        name: `${user.first_name} ${user.last_name}`,
        firstName: user.first_name,
        lastName: user.last_name,
        rank: user.rank,
        substation: user.substation,
        assignedStationId: user.assigned_station_id,
        stationInfo: stationInfo,
        role: user.role,
        assigned: !!user.assigned_station_id
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      message: 'Login failed',
      error: error.message
    });
  }
});

router.post('/substation-login', async (req, res) => {
  try {
    const { idNumber, password } = req.body;

    if (!idNumber || !password) {
      return res.status(400).json({
        message: 'ID Number and password are required'
      });
    }

    console.log('[POST /substation-login] Attempt login for idNumber:', idNumber);

    const { data: rows, error } = await supabase
      .from('users')
      .select('*')
      .eq('id_number', idNumber)
      .single();

    if (error) {
      console.error('[POST /substation-login] Supabase error:', error);
      return res.status(500).json({ message: 'Database error', error: error.message });
    }

    if (!rows) {
      console.log('[POST /substation-login] No user found for idNumber:', idNumber);
      return res.status(401).json({ message: 'No account found with this ID Number. Please check your BFP badge number.' });
    }

    const user = rows;

    if (String(user.role || '').toLowerCase() === 'admin') {
      return res.status(403).json({ message: 'Admin accounts cannot login to the Substation app. Please use the Main Admin portal.' });
    }

    let passwordMatch = false;
    try {
      passwordMatch = await bcrypt.compare(password, user.password);
    } catch (err) {
      console.error('[POST /substation-login] bcrypt error:', err.message);
      if (password === user.password) {
        passwordMatch = true;
      }
    }

    if (!passwordMatch) {
      return res.status(401).json({ message: 'Incorrect password. Please try again.' });
    }

    if (user.user_id && user.assigned_station_id) {
      const loginHistoryRecord = {
        user_id: user.user_id,
        station_id: user.assigned_station_id,
        login_time: new Date().toISOString(),
        status: 'Online'
      };
      console.log('[POST /substation-login] Inserting login history:', loginHistoryRecord);
      const { error: loginHistoryError } = await supabase
        .from('officer_login_history')
        .insert([loginHistoryRecord]);
      if (loginHistoryError) {
        console.error('[POST /substation-login] officer_login_history insert error:', loginHistoryError.message);
      }
    }

    const token = jwt.sign(
      {
        id: user.user_id,
        idNumber: user.id_number,
        name: `${user.first_name} ${user.last_name}`,
        substation: user.substation,
        assignedStationId: user.assigned_station_id,
        role: user.role
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    let stationInfo = null;
    if (user.assigned_station_id) {
      const { data: stations } = await supabase
        .from('fire_stations')
        .select('*')
        .eq('station_id', user.assigned_station_id)
        .single();
      stationInfo = stations || null;
    }

    return res.json({
      token,
      user: {
        id: user.user_id,
        idNumber: user.id_number,
        name: `${user.first_name} ${user.last_name}`,
        firstName: user.first_name,
        lastName: user.last_name,
        rank: user.rank,
        substation: user.substation,
        assignedStationId: user.assigned_station_id,
        stationInfo: stationInfo,
        role: user.role,
        assigned: !!user.assigned_station_id
      }
    });
  } catch (error) {
    console.error('Substation login error:', error);
    return res.status(500).json({
      message: 'Login failed',
      error: error.message
    });
  }
});

// Logout endpoint (records logout time in officer_login_history)
router.post('/logout', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(400).json({ message: 'Invalid token payload (missing user id)' });
    }

    console.log('[POST /logout] Request received for userId:', userId);

    const { data: rows, error } = await supabase
      .from('officer_login_history')
      .select('id')
      .eq('user_id', userId)
      .is('logout_time', null)
      .order('login_time', { ascending: false })
      .limit(1);

    if (error) {
      console.error('[POST /logout] officer_login_history select error:', error);
      return res.status(500).json({ message: 'Database error', error: error.message });
    }

    const latest = rows?.[0];
    if (!latest?.id) {
      console.log('[POST /logout] No active session row found for userId:', userId);
      return res.json({ success: true, message: 'No active login session found' });
    }

    console.log('[POST /logout] Updating officer_login_history id:', latest.id);

    const { error: updateError } = await supabase
      .from('officer_login_history')
      .update({ logout_time: new Date().toISOString(), status: 'Offline' })
      .eq('id', latest.id);

    if (updateError) {
      console.error('[POST /logout] officer_login_history update error:', updateError);
      return res.status(500).json({ message: 'Failed to record logout', error: updateError.message });
    }

    return res.json({ success: true });
  } catch (e) {
    console.error('Logout error:', e);
    return res.status(500).json({ message: 'Logout failed', error: e.message });
  }
});

// Update current user's profile
router.put('/me', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(400).json({ message: 'Invalid token payload (missing user id)' });
    }

    const { firstName, middleName, lastName, rank, phoneNumber, email } = req.body || {};

    const updates = {};
    if (typeof firstName === 'string') updates.first_name = firstName.trim();
    if (typeof middleName === 'string') updates.middle_name = middleName.trim();
    if (typeof lastName === 'string') updates.last_name = lastName.trim();
    if (typeof rank === 'string') updates.rank = rank.trim();
    if (typeof phoneNumber === 'string') updates.phone_number = phoneNumber.trim();
    if (typeof email === 'string') updates.email = email.trim();

    if (updates.first_name || updates.middle_name || updates.last_name) {
      const fn = updates.first_name ?? null;
      const mn = updates.middle_name ?? null;
      const ln = updates.last_name ?? null;
      if (fn !== null || ln !== null) {
        const { data: existingUser, error: existingError } = await supabase
          .from('users')
          .select('first_name, middle_name, last_name')
          .eq('user_id', userId)
          .single();

        if (existingError) {
          console.error('[PUT /me] Failed to fetch existing user:', existingError);
          return res.status(500).json({ message: 'Failed to update profile', error: existingError.message });
        }

        const nextFirst = (updates.first_name ?? existingUser?.first_name ?? '').trim();
        const nextMiddle = (updates.middle_name ?? existingUser?.middle_name ?? '').trim();
        const nextLast = (updates.last_name ?? existingUser?.last_name ?? '').trim();
        updates.full_name = `${nextFirst}${nextMiddle ? ' ' + nextMiddle : ''} ${nextLast}`.trim();
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: 'No valid fields to update' });
    }

    const { error: updateError } = await supabase
      .from('users')
      .update(updates)
      .eq('user_id', userId);

    if (updateError) {
      console.error('[PUT /me] Supabase update error:', updateError);
      return res.status(500).json({ message: 'Failed to update profile', error: updateError.message });
    }

    const { data: user, error: fetchError } = await supabase
      .from('users')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (fetchError) {
      console.error('[PUT /me] Supabase fetch error:', fetchError);
      return res.status(500).json({ message: 'Failed to fetch updated profile', error: fetchError.message });
    }

    let stationInfo = null;
    if (user?.assigned_station_id) {
      const { data: stations } = await supabase
        .from('fire_stations')
        .select('*')
        .eq('station_id', user.assigned_station_id)
        .single();
      stationInfo = stations || null;
    }

    return res.json({
      success: true,
      user: {
        id: user.user_id,
        idNumber: user.id_number,
        name: `${user.first_name} ${user.last_name}`,
        firstName: user.first_name,
        lastName: user.last_name,
        rank: user.rank,
        substation: user.substation,
        assignedStationId: user.assigned_station_id,
        stationInfo,
        role: user.role,
        assigned: !!user.assigned_station_id,
      },
    });
  } catch (e) {
    console.error('[PUT /me] Exception:', e);
    return res.status(500).json({ message: 'Failed to update profile', error: e.message });
  }
});

// Change current user's password
router.post('/change-password', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(400).json({ message: 'Invalid token payload (missing user id)' });
    }

    const { currentPassword, newPassword } = req.body || {};
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'currentPassword and newPassword are required' });
    }

    const { data: user, error: fetchError } = await supabase
      .from('users')
      .select('user_id, password')
      .eq('user_id', userId)
      .single();

    if (fetchError) {
      console.error('[POST /change-password] Supabase fetch error:', fetchError);
      return res.status(500).json({ message: 'Failed to change password', error: fetchError.message });
    }

    let passwordMatch = false;
    try {
      passwordMatch = await bcrypt.compare(String(currentPassword), String(user.password));
    } catch (err) {
      if (String(currentPassword) === String(user.password)) {
        passwordMatch = true;
      }
    }

    if (!passwordMatch) {
      return res.status(401).json({ message: 'Current password is incorrect' });
    }

    const hashedPassword = await bcrypt.hash(String(newPassword), 10);
    const { error: updateError } = await supabase
      .from('users')
      .update({ password: hashedPassword })
      .eq('user_id', userId);

    if (updateError) {
      console.error('[POST /change-password] Supabase update error:', updateError);
      return res.status(500).json({ message: 'Failed to change password', error: updateError.message });
    }

    return res.json({ success: true });
  } catch (e) {
    console.error('[POST /change-password] Exception:', e);
    return res.status(500).json({ message: 'Failed to change password', error: e.message });
  }
});

// Officer login history (admin = all, others = own station)
router.get('/officer-login-history', authenticateToken, async (req, res) => {
  try {
    const role = String(req.user?.role || '').toLowerCase();
    const isAdmin = role === 'admin';
    const stationId = req.user?.assignedStationId || null;

    let query = supabase
      .from('officer_login_history')
      .select(
        `id, station_id, login_time, logout_time, status, user_id, users: user_id (full_name, rank), fire_stations: station_id (station_name)`
      )
      .order('login_time', { ascending: false });

    if (!isAdmin) {
      if (!stationId) {
        return res.status(400).json({ success: false, message: 'User has no assigned station' });
      }
      query = query.eq('station_id', stationId);
    }

    const { data, error } = await query;
    if (error) {
      console.error('GET /officer-login-history error:', error);
      return res.status(500).json({ success: false, message: 'Failed to fetch login history', error: error.message });
    }

    return res.json({ success: true, data: data || [] });
  } catch (e) {
    console.error('GET /officer-login-history exception:', e);
    return res.status(500).json({ success: false, message: 'Failed to fetch login history', error: e.message });
  }
});

// Send Email OTP endpoint
router.post('/send-email-otp', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: 'Invalid email format' });
    }

    // Check if email is already used by a fully registered user (has id_number)
    const { data: existingUser } = await supabase
      .from('users')
      .select('user_id')
      .eq('email', email)
      .not('id_number', 'is', null)
      .single();

    if (existingUser) {
      return res.status(400).json({ message: 'Email is already registered' });
    }

    // Send OTP via Supabase Auth
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true, // creates a Supabase Auth user if not exists
      }
    });

    if (error) {
      console.error('[POST /send-email-otp] Supabase error:', error);
      return res.status(500).json({ message: 'Failed to send OTP', error: error.message });
    }

    console.log('[POST /send-email-otp] OTP sent to:', email);
    res.json({ success: true, message: 'OTP sent to your email' });
  } catch (error) {
    console.error('Send OTP error:', error);
    res.status(500).json({ message: 'Failed to send OTP', error: error.message });
  }
});

// Verify Email OTP endpoint
router.post('/verify-email-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ message: 'Email and OTP are required' });
    }

    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token: otp,
      type: 'email'
    });

    if (error) {
      console.error('[POST /verify-email-otp] Verification error:', error);
      return res.status(400).json({ message: 'Invalid or expired OTP', error: error.message });
    }

    console.log('[POST /verify-email-otp] OTP verified for:', email);
    res.json({ success: true, message: 'Email verified successfully' });
  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({ message: 'OTP verification failed', error: error.message });
  }
});

// Signup endpoint
router.post('/signup', async (req, res) => {
  try {
    const { firstName, lastName, idNumber, rank, password } = req.body;

    // Validate input
    if (!firstName || !lastName || !idNumber || !rank || !password) {
      return res.status(400).json({
        message: 'All fields are required'
      });
    }

    // Check if user already exists by ID number
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('user_id')
      .eq('id_number', idNumber)
      .single();

    if (existingUser) {
      return res.status(400).json({
        message: 'User with this ID already exists'
      });
    }

    // Check if email is already taken by a fully registered user
    if (req.body.email) {
      const { data: existingEmail } = await supabase
        .from('users')
        .select('user_id')
        .eq('email', req.body.email)
        .not('id_number', 'is', null)
        .single();

      if (existingEmail) {
        return res.status(400).json({
          message: 'A user with this email already exists'
        });
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create full name and a placeholder phone number (DB requires phone_number NOT NULL)
    const fullName = `${firstName} ${lastName}`.trim();
    const placeholderPhone = `signup_${randomUUID().substring(0, 12)}`; // unique placeholder to satisfy NOT NULL + unique constraints
    
    // Determine role based on optional role or stationType provided
    // Default to 'end_user' when not specified
    let role = 'end_user';
    if (req.body.role === 'admin' || req.body.stationType === 'Main') {
      role = 'admin';
    } else if (req.body.role === 'substation_admin' || req.body.stationType === 'Substation') {
      role = 'substation_admin';
    } else if (req.body.role === 'driver') {
      role = 'driver';
    }

    // Insert new user (include assigned_station_id if provided)
    const assignedStationId = req.body.assignedStationId || null;

    if (assignedStationId) {
      const { data: stationRow, error: stationErr } = await supabase
        .from('fire_stations')
        .select('station_id, station_type')
        .eq('station_id', assignedStationId)
        .single();

      if (stationErr) {
        return res.status(400).json({
          message: 'Invalid assigned station',
          error: stationErr.message,
        });
      }

      const stationType = String(stationRow?.station_type || '').toLowerCase();
      const roleLower = String(role || '').toLowerCase();

      // Enforce: substation roles cannot be assigned to Main
      if ((roleLower === 'substation_admin' || roleLower === 'driver') && stationType === 'main') {
        return res.status(400).json({
          message: 'Substation users cannot be assigned to the Main station'
        });
      }

      // Enforce: admin (Main) accounts cannot be assigned to Substation
      if (roleLower === 'admin' && stationType === 'substation') {
        return res.status(400).json({
          message: 'Main station users cannot be assigned to a Substation'
        });
      }
    }
    // Look up Supabase Auth UUID if email was verified via OTP
    let authId = null;
    if (req.body.email) {
      const { data: authData } = await supabase.auth.admin.listUsers();
      const authUser = authData?.users?.find(u => u.email === req.body.email);
      if (authUser) {
        authId = authUser.id;
      }
    }

    // Check if a user row was auto-created by a DB trigger when OTP was sent
    // If so, UPDATE that row instead of inserting a new one
    let newUser, insertError;
    if (authId) {
      const { data: existingAuthRow } = await supabase
        .from('users')
        .select('user_id')
        .eq('auth_id', authId)
        .single();

      if (existingAuthRow) {
        // Update the auto-created row with the actual signup data
        const { data, error } = await supabase
          .from('users')
          .update({
            first_name: firstName,
            middle_name: req.body.middleName || null,
            last_name: lastName,
            id_number: idNumber,
            rank: rank,
            substation: req.body.substation || null,
            full_name: fullName,
            phone_number: placeholderPhone,
            password: hashedPassword,
            role: role,
            assigned_station_id: assignedStationId,
            email: req.body.email || null
          })
          .eq('auth_id', authId)
          .select();
        newUser = data;
        insertError = error;
      } else {
        // No auto-created row, insert normally
        const { data, error } = await supabase
          .from('users')
          .insert([{
            first_name: firstName,
            middle_name: req.body.middleName || null,
            last_name: lastName,
            id_number: idNumber,
            rank: rank,
            substation: req.body.substation || null,
            full_name: fullName,
            phone_number: placeholderPhone,
            password: hashedPassword,
            role: role,
            assigned_station_id: assignedStationId,
            email: req.body.email || null,
            auth_id: authId
          }])
          .select();
        newUser = data;
        insertError = error;
      }
    } else {
      // No auth_id (no email OTP), insert normally
      const { data, error } = await supabase
        .from('users')
        .insert([{
          first_name: firstName,
          middle_name: req.body.middleName || null,
          last_name: lastName,
          id_number: idNumber,
          rank: rank,
          substation: req.body.substation || null,
          full_name: fullName,
          phone_number: placeholderPhone,
          password: hashedPassword,
          role: role,
          assigned_station_id: assignedStationId,
          email: req.body.email || null,
          auth_id: authId
        }])
        .select();
      newUser = data;
      insertError = error;
    }

    if (insertError) {
      return res.status(500).json({
        message: 'Failed to register user',
        error: insertError.message
      });
    }

    res.status(201).json({
      message: 'User registered successfully. Please login.'
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({
      message: 'Registration failed',
      error: error.message
    });
  }
});

// Signup endpoint for fire stations (Main or Substation)
// Body: { firstName, lastName, idNumber, rank, password, stationName, latitude, longitude, contactNumber, stationType }
// stationType should be 'Main' or 'Substation' (enforce at frontend)
router.post('/signup-station', async (req, res) => {
  try {
    const { firstName, lastName, idNumber, rank, password, stationName, latitude, longitude, contactNumber, stationType } = req.body;

    // Validate required fields
    if (!firstName || !lastName || !idNumber || !rank || !password || !stationName || latitude === undefined || longitude === undefined || !stationType) {
      return res.status(400).json({
        message: 'All fields are required: firstName, lastName, idNumber, rank, password, stationName, latitude, longitude, stationType'
      });
    }

    // Validate latitude and longitude are numbers
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    if (isNaN(lat) || isNaN(lng)) {
      return res.status(400).json({
        message: 'Latitude and longitude must be valid numbers'
      });
    }

    // Check if user already exists
    const { data: existingUser, error: existingErr } = await supabase
      .from('users')
      .select('user_id')
      .eq('id_number', idNumber)
      .limit(1);

    if (existingErr) throw existingErr;

    if (existingUser && existingUser.length > 0) {
      return res.status(400).json({ message: 'User with this ID already exists' });
    }

    // Validate: if stationType='Main', check if Main already exists
    if (stationType === 'Main') {
      const { data: mainStations, count, error: mainErr } = await supabase
        .from('fire_stations')
        .select('station_id', { count: 'exact' })
        .limit(1);

      if (mainErr) throw mainErr;

      const mainCount = typeof count === 'number' ? count : (mainStations || []).length;
      if (mainCount > 0) {
        const authHeader = req.headers['authorization'];
        let caller = null;
        if (!authHeader) {
          return res.status(403).json({ message: 'Only admin can create additional stations' });
        }
        try {
          const token = authHeader.split(' ')[1];
          caller = jwt.verify(token, JWT_SECRET);
        } catch (err) {
          return res.status(403).json({ message: 'Invalid auth token' });
        }
        if (!caller || caller.role !== 'admin') {
          return res.status(403).json({ message: 'Only admin can create stations' });
        }
      }
    } else {
      // For non-Main station creation, require authenticated admin
      const authHeader = req.headers['authorization'];
      if (!authHeader) {
        return res.status(403).json({ message: 'Only admin can create stations' });
      }
      try {
        const token = authHeader.split(' ')[1];
        const caller = jwt.verify(token, JWT_SECRET);
        if (!caller || caller.role !== 'admin') {
          return res.status(403).json({ message: 'Only admin can create stations' });
        }
      } catch (err) {
        return res.status(403).json({ message: 'Invalid auth token' });
      }
    }

    // Insert station then user; if user insert fails, delete station to rollback
    const { data: stationResult, error: stationErr } = await supabase
      .from('fire_stations')
      .insert([
        {
          station_name: stationName,
          province: 'Zamboanga',
          city: 'Zamboanga City',
          contact_number: contactNumber || null,
          latitude: lat,
          longitude: lng
        }
      ])
      .select('station_id')
      .single();

    if (stationErr) throw stationErr;

    const stationId = stationResult.station_id;

    try {
      const hashedPassword = await bcrypt.hash(password, 10);
      const fullName = `${firstName} ${lastName}`.trim();
      const placeholderPhone = `signup_${randomUUID().substring(0, 12)}`;
      let role = 'end_user';
      if (stationType === 'Main') role = 'admin';
      else if (stationType === 'Substation') role = 'substation_admin';

      const { data: userInsert, error: userErr } = await supabase
        .from('users')
        .insert([{
          first_name: firstName,
          last_name: lastName,
          id_number: idNumber,
          rank: rank,
          full_name: fullName,
          phone_number: placeholderPhone,
          password: hashedPassword,
          role: role,
          assigned_station_id: stationId
        }])
        .select('user_id')
        .single();

      if (userErr) {
        // rollback station
        await supabase.from('fire_stations').delete().eq('station_id', stationId);
        throw userErr;
      }

      res.status(201).json({ message: 'Fire station registered successfully. Please login.', stationId, stationType });
    } catch (txError) {
      // rollback station if not already
      await supabase.from('fire_stations').delete().eq('station_id', stationId);
      throw txError;
    }
  } catch (error) {
    console.error('Station signup error:', error);
    res.status(500).json({
      message: 'Station registration failed',
      error: error.message
    });
  }
});

// Update station endpoint - allows users to update their station information
// Requires authentication. Updates the fire_stations row for the user's assigned_station_id
// Body: { stationName, latitude, longitude, contactNumber }
router.put('/update-station', authenticateToken, async (req, res) => {
  try {
    const { stationName, latitude, longitude, contactNumber } = req.body;
    const userId = req.user.id;
    const assignedStationId = req.user.assignedStationId;

    // Validate that user has an assigned station
    if (!assignedStationId) {
      return res.status(400).json({
        message: 'User is not assigned to any station'
      });
    }

    // Validate required fields
    if (!stationName) {
      return res.status(400).json({
        message: 'Station name is required'
      });
    }

    // Validate coordinates if provided
    if (latitude !== undefined || longitude !== undefined) {
      if (latitude === undefined || longitude === undefined) {
        return res.status(400).json({
          message: 'Both latitude and longitude are required together'
        });
      }
      const lat = parseFloat(latitude);
      const lng = parseFloat(longitude);
      if (isNaN(lat) || isNaN(lng)) {
        return res.status(400).json({
          message: 'Latitude and longitude must be valid numbers'
        });
      }
    }

    try {
      const updates = { station_name: stationName, contact_number: contactNumber || null };
      if (latitude !== undefined && longitude !== undefined) {
        updates.latitude = parseFloat(latitude);
        updates.longitude = parseFloat(longitude);
      }

      const { data: updated, error: updateErr } = await supabase
        .from('fire_stations')
        .update(updates)
        .eq('station_id', assignedStationId)
        .select('station_id');

      if (updateErr) throw updateErr;

      if (!updated || updated.length === 0) {
        return res.status(404).json({ message: 'Station not found or no changes made' });
      }

      res.json({ message: 'Station information updated successfully', stationId: assignedStationId });
    } catch (error) {
      throw error;
    }
  } catch (error) {
    console.error('Update station error:', error);
    res.status(500).json({
      message: 'Failed to update station information',
      error: error.message
    });
  }
});

// Public: list fire stations (id and name) for assignment dropdown
router.get('/stations', async (req, res) => {
  try {
    const stationType = req.query.stationType || req.query.station_type || null;

    let query = supabase
      .from('fire_stations')
      .select('station_id, station_name, station_type')
      .order('station_name', { ascending: true });

    if (stationType) {
      query = query.eq('station_type', stationType);
    }

    const { data: rows, error } = await query;

    if (error) throw error;

    // Response shape expected by the admin frontend
    res.json({ stations: rows });
  } catch (error) {
    console.error('Get stations error:', error);
    res.status(500).json({ message: 'Failed to fetch stations', error: error.message });
  }
});

// Verify password endpoint - for sensitive operations like delete
router.post('/verify-password', authenticateToken, async (req, res) => {
  try {
    console.log('[POST /verify-password] Request received');
    console.log('[POST /verify-password] User from JWT:', req.user);
    
    const { password } = req.body;
    const userId = req.user.id;

    if (!password) {
      console.log('[POST /verify-password] No password provided');
      return res.status(400).json({
        message: 'Password is required'
      });
    }

    // Get user from database using the id from JWT token
    const { data: rows, error: userErr } = await supabase
      .from('users')
      .select('password')
      .eq('user_id', userId)
      .limit(1);

    if (userErr) throw userErr;

    if (!rows || rows.length === 0) {
      console.log('[POST /verify-password] User not found with ID:', userId);
      return res.status(401).json({ message: 'User not found' });
    }

    const user = rows[0];

    // Compare password
    const passwordMatch = await bcrypt.compare(password, user.password);
    console.log('[POST /verify-password] Password match:', passwordMatch);

    if (!passwordMatch) {
      console.log('[POST /verify-password] Password incorrect');
      return res.status(401).json({
        message: 'Incorrect password'
      });
    }

    console.log('[POST /verify-password] Password verified successfully');
    res.json({
      message: 'Password verified successfully'
    });
  } catch (error) {
    console.error('Verify password error:', error);
    res.status(500).json({
      message: 'Password verification failed',
      error: error.message
    });
  }
});

// GET /api/officers - list officers for the caller's station or specified station
router.get('/officers', authenticateToken, async (req, res) => {
  try {
    // Allow optional station_id query param, otherwise use caller's assignedStationId
    const stationId = req.query.station_id || req.user.assignedStationId || null;

    // If no stationId and caller is not admin, deny
    if (!stationId && req.user.role !== 'admin') {
      return res.status(400).json({ success: false, message: 'station_id required for non-admin users' });
    }

    // Build query: select users assigned to the station and who are officers (exclude admins)
    let query = supabase.from('users').select('user_id,first_name,last_name,full_name,rank,assigned_station_id,role,phone_number');

    if (stationId) query = query.eq('assigned_station_id', stationId);

    // Exclude admin accounts
    query = query.not('role', 'eq', 'admin');

    const { data: users, error } = await query.order('full_name', { ascending: true });

    if (error) throw error;

    // Map to include placeholder login/logout/status fields if not present in DB
    const mapped = (users || []).map(u => ({
      id: u.user_id,
      name: u.full_name || `${u.first_name} ${u.last_name}`.trim(),
      rank: u.rank || '',
      phone: u.phone_number || '',
      assigned_station_id: u.assigned_station_id || null,
      role: u.role || 'officer',
      last_login: null,
      last_logout: null,
      status: 'Offline'
    }));

    res.json({ success: true, data: mapped });
  } catch (error) {
    console.error('GET /officers error:', error);
    res.status(500).json({ success: false, message: 'Failed to get officers', error: error.message });
  }
});
// Protected endpoint to verify JWT and return current user info
// Frontend should call GET /api/me with Authorization: Bearer <token>
router.get('/me', authenticateToken, async (req, res) => {
  try {
    // Fetch full user info from database using id from JWT
    const userId = req.user?.id;
    if (!userId) {
      return res.status(400).json({ message: 'Invalid token payload (missing user id)' });
    }

    // Fetch user from DB
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('user_id', userId)
      .single();
    if (userError || !user) {
      return res.status(404).json({ message: 'User not found', error: userError?.message });
    }

    // Fetch station info if assigned
    let stationInfo = null;
    if (user.assigned_station_id) {
      const { data: stations } = await supabase
        .from('fire_stations')
        .select('*')
        .eq('station_id', user.assigned_station_id)
        .single();
      stationInfo = stations || null;
    }

    // Compose user object (match login response)
    const userObj = {
      id: user.user_id,
      idNumber: user.id_number,
      name: `${user.first_name}${user.middle_name ? ' ' + user.middle_name : ''} ${user.last_name}`.trim(),
      firstName: user.first_name,
      middleName: user.middle_name || '',
      lastName: user.last_name,
      rank: user.rank,
      substation: user.substation,
      assignedStationId: user.assigned_station_id,
      stationInfo: stationInfo,
      role: user.role,
      assigned: !!user.assigned_station_id,
      email: user.email,
      phone: user.phone_number
    };
    res.json({ user: userObj });
  } catch (error) {
    console.error('Error in /me route:', error);
    res.status(500).json({ message: 'Failed to verify token', error: error.message });
  }
});

export default router;

