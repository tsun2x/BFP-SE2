import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import { supabase } from '../supabaseClient.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key';

// Login endpoint
router.post('/login', async (req, res) => {
  try {
    const { idNumber, password } = req.body;

    if (!idNumber || !password) {
      return res.status(400).json({
        message: 'ID Number and password are required'
      });
    }

    // Query users table in Supabase
    const { data: rows, error } = await supabase
      .from('users')
      .select('*')
      .eq('id_number', idNumber)
      .single();

    if (error || !rows) {
      return res.status(401).json({
        message: 'Invalid ID Number or password'
      });
    }

    const user = rows;

    // Compare password
    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      return res.status(401).json({
        message: 'Invalid ID Number or password'
      });
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
        .from('_fire_stations')
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

    // Check if user already exists
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
    }

    // Insert new user (include assigned_station_id if provided)
    const assignedStationId = req.body.assignedStationId || null;
    const { data: newUser, error: insertError } = await supabase
      .from('users')
      .insert([{
        first_name: firstName,
        last_name: lastName,
        id_number: idNumber,
        rank: rank,
        substation: req.body.substation || null,
        full_name: fullName,
        phone_number: placeholderPhone,
        password: hashedPassword,
        role: role,
        assigned_station_id: assignedStationId
      }])
      .select();

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

    const connection = await pool.getConnection();

    // Check if user already exists
    const [existingUser] = await connection.query(
      'SELECT * FROM users WHERE id_number = ?',
      [idNumber]
    );

    if (existingUser.length > 0) {
      connection.release();
      return res.status(400).json({
        message: 'User with this ID already exists'
      });
    }

    // Validate: if stationType='Main', check if Main already exists
    if (stationType === 'Main') {
      const [mainStations] = await connection.query(
        'SELECT COUNT(*) as count FROM fire_stations WHERE station_type = ?',
        ['Main']
      );
      if (mainStations[0].count > 0) {
        // If a Main already exists, only allow creation by an authenticated admin
        const authHeader = req.headers['authorization'];
        let caller = null;
        if (!authHeader) {
          connection.release();
          return res.status(403).json({ message: 'Only admin can create additional stations' });
        }
        try {
          const token = authHeader.split(' ')[1];
          caller = jwt.verify(token, JWT_SECRET);
        } catch (err) {
          connection.release();
          return res.status(403).json({ message: 'Invalid auth token' });
        }
        if (!caller || caller.role !== 'admin') {
          connection.release();
          return res.status(403).json({ message: 'Only admin can create stations' });
        }
      }
    } else {
      // For non-Main station creation, require authenticated admin
      const authHeader = req.headers['authorization'];
      if (!authHeader) {
        connection.release();
        return res.status(403).json({ message: 'Only admin can create stations' });
      }
      try {
        const token = authHeader.split(' ')[1];
        const caller = jwt.verify(token, JWT_SECRET);
        if (!caller || caller.role !== 'admin') {
          connection.release();
          return res.status(403).json({ message: 'Only admin can create stations' });
        }
      } catch (err) {
        connection.release();
        return res.status(403).json({ message: 'Invalid auth token' });
      }
    }

    // Start transaction
    await connection.beginTransaction();

    try {
      // 1. Insert into fire_stations
      const [stationResult] = await connection.query(
        'INSERT INTO fire_stations (station_name, province, city, contact_number, latitude, longitude, station_type) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [stationName, 'Zamboanga', 'Zamboanga City', contactNumber || null, lat, lng, stationType]
      );
      const stationId = stationResult.insertId;

      // 2. Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // 3. Insert into users
      const fullName = `${firstName} ${lastName}`.trim();
      const placeholderPhone = `signup_${randomUUID().substring(0, 12)}`;
      let role = 'end_user';
      if (stationType === 'Main') {
        role = 'admin';
      } else if (stationType === 'Substation') {
        role = 'substation_admin';
      }

      await connection.query(
        'INSERT INTO users (first_name, last_name, id_number, rank, full_name, phone_number, password, role, assigned_station_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [firstName, lastName, idNumber, rank, fullName, placeholderPhone, hashedPassword, role, stationId]
      );

      // Commit transaction
      await connection.commit();
      connection.release();

      res.status(201).json({
        message: 'Fire station registered successfully. Please login.',
        stationId: stationId,
        stationType: stationType
      });
    } catch (txError) {
      // Rollback on error
      await connection.rollback();
      connection.release();
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

    const connection = await pool.getConnection();

    try {
      // Update fire_stations table
      const updateQuery = latitude !== undefined && longitude !== undefined 
        ? 'UPDATE fire_stations SET station_name = ?, latitude = ?, longitude = ?, contact_number = ? WHERE station_id = ?'
        : 'UPDATE fire_stations SET station_name = ?, contact_number = ? WHERE station_id = ?';

      const updateParams = latitude !== undefined && longitude !== undefined
        ? [stationName, parseFloat(latitude), parseFloat(longitude), contactNumber || null, assignedStationId]
        : [stationName, contactNumber || null, assignedStationId];

      const [result] = await connection.query(updateQuery, updateParams);

      connection.release();

      if (result.affectedRows === 0) {
        return res.status(404).json({
          message: 'Station not found or no changes made'
        });
      }

      res.json({
        message: 'Station information updated successfully',
        stationId: assignedStationId
      });
    } catch (error) {
      connection.release();
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
    const [rows] = await pool.query('SELECT station_id, station_name, station_type FROM fire_stations ORDER BY station_name ASC');
    res.json({ stations: rows });
  } catch (error) {
    console.error('Get stations error:', error);
    res.status(500).json({ message: 'Failed to retrieve stations', error: error.message });
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

    const connection = await pool.getConnection();

    // Get user from database using the id from JWT token
    const [rows] = await connection.query(
      'SELECT password FROM users WHERE user_id = ?',
      [userId]
    );

    connection.release();

    if (rows.length === 0) {
      console.log('[POST /verify-password] User not found with ID:', userId);
      return res.status(401).json({
        message: 'User not found'
      });
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

export default router;

// Protected endpoint to verify JWT and return current user info
// Frontend should call GET /api/me with Authorization: Bearer <token>
router.get('/me', authenticateToken, async (req, res) => {
  try {
    // `authenticateToken` middleware attaches the decoded token data to req.user
    res.json({ user: req.user });
  } catch (error) {
    console.error('Error in /me route:', error);
    res.status(500).json({ message: 'Failed to verify token', error: error.message });
  }
});

