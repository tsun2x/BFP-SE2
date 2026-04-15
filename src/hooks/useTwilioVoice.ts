import { useState, useEffect, useRef, useCallback } from 'react';
import { Platform, PermissionsAndroid } from 'react-native';
import { Voice, Call } from '@twilio/voice-react-native-sdk';
import { API_URL } from '../config';

type VoiceStatus = 'offline' | 'registering' | 'ready' | 'busy';

export default function useTwilioVoice(identity: string | null, authToken: string | null) {
  const [status, setStatus] = useState<VoiceStatus>('offline');
  const [activeCall, setActiveCall] = useState<any>(null);
  const [incomingInvite, setIncomingInvite] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [initAttempt, setInitAttempt] = useState<number>(0);

  const voiceRef = useRef<any>(null);
  const activeCallRef = useRef<any>(null);

  const fetchToken = useCallback(async (): Promise<string | null> => {
    if (!identity || !authToken) return null;

    try {
      const res = await fetch(`${API_URL}/api/twilio/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
          'ngrok-skip-browser-warning': 'true',
        },
        body: JSON.stringify({ identity }),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        const snippet = text ? ` (${text.slice(0, 120)})` : '';
        throw new Error(`Token request failed: ${res.status}${snippet}`);
      }

      const data = await res.json();
      return data.token as string;
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch Twilio token');
      return null;
    }
  }, [identity, authToken]);

  const retryInit = useCallback(() => {
    setError(null);
    setInitAttempt((v) => v + 1);
  }, []);

  const attachCallHandlers = useCallback((call: any) => {
    if (!call) return;

    call.on(Call.Event.Connected, () => {
      setStatus('busy');
    });

    call.on(Call.Event.Disconnected, () => {
      activeCallRef.current = null;
      setActiveCall(null);
      setStatus('ready');
    });

    call.on(Call.Event.ConnectFailure, () => {
      activeCallRef.current = null;
      setActiveCall(null);
      setStatus('ready');
      setError('Call connection failed');
    });
  }, []);

  useEffect(() => {
    if (!identity || !authToken) return;

    let cancelled = false;

    const init = async () => {
      setStatus('registering');

      const token = await fetchToken();
      if (!token || cancelled) {
        if (!cancelled) setStatus('offline');
        return;
      }

      try {
        const voice = new Voice();
        voiceRef.current = voice;

        await voice.register(token);

        const callInviteEvent = (Voice as any)?.Event?.CallInvite;
        if (callInviteEvent && typeof (voice as any).on === 'function') {
          (voice as any).on(callInviteEvent, (invite: any) => {
            setIncomingInvite(invite);
            setStatus('busy');
            setError(null);
          });
        }

        if (!cancelled) {
          setStatus('ready');
        }
      } catch (err: any) {
        if (!cancelled) {
          const raw = err?.message || 'Twilio init failed';
          if (String(raw).toLowerCase().includes('firebase')) {
            setError(
              'Twilio init failed: Firebase is not initialized for mobile-firetruck-expo. Add a valid google-services.json for package com.bfp.mobilefiretruckexpo and rebuild the dev client.',
            );
          } else {
            setError(raw);
          }
          setStatus('offline');
        }
      }
    };

    init();

    return () => {
      cancelled = true;
      if (voiceRef.current) {
        try {
          voiceRef.current.unregister().catch(() => {});
        } catch {
          // ignore cleanup errors
        }
      }
      voiceRef.current = null;
      activeCallRef.current = null;
      setActiveCall(null);
      setIncomingInvite(null);
      setStatus('offline');
    };
  }, [identity, authToken, fetchToken, initAttempt]);

  const makeCall = useCallback(
    async (toIdentity: string): Promise<boolean> => {
      if (!voiceRef.current) {
        setError('Voice SDK not ready');
        return false;
      }

      const token = await fetchToken();
      if (!token) return false;

      try {
        if (Platform.OS === 'android') {
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
            {
              title: 'Microphone Permission',
              message: 'Microphone access is required for Twilio calls.',
              buttonPositive: 'Allow',
            },
          );

          if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
            setError('Microphone permission denied');
            return false;
          }
        }

        if (activeCallRef.current) {
          try {
            activeCallRef.current.disconnect();
          } catch {
            // ignore
          }
          activeCallRef.current = null;
          setActiveCall(null);
        }

        const call = await voiceRef.current.connect(token, {
          params: { To: toIdentity },
        });

        attachCallHandlers(call);

        activeCallRef.current = call;
        setActiveCall(call);
        setStatus('busy');
        return true;
      } catch (err: any) {
        setError(err?.message || 'Failed to start Twilio call');
        return false;
      }
    },
    [fetchToken, attachCallHandlers],
  );

  const acceptIncoming = useCallback(async (): Promise<boolean> => {
    if (!incomingInvite) return false;

    try {
      const call = await incomingInvite.accept();
      setIncomingInvite(null);
      attachCallHandlers(call);
      activeCallRef.current = call;
      setActiveCall(call);
      setStatus('busy');
      return true;
    } catch (err: any) {
      setError(err?.message || 'Failed to accept incoming call');
      return false;
    }
  }, [incomingInvite, attachCallHandlers]);

  const rejectIncoming = useCallback(() => {
    if (!incomingInvite) return;
    try {
      incomingInvite.reject();
    } catch {
      // ignore
    }
    setIncomingInvite(null);
    if (!activeCallRef.current) {
      setStatus('ready');
    }
  }, [incomingInvite]);

  const hangUp = useCallback(() => {
    if (activeCallRef.current) {
      try {
        activeCallRef.current.disconnect();
      } catch {
        // ignore
      }
      activeCallRef.current = null;
      setActiveCall(null);
      setStatus('ready');
    }
  }, []);

  return {
    status,
    activeCall,
    incomingInvite,
    makeCall,
    acceptIncoming,
    rejectIncoming,
    hangUp,
    error,
    retryInit,
  };
}
