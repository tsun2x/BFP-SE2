import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// ==================== BACKEND DEVELOPER REMINDERS ====================
// TODO: Backend API endpoints needed:
// 1. GET /api/user/notifications - Fetch user notification preferences
// 2. PUT /api/user/notifications - Update notification preferences
// 3. POST /api/notifications/send - Send push notifications
// 4. GET /api/notifications/history - Fetch notification history
//
// TODO: Notification service integration:
// - Firebase Cloud Messaging (FCM) for push notifications
// - Email service (SendGrid/SES) for email notifications
// - SMS service (Twilio) for SMS notifications
// - WebSocket for real-time in-app notifications
//
// TODO: Database schema needed:
// - User notification preferences table
// - Notification templates table
// - Notification logs table
// - Device tokens table for push notifications
//
// TODO: Security considerations:
// - Validate notification preferences
// - Rate limiting for notification sends
// - User consent management for notifications
// - Secure handling of device tokens
// ====================================================================
import { useAuth } from '../context/AuthContext';

const NotificationsScreen = ({ navigation }: any) => {
  const [notifications, setNotifications] = useState({
    emergencyAlerts: true,
    dispatchNotifications: true,
    systemUpdates: false,
    trainingReminders: true,
    maintenanceAlerts: true,
    weatherAlerts: true,
    teamMessages: true,
    shiftReminders: true,
  });

  const [notificationMethods, setNotificationMethods] = useState({
    pushNotifications: true,
    emailNotifications: false,
    smsNotifications: true,
    inAppNotifications: true,
  });

  const toggleNotification = (key: keyof typeof notifications) => {
    setNotifications(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const toggleMethod = (key: keyof typeof notificationMethods) => {
    setNotificationMethods(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleSave = () => {
    Alert.alert(
      'Settings Saved',
      'Your notification preferences have been updated.',
      [{ text: 'OK', onPress: () => navigation.goBack() }]
    );
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#D32F2F" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <TouchableOpacity onPress={handleSave}>
          <Text style={styles.headerAction}>Save</Text>
        </TouchableOpacity>
      </View>

      {/* Alert Types */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Alert Types</Text>
        <Text style={styles.sectionDescription}>Choose which alerts you want to receive</Text>
        
        <View style={styles.settingCard}>
          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <View style={styles.iconContainer}>
                <Ionicons name="warning" size={20} color="#D32F2F" />
              </View>
              <View style={styles.settingContent}>
                <Text style={styles.settingTitle}>Emergency Alerts</Text>
                <Text style={styles.settingDescription}>Critical emergency notifications</Text>
              </View>
            </View>
            <Switch
              value={notifications.emergencyAlerts}
              onValueChange={() => toggleNotification('emergencyAlerts')}
              trackColor={{ false: '#e5e7eb', true: '#FFEBEE' }}
              thumbColor={notifications.emergencyAlerts ? '#D32F2F' : '#fff'}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <View style={styles.iconContainer}>
                <Ionicons name="radio" size={20} color="#D32F2F" />
              </View>
              <View style={styles.settingContent}>
                <Text style={styles.settingTitle}>Dispatch Notifications</Text>
                <Text style={styles.settingDescription}>New dispatch assignments</Text>
              </View>
            </View>
            <Switch
              value={notifications.dispatchNotifications}
              onValueChange={() => toggleNotification('dispatchNotifications')}
              trackColor={{ false: '#e5e7eb', true: '#FFEBEE' }}
              thumbColor={notifications.dispatchNotifications ? '#D32F2F' : '#fff'}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <View style={styles.iconContainer}>
                <Ionicons name="settings" size={20} color="#D32F2F" />
              </View>
              <View style={styles.settingContent}>
                <Text style={styles.settingTitle}>System Updates</Text>
                <Text style={styles.settingDescription}>App updates and maintenance</Text>
              </View>
            </View>
            <Switch
              value={notifications.systemUpdates}
              onValueChange={() => toggleNotification('systemUpdates')}
              trackColor={{ false: '#e5e7eb', true: '#FFEBEE' }}
              thumbColor={notifications.systemUpdates ? '#D32F2F' : '#fff'}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <View style={styles.iconContainer}>
                <Ionicons name="school" size={20} color="#D32F2F" />
              </View>
              <View style={styles.settingContent}>
                <Text style={styles.settingTitle}>Training Reminders</Text>
                <Text style={styles.settingDescription}>Training schedules and reminders</Text>
              </View>
            </View>
            <Switch
              value={notifications.trainingReminders}
              onValueChange={() => toggleNotification('trainingReminders')}
              trackColor={{ false: '#e5e7eb', true: '#FFEBEE' }}
              thumbColor={notifications.trainingReminders ? '#D32F2F' : '#fff'}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <View style={styles.iconContainer}>
                <Ionicons name="build" size={20} color="#D32F2F" />
              </View>
              <View style={styles.settingContent}>
                <Text style={styles.settingTitle}>Maintenance Alerts</Text>
                <Text style={styles.settingDescription}>Equipment maintenance reminders</Text>
              </View>
            </View>
            <Switch
              value={notifications.maintenanceAlerts}
              onValueChange={() => toggleNotification('maintenanceAlerts')}
              trackColor={{ false: '#e5e7eb', true: '#FFEBEE' }}
              thumbColor={notifications.maintenanceAlerts ? '#D32F2F' : '#fff'}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <View style={styles.iconContainer}>
                <Ionicons name="cloudy" size={20} color="#D32F2F" />
              </View>
              <View style={styles.settingContent}>
                <Text style={styles.settingTitle}>Weather Alerts</Text>
                <Text style={styles.settingDescription}>Severe weather warnings</Text>
              </View>
            </View>
            <Switch
              value={notifications.weatherAlerts}
              onValueChange={() => toggleNotification('weatherAlerts')}
              trackColor={{ false: '#e5e7eb', true: '#FFEBEE' }}
              thumbColor={notifications.weatherAlerts ? '#D32F2F' : '#fff'}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <View style={styles.iconContainer}>
                <Ionicons name="people" size={20} color="#D32F2F" />
              </View>
              <View style={styles.settingContent}>
                <Text style={styles.settingTitle}>Team Messages</Text>
                <Text style={styles.settingDescription}>Messages from team members</Text>
              </View>
            </View>
            <Switch
              value={notifications.teamMessages}
              onValueChange={() => toggleNotification('teamMessages')}
              trackColor={{ false: '#e5e7eb', true: '#FFEBEE' }}
              thumbColor={notifications.teamMessages ? '#D32F2F' : '#fff'}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <View style={styles.iconContainer}>
                <Ionicons name="time" size={20} color="#D32F2F" />
              </View>
              <View style={styles.settingContent}>
                <Text style={styles.settingTitle}>Shift Reminders</Text>
                <Text style={styles.settingDescription}>Shift start/end notifications</Text>
              </View>
            </View>
            <Switch
              value={notifications.shiftReminders}
              onValueChange={() => toggleNotification('shiftReminders')}
              trackColor={{ false: '#e5e7eb', true: '#FFEBEE' }}
              thumbColor={notifications.shiftReminders ? '#D32F2F' : '#fff'}
            />
          </View>
        </View>
      </View>

      {/* Notification Methods */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notification Methods</Text>
        <Text style={styles.sectionDescription}>Choose how you want to receive notifications</Text>
        
        <View style={styles.settingCard}>
          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <View style={styles.iconContainer}>
                <Ionicons name="notifications" size={20} color="#D32F2F" />
              </View>
              <View style={styles.settingContent}>
                <Text style={styles.settingTitle}>Push Notifications</Text>
                <Text style={styles.settingDescription}>Notifications on your device</Text>
              </View>
            </View>
            <Switch
              value={notificationMethods.pushNotifications}
              onValueChange={() => toggleMethod('pushNotifications')}
              trackColor={{ false: '#e5e7eb', true: '#FFEBEE' }}
              thumbColor={notificationMethods.pushNotifications ? '#D32F2F' : '#fff'}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <View style={styles.iconContainer}>
                <Ionicons name="mail" size={20} color="#D32F2F" />
              </View>
              <View style={styles.settingContent}>
                <Text style={styles.settingTitle}>Email Notifications</Text>
                <Text style={styles.settingDescription}>Notifications via email</Text>
              </View>
            </View>
            <Switch
              value={notificationMethods.emailNotifications}
              onValueChange={() => toggleMethod('emailNotifications')}
              trackColor={{ false: '#e5e7eb', true: '#FFEBEE' }}
              thumbColor={notificationMethods.emailNotifications ? '#D32F2F' : '#fff'}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <View style={styles.iconContainer}>
                <Ionicons name="chatbubble" size={20} color="#D32F2F" />
              </View>
              <View style={styles.settingContent}>
                <Text style={styles.settingTitle}>SMS Notifications</Text>
                <Text style={styles.settingDescription}>Text message notifications</Text>
              </View>
            </View>
            <Switch
              value={notificationMethods.smsNotifications}
              onValueChange={() => toggleMethod('smsNotifications')}
              trackColor={{ false: '#e5e7eb', true: '#FFEBEE' }}
              thumbColor={notificationMethods.smsNotifications ? '#D32F2F' : '#fff'}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <View style={styles.iconContainer}>
                <Ionicons name="apps" size={20} color="#D32F2F" />
              </View>
              <View style={styles.settingContent}>
                <Text style={styles.settingTitle}>In-App Notifications</Text>
                <Text style={styles.settingDescription}>Notifications within the app</Text>
              </View>
            </View>
            <Switch
              value={notificationMethods.inAppNotifications}
              onValueChange={() => toggleMethod('inAppNotifications')}
              trackColor={{ false: '#e5e7eb', true: '#FFEBEE' }}
              thumbColor={notificationMethods.inAppNotifications ? '#D32F2F' : '#fff'}
            />
          </View>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  headerAction: {
    fontSize: 16,
    fontWeight: '600',
    color: '#D32F2F',
  },
  section: {
    marginTop: 20,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  settingCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFEBEE',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 13,
    color: '#666',
  },
});

export default NotificationsScreen;
