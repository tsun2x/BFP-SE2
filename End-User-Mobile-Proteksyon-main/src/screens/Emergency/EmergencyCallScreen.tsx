import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Alert,
  ScrollView,
  Animated,
  Vibration,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Location from "expo-location";
import * as ImagePicker from "expo-image-picker";
import { io as ioClient } from "socket.io-client/dist/socket.io.js";
import { useNavigation, useRoute } from "@react-navigation/native";
import { NODE_API_URL, TEST_CALLER_PHONE } from "../../config";
import useTwilioVoice from "../../hooks/useTwilioVoice";
import useFcmIncomingCall from "../../hooks/useFcmIncomingCall";
import { useAuth } from "../../context/AuthContext";
import { useUiPreferences } from "../../context/UiPreferencesContext";
import { supabase } from "../../utils/supabaseClient";

// Call state type
type CallPhase =
  | "idle"
  | "confirming"
  | "locating"
  | "sending"
  | "dialing"
  | "ringing"
  | "redirecting"
  | "connected"
  | "ended"
  | "error";

export const EmergencyCallScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { fontScale, palette } = useUiPreferences();
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [emergencyDescription, setEmergencyDescription] = useState("");

  // Calling UI state
  const [callPhase, setCallPhase] = useState<CallPhase>("idle");
  const callPhaseRef = useRef<CallPhase>("idle");
  // Keep ref in sync so socket handlers always see the latest phase
  useEffect(() => {
    callPhaseRef.current = callPhase;
  }, [callPhase]);
  const [showCallingScreen, setShowCallingScreen] = useState(false);
  const [dispatchedStation, setDispatchedStation] = useState<number | null>(
    null,
  );
  const [dispatchedStationName, setDispatchedStationName] = useState<
    string | null
  >(null);
  const [callTimer, setCallTimer] = useState(0);
  const [callError, setCallError] = useState<string | null>(null);
  const [incidentPhotoUri, setIncidentPhotoUri] = useState<string | null>(null);
  const [incidentPhotoDataUrl, setIncidentPhotoDataUrl] = useState<
    string | null
  >(null);
  const [isUploadingEvidence, setIsUploadingEvidence] = useState(false);
  const [evidenceStatus, setEvidenceStatus] = useState<string | null>(null);
  const [pendingEvidenceUri, setPendingEvidenceUri] = useState<string | null>(
    null,
  );
  const [pendingEvidenceFileName, setPendingEvidenceFileName] =
    useState<string>("photo.jpg");
  const [pendingEvidenceType, setPendingEvidenceType] =
    useState<string>("image/jpeg");
  const [postCallCountdown, setPostCallCountdown] = useState<number>(0);
  const postCallAlarmIdRef = useRef<number | null>(null);
  const postCallTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const socketRef = useRef<any>(null);
  const alarmIdRef = useRef<number | null>(null);
  const voipHangUpRef = useRef<() => void>(() => {});
  const failoverRedirectTimeoutRef = useRef<ReturnType<
    typeof setTimeout
  > | null>(null);
  const retryDialTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const isEndingCallRef = useRef(false);
  const callSessionRef = useRef(0);
  const activeVoipCallRef = useRef<any>(null);
  const lastDialedIdentityRef = useRef<string | null>(null);
  const stationAcceptedRef = useRef(false);

  // Twilio Voice SDK for VoIP calls — identity + JWT from auth context
  const { token: jwtToken, user: authUser } = useAuth();
  const civilianPhone = authUser?.phone || TEST_CALLER_PHONE;
  const civilianIdentity = `CIV_${civilianPhone.replace(/[^0-9]/g, "")}`;
  const {
    status: voipStatus,
    activeCall,
    makeCall: voipCall,
    hangUp: voipHangUp,
    toggleMute,
    toggleSpeaker,
    isMuted,
    isSpeaker,
    error: voipError,
  } = useTwilioVoice(civilianIdentity, jwtToken);

  useEffect(() => {
    activeVoipCallRef.current = activeCall;
  }, [activeCall]);

  // Register FCM token for push-based incoming call notifications
  useFcmIncomingCall(jwtToken, civilianIdentity, (callData) => {
    console.log("[EmergencyCall] FCM incoming call push:", callData);
  });

  // Keep ref up-to-date so socket closures always have the latest hangUp
  useEffect(() => {
    voipHangUpRef.current = voipHangUp;
  }, [voipHangUp]);

  // Diagnostic: log auth + VoIP state
  useEffect(() => {
    console.log(
      `[EmergencyCall] AUTH: jwtToken=${jwtToken ? "YES(" + jwtToken.length + ")" : "NULL"}, user=${authUser?.phone || "null"}, civilianIdentity=${civilianIdentity}`,
    );
    console.log(
      `[EmergencyCall] VOIP: status=${voipStatus}, error=${voipError || "none"}`,
    );
  }, [jwtToken, voipStatus, voipError]);

  const clearPendingCallTimeouts = () => {
    if (failoverRedirectTimeoutRef.current) {
      clearTimeout(failoverRedirectTimeoutRef.current);
      failoverRedirectTimeoutRef.current = null;
    }
    if (retryDialTimeoutRef.current) {
      clearTimeout(retryDialTimeoutRef.current);
      retryDialTimeoutRef.current = null;
    }
  };

  const goHome = () => {
    navigation.navigate("Home");
  };

  const buildDispatcherIdentity = (
    stationId: number | string | null | undefined,
    officerId?: number | string | null,
  ) => {
    const normalizedOfficerId = Number(officerId || 0) || null;

    if (stationId === "main") {
      return normalizedOfficerId
        ? `ADM_MAIN_${normalizedOfficerId}`
        : "ADM_MAIN";
    }

    const normalizedStationId = Number(stationId || 0) || null;
    if (!normalizedStationId) {
      return null;
    }

    return normalizedOfficerId
      ? `ADM_SUB_${normalizedStationId}_${normalizedOfficerId}`
      : `ADM_SUB_${normalizedStationId}`;
  };

  const placeVoipCall = async (
    targetIdentity: string,
    sessionId = callSessionRef.current,
  ): Promise<boolean> => {
    if (isEndingCallRef.current || sessionId !== callSessionRef.current) {
      return false;
    }

    lastDialedIdentityRef.current = targetIdentity;
    setCallError(null);
    setCallPhase("dialing");

    const firstAttempt = await voipCall(targetIdentity);
    if (isEndingCallRef.current || sessionId !== callSessionRef.current) {
      return false;
    }

    if (firstAttempt) {
      setCallPhase("ringing");
      return true;
    }

    setCallError("Voice line failed to connect. Retrying...");
    const retryAttempt = await voipCall(targetIdentity);
    if (isEndingCallRef.current || sessionId !== callSessionRef.current) {
      return false;
    }

    if (retryAttempt) {
      setCallError(null);
      setCallPhase("ringing");
      return true;
    }

    setCallPhase("error");
    setCallError(
      "Unable to establish Twilio voice call to station. Please try again.",
    );
    return false;
  };

  const POST_CALL_EVIDENCE_WINDOW_SECONDS = 300; // 5 minutes

  const dismissPostCallScreen = () => {
    if (postCallTimerRef.current) {
      clearInterval(postCallTimerRef.current);
      postCallTimerRef.current = null;
    }
    postCallAlarmIdRef.current = null;
    alarmIdRef.current = null;
    setPostCallCountdown(0);
    setShowCallingScreen(false);
    setCallPhase("idle");
    setDispatchedStation(null);
    setDispatchedStationName(null);
    setCallError(null);
    setEvidenceStatus(null);
    isEndingCallRef.current = false;
    goHome();
  };

  const finalizeCallUi = () => {
    clearPendingCallTimeouts();
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    // Preserve alarmId so post-call evidence uploads can still target this incident
    postCallAlarmIdRef.current = alarmIdRef.current;
    stationAcceptedRef.current = false;
    setCallPhase("ended");

    // Start 5-minute countdown for post-call evidence upload window
    setPostCallCountdown(POST_CALL_EVIDENCE_WINDOW_SECONDS);
    if (postCallTimerRef.current) clearInterval(postCallTimerRef.current);
    postCallTimerRef.current = setInterval(() => {
      setPostCallCountdown((prev) => {
        if (prev <= 1) {
          dismissPostCallScreen();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleCancelConfirmation = () => {
    setShowConfirmModal(false);
    setCallPhase("idle");
    goHome();
  };

  const terminateCallSession = ({
    emitCancel = false,
  }: { emitCancel?: boolean } = {}) => {
    if (isEndingCallRef.current) return;

    isEndingCallRef.current = true;
    callSessionRef.current += 1;
    clearPendingCallTimeouts();
    lastDialedIdentityRef.current = null;

    if (emitCancel && socketRef.current && alarmIdRef.current) {
      socketRef.current.emit("call-cancelled", {
        alarmId: alarmIdRef.current,
        stationId: dispatchedStation || null,
        stationName: dispatchedStationName || null,
      });
      console.log(
        "[EndCall] Emitted call-cancelled for alarm",
        alarmIdRef.current,
      );
    }

    try {
      voipHangUpRef.current();
    } catch (error) {
      console.warn("[EndCall] Twilio hangUp error:", error);
    }

    if (emitCancel && socketRef.current?.connected) {
      setTimeout(() => {
        finalizeCallUi();
      }, 200);
      return;
    }

    finalizeCallUi();
  };

  // Pulse animation for the calling screen
  useEffect(() => {
    if (
      showCallingScreen &&
      (callPhase === "dialing" ||
        callPhase === "ringing" ||
        callPhase === "redirecting")
    ) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.3,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ]),
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [showCallingScreen, callPhase]);

  // Call timer when connected
  useEffect(() => {
    if (callPhase === "connected") {
      setCallTimer(0);
      timerRef.current = setInterval(() => setCallTimer((t) => t + 1), 1000);
      return () => {
        if (timerRef.current) clearInterval(timerRef.current);
      };
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
  }, [callPhase]);

  // Watch VoIP activeCall drop — only transition from connected → ended
  useEffect(() => {
    if (!activeCall && callPhase === "connected") {
      setCallPhase("ended");
    }
  }, [activeCall]);

  // Promote to CONNECTED as soon as Twilio reports an active call.
  useEffect(() => {
    if (
      activeCall &&
      !isEndingCallRef.current &&
      ["dialing", "ringing", "redirecting", "sending"].includes(callPhase)
    ) {
      stationAcceptedRef.current = true;
      setCallError(null);
      setCallPhase("connected");
    }
  }, [activeCall, callPhase]);

  // Open confirmation modal when Emergency tab is pressed from the bottom nav.
  useEffect(() => {
    if (route?.params?.openConfirmAt) {
      setShowCallingScreen(false);
      setCallPhase("confirming");
      setShowConfirmModal(true);
    }
  }, [route?.params?.openConfirmAt]);

  // Start real emergency flow directly after Home confirmation modal "Yes, Call Now".
  useEffect(() => {
    if (route?.params?.startCallNowAt) {
      setShowConfirmModal(false);
      initiateEmergencyCall();
    }
  }, [route?.params?.startCallNowAt]);

  const formatTimer = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  // Socket.IO: connect when calling screen opens for failover events
  useEffect(() => {
    if (!showCallingScreen) return;

    const socket = ioClient(NODE_API_URL, { transports: ["websocket"] });
    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("[Socket] Civilian connected:", socket.id);
      // If alarmId is already known, join the room right away
      if (alarmIdRef.current) {
        socket.emit("join-alarm", { alarmId: alarmIdRef.current });
      }
    });

    socket.on("failover-redirect", (data: any) => {
      console.log("[Failover] Redirecting to:", data.toStationName);
      // SAFETY: ignore failover if the call is already connected
      if (callPhaseRef.current === "connected" || isEndingCallRef.current) {
        console.log("[Failover] IGNORED — call already connected");
        return;
      }
      // Hang up current Twilio call before transitioning (use ref to avoid stale closure)
      try {
        voipHangUpRef.current();
      } catch (e) {
        console.warn("[Failover] hangUp error:", e);
      }
      setCallPhase("redirecting" as CallPhase);
      setDispatchedStation(data.toStationId);
      setDispatchedStationName(data.toStationName);

      // After 2.5s transition, resume dialing the new station (stays yellow)
      failoverRedirectTimeoutRef.current = setTimeout(async () => {
        // Place Twilio VoIP call to the next station (substation or main admin)
        const newIdentity = buildDispatcherIdentity(
          data.toStationId,
          data.assignedOfficerId,
        );
        console.log(`[Failover] Calling new station: ${newIdentity}`);
        if (!newIdentity) {
          setCallPhase("error");
          setCallError("Failed to resolve station identity for failover call.");
          failoverRedirectTimeoutRef.current = null;
          return;
        }

        try {
          const ok = await placeVoipCall(newIdentity);
          console.log("[Failover] New call result:", ok);
        } catch (e) {
          console.warn("[Failover] New Twilio call failed:", e);
          setCallPhase("error");
          setCallError("Failed to connect voice call during failover.");
        }

        failoverRedirectTimeoutRef.current = null;
      }, 2500);
    });

    // Dispatch accepted by a station; voice line may still be connecting.
    socket.on("dispatch-accepted", (data: any) => {
      console.log(
        "[Socket] Dispatch accepted by station:",
        data.dispatchedStationName || data.dispatchedStationId,
      );

      stationAcceptedRef.current = true;
      if (data.dispatchedStationName)
        setDispatchedStationName(data.dispatchedStationName);

      if (callPhaseRef.current !== "connected") {
        setCallPhase("ringing");
      }

      if (!activeVoipCallRef.current) {
        setCallError("Dispatch accepted. Establishing voice line...");

        const targetIdentity = lastDialedIdentityRef.current;
        if (targetIdentity && !isEndingCallRef.current) {
          retryDialTimeoutRef.current = setTimeout(async () => {
            await placeVoipCall(targetIdentity, callSessionRef.current);
            retryDialTimeoutRef.current = null;
          }, 1000);
        }
      }
    });

    // Dispatch confirmed immediately when alarm is created
    socket.on("dispatch-confirmed", async (data: any) => {
      console.log(
        "[Socket] Dispatch confirmed:",
        data.dispatchedStationName || data.dispatchedStationId,
      );

      setDispatchedStation(data.dispatchedStationId || null);
      if (data.dispatchedStationName)
        setDispatchedStationName(data.dispatchedStationName);

      // If call hasn't started yet, use this confirmed identity to make the call
      if (
        callPhaseRef.current === "sending" ||
        callPhaseRef.current === "dialing"
      ) {
        const stationIdentity = data.twilioTargetIdentity;
        if (
          stationIdentity &&
          !activeVoipCallRef.current &&
          !isEndingCallRef.current
        ) {
          try {
            await placeVoipCall(stationIdentity, callSessionRef.current);
          } catch (err) {
            console.error(
              "[Socket] Failed to place call from dispatch-confirmed:",
              err,
            );
          }
        }
      }
    });

    // Voice line connected — NOW go green
    socket.on("call-accepted", (data: any) => {
      console.log(
        "[Socket] Voice line connected with station:",
        data.stationName || data.stationId,
      );

      stationAcceptedRef.current = true;

      if (!activeVoipCallRef.current) {
        console.warn(
          "[Socket] voice-connected event received without active Twilio call. Retrying dial.",
        );
        setCallPhase("ringing");
        setCallError("Voice line connecting...");

        const targetIdentity = lastDialedIdentityRef.current;
        if (targetIdentity && !isEndingCallRef.current) {
          retryDialTimeoutRef.current = setTimeout(async () => {
            await placeVoipCall(targetIdentity, callSessionRef.current);
            retryDialTimeoutRef.current = null;
          }, 1000);
        }
        return;
      }

      if (data.stationName) setDispatchedStationName(data.stationName);
      setCallError(null);
      setCallPhase("connected");
    });

    socket.on("failover-exhausted", () => {
      console.log("[Failover] No more stations available");
      // SAFETY: ignore if the call is already connected
      if (callPhaseRef.current === "connected" || stationAcceptedRef.current) {
        console.log(
          "[Failover] IGNORED failover-exhausted — call already accepted/connected",
        );
        return;
      }
      setCallPhase("error");
      setCallError("No answer from any station. Please try again.");
    });

    socket.on("call-ended", (data: any) => {
      const activeAlarmId = alarmIdRef.current;
      const endedAlarmId = Number(data?.alarmId || 0) || null;

      if (!activeAlarmId || !endedAlarmId || activeAlarmId !== endedAlarmId) {
        return;
      }

      console.log("[Socket] Received call-ended:", data);
      terminateCallSession();
    });

    return () => {
      clearPendingCallTimeouts();
      socket.disconnect();
      socketRef.current = null;
    };
  }, [showCallingScreen]);

  const getCallPhaseText = (): string => {
    switch (callPhase) {
      case "locating":
        return "Getting your location...";
      case "sending":
        return "Sending alert to station...";
      case "dialing":
        return `Dialing ${dispatchedStationName || "nearest station"}...`;
      case "ringing":
        return `Ringing ${dispatchedStationName || "station"}...`;
      case "redirecting":
        return `Redirecting to ${dispatchedStationName || "another station"}...`;
      case "connected":
        return "Connected";
      case "ended":
        return "Call Ended";
      case "error":
        return callError || "Something went wrong";
      default:
        return "";
    }
  };

  const handleEndCall = () => {
    terminateCallSession({ emitCancel: true });
  };

  const handleQuickEmergency = () => {
    setCallPhase("confirming");
    setShowCallingScreen(false);
    setShowConfirmModal(true);
  };

  const handleTakeIncidentPhoto = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (permission.status !== "granted") {
        Alert.alert(
          "Permission needed",
          "Please allow camera access to capture incident evidence.",
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        quality: 0.55,
        base64: true,
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
      });

      if (result.canceled || !result.assets?.[0]) {
        return;
      }

      const asset = result.assets[0];
      const mime = asset.mimeType || "image/jpeg";
      if (!asset.base64) {
        Alert.alert(
          "Capture failed",
          "Could not read image data. Please try again.",
        );
        return;
      }

      setIncidentPhotoUri(asset.uri || null);
      setIncidentPhotoDataUrl(`data:${mime};base64,${asset.base64}`);
    } catch (error: any) {
      Alert.alert(
        "Camera error",
        error?.message || "Failed to capture incident photo.",
      );
    }
  };

  const captureEvidencePhoto = async () => {
    const alarmId = alarmIdRef.current || postCallAlarmIdRef.current;
    if (!alarmId) {
      Alert.alert("Not ready", "Incident is not yet created. Please wait.");
      return;
    }

    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (permission.status !== "granted") {
        Alert.alert(
          "Permission needed",
          "Please allow camera access to capture incident evidence.",
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.6,
      });

      if (result.canceled || !result.assets?.[0]) {
        return;
      }

      const asset = result.assets[0];
      if (!asset.uri) {
        Alert.alert("Camera error", "Unable to read captured photo.");
        return;
      }

      setPendingEvidenceUri(asset.uri);
      setPendingEvidenceFileName(asset.fileName || `photo_${Date.now()}.jpg`);
      setPendingEvidenceType((asset.mimeType || "image/jpeg").toLowerCase());
    } catch (error: any) {
      Alert.alert("Camera error", error?.message || "Failed to open camera.");
    }
  };

  const submitPendingEvidence = async () => {
    const alarmId = alarmIdRef.current || postCallAlarmIdRef.current;
    const uri = pendingEvidenceUri;
    if (!alarmId || !uri) return;

    const fileName = pendingEvidenceFileName;
    const type = pendingEvidenceType;
    setPendingEvidenceUri(null);

    try {
      setIsUploadingEvidence(true);
      setEvidenceStatus("Uploading evidence...");

      const capturePhase =
        callPhaseRef.current === "ended" ? "post_call" : "in_call";
      const capturedAt = new Date().toISOString();
      const authHeaders = {
        ...(jwtToken ? { Authorization: `Bearer ${jwtToken}` } : {}),
        "ngrok-skip-browser-warning": "true",
      } as Record<string, string>;

      console.log(
        `[EvidenceUpload] Starting upload for alarm ${alarmId}, phase=${capturePhase}, jwt=${!!jwtToken}`,
      );

      let uploadSucceeded = false;
      let initError: string | null = null;

      // ── Primary flow: init → Supabase storage → complete ──
      try {
        // Read file bytes for Supabase storage upload
        console.log("[EvidenceUpload] Reading file bytes from URI...");
        const mediaResponse = await fetch(uri);
        const mediaArrayBuffer = await mediaResponse.arrayBuffer();
        const fileSizeBytes = mediaArrayBuffer.byteLength;
        console.log(`[EvidenceUpload] File read OK, size=${fileSizeBytes}`);

        console.log("[EvidenceUpload] Calling init endpoint...");
        const initResponse = await fetch(
          `${NODE_API_URL}/api/incidents/${alarmId}/evidence/init`,
          {
            method: "POST",
            headers: {
              ...authHeaders,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              mimeType: type,
              fileSizeBytes,
              capturePhase,
              capturedAt,
            }),
          },
        );

        const initData = await initResponse.json();
        console.log(
          "[EvidenceUpload] Init response:",
          initResponse.status,
          JSON.stringify(initData),
        );
        if (!initResponse.ok) {
          throw new Error(
            initData?.error?.message ||
              initData?.message ||
              "Failed to initialize evidence upload.",
          );
        }

        const bucket = initData?.data?.bucket;
        const storagePath = initData?.data?.storagePath;
        if (!bucket || !storagePath) {
          throw new Error("Backend did not return storage upload info.");
        }

        console.log(
          `[EvidenceUpload] Uploading to Supabase storage: ${bucket}/${storagePath}`,
        );
        const { error: storageError } = await supabase.storage
          .from(bucket)
          .upload(storagePath, mediaArrayBuffer, {
            contentType: type,
            upsert: false,
          });

        if (storageError) {
          throw new Error(storageError.message || "Storage upload failed.");
        }
        console.log("[EvidenceUpload] Supabase upload OK, calling complete...");

        const completeResponse = await fetch(
          `${NODE_API_URL}/api/incidents/${alarmId}/evidence/complete`,
          {
            method: "POST",
            headers: {
              ...authHeaders,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              bucket,
              storagePath,
              mimeType: type,
              fileSizeBytes,
              capturePhase,
              capturedAt,
            }),
          },
        );

        const completeData = await completeResponse.json();
        console.log(
          "[EvidenceUpload] Complete response:",
          completeResponse.status,
          JSON.stringify(completeData),
        );
        if (!completeResponse.ok) {
          throw new Error(
            completeData?.error?.message ||
              completeData?.message ||
              "Failed to complete evidence upload.",
          );
        }

        uploadSucceeded = true;
        setEvidenceStatus("Photo evidence sent to station.");
      } catch (err: any) {
        initError = err?.message || "Failed init-upload-complete flow.";
        console.warn(
          "[EvidenceUpload] Primary flow failed, trying legacy FormData endpoint:",
          initError,
        );
      }

      // ── Fallback: FormData upload (does not need arrayBuffer) ──
      if (!uploadSucceeded) {
        try {
          console.log("[EvidenceUpload] Legacy FormData upload starting...");
          const formData = new FormData();
          formData.append("media", {
            uri,
            name: fileName,
            type,
          } as any);

          const legacyResponse = await fetch(
            `${NODE_API_URL}/api/incidents/${alarmId}/evidence-media`,
            {
              method: "POST",
              headers: authHeaders,
              body: formData,
            },
          );

          const legacyData = await legacyResponse.json();
          console.log(
            "[EvidenceUpload] Legacy response:",
            legacyResponse.status,
            JSON.stringify(legacyData),
          );
          if (!legacyResponse.ok) {
            throw new Error(
              legacyData?.message ||
                initError ||
                "Failed to upload evidence media.",
            );
          }

          uploadSucceeded = true;
          setEvidenceStatus("Photo evidence sent to station.");
        } catch (legacyErr: any) {
          console.error(
            "[EvidenceUpload] Legacy fallback also failed:",
            legacyErr?.message,
          );
          throw new Error(
            legacyErr?.message ||
              initError ||
              "Failed to upload evidence media.",
          );
        }
      }
    } catch (error: any) {
      setEvidenceStatus(null);
      Alert.alert(
        "Upload failed",
        error?.message || "Failed to send incident media.",
      );
    } finally {
      setIsUploadingEvidence(false);
    }
  };

  const initiateEmergencyCall = async () => {
    callSessionRef.current += 1;
    isEndingCallRef.current = false;
    stationAcceptedRef.current = false;
    clearPendingCallTimeouts();
    Vibration.vibrate([0, 100, 50, 100]);
    setShowCallingScreen(true);
    setCallPhase("locating");
    setCallError(null);

    try {
      // Step 1: Get location
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setCallPhase("error");
        setCallError("Location permission denied. Enable location to proceed.");
        return;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      const latitude = position.coords.latitude;
      const longitude = position.coords.longitude;

      // Step 2: Send alarm
      setCallPhase("sending");
      const phoneNumber = civilianPhone;

      const response = await fetch(`${NODE_API_URL}/api/enduser/create-alarm`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "ngrok-skip-browser-warning": "true",
          ...(jwtToken ? { Authorization: `Bearer ${jwtToken}` } : {}),
        },
        body: JSON.stringify({
          phoneNumber,
          latitude,
          longitude,
          incidentType: "Fire",
          alarmLevel: "Alarm 1",
          location:
            emergencyDescription ||
            `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
          narrative: emergencyDescription || "Emergency call from mobile app",
          evidenceImageDataUrl: incidentPhotoDataUrl,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setCallPhase("error");
        setCallError(data.message || "Failed to create alarm.");
        return;
      }

      console.log("Alarm created from emergency call:", data);
      alarmIdRef.current = data.alarmId || null;
      setDispatchedStation(data.dispatchedStationId || null);
      setDispatchedStationName(data.dispatchedStationName || null);

      // Join the alarm socket room so we receive failover-redirect events
      if (socketRef.current?.connected && data.alarmId) {
        socketRef.current.emit("join-alarm", { alarmId: data.alarmId });
        console.log(`[Socket] Joined alarm room: alarm-${data.alarmId}`);
      }

      // Step 3: Determine Twilio target identity (prefer backend-computed value)
      const explicitTargetIdentity =
        typeof data.twilioTargetIdentity === "string"
          ? data.twilioTargetIdentity.trim()
          : "";
      const dispatchedStationType = String(
        data.dispatchedStationType || "",
      ).toLowerCase();
      const isMainAdmin =
        dispatchedStationType === "main" ||
        data.dispatchedStationId === "main" ||
        (!data.dispatchedStationId &&
          /main/i.test(String(data.dispatchedStationName || "")));
      const stationIdentity =
        explicitTargetIdentity ||
        buildDispatcherIdentity(
          isMainAdmin ? "main" : data.dispatchedStationId,
          data.dispatchedOfficerId,
        );

      console.log(`[DEBUG] Response analysis:`, {
        twilioTargetIdentity: data.twilioTargetIdentity,
        dispatchedStationType,
        dispatchedStationId: data.dispatchedStationId,
        isMainAdmin,
        explicitTargetIdentity,
        stationIdentity,
        fallbackBuilt: buildDispatcherIdentity(
          isMainAdmin ? "main" : data.dispatchedStationId,
          data.dispatchedOfficerId,
        ),
      });

      if (stationIdentity) {
        console.log(
          `[VoIP] Calling station identity: ${stationIdentity}, voipStatus: ${voipStatus}, voipError: ${voipError}`,
        );

        try {
          const ok = await placeVoipCall(stationIdentity);
          console.log("[VoIP] Call initiated:", ok);
        } catch (err: any) {
          console.error("[VoIP] Call failed:", err);
          setCallPhase("error");
          setCallError(
            err?.message ||
              "Unable to establish Twilio voice call to station. Please try again.",
          );
        }
      } else {
        setCallPhase("error");
        setCallError("No station available to dispatch. Please try again.");
      }
    } catch (err: any) {
      console.error("Emergency call error:", err);
      setCallPhase("error");
      setCallError(err?.message || "Network error. Check your connection.");
    }
  };

  const callKnnTest = async (
    latitude: number,
    longitude: number,
    label: string,
    forceStationId?: number,
  ) => {
    try {
      const response = await fetch(`${NODE_API_URL}/api/enduser/create-alarm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phoneNumber: "9997778888",
          latitude,
          longitude,
          incidentType: "Fire",
          alarmLevel: "Alarm 1",
          location: label,
          narrative: `KNN test from app: ${label}`,
          // Dev-only: when provided, backend skips KNN and dispatches
          // directly to this station ID (e.g., 101 or 102).
          forceStationId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        const message = (data && data.message) || "Request failed";
        Alert.alert("KNN Test Error", message);
        return;
      }

      Alert.alert(
        "KNN Test Result",
        `Dispatched station: ${data.dispatchedStationId}`,
      );
    } catch (error: any) {
      Alert.alert("KNN Test Error", error?.message || "Network error");
    }
  };

  const handleKnnTest101 = () => {
    // Force dispatch to station 101 for testing (Main)
    callKnnTest(7.5, 122.0, "Near Station 101", 101);
  };

  const handleKnnTest102 = () => {
    // Force dispatch to station 103 for testing (Sta Catalina Substation)
    // Real coordinates from DB (latitude, longitude): 6.90928916, 122.08716188
    callKnnTest(6.90928916, 122.08716188, "Near Station 103", 103);
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: palette.pageBg }]}
      edges={["top"]}
    >
      <View style={[styles.header, { backgroundColor: palette.headerBg }]}>
        <Text style={[styles.headerTitle, { fontSize: 24 * fontScale }]}>
          Emergency Calls
        </Text>
        <Text style={[styles.headerSubtitle, { fontSize: 14 * fontScale }]}>
          Get immediate help in emergencies
        </Text>
      </View>

      <ScrollView style={[styles.content, { backgroundColor: palette.pageBg }]}>
        {/* Quick Emergency Button */}
        <TouchableOpacity
          style={styles.quickEmergencyButton}
          onPress={handleQuickEmergency}
        >
          <View style={styles.quickEmergencyIcon}>
            <Ionicons name="warning" size={32} color="#fff" />
          </View>
          <Text
            style={[styles.quickEmergencyText, { fontSize: 22 * fontScale }]}
          >
            EMERGENCY CALL
          </Text>
          <Text
            style={[styles.quickEmergencySubtext, { fontSize: 14 * fontScale }]}
          >
            Tap to call nearest fire station
          </Text>
        </TouchableOpacity>

        {/* VoIP Active Call Banner */}
        {activeCall && (
          <View
            style={{
              backgroundColor: "#28a745",
              borderRadius: 12,
              padding: 16,
              marginHorizontal: 16,
              marginBottom: 12,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <View>
              <Text style={{ color: "#fff", fontWeight: "bold", fontSize: 16 }}>
                On VoIP Call
              </Text>
              <Text style={{ color: "#ffffffcc", fontSize: 13 * fontScale }}>
                Connected to {dispatchedStationName || "fire station"}
              </Text>
            </View>
            <TouchableOpacity
              onPress={handleEndCall}
              style={{
                backgroundColor: "#dc3545",
                borderRadius: 8,
                paddingHorizontal: 16,
                paddingVertical: 10,
              }}
            >
              <Text style={{ color: "#fff", fontWeight: "bold" }}>Hang Up</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* ── Full-Screen Calling UI ────────────────────────────── */}
      <Modal
        visible={showCallingScreen}
        animationType="slide"
        onRequestClose={handleEndCall}
      >
        <View style={callingStyles.container}>
          {/* Top area */}
          <View style={callingStyles.topArea}>
            <Text style={callingStyles.callingLabel}>
              {callPhase === "connected"
                ? "CONNECTED"
                : callPhase === "redirecting"
                  ? "REDIRECTING..."
                  : "EMERGENCY CALL"}
            </Text>
            <Text style={callingStyles.stationName}>
              {dispatchedStationName ||
                (dispatchedStation
                  ? `Fire Station #${dispatchedStation}`
                  : "Nearest Fire Station")}
            </Text>
            <Text style={callingStyles.phaseText}>{getCallPhaseText()}</Text>
            {callPhase === "connected" && (
              <Text style={callingStyles.timerText}>
                {formatTimer(callTimer)}
              </Text>
            )}
          </View>

          {/* Center — pulsing icon */}
          <View style={callingStyles.centerArea}>
            <Animated.View
              style={[
                callingStyles.pulseCircleOuter,
                { transform: [{ scale: pulseAnim }] },
                callPhase === "connected" && {
                  backgroundColor: "rgba(76,175,80,0.15)",
                },
                callPhase === "redirecting" && {
                  backgroundColor: "rgba(255,152,0,0.15)",
                },
                callPhase === "ended" && {
                  backgroundColor: "rgba(158,158,158,0.15)",
                },
                callPhase === "error" && {
                  backgroundColor: "rgba(229,57,53,0.15)",
                },
              ]}
            >
              <View
                style={[
                  callingStyles.pulseCircleInner,
                  callPhase === "connected" && { backgroundColor: "#4CAF50" },
                  callPhase === "redirecting" && { backgroundColor: "#FF9800" },
                  callPhase === "ended" && { backgroundColor: "#9E9E9E" },
                  callPhase === "error" && { backgroundColor: "#E53935" },
                ]}
              >
                <Ionicons
                  name={
                    callPhase === "error"
                      ? "alert-circle"
                      : callPhase === "ended"
                        ? "call"
                        : callPhase === "connected"
                          ? "call"
                          : "call-outline"
                  }
                  size={48}
                  color="#fff"
                />
              </View>
            </Animated.View>

            {(callPhase === "locating" || callPhase === "sending") && (
              <Text style={callingStyles.subPhaseText}>Please wait...</Text>
            )}

            {callPhase === "error" && (
              <TouchableOpacity
                style={callingStyles.retryButton}
                onPress={() => {
                  setShowCallingScreen(false);
                  setCallPhase("idle");
                  goHome();
                }}
              >
                <Text style={callingStyles.retryText}>Dismiss</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Bottom — mute, speaker, hang up / post-call evidence */}
          <View style={callingStyles.bottomArea}>
            {callPhase !== "error" && (
              <View style={callingStyles.evidenceRow}>
                <TouchableOpacity
                  style={callingStyles.evidenceButton}
                  onPress={captureEvidencePhoto}
                  disabled={isUploadingEvidence || !!pendingEvidenceUri}
                >
                  <Ionicons name="camera" size={18} color="#fff" />
                  <Text style={callingStyles.evidenceButtonText}>
                    Take Photo
                  </Text>
                </TouchableOpacity>
              </View>
            )}
            {evidenceStatus && callPhase !== "error" && (
              <Text style={callingStyles.evidenceStatusText}>
                {evidenceStatus}
              </Text>
            )}
            {callPhase === "ended" && postCallCountdown > 0 && (
              <Text
                style={{
                  color: "rgba(255,255,255,0.8)",
                  fontSize: 13,
                  textAlign: "center",
                  marginTop: 4,
                  marginBottom: 8,
                }}
              >
                You can still send photo evidence (
                {Math.floor(postCallCountdown / 60)}:
                {String(postCallCountdown % 60).padStart(2, "0")} remaining)
              </Text>
            )}
            {callPhase !== "error" && callPhase !== "ended" && (
              <View style={callingStyles.controlRow}>
                {/* Mute button */}
                <TouchableOpacity
                  style={[
                    callingStyles.controlButton,
                    isMuted && callingStyles.controlButtonActive,
                  ]}
                  onPress={toggleMute}
                  disabled={!activeCall}
                >
                  <Ionicons
                    name={isMuted ? "mic-off" : "mic"}
                    size={24}
                    color={isMuted ? "#E53935" : "#fff"}
                  />
                  <Text style={callingStyles.controlLabel}>
                    {isMuted ? "Unmute" : "Mute"}
                  </Text>
                </TouchableOpacity>

                {/* Hang Up button */}
                <TouchableOpacity
                  style={callingStyles.hangUpButton}
                  onPress={handleEndCall}
                >
                  <Ionicons
                    name="call"
                    size={32}
                    color="#fff"
                    style={{ transform: [{ rotate: "135deg" }] }}
                  />
                </TouchableOpacity>

                {/* Speaker button */}
                <TouchableOpacity
                  style={[
                    callingStyles.controlButton,
                    isSpeaker && callingStyles.controlButtonActive,
                  ]}
                  onPress={toggleSpeaker}
                  disabled={!activeCall}
                >
                  <Ionicons
                    name={isSpeaker ? "volume-high" : "volume-medium"}
                    size={24}
                    color={isSpeaker ? "#4CAF50" : "#fff"}
                  />
                  <Text style={callingStyles.controlLabel}>
                    {isSpeaker ? "Speaker" : "Speaker"}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
            {callPhase !== "error" && callPhase !== "ended" && (
              <Text style={callingStyles.hangUpLabel}>End Call</Text>
            )}
            {callPhase === "ended" && (
              <TouchableOpacity
                style={[
                  callingStyles.hangUpButton,
                  { backgroundColor: "#666", marginTop: 8 },
                ]}
                onPress={dismissPostCallScreen}
              >
                <Ionicons name="close" size={32} color="#fff" />
              </TouchableOpacity>
            )}
            {callPhase === "ended" && (
              <Text
                style={{
                  color: "rgba(255,255,255,0.6)",
                  fontSize: 12,
                  textAlign: "center",
                  marginTop: 6,
                }}
              >
                Done
              </Text>
            )}
          </View>
        </View>

        {/* ── Evidence Photo Preview Overlay ── */}
        {pendingEvidenceUri && (
          <View
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(0,0,0,0.85)",
              justifyContent: "center",
              alignItems: "center",
              padding: 24,
              zIndex: 100,
            }}
          >
            <Text
              style={{
                color: "#fff",
                fontSize: 18,
                fontWeight: "bold",
                marginBottom: 16,
              }}
            >
              Review Photo Evidence
            </Text>
            <Image
              source={{ uri: pendingEvidenceUri }}
              style={{
                width: "100%",
                height: 320,
                borderRadius: 12,
                marginBottom: 20,
                backgroundColor: "#222",
              }}
              resizeMode="contain"
            />
            <View
              style={{
                flexDirection: "row",
                gap: 16,
                justifyContent: "center",
              }}
            >
              <TouchableOpacity
                onPress={() => setPendingEvidenceUri(null)}
                style={{
                  backgroundColor: "#666",
                  paddingHorizontal: 28,
                  paddingVertical: 14,
                  borderRadius: 10,
                }}
              >
                <Text
                  style={{ color: "#fff", fontWeight: "bold", fontSize: 16 }}
                >
                  Retake
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={submitPendingEvidence}
                disabled={isUploadingEvidence}
                style={{
                  backgroundColor: isUploadingEvidence ? "#999" : "#4CAF50",
                  paddingHorizontal: 28,
                  paddingVertical: 14,
                  borderRadius: 10,
                }}
              >
                <Text
                  style={{ color: "#fff", fontWeight: "bold", fontSize: 16 }}
                >
                  {isUploadingEvidence ? "Uploading..." : "Submit"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </Modal>

      {/* Confirmation Modal */}
      <Modal
        visible={showConfirmModal}
        transparent={true}
        animationType="fade"
        onRequestClose={handleCancelConfirmation}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.confirmModal}>
            <View style={styles.confirmIcon}>
              <Ionicons name="alert-circle" size={48} color="#E53935" />
            </View>
            <Text style={styles.confirmTitle}>Emergency Call Confirmation</Text>
            <Text style={[styles.confirmMessage, { fontSize: 16 * fontScale }]}>
              Are you sure you want to call emergency services?
            </Text>
            <Text style={[styles.confirmSubtext, { fontSize: 14 * fontScale }]}>
              This will immediately alert the nearest fire station and start the
              emergency call process.
            </Text>

            <TouchableOpacity
              style={styles.photoButton}
              onPress={handleTakeIncidentPhoto}
            >
              <Ionicons name="camera" size={18} color="#fff" />
              <Text
                style={[styles.photoButtonText, { fontSize: 14 * fontScale }]}
              >
                Take Incident Photo
              </Text>
            </TouchableOpacity>

            {incidentPhotoUri && (
              <Text
                style={[styles.photoAttachedText, { fontSize: 12 * fontScale }]}
              >
                Photo attached for incident verification.
              </Text>
            )}

            <View style={styles.confirmButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={handleCancelConfirmation}
              >
                <Text
                  style={[
                    styles.cancelButtonText,
                    { fontSize: 16 * fontScale },
                  ]}
                >
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmButton}
                onPress={() => {
                  setShowConfirmModal(false);
                  initiateEmergencyCall();
                }}
              >
                <Text
                  style={[
                    styles.confirmButtonText,
                    { fontSize: 16 * fontScale },
                  ]}
                >
                  Yes, Call Now
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  header: {
    backgroundColor: "#E53935",
    paddingTop: 20,
    paddingBottom: 24,
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#fff",
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: "rgba(255,255,255,0.9)",
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  quickEmergencyButton: {
    backgroundColor: "#E53935",
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    marginVertical: 20,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  quickEmergencyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  quickEmergencyText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 4,
  },
  quickEmergencySubtext: {
    fontSize: 12,
    color: "rgba(255,255,255,0.9)",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  confirmModal: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 32,
    alignItems: "center",
    width: "100%",
    maxWidth: 340,
  },
  confirmIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(229, 57, 53, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  confirmTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#333",
    textAlign: "center",
    marginBottom: 12,
  },
  confirmMessage: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 8,
  },
  confirmSubtext: {
    fontSize: 12,
    color: "#999",
    textAlign: "center",
    marginBottom: 24,
  },
  photoButton: {
    width: "100%",
    backgroundColor: "#333",
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  photoButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
  photoAttachedText: {
    color: "#2e7d32",
    textAlign: "center",
    marginBottom: 16,
    fontWeight: "600",
  },
  confirmButtons: {
    flexDirection: "row",
    width: "100%",
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  cancelButtonText: {
    color: "#666",
    fontSize: 16,
    fontWeight: "600",
  },
  confirmButton: {
    flex: 1,
    backgroundColor: "#E53935",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  confirmButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});

const callingStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1a1a2e",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  topArea: {
    alignItems: "center",
    marginTop: 40,
  },
  callingLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#ffffff80",
    letterSpacing: 2,
    textTransform: "uppercase",
    marginBottom: 12,
  },
  stationName: {
    fontSize: 26,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 8,
    textAlign: "center",
  },
  phaseText: {
    fontSize: 16,
    color: "#ffffffcc",
    marginBottom: 4,
  },
  timerText: {
    fontSize: 20,
    fontWeight: "600",
    color: "#4CAF50",
    marginTop: 8,
    fontVariant: ["tabular-nums"],
  },
  centerArea: {
    alignItems: "center",
    justifyContent: "center",
  },
  evidenceRow: {
    width: "100%",
    flexDirection: "row",
    gap: 10,
    marginBottom: 14,
    justifyContent: "center",
  },
  evidenceButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#2d2d44",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minWidth: 120,
  },
  evidenceButtonText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
  },
  evidenceStatusText: {
    color: "#8bc34a",
    fontSize: 12,
    textAlign: "center",
    marginBottom: 10,
    fontWeight: "600",
  },
  pulseCircleOuter: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: "rgba(229, 57, 53, 0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  pulseCircleInner: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#E53935",
    justifyContent: "center",
    alignItems: "center",
    elevation: 8,
    shadowColor: "#E53935",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },
  subPhaseText: {
    fontSize: 14,
    color: "#ffffff60",
    marginTop: 20,
  },
  retryButton: {
    marginTop: 24,
    backgroundColor: "#ffffff20",
    borderRadius: 12,
    paddingHorizontal: 32,
    paddingVertical: 12,
  },
  retryText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  bottomArea: {
    alignItems: "center",
    marginBottom: 20,
  },
  hangUpButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#E53935",
    justifyContent: "center",
    alignItems: "center",
    elevation: 6,
    shadowColor: "#E53935",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  hangUpLabel: {
    color: "#ffffff80",
    fontSize: 14,
    marginTop: 12,
  },
  controlRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 32,
  },
  controlButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(255,255,255,0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  controlButtonActive: {
    backgroundColor: "rgba(255,255,255,0.3)",
  },
  controlLabel: {
    color: "#ffffff99",
    fontSize: 10,
    marginTop: 2,
  },
});
