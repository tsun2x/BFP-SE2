import React, { useState, useEffect } from "react";
import { io } from "socket.io-client";
import {
  BrowserRouter,
  Routes,
  Route,
  useLocation,
  useNavigate,
} from "react-router-dom";

import Login from "./pages/login";
import Signup from "./pages/signup";

import Sidebar from "./components/sidenavbar";
import Topnavbar from "./components/topnavbar";
import ProtectedRoute from "./components/ProtectedRoute";
import Dashboard from "./pages/dashboard";
import PastIncidents from "./pages/PastIncidents";
import Reports from "./pages/reports";
import EmergencyCallHistory from "./pages/emergencycallHistory";
import Officers from "./pages/officersLoginHistory";
import IncidentReport from "./pages/IncidentReport";
import BranchStatus from "./pages/branchstatus";
import StationReadiness from "./pages/stationreadiness";
import ContentManagement from "./pages/ContentManagement";
import Settings from "./pages/Settings";
import TestPage from "./pages/TestPage";

import { StatusProvider } from "./context/StatusContext";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { CallProvider, CallContext } from "./context/CallContext";
import {
  NotificationProvider,
  useNotifications,
} from "./context/NotificationContext";
import { ToastContainer, useToast } from "./components/Toast";

import useTwilioVoice from "./hooks/useTwilioVoice";
import { API_BASE, SOCKET_BASE } from "./utils/runtimeConfig";
import "./layout.css";

const SOCKET_RELIABILITY_OPTIONS = {
  transports: ["websocket", "polling"],
  reconnection: true,
  reconnectionAttempts: 100000,
  reconnectionDelay: 500,
  reconnectionDelayMax: 5000,
  timeout: 15000,
};

