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
import firetruckRoutes from './routes/firetruckRoutes.js';
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
  
    socket.on('join-station', ({ stationId }) => {
    if (!stationId) return;
    const room = `station-${stationId}`;
    console.log(`Socket ${socket.id} joining room`, room);
    socket.join(room);
  });

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
    } catch (error) {
      console.error('[Socket] Error saving incident to database:', error);
    }
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

// Firetruck-related endpoints (current alarm, etc.)
app.use('/api', firetruckRoutes);

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