// src/screens/HomeScreen.tsx

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  SafeAreaView,
  StatusBar,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ConfirmationModal from '../components/ConfirmationModal';

export default function HomeScreen() {
  const [isTracking, setIsTracking] = useState(true);
  const [responseStatus, setResponseStatus] = useState<string | null>(null);
  const [alarmLevel, setAlarmLevel] = useState<number>(3);
  const [modalVisible, setModalVisible] = useState(false);
  const [notificationModalVisible, setNotificationModalVisible] = useState(false);
  const [modalConfig, setModalConfig] = useState({
    title: '',
    message: '',
    onConfirm: () => {},
    type: 'danger' as 'danger' | 'warning' | 'info',
  });

  const showConfirmationModal = (
    title: string,
    message: string,
    onConfirm: () => void,
    type: 'danger' | 'warning' | 'info' = 'danger'
  ) => {
    setModalConfig({ title, message, onConfirm, type });
    setModalVisible(true);
  };

  const handleAlarmLevelChange = (level: number) => {
    showConfirmationModal(
      'Change Alarm Level',
      `Are you sure you want to change the alarm level to ${level}?`,
      () => setAlarmLevel(level),
      'warning'
    );
  };

  const handleResponseStatusChange = (status: string) => {
    showConfirmationModal(
      'Update Response Status',
      `Are you sure you want to update the response status to "${status}"?`,
      () => setResponseStatus(status),
      'info'
    );
  };

  const handleQuickUpdate = (label: string) => {
    showConfirmationModal(
      'Send Quick Update',
      `Are you sure you want to send "${label}" update?`,
      () => console.log(`Quick update sent: ${label}`),
      'warning'
    );
  };

  const handleGPSChange = (newValue: boolean) => {
    const action = newValue ? 'enable' : 'disable';
    showConfirmationModal(
      'GPS Tracking',
      `Are you sure you want to ${action} GPS tracking?`,
      () => setIsTracking(newValue),
      'danger'
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#F4F6F8" />

      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* ================= HEADER ================= */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Home</Text>
          <TouchableOpacity style={styles.notificationButton} onPress={() => setNotificationModalVisible(true)}>
            <View style={styles.notificationContainer}>
              <Ionicons name="notifications-outline" size={22} color="#333" />
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationBadgeText}>3</Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>

        {/* ================= INCIDENT STATUS ================= */}
        <View style={styles.incidentSectionBox}>
          <Text style={styles.sectionTitle}>Incident Status</Text>

          <View style={styles.row}>
            <View style={styles.statusCard}>
              <View style={styles.statusRow}>
                <Ionicons name="flame" size={18} color="#FF6B00" />
                <Text style={styles.smallLabel}>{alarmLevel} Alarm</Text>
              </View>
              <Text style={styles.criticalText}>CRITICAL</Text>
            </View>

            <View style={styles.statusCard}>
              <View style={styles.statusRow}>
                <Ionicons name="location" size={18} color="#E91E63" />
                <Text style={styles.smallLabel}>Incident ID</Text>
              </View>
              <Text style={styles.incidentId}>#2024-847</Text>
            </View>
          </View>
        </View>

        {/* ================= FIRE ALARM LEVEL ================= */}
        <View style={styles.sectionBox}>
          <Text style={styles.sectionTitle}>Fire Alarm Level</Text>

          <View style={styles.alarmRow}>
            {[1, 2, 3, 4, 5].map(level => (
              <TouchableOpacity
                key={level}
                style={[
                  styles.alarmButton,
                  alarmLevel === level && styles.alarmButtonActive,
                ]}
                onPress={() => handleAlarmLevelChange(level)}
              >
                <Text
                  style={[
                    styles.alarmButtonText,
                    alarmLevel === level && { color: '#fff' },
                  ]}
                >
                  Alarm {level}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ================= INCIDENT INFORMATION ================= */}
        <View style={styles.incidentSectionBox}>
          <Text style={styles.sectionTitle}>Incident Information</Text>

          <View style={styles.infoRow}>
            <View style={styles.iconCircleGreen}>
              <Ionicons name="location" size={18} color="#2E7D32" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.infoTitle}>Location</Text>
              <Text style={styles.infoSubtitle}>
                428 Market Street, Building 7A
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <View style={styles.iconCircleBlue}>
              <Ionicons name="time" size={18} color="#1565C0" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.infoTitle}>Dispatch Time</Text>
              <Text style={styles.infoSubtitle}>
                Apr 30, 2025 - 14:32
              </Text>
            </View>

            <View style={styles.activeBadge}>
              <Text style={styles.badgeTextGreen}>Active</Text>
            </View>
          </View>
        </View>

        {/* ================= GPS TRACKING ================= */}
        <View style={styles.sectionBox}>
          <Text style={styles.sectionTitle}>GPS Tracking</Text>

          <View style={styles.gpsCard}>
            <View style={styles.gpsLeft}>
              <View style={styles.gpsIconBox}>
                <Ionicons name="navigate" size={22} color="#2196F3" />
              </View>
              <View>
                <Text style={styles.gpsTitle}>Real-time Location</Text>
                <Text style={styles.gpsSubtitle}>
                  Device tracking status
                </Text>
              </View>
            </View>

            <View style={styles.gpsRight}>
              <Switch
                value={isTracking}
                onValueChange={() => handleGPSChange(!isTracking)}
              />
              <Text style={styles.gpsActiveText}>
                {isTracking ? 'Active' : 'Off'}
              </Text>
            </View>
          </View>
        </View>

        {/* ================= QUICK UPDATES ================= */}
        <View style={styles.sectionBox}>
          <Text style={styles.sectionTitle}>Quick Updates</Text>

          <View style={styles.grid}>
            {[
              { label: 'Fire Intensifying', icon: 'flame', color: '#EF5350' },
              { label: 'Need Backup', icon: 'people', color: '#FB8C00' },
              { label: 'Water Supply Low', icon: 'water', color: '#42A5F5' },
              { label: 'Need Ambulance', icon: 'medkit', color: '#E53935' },
              { label: 'Area Secured', icon: 'checkmark-circle', color: '#43A047' },
              { label: 'Hazard Alert', icon: 'alert-circle', color: '#AB47BC' },
            ].map((item, index) => (
              <TouchableOpacity key={index} style={styles.gridItem} onPress={() => handleQuickUpdate(item.label)}>
                <View
                  style={[
                    styles.gridIconBox,
                    { backgroundColor: `${item.color}20` },
                  ]}
                >
                  <Ionicons
                    name={item.icon as any}
                    size={22}
                    color={item.color}
                  />
                </View>
                <Text style={styles.gridText}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ================= RESPONSE STATUS ================= */}
        <View style={styles.sectionBox}>
          <Text style={styles.sectionTitle}>Response Status</Text>

          <View style={styles.currentStatusBox}>
            <Text style={styles.currentStatusLabel}>
              Current Status:
            </Text>
            <Text style={styles.currentStatusValue}>
              {responseStatus || 'Not Updated'}
            </Text>
          </View>

          <View style={styles.responseRow}>
            {[
              { label: 'On the Way', icon: 'paper-plane', color: '#FB8C00' },
              { label: 'On the Scene', icon: 'location', color: '#43A047' },
              { label: 'Fire Out', icon: 'checkmark-done', color: '#757575' },
            ].map((item, index) => {
              const isSelected = responseStatus === item.label;

              return (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.responseItem,
                    isSelected && {
                      borderWidth: 2,
                      borderColor: item.color,
                    },
                  ]}
                  onPress={() => handleResponseStatusChange(item.label)}
                >
                  <View
                    style={[
                      styles.gridIconBox,
                      { backgroundColor: `${item.color}20` },
                    ]}
                  >
                    <Ionicons
                      name={item.icon as any}
                      size={22}
                      color={item.color}
                    />
                  </View>
                  <Text style={styles.gridText}>{item.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </ScrollView>

      {/* Confirmation Modal */}
      <ConfirmationModal
        visible={modalVisible}
        title={modalConfig.title}
        message={modalConfig.message}
        onConfirm={() => {
          modalConfig.onConfirm();
          setModalVisible(false);
        }}
        onCancel={() => setModalVisible(false)}
        type={modalConfig.type}
      />

      {/* Notification Modal */}
      <Modal
        visible={notificationModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setNotificationModalVisible(false)}
      >
        <View style={styles.notificationModalOverlay}>
          <View style={styles.notificationModalContainer}>
            {/* Modal Header */}
            <View style={styles.notificationModalHeader}>
              <Text style={styles.notificationModalTitle}>Notifications</Text>
              <TouchableOpacity 
                style={styles.notificationModalCloseButton}
                onPress={() => setNotificationModalVisible(false)}
              >
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            {/* Notifications List */}
            <ScrollView style={styles.notificationModalList} showsVerticalScrollIndicator={false}>
              {/* Notification Item 1 - Emergency Alert */}
              <View style={styles.notificationItem}>
                <View style={styles.notificationIconContainer}>
                  <Ionicons name="warning" size={20} color="#D32F2F" />
                </View>
                <View style={styles.notificationContent}>
                  <Text style={styles.notificationTitle}>Emergency Alert</Text>
                  <Text style={styles.notificationMessage}>Fire reported at 428 Market Street - Immediate response required</Text>
                  <Text style={styles.notificationTime}>2 minutes ago</Text>
                </View>
              </View>

              {/* Notification Item 2 - Dispatch */}
              <View style={styles.notificationItem}>
                <View style={styles.notificationIconContainer}>
                  <Ionicons name="radio" size={20} color="#FF6B00" />
                </View>
                <View style={styles.notificationContent}>
                  <Text style={styles.notificationTitle}>New Dispatch</Text>
                  <Text style={styles.notificationMessage}>Assigned to Incident #2024-847 - Priority Level 3</Text>
                  <Text style={styles.notificationTime}>15 minutes ago</Text>
                </View>
              </View>

              {/* Notification Item 3 - Backup Request */}
              <View style={styles.notificationItem}>
                <View style={styles.notificationIconContainer}>
                  <Ionicons name="people" size={20} color="#FB8C00" />
                </View>
                <View style={styles.notificationContent}>
                  <Text style={styles.notificationTitle}>Backup Requested</Text>
                  <Text style={styles.notificationMessage}>Additional units needed at incident location - Fire intensifying</Text>
                  <Text style={styles.notificationTime}>30 minutes ago</Text>
                </View>
              </View>
            </ScrollView>

            {/* Modal Footer */}
            <View style={styles.notificationModalFooter}>
              <TouchableOpacity 
                style={styles.clearAllButton}
                onPress={() => console.log('Clear all notifications')}
              >
                <Text style={styles.clearAllButtonText}>Clear All</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F4F6F8',
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
  },
  header: {
    paddingTop: 10,
    marginBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111',
  },
  notificationContainer: {
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#D32F2F',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  notificationBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
  },
  notificationButton: {
    backgroundColor: '#E5E7EB',
    borderRadius: 20,
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  sectionBox: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 18,
    marginBottom: 20,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  incidentSectionBox: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 18,
    marginBottom: 20,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#8B0000',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 16,
    color: '#111',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  statusCard: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#8B0000',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  smallLabel: {
    fontSize: 13,
    color: '#777',
  },
  criticalText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#D32F2F',
  },
  incidentId: {
    fontSize: 18,
    fontWeight: '700',
  },
  alarmRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  alarmButton: {
    backgroundColor: '#F1F3F5',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 10,
    flex: 1,
    marginHorizontal: 2,
  },
  alarmButtonActive: {
    backgroundColor: '#D32F2F',
  },
  alarmButtonText: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoTitle: {
    fontWeight: '600',
    fontSize: 14,
  },
  infoSubtitle: {
    fontSize: 13,
    color: '#777',
  },
  divider: {
    height: 1,
    backgroundColor: '#eee',
    marginVertical: 14,
  },
  iconCircleGreen: {
    backgroundColor: '#E8F5E9',
    padding: 10,
    borderRadius: 12,
    marginRight: 12,
  },
  iconCircleBlue: {
    backgroundColor: '#E3F2FD',
    padding: 10,
    borderRadius: 12,
    marginRight: 12,
  },
  activeBadge: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  badgeTextGreen: {
    color: '#2E7D32',
    fontSize: 12,
    fontWeight: '600',
  },
  gpsCard: {
    backgroundColor: '#E3F2FD',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  gpsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  gpsIconBox: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 14,
  },
  gpsTitle: {
    fontWeight: '700',
  },
  gpsSubtitle: {
    fontSize: 12,
    color: '#555',
  },
  gpsRight: {
    alignItems: 'center',
  },
  gpsActiveText: {
    fontSize: 12,
    color: '#2E7D32',
    fontWeight: '600',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  gridItem: {
    width: '48%',
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  gridIconBox: {
    padding: 14,
    borderRadius: 14,
    marginBottom: 10,
  },
  gridText: {
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
  },
  currentStatusBox: {
    backgroundColor: '#F9FAFB',
    padding: 14,
    borderRadius: 14,
    marginBottom: 15,
  },
  currentStatusLabel: {
    fontSize: 13,
    color: '#777',
  },
  currentStatusValue: {
    fontSize: 15,
    fontWeight: '700',
    marginTop: 4,
  },
  responseRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  responseItem: {
    width: '32%',
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
  },
  notificationModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationModalContainer: {
    backgroundColor: '#fff',
    borderRadius: 20,
    width: '90%',
    maxHeight: '80%',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  notificationModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  notificationModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111',
  },
  notificationModalCloseButton: {
    padding: 4,
  },
  notificationModalList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  notificationItem: {
    flexDirection: 'row',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  notificationIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111',
    marginBottom: 4,
  },
  notificationMessage: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
    lineHeight: 20,
  },
  notificationTime: {
    fontSize: 12,
    color: '#999',
  },
  notificationModalFooter: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  clearAllButton: {
    backgroundColor: '#D32F2F',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  clearAllButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});