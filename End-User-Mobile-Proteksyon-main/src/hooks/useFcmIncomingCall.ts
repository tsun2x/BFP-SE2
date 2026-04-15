import { useEffect, useRef, useCallback } from "react";
import { Platform } from "react-native";
import messaging from "@react-native-firebase/messaging";
import { API_URL } from "../config";

/**
 * useFcmIncomingCall — Registers FCM token with the backend and listens
 * for incoming-call push notifications. When one arrives, it calls
 * `onIncomingCall` so the parent can trigger the Twilio Voice SDK.
 *
 * @param authToken   JWT token for backend API calls
 * @param twilioIdentity  e.g. "CIV_639171234567"
 * @param onIncomingCall  callback when a push-based incoming call arrives
 */
export default function useFcmIncomingCall(
  authToken: string | null,
  twilioIdentity: string | null,
  onIncomingCall?: (data: {
    callSid: string;
    callerIdentity: string;
    callerName: string;
  }) => void,
) {
  const registeredRef = useRef(false);

  // ── Register FCM token with backend ─────────────────────────────────
  const registerToken = useCallback(async () => {
    if (!authToken || !twilioIdentity || registeredRef.current) return;

    try {
      const authStatus = await messaging().requestPermission();
      const enabled =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;

      if (!enabled) {
        console.warn("[FCM] Notification permission not granted");
        return;
      }

      const fcmToken = await messaging().getToken();
      if (!fcmToken) {
        console.warn("[FCM] Failed to get FCM token");
        return;
      }

      console.log("[FCM] Got FCM token:", fcmToken.slice(0, 30) + "...");

      const res = await fetch(`${API_URL}/api/fcm/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          fcmToken,
          platform: Platform.OS,
          twilioIdentity,
        }),
      });

      if (res.ok) {
        registeredRef.current = true;
        console.log("[FCM] Token registered with backend successfully");
      } else {
        const text = await res.text().catch(() => "");
        console.error("[FCM] Token registration failed:", res.status, text);
      }
    } catch (err: any) {
      console.error("[FCM] Token registration error:", err?.message || err);
    }
  }, [authToken, twilioIdentity]);

  useEffect(() => {
    registerToken();
  }, [registerToken]);

  useEffect(() => {
    const unsubscribe = messaging().onTokenRefresh(async (newToken) => {
      if (!authToken || !twilioIdentity) return;
      console.log("[FCM] Token refreshed, re-registering...");
      registeredRef.current = false;

      try {
        await fetch(`${API_URL}/api/fcm/register`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({
            fcmToken: newToken,
            platform: Platform.OS,
            twilioIdentity,
          }),
        });
        registeredRef.current = true;
        console.log("[FCM] Refreshed token registered");
      } catch (err: any) {
        console.error("[FCM] Refreshed token registration error:", err?.message);
      }
    });

    return () => unsubscribe();
  }, [authToken, twilioIdentity]);

  useEffect(() => {
    const unsubForeground = messaging().onMessage(async (remoteMessage) => {
      const data = remoteMessage.data;
      if (data?.type === "incoming_call" && onIncomingCall) {
        console.log("[FCM] Incoming call notification (foreground):", data);
        onIncomingCall({
          callSid: String(data.callSid || ""),
          callerIdentity: String(data.callerIdentity || ""),
          callerName: String(data.callerName || "Unknown"),
        });
      }
    });

    messaging().onNotificationOpenedApp((remoteMessage) => {
      const data = remoteMessage.data;
      if (data?.type === "incoming_call" && onIncomingCall) {
        console.log("[FCM] Incoming call notification (background tap):", data);
        onIncomingCall({
          callSid: String(data.callSid || ""),
          callerIdentity: String(data.callerIdentity || ""),
          callerName: String(data.callerName || "Unknown"),
        });
      }
    });

    messaging().setBackgroundMessageHandler(async (remoteMessage) => {
      const data = remoteMessage.data;
      console.log("[FCM] Background message:", data);
    });

    return () => unsubForeground();
  }, [onIncomingCall]);

  return { registerToken };
}
