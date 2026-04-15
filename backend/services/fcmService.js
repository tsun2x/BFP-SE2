import admin from "firebase-admin";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { supabase } from "../supabaseClient.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ── Initialize Firebase Admin SDK ────────────────────────────────────
let firebaseInitialized = false;

try {
  const serviceAccountPath = join(
    __dirname,
    "../config/firebase-service-account.json",
  );
  const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, "utf8"));

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });

  firebaseInitialized = true;
  console.log("[FCM] Firebase Admin SDK initialized successfully");
} catch (err) {
  console.error(
    "[FCM] Failed to initialize Firebase Admin SDK:",
    err.message,
  );
  console.warn(
    "[FCM] Push notifications will NOT work. Ensure config/firebase-service-account.json exists.",
  );
}

// ── Register / update a device's FCM token ───────────────────────────
// Stores the token in the `fcm_tokens` table keyed by (user_id, device_id).
export async function registerFcmToken({
  userId,
  fcmToken,
  deviceId,
  platform = "android",
  twilioIdentity = null,
}) {
  if (!userId || !fcmToken) {
    console.warn("[FCM] registerFcmToken: missing userId or fcmToken");
    return false;
  }

  try {
    const { error } = await supabase.from("fcm_tokens").upsert(
      {
        user_id: userId,
        fcm_token: fcmToken,
        device_id: deviceId || `${platform}_${userId}`,
        platform,
        twilio_identity: twilioIdentity,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,device_id" },
    );

    if (error) throw error;

    console.log(
      `[FCM] Registered token for user ${userId} (identity=${twilioIdentity})`,
    );
    return true;
  } catch (err) {
    console.error("[FCM] Failed to register token:", err.message);
    return false;
  }
}

// ── Look up FCM tokens by Twilio identity ────────────────────────────
export async function getFcmTokensByIdentity(twilioIdentity) {
  if (!twilioIdentity) return [];

  try {
    const { data, error } = await supabase
      .from("fcm_tokens")
      .select("fcm_token, platform, user_id")
      .eq("twilio_identity", twilioIdentity)
      .order("updated_at", { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error(
      `[FCM] Failed to look up tokens for ${twilioIdentity}:`,
      err.message,
    );
    return [];
  }
}

// ── Look up FCM tokens by user ID ────────────────────────────────────
export async function getFcmTokensByUserId(userId) {
  if (!userId) return [];

  try {
    const { data, error } = await supabase
      .from("fcm_tokens")
      .select("fcm_token, platform, twilio_identity")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error(
      `[FCM] Failed to look up tokens for userId ${userId}:`,
      err.message,
    );
    return [];
  }
}

// ── Send incoming-call push notification to a Twilio identity ────────
// This is the core function: when a Twilio call targets a mobile user,
// we send an FCM data message so the app can wake up and connect.
export async function sendIncomingCallNotification({
  targetIdentity,
  callerIdentity,
  callSid,
  callerName = "Unknown",
}) {
  if (!firebaseInitialized) {
    console.warn(
      "[FCM] Firebase not initialized — cannot send push notification",
    );
    return { sent: false, reason: "firebase_not_initialized" };
  }

  const tokens = await getFcmTokensByIdentity(targetIdentity);

  if (tokens.length === 0) {
    console.log(
      `[FCM] No FCM tokens found for identity ${targetIdentity} — call will only ring on active devices`,
    );
    return { sent: false, reason: "no_tokens" };
  }

  const fcmTokenStrings = tokens.map((t) => t.fcm_token);

  // Data-only message (no notification key) so the app handles display
  const message = {
    data: {
      type: "incoming_call",
      callSid: callSid || "",
      callerIdentity: callerIdentity || "",
      callerName: callerName || "Unknown",
      targetIdentity: targetIdentity || "",
      timestamp: Date.now().toString(),
    },
    android: {
      priority: "high",
      ttl: 30000, // 30 seconds — call invites are time-sensitive
    },
  };

  let successCount = 0;
  let failureCount = 0;
  const invalidTokens = [];

  // Send to each token individually (Firebase v1 API)
  for (const token of fcmTokenStrings) {
    try {
      await admin.messaging().send({ ...message, token });
      successCount++;
    } catch (err) {
      failureCount++;
      console.error(
        `[FCM] Failed to send to token ${token.slice(0, 20)}...:`,
        err.message,
      );
      // Clean up invalid tokens
      if (
        err.code === "messaging/registration-token-not-registered" ||
        err.code === "messaging/invalid-registration-token"
      ) {
        invalidTokens.push(token);
      }
    }
  }

  // Remove invalid tokens from DB
  if (invalidTokens.length > 0) {
    try {
      await supabase
        .from("fcm_tokens")
        .delete()
        .in("fcm_token", invalidTokens);
      console.log(`[FCM] Cleaned up ${invalidTokens.length} invalid tokens`);
    } catch (cleanupErr) {
      console.warn("[FCM] Token cleanup failed:", cleanupErr.message);
    }
  }

  console.log(
    `[FCM] Incoming call notification for ${targetIdentity}: ${successCount} sent, ${failureCount} failed`,
  );

  return {
    sent: successCount > 0,
    successCount,
    failureCount,
    totalTokens: fcmTokenStrings.length,
  };
}

// ── Send a generic data notification ─────────────────────────────────
export async function sendDataNotification({ targetIdentity, data }) {
  if (!firebaseInitialized) return { sent: false, reason: "not_initialized" };

  const tokens = await getFcmTokensByIdentity(targetIdentity);
  if (tokens.length === 0) return { sent: false, reason: "no_tokens" };

  let successCount = 0;

  for (const t of tokens) {
    try {
      await admin.messaging().send({
        token: t.fcm_token,
        data: { ...data, timestamp: Date.now().toString() },
        android: { priority: "high" },
      });
      successCount++;
    } catch (err) {
      console.error("[FCM] Data notification send error:", err.message);
    }
  }

  return { sent: successCount > 0, successCount };
}

export { firebaseInitialized };
