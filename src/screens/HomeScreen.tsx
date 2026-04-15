// src/screens/HomeScreen.tsx
import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../context/AuthContext";
import {
  useMission,
  ALARM_LEVELS,
  STATUS_PHASES,
} from "../context/MissionContext";

const HomeScreen = () => {
  const { user } = useAuth();
  const {
    fireStatus,
    alarmLevel,
    activeAlarmId,
    pendingIncident,
    truckId,
    connected,
    isClaimingMission,
    claimMission,
    handleStatusChange,
    handleAlarmChange,
    handleEndMission,
  } = useMission();
  const [showAlarmPicker, setShowAlarmPicker] = useState(false);

  const currentAlarm =
    ALARM_LEVELS.find((a) => a.key === alarmLevel) || ALARM_LEVELS[0];
  const currentStatus =
    STATUS_PHASES.find((s) => s.key === fireStatus) || STATUS_PHASES[0];
  const isActive = fireStatus !== "Standby";

  const onAlarmChange = (newAlarm: string) => {
    handleAlarmChange(newAlarm);
    setShowAlarmPicker(false);
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Mission Control</Text>
            <Text style={styles.headerSub}>
              {user?.name || "Driver"} \u2014 Truck #{truckId}
            </Text>
          </View>
          <View
            style={[
              styles.connDot,
              { backgroundColor: connected ? "#4CAF50" : "#F44336" },
            ]}
          />
        </View>

        <View
          style={[styles.statusCard, { borderLeftColor: currentStatus.color }]}
        >
          <View style={styles.statusCardHeader}>
            <Ionicons
              name={currentStatus.icon as any}
              size={28}
              color={currentStatus.color}
            />
            <View style={{ marginLeft: 12, flex: 1 }}>
              <Text style={styles.statusLabel}>CURRENT STATUS</Text>
              <Text
                style={[styles.statusValue, { color: currentStatus.color }]}
              >
                {currentStatus.label}
              </Text>
            </View>
          </View>
          <Text style={styles.statusDesc}>{currentStatus.description}</Text>
        </View>

        <TouchableOpacity
          style={[
            styles.alarmCard,
            {
              backgroundColor: currentAlarm.color + "15",
              borderColor: currentAlarm.color,
            },
          ]}
          onPress={() => setShowAlarmPicker(true)}
          activeOpacity={0.7}
        >
          <View style={styles.alarmCardInner}>
            <Ionicons
              name={currentAlarm.icon as any}
              size={32}
              color={currentAlarm.color}
            />
            <View style={{ marginLeft: 12, flex: 1 }}>
              <Text style={styles.alarmLabel}>ALARM LEVEL</Text>
              <Text style={[styles.alarmValue, { color: currentAlarm.color }]}>
                {alarmLevel}
              </Text>
            </View>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={currentAlarm.color}
            />
          </View>
          {isActive && (
            <Text style={styles.alarmHint}>
              Tap to escalate or change alarm level
            </Text>
          )}
        </TouchableOpacity>

        {activeAlarmId && (
          <View style={styles.incidentBadge}>
            <Ionicons name="alert-circle" size={16} color="#fff" />
            <Text style={styles.incidentText}>
              Active Incident #{activeAlarmId}
            </Text>
          </View>
        )}

        {pendingIncident && !activeAlarmId && (
          <View style={styles.pendingCard}>
            <View style={styles.pendingHeader}>
              <Ionicons name="notifications" size={20} color="#B71C1C" />
              <Text style={styles.pendingTitle}>Awaiting Driver Claim</Text>
            </View>
            <Text style={styles.pendingLine}>
              Incident #{pendingIncident.alarmId}
            </Text>
            <Text style={styles.pendingLine}>
              {pendingIncident.callerFullName || "Unknown caller"}
            </Text>
            <Text style={styles.pendingLine}>
              {pendingIncident.incidentType || "Fire"} •{" "}
              {pendingIncident.alarmLevel || "1st Alarm"}
            </Text>
            <Text style={styles.pendingLocation}>
              {pendingIncident.location || "Unknown location"}
            </Text>
            <TouchableOpacity
              style={[
                styles.claimButton,
                isClaimingMission && styles.claimButtonDisabled,
              ]}
              onPress={claimMission}
              disabled={isClaimingMission}
            >
              <Ionicons name="checkmark-circle" size={18} color="#fff" />
              <Text style={styles.claimButtonText}>
                {isClaimingMission ? "Claiming..." : "Accept Mission"}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        <Text style={styles.sectionTitle}>Update Status</Text>
        <View style={styles.phaseGrid}>
          {STATUS_PHASES.map((phase) => {
            const isCurrentPhase = fireStatus === phase.key;
            const phaseIndex = STATUS_PHASES.findIndex(
              (p) => p.key === phase.key,
            );
            const currentIndex = STATUS_PHASES.findIndex(
              (p) => p.key === fireStatus,
            );
            const canPress =
              phase.key === "Standby"
                ? fireStatus === "Fire Out"
                : phaseIndex === currentIndex + 1 ||
                  (phaseIndex > currentIndex && fireStatus === "Standby");
            const isDisabled =
              isCurrentPhase || (!canPress && phase.key !== "Standby");

            return (
              <TouchableOpacity
                key={phase.key}
                style={[
                  styles.phaseButton,
                  {
                    borderColor: phase.color,
                    backgroundColor: isCurrentPhase ? phase.color : "#fff",
                  },
                  isDisabled && !isCurrentPhase && styles.phaseDisabled,
                ]}
                onPress={() => {
                  if (!isDisabled) handleStatusChange(phase.key);
                }}
                disabled={isDisabled}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={phase.icon as any}
                  size={24}
                  color={
                    isCurrentPhase ? "#fff" : isDisabled ? "#ccc" : phase.color
                  }
                />
                <Text
                  style={[
                    styles.phaseLabel,
                    {
                      color: isCurrentPhase
                        ? "#fff"
                        : isDisabled
                          ? "#ccc"
                          : phase.color,
                    },
                  ]}
                >
                  {phase.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {isActive && (
          <TouchableOpacity
            style={styles.endMissionBtn}
            onPress={handleEndMission}
          >
            <Ionicons name="close-circle" size={20} color="#fff" />
            <Text style={styles.endMissionText}>End Mission</Text>
          </TouchableOpacity>
        )}

        <View style={styles.flowGuide}>
          <Text style={styles.flowTitle}>Operational Flow</Text>
          {[
            {
              color: "#607D8B",
              text: "Standby \u2014 Awaiting dispatch from station",
            },
            {
              color: "#2196F3",
              text: "En Route \u2014 Proceeding to incident site",
            },
            {
              color: "#FF9800",
              text: "On Scene \u2014 Fire suppression in progress",
            },
            { color: "#4CAF50", text: "Fire Out \u2014 Incident resolved" },
          ].map((step, i) => (
            <View key={i}>
              {i > 0 && <View style={styles.flowLine} />}
              <View style={styles.flowStep}>
                <View
                  style={[styles.flowDot, { backgroundColor: step.color }]}
                />
                <Text style={styles.flowText}>{step.text}</Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      <Modal
        visible={showAlarmPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAlarmPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Alarm Level</Text>
              <TouchableOpacity onPress={() => setShowAlarmPicker(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.alarmList}>
              {ALARM_LEVELS.map((alarm) => {
                const isSelected = alarmLevel === alarm.key;
                return (
                  <TouchableOpacity
                    key={alarm.key}
                    style={[
                      styles.alarmOption,
                      {
                        borderLeftColor: alarm.color,
                        backgroundColor: isSelected
                          ? alarm.color + "15"
                          : "#fff",
                      },
                    ]}
                    onPress={() => onAlarmChange(alarm.key)}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={alarm.icon as any}
                      size={22}
                      color={alarm.color}
                    />
                    <Text
                      style={[
                        styles.alarmOptionText,
                        { color: isSelected ? alarm.color : "#333" },
                      ]}
                    >
                      {alarm.key}
                    </Text>
                    {isSelected && (
                      <Ionicons
                        name="checkmark-circle"
                        size={20}
                        color={alarm.color}
                      />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5" },
  scroll: { padding: 16, paddingTop: 50, paddingBottom: 40 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  headerTitle: { fontSize: 22, fontWeight: "800", color: "#B71C1C" },
  headerSub: { fontSize: 13, color: "#666", marginTop: 2 },
  connDot: { width: 12, height: 12, borderRadius: 6 },
  statusCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  statusCardHeader: { flexDirection: "row", alignItems: "center" },
  statusLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#999",
    letterSpacing: 1,
  },
  statusValue: { fontSize: 22, fontWeight: "800" },
  statusDesc: { fontSize: 12, color: "#777", marginTop: 8 },
  alarmCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1.5,
  },
  alarmCardInner: { flexDirection: "row", alignItems: "center" },
  alarmLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#999",
    letterSpacing: 1,
  },
  alarmValue: { fontSize: 20, fontWeight: "800" },
  alarmHint: { fontSize: 11, color: "#999", marginTop: 8, textAlign: "center" },
  incidentBadge: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E53935",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginBottom: 16,
    alignSelf: "center",
  },
  incidentText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
    marginLeft: 6,
  },
  pendingCard: {
    backgroundColor: "#fff4f2",
    borderWidth: 1,
    borderColor: "#f3c4bb",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  pendingHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  pendingTitle: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: "800",
    color: "#B71C1C",
  },
  pendingLine: { fontSize: 14, color: "#333", marginBottom: 4 },
  pendingLocation: {
    fontSize: 13,
    color: "#666",
    marginTop: 2,
    marginBottom: 14,
  },
  claimButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#B71C1C",
    borderRadius: 10,
    paddingVertical: 12,
  },
  claimButtonDisabled: { opacity: 0.6 },
  claimButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
    marginLeft: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#333",
    marginBottom: 12,
    marginTop: 4,
  },
  phaseGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  phaseButton: {
    width: "48%",
    borderWidth: 2,
    borderRadius: 12,
    paddingVertical: 18,
    alignItems: "center",
    marginBottom: 10,
    elevation: 1,
  },
  phaseDisabled: { opacity: 0.35 },
  phaseLabel: { fontSize: 14, fontWeight: "700", marginTop: 6 },
  endMissionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#B71C1C",
    borderRadius: 10,
    paddingVertical: 14,
    marginBottom: 20,
  },
  endMissionText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    marginLeft: 8,
  },
  flowGuide: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    elevation: 1,
  },
  flowTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#333",
    marginBottom: 12,
  },
  flowStep: { flexDirection: "row", alignItems: "center" },
  flowDot: { width: 10, height: 10, borderRadius: 5, marginRight: 10 },
  flowText: { fontSize: 12, color: "#555" },
  flowLine: {
    width: 2,
    height: 14,
    backgroundColor: "#ddd",
    marginLeft: 4,
    marginVertical: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "70%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  modalTitle: { fontSize: 18, fontWeight: "700", color: "#333" },
  alarmList: { padding: 16 },
  alarmOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginBottom: 8,
    borderLeftWidth: 4,
  },
  alarmOptionText: { flex: 1, fontSize: 16, fontWeight: "600", marginLeft: 12 },
});

export default HomeScreen;
