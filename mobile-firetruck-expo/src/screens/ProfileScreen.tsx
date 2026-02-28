import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import PersonalInfoScreen from './PersonalInfoScreen';
import NotificationsScreen from './NotificationsScreen';
import PrivacySecurityScreen from './PrivacySecurityScreen';

// ==================== BACKEND DEVELOPER REMINDERS ====================
// TODO: Backend API endpoints needed:
// 1. GET /api/user/profile - Fetch user profile information
// 2. GET /api/user/truck-info - Fetch assigned truck details
// 3. GET /api/user/station-info - Fetch assigned station details
// 4. POST /api/auth/logout - Handle user logout properly
//
// TODO: Real-time data needed:
// - User online/offline status
// - Truck location updates
// - Station status updates
// - Emergency alerts integration
//
// TODO: Profile data structure:
// - User personal information
// - Truck assignment and status
// - Station assignment and contact info
// - Emergency contact details
// - User permissions and roles
//
// TODO: Security considerations:
// - Validate user session on profile access
// - Sanitize all displayed data
// - Implement proper logout (invalidate tokens)
// - Add audit logging for profile views
// ====================================================================

const ProfileScreen = ({ navigation }: any) => {
  const { logout } = useAuth();
  const [currentScreen, setCurrentScreen] = useState<'profile' | 'personal' | 'notifications' | 'privacy'>('profile');

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', onPress: logout, style: 'destructive' },
      ]
    );
  };

  // Render different screens based on current state
  if (currentScreen === 'personal') {
    console.log('Rendering PersonalInfoScreen');
    return <PersonalInfoScreen navigation={{ goBack: () => setCurrentScreen('profile') }} />;
  }
  
  if (currentScreen === 'notifications') {
    console.log('Rendering NotificationsScreen');
    return <NotificationsScreen navigation={{ goBack: () => setCurrentScreen('profile') }} />;
  }
  
  if (currentScreen === 'privacy') {
    console.log('Rendering PrivacySecurityScreen');
    return <PrivacySecurityScreen navigation={{ goBack: () => setCurrentScreen('profile') }} />;
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Profile Header with Avatar */}
      <View style={styles.profileHeader}>
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={40} color="#D32F2F" />
          </View>
        </View>
        <Text style={styles.profileName}>John Anderson</Text>
        <Text style={styles.profileEmail}>john.anderson@bfp.gov.ph</Text>
      </View>

      {/* Profile Information */}
      <View style={styles.profileInfoBox}>
        <Text style={styles.profileInfoTitle}>Profile Information</Text>
        
        <View style={styles.profileInfoItem}>
          <View style={styles.infoIconContainer}>
            <Ionicons name="car" size={18} color="#D32F2F" />
          </View>
          <View style={styles.infoContent}>
            <Text style={styles.infoItemLabel}>Truck ID</Text>
            <Text style={styles.infoItemValue}>BFP-001</Text>
          </View>
        </View>

        <View style={styles.profileInfoItem}>
          <View style={styles.infoIconContainer}>
            <Ionicons name="home" size={18} color="#D32F2F" />
          </View>
          <View style={styles.infoContent}>
            <Text style={styles.infoItemLabel}>Assigned Station</Text>
            <Text style={styles.infoItemValue}>BFP Main Station</Text>
          </View>
        </View>

        <View style={styles.profileInfoItem}>
          <View style={styles.infoIconContainer}>
            <Ionicons name="business" size={18} color="#D32F2F" />
          </View>
          <View style={styles.infoContent}>
            <Text style={styles.infoItemLabel}>Station Type</Text>
            <Text style={styles.infoItemValue}>Central Station</Text>
          </View>
        </View>

        <View style={styles.profileInfoItem}>
          <View style={styles.infoIconContainer}>
            <Ionicons name="call" size={18} color="#D32F2F" />
          </View>
          <View style={styles.infoContent}>
            <Text style={styles.infoItemLabel}>Contact Number</Text>
            <Text style={styles.infoItemValue}>+63-XXX-XXX-XXXX</Text>
          </View>
        </View>
      </View>

      {/* Settings Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Settings</Text>
        
        <TouchableOpacity style={styles.settingItem} onPress={() => {
          console.log('Personal Information pressed');
          setCurrentScreen('personal');
        }}>
          <View style={styles.settingLeft}>
            <Ionicons name="person-outline" size={20} color="#666" />
            <Text style={styles.settingText}>Personal Information</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color="#ccc" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.settingItem} onPress={() => {
          console.log('Notifications pressed');
          setCurrentScreen('notifications');
        }}>
          <View style={styles.settingLeft}>
            <Ionicons name="notifications-outline" size={20} color="#666" />
            <Text style={styles.settingText}>Notifications</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color="#ccc" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.settingItem} onPress={() => {
          console.log('Privacy & Security pressed');
          setCurrentScreen('privacy');
        }}>
          <View style={styles.settingLeft}>
            <Ionicons name="shield-outline" size={20} color="#666" />
            <Text style={styles.settingText}>Privacy & Security</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color="#ccc" />
        </TouchableOpacity>
      </View>

      {/* Support Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Support</Text>
        
        <TouchableOpacity style={styles.settingItem}>
          <View style={styles.settingLeft}>
            <Ionicons name="help-circle-outline" size={20} color="#666" />
            <Text style={styles.settingText}>Help & Support</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color="#ccc" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.settingItem}>
          <View style={styles.settingLeft}>
            <Ionicons name="document-text-outline" size={20} color="#666" />
            <Text style={styles.settingText}>Terms & Conditions</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color="#ccc" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.settingItem}>
          <View style={styles.settingLeft}>
            <Ionicons name="information-circle-outline" size={20} color="#666" />
            <Text style={styles.settingText}>About</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color="#ccc" />
        </TouchableOpacity>
      </View>

      {/* Logout Button */}
      <View style={styles.logoutSection}>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color="#D32F2F" />
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  profileHeader: {
    backgroundColor: '#D32F2F',
    paddingTop: 60,
    paddingBottom: 40,
    alignItems: 'center',
  },
  avatarContainer: {
    marginBottom: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  profileName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  infoSection: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 10,
  },
  infoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    marginLeft: 4,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 12,
  },
  logoutSection: {
    marginTop: 32,
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D32F2F',
  },
  logoutButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#D32F2F',
    marginLeft: 8,
  },
  profileInfoBox: {
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginTop: 20,
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#9CA3AF',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  profileInfoTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111',
    marginBottom: 16,
  },
  profileInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFEBEE',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoItemLabel: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
    marginBottom: 2,
  },
  infoItemValue: {
    fontSize: 15,
    color: '#111',
    fontWeight: '600',
  },
});

export default ProfileScreen;