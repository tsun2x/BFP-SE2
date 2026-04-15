import { useState, useEffect, useRef, useCallback } from 'react';
import { Device } from '@twilio/voice-sdk';
import { API_BASE } from '../utils/runtimeConfig';

/**
 * useTwilioVoice — React hook that manages a Twilio Voice Device.
 *
 * @param {string} identity  Twilio Client identity (e.g. "ADM_SUB_2")
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

  const ensureMicrophoneAccess = useCallback(async () => {
    if (!navigator?.mediaDevices?.getUserMedia) return;
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    try {
      stream.getTracks().forEach((t) => t.stop());
    } catch (_) {
      // ignore cleanup errors
    }
  }, []);

  const forceUnmuteCall = useCallback((call) => {
    try {
      if (call && typeof call.mute === 'function') {
        call.mute(false);
      }
    } catch (_) {
      // ignore if SDK/audio state does not support explicit unmute
    }
  }, []);

  const fetchToken = useCallback(async () => {
    if (!identity || !authToken) return null;
    try {
      // NOTE: VITE_API_URL already points to /api, so we call /twilio/token here
      const res = await fetch(`${API_BASE}/twilio/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ identity }),
      });
      if (!res.ok) throw new Error(`Token request failed: ${res.status}`);
      const data = await res.json();
      return data.token;
    } catch (err) {
      console.error('[TwilioVoice] Token fetch error:', err);
      setError(err.message);
      return null;
    }
  }, [identity, authToken]);

  useEffect(() => {
    if (!identity || !authToken) return;

    let cancelled = false;

    const init = async () => {
      setStatus('registering');
      const token = await fetchToken();
      if (!token || cancelled) return;

      try {
        await ensureMicrophoneAccess();

        const dev = new Device(token, {
          logLevel: 1,
          codecPreferences: ['opus', 'pcmu'],
        });

        dev.on('registered', async () => {
          try {
            dev.audio?.speakerDevices?.set?.('default');
            dev.audio?.ringtoneDevices?.set?.('default');
          } catch (_) {
            // ignore audio-device selection failures
          }
          // Explicitly set input device (microphone) so the browser captures audio
          try {
            if (dev.audio && typeof dev.audio.setInputDevice === 'function') {
              await dev.audio.setInputDevice('default');
              console.log('[TwilioVoice] Input device set to default');
            }
          } catch (audioErr) {
            console.warn('[TwilioVoice] Could not set input device:', audioErr?.message || audioErr);
          }
          console.log(`[TwilioVoice] Device registered as ${identity}`);
          if (!cancelled) setStatus('ready');
        });

        dev.on('error', (err) => {
          console.error('[TwilioVoice] Device error:', err);
          if (!cancelled) setError(err.message || String(err));
        });

        dev.on('incoming', (call) => {
          const callTo = call.parameters.To || '';
          console.log(
            `[TwilioVoice] Incoming call from: ${call.parameters.From}, To: ${callTo}, myIdentity: client:${identity}`
          );
          // Reject calls not addressed to this identity (prevents bleed across browser tabs)
          const expectedA = `client:${identity}`;
          const expectedB = `${identity}`;
          if (callTo && callTo !== expectedA && callTo !== expectedB) {
            console.warn(
              `[TwilioVoice] Rejecting misrouted call (To=${callTo}, expected ${expectedA} or ${expectedB})`
            );
            try {
              call.reject();
            } catch (_) {}
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

  const makeCall = useCallback(
    async (toIdentityOrNumber) => {
      if (!deviceRef.current) {
        setError('Device not ready');
        return null;
      }
      try {
        await ensureMicrophoneAccess();
        const call = await deviceRef.current.connect({
          params: { To: toIdentityOrNumber },
        });

        call.on('accept', () => {
          forceUnmuteCall(call);
          setStatus('busy');
        });
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
    },
    [options, ensureMicrophoneAccess, forceUnmuteCall]
  );

  const acceptIncoming = useCallback(async () => {
    if (!incomingCall) return;
    try {
      await ensureMicrophoneAccess();
      incomingCall.accept();
      forceUnmuteCall(incomingCall);
    } catch (err) {
      console.error('[TwilioVoice] acceptIncoming error:', err);
      setError(
        err?.name === 'NotFoundError'
          ? 'No microphone device found. Connect/enable a microphone and allow browser microphone access.'
          : err?.message || String(err)
      );
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
  }, [incomingCall, options, ensureMicrophoneAccess, forceUnmuteCall]);

  const rejectIncoming = useCallback(() => {
    if (!incomingCall) return;
    incomingCall.reject();
    setIncomingCall(null);
    setStatus('ready');
  }, [incomingCall]);

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
