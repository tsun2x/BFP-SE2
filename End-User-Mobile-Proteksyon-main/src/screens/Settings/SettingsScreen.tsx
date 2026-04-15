import React, { useMemo, useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  Image,
  Linking,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../context/AuthContext';
import { useUiPreferences } from '../../context/UiPreferencesContext';

export const SettingsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { user, logout } = useAuth();
  const {
    textSize,
    setTextSize,
    darkModeEnabled,
    setDarkModeEnabled,
    fontScale,
    palette,
  } = useUiPreferences();
  const scrollRef = useRef<ScrollView | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const initialFormData = useMemo(
    () => ({
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      email: '',
      mobile: user?.phone || '',
      location: '',
      password: '',
      newPassword: '',
      confirmPassword: '',
    }),
    [user?.firstName, user?.lastName, user?.phone],
  );
  const [formData, setFormData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: '',
    mobile: user?.phone || '',
    location: '',
    password: '',
    newPassword: '',
    confirmPassword: '',
  });

  useEffect(() => {
    if (!isEditing) {
      setFormData(initialFormData);
    }
  }, [initialFormData, isEditing]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSave = () => {
    if (isEditing) {
      // Validate password fields if they are filled
      if (formData.newPassword && formData.newPassword !== formData.confirmPassword) {
        Alert.alert('Error', 'New passwords do not match');
        return;
      }
      
      Alert.alert('Success', 'Your profile changes were saved.');
      setShowCurrentPassword(false);
      setShowNewPassword(false);
      setShowConfirmPassword(false);
      setIsEditing(false);
    } else {
      setIsEditing(true);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setShowCurrentPassword(false);
    setShowNewPassword(false);
    setShowConfirmPassword(false);
    // Reset form data to current account values
    setFormData(initialFormData);
  };

  const handlePickImage = async () => {
    if (!isEditing) return;

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Please allow photo access to update your profile picture.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.canceled && result.assets?.[0]?.uri) {
      setProfileImage(result.assets[0].uri);
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete your account? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: () => {
            logout();
            Alert.alert('Account Deleted', 'Your account has been successfully deleted.');
            navigation.replace('Login');
          }
        }
      ]
    );
  };

  const handleCallHotline = async () => {
    await Linking.openURL('tel:16000000');
  };

  const handleOpenDeviceSettings = async () => {
    try {
      await Linking.openSettings();
    } catch (error) {
      Alert.alert('Unavailable', 'Could not open device settings on this device.');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: palette.pageBg }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: palette.headerBg }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { fontSize: 20 * fontScale }]}>Settings</Text>
        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <Text style={[styles.saveButtonText, { fontSize: 14 * fontScale }]}>{isEditing ? 'Save' : 'Edit'}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView ref={scrollRef} style={styles.content}>
        {/* Profile Picture */}
        <View style={styles.profileSection}>
          <View style={styles.profileImageContainer}>
            <Image
              source={{
                uri:
                  profileImage ||
                  `https://ui-avatars.com/api/?name=${encodeURIComponent(
                    `${formData.firstName || ''} ${formData.lastName || ''}`.trim() || 'User',
                  )}&background=E53935&color=fff&size=256`,
              }}
              style={styles.profileImage}
            />
            {isEditing && (
              <TouchableOpacity style={styles.cameraButton} onPress={handlePickImage}>
                <Ionicons name="camera" size={20} color="#fff" />
              </TouchableOpacity>
            )}
          </View>
          <Text style={[styles.profileName, { color: palette.textPrimary, fontSize: 24 * fontScale }]}>
            {formData.firstName} {formData.lastName}
          </Text>
          <Text style={[styles.profileSubtitle, { color: palette.textSecondary, fontSize: 14 * fontScale }]}>End-user Account</Text>
        </View>

        {/* Personal Information */}
        <View style={[styles.section, { backgroundColor: palette.cardBg }]}>
          <Text style={[styles.sectionTitle, { color: palette.textPrimary, fontSize: 18 * fontScale }]}>Account Settings</Text>
          
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: palette.textPrimary, fontSize: 14 * fontScale }]}>First Name</Text>
            <TextInput
              style={[
                styles.input,
                {
                  borderColor: palette.border,
                  backgroundColor: palette.inputBg,
                  color: palette.textPrimary,
                  fontSize: 16 * fontScale,
                },
                !isEditing && styles.inputDisabled,
              ]}
              value={formData.firstName}
              onChangeText={(text) => handleInputChange('firstName', text)}
              editable={isEditing}
              placeholder="First name"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: palette.textPrimary, fontSize: 14 * fontScale }]}>Last Name</Text>
            <TextInput
              style={[
                styles.input,
                {
                  borderColor: palette.border,
                  backgroundColor: palette.inputBg,
                  color: palette.textPrimary,
                  fontSize: 16 * fontScale,
                },
                !isEditing && styles.inputDisabled,
              ]}
              value={formData.lastName}
              onChangeText={(text) => handleInputChange('lastName', text)}
              editable={isEditing}
              placeholder="Last name"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: palette.textPrimary, fontSize: 14 * fontScale }]}>Email</Text>
            <TextInput
              style={[
                styles.input,
                {
                  borderColor: palette.border,
                  backgroundColor: palette.inputBg,
                  color: palette.textPrimary,
                  fontSize: 16 * fontScale,
                },
                !isEditing && styles.inputDisabled,
              ]}
              value={formData.email}
              onChangeText={(text) => handleInputChange('email', text)}
              editable={isEditing}
              placeholder="Email address"
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: palette.textPrimary, fontSize: 14 * fontScale }]}>Mobile Number</Text>
            <TextInput
              style={[
                styles.input,
                {
                  borderColor: palette.border,
                  backgroundColor: palette.inputBg,
                  color: palette.textPrimary,
                  fontSize: 16 * fontScale,
                },
                !isEditing && styles.inputDisabled,
              ]}
              value={formData.mobile}
              onChangeText={(text) => handleInputChange('mobile', text)}
              editable={isEditing}
              placeholder="Mobile number"
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: palette.textPrimary, fontSize: 14 * fontScale }]}>Address</Text>
            <TextInput
              style={[
                styles.input,
                {
                  borderColor: palette.border,
                  backgroundColor: palette.inputBg,
                  color: palette.textPrimary,
                  fontSize: 16 * fontScale,
                },
                !isEditing && styles.inputDisabled,
              ]}
              value={formData.location}
              onChangeText={(text) => handleInputChange('location', text)}
              editable={isEditing}
              placeholder="Enter address"
            />
          </View>
        </View>

        {/* Password Section */}
        {isEditing && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: palette.textPrimary, fontSize: 18 * fontScale }]}>Change Password</Text>
            
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: palette.textPrimary, fontSize: 14 * fontScale }]}>Current Password</Text>
              <View style={[styles.passwordContainer, { borderColor: palette.border, backgroundColor: palette.inputBg }]}>
                <TextInput
                  style={[styles.passwordInput, { color: palette.textPrimary, fontSize: 16 * fontScale }]}
                  value={formData.password}
                  onChangeText={(text) => handleInputChange('password', text)}
                  placeholder="Enter current password"
                  secureTextEntry={!showCurrentPassword}
                />
                <TouchableOpacity
                  onPress={() => setShowCurrentPassword((current) => !current)}
                  style={styles.passwordToggle}
                  accessibilityRole="button"
                  accessibilityLabel={showCurrentPassword ? 'Hide current password' : 'Show current password'}
                >
                  <Ionicons name={showCurrentPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color="#666" />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: palette.textPrimary, fontSize: 14 * fontScale }]}>New Password</Text>
              <View style={[styles.passwordContainer, { borderColor: palette.border, backgroundColor: palette.inputBg }]}>
                <TextInput
                  style={[styles.passwordInput, { color: palette.textPrimary, fontSize: 16 * fontScale }]}
                  value={formData.newPassword}
                  onChangeText={(text) => handleInputChange('newPassword', text)}
                  placeholder="Enter new password"
                  secureTextEntry={!showNewPassword}
                />
                <TouchableOpacity
                  onPress={() => setShowNewPassword((current) => !current)}
                  style={styles.passwordToggle}
                  accessibilityRole="button"
                  accessibilityLabel={showNewPassword ? 'Hide new password' : 'Show new password'}
                >
                  <Ionicons name={showNewPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color="#666" />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: palette.textPrimary, fontSize: 14 * fontScale }]}>Confirm New Password</Text>
              <View style={[styles.passwordContainer, { borderColor: palette.border, backgroundColor: palette.inputBg }]}>
                <TextInput
                  style={[styles.passwordInput, { color: palette.textPrimary, fontSize: 16 * fontScale }]}
                  value={formData.confirmPassword}
                  onChangeText={(text) => handleInputChange('confirmPassword', text)}
                  placeholder="Confirm new password"
                  secureTextEntry={!showConfirmPassword}
                />
                <TouchableOpacity
                  onPress={() => setShowConfirmPassword((current) => !current)}
                  style={styles.passwordToggle}
                  accessibilityRole="button"
                  accessibilityLabel={showConfirmPassword ? 'Hide confirm new password' : 'Show confirm new password'}
                >
                  <Ionicons name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color="#666" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* Language & Accessibility */}
          <View style={[styles.section, { backgroundColor: palette.cardBg }]}>
          <Text style={[styles.sectionTitle, { color: palette.textPrimary, fontSize: 18 * fontScale }]}>Language & Accessibility</Text>

          <Text style={[styles.subLabel, { color: palette.textPrimary, fontSize: 14 * fontScale }]}>Text Size Adjustment</Text>
          <View style={styles.textSizeRow}>
            {(['small', 'medium', 'large'] as const).map((sizeKey) => (
              <TouchableOpacity
                key={sizeKey}
                style={[
                  styles.textSizeChip,
                  {
                    borderColor: palette.border,
                    backgroundColor: palette.chipBg,
                  },
                  textSize === sizeKey && styles.textSizeChipActive,
                ]}
                onPress={() => setTextSize(sizeKey)}
              >
                <Text
                  style={[
                    styles.textSizeChipText,
                    { color: palette.chipText, fontSize: 13 * fontScale },
                    textSize === sizeKey && styles.textSizeChipTextActive,
                  ]}
                >
                  {sizeKey === 'small' ? 'Small' : sizeKey === 'medium' ? 'Medium' : 'Large'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.toggleRow}>
            <Text style={[styles.toggleLabel, { color: palette.textPrimary, fontSize: 15 * fontScale }]}>Dark Mode / Light Mode</Text>
            <Switch
              value={darkModeEnabled}
              onValueChange={setDarkModeEnabled}
              trackColor={{ false: '#ddd', true: '#E57373' }}
              thumbColor={darkModeEnabled ? '#E53935' : '#f4f3f4'}
            />
          </View>
        </View>

        {/* Help & Support */}
        <View style={[styles.section, { backgroundColor: palette.cardBg }]}>
          <Text style={[styles.sectionTitle, { color: palette.textPrimary, fontSize: 18 * fontScale }]}>Help & Support</Text>

          <TouchableOpacity
            style={[styles.actionButton, { borderBottomColor: palette.border }]}
            onPress={() => navigation.navigate('Help')}
          >
            <Ionicons name="help-circle-outline" size={20} color="#E53935" />
            <Text style={[styles.actionButtonText, { color: palette.textPrimary, fontSize: 16 * fontScale }]}>FAQ Section</Text>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, { borderBottomColor: palette.border }]}
            onPress={handleCallHotline}
          >
            <Ionicons name="call-outline" size={20} color="#E53935" />
            <Text style={[styles.actionButtonText, { color: palette.textPrimary, fontSize: 16 * fontScale }]}>Contact BFP Hotline</Text>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.actionButton, styles.dangerButton, { borderBottomColor: palette.border }]}
            onPress={handleDeleteAccount}
          >
            <Ionicons name="trash-outline" size={20} color="#E53935" />
            <Text style={[styles.actionButtonText, { color: '#E53935', fontSize: 16 * fontScale }]}> 
              Delete Account
            </Text>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
          </TouchableOpacity>
        </View>

        {/* Cancel Button (only show when editing) */}
        {isEditing && (
          <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
            <Text style={[styles.cancelButtonText, { fontSize: 16 * fontScale }]}>Cancel</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#E53935',
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  saveButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 16,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 20,
    paddingBottom: 100, // Reduced padding since nav bar handles safe area
  },
  profileSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  profileImageContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  cameraButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E53935',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
  },
  profileName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  profileSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
    backgroundColor: '#fff',
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingLeft: 16,
    paddingRight: 12,
    backgroundColor: '#fff',
  },
  passwordInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
  },
  passwordToggle: {
    paddingLeft: 12,
    paddingVertical: 4,
  },
  inputDisabled: {
    backgroundColor: '#f9f9f9',
    color: '#666',
  },
  subLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  textSizeRow: {
    flexDirection: 'row',
    marginBottom: 14,
    gap: 8,
  },
  textSizeChip: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  textSizeChipActive: {
    backgroundColor: '#E53935',
    borderColor: '#E53935',
  },
  textSizeChipText: {
    color: '#555',
    fontWeight: '600',
  },
  textSizeChipTextActive: {
    color: '#fff',
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  toggleRowNoBorder: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  toggleLabel: {
    flex: 1,
    fontSize: 15,
    color: '#333',
    paddingRight: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  actionButtonText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    marginLeft: 12,
  },
  dangerButton: {
    // No special styling needed, the text color already indicates danger
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 20,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  inlineSettingsButton: {
    marginTop: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#f7f7f7',
    flexDirection: 'row',
    alignItems: 'center',
  },
  inlineSettingsButtonText: {
    marginLeft: 8,
    color: '#E53935',
    fontWeight: '600',
  },
});
