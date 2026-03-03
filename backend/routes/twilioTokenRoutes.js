import express from 'express';
import twilio from 'twilio';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

const { AccessToken } = twilio.jwt;
const { VoiceGrant } = AccessToken;

// ── POST /api/twilio/token ──────────────────────────────────────────
// Returns a short-lived Twilio Access Token with a Voice grant.
// The client passes its identity (e.g. ADM_MAIN, ADM_SUB_2, CIV_123, TRUCK_5).
// The token lets the Twilio Voice SDK register and receive/make calls.
router.post('/twilio/token', authenticateToken, (req, res) => {
  try {
    const { identity } = req.body;

    if (!identity) {
      return res.status(400).json({ message: 'identity is required' });
    }

    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const apiKey = process.env.TWILIO_API_KEY;
    const apiSecret = process.env.TWILIO_API_SECRET;
    const twimlAppSid = process.env.TWILIO_TWIML_APP_SID;

    if (!accountSid || !apiKey || !apiSecret || !twimlAppSid) {
      console.error('[TwilioToken] Missing env vars: TWILIO_ACCOUNT_SID, TWILIO_API_KEY, TWILIO_API_SECRET, TWILIO_TWIML_APP_SID');
      return res.status(500).json({ message: 'Twilio credentials not configured on server' });
    }

    const token = new AccessToken(accountSid, apiKey, apiSecret, {
      identity,
      ttl: 3600, // 1 hour
    });

    const voiceGrant = new VoiceGrant({
      outgoingApplicationSid: twimlAppSid,
      incomingAllow: true, // allow receiving incoming calls to this identity
    });

    token.addGrant(voiceGrant);

    console.log(`[TwilioToken] Issued token for identity=${identity}`);
    res.json({ token: token.toJwt(), identity });
  } catch (error) {
    console.error('[TwilioToken] Error:', error);
    res.status(500).json({ message: 'Failed to generate Twilio token', error: error.message });
  }
});

// ── POST /api/twilio/voice ──────────────────────────────────────────
// TwiML App voice webhook. Twilio hits this when a Client-initiated
// call is made. We route based on the "To" parameter:
//   - If To starts with "ADM_" or "SUB_"  → dial that Client identity
//   - If To starts with "CIV_"            → dial that Client identity
//   - If To starts with "+"               → dial PSTN number
//   - Otherwise                           → reject
router.post('/twilio/voice', (req, res) => {
  try {
    const { To, From, CallSid } = req.body;
    console.log(`[TwilioVoice] Incoming voice webhook: From=${From} To=${To} CallSid=${CallSid}`);

    const VoiceResponse = twilio.twiml.VoiceResponse;
    const twiml = new VoiceResponse();

    if (!To || To === '') {
      twiml.say({ voice: 'alice' }, 'No destination specified.');
      twiml.hangup();
    } else if (To.startsWith('ADM_') || To.startsWith('SUB_') || To.startsWith('CIV_') || To.startsWith('TRUCK_')) {
      // Route to a Twilio Client identity — no say() so audio connects instantly
      const dial = twiml.dial({
        callerId: From || process.env.TWILIO_CALLER_ID,
        record: 'record-from-answer',
        statusCallbackEvent: 'initiated ringing answered completed',
        statusCallback: `${(process.env.PUBLIC_BASE_URL || '').replace(/\/$/, '')}/api/twilio/call-status`,
      });
      dial.client(To);
      console.log(`[TwilioVoice] Ringing ${To} only (main admin waits its turn in failover)`);
    } else if (To.startsWith('+')) {
      // Route to PSTN number
      twiml.say({ voice: 'alice' }, 'Connecting you to the fire station. Please stay on the line.');
      const dial = twiml.dial({
        callerId: process.env.TWILIO_CALLER_ID,
        record: 'record-from-answer',
        statusCallbackEvent: 'initiated ringing answered completed',
        statusCallback: `${(process.env.PUBLIC_BASE_URL || '').replace(/\/$/, '')}/api/twilio/call-status`,
      });
      dial.number(To);
    } else {
      twiml.say({ voice: 'alice' }, 'Invalid destination.');
      twiml.hangup();
    }

    res.type('text/xml').send(twiml.toString());
  } catch (error) {
    console.error('[TwilioVoice] Error:', error);
    const VoiceResponse = twilio.twiml.VoiceResponse;
    const twiml = new VoiceResponse();
    twiml.say({ voice: 'alice' }, 'An error occurred. Please try again.');
    res.type('text/xml').send(twiml.toString());
  }
});

export default router;
