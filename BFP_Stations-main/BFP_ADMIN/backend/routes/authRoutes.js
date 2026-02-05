import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import { supabase, db } from '../config/supabase.js';
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

    // Get user from Supabase
    const user = await db.getUser(idNumber);

    if (!user) {
      return res.status(401).json({
        message: 'Invalid ID Number or password'
      });
    }

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
        idNumber: user.id_number || user.email,
        name: user.full_name || `${user.first_name || ''} ${user.last_name || ''}`.trim(),
        substation: user.substation || null,
        assignedStationId: user.assigned_station_id || null,
        role: user.role || 'end_user'
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Fetch station info if user is assigned to a station
    let stationInfo = null;
    if (user.assigned_station_id) {
      stationInfo = await db.getStation(user.assigned_station_id);
    }

    res.json({
      token,
      user: {
        id: user.user_id,
        idNumber: user.id_number || user.email,
        name: user.full_name || `${user.first_name || ''} ${user.last_name || ''}`.trim(),
        firstName: user.first_name || '',
        lastName: user.last_name || '',
        rank: user.rank || '',
        substation: user.substation || null,
        assignedStationId: user.assigned_station_id || null,
        stationInfo: stationInfo,
        role: user.role || 'end_user',
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
    const existingUser = await db.getUser(idNumber);

    if (existingUser) {
      return res.status(400).json({
        message: 'User with this ID already exists'
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create full name and a placeholder phone number (DB requires phone_number NOT NULL)
    const fullName = `${firstName} ${lastName}`.trim();
    const placeholderPhone = `signup_${randomUUID().substring(0, 12)}`;
    
    // Determine role based on optional role or stationType provided
    let role = 'end_user';
    if (req.body.role === 'admin' || req.body.stationType === 'Main') {
      role = 'admin';
    } else if (req.body.role === 'substation_admin' || req.body.stationType === 'Substation') {
      role = 'substation_admin';
    }

    // Insert new user
    const assignedStationId = req.body.assignedStationId || null;
    const userData = {
      full_name: fullName,
      phone_number: placeholderPhone,
      email: `${idNumber}@bfp.internal`,
      password: hashedPassword,
      role: role
    };
    
    // Only add optional fields if they exist
    if (firstName) userData.first_name = firstName;
    if (lastName) userData.last_name = lastName;
    if (idNumber) userData.id_number = idNumber;
    if (rank) userData.rank = rank;
    if (req.body.substation) userData.substation = req.body.substation;
    if (assignedStationId) userData.assigned_station_id = assignedStationId;
    
    await db.createUser(userData);

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
    const existingUser = await db.getUser(idNumber);
    if (existingUser) {
      return res.status(400).json({
        message: 'User with this ID already exists'
      });
    }

    // Validate: if stationType='Main', check if Main already exists
    if (stationType === 'Main') {
      const { data: mainStations, error } = await supabase
        .from('fire_stations')
        .select('station_id', { count: 'exact' })
        .eq('station_type', 'Main');
      
      if (!error && mainStations && mainStations.length > 0) {
        // If a Main already exists, only allow creation by an authenticated admin
        const authHeader = req.headers['authorization'];
        if (!authHeader) {
          return res.status(403).json({ message: 'Only admin can create additional stations' });
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

    try {
      // 1. Insert into fire_stations
      const stationData = await db.createStation({
        station_name: stationName,
        province: 'Zamboanga',
        city: 'Zamboanga City',
        contact_number: contactNumber || null,
        latitude: lat,
        longitude: lng,
        station_type: stationType
      });
      const stationId = stationData.station_id;

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

      await db.createUser({
        first_name: firstName,
        last_name: lastName,
        id_number: idNumber,
        rank: rank,
        full_name: fullName,
        phone_number: placeholderPhone,
        password: hashedPassword,
        role: role,
        assigned_station_id: stationId
      });

      res.status(201).json({
        message: 'Fire station registered successfully. Please login.',
        stationId: stationId,
        stationType: stationType
      });
    } catch (error) {
      throw error;
    }
  } catch (error) {
    console.error('Station signup error:', error);
    res.status(500).json({
      message: 'Station registration failed',
      error: error.message
    });
  }
});

// Update station endpoint
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
      // Update fire_stations table
      const updates = { station_name: stationName };
      if (contactNumber) updates.contact_number = contactNumber;
      if (latitude !== undefined && longitude !== undefined) {
        updates.latitude = parseFloat(latitude);
        updates.longitude = parseFloat(longitude);
      }

      const result = await db.updateStation(assignedStationId, updates);

      res.json({
        message: 'Station information updated successfully',
        stationId: assignedStationId
      });
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
    const stations = await db.getStations();
    res.json({ 
      stations: stations.map(s => ({
        station_id: s.station_id,
        station_name: s.station_name,
        station_type: s.station_type
      }))
    });
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

    // Get user from database
    const user = await db.getUserById(userId);

    if (!user) {
      console.log('[POST /verify-password] User not found with ID:', userId);
      return res.status(401).json({
        message: 'User not found'
      });
    }

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
