import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { pool } from './config/database.js';
import authRoutes from './routes/authRoutes.js';
import incidentRoutes from './routes/incidentRoutes.js';
import fireStationsRoutes from './routes/fireStations.js';
import readinessRoutes from './routes/readinessRoutes.js';
import compatibilityRoutes from './routes/compatibilityRoutes.js';
import { authenticateToken } from './middleware/auth.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Create an HTTP server and attach Socket.IO
const httpServer = createServer(app);
const io = new SocketIOServer(httpServer, {
  cors: { origin: '*' }
});

// Expose io to routes via app.get('io')
app.set('io', io);

io.on('connection', (socket) => {
  console.log('Socket connected:', socket.id);

  // Listen for new incidents from other stations and save to database
  socket.on('new-incident', async (data) => {
    console.log('[Socket] Received new-incident event:', data);
    try {
      const connection = await pool.getConnection();

      // Check if caller exists or create new end user
      let [callerRows] = await connection.query(
        'SELECT user_id FROM users WHERE phone_number = ?',
        [data.phoneNumber]
      );

      let callerId;

      if (callerRows.length === 0) {
        // Create new end user
        const names = `${data.firstName || ''} ${data.lastName || ''}`.trim().split(' ');
        const fname = names[0] || 'Unknown';
        const lname = names[1] || 'Caller';
        const fullName = `${fname} ${lname}`;
        
        const [insertResult] = await connection.query(
          'INSERT INTO users (first_name, last_name, full_name, phone_number, password, role, email) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [fname, lname, fullName, data.phoneNumber, 'temp_' + Date.now(), 'end_user', `caller_${Date.now()}@bfp.gov`]
        );
        callerId = insertResult.insertId;
      } else {
        callerId = callerRows[0].user_id;
      }

      // Map alarm level format
      const alarmLevelEnum = (data.alarmLevel || '').includes('Alarm') 
        ? data.alarmLevel.replace(/st|nd|rd|th\s/, '')
        : 'Alarm 1';

      // Create the alarm/incident record
      const [alarmResult] = await connection.query(
        `INSERT INTO alarms (
          end_user_id,
          user_latitude,
          user_longitude,
          initial_alarm_level,
          current_alarm_level,
          status
        ) VALUES (?, ?, ?, ?, ?, ?)`,
        [
          callerId,
          data.coordinates?.latitude || data.coordinates?.lat || 0,
          data.coordinates?.longitude || data.coordinates?.lng || 0,
          alarmLevelEnum,
          alarmLevelEnum,
          'Pending Dispatch'
        ]
      );

      const alarmId = alarmResult.insertId;

      // Log the incident creation
      await connection.query(
        `INSERT INTO alarm_response_log (
          alarm_id,
          action_type,
          details,
          performed_by_user_id
        ) VALUES (?, ?, ?, ?)`,
        [
          alarmId,
          'Received from Station',
          `Incident: ${data.incidentType || 'Not specified'} | Location: ${data.location} | Narrative: ${data.narrative || 'No details'}`,
          null // No authenticated user for socket events; set to NULL to avoid FK errors
        ]
      );

      connection.release();
      console.log('[Socket] Incident saved to database - alarmId:', alarmId);
      
      // Broadcast the incident to all connected clients (stations, admins, end-users)
      io.emit('incident-created', {
        alarmId,
        callerId,
        phoneNumber: data.phoneNumber,
        coordinates: { latitude: data.coordinates?.latitude, longitude: data.coordinates?.longitude },
        alarmLevel: alarmLevelEnum,
        status: 'Pending Dispatch',
        createdAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('[Socket] Error saving incident to database:', error);
    }
  });

  // ============================================================
  // FIRETRUCK LIVE TRACKING - Real-time location updates
  // ============================================================
  // Firetruck sends location updates via Socket.IO
  // This gets broadcasted to: end-user (see truck on map), other stations, admins
  socket.on('firetruck-location-update', async (data) => {
    console.log('[Socket] Received firetruck-location-update:', data);
    try {
      const { truck_id, latitude, longitude, battery_level, alarm_id, speed, heading } = data;

      if (!truck_id || latitude === undefined || longitude === undefined) {
        console.error('[Socket] Missing required fields for firetruck update');
        return;
      }

      const connection = await pool.getConnection();

      try {
        // Update firetruck in database
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

        // Get updated firetruck info for broadcast
        const [truck] = await connection.query(
          `SELECT f.*, fs.station_name, a.user_latitude, a.user_longitude, a.status as alarm_status
           FROM firetrucks f
           LEFT JOIN fire_stations fs ON f.station_id = fs.station_id
           LEFT JOIN alarms a ON f.current_alarm_id = a.alarm_id
           WHERE f.truck_id = ?`,
          [truck_id]
        );

        connection.release();

        // Broadcast to all connected clients (real-time map update)
        io.emit('firetruck-location', {
          truck_id,
          latitude,
          longitude,
          battery_level,
          status: alarm_id ? 'on_mission' : 'available',
          alarm_id: alarm_id || null,
          station_name: truck[0]?.station_name,
          timestamp: new Date().toISOString()
        });

        console.log('[Socket] Firetruck location broadcasted:', truck_id);
      } catch (error) {
        connection.release();
        throw error;
      }
    } catch (error) {
      console.error('[Socket] Error updating firetruck location:', error);
    }
  });

  // Subscribe to specific alarm for real-time tracking
  socket.on('subscribe-to-alarm', (alarmId) => {
    console.log(`[Socket] Client ${socket.id} subscribed to alarm ${alarmId}`);
    socket.join(`alarm-${alarmId}`);
  });

  // Unsubscribe from alarm
  socket.on('unsubscribe-from-alarm', (alarmId) => {
    console.log(`[Socket] Client ${socket.id} unsubscribed from alarm ${alarmId}`);
    socket.leave(`alarm-${alarmId}`);
  });

  socket.on('disconnect', () => console.log('Socket disconnected:', socket.id));
});

// Auth routes (no authentication required)
app.use('/api', authRoutes);

// Incident routes (authentication required)
app.use('/api', incidentRoutes);

// Readiness routes (authentication required)
app.use('/api', readinessRoutes);

// Fire stations resource (protected endpoints for admin)
app.use('/api', fireStationsRoutes);

// Compatibility routes - Old PHP endpoint paths for backward compatibility with mobile apps
app.use('/api', compatibilityRoutes);

app.get('/api/health', async (req, res) => {
  try {
    const connection = await pool.getConnection();
    await connection.query('SELECT 1');
    connection.release();
    res.json({ 
      status: 'OK', 
      message: 'Server is running',
      database: 'Connected to MySQL'
    });
  } catch (error) {
    console.error('Database connection error:', error);
    res.status(500).json({ 
      status: 'ERROR', 
      message: 'Failed to connect to database',
      error: error.message
    });
  }
});

// Start HTTP server (with Socket.IO)
httpServer.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});