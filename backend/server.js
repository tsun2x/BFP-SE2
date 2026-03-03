import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { supabase } from './supabaseClient.js';
import authRoutes from './routes/authRoutes.js';
import incidentRoutes from './routes/incidentRoutes.js';
import fireStationsRoutes from './routes/fireStations.js';
import readinessRoutes from './routes/readinessRoutes.js';
import compatibilityRoutes from './routes/compatibilityRoutes.js';
import twilioCallbacksRoutes from './routes/twilioCallbacks.js';
import twilioTokenRoutes from './routes/twilioTokenRoutes.js';
import { authenticateToken } from './middleware/auth.js';
import { stationConnected, stationDisconnected, socketDisconnected, getOnlineStationsSummary } from './services/onlineStations.js';

import { cancelFailover, getFailoverEntry } from './services/dispatchService.js';
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

  // ── Station online tracking ─────────────────────────────────────────
  // Station admin clients emit 'station-online' after login with their stationId
  socket.on('station-online', (data) => {
    console.log('[OnlineStations] Raw station-online data:', JSON.stringify(data), 'type:', typeof data);
    const stationId = data?.stationId || data;
    console.log('[OnlineStations] Resolved stationId:', stationId, 'type:', typeof stationId);
    if (stationId) {
      socket._stationId = Number(stationId);
      stationConnected(Number(stationId), socket.id);
      socket.join(`station-${stationId}`);
      // Broadcast updated online list to all clients
      io.emit('stations-online-update', getOnlineStationsSummary());
    }
  });

  // ── Main admin room ────────────────────────────────────────────────
  socket.on('join-main-admin', () => {
    socket.join('main-admin');
    console.log(`[Socket] Main admin joined room main-admin (socket ${socket.id})`);
  });

  // ── Civilian alarm room ────────────────────────────────────────────
  // Mobile app joins alarm-{alarmId} room so it receives failover-redirect events
  socket.on('join-alarm', (data) => {
    const alarmId = data?.alarmId;
    if (alarmId) {
      socket.join(`alarm-${alarmId}`);
      console.log(`[Socket] Civilian joined room alarm-${alarmId} (socket ${socket.id})`);
    }
  });

  // ── Civilian cancels call ─────────────────────────────────────────
  // When the end-user hangs up, cancel failover and dismiss all station modals
  socket.on('call-cancelled', (data) => {
    const alarmId = data?.alarmId;
    if (!alarmId) return;
    console.log(`[Socket] Civilian cancelled call for alarm ${alarmId}`);
    // Find which station currently has the alarm
    const entry = getFailoverEntry(alarmId);
    const currentStationId = entry?.stationId;
    // Cancel the failover timer
    cancelFailover(alarmId);
    // Send auto-reject to the current station so its modal dismisses
    if (currentStationId && currentStationId !== 'main') {
      io.to(`station-${currentStationId}`).emit('auto-reject', { alarmId });
      console.log(`[Socket] Sent auto-reject to station-${currentStationId} (civilian cancelled)`);
    }
    // Also send auto-reject to main-admin in case it has the modal
    io.to('main-admin').emit('auto-reject', { alarmId });
    console.log(`[Socket] Sent auto-reject to main-admin (civilian cancelled)`);
  });

  // Listen for new incidents from other stations and save to database
  socket.on('new-incident', async (data) => {
    console.log('[Socket] Received new-incident event:', data);
    try {
      // Check if caller exists or create new end user
      const { data: callerRows } = await supabase
        .from('users')
        .select('user_id')
        .eq('phone_number', data.phoneNumber)
        .single();

      let callerId;

      if (!callerRows) {
        // Create new end user
        const names = `${data.firstName || ''} ${data.lastName || ''}`.trim().split(' ');
        const fname = names[0] || 'Unknown';
        const lname = names[1] || 'Caller';
        const fullName = `${fname} ${lname}`;
        
        const { data: newUser } = await supabase
          .from('users')
          .insert([{
            first_name: fname,
            last_name: lname,
            full_name: fullName,
            phone_number: data.phoneNumber,
            password: 'temp_' + Date.now(),
            role: 'end_user',
            email: `caller_${Date.now()}@bfp.gov`,
            id_number: `caller_${Date.now()}`
          }])
          .select('user_id')
          .single();
        
        callerId = newUser?.user_id;
      } else {
        callerId = callerRows.user_id;
      }

      // Map alarm level format
      const alarmLevelEnum = (data.alarmLevel || '').includes('Alarm') 
        ? data.alarmLevel.replace(/st|nd|rd|th\s/, '')
        : 'Alarm 1';

      // Create the alarm/incident record
      const { data: alarmResult } = await supabase
        .from('_alarms')
        .insert([{
          end_user_id: callerId,
          user_latitude: data.coordinates?.latitude || data.coordinates?.lat || 0,
          user_longitude: data.coordinates?.longitude || data.coordinates?.lng || 0,
          initial_alarm_level: alarmLevelEnum,
          current_alarm_level: alarmLevelEnum,
          status: 'Pending Dispatch'
        }])
        .select('alarm_id')
        .single();

      const alarmId = alarmResult?.alarm_id;

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

  socket.on('disconnect', () => {
    console.log('Socket disconnected:', socket.id);
    // Remove from online tracking
    if (socket._stationId) {
      stationDisconnected(socket._stationId, socket.id);
    } else {
      socketDisconnected(socket.id);
    }
    // Broadcast updated online list
    io.emit('stations-online-update', getOnlineStationsSummary());
  });
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

// Twilio callbacks (status + recording). These are unauthenticated but only accept Twilio webhooks.
app.use('/api', twilioCallbacksRoutes);

// Twilio token generation + voice TwiML webhook
app.use(express.urlencoded({ extended: false })); // Twilio sends form-encoded POSTs
app.use('/api', twilioTokenRoutes);

// ── Online stations endpoint ──────────────────────────────────────────
app.get('/api/stations/online', (req, res) => {
  res.json({ online: getOnlineStationsSummary() });
});

app.get('/api/health', async (req, res) => {
  try {
    const { error } = await supabase.from('users').select('count()', { count: 'exact' });
    
    if (error) {
      return res.status(500).json({ 
        status: 'ERROR', 
        message: 'Failed to connect to database',
        error: error.message
      });
    }

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

// ── Auto-update TwiML App Voice URL on startup ───────────────────────
async function updateTwimlAppUrl() {
  const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_TWIML_APP_SID, PUBLIC_BASE_URL } = process.env;
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_TWIML_APP_SID || !PUBLIC_BASE_URL) {
    console.warn('[TwiML] Skipping TwiML App URL update — missing env vars');
    return;
  }
  const voiceUrl = `${PUBLIC_BASE_URL.replace(/\/$/, '')}/api/twilio/voice`;
  try {
    const twilioModule = await import('twilio');
    const twilioClient = twilioModule.default(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
    await twilioClient.applications(TWILIO_TWIML_APP_SID).update({
      voiceUrl,
      voiceMethod: 'POST',
    });
    console.log(`[TwiML] Updated TwiML App voice URL → ${voiceUrl}`);
  } catch (err) {
    console.error('[TwiML] Failed to update TwiML App URL:', err.message);
  }
}

// Start HTTP server (with Socket.IO)
httpServer.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  updateTwimlAppUrl();
});