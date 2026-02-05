import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { supabase, db } from './config/supabase.js';
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

// Expose io and db to routes via app
app.set('io', io);
app.set('db', db);

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
      // Check if caller exists or create new end user
      let caller = await db.getUser(data.phoneNumber);
      let callerId;

      if (!caller) {
        // Create new end user
        const names = `${data.firstName || ''} ${data.lastName || ''}`.trim().split(' ');
        const fname = names[0] || 'Unknown';
        const lname = names[1] || 'Caller';
        const fullName = `${fname} ${lname}`;
        
        const newUser = await db.createUser({
          first_name: fname,
          last_name: lname,
          full_name: fullName,
          phone_number: data.phoneNumber,
          password: 'temp_' + Date.now(),
          role: 'end_user',
          email: `caller_${Date.now()}@bfp.gov`
        });
        callerId = newUser.user_id;
      } else {
        callerId = caller.user_id;
      }

      // Map alarm level format
      const alarmLevelEnum = (data.alarmLevel || '').includes('Alarm') 
        ? data.alarmLevel.replace(/st|nd|rd|th\s/, '')
        : 'Alarm 1';

      // Create the alarm/incident record
      const alarmData = await db.createAlarm({
        end_user_id: callerId,
        user_latitude: data.coordinates?.latitude || data.coordinates?.lat || 0,
        user_longitude: data.coordinates?.longitude || data.coordinates?.lng || 0,
        initial_alarm_level: alarmLevelEnum,
        current_alarm_level: alarmLevelEnum,
        status: 'Pending Dispatch'
      });

      const alarmId = alarmData.alarm_id;

      // Log the incident creation
      await db.logAlarmResponse({
        alarm_id: alarmId,
        action_type: 'Received from Station',
        details: `Incident: ${data.incidentType || 'Not specified'} | Location: ${data.location} | Narrative: ${data.narrative || 'No details'}`,
        performed_by_user_id: null
      });

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
    // Test Supabase connection
    const { data, error } = await supabase
      .from('users')
      .select('count(*)', { count: 'exact', head: true });
    
    if (error) throw error;
    
    res.json({ 
      status: 'OK', 
      message: 'Server is running',
      database: 'Connected to Supabase'
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
  console.log(`Database: Supabase`);
});