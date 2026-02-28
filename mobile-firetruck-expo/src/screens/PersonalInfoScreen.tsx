import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// ==================== BACKEND DEVELOPER REMINDERS ====================
// TODO: Backend API endpoints needed:
// 1. GET /api/user/profile - Fetch current user profile data
// 2. PUT /api/user/profile - Update user profile information
// 3. POST /api/user/profile-picture - Upload profile picture
// 4. DELETE /api/user/profile-picture - Remove profile picture
//
// TODO: Data validation rules needed:
// - Email format validation
// - Phone number format validation (Philippine format)
// - Badge number format validation
// - Required field validation
//
// TODO: Security considerations:
// - Sanitize all input data
// - Validate file uploads for profile pictures
// - Implement rate limiting for profile updates
// - Add audit logging for profile changes
// ====================================================================
import { useAuth } from '../context/AuthContext';

const PersonalInfoScreen = ({ navigation }: any) => {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    fullName: 'John Anderson',
    email: 'john.anderson@bfp.gov.ph',
    phone: '+63-917-123-4567',
    address: 'BFP Main Station, Manila',
    badgeNumber: 'BFP-2024-001',
    rank: 'Fire Officer III',
  });

  const handleSave = () => {
    Alert.alert(
      'Save Changes',
      'Are you sure you want to save these changes?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Save', onPress: () => setIsEditing(false) },
      ]
    );
  };

  const handleCancel = () => {
    setFormData({
      fullName: 'John Anderson',
      email: 'john.anderson@bfp.gov.ph',
      phone: '+63-917-123-4567',
      address: 'BFP Main Station, Manila',
      badgeNumber: 'BFP-2024-001',
      rank: 'Fire Officer III',
    });
    setIsEditing(false);
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#D32F2F" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Personal Information</Text>
        <TouchableOpacity onPress={isEditing ? handleSave : () => setIsEditing(true)}>
          <Text style={styles.headerAction}>{isEditing ? 'Save' : 'Edit'}</Text>
        </TouchableOpacity>
      </View>

      {/* Profile Picture Section */}
      <View style={styles.profileSection}>
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={50} color="#D32F2F" />
          </View>
          {isEditing && (
            <TouchableOpacity style={styles.changePhotoButton}>
              <Ionicons name="camera" size={20} color="#fff" />
            </TouchableOpacity>
          )}
        </View>
        <Text style={styles.profileName}>{formData.fullName}</Text>
        <Text style={styles.profileRank}>{formData.rank}</Text>
      </View>

      {/* Information Fields */}
      <View style={styles.infoSection}>
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Full Name</Text>
          <TextInput
            style={[styles.fieldInput, !isEditing && styles.fieldInputDisabled]}
            value={formData.fullName}
            onChangeText={(text) => setFormData({...formData, fullName: text})}
            editable={isEditing}
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Email Address</Text>
          <TextInput
            style={[styles.fieldInput, !isEditing && styles.fieldInputDisabled]}
            value={formData.email}
            onChangeText={(text) => setFormData({...formData, email: text})}
            editable={isEditing}
            keyboardType="email-address"
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Phone Number</Text>
          <TextInput
            style={[styles.fieldInput, !isEditing && styles.fieldInputDisabled]}
            value={formData.phone}
            onChangeText={(text) => setFormData({...formData, phone: text})}
            editable={isEditing}
            keyboardType="phone-pad"
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Address</Text>
          <TextInput
            style={[styles.fieldInput, !isEditing && styles.fieldInputDisabled]}
            value={formData.address}
            onChangeText={(text) => setFormData({...formData, address: text})}
            editable={isEditing}
            multiline
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Badge Number</Text>
          <TextInput
            style={[styles.fieldInput, !isEditing && styles.fieldInputDisabled]}
            value={formData.badgeNumber}
            onChangeText={(text) => setFormData({...formData, badgeNumber: text})}
            editable={isEditing}
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Rank</Text>
          <TextInput
            style={[styles.fieldInput, !isEditing && styles.fieldInputDisabled]}
            value={formData.rank}
            onChangeText={(text) => setFormData({...formData, rank: text})}
            editable={isEditing}
          />
        </View>
      </View>

      {/* Cancel Button (shown when editing) */}
      {isEditing && (
        <View style={styles.buttonSection}>
          <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      )}
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
  profileSection: {
    backgroundColor: '#fff',
    alignItems: 'center',
    paddingVertical: 30,
    marginBottom: 20,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#FFEBEE',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#D32F2F',
  },
  changePhotoButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#D32F2F',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  profileName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  profileRank: {
    fontSize: 14,
    color: '#666',
  },
  infoSection: {
    paddingHorizontal: 16,
  },
  fieldGroup: {
    marginBottom: 20,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  fieldInput: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
  },
  fieldInputDisabled: {
    backgroundColor: '#f8f9fa',
    color: '#666',
  },
  buttonSection: {
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  cancelButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#D32F2F',
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#D32F2F',
  },
});

export default PersonalInfoScreen;
