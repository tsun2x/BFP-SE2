// Simple Twilio outbound call test script
// Usage:
//   TWILIO_ACCOUNT_SID=... TWILIO_AUTH_TOKEN=... TWILIO_CALLER_ID=+1... TWILIO_TEST_TO=+63... node scripts/make_call.js

import twilio from 'twilio';
import dotenv from 'dotenv';

dotenv.config();

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const from = process.env.TWILIO_CALLER_ID;
const to = process.env.TWILIO_TEST_TO;

if (!accountSid || !authToken) {
  console.error('Missing TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN');
  process.exit(1);
}

if (!from || !to) {
  console.error('Missing TWILIO_CALLER_ID or TWILIO_TEST_TO');
  process.exit(1);
}

const client = twilio(accountSid, authToken);

async function createCall() {
  try {
    const call = await client.calls.create({
      from,
      to,
      twiml: '<Response><Say>Test call from BFP dispatch backend. If you hear this, Twilio is working.</Say></Response>',
    });

    console.log('Call created, SID:', call.sid);
  } catch (err) {
    console.error('Error creating test call:', err);
  }
}

createCall();
