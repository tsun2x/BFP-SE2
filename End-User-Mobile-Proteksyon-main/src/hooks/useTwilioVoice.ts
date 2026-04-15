import { useState, useEffect, useRef, useCallback } from "react";
import { Platform, PermissionsAndroid } from "react-native";
import { Voice, Call } from "@twilio/voice-react-native-sdk";
import { NODE_API_URL } from "../config";

// We check the native bridge on every init attempt rather than caching
// a module-level flag, so a dev-build restart always gets a fresh try.

/**
 * useTwilioVoice — React Native hook for Twilio Voice SDK.
 *
 * @param identity  Twilio Client identity (e.g. "CIV_123")
 * @param authToken JWT token for the backend /api/twilio/token endpoint
 */
export default function useTwilioVoice(
  identity: string | null,
  authToken: string | null,
) {
  const [status, setStatus] = useState<
    "offline" | "registering" | "ready" | "busy"
  >("offline");
  const [activeCall, setActiveCall] = useState<any>(null);
  const [incomingInvite, setIncomingInvite] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaker, setIsSpeaker] = useState(false);
  const voiceRef = useRef<any>(null);
  const activeCallRef = useRef<any>(null);

  const requestAndroidVoicePermissions = useCallback(async () => {
    if (Platform.OS !== "android") {
      return true;
    }

    const permissions = [PermissionsAndroid.PERMISSIONS.RECORD_AUDIO];
    const androidVersion = Number(Platform.Version);

    if (
      androidVersion >= 33 &&
      PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
    ) {
      permissions.push(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
    }

    const results = await PermissionsAndroid.requestMultiple(permissions);
    const micGranted =
      results[PermissionsAndroid.PERMISSIONS.RECORD_AUDIO] ===
      PermissionsAndroid.RESULTS.GRANTED;

    if (!micGranted) {
      setError("Microphone permission denied");
      return false;
    }

    if (
      androidVersion >= 33 &&
      PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS &&
      results[PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS] !==
        PermissionsAndroid.RESULTS.GRANTED
    ) {
      setError("Notification permission denied. Locked-screen calls may stop.");
      return false;
    }

    return true;
  }, []);

  // Log on every render so we know the hook is alive
  console.log(
    `[TwilioVoice] Hook render — identity: ${identity}, authToken: ${authToken ? "YES" : "NULL"}, status: ${status}`,
  );

  // ── Fetch Twilio access token from backend ────────────────────────
  const fetchToken = useCallback(async (): Promise<string | null> => {
    if (!identity) {
      console.warn("[TwilioVoice] fetchToken skipped — no identity");
      return null;
    }
    // CIV_ identities can fetch without JWT auth; admin identities need authToken
    const isCivilian = identity.startsWith("CIV_");
    if (!isCivilian && !authToken) {
      console.warn(
        "[TwilioVoice] fetchToken skipped — non-civilian without authToken",
      );
      return null;
    }
    try {
      const url = `${NODE_API_URL}/api/twilio/token`;
      console.log(
        "[TwilioVoice] Fetching token from:",
        url,
        "identity:",
        identity,
      );
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "ngrok-skip-browser-warning": "true",
      };
      if (authToken) {
        headers["Authorization"] = `Bearer ${authToken}`;
      }
      const res = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify({ identity }),
      });
      console.log("[TwilioVoice] Token response status:", res.status);
      if (!res.ok) {
        const text = await res.text();
        console.error(
          "[TwilioVoice] Token response body:",
          text.substring(0, 200),
        );
        throw new Error(`Token request failed: ${res.status}`);
      }
      const data = await res.json();
      console.log("[TwilioVoice] Token received, length:", data.token?.length);
      return data.token as string;
    } catch (err: any) {
      console.error("[TwilioVoice] Token fetch error:", err);
      setError(err.message);
      return null;
    }
  }, [identity, authToken]);

  // ── Initialize Voice SDK and register ─────────────────────────────
  useEffect(() => {
    // CIV_ identities can init without JWT (backend allows unauthenticated CIV_ token requests)
    const isCivilian = identity?.startsWith("CIV_");
    if (!identity || (!isCivilian && !authToken)) {
      console.warn(
        "[TwilioVoice] Skipping init — identity:",
        identity,
        "authToken:",
        !!authToken,
      );
      return;
    }

    let cancelled = false;

    const init = async () => {
      console.log("[TwilioVoice] Starting init for identity:", identity);
      setStatus("registering");

      const permissionsGranted = await requestAndroidVoicePermissions();
      if (!permissionsGranted || cancelled) {
        console.warn(
          "[TwilioVoice] Init aborted — permissions:",
          permissionsGranted,
          "cancelled:",
          cancelled,
        );
        if (!cancelled) {
          setStatus("offline");
        }
        return;
      }

      const token = await fetchToken();
      if (!token || cancelled) {
        console.warn(
          "[TwilioVoice] Init aborted — token:",
          !!token,
          "cancelled:",
          cancelled,
        );
        if (!token && !cancelled) setStatus("offline");
        return;
      }

      try {
        console.log("[TwilioVoice] Creating Voice instance...");
        const voice = new Voice();
        voiceRef.current = voice;
        console.log("[TwilioVoice] Voice instance created, registering...");

        // Register for incoming calls
        await voice.register(token);
        if (!cancelled) {
          setStatus("ready");
          console.log(
            `[TwilioVoice] ✅ Registered as ${identity} — VoIP READY`,
          );
        }

        // Handle incoming calls
        voice.on(Voice.Event.CallInvite, (callInvite) => {
          console.log("[TwilioVoice] Incoming call invite:", callInvite);
          if (!cancelled) {
            setIncomingInvite(callInvite);
            setStatus("busy");
          }
        });
      } catch (err: any) {
        console.error(
          "[TwilioVoice] Init catch — error:",
          err?.message,
          "code:",
          err?.code,
        );
        if (
          err?.message?.includes("null") ||
          err?.message?.includes("voice_register") ||
          err?.message?.includes("NativeModule")
        ) {
          console.warn(
            "[TwilioVoice] ❌ Native bridge unavailable. VoIP disabled for this session.",
          );
        } else {
          console.error("[TwilioVoice] Init error (non-bridge):", err);
        }
        if (!cancelled) {
          setError(err?.message || "VoIP initialization failed");
          setStatus("offline");
        }
      }
    };

    init();

    return () => {
      cancelled = true;
      if (voiceRef.current) {
        try {
          voiceRef.current.unregister().catch(() => {});
        } catch {}
        voiceRef.current = null;
      }
      setStatus("offline");
    };
  }, [identity, authToken, fetchToken, requestAndroidVoicePermissions]);

  // ── Make outbound VoIP call to a Twilio Client identity ───────────
  const makeCall = useCallback(
    async (toIdentity: string): Promise<any> => {
      console.log(
        "[TwilioVoice] makeCall called → To:",
        toIdentity,
        "voiceRef:",
        !!voiceRef.current,
        "status:",
        status,
      );

      // Wait up to 8 seconds for the Voice SDK to finish initializing.
      // voiceRef is a ref so it always reflects the latest value even
      // inside this async closure, unlike React state.
      if (!voiceRef.current) {
        console.log(
          "[TwilioVoice] SDK not ready yet — waiting up to 8 s for init…",
        );
        const maxWaitMs = 8000;
        const pollMs = 300;
        let waited = 0;
        while (!voiceRef.current && waited < maxWaitMs) {
          await new Promise((r) => setTimeout(r, pollMs));
          waited += pollMs;
        }
        console.log(
          `[TwilioVoice] Waited ${waited}ms — voiceRef ready: ${!!voiceRef.current}`,
        );
      }

      if (!voiceRef.current) {
        console.error(
          "[TwilioVoice] makeCall ABORTED — Voice SDK not ready after waiting",
        );
        setError("Voice SDK not ready");
        return null;
      }

      const token = await fetchToken();
      if (!token) {
        console.error("[TwilioVoice] makeCall ABORTED — no token");
        return null;
      }

      try {
        const permissionsGranted = await requestAndroidVoicePermissions();
        if (!permissionsGranted) {
          console.warn(
            "[TwilioVoice] makeCall ABORTED — required Android permissions not granted",
          );
          return null;
        }

        // Disconnect any existing call before starting a new one (failover scenario)
        if (activeCallRef.current) {
          console.log(
            "[TwilioVoice] Disconnecting previous call before new one",
          );
          try {
            activeCallRef.current.disconnect();
          } catch (e) {}
          activeCallRef.current = null;
          setActiveCall(null);
        }

        console.log("[TwilioVoice] Calling voice.connect() → To:", toIdentity);
        const call = await voiceRef.current.connect(token, {
          params: { To: toIdentity },
        });
        console.log(
          "[TwilioVoice] voice.connect() returned call object:",
          !!call,
        );

        call.on(Call.Event.Connected, () => {
          console.log("[TwilioVoice] ✅ Call CONNECTED — two-way audio active");
          setStatus("busy");
        });

        call.on(Call.Event.Disconnected, () => {
          console.log("[TwilioVoice] Call disconnected");
          activeCallRef.current = null;
          setActiveCall(null);
          setStatus("ready");
        });

        call.on(Call.Event.ConnectFailure, (err) => {
          console.error("[TwilioVoice] ❌ Call connect FAILURE:", err);
          setActiveCall(null);
          setStatus("ready");
          setError("Call connection failed");
        });

        activeCallRef.current = call;
        setActiveCall(call);
        setStatus("busy");
        return call;
      } catch (err: any) {
        console.error("[TwilioVoice] makeCall error:", err);
        setError(err.message);
        return null;
      }
    },
    [fetchToken, requestAndroidVoicePermissions, status],
  );

  // ── Hang up active call ───────────────────────────────────────────
  const hangUp = useCallback(() => {
    const call = activeCallRef.current;
    if (call) {
      call.disconnect();
      activeCallRef.current = null;
      setActiveCall(null);
      setStatus("ready");
      setIsMuted(false);
      setIsSpeaker(false);
    }
  }, []);

  // ── Toggle mute ───────────────────────────────────────────────────
  const toggleMute = useCallback(async () => {
    const call = activeCallRef.current;
    if (!call) return;
    try {
      const newMuted = !isMuted;
      call.mute(newMuted);
      const actualMuted =
        typeof call.isMuted === "function" ? Boolean(call.isMuted()) : newMuted;
      setIsMuted(actualMuted);
      console.log(`[TwilioVoice] Mute toggled: requested=${newMuted} actual=${actualMuted}`);
    } catch (err: any) {
      console.warn("[TwilioVoice] Mute toggle failed:", err);
    }
  }, [isMuted]);

  // ── Toggle speaker ────────────────────────────────────────────────
  const toggleSpeaker = useCallback(async () => {
    const call = activeCallRef.current;
    const voice = voiceRef.current;
    if (!voice || !call) return;
    try {
      const { audioDevices } = await voice.getAudioDevices();
      const newSpeaker = !isSpeaker;
      const normalizedTargetType = newSpeaker ? "speaker" : "earpiece";
      const target = audioDevices.find(
        (d: any) =>
          String(d?.type).toLowerCase() === normalizedTargetType ||
          (newSpeaker ? d?.type === 1 : d?.type === 0),
      );
      if (target) {
        await target.select();
        setIsSpeaker(newSpeaker);
        console.log(`[TwilioVoice] Speaker toggled: ${newSpeaker}`);
      } else {
        // Do not fake-success in UI when no route was actually switched.
        console.warn(
          "[TwilioVoice] Audio device not found for speaker toggle",
          audioDevices,
        );
      }
    } catch (err: any) {
      console.warn("[TwilioVoice] Speaker toggle failed:", err);
    }
  }, [isSpeaker]);

  const acceptIncoming = useCallback(async (): Promise<any> => {
    if (!incomingInvite) return null;
    try {
      const call = await incomingInvite.accept();
      setIncomingInvite(null);

      call.on(Call.Event.Connected, () => setStatus("busy"));
      call.on(Call.Event.Disconnected, () => {
        activeCallRef.current = null;
        setActiveCall(null);
        setStatus("ready");
      });

      activeCallRef.current = call;
      setActiveCall(call);
      setStatus("busy");
      return call;
    } catch (err: any) {
      setError(err?.message || "Failed to accept incoming call");
      return null;
    }
  }, [incomingInvite]);

  const rejectIncoming = useCallback(() => {
    if (!incomingInvite) return;
    try {
      incomingInvite.reject();
    } catch {}
    setIncomingInvite(null);
    if (!activeCallRef.current) setStatus("ready");
  }, [incomingInvite]);

  return {
    status,
    activeCall,
    incomingInvite,
    makeCall,
    hangUp,
    acceptIncoming,
    rejectIncoming,
    toggleMute,
    toggleSpeaker,
    isMuted,
    isSpeaker,
    error,
  };
}
