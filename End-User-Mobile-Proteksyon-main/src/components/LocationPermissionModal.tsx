import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface LocationPermissionModalProps {
  visible: boolean;
  onClose: () => void;
  onGrant: () => void;
  onDeny: () => void;
}

export const LocationPermissionModal: React.FC<LocationPermissionModalProps> = ({
  visible,
  onClose,
  onGrant,
  onDeny,
}) => {
  const handleGrantPermission = () => {
    // In a real app, you would request location permission here
    Alert.alert(
      'Location Permission',
      'Location permission granted! You can now use location-based features.',
      [
        { text: 'OK', onPress: onGrant }
      ]
    );
  };

  const handleDenyPermission = () => {
    Alert.alert(
      'Location Permission Denied',
      'Some features may be limited without location access. You can enable location later in settings.',
      [
        { text: 'Continue Anyway', onPress: onDeny },
        { text: 'Enable Location', onPress: handleGrantPermission }
      ]
    );
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          {/* Icon */}
          <View style={styles.iconContainer}>
            <Ionicons name="location" size={48} color="#E53935" />
          </View>

          {/* Title */}
          <Text style={styles.modalTitle}>Location Permission Required</Text>

          {/* Description */}
          <Text style={styles.modalDescription}>
            This app needs location access to provide:
          </Text>

          {/* Features List */}
          <View style={styles.featuresList}>
            <View style={styles.featureItem}>
              <Ionicons name="map" size={16} color="#2196F3" />
              <Text style={styles.featureText}>Find nearest BFP stations</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="navigate" size={16} color="#4CAF50" />
              <Text style={styles.featureText}>Track fire truck locations</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="call" size={16} color="#FF9800" />
              <Text style={styles.featureText}>Quick emergency response</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="warning" size={16} color="#E53935" />
              <Text style={styles.featureText}>Location-based safety alerts</Text>
            </View>
          </View>

          {/* Privacy Note */}
          <View style={styles.privacyNote}>
            <Ionicons name="shield-checkmark" size={14} color="#666" />
            <Text style={styles.privacyText}>
              Your location data is used only for emergency services and is kept secure.
            </Text>
          </View>

          {/* Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.denyButton}
              onPress={handleDenyPermission}
            >
              <Text style={styles.denyButtonText}>Maybe Later</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.grantButton}
              onPress={handleGrantPermission}
            >
              <Ionicons name="location" size={18} color="#fff" />
              <Text style={styles.grantButtonText}>Enable Location</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 12,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFE5E5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    alignSelf: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    textAlign: 'center',
    marginBottom: 12,
  },
  modalDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
  featuresList: {
    marginBottom: 16,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    paddingVertical: 4,
  },
  featureText: {
    fontSize: 14,
    color: '#333',
    marginLeft: 8,
    flex: 1,
  },
  privacyNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F5F5F5',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  privacyText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 8,
    flex: 1,
    lineHeight: 16,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  denyButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  denyButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  grantButton: {
    flex: 2,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#E53935',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  grantButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
});
