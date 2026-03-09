import { useState, useEffect, useRef, useCallback } from 'react';
import { Device } from '@twilio/voice-sdk';

// VITE_API_URL already points to the backend /api base (see .env.example)
const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/$/, '');

/**
 * useTwilioVoice — React hook that manages a Twilio Voice Device.
 *
 * @param {string} identity  Twilio Client identity (e.g. "ADM_MAIN", "ADM_SUB_2")
 * @param {string} authToken JWT token for the backend /api/twilio/token endpoint
 * @param {object} options   { onIncomingCall, onCallDisconnected }
 * @returns {{ device, activeCall, status, makeCall, acceptIncoming, rejectIncoming, hangUp, error }}
 */
export default function useTwilioVoice(identity, authToken, options = {}) {
  const [device, setDevice] = useState(null);
  const [status, setStatus] = useState('offline'); // offline | registering | ready | busy
  const [activeCall, setActiveCall] = useState(null);
  const [incomingCall, setIncomingCall] = useState(null);
  const [error, setError] = useState(null);
  const deviceRef = useRef(null);

  // ── Fetch Twilio access token from backend ────────────────────────
  const fetchToken = useCallback(async () => {
    if (!identity || !authToken) {
      console.warn('[TwilioVoice] fetchToken skipped — identity:', identity, 'authToken:', !!authToken);
      return null;
    }
    try {
      console.log(`[TwilioVoice] Fetching token from ${API_BASE}/twilio/token for identity=${identity}`);
      const res = await fetch(`${API_BASE}/twilio/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ identity }),
      });
      if (!res.ok) {
        const errBody = await res.text();
        console.error(`[TwilioVoice] Token request failed: ${res.status}`, errBody);
        throw new Error(`Token request failed: ${res.status} — ${errBody}`);
      }
      const data = await res.json();
      return data.token;
    } catch (err) {
      console.error('[TwilioVoice] Token fetch error:', err);
      setError(err.message);
      return null;
    }
  }, [identity, authToken]);

  // ── Initialize / register device ──────────────────────────────────
  useEffect(() => {
    if (!identity || !authToken) return;

    let cancelled = false;

    const init = async () => {
      setStatus('registering');
      const token = await fetchToken();
      if (cancelled) return;
      if (!token) {
        console.error('[TwilioVoice] Failed to fetch token — cannot register device');
        setStatus('offline');
        setError('Failed to fetch Twilio token');
        return;
      }

      try {
        if (navigator?.mediaDevices?.getUserMedia) {
          const s = await navigator.mediaDevices.getUserMedia({ audio: true });
          try {
            s.getTracks().forEach((t) => t.stop());
          } catch (_) {}
        }
      } catch (err) {
        const msg = err?.name === 'NotFoundError'
          ? 'No microphone device found. Connect/enable a microphone and allow browser microphone access.'
          : (err?.message || String(err));
        console.error('[TwilioVoice] Microphone preflight failed:', err);
        if (!cancelled) {
          setError(msg);
          setStatus('offline');
        }
        return;
      }

      try {
        const dev = new Device(token, {
          logLevel: 1,
          codecPreferences: ['opus', 'pcmu'],
        });

        dev.on('registered', () => {
          console.log(`[TwilioVoice] Device registered as ${identity}`);
          if (!cancelled) setStatus('ready');
        });

        dev.on('error', (err) => {
          console.error('[TwilioVoice] Device error:', err);
          if (!cancelled) setError(err.message || String(err));
        });

        dev.on('incoming', (call) => {
          const callTo = call.parameters.To || '';
          console.log(`[TwilioVoice] Incoming call from: ${call.parameters.From}, To: ${callTo}, myIdentity: client:${identity}`);
          // Reject calls not addressed to this identity (prevents bleed across browser tabs)
          // Twilio may send To as either "client:IDENTITY" or "IDENTITY" depending on SDK/webhook params.
          const expectedA = `client:${identity}`;
          const expectedB = `${identity}`;
          if (callTo && callTo !== expectedA && callTo !== expectedB) {
            console.warn(`[TwilioVoice] Rejecting misrouted call (To=${callTo}, expected ${expectedA} or ${expectedB})`);
            try { call.reject(); } catch (_) {}
            return;
          }
          if (!cancelled) {
            setIncomingCall(call);
            setStatus('busy');
            if (options.onIncomingCall) options.onIncomingCall(call);
          }
        });

        dev.on('tokenWillExpire', async () => {
          console.log('[TwilioVoice] Token expiring, refreshing…');
          const newToken = await fetchToken();
          if (newToken && !cancelled) dev.updateToken(newToken);
        });

        await dev.register();
        if (!cancelled) {
          deviceRef.current = dev;
          setDevice(dev);
        }
      } catch (err) {
        console.error('[TwilioVoice] Init error:', err);
        if (!cancelled) {
          setError(err.message);
          setStatus('offline');
        }
      }
    };

    init();

    return () => {
      cancelled = true;
      if (deviceRef.current) {
        deviceRef.current.destroy();
        deviceRef.current = null;
      }
      setDevice(null);
      setStatus('offline');
    };
  }, [identity, authToken]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Make outbound call ────────────────────────────────────────────
  const makeCall = useCallback(async (toIdentityOrNumber) => {
    if (!deviceRef.current) {
      setError('Device not ready');
      return null;
    }
    try {
      const call = await deviceRef.current.connect({
        params: { To: toIdentityOrNumber },
      });

      call.on('accept', () => setStatus('busy'));
      call.on('disconnect', () => {
        setActiveCall(null);
        setStatus('ready');
        if (options.onCallDisconnected) options.onCallDisconnected(call);
      });
      call.on('cancel', () => {
        setActiveCall(null);
        setStatus('ready');
      });

      setActiveCall(call);
      setStatus('busy');
      return call;
    } catch (err) {
      console.error('[TwilioVoice] makeCall error:', err);
      setError(err.message);
      return null;
    }
  }, [options]);

  // ── Accept incoming call ──────────────────────────────────────────
  const acceptIncoming = useCallback(() => {
    if (!incomingCall) return;
    try {
      incomingCall.accept();
    } catch (err) {
      console.error('[TwilioVoice] acceptIncoming error:', err);
      setError(err?.name === 'NotFoundError'
        ? 'No microphone device found. Connect/enable a microphone and allow browser microphone access.'
        : (err?.message || String(err)));
      setIncomingCall(null);
      setStatus('ready');
      return;
    }

    incomingCall.on('disconnect', () => {
      setActiveCall(null);
      setIncomingCall(null);
      setStatus('ready');
      if (options.onCallDisconnected) options.onCallDisconnected(incomingCall);
    });

    setActiveCall(incomingCall);
    setIncomingCall(null);
    setStatus('busy');
  }, [incomingCall, options]);

  // ── Reject incoming call ──────────────────────────────────────────
  const rejectIncoming = useCallback(() => {
    if (!incomingCall) return;
    incomingCall.reject();
    setIncomingCall(null);
    setStatus('ready');
  }, [incomingCall]);

  // ── Hang up active call ───────────────────────────────────────────
  const hangUp = useCallback(() => {
    if (activeCall) {
      activeCall.disconnect();
      setActiveCall(null);
      setStatus('ready');
    }
  }, [activeCall]);

  return {
    device,
    activeCall,
    incomingCall,
    status,
    makeCall,
    acceptIncoming,
    rejectIncoming,
    hangUp,
    error,
  };
}
