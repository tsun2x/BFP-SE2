import express from 'express';

const router = express.Router();

// Simple logging-only Twilio callbacks for now. Later, persist to Supabase call_logs.

router.post('/twilio/call-status', (req, res) => {
  try {
    console.log('[Twilio Call Status] payload:', req.body);
  } catch (err) {
    console.error('Error logging Twilio call status:', err);
  }
  // Twilio expects a 200 OK with no body
  res.sendStatus(200);
});

router.post('/twilio/recording-status', (req, res) => {
  try {
    console.log('[Twilio Recording Status] payload:', req.body);
  } catch (err) {
    console.error('Error logging Twilio recording status:', err);
  }
  res.sendStatus(200);
});

export default router;