function AppContent() {
  const location = useLocation();
  const navigate = useNavigate();
  const { addIncomingCall, rejectCall: ctxRejectCall } =
    React.useContext(CallContext);
  const { user, token } = useAuth();
  const { addNotification } = useNotifications();
  const { toasts, success, info } = useToast();

  // pages without layout
  const noLayoutRoutes = ["/login", "/signup"];

  const hideLayout = noLayoutRoutes.includes(location.pathname);

  // ==== Call states ====
  const [ongoingCalls, setOngoingCalls] = useState([]);
  const [incomingCalls, setIncomingCalls] = useState([]);
  const [voiceConsoleOpen, setVoiceConsoleOpen] = useState(false);
  const [voiceConsoleMinimized, setVoiceConsoleMinimized] = useState(false);
  const [pendingTwilioAccept, setPendingTwilioAccept] = useState(false);
  const [pendingAcceptedAlarmId, setPendingAcceptedAlarmId] = useState(null);
  const [stationsList, setStationsList] = useState([]);
  const [showTransferPicker, setShowTransferPicker] = useState(false);
  const [alertModal, setAlertModal] = useState(null); // { type, title, message, color }
  const [emergencyFlash, setEmergencyFlash] = useState(false);
  const voiceCardRef = React.useRef(null);
  const dragStateRef = React.useRef({
    dragging: false,
    startX: 0,
    startY: 0,
    lastTx: 0,
    lastTy: 0,
  });
  const socketRef = React.useRef(null);
  const tokenRef = React.useRef(token);
  const twilioRejectRef = React.useRef(null);
  const twilioIncomingRef = React.useRef(null);
  const twilioHangUpRef = React.useRef(null);
  const pendingAcceptedCallRef = React.useRef(null);
  const ctxRejectCallRef = React.useRef(ctxRejectCall);
  const notifiedTruckStatusRef = React.useRef(new Set());
  const audioCtxRef = React.useRef(null);
  const ongoingCallsRef = React.useRef([]);
  const incomingCallsRef = React.useRef([]);
  const transferredAlarmIdsRef = React.useRef(new Set());
  const dismissedAlarmCooldownsRef = React.useRef({});
  const dismissUndoTimerRef = React.useRef(null);
  const [dismissUndo, setDismissUndo] = useState(null);

  // Stable refs for socket callbacks — prevents socket useEffect from re-running on every render
  const addIncomingCallRef = React.useRef(addIncomingCall);
  const addNotificationRef = React.useRef(addNotification);
  const infoRef = React.useRef(info);
  const navigateRef = React.useRef(navigate);
  const shouldDisplayTrackedMissionAlert = React.useCallback((data) => {
    const hasActiveAlarm = Number(data?.alarmId || 0) > 0;
    const statusText = String(data?.fireStatus || "")
      .trim()
      .toLowerCase();
    const latitude = Number(data?.latitude);
    const longitude = Number(data?.longitude);
    const hasLiveCoordinates =
      Number.isFinite(latitude) && Number.isFinite(longitude);

    return (
      hasActiveAlarm &&
      statusText &&
      statusText !== "standby" &&
      hasLiveCoordinates
    );
  }, []);
  React.useEffect(() => {
    addIncomingCallRef.current = addIncomingCall;
  }, [addIncomingCall]);
  React.useEffect(() => {
    addNotificationRef.current = addNotification;
  }, [addNotification]);
  React.useEffect(() => {
    infoRef.current = info;
  }, [info]);
  React.useEffect(() => {
    navigateRef.current = navigate;
  }, [navigate]);
  React.useEffect(() => {
    ongoingCallsRef.current = ongoingCalls;
  }, [ongoingCalls]);
  React.useEffect(() => {
    incomingCallsRef.current = incomingCalls;
  }, [incomingCalls]);
  React.useEffect(() => {
    tokenRef.current = token;
  }, [token]);

  const resolveIncidentCoordinates = React.useCallback((data) => {
    const coords = data?.coordinates || {};
    const lat = Number(
      coords.lat ?? coords.latitude ?? data?.latitude ?? data?.user_latitude,
    );
    const lng = Number(
      coords.lng ?? coords.longitude ?? data?.longitude ?? data?.user_longitude,
    );

    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      return { lat, lng };
    }

    return null;
  }, []);

  // ==== Twilio Voice SDK ====
  const assignedStationId =
    Number(user?.assigned_station_id || user?.assignedStationId || 0) || null;
  const isMainAdmin = user?.role === "admin";
  const dispatcherUserId = Number(user?.id || user?.user_id || 0) || null;
  const twilioIdentity = user
    ? isMainAdmin
      ? dispatcherUserId
        ? `ADM_MAIN_${dispatcherUserId}`
        : "ADM_MAIN"
      : assignedStationId
        ? dispatcherUserId
          ? `ADM_SUB_${assignedStationId}_${dispatcherUserId}`
          : `ADM_SUB_${assignedStationId}`
        : null
    : null;

  const dismissedStorageKey = React.useMemo(() => {
    const userKey = dispatcherUserId || "anon";
    const roleKey = isMainAdmin ? "main" : `station-${assignedStationId || "none"}`;
    return `dismissedAlarmCooldowns:${roleKey}:${userKey}`;
  }, [dispatcherUserId, isMainAdmin, assignedStationId]);

  const persistDismissedAlarmCooldowns = React.useCallback(() => {
    try {
      localStorage.setItem(
        dismissedStorageKey,
        JSON.stringify(dismissedAlarmCooldownsRef.current),
      );
    } catch (e) {
      // ignore storage failures
    }
  }, [dismissedStorageKey]);

  const clearDismissedAlarm = React.useCallback(
    (alarmId) => {
      const normalizedAlarmId = Number(alarmId || 0) || null;
      if (!normalizedAlarmId) return;
      if (socketRef.current?.connected) {
        socketRef.current.emit("dispatcher-undo-dismiss-incident", {
          alarmId: normalizedAlarmId,
        });
      }
      if (dismissedAlarmCooldownsRef.current[normalizedAlarmId]) {
        delete dismissedAlarmCooldownsRef.current[normalizedAlarmId];
        persistDismissedAlarmCooldowns();
      }
      setDismissUndo((prev) =>
        prev && prev.alarmId === normalizedAlarmId ? null : prev,
      );
    },
    [persistDismissedAlarmCooldowns],
  );

  const markAlarmDismissed = React.useCallback(
    (alarmId, cooldownMs = 30000) => {
      const normalizedAlarmId = Number(alarmId || 0) || null;
      if (!normalizedAlarmId) return;
      if (socketRef.current?.connected) {
        socketRef.current.emit("dispatcher-dismiss-incident", {
          alarmId: normalizedAlarmId,
          cooldownMs,
        });
      }
      dismissedAlarmCooldownsRef.current[normalizedAlarmId] =
        Date.now() + cooldownMs;
      persistDismissedAlarmCooldowns();

      if (dismissUndoTimerRef.current) {
        clearTimeout(dismissUndoTimerRef.current);
      }
      setDismissUndo({ alarmId: normalizedAlarmId, expiresAt: Date.now() + 10000 });
      dismissUndoTimerRef.current = setTimeout(() => {
        setDismissUndo((prev) =>
          prev && prev.alarmId === normalizedAlarmId ? null : prev,
        );
      }, 10000);
    },
    [persistDismissedAlarmCooldowns],
  );

  const isAlarmDismissedWithinCooldown = React.useCallback(
    (alarmId) => {
      const normalizedAlarmId = Number(alarmId || 0) || null;
      if (!normalizedAlarmId) return false;

      const expiresAt =
        Number(dismissedAlarmCooldownsRef.current[normalizedAlarmId] || 0) || 0;
      if (!expiresAt) return false;
      if (Date.now() < expiresAt) return true;

      delete dismissedAlarmCooldownsRef.current[normalizedAlarmId];
      persistDismissedAlarmCooldowns();
      return false;
    },
    [persistDismissedAlarmCooldowns],
  );

  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(dismissedStorageKey);
      const parsed = raw ? JSON.parse(raw) : {};
      dismissedAlarmCooldownsRef.current =
        parsed && typeof parsed === "object" ? parsed : {};
    } catch (e) {
      dismissedAlarmCooldownsRef.current = {};
    }
  }, [dismissedStorageKey]);

  React.useEffect(() => {
    return () => {
      if (dismissUndoTimerRef.current) {
        clearTimeout(dismissUndoTimerRef.current);
      }
    };
  }, []);

  const {
    incomingCall: twilioIncomingCall,
    activeCall: twilioActiveCall,
    status: twilioStatus,
    acceptIncoming: twilioAcceptIncoming,
    rejectIncoming: twilioRejectIncoming,
    hangUp: twilioHangUp,
    makeCall: twilioMakeCall,
    error: twilioError,
  } = useTwilioVoice(twilioIdentity, token, {
    onIncomingCall: (call) => {
      console.log(
        "[Twilio] Incoming call received in Admin:",
        call.parameters?.From,
      );
    },
    onCallDisconnected: () => {
      console.log("[Twilio] Call disconnected");
      cleanupDispatcherCallState();
    },
  });

  // Emergency siren using Web Audio API (no external file needed)
  const playEmergencySiren = React.useCallback(() => {
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (
          window.AudioContext || window.webkitAudioContext
        )();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === "suspended") ctx.resume();
      const playTone = (freq, start, dur) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, ctx.currentTime + start);
        gain.gain.setValueAtTime(0.3, ctx.currentTime + start);
        gain.gain.exponentialRampToValueAtTime(
          0.01,
          ctx.currentTime + start + dur,
        );
        osc.connect(gain).connect(ctx.destination);
        osc.start(ctx.currentTime + start);
        osc.stop(ctx.currentTime + start + dur);
      };
      // 3 alternating siren beeps
      playTone(880, 0, 0.4);
      playTone(660, 0.5, 0.4);
      playTone(880, 1.0, 0.4);
    } catch (e) {
      /* audio not available */
    }
  }, []);

  const playAttentionChime = React.useCallback(() => {
    try {
      if (!audioCtxRef.current || audioCtxRef.current.state === "closed") {
        audioCtxRef.current = new (
          window.AudioContext || window.webkitAudioContext
        )();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === "suspended") ctx.resume();

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(1046, ctx.currentTime);
      gain.gain.setValueAtTime(0.001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.16, ctx.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.35);
    } catch (e) {
      /* audio not available */
    }
  }, []);

  React.useEffect(() => {
    if (!alertModal) return;

    const isEscalation = alertModal.type === "alarm-escalation";
    const modalDurationMs = isEscalation ? 12000 : 8000;
    const soundIntervalMs = isEscalation ? 1500 : 1200;

    const playSound = () => {
      if (isEscalation) {
        playEmergencySiren();
      } else {
        playAttentionChime();
      }
    };

    playSound();
    const intervalId = setInterval(playSound, soundIntervalMs);
    const stopId = setTimeout(() => {
      clearInterval(intervalId);
    }, modalDurationMs);

    return () => {
      clearInterval(intervalId);
      clearTimeout(stopId);
    };
  }, [alertModal, playEmergencySiren, playAttentionChime]);

  // Fetch stations for inter-station calling
  React.useEffect(() => {
    if (!token) return;
    fetch(`${API_BASE}/firestations`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.stations) setStationsList(d.stations);
      })
      .catch(() => {});
  }, [token]);

  // Transfer active call to another station
  const getActiveCallSid = React.useCallback(() => {
    const params = twilioActiveCall?.parameters || {};
    const customGet = twilioActiveCall?.customParameters?.get;

    return (
      params.CallSid ||
      params.callSid ||
      (typeof customGet === "function" ? customGet("CallSid") : null) ||
      twilioActiveCall?.callSid ||
      twilioActiveCall?._callSid ||
      null
    );
  }, [twilioActiveCall]);

  const handleTransferCall = async (targetIdentity) => {
    try {
      const callSid = getActiveCallSid();
      const activeAlarmId = resolveActiveAlarmId();
      if (!callSid) {
        console.error("[Transfer] No CallSid found on active Twilio call");
        info("Transfer failed: active call SID not found.");
        return;
      }
      const resp = await fetch(`${API_BASE}/twilio/transfer`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ callSid, targetIdentity }),
      });
      const data = await resp.json();
      if (data.success) {
        if (activeAlarmId) {
          transferredAlarmIdsRef.current.add(Number(activeAlarmId));
        }
        cleanupDispatcherCallState(activeAlarmId);
        setShowTransferPicker(false);
        info(`Call transferred to ${targetIdentity}`);
      } else {
        console.error("[Transfer] Failed:", data.message);
        info(data?.message || "Call transfer failed.");
      }
    } catch (err) {
      console.error("[Transfer] Error:", err);
      info("Call transfer failed. Please try again.");
    }
  };

  // Keep refs up to date so socket handlers always have the latest
  React.useEffect(() => {
    twilioRejectRef.current = twilioRejectIncoming;
  }, [twilioRejectIncoming]);
  React.useEffect(() => {
    twilioIncomingRef.current = twilioIncomingCall;
  }, [twilioIncomingCall]);
  React.useEffect(() => {
    twilioHangUpRef.current = twilioHangUp;
  }, [twilioHangUp]);
  React.useEffect(() => {
    ctxRejectCallRef.current = ctxRejectCall;
  }, [ctxRejectCall]);

  function resolveActiveAlarmId(alarmId) {
    const explicitAlarmId = Number(alarmId || 0) || null;
    if (explicitAlarmId) return explicitAlarmId;

    const ongoingAlarmId =
      Number(ongoingCallsRef.current?.[0]?.id || 0) || null;
    if (ongoingAlarmId) return ongoingAlarmId;

    return Number(incomingCallsRef.current?.[0]?.id || 0) || null;
  }

  function cleanupDispatcherCallState(alarmId) {
    const resolvedAlarmId = resolveActiveAlarmId(alarmId);

    setPendingTwilioAccept(false);
    setPendingAcceptedAlarmId(null);
    pendingAcceptedCallRef.current = null;
    if (resolvedAlarmId) {
      setIncomingCalls((prev) =>
        prev.filter((call) => call.id !== resolvedAlarmId),
      );
      setOngoingCalls((prev) =>
        prev.filter((call) => call.id !== resolvedAlarmId),
      );
      try {
        ctxRejectCallRef.current?.(resolvedAlarmId);
      } catch (error) {
        console.warn("[CallEnded] Failed to clear call context:", error);
      }
      return;
    }

    setIncomingCalls([]);
    setOngoingCalls([]);
  }

  React.useEffect(() => {
    if (
      !twilioActiveCall ||
      !pendingAcceptedAlarmId ||
      !pendingAcceptedCallRef.current
    ) {
      return;
    }

    const acceptedCall = pendingAcceptedCallRef.current;
    setOngoingCalls((prev) => {
      if (prev.some((call) => call.id === acceptedCall.id)) {
        return prev;
      }
      return [...prev, acceptedCall];
    });
    pendingAcceptedCallRef.current = null;
    setPendingAcceptedAlarmId(null);
  }, [twilioActiveCall, pendingAcceptedAlarmId]);

  // Safety rollback: if Twilio media never connects, restore the incident in the modal.
  React.useEffect(() => {
    if (!pendingAcceptedAlarmId || twilioActiveCall) {
      return;
    }

    const timeoutId = setTimeout(() => {
      if (twilioActiveCall) {
        return;
      }

      const pendingCall = pendingAcceptedCallRef.current;
      if (pendingCall) {
        setIncomingCalls((prev) => {
          if (prev.some((call) => call.id === pendingCall.id)) {
            return prev;
          }
          return [pendingCall, ...prev];
        });
      }

      pendingAcceptedCallRef.current = null;
      setPendingAcceptedAlarmId(null);
      setPendingTwilioAccept(false);
      info("Voice call is not connected yet. Please tap Accept again.");
    }, 12000);

    return () => clearTimeout(timeoutId);
  }, [pendingAcceptedAlarmId, twilioActiveCall, info]);

  function emitDispatcherCallEnded(alarmId) {
    const resolvedAlarmId = resolveActiveAlarmId(alarmId);
    if (!resolvedAlarmId || !socketRef.current?.connected) {
      return resolvedAlarmId;
    }

    if (transferredAlarmIdsRef.current.has(Number(resolvedAlarmId))) {
      console.log(
        `[CallEnded] Suppressed dispatcher-end-call for transferred alarm ${resolvedAlarmId}`,
      );
      transferredAlarmIdsRef.current.delete(Number(resolvedAlarmId));
      return resolvedAlarmId;
    }

    socketRef.current.emit("dispatcher-end-call", {
      alarmId: resolvedAlarmId,
      initiator: "dispatcher",
      stationId: isMainAdmin ? "main" : assignedStationId || null,
      stationName: isMainAdmin
        ? "Central Fire Station (Main)"
        : user?.station_name || user?.stationName || null,
      endedAt: new Date().toISOString(),
    });

    return resolvedAlarmId;
  }

  function handleDispatcherHangUp(alarmId) {
    const resolvedAlarmId = emitDispatcherCallEnded(alarmId);
    if (resolvedAlarmId) {
      transferredAlarmIdsRef.current.delete(Number(resolvedAlarmId));
    }
    cleanupDispatcherCallState(resolvedAlarmId);

    try {
      twilioHangUpRef.current?.();
    } catch (error) {
      console.warn("[CallEnded] Failed to hang up Twilio call:", error);
    }
  }

  function shouldHandleIncomingIncident(data) {
    if (!isMainAdmin && assignedStationId && data?.assignedStationId) {
      if (Number(data.assignedStationId) !== Number(assignedStationId)) {
        return false;
      }
    }

    if (
      dispatcherUserId &&
      data?.assignedOfficerId &&
      Number(data.assignedOfficerId) !== Number(dispatcherUserId)
    ) {
      return false;
    }

    return true;
  }

  // Auto-accept Twilio incoming call if admin already accepted via socket modal
  React.useEffect(() => {
    if (pendingTwilioAccept && twilioIncomingCall) {
      console.log(
        "[AutoAccept] Twilio call arrived after socket accept — auto-accepting",
      );
      twilioAcceptIncoming();
      setPendingTwilioAccept(false);
    }
  }, [pendingTwilioAccept, twilioIncomingCall, twilioAcceptIncoming]);

  // Log Twilio status for debugging
  React.useEffect(() => {
    console.log(
      `[Twilio] Status: ${twilioStatus}, Identity: ${twilioIdentity}, Error: ${twilioError || "none"}`,
    );
  }, [twilioStatus, twilioIdentity, twilioError]);

  // Allow any page to open/close the global voice console via window events
  useEffect(() => {
    const openHandler = () => {
      setVoiceConsoleOpen(true);
      setVoiceConsoleMinimized(false);
    };
    const closeHandler = () => setVoiceConsoleOpen(false);
    window.addEventListener("open-voice-console", openHandler);
    window.addEventListener("close-voice-console", closeHandler);
    return () => {
      window.removeEventListener("open-voice-console", openHandler);
      window.removeEventListener("close-voice-console", closeHandler);
    };
  }, []);

  // Drag handling for the voice console card so it can be moved around the screen
  useEffect(() => {
    const handleMouseMove = (e) => {
      const state = dragStateRef.current;
      const card = voiceCardRef.current;
      if (!state.dragging || !card) return;
      const dx = e.clientX - state.startX;
      const dy = e.clientY - state.startY;
      const tx = state.lastTx + dx;
      const ty = state.lastTy + dy;
      card.style.transform = `translate(${tx}px, ${ty}px)`;
    };

    const handleMouseUp = (e) => {
      const state = dragStateRef.current;
      if (!state.dragging) return;
      const dx = e.clientX - state.startX;
      const dy = e.clientY - state.startY;
      state.dragging = false;
      state.lastTx += dx;
      state.lastTy += dy;
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  const handleVoiceHeaderMouseDown = (e) => {
    e.preventDefault();
    const state = dragStateRef.current;
    state.dragging = true;
    state.startX = e.clientX;
    state.startY = e.clientY;
  };

  const triggerIncomingCall = (callerData) => {
    const resolvedCoordinates = resolveIncidentCoordinates(callerData);
    // Create full call object with caller information
    const callObj = {
      id: Date.now(),
      number: callerData.phoneNumber || callerData.number || "Unknown",
      firstName: callerData.firstName || "",
      lastName: callerData.lastName || "",
      phoneNumber: callerData.phoneNumber || callerData.number || "",
      location: callerData.location || "",
      coordinates: resolvedCoordinates,
      timestamp: new Date(),
    };

    // Add to global call context
    addIncomingCall(callObj);

    // Also add to local state for backwards compatibility
    setIncomingCalls((prev) => [...prev, callObj]);

    // Navigate to incident report so admin can handle the call
    navigate("/incident-report");
  };

  // Socket: listen for incidents and join station-specific room
  useEffect(() => {
    const socket = io(SOCKET_BASE, SOCKET_RELIABILITY_OPTIONS);
    socketRef.current = socket;
    let mainAdminHeartbeatTimer = null;

    socket.on("connect", () => {
      console.log("Connected to socket server", socket.id);
      if (tokenRef.current) {
        socket.emit("join-dispatcher", { token: tokenRef.current });
      }
      if (isMainAdmin) {
        const authToken = localStorage.getItem("authToken");
        if (authToken) {
          socket.emit("join-main-admin", { token: authToken });
          console.log("[Socket] Emitted join-main-admin on initial connect");
          mainAdminHeartbeatTimer = setInterval(() => {
            if (!socket.connected) return;
            socket.emit("join-main-admin", { token: authToken });
          }, 20000);
        }
      }
    });

    socket.io.on("reconnect_attempt", (attempt) => {
      console.warn(`[Socket] Main admin reconnect attempt #${attempt}`);
    });

    socket.io.on("reconnect", (attempt) => {
      console.log(`[Socket] Main admin reconnected after ${attempt} attempt(s)`);
    });

    socket.io.on("reconnect_error", (error) => {
      console.warn("[Socket] Main admin reconnect error:", error?.message || error);
    });

    socket.on("connect_error", (error) => {
      console.warn("[Socket] Main admin connect error:", error?.message || error);
    });

    // Broadcast incidents from other stations — notification only, NO modal
    socket.on("new-incident", (data) => {
      try {
        console.log("[Frontend] Received new-incident broadcast:", data);
        const reportPreview = {
          id: data.alarmId || Date.now(),
          number: data.phoneNumber || "Unknown",
          firstName: data.firstName || "",
          lastName: data.lastName || "",
          phoneNumber: data.phoneNumber || data.number || "",
          location: data.location || "",
          incidentType: data.incidentType || "",
          narrative: data.narrative || "",
          alarmLevel: data.alarmLevel || "",
          coordinates: resolveIncidentCoordinates(data),
          timestamp: new Date(),
        };
        addNotificationRef.current({
          title: `New Incident – ${data.incidentType || "Unknown type"}`,
          message: data.location || "Another station",
          type: "incident",
          payload: reportPreview,
        });
        infoRef.current(
          `New incident from ${data.location || "another station"} (${data.incidentType || "Unknown type"})`,
          undefined,
          { sticky: false },
        );
      } catch (e) {
        console.error("[new-incident] handler error:", e);
      }
    });

    // Incidents dispatched specifically to this station from end-user app
    socket.on("incoming-incident", (data) => {
      try {
        if (!shouldHandleIncomingIncident(data)) {
          return;
        }

        const alreadyHandlingIncident =
          incomingCallsRef.current.length > 0 ||
          ongoingCallsRef.current.length > 0 ||
          Boolean(pendingAcceptedCallRef.current);

        if (alreadyHandlingIncident) {
          console.log(
            `[Frontend] Ignoring incoming-incident alarm=${data?.alarmId} because this admin is already handling another incident`,
          );
          return;
        }

        const alarmId = Number(data?.alarmId || 0) || null;
        if (alarmId && isAlarmDismissedWithinCooldown(alarmId)) {
          console.log(
            `[Frontend] Ignoring dismissed incoming-incident alarm=${alarmId}`,
          );
          return;
        }
        if (
          alarmId &&
          (incomingCallsRef.current.some((call) => call.id === alarmId) ||
            ongoingCallsRef.current.some((call) => call.id === alarmId))
        ) {
          return;
        }

        console.log(
          "[Frontend] Received incoming-incident for main admin:",
          data,
        );

        const callObj = {
          id: data.alarmId || Date.now(),
          number: data.phoneNumber || "Unknown",
          firstName: data.firstName || "",
          lastName: data.lastName || "",
          phoneNumber: data.phoneNumber || "",
          location: data.location || "",
          incidentType: data.incidentType || "",
          narrative: data.narrative || "",
          alarmLevel: data.alarmLevel || "",
          coordinates: resolveIncidentCoordinates(data),
          timestamp: new Date(),
        };

        // ACK handshake: tell backend we received the incident so failover timer starts
        socket.emit("incident-received", { alarmId: data.alarmId });
        addIncomingCallRef.current(callObj);
        setIncomingCalls((prev) => [...prev, callObj]);
        addNotificationRef.current({
          title: `Incoming Emergency – ${data.incidentType || "Unknown type"}`,
          message: data.location || "From end-user",
          type: "incident",
          payload: callObj,
        });

        // High-visibility alert: screen flash + siren
        setEmergencyFlash(true);
        setTimeout(() => setEmergencyFlash(false), 5000);
        playEmergencySiren();
      } catch (e) {
        console.error("[incoming-incident] handler error:", e);
      }
    });

    socket.on("incident-accepted", (data) => {
      const alarmId = Number(data?.alarmId || 0) || null;
      const acceptedBy = Number(data?.acceptedBy || 0) || null;
      if (!alarmId || (dispatcherUserId && acceptedBy === dispatcherUserId)) {
        return;
      }

      const hasMatchingCall =
        incomingCallsRef.current.some((call) => call.id === alarmId) ||
        ongoingCallsRef.current.some((call) => call.id === alarmId);

      if (!hasMatchingCall) {
        return;
      }

      cleanupDispatcherCallState(alarmId);
      try {
        if (twilioIncomingRef.current) {
          twilioRejectRef.current?.();
        }
      } catch (error) {
        console.warn(
          "[AcceptCleanup] Failed to reject incoming Twilio call:",
          error,
        );
      }
    });

    socket.on("dispatch-accepted", (data) => {
      const alarmId = Number(data?.alarmId || 0) || null;
      const acceptedBy = Number(data?.acceptedByUserId || 0) || null;
      if (!alarmId || (dispatcherUserId && acceptedBy === dispatcherUserId)) {
        return;
      }

      const hasMatchingCall =
        incomingCallsRef.current.some((call) => call.id === alarmId) ||
        ongoingCallsRef.current.some((call) => call.id === alarmId);

      if (!hasMatchingCall) {
        return;
      }

      cleanupDispatcherCallState(alarmId);
      try {
        if (twilioIncomingRef.current) {
          twilioRejectRef.current?.();
        }
      } catch (error) {
        console.warn(
          "[DispatchAcceptedCleanup] Failed to reject incoming Twilio call:",
          error,
        );
      }
    });

    socket.on("station-cleanup", (data) => {
      const alarmId = Number(data?.alarmId || 0) || null;
      const winnerUserId = Number(data?.winnerUserId || 0) || null;
      if (!alarmId || (dispatcherUserId && winnerUserId === dispatcherUserId)) {
        return;
      }

      cleanupDispatcherCallState(alarmId);
      try {
        if (twilioIncomingRef.current) {
          twilioRejectRef.current?.();
        }
      } catch (error) {
        console.warn("[StationCleanup] Failed to reject Twilio call:", error);
      }
    });

    // Auto-reject: backend tells main admin its 15s is up — dismiss modal & reject Twilio
    socket.on("auto-reject", (data) => {
      const alarmId = data?.alarmId;
      console.log(
        `[AutoReject] Main admin: failover timeout, auto-rejecting alarm ${alarmId}`,
      );
      // Remove from local incoming calls (dismiss socket modal)
      if (alarmId) {
        setIncomingCalls((prev) => prev.filter((c) => c.id !== alarmId));
        // Also remove from CallContext + localStorage
        try {
          ctxRejectCallRef.current(alarmId);
        } catch (e) {}
      }
      // Reject Twilio incoming call if still ringing (use refs to avoid stale closure)
      try {
        if (twilioIncomingRef.current) twilioRejectRef.current();
      } catch (e) {
        console.warn("[AutoReject] Twilio reject error:", e);
      }
    });

    socket.on("call-ended", (data) => {
      const alarmId = Number(data?.alarmId || 0) || null;
      const hasMatchingCall = alarmId
        ? ongoingCallsRef.current.some((call) => call.id === alarmId) ||
          incomingCallsRef.current.some((call) => call.id === alarmId)
        : false;

      if (!hasMatchingCall) {
        return;
      }

      console.log("[Socket] Received call-ended:", data);
      cleanupDispatcherCallState(alarmId);

      try {
        if (twilioIncomingRef.current) {
          twilioRejectRef.current?.();
        }
      } catch (error) {
        console.warn(
          "[CallEnded] Failed to reject incoming Twilio call:",
          error,
        );
      }

      try {
        twilioHangUpRef.current?.();
      } catch (error) {
        console.warn(
          "[CallEnded] Failed to hang up active Twilio call:",
          error,
        );
      }
    });

    // Firetruck status/alarm update from driver — only notify once per truck+status+alarm combo
    socket.on("truck-status-update", (data) => {
      try {
        console.log("[Frontend] Received truck-status-update:", data);
        if (!shouldDisplayTrackedMissionAlert(data)) {
          console.log(
            "[Frontend] Ignoring truck-status-update without active tracked mission",
          );
          return;
        }

        const alarmText = data.alarmLevel || "";
        const statusText = data.fireStatus || "";
        const driverText = data.driverName || "Unknown";
        const truckText = data.truckId ? `Truck #${data.truckId}` : "Firetruck";

        // Dedup: include alarm level so escalations always trigger a new notification
        const dedupeKey = `${data.truckId}-${statusText}-${alarmText}`;
        if (notifiedTruckStatusRef.current.has(dedupeKey)) {
          console.log(
            `[Frontend] Skipping duplicate notification for ${dedupeKey}`,
          );
          return;
        }
        notifiedTruckStatusRef.current.add(dedupeKey);

        addNotificationRef.current({
          title: `${truckText} accepted Incident #${data.alarmId}`,
          message: `${driverText} is tracking the caller (${statusText} | Alarm: ${alarmText})`,
          type: "truck-status",
        });

        // Show large modal alert
        setAlertModal({
          type: "truck-status",
          title: `🚒 ${truckText} accepted Incident #${data.alarmId}`,
          message: `Driver: ${driverText}\nStatus: ${statusText}\nAlarm Level: ${alarmText}\nLive tracking is active`,
          color: "#0d6efd",
        });
        setTimeout(
          () =>
            setAlertModal((prev) =>
              prev?.type === "truck-status" ? null : prev,
            ),
          8000,
        );
      } catch (e) {
        console.error("[truck-status-update] handler error:", e);
      }
    });

    // Dedicated alarm level escalation notification
    socket.on("alarm-level-update", (data) => {
      try {
        console.log("[Frontend] Received alarm-level-update:", data);
        const truckText = data.truckId ? `Truck #${data.truckId}` : "Firetruck";
        const prevLevel = data.previousAlarmLevel || "Unknown";
        const newLevel = data.newAlarmLevel || "Unknown";
        const driverText = data.driverName || "Unknown";

        addNotificationRef.current({
          title: `ALARM ESCALATED — Incident #${data.alarmId || "?"}`,
          message: `${truckText}: ${prevLevel} → ${newLevel} (${driverText})`,
          type: "alarm-escalation",
          payload: { alarmId: data.alarmId },
        });

        // Show large prominent alarm escalation modal
        setAlertModal({
          type: "alarm-escalation",
          title: `🚨 ALARM ESCALATED`,
          message: `Incident #${data.alarmId || "?"}\n${truckText}: ${prevLevel} → ${newLevel}\nDriver: ${driverText}`,
          color: "#dc3545",
        });
        setTimeout(
          () =>
            setAlertModal((prev) =>
              prev?.type === "alarm-escalation" ? null : prev,
            ),
          12000,
        );
      } catch (e) {
        console.error("[alarm-level-update] handler error:", e);
      }
    });

    socket.on("incident-evidence-uploaded", (data) => {
      try {
        const alarmId = Number(data?.alarmId || 0) || null;
        const mediaType = String(data?.mediaType || "image").toLowerCase();
        const evidenceId = Number(data?.evidenceId || 0) || null;
        const capturePhase = String(data?.capturePhase || "in_call").toLowerCase();
        const callerName = String(data?.callerName || "Unknown caller").trim();
        const callerPhoneNumber =
          String(data?.callerPhoneNumber || "").trim() || "No caller number";
        const previewUrl = data?.previewUrl || data?.mediaUrl || null;

        const evidenceTitle = "Caller photo evidence uploaded";
        const phaseText = capturePhase === "post_call" ? "Post-call" : "In-call";
        const notificationMessage = `${callerName} (${callerPhoneNumber}) • ${phaseText}`;

        addNotificationRef.current({
          title: `${evidenceTitle} (Alarm #${alarmId || "?"})`,
          message: notificationMessage,
          type: "incident",
          payload: {
            alarmId,
            evidenceId,
            mediaType,
            capturePhase,
            callerName,
            callerPhoneNumber,
            previewUrl,
            mediaUrl: previewUrl,
            uploadedAt: data?.uploadedAt || null,
          },
        });

        infoRef.current(
          `Photo evidence received for incident #${alarmId || "?"} from ${callerName}`,
          undefined,
          { sticky: false },
        );

        setAlertModal({
          type: "incident-evidence",
          title: `📸 CALLER EVIDENCE — Incident #${alarmId || "?"}`,
          message: `Caller: ${callerName}\nPhone: ${callerPhoneNumber}\nPhase: ${phaseText}`,
          color: "#0d6efd",
          previewUrl: previewUrl || null,
        });
        setTimeout(
          () =>
            setAlertModal((prev) =>
              prev?.type === "incident-evidence" ? null : prev,
            ),
          9000,
        );

        window.dispatchEvent(
          new CustomEvent("incident-status-updated", {
            detail: {
              alarmId,
              evidenceId,
              reason: "evidence-uploaded",
              mediaType,
              capturePhase,
              callerName,
              callerPhoneNumber,
              previewUrl,
              mediaUrl: previewUrl,
            },
          }),
        );
      } catch (e) {
        console.error("[incident-evidence-uploaded] handler error:", e);
      }
    });

    socket.on("incident-status-updated", (data) => {
      try {
        console.log("[Frontend] Received incident-status-updated:", data);
        window.dispatchEvent(
          new CustomEvent("incident-status-updated", {
            detail: data || {},
          }),
        );
      } catch (e) {
        console.error("[incident-status-updated] handler error:", e);
      }
    });

    socket.on("disconnect", (reason) => {
      if (mainAdminHeartbeatTimer) {
        clearInterval(mainAdminHeartbeatTimer);
        mainAdminHeartbeatTimer = null;
      }
      console.log("Socket disconnected from server:", reason);
    });

    return () => {
      if (mainAdminHeartbeatTimer) {
        clearInterval(mainAdminHeartbeatTimer);
      }
      socket.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    assignedStationId,
    dispatcherUserId,
    isMainAdmin,
    resolveIncidentCoordinates,
    shouldDisplayTrackedMissionAlert,
  ]);

  // Re-emit join-main-admin whenever user logs in (socket may already be connected)
  React.useEffect(() => {
    const socket = socketRef.current;
    if (!socket || !isMainAdmin) return;
    if (socket.connected) {
      const authToken = localStorage.getItem("authToken");
      if (!authToken) return;

      // Only a verified admin user should mark main admin as online.
      socket.emit("join-main-admin", { token: authToken });
      console.log("[Socket] Re-emitted join-main-admin after user login");
    }
    if (token && socket.connected) {
      socket.emit("join-dispatcher", { token });
    }
  }, [isMainAdmin, token]);

  const acceptCall = async (callId) => {
    const call = incomingCalls.find((c) => c.id === callId);
    if (!call) return;

    // Fire-and-forget: tell backend so failover timer is cancelled
    const stationId =
      user?.assignedStationId || user?.assigned_station_id || "main";
    const token = localStorage.getItem("authToken");
    console.log(
      "[Accept] Sending accept for alarm",
      callId,
      "station",
      stationId,
      "token?",
      !!token,
    );
    try {
      const response = await fetch(`${API_BASE}/incidents/${callId}/accept`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ stationId }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        cleanupDispatcherCallState(callId);

        if (response.status === 409) {
          info(
            `Incident #${callId} was already accepted by another dispatcher.`,
          );
          try {
            if (twilioIncomingRef.current) twilioRejectRef.current?.();
          } catch (error) {
            console.warn("[Accept] Failed to reject stale Twilio call:", error);
          }
          return;
        }

        throw new Error(payload?.message || "Failed to accept incident");
      }
    } catch (error) {
      console.warn("[Accept] Failed:", error);
      info(error.message || "Failed to accept incident.");
      return;
    }

    pendingAcceptedCallRef.current = {
      ...call,
      date: new Date().toLocaleDateString(),
      time: new Date().toLocaleTimeString(),
      status: "Ongoing",
    };
    setPendingAcceptedAlarmId(callId);
    setIncomingCalls((prev) => prev.filter((c) => c.id !== callId));

    // After accepting, navigate to Incident Report and open the global voice console overlay
    setVoiceConsoleOpen(true);
    navigate("/incident-report");
  };

  const rejectCall = (callId) => {
    setIncomingCalls((prev) => prev.filter((c) => c.id !== callId));
    try {
      ctxRejectCallRef.current?.(callId);
    } catch (error) {
      console.warn("[Dismiss] Failed to clear call context:", error);
    }
  };

  const endOngoingCall = (callId) => {
    setOngoingCalls((prev) => prev.filter((c) => c.id !== callId));
  };
  // ==================

  const showVoiceConsoleOverlay =
    location.pathname !== "/station-readiness" &&
    voiceConsoleOpen &&
    !voiceConsoleMinimized;

  return (
    <>
      {hideLayout ? (
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
        </Routes>
      ) : (
        <div className="app-layout">
          <Sidebar />
          <div className="main-container">
            <Topnavbar />

            <main className="content-area">
              {/* Global toast notifications for incidents and system messages */}
              <ToastContainer toasts={toasts} />
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
                <Route
                  path="/"
                  element={
                    <ProtectedRoute>
                      <Dashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/past-incidents"
                  element={
                    <ProtectedRoute>
                      <PastIncidents />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/reports"
                  element={
                    <ProtectedRoute>
                      <Reports />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/emergency-calls"
                  element={
                    <ProtectedRoute>
                      <EmergencyCallHistory />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/officers"
                  element={
                    <ProtectedRoute>
                      <Officers />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/incident-report"
                  element={
                    <ProtectedRoute>
                      <IncidentReport />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/branch-status"
                  element={
                    <ProtectedRoute>
                      <BranchStatus />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/station-readiness"
                  element={
                    <ProtectedRoute>
                      <StationReadiness />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/content-management"
                  element={
                    <ProtectedRoute>
                      <ContentManagement />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/settings"
                  element={
                    <ProtectedRoute>
                      <Settings />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/test"
                  element={
                    <ProtectedRoute>
                      <TestPage />
                    </ProtectedRoute>
                  }
                />
              </Routes>
            </main>
          </div>

          {/* ==== Emergency Screen Flash ==== */}
          {emergencyFlash && <div className="emergency-flash-overlay" />}

          {/* ==== Incoming Emergency Call Modal (socket-based) ==== */}
          {incomingCalls.length > 0 && (
            <div
              className="modal-overlay"
              style={{ zIndex: 10001, background: "rgba(0,0,0,0.7)" }}
            >
              <div
                className="modal-card"
                style={{
                  textAlign: "center",
                  maxWidth: "420px",
                  padding: "32px 28px",
                  borderRadius: "16px",
                  animation: "pulse 1.5s infinite",
                }}
              >
                <div style={{ fontSize: "48px", marginBottom: "12px" }}>📞</div>
                <h2
                  style={{
                    margin: "0 0 8px",
                    color: "#dc3545",
                    fontSize: "1.5em",
                  }}
                >
                  Incoming Emergency
                </h2>
                <p style={{ margin: "4px 0", fontSize: "1.1em" }}>
                  <strong>Type:</strong>{" "}
                  {incomingCalls[0].incidentType || "Unknown"}
                </p>
                <p style={{ margin: "4px 0" }}>
                  <strong>From:</strong>{" "}
                  {incomingCalls[0].phoneNumber ||
                    incomingCalls[0].number ||
                    "Unknown"}
                </p>
                {incomingCalls[0].location && (
                  <p style={{ margin: "4px 0" }}>
                    <strong>Location:</strong> {incomingCalls[0].location}
                  </p>
                )}
                {incomingCalls[0].alarmLevel && (
                  <p style={{ margin: "4px 0" }}>
                    <strong>Alarm:</strong> {incomingCalls[0].alarmLevel}
                  </p>
                )}
                <div
                  style={{
                    marginTop: "20px",
                    display: "flex",
                    gap: "12px",
                    justifyContent: "center",
                  }}
                >
                  <button
                    onClick={() => {
                      clearDismissedAlarm(incomingCalls[0].id);
                      acceptCall(incomingCalls[0].id);
                      if (twilioIncomingCall) {
                        try {
                          twilioAcceptIncoming();
                        } catch (e) {}
                      } else {
                        setPendingTwilioAccept(true);
                      }
                    }}
                    style={{
                      padding: "12px 32px",
                      backgroundColor: "#28a745",
                      color: "#fff",
                      border: "none",
                      borderRadius: "8px",
                      cursor: "pointer",
                      fontWeight: "bold",
                      fontSize: "1em",
                      boxShadow: "0 2px 8px rgba(40,167,69,0.4)",
                    }}
                  >
                    Accept
                  </button>
                  <button
                    onClick={() => {
                      markAlarmDismissed(incomingCalls[0].id);
                      rejectCall(incomingCalls[0].id);
                      try {
                        if (twilioIncomingCall) twilioRejectIncoming();
                      } catch (e) {}
                    }}
                    style={{
                      padding: "12px 32px",
                      backgroundColor: "#6c757d",
                      color: "#fff",
                      border: "none",
                      borderRadius: "8px",
                      cursor: "pointer",
                      fontWeight: "bold",
                      fontSize: "1em",
                    }}
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          )}

          {dismissUndo && (
            <div
              style={{
                position: "fixed",
                bottom: "20px",
                right: "20px",
                zIndex: 10002,
                background: "#1f2937",
                color: "#fff",
                padding: "12px 14px",
                borderRadius: "10px",
                display: "flex",
                gap: "10px",
                alignItems: "center",
                boxShadow: "0 6px 24px rgba(0,0,0,0.35)",
              }}
            >
              <span>Incident dismissed. Undo?</span>
              <button
                onClick={() => clearDismissedAlarm(dismissUndo.alarmId)}
                style={{
                  background: "#22c55e",
                  color: "#fff",
                  border: "none",
                  borderRadius: "6px",
                  padding: "6px 10px",
                  fontWeight: "bold",
                  cursor: "pointer",
                }}
              >
                Undo
              </button>
            </div>
          )}

          {/* Twilio Voice Incoming Call modal removed — socket modal handles UX,
              auto-reject handles Twilio SDK call dismissal via refs */}

          {/* ==== Large Alert Modal (truck status / alarm escalation) ==== */}
          {alertModal && (
            <div
              className="modal-overlay"
              style={{ zIndex: 10000, background: "rgba(0,0,0,0.6)" }}
            >
              <div
                style={{
                  textAlign: "center",
                  maxWidth: "480px",
                  width: "90%",
                  padding: "36px 32px",
                  borderRadius: "16px",
                  background: "#fff",
                  boxShadow: `0 0 40px ${alertModal.color}66, 0 8px 32px rgba(0,0,0,0.4)`,
                  border: `3px solid ${alertModal.color}`,
                  animation: "pulse 1.5s infinite",
                  overflow: "hidden",
                  wordBreak: "break-word",
                }}
              >
                <div style={{ fontSize: "56px", marginBottom: "16px" }}>
                  {alertModal.type === "alarm-escalation" ? "🚨" : "🚒"}
                </div>
                <h2
                  style={{
                    margin: "0 0 12px",
                    color: alertModal.color,
                    fontSize: "1.6em",
                    fontWeight: "bold",
                  }}
                >
                  {alertModal.title}
                </h2>
                {alertModal.message.split("\n").map((line, i) => (
                  <p
                    key={i}
                    style={{
                      margin: "6px 0",
                      fontSize: "1.15em",
                      color: "#333",
                      wordBreak: "break-word",
                      overflowWrap: "anywhere",
                    }}
                  >
                    {line}
                  </p>
                ))}
                {alertModal.previewUrl && (
                  <a href={alertModal.previewUrl} target="_blank" rel="noreferrer">
                    <img
                      src={alertModal.previewUrl}
                      alt="Evidence preview"
                      style={{
                        maxWidth: "100%",
                        maxHeight: "200px",
                        borderRadius: "8px",
                        marginTop: "12px",
                        objectFit: "contain",
                        border: "1px solid #ddd",
                      }}
                    />
                  </a>
                )}
                <button
                  onClick={() => setAlertModal(null)}
                  style={{
                    marginTop: "24px",
                    padding: "12px 40px",
                    backgroundColor: alertModal.color,
                    color: "#fff",
                    border: "none",
                    borderRadius: "8px",
                    cursor: "pointer",
                    fontWeight: "bold",
                    fontSize: "1em",
                    boxShadow: `0 2px 8px ${alertModal.color}44`,
                  }}
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}

          {/* ==== Floating Call Station Button ==== */}
          {twilioIdentity && !voiceConsoleOpen && !twilioActiveCall && (
            <div
              onClick={() => {
                setVoiceConsoleOpen(true);
                setVoiceConsoleMinimized(false);
              }}
              style={{
                position: "fixed",
                bottom: "100px",
                right: "20px",
                zIndex: 9999,
                background: "#1a1a2e",
                color: "#fff",
                padding: "10px 16px",
                borderRadius: "10px",
                cursor: "pointer",
                fontWeight: "bold",
                fontSize: "13px",
                boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              📞 Call Station
            </div>
          )}

          {/* ==== Twilio Status Indicator ==== */}
          {twilioIdentity && (
            <div
              style={{
                position: "fixed",
                bottom: "60px",
                right: "16px",
                zIndex: 9998,
                display: "flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "11px",
                color: "#666",
                background: "#f8f9fa",
                padding: "4px 10px",
                borderRadius: "12px",
                boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
              }}
            >
              <span
                style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  background:
                    twilioStatus === "ready"
                      ? "#28a745"
                      : twilioStatus === "busy"
                        ? "#ffc107"
                        : "#dc3545",
                }}
              ></span>
              Twilio: {twilioStatus} ({twilioIdentity})
            </div>
          )}

          {/* ==== Floating Voice Console Panel ==== */}
          {showVoiceConsoleOverlay && (
            <div
              ref={voiceCardRef}
              style={{
                position: "fixed",
                bottom: "100px",
                right: "20px",
                zIndex: 10002,
                width: "300px",
                background: "#1a1a2e",
                color: "#fff",
                borderRadius: "12px",
                boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
                overflow: "hidden",
              }}
            >
              <div
                onMouseDown={handleVoiceHeaderMouseDown}
                style={{
                  background: "#16213e",
                  padding: "10px 16px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  cursor: "move",
                  userSelect: "none",
                }}
              >
                <span style={{ fontWeight: "bold", fontSize: "14px" }}>
                  🎙️ Voice Console
                </span>
                <div style={{ display: "flex", gap: "6px" }}>
                  <button
                    onClick={() => setVoiceConsoleMinimized(true)}
                    style={{
                      background: "#ffc107",
                      border: "none",
                      borderRadius: "50%",
                      width: "18px",
                      height: "18px",
                      cursor: "pointer",
                      fontWeight: "bold",
                      fontSize: "12px",
                      lineHeight: "18px",
                      padding: 0,
                    }}
                  >
                    —
                  </button>
                  <button
                    onClick={() => setVoiceConsoleOpen(false)}
                    style={{
                      background: "#dc3545",
                      border: "none",
                      borderRadius: "50%",
                      width: "18px",
                      height: "18px",
                      cursor: "pointer",
                      fontWeight: "bold",
                      fontSize: "12px",
                      lineHeight: "18px",
                      padding: 0,
                      color: "#fff",
                    }}
                  >
                    ×
                  </button>
                </div>
              </div>
              <div style={{ padding: "16px" }}>
                <div
                  style={{
                    marginBottom: "12px",
                    fontSize: "13px",
                    color: "#aaa",
                  }}
                >
                  Identity:{" "}
                  <strong style={{ color: "#fff" }}>{twilioIdentity}</strong>
                </div>
                {twilioActiveCall ? (
                  <>
                    <div
                      style={{
                        color: "#28a745",
                        fontWeight: "bold",
                        marginBottom: "12px",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                      }}
                    >
                      <span
                        style={{
                          width: "10px",
                          height: "10px",
                          borderRadius: "50%",
                          background: "#28a745",
                          animation: "pulse 1s infinite",
                          display: "inline-block",
                        }}
                      ></span>
                      On Call —{" "}
                      {twilioActiveCall.parameters?.From ||
                        twilioActiveCall.parameters?.To ||
                        "Emergency"}
                    </div>
                    <div
                      style={{
                        display: "flex",
                        gap: "6px",
                        marginBottom: "8px",
                      }}
                    >
                      <button
                        onClick={() => handleDispatcherHangUp()}
                        style={{
                          flex: 1,
                          padding: "10px",
                          background: "#dc3545",
                          color: "#fff",
                          border: "none",
                          borderRadius: "8px",
                          cursor: "pointer",
                          fontWeight: "bold",
                          fontSize: "13px",
                        }}
                      >
                        📵 Hang Up
                      </button>
                      <button
                        onClick={() =>
                          setShowTransferPicker(!showTransferPicker)
                        }
                        style={{
                          flex: 1,
                          padding: "10px",
                          background: "#0d6efd",
                          color: "#fff",
                          border: "none",
                          borderRadius: "8px",
                          cursor: "pointer",
                          fontWeight: "bold",
                          fontSize: "13px",
                        }}
                      >
                        🔀 Transfer
                      </button>
                    </div>
                    {showTransferPicker && (
                      <div
                        style={{
                          maxHeight: "140px",
                          overflowY: "auto",
                          borderTop: "1px solid #333",
                          paddingTop: "8px",
                        }}
                      >
                        <div
                          style={{
                            fontSize: "11px",
                            color: "#aaa",
                            marginBottom: "6px",
                          }}
                        >
                          Transfer to:
                        </div>
                        {stationsList.map((st) => {
                          const stationRowId =
                            Number(st.station_id || st.id || 0) || null;
                          const stationType = String(st.station_type || "")
                            .trim()
                            .toLowerCase();
                          if (!stationRowId || stationType === "main")
                            return null;
                          return (
                            <button
                              key={stationRowId}
                              onClick={() =>
                                handleTransferCall(`ADM_SUB_${stationRowId}`)
                              }
                              style={{
                                width: "100%",
                                padding: "6px 8px",
                                marginBottom: "3px",
                                background: "#1a3a5c",
                                color: "#fff",
                                border: "1px solid #2a4a6c",
                                borderRadius: "4px",
                                cursor: "pointer",
                                fontSize: "11px",
                                textAlign: "left",
                              }}
                            >
                              📡 {st.station_name || `Station ${stationRowId}`}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </>
                ) : twilioIncomingCall ? (
                  <>
                    <div
                      style={{
                        color: "#ffc107",
                        fontWeight: "bold",
                        marginBottom: "12px",
                      }}
                    >
                      📞 Incoming call ringing...
                    </div>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <button
                        onClick={twilioAcceptIncoming}
                        style={{
                          flex: 1,
                          padding: "10px",
                          background: "#28a745",
                          color: "#fff",
                          border: "none",
                          borderRadius: "8px",
                          cursor: "pointer",
                          fontWeight: "bold",
                        }}
                      >
                        ✅ Accept
                      </button>
                      <button
                        onClick={twilioRejectIncoming}
                        style={{
                          flex: 1,
                          padding: "10px",
                          background: "#6c757d",
                          color: "#fff",
                          border: "none",
                          borderRadius: "8px",
                          cursor: "pointer",
                          fontWeight: "bold",
                        }}
                      >
                        ❌ Reject
                      </button>
                    </div>
                  </>
                ) : (
                  <div style={{ padding: "4px 0" }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        marginBottom: "10px",
                        fontSize: "13px",
                        color: "#aaa",
                      }}
                    >
                      <span
                        style={{
                          width: "8px",
                          height: "8px",
                          borderRadius: "50%",
                          background:
                            twilioStatus === "ready" ? "#28a745" : "#ffc107",
                          display: "inline-block",
                        }}
                      ></span>
                      Twilio:{" "}
                      <strong
                        style={{
                          color:
                            twilioStatus === "ready" ? "#28a745" : "#ffc107",
                        }}
                      >
                        {twilioStatus}
                      </strong>
                    </div>
                    <div
                      style={{
                        fontSize: "12px",
                        fontWeight: "bold",
                        color: "#ccc",
                        marginBottom: "8px",
                      }}
                    >
                      📞 Call a Station
                    </div>
                    <div style={{ maxHeight: "180px", overflowY: "auto" }}>
                      {stationsList.map((st) => {
                        const stationRowId =
                          Number(st.station_id || st.id || 0) || null;
                        if (!stationRowId) return null;
                        return (
                          <button
                            key={stationRowId}
                            onClick={() => {
                              twilioMakeCall(`ADM_SUB_${stationRowId}`);
                            }}
                            disabled={twilioStatus !== "ready"}
                            style={{
                              width: "100%",
                              padding: "8px 10px",
                              marginBottom: "4px",
                              background: "#0f3460",
                              color: "#fff",
                              border: "1px solid #1a1a4e",
                              borderRadius: "6px",
                              cursor:
                                twilioStatus === "ready"
                                  ? "pointer"
                                  : "not-allowed",
                              fontSize: "12px",
                              textAlign: "left",
                              opacity: twilioStatus === "ready" ? 1 : 0.5,
                            }}
                          >
                            📡 {st.station_name || `Station ${stationRowId}`}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Minimized voice console tab */}
          {voiceConsoleOpen && voiceConsoleMinimized && (
            <div
              onClick={() => setVoiceConsoleMinimized(false)}
              style={{
                position: "fixed",
                bottom: "100px",
                right: "20px",
                zIndex: 10002,
                background: twilioActiveCall ? "#28a745" : "#1a1a2e",
                color: "#fff",
                padding: "8px 14px",
                borderRadius: "8px",
                cursor: "pointer",
                fontWeight: "bold",
                fontSize: "13px",
                boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
              }}
            >
              🎙️ {twilioActiveCall ? "On Call" : "Voice Console"} ▲
            </div>
          )}
        </div>
      )}
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <CallProvider>
        <StatusProvider>
          <NotificationProvider>
            <BrowserRouter>
              <AppContent />
            </BrowserRouter>
          </NotificationProvider>
        </StatusProvider>
      </CallProvider>
    </AuthProvider>
  );
}
