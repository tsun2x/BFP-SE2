import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
  ReactNode,
} from "react";
import { Alert, Platform, Vibration } from "react-native";
import * as Notifications from "expo-notifications";
import { useAuth } from "./AuthContext";
import { API_URL } from "../config";
import io, { Socket } from "socket.io-client";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// ── BFP Alarm Levels ────────────────────────────────────────────────────
export const ALARM_LEVELS = [
  {
    key: "1st Alarm",
    label: "1st Alarm",
    color: "#FFC107",
    icon: "flame-outline",
  },
  { key: "2nd Alarm", label: "2nd Alarm", color: "#FF9800", icon: "flame" },
  { key: "3rd Alarm", label: "3rd Alarm", color: "#FF5722", icon: "flame" },
  { key: "4th Alarm", label: "4th Alarm", color: "#F44336", icon: "flame" },
  { key: "5th Alarm", label: "5th Alarm", color: "#D32F2F", icon: "flame" },
  {
    key: "Task Force Alpha",
    label: "TF Alpha",
    color: "#9C27B0",
    icon: "shield",
  },
  {
    key: "Task Force Bravo",
    label: "TF Bravo",
    color: "#7B1FA2",
    icon: "shield",
  },
  {
    key: "Task Force Delta",
    label: "TF Delta",
    color: "#4A148C",
    icon: "shield",
  },
  {
    key: "General Alarm",
    label: "General Alarm",
    color: "#000000",
    icon: "warning",
  },
] as const;

// ── Fire Status Phases ──────────────────────────────────────────────────
export const STATUS_PHASES = [
  {
    key: "Standby",
    label: "Standby",
    color: "#607D8B",
    icon: "time-outline",
    description: "Awaiting dispatch",
  },
  {
    key: "En Route",
    label: "En Route",
    color: "#2196F3",
    icon: "car-sport",
    description: "Proceeding to fire site",
  },
  {
    key: "On Scene",
    label: "On Scene",
    color: "#FF9800",
    icon: "location",
    description: "Arrived — fighting fire",
  },
  {
    key: "Fire Under Control",
    label: "Fire Under Control",
    color: "#FFC107",
    icon: "shield-checkmark",
    description: "Fire contained — under control",
  },
  {
    key: "Fire Out",
    label: "Fire Out",
    color: "#4CAF50",
    icon: "checkmark-circle",
    description: "Fire extinguished",
  },
] as const;

export type MissionContextType = {
  fireStatus: string;
  alarmLevel: string;
  activeAlarmId: number | null;
  incidentTarget: {
    alarmId: number | null;
    latitude: number | null;
    longitude: number | null;
    locationText: string | null;
  } | null;
  pendingIncident: any | null;
  showDispatchAlert: boolean;
  truckId: number | null;
  connected: boolean;
  isClaimingMission: boolean;
  socketRef: React.MutableRefObject<Socket | null>;
  setFireStatus: (s: string) => void;
  setAlarmLevel: (a: string) => void;
  setActiveAlarmId: (id: number | null) => void;
  dismissDispatchAlert: () => void;
  broadcastStatus: (
    newStatus: string,
    newAlarm: string,
    lat?: number,
    lng?: number,
  ) => Promise<void>;
  claimMission: () => Promise<boolean>;
  handleStatusChange: (newStatus: string) => void;
  handleAlarmChange: (newAlarm: string) => void;
  handleEndMission: () => void;
};

const MissionContext = createContext<MissionContextType | undefined>(undefined);

const toNumberOrNull = (value: any): number | null => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const extractIncidentTarget = (incident: any) => {
  if (!incident) return null;

  const latitude =
    toNumberOrNull(incident.latitude) ??
    toNumberOrNull(incident.user_latitude) ??
    toNumberOrNull(incident.lat) ??
    toNumberOrNull(incident.coordinates?.latitude) ??
    toNumberOrNull(incident.coordinates?.lat);

  const longitude =
    toNumberOrNull(incident.longitude) ??
    toNumberOrNull(incident.user_longitude) ??
    toNumberOrNull(incident.lng) ??
    toNumberOrNull(incident.coordinates?.longitude) ??
    toNumberOrNull(incident.coordinates?.lng);

  return {
    alarmId: toNumberOrNull(incident.alarmId) ?? null,
    latitude,
    longitude,
    locationText: incident.location || incident.address || null,
  };
};

