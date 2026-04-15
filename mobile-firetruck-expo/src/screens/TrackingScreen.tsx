// src/screens/TrackingScreen.tsx
import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Modal,
  ActivityIndicator,
} from "react-native";
import * as Location from "expo-location";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../context/AuthContext";
import {
  useMission,
  ALARM_LEVELS,
  STATUS_PHASES,
} from "../context/MissionContext";
import { API_URL } from "../config";
import useTwilioVoice from "../hooks/useTwilioVoice";
import useFcmIncomingCall from "../hooks/useFcmIncomingCall";

const TrackingScreen = () => {
  const { user, token } = useAuth();
  const { fireStatus, alarmLevel, truckId, broadcastStatus } = useMission();
  const [isTracking, setIsTracking] = useState<boolean>(false);
  const [isStartingTracking, setIsStartingTracking] = useState<boolean>(false);
  const [location, setLocation] = useState<Location.LocationObject | null>(
    null,
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [parentStationName, setParentStationName] = useState<string>(
    user?.stationName || "Assigned station",
  );
  const [parentStationPhone, setParentStationPhone] = useState<string | null>(
    user?.stationContactNumber || null,
  );
  const [isLoadingStationContact, setIsLoadingStationContact] =
    useState<boolean>(false);
  const locationSubscription = useRef<Location.LocationSubscription | null>(
    null,
  );

  const getParentStationTwilioIdentity = () => {
    const assignedStationId = Number(user?.assignedStationId);
    if (!Number.isFinite(assignedStationId)) return null;
    if (assignedStationId === 1) return "ADM_MAIN";
    return `ADM_SUB_${assignedStationId}`;
  };

  const twilioIdentity = user?.id ? `TRUCK_${user.id}` : null;
  const twilioTargetIdentity = getParentStationTwilioIdentity();
  const {
    status: twilioStatus,
    activeCall,
    incomingInvite,
    makeCall,
    acceptIncoming,
    rejectIncoming,
    hangUp,
    toggleMute,
    toggleSpeaker,
    isMuted,
    isSpeaker,
    error: twilioError,
    retryInit,
  } = useTwilioVoice(twilioIdentity, token);

  // Register FCM token for push-based incoming call notifications
  useFcmIncomingCall(token, twilioIdentity, (callData) => {
    console.log("[TrackingScreen] FCM incoming call:", callData);
    // The push wakes up the app; Twilio SDK CallInvite handles the rest.
    // If SDK isn't ready, retry initialization so it can pick up the invite.
    if (twilioStatus === "offline") {
      retryInit();
    }
  });

  const currentAlarm =
    ALARM_LEVELS.find((a) => a.key === alarmLevel) || ALARM_LEVELS[0];
  const currentStatus =
    STATUS_PHASES.find((s) => s.key === fireStatus) || STATUS_PHASES[0];

  const loadParentStationContact = async () => {
    if (!token || !user?.assignedStationId) return;

    if (user.stationContactNumber) {
      setParentStationPhone(user.stationContactNumber);
    }
    if (user.stationName) {
      setParentStationName(user.stationName);
    }

    setIsLoadingStationContact(true);
    try {
      const res = await fetch(API_URL + "/api/me", {
        method: "GET",
        headers: {
          Authorization: "Bearer " + token,
          "ngrok-skip-browser-warning": "true",
        },
      });

      if (!res.ok) {
        return;
      }

      const data = await res.json();
      const me = data?.user;
      const assignedStationId = Number(me?.assignedStationId || 0) || null;
      const localAssignedStationId = Number(user?.assignedStationId || 0) || null;
      const stationInfo = me?.stationInfo;

      if (assignedStationId && localAssignedStationId && assignedStationId !== localAssignedStationId) {
        console.warn(
          `[Tracking] Assigned station mismatch: token=${localAssignedStationId}, /me=${assignedStationId}. Using /me station info.`,
        );
      }

      if (!assignedStationId) {
        return;
      }

      if (stationInfo?.station_name) {
        setParentStationName(stationInfo.station_name);
      }
      if (stationInfo?.contact_number) {
        setParentStationPhone(stationInfo.contact_number);
      }
    } catch {
      // Keep fallback values from login session if /me fails.
    } finally {
      setIsLoadingStationContact(false);
    }
  };

  const handleCallParentStation = async () => {
    if (!user?.assignedStationId) {
      Alert.alert(
        "No assigned station",
        "This firetruck account has no parent station assigned.",
      );
      return;
    }

    if (!twilioIdentity || !twilioTargetIdentity) {
      Alert.alert(
        "Call service not ready",
        "Missing call identity for this account.",
      );
      return;
    }

    if (twilioStatus !== "ready" && twilioStatus !== "busy") {
      retryInit();
      if (twilioError) {
        Alert.alert(
          "Call service offline",
          `Retrying connection now.\n\n${twilioError}`,
        );
      } else {
        Alert.alert(
          "Call service initializing",
          "Voice calling is still connecting. Please tap Call Station again in a few seconds.",
        );
      }
      return;
    }

    if (activeCall) {
      hangUp();
      return;
    }

    const ok = await makeCall(twilioTargetIdentity);
    if (!ok) {
      Alert.alert(
        "Call failed",
        twilioError || "Unable to start a call to the parent station.",
      );
      return;
    }
  };

  const requestPermissions = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      setErrorMsg("Permission to access location was denied");
      return false;
    }
    return true;
  };

  const sendLocationToServer = async (loc: Location.LocationObject) => {
    try {
      await fetch(API_URL + "/api/firetrucks/track", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + token,
          "ngrok-skip-browser-warning": "true",
        },
        body: JSON.stringify({
          truck_id: truckId,
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
          speed: loc.coords.speed ?? null,
          heading: loc.coords.heading ?? null,
          accuracy: loc.coords.accuracy ?? null,
          alarm_level: alarmLevel,
          fire_status: fireStatus,
        }),
      });
      broadcastStatus(
        fireStatus,
        alarmLevel,
        loc.coords.latitude,
        loc.coords.longitude,
      );
    } catch (error) {
      console.error("Error sending location:", error);
    }
  };

  const startTracking = async () => {
    if (isStartingTracking || isTracking) return;
    setIsStartingTracking(true);
    const hasPermission = await requestPermissions();
    if (!hasPermission) {
      setIsStartingTracking(false);
      return;
    }
    try {
      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      setLocation(currentLocation);
      await sendLocationToServer(currentLocation);
      const subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 5000,
          distanceInterval: 0,
        },
        async (newLocation) => {
          setLocation(newLocation);
          await sendLocationToServer(newLocation);
        },
      );
      locationSubscription.current = subscription;
      setIsTracking(true);
    } catch (error) {
      console.error("Error starting location tracking:", error);
      setErrorMsg("Failed to start location tracking");
    } finally {
      setIsStartingTracking(false);
    }
  };

  const stopTracking = () => {
    if (locationSubscription.current) {
      locationSubscription.current.remove();
      locationSubscription.current = null;
    }
    setIsTracking(false);
  };

  useEffect(() => {
    return () => {
      if (locationSubscription.current) locationSubscription.current.remove();
    };
  }, []);

  useEffect(() => {
    loadParentStationContact();
  }, [token, user?.assignedStationId]);

  const handleAcceptIncoming = async () => {
    const ok = await acceptIncoming();
    if (!ok) {
      Alert.alert(
        "Unable to accept call",
        twilioError || "Failed to accept the incoming call.",
      );
    }
  };

  const handleRejectIncoming = () => {
    rejectIncoming();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Firetruck Tracking</Text>

      <View
        style={[
          styles.statusBanner,
          {
            backgroundColor: currentStatus.color + "20",
            borderColor: currentStatus.color,
          },
        ]}
      >
        <View style={styles.statusBannerRow}>
          <Ionicons
            name={currentStatus.icon as any}
            size={20}
            color={currentStatus.color}
          />
          <Text
            style={[styles.statusBannerText, { color: currentStatus.color }]}
          >
            {fireStatus}
          </Text>
          <View style={styles.statusBannerDivider} />
          <Ionicons
            name={currentAlarm.icon as any}
            size={20}
            color={currentAlarm.color}
          />
          <Text
            style={[styles.statusBannerText, { color: currentAlarm.color }]}
          >
            {alarmLevel}
          </Text>
        </View>
      </View>

      <View style={styles.infoContainer}>
        <Text style={styles.label}>
          Tracking status: {isTracking ? "Active" : "Inactive"}
          {isTracking && " \u2022 Sharing live location updates"}
        </Text>
        {location ? (
          <View style={styles.coordinates}>
            <Text style={styles.coordinateText}>
              Latitude: {location.coords.latitude.toFixed(6)}
            </Text>
            <Text style={styles.coordinateText}>
              Longitude: {location.coords.longitude.toFixed(6)}
            </Text>
            <Text style={styles.coordinateText}>
              Accuracy: {location.coords.accuracy?.toFixed(2)} meters
            </Text>
            <Text style={styles.coordinateText}>
              Speed:{" "}
              {location.coords.speed
                ? location.coords.speed.toFixed(2) + " m/s"
                : "N/A"}
            </Text>
          </View>
        ) : (
          <Text style={styles.noLocation}>No location data available</Text>
        )}
        {errorMsg && <Text style={styles.error}>{errorMsg}</Text>}
        {!!twilioError && (
          <Text style={styles.error}>Twilio: {twilioError}</Text>
        )}
      </View>

      <TouchableOpacity
        style={[
          styles.button,
          isTracking ? styles.stopButton : styles.startButton,
          isStartingTracking && styles.disabledButton,
        ]}
        onPress={isTracking ? stopTracking : startTracking}
        disabled={isStartingTracking}
      >
        {isStartingTracking ? (
          <ActivityIndicator color="#fff" style={styles.buttonIcon} />
        ) : (
          <Ionicons
            name={isTracking ? "stop-circle" : "navigate-circle"}
            size={24}
            color="white"
            style={styles.buttonIcon}
          />
        )}
        <Text style={styles.buttonText}>
          {isStartingTracking
            ? "STARTING..."
            : isTracking
              ? "STOP TRACKING"
              : "START TRACKING"}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.button,
          activeCall ? styles.stopButton : styles.callStationButton,
          !twilioTargetIdentity && styles.disabledButton,
        ]}
        onPress={handleCallParentStation}
        disabled={!twilioTargetIdentity || isLoadingStationContact}
      >
        <Ionicons
          name={activeCall ? "call-outline" : "call"}
          size={22}
          color="white"
          style={styles.buttonIcon}
        />
        <Text style={styles.buttonText}>
          {activeCall ? "END STATION CALL" : "CALL STATION"}
        </Text>
      </TouchableOpacity>

      {/* Mute & Speaker controls — visible during active call */}
      {activeCall && (
        <View style={styles.callControlRow}>
          <TouchableOpacity
            style={[
              styles.callControlBtn,
              isMuted && styles.callControlBtnActive,
            ]}
            onPress={toggleMute}
          >
            <Ionicons
              name={isMuted ? "mic-off" : "mic"}
              size={22}
              color={isMuted ? "#E53935" : "#fff"}
            />
            <Text style={styles.callControlLabel}>
              {isMuted ? "Unmute" : "Mute"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.callControlBtn,
              isSpeaker && styles.callControlBtnActive,
            ]}
            onPress={toggleSpeaker}
          >
            <Ionicons
              name={isSpeaker ? "volume-high" : "volume-medium"}
              size={22}
              color={isSpeaker ? "#4CAF50" : "#fff"}
            />
            <Text style={styles.callControlLabel}>
              {isSpeaker ? "Speaker On" : "Speaker"}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <Text style={styles.stationCallHint}>
        {isLoadingStationContact
          ? "Loading assigned station contact..."
          : "Assigned station: " +
            parentStationName +
            (parentStationPhone ? " (" + parentStationPhone + ")" : "") +
            " | Role: " +
            (user?.role || "unknown") +
            " | Twilio: " +
            twilioStatus}
      </Text>

      <Modal
        visible={!!incomingInvite}
        transparent
        animationType="fade"
        onRequestClose={handleRejectIncoming}
      >
        <View style={styles.truckModalOverlay}>
          <View style={styles.truckModalCard}>
            <View style={styles.truckModalBadge}>
              <Ionicons name="radio" size={22} color="#fff" />
            </View>
            <Text style={styles.truckModalTitle}>Truck Comms Incoming</Text>
            <Text style={styles.truckModalSubtitle}>
              Secure dispatch line is calling this firetruck.
            </Text>
            <Text style={styles.truckModalHint}>
              Station: {parentStationName}
            </Text>

            <View style={styles.truckModalActions}>
              <TouchableOpacity
                style={styles.truckDeclineBtn}
                onPress={handleRejectIncoming}
              >
                <Text style={styles.truckDeclineText}>Decline</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.truckAcceptBtn}
                onPress={handleAcceptIncoming}
              >
                <Text style={styles.truckAcceptText}>Accept Call</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 20,
    flex: 1,
    backgroundColor: "#f5f5f5",
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 16,
    color: "#B71C1C",
    textAlign: "center",
  },
  statusBanner: {
    borderRadius: 10,
    borderWidth: 1.5,
    padding: 10,
    marginBottom: 16,
  },
  statusBannerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  statusBannerText: { fontSize: 14, fontWeight: "700", marginLeft: 6 },
  statusBannerDivider: {
    width: 1,
    height: 18,
    backgroundColor: "#ccc",
    marginHorizontal: 12,
  },
  infoContainer: {
    backgroundColor: "white",
    padding: 20,
    borderRadius: 10,
    marginBottom: 20,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  label: { fontSize: 14, fontWeight: "600", marginBottom: 10, color: "#333" },
  coordinates: {
    marginTop: 10,
    padding: 10,
    backgroundColor: "#f9f9f9",
    borderRadius: 5,
  },
  coordinateText: { color: "#1C1C1C", fontSize: 14, marginBottom: 2 },
  noLocation: {
    color: "#666",
    fontStyle: "italic",
    textAlign: "center",
    marginTop: 10,
  },
  error: { color: "#D32F2F", marginTop: 10, textAlign: "center" },
  button: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 5,
    marginVertical: 10,
  },
  startButton: { backgroundColor: "#4CAF50" },
  stopButton: { backgroundColor: "#F44336" },
  callStationButton: { backgroundColor: "#1976D2" },
  disabledButton: { backgroundColor: "#90A4AE" },
  buttonText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 16,
    marginLeft: 10,
  },
  buttonIcon: { marginRight: 5 },
  stationCallHint: {
    textAlign: "center",
    color: "#455A64",
    fontSize: 13,
    marginTop: 2,
  },
  truckModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(7, 18, 35, 0.75)",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  truckModalCard: {
    backgroundColor: "#F5F9FF",
    borderRadius: 18,
    padding: 22,
    borderWidth: 1.5,
    borderColor: "#9BC0FF",
    elevation: 12,
  },
  truckModalBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0D47A1",
    marginBottom: 12,
  },
  truckModalTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#0B1E3E",
    textAlign: "center",
  },
  truckModalSubtitle: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
    color: "#294063",
    textAlign: "center",
  },
  truckModalHint: {
    marginTop: 10,
    fontSize: 14,
    fontWeight: "700",
    color: "#0D47A1",
    textAlign: "center",
  },
  truckModalActions: {
    flexDirection: "row",
    marginTop: 18,
    gap: 10,
  },
  truckDeclineBtn: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#8FA3BF",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    paddingVertical: 12,
  },
  truckDeclineText: {
    color: "#334A6C",
    fontWeight: "700",
    fontSize: 15,
  },
  truckAcceptBtn: {
    flex: 1.2,
    borderRadius: 12,
    backgroundColor: "#0D47A1",
    alignItems: "center",
    paddingVertical: 12,
  },
  truckAcceptText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 15,
  },
  callControlRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 20,
    marginVertical: 8,
  },
  callControlBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#455A64",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    gap: 6,
  },
  callControlBtnActive: {
    backgroundColor: "#263238",
  },
  callControlLabel: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
  },
});

export default TrackingScreen;
