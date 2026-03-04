import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { supabase } from './supabaseClient.js';

// ── Route imports ────────────────────────────────────────────────────
import authRoutes from './routes/authRoutes.js';
import incidentRoutes from './routes/incidentRoutes.js';
import fireStationsRoutes from './routes/fireStations.js';
import readinessRoutes from './routes/readinessRoutes.js';
import compatibilityRoutes from './routes/compatibilityRoutes.js';
import firetruckTrackingRoutes from './routes/firetruckTrackingRoutes.js';
import newsRoutes from './routes/newsRoutes.js';
import safetyRoutes from './routes/safetyRoutes.js';
import messageRoutes from './routes/messageRoutes.js';
import twilioCallbacksRoutes from './routes/twilioCallbacks.js';
import twilioTokenRoutes from './routes/twilioTokenRoutes.js';

// ── Service imports (mark2 — station online tracking + dispatch) ─────
import {
  stationConnected,
  stationDisconnected,
  socketDisconnected,
  getOnlineStationsSummary
} from './services/onlineStations.js';
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

  // ── Station online tracking (mark2) ───────────────────────────────
  socket.on('station-online', (data) => {
    console.log('[OnlineStations] Raw station-online data:', JSON.stringify(data), 'type:', typeof data);
    const stationId = data?.stationId || data;
    console.log('[OnlineStations] Resolved stationId:', stationId, 'type:', typeof stationId);
    if (stationId) {
      socket._stationId = Number(stationId);
      stationConnected(Number(stationId), socket.id);
      socket.join(`station-${stationId}`);
      io.emit('stations-online-update', getOnlineStationsSummary());
    }
  });

  // ── Main admin room (mark2) ────────────────────────────────────────
  socket.on('join-main-admin', () => {
    socket.join('main-admin');
    console.log(`[Socket] Main admin joined room main-admin (socket ${socket.id})`);
  });

  // ── Civilian alarm room (mark2) ────────────────────────────────────
  socket.on('join-alarm', (data) => {
    const alarmId = data?.alarmId;
    if (alarmId) {
      socket.join(`alarm-${alarmId}`);
      console.log(`[Socket] Civilian joined room alarm-${alarmId} (socket ${socket.id})`);
    }
  });

  // ── Civilian cancels call (mark2) ─────────────────────────────────
  socket.on('call-cancelled', (data) => {
    const alarmId = data?.alarmId;
    if (!alarmId) return;
    console.log(`[Socket] Civilian cancelled call for alarm ${alarmId}`);
    const entry = getFailoverEntry(alarmId);
    const currentStationId = entry?.stationId;
    cancelFailover(alarmId);
    if (currentStationId && currentStationId !== 'main') {
      io.to(`station-${currentStationId}`).emit('auto-reject', { alarmId });
      console.log(`[Socket] Sent auto-reject to station-${currentStationId} (civilian cancelled)`);
    }
    io.to('main-admin').emit('auto-reject', { alarmId });
    console.log(`[Socket] Sent auto-reject to main-admin (civilian cancelled)`);
  });

  // ── New incident from mobile/station (both branches) ─────────────
  socket.on('new-incident', async (data) => {
    console.log('[Socket] Received new-incident event:', data);
    try {
      const { data: callerRows } = await supabase
        .from('users')
        .select('user_id')
        .eq('phone_number', data.phoneNumber)
        .single();

      let callerId;

      if (!callerRows) {
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

      const alarmLevelEnum = (data.alarmLevel || '').includes('Alarm')
        ? data.alarmLevel.replace(/st|nd|rd|th\s/, '')
        : 'Alarm 1';

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

  // ── Alarm subscription (both branches) ───────────────────────────
  socket.on('subscribe-to-alarm', (alarmId) => {
    console.log(`[Socket] Client ${socket.id} subscribed to alarm ${alarmId}`);
    socket.join(`alarm-${alarmId}`);
  });

  socket.on('unsubscribe-from-alarm', (alarmId) => {
    console.log(`[Socket] Client ${socket.id} unsubscribed from alarm ${alarmId}`);
    socket.leave(`alarm-${alarmId}`);
  });

  // ── Disconnect (mark2 — includes online station cleanup) ──────────
  socket.on('disconnect', () => {
    console.log('Socket disconnected:', socket.id);
    if (socket._stationId) {
      stationDisconnected(socket._stationId, socket.id);
    } else {
      socketDisconnected(socket.id);
    }
    io.emit('stations-online-update', getOnlineStationsSummary());
  });
});

// ── Route registration ───────────────────────────────────────────────

// Auth routes (no authentication required)
app.use('/api', authRoutes);

// News routes (web admin — mine/UI-redesign)
app.use('/api', newsRoutes);

// Safety tips + categories routes (web admin — mine/UI-redesign)
app.use('/api', safetyRoutes);

// Incident routes
app.use('/api', incidentRoutes);

// Readiness routes
app.use('/api', readinessRoutes);

// Fire stations resource
app.use('/api', fireStationsRoutes);

// Firetruck tracking routes (web admin — mine/UI-redesign)
app.use('/api', firetruckTrackingRoutes);

// Compatibility routes — old PHP endpoint paths for mobile app backward compat
app.use('/api', compatibilityRoutes);

// Messaging routes (web admin — mine/UI-redesign)
app.use('/api', messageRoutes);

// Twilio callbacks — unauthenticated, accepts Twilio webhooks only (mark2/main)
app.use('/api', twilioCallbacksRoutes);

// Twilio token generation + voice TwiML webhook (mark2/main)
app.use(express.urlencoded({ extended: false })); // Twilio sends form-encoded POSTs
app.use('/api', twilioTokenRoutes);

// ── Online stations endpoint (mark2/main) ────────────────────────────
app.get('/api/stations/online', (req, res) => {
  res.json({ online: getOnlineStationsSummary() });
});

// ── Health check ──────────────────────────────────────────────────────
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

// ── Auto-update TwiML App Voice URL on startup (mark2/main) ──────────
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