export const MissionProvider = ({ children }: { children: ReactNode }) => {
  const { user, token } = useAuth();
  const socketRef = useRef<Socket | null>(null);

  const [fireStatus, setFireStatus] = useState<string>("Standby");
  const [alarmLevel, setAlarmLevel] = useState<string>("1st Alarm");
  const [activeAlarmId, setActiveAlarmId] = useState<number | null>(null);
  const [incidentTarget, setIncidentTarget] = useState<{
    alarmId: number | null;
    latitude: number | null;
    longitude: number | null;
    locationText: string | null;
  } | null>(null);
  const [pendingIncident, setPendingIncident] = useState<any | null>(null);
  const [showDispatchAlert, setShowDispatchAlert] = useState(false);
  const [truckId, setTruckId] = useState<number | null>(null);
  const [connected, setConnected] = useState(false);
  const [isClaimingMission, setIsClaimingMission] = useState(false);

  // Fetch the driver's assigned truck from backend
  useEffect(() => {
    if (!token || !user?.id) return;
    const fetchMyTruck = async () => {
      try {
        const res = await fetch(`${API_URL}/api/firetrucks/my-truck`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "ngrok-skip-browser-warning": "true",
          },
        });
        const data = await res.json();
        if (res.ok && data.truck?.truck_id) {
          setTruckId(data.truck.truck_id);
          console.log("[Truck] My truck ID:", data.truck.truck_id);
        } else {
          console.warn("[Truck] No truck assigned:", data.message || res.status);
        }
      } catch (err: any) {
        console.error("[Truck] Failed to fetch my truck:", err?.message || err);
      }
    };
    fetchMyTruck();
  }, [token, user?.id]);

  useEffect(() => {
    const configureNotifications = async () => {
      try {
        const { status: existingStatus } =
          await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;

        if (existingStatus !== "granted") {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }

        if (Platform.OS === "android") {
          await Notifications.setNotificationChannelAsync("dispatch-alerts", {
            name: "Dispatch Alerts",
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 400, 200, 400],
            sound: "default",
            lockscreenVisibility:
              Notifications.AndroidNotificationVisibility.PUBLIC,
          });
        }

        if (finalStatus !== "granted") {
          console.warn("[Truck] Notification permission not granted");
        }
      } catch (error: any) {
        console.warn(
          "[Truck] Notification configuration failed:",
          error?.message || error,
        );
      }
    };

    configureNotifications();
  }, []);

  // Connect socket on mount
  useEffect(() => {
    const socket = io(API_URL, { transports: ["websocket", "polling"] });
    socketRef.current = socket;

    socket.on("connect", () => {
      setConnected(true);
      console.log("[Truck] Socket connected:", socket.id);
      socket.emit("join-truck", { truckId });
      if (token && user?.assignedStationId) {
        socket.emit("join-driver-station", {
          token,
          stationId: user.assignedStationId,
        });
      }
    });

    // Listen for dispatch assignments from admin
    socket.on("incoming-incident", (data: any) => {
      console.log("[Truck] Received dispatch:", data);
      if (data.alarmId) {
        const target = extractIncidentTarget(data);
        if (target) {
          setIncidentTarget(target);
        }
        setPendingIncident(data);
        setShowDispatchAlert(true);
        Vibration.vibrate([0, 500, 200, 500]);

        Notifications.scheduleNotificationAsync({
          content: {
            title: `Dispatch #${data.alarmId}`,
            body: `${data.incidentType || "Fire"} at ${data.location || "Unknown location"}`,
            data: {
              alarmId: data.alarmId,
              dispatchSource: data.dispatchSource || "station-report",
            },
            sound: "default",
          },
          trigger: null,
        }).catch((error: any) => {
          console.warn(
            "[Truck] Failed to schedule local notification:",
            error?.message || error,
          );
        });

        Alert.alert(
          "DISPATCH RECEIVED",
          `Incident #${data.alarmId}\nCaller: ${data.callerFullName || "Unknown caller"}\n${data.incidentType || "Fire"} at ${data.location || "Unknown"}\nAlarm: ${data.alarmLevel || "1st Alarm"}`,
          [{ text: "REVIEW", style: "default" }],
        );
      }
    });

    // Listen for incident status updates globally (for all online drivers)
    socket.on("incident-status-updated", (data: any) => {
      if (!data?.alarmId) return;
      // Only alert if this is the current or pending mission
      if (
        Number(data.alarmId) === Number(activeAlarmId) ||
        (pendingIncident &&
          Number(data.alarmId) === Number(pendingIncident.alarmId))
      ) {
        Alert.alert(
          "INCIDENT STATUS UPDATE",
          `Incident #${data.alarmId} status: ${data.status}`,
          [{ text: "OK", style: "default" }],
        );
      }
    });

    socket.on("driver-mission-claimed", (data: any) => {
      if (!data?.alarmId) return;

      if (Number(data.driverUserId) === Number(user?.id)) {
        return;
      }

      setPendingIncident((current: any) => {
        if (!current || Number(current.alarmId) !== Number(data.alarmId)) {
          return current;
        }

        Alert.alert(
          "Mission Unavailable",
          `Incident #${data.alarmId} was already claimed by ${data.driverName || "another driver"}.`,
        );
        setShowDispatchAlert(false);
        return null;
      });
    });

    socket.on("disconnect", () => {
      setConnected(false);
      console.log("[Truck] Socket disconnected");
    });

    return () => {
      socket.disconnect();
    };
  }, [
    token,
    truckId,
    user?.assignedStationId,
    user?.id,
    activeAlarmId,
    pendingIncident,
  ]);

  const claimMission = useCallback(async () => {
    if (!pendingIncident?.alarmId) {
      return false;
    }

    if (!token) {
      Alert.alert("Mission Claim Failed", "You are not authenticated.");
      return false;
    }

    if (!truckId) {
      Alert.alert("Mission Claim Failed", "No firetruck assigned to your account. Contact your station admin.");
      return false;
    }

    setIsClaimingMission(true);
    try {
      const response = await fetch(
        `${API_URL}/api/incidents/${pendingIncident.alarmId}/driver-accept`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            "ngrok-skip-browser-warning": "true",
          },
          body: JSON.stringify({ truckId }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Mission claim failed");
      }

      setActiveAlarmId(pendingIncident.alarmId);
      setAlarmLevel(pendingIncident.alarmLevel || "1st Alarm");
      const target = extractIncidentTarget(pendingIncident);
      if (target) {
        setIncidentTarget(target);
      }
      setFireStatus("Standby");
      setPendingIncident(null);
      setShowDispatchAlert(false);

      Alert.alert(
        "Mission Claimed",
        `Incident #${pendingIncident.alarmId} is now assigned to you.`,
      );
      return true;
    } catch (error: any) {
      Alert.alert(
        "Mission Claim Failed",
        error?.message ||
          "Another driver may have already claimed this mission.",
      );
      return false;
    } finally {
      setIsClaimingMission(false);
    }
  }, [pendingIncident, token, truckId]);

  const dismissDispatchAlert = useCallback(() => {
    setShowDispatchAlert(false);
  }, []);

  // Broadcast status update to backend + socket
  const broadcastStatus = useCallback(
    async (newStatus: string, newAlarm: string, lat?: number, lng?: number) => {
      const payload: any = {
        truckId,
        alarmId: activeAlarmId,
        alarmLevel: newAlarm,
        fireStatus: newStatus,
        driverName: user?.name || "Unknown Driver",
        updatedAt: new Date().toISOString(),
      };
      if (lat !== undefined) payload.latitude = lat;
      if (lng !== undefined) payload.longitude = lng;

      // Emit via socket for instant broadcast
      if (socketRef.current?.connected) {
        socketRef.current.emit("truck-status-update", payload);
      }

      // Persist via REST API
      const url = `${API_URL}/api/firetrucks/status`;
      console.log("[Truck] PUT →", url, "| token?", !!token);
      try {
        const resp = await fetch(url, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            "ngrok-skip-browser-warning": "true",
          },
          body: JSON.stringify({
            truck_id: truckId,
            alarm_id: activeAlarmId,
            alarm_level: newAlarm,
            fire_status: newStatus,
            driver_name: user?.name,
            latitude: lat,
            longitude: lng,
          }),
        });
        console.log("[Truck] REST response:", resp.status, resp.statusText);
      } catch (e: any) {
        console.error("[Truck] REST status update failed:", e?.message || e);
      }
    },
    [truckId, activeAlarmId, token, user?.name],
  );

  const handleStatusChange = useCallback(
    (newStatus: string) => {
      if (!activeAlarmId && newStatus !== "Standby") {
        Alert.alert(
          "No Active Mission",
          "Claim a dispatch before updating mission status.",
        );
        return;
      }
      if (newStatus === "Standby" && fireStatus !== "Fire Out") return;
      
      // Auto-end mission when Fire Out is pressed
      if (newStatus === "Fire Out") {
        Alert.alert(
          "Fire Out - End Mission?",
          "Fire is extinguished. Would you like to end this mission and return to Standby?",
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "End Mission",
              style: "destructive",
              onPress: () => {
                setFireStatus("Standby");
                setAlarmLevel("1st Alarm");
                setActiveAlarmId(null);
                setIncidentTarget(null);
                setPendingIncident(null);
                setShowDispatchAlert(false);
                broadcastStatus("Standby", "1st Alarm");
              },
            },
          ],
        );
        return;
      }
      
      setFireStatus(newStatus);
      broadcastStatus(newStatus, alarmLevel);
      Vibration.vibrate(100);
    },
    [fireStatus, alarmLevel, broadcastStatus, activeAlarmId],
  );

  const handleAlarmChange = useCallback(
    (newAlarm: string) => {
      setAlarmLevel(newAlarm);
      broadcastStatus(fireStatus, newAlarm);
      Vibration.vibrate([0, 100, 50, 100]);
    },
    [fireStatus, broadcastStatus],
  );

  const handleEndMission = useCallback(() => {
    Alert.alert(
      "End Mission",
      "Are you sure you want to end this mission and return to Standby?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "End Mission",
          style: "destructive",
          onPress: () => {
            setFireStatus("Standby");
            setAlarmLevel("1st Alarm");
            setActiveAlarmId(null);
            setIncidentTarget(null);
            setPendingIncident(null);
            setShowDispatchAlert(false);
            broadcastStatus("Standby", "1st Alarm");
          },
        },
      ],
    );
  }, [broadcastStatus]);

  return (
    <MissionContext.Provider
      value={{
        fireStatus,
        alarmLevel,
        activeAlarmId,
        incidentTarget,
        pendingIncident,
        showDispatchAlert,
        truckId,
        connected,
        isClaimingMission,
        socketRef,
        setFireStatus,
        setAlarmLevel,
        setActiveAlarmId,
        dismissDispatchAlert,
        broadcastStatus,
        claimMission,
        handleStatusChange,
        handleAlarmChange,
        handleEndMission,
      }}
    >
      {children}
    </MissionContext.Provider>
  );
};

export const useMission = (): MissionContextType => {
  const ctx = useContext(MissionContext);
  if (!ctx) throw new Error("useMission must be used within a MissionProvider");
  return ctx;
};
