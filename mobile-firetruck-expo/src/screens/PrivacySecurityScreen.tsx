import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Switch,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// ==================== BACKEND DEVELOPER REMINDERS ====================
// TODO: Backend API endpoints needed:
// 1. GET /api/user/privacy - Fetch user privacy settings
// 2. PUT /api/user/privacy - Update privacy settings
// 3. GET /api/user/security - Fetch user security settings
// 4. PUT /api/user/security - Update security settings
// 5. POST /api/auth/change-password - Change user password
// 6. POST /api/auth/enable-2fa - Enable two-factor authentication
// 7. POST /api/auth/disable-2fa - Disable two-factor authentication
//
// TODO: Security features to implement:
// - Password hashing (bcrypt/argon2)
// - Two-factor authentication (TOTP/SMS)
// - Biometric authentication integration
// - Session management and timeout
// - Login attempt monitoring and lockout
// - Password strength validation
//
// TODO: Privacy compliance:
// - GDPR compliance features
// - Data export functionality
// - Account deletion requests
// - Consent management
// - Data retention policies
//
// TODO: Database security:
// - Encrypt sensitive user data
// - Secure password storage
// - Audit trail for security events
// - Rate limiting for security operations
// ====================================================================
import { useAuth } from '../context/AuthContext';

const PrivacySecurityScreen = ({ navigation }: any) => {
  const [privacySettings, setPrivacySettings] = useState({
    locationSharing: true,
    profileVisibility: 'team', // public, team, private
    dataCollection: true,
    analytics: false,
    emergencyContacts: true,
  });

  const [securitySettings, setSecuritySettings] = useState({
    twoFactorAuth: false,
    biometricLogin: true,
    autoLock: true,
    sessionTimeout: 30, // minutes
    loginAlerts: true,
  });

  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const togglePrivacy = (key: keyof typeof privacySettings) => {
    setPrivacySettings(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const toggleSecurity = (key: keyof typeof securitySettings) => {
    setSecuritySettings(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handlePasswordChange = () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      Alert.alert('Error', 'New passwords do not match');
      return;
    }
    if (passwordData.newPassword.length < 8) {
      Alert.alert('Error', 'Password must be at least 8 characters');
      return;
    }
    
    Alert.alert(
      'Password Changed',
      'Your password has been updated successfully.',
      [{ text: 'OK', onPress: () => {
        setShowPasswordChange(false);
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      }}]
    );
  };

  const handleSave = () => {
    Alert.alert(
      'Settings Saved',
      'Your privacy and security settings have been updated.',
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
        <Text style={styles.headerTitle}>Privacy & Security</Text>
        <TouchableOpacity onPress={handleSave}>
          <Text style={styles.headerAction}>Save</Text>
        </TouchableOpacity>
      </View>

      {/* Privacy Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Privacy Settings</Text>
        <Text style={styles.sectionDescription}>Control your data and privacy</Text>
        
        <View style={styles.settingCard}>
          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <View style={styles.iconContainer}>
                <Ionicons name="location" size={20} color="#D32F2F" />
              </View>
              <View style={styles.settingContent}>
                <Text style={styles.settingTitle}>Location Sharing</Text>
                <Text style={styles.settingDescription}>Share your location during emergencies</Text>
              </View>
            </View>
            <Switch
              value={privacySettings.locationSharing}
              onValueChange={() => togglePrivacy('locationSharing')}
              trackColor={{ false: '#e5e7eb', true: '#FFEBEE' }}
              thumbColor={privacySettings.locationSharing ? '#D32F2F' : '#fff'}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <View style={styles.iconContainer}>
                <Ionicons name="people" size={20} color="#D32F2F" />
              </View>
              <View style={styles.settingContent}>
                <Text style={styles.settingTitle}>Profile Visibility</Text>
                <Text style={styles.settingDescription}>Who can see your profile</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.selectorButton}>
              <Text style={styles.selectorText}>{privacySettings.profileVisibility}</Text>
              <Ionicons name="chevron-down" size={16} color="#666" />
            </TouchableOpacity>
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <View style={styles.iconContainer}>
                <Ionicons name="server" size={20} color="#D32F2F" />
              </View>
              <View style={styles.settingContent}>
                <Text style={styles.settingTitle}>Data Collection</Text>
                <Text style={styles.settingDescription}>Allow data collection for app improvement</Text>
              </View>
            </View>
            <Switch
              value={privacySettings.dataCollection}
              onValueChange={() => togglePrivacy('dataCollection')}
              trackColor={{ false: '#e5e7eb', true: '#FFEBEE' }}
              thumbColor={privacySettings.dataCollection ? '#D32F2F' : '#fff'}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <View style={styles.iconContainer}>
                <Ionicons name="analytics" size={20} color="#D32F2F" />
              </View>
              <View style={styles.settingContent}>
                <Text style={styles.settingTitle}>Analytics</Text>
                <Text style={styles.settingDescription}>Help improve app with usage analytics</Text>
              </View>
            </View>
            <Switch
              value={privacySettings.analytics}
              onValueChange={() => togglePrivacy('analytics')}
              trackColor={{ false: '#e5e7eb', true: '#FFEBEE' }}
              thumbColor={privacySettings.analytics ? '#D32F2F' : '#fff'}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <View style={styles.iconContainer}>
                <Ionicons name="call" size={20} color="#D32F2F" />
              </View>
              <View style={styles.settingContent}>
                <Text style={styles.settingTitle}>Emergency Contacts</Text>
                <Text style={styles.settingDescription}>Share with emergency contacts</Text>
              </View>
            </View>
            <Switch
              value={privacySettings.emergencyContacts}
              onValueChange={() => togglePrivacy('emergencyContacts')}
              trackColor={{ false: '#e5e7eb', true: '#FFEBEE' }}
              thumbColor={privacySettings.emergencyContacts ? '#D32F2F' : '#fff'}
            />
          </View>
        </View>
      </View>

      {/* Security Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Security Settings</Text>
        <Text style={styles.sectionDescription}>Protect your account and data</Text>
        
        <View style={styles.settingCard}>
          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <View style={styles.iconContainer}>
                <Ionicons name="key" size={20} color="#D32F2F" />
              </View>
              <View style={styles.settingContent}>
                <Text style={styles.settingTitle}>Two-Factor Authentication</Text>
                <Text style={styles.settingDescription}>Add extra security to your account</Text>
              </View>
            </View>
            <Switch
              value={securitySettings.twoFactorAuth}
              onValueChange={() => toggleSecurity('twoFactorAuth')}
              trackColor={{ false: '#e5e7eb', true: '#FFEBEE' }}
              thumbColor={securitySettings.twoFactorAuth ? '#D32F2F' : '#fff'}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <View style={styles.iconContainer}>
                <Ionicons name="finger-print" size={20} color="#D32F2F" />
              </View>
              <View style={styles.settingContent}>
                <Text style={styles.settingTitle}>Biometric Login</Text>
                <Text style={styles.settingDescription}>Use fingerprint or face recognition</Text>
              </View>
            </View>
            <Switch
              value={securitySettings.biometricLogin}
              onValueChange={() => toggleSecurity('biometricLogin')}
              trackColor={{ false: '#e5e7eb', true: '#FFEBEE' }}
              thumbColor={securitySettings.biometricLogin ? '#D32F2F' : '#fff'}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <View style={styles.iconContainer}>
                <Ionicons name="lock-closed" size={20} color="#D32F2F" />
              </View>
              <View style={styles.settingContent}>
                <Text style={styles.settingTitle}>Auto-Lock</Text>
                <Text style={styles.settingDescription}>Automatically lock when inactive</Text>
              </View>
            </View>
            <Switch
              value={securitySettings.autoLock}
              onValueChange={() => toggleSecurity('autoLock')}
              trackColor={{ false: '#e5e7eb', true: '#FFEBEE' }}
              thumbColor={securitySettings.autoLock ? '#D32F2F' : '#fff'}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <View style={styles.iconContainer}>
                <Ionicons name="time" size={20} color="#D32F2F" />
              </View>
              <View style={styles.settingContent}>
                <Text style={styles.settingTitle}>Session Timeout</Text>
                <Text style={styles.settingDescription}>Auto-logout after inactivity</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.selectorButton}>
              <Text style={styles.selectorText}>{securitySettings.sessionTimeout} min</Text>
              <Ionicons name="chevron-down" size={16} color="#666" />
            </TouchableOpacity>
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <View style={styles.iconContainer}>
                <Ionicons name="notifications" size={20} color="#D32F2F" />
              </View>
              <View style={styles.settingContent}>
                <Text style={styles.settingTitle}>Login Alerts</Text>
                <Text style={styles.settingDescription}>Get alerts for new login attempts</Text>
              </View>
            </View>
            <Switch
              value={securitySettings.loginAlerts}
              onValueChange={() => toggleSecurity('loginAlerts')}
              trackColor={{ false: '#e5e7eb', true: '#FFEBEE' }}
              thumbColor={securitySettings.loginAlerts ? '#D32F2F' : '#fff'}
            />
          </View>
        </View>
      </View>

      {/* Password Change */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Password</Text>
        <Text style={styles.sectionDescription}>Change your account password</Text>
        
        <View style={styles.settingCard}>
          <TouchableOpacity 
            style={styles.passwordButton}
            onPress={() => setShowPasswordChange(!showPasswordChange)}
          >
            <View style={styles.settingLeft}>
              <View style={styles.iconContainer}>
                <Ionicons name="lock-closed" size={20} color="#D32F2F" />
              </View>
              <View style={styles.settingContent}>
                <Text style={styles.settingTitle}>Change Password</Text>
                <Text style={styles.settingDescription}>Update your account password</Text>
              </View>
            </View>
            <Ionicons name={showPasswordChange ? "chevron-up" : "chevron-down"} size={16} color="#666" />
          </TouchableOpacity>

          {showPasswordChange && (
            <View style={styles.passwordForm}>
              <View style={styles.passwordField}>
                <Text style={styles.fieldLabel}>Current Password</Text>
                <TextInput
                  style={styles.passwordInput}
                  value={passwordData.currentPassword}
                  onChangeText={(text) => setPasswordData({...passwordData, currentPassword: text})}
                  secureTextEntry
                  placeholder="Enter current password"
                />
              </View>

              <View style={styles.passwordField}>
                <Text style={styles.fieldLabel}>New Password</Text>
                <TextInput
                  style={styles.passwordInput}
                  value={passwordData.newPassword}
                  onChangeText={(text) => setPasswordData({...passwordData, newPassword: text})}
                  secureTextEntry
                  placeholder="Enter new password"
                />
              </View>

              <View style={styles.passwordField}>
                <Text style={styles.fieldLabel}>Confirm New Password</Text>
                <TextInput
                  style={styles.passwordInput}
                  value={passwordData.confirmPassword}
                  onChangeText={(text) => setPasswordData({...passwordData, confirmPassword: text})}
                  secureTextEntry
                  placeholder="Confirm new password"
                />
              </View>

              <TouchableOpacity style={styles.updatePasswordButton} onPress={handlePasswordChange}>
                <Text style={styles.updatePasswordButtonText}>Update Password</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>

      {/* Add extra spacing at bottom */}
      <View style={styles.bottomSpacing} />
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
  selectorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  selectorText: {
    fontSize: 14,
    color: '#333',
    marginRight: 6,
  },
  passwordButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  passwordForm: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  passwordField: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  passwordInput: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
  },
  updatePasswordButton: {
    backgroundColor: '#D32F2F',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  updatePasswordButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  bottomSpacing: {
    height: 40,
  },
});

export default PrivacySecurityScreen;
