import express from "express";
import { authenticateToken } from "../middleware/auth.js";
import { registerFcmToken } from "../services/fcmService.js";

const router = express.Router();

// ── POST /api/fcm/register ───────────────────────────────────────────
// Mobile apps call this after login to register their FCM device token.
// Body: { fcmToken, deviceId?, platform?, twilioIdentity? }
router.post("/fcm/register", authenticateToken, async (req, res) => {
  try {
    const { fcmToken, deviceId, platform, twilioIdentity } = req.body;

    if (!fcmToken) {
      return res.status(400).json({ message: "fcmToken is required" });
    }

    const userId = req.user.id || req.user.user_id;
    if (!userId) {
      return res.status(400).json({ message: "User ID not found in token" });
    }

    const success = await registerFcmToken({
      userId,
      fcmToken,
      deviceId: deviceId || `${platform || "android"}_${userId}`,
      platform: platform || "android",
      twilioIdentity: twilioIdentity || null,
    });

    if (success) {
      res.json({ success: true, message: "FCM token registered" });
    } else {
      res.status(500).json({ success: false, message: "Failed to register FCM token" });
    }
  } catch (error) {
    console.error("[FCM Route] Register error:", error);
    res.status(500).json({ message: "Failed to register FCM token", error: error.message });
  }
});

export default router;
