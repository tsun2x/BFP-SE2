import twilio from 'twilio';

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN,
);

/**
 * Make an outbound incident call using Twilio.
 * This is a thin wrapper around client.calls.create that follows Twilio docs.
 *
 * options = {
 *   to: '+63...',                 // civilian phone
 *   from: process.env.TWILIO_CALLER_ID,
 *   stationNumber: '+63...',       // station phone (for bridge)
 *   alarmId,
 *   latitude,
 *   longitude,
 * }
 */
export async function makeIncidentCall(options) {
  const {
    to,
    from,
    stationNumber,
    alarmId,
    latitude,
    longitude,
  } = options;

  if (!to || !from) {
    console.warn('makeIncidentCall: missing to/from, skipping Twilio call');
    return null;
  }

  try {
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">Connecting you to the nearest fire station. Please stay on the line.</Say>
  <Dial record="record-from-answer">
    ${stationNumber ? `<Number>${stationNumber}</Number>` : ''}
  </Dial>
</Response>`;

    const call = await twilioClient.calls.create({
      to,
      from,
      twiml,
      // These callbacks just need to exist; the routes can log for now
      statusCallback: process.env.PUBLIC_BASE_URL
        ? `${process.env.PUBLIC_BASE_URL.replace(/\/$/, '')}/api/twilio/call-status`
        : undefined,
      statusCallbackEvent: ['completed'],
      recordingStatusCallback: process.env.PUBLIC_BASE_URL
        ? `${process.env.PUBLIC_BASE_URL.replace(/\/$/, '')}/api/twilio/recording-status`
        : undefined,
      recordingStatusCallbackEvent: ['completed', 'in-progress'],
    });

    console.log('Twilio incident call created, SID:', call.sid);
    return call;
  } catch (err) {
    console.error('makeIncidentCall Twilio error:', err);
    return null;
  }
}
