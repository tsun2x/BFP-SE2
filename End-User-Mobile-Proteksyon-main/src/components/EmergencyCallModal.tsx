import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface EmergencyCallModalProps {
  visible: boolean;
  onClose: () => void;
}

const { width, height } = Dimensions.get('window');

export const EmergencyCallModal: React.FC<EmergencyCallModalProps> = ({
  visible,
  onClose,
}) => {
  const [isCalling, setIsCalling] = useState(false);
  const [callDuration, setCallDuration] = useState(0);

  const emergencyNumber = '160-000-00';
  const fireStationName = 'BFP Zamboanga City Fire Station';

  const handleStartCall = () => {
    setIsCalling(true);
    // Simulate call timer
    const timer = setInterval(() => {
      setCallDuration((prev) => {
        if (prev >= 5) {
          clearInterval(timer);
          handleEndCall();
          return 0;
        }
        return prev + 1;
      });
    }, 1000);
  };

  const handleEndCall = () => {
    setIsCalling(false);
    setCallDuration(0);
    Alert.alert(
      'Call Ended',
      'Your emergency call has been disconnected. Please stay safe and follow emergency protocols.',
      [{ text: 'OK', onPress: onClose }]
    );
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      statusBarTranslucent={true}
    >
      <View style={styles.overlay}>
        {!isCalling ? (
          // Confirmation Screen
          <View style={styles.confirmationContainer}>
            <View style={styles.iconContainer}>
              <Ionicons name="alert-circle" size={80} color="#E53935" />
            </View>
            
            <Text style={styles.title}>Emergency Call</Text>
            <Text style={styles.subtitle}>
              Connect directly to {fireStationName}
            </Text>
            
            <View style={styles.numberContainer}>
              <Text style={styles.number}>{emergencyNumber}</Text>
              <Text style={styles.numberLabel}>Fire Emergency Hotline</Text>
            </View>

            <Text style={styles.warningText}>
              This will initiate an emergency call. Use only for real emergencies.
            </Text>

            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={onClose}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.button, styles.callButton]}
                onPress={handleStartCall}
              >
                <Ionicons name="call" size={20} color="#fff" />
                <Text style={styles.callButtonText}>Call Now</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          // Call Screen
          <View style={styles.callContainer}>
            <View style={styles.callHeader}>
              <TouchableOpacity onPress={handleEndCall} style={styles.endCallButton}>
                <Ionicons name="chevron-down" size={24} color="#fff" />
              </TouchableOpacity>
              <Text style={styles.callStatus}>Emergency Call in Progress</Text>
              <View style={styles.placeholder} />
            </View>

            <View style={styles.callContent}>
              <View style={styles.callIconContainer}>
                <Ionicons name="call" size={120} color="#E53935" />
              </View>
              
              <Text style={styles.callingText}>Calling...</Text>
              <Text style={styles.callNumber}>{emergencyNumber}</Text>
              <Text style={styles.callStation}>{fireStationName}</Text>
              
              <Text style={styles.callDuration}>{formatDuration(callDuration)}</Text>
              
              <View style={styles.callInfo}>
                <Text style={styles.callInfoText}>
                  Connecting you to emergency services...
                </Text>
                <Text style={styles.callInfoSubtext}>
                  Please stay on the line and follow instructions
                </Text>
              </View>
            </View>

            <View style={styles.callFooter}>
              <TouchableOpacity
                style={styles.endCallRedButton}
                onPress={handleEndCall}
              >
                <Ionicons name="call" size={24} color="#fff" />
                <Text style={styles.endCallText}>End Call</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmationContainer: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 30,
    margin: 20,
    width: width * 0.9,
    maxWidth: 400,
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  numberContainer: {
    backgroundColor: '#FFEBEE',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
    width: '100%',
  },
  number: {
    fontSize: 32,
    fontWeight: '700',
    color: '#E53935',
    marginBottom: 4,
  },
  numberLabel: {
    fontSize: 14,
    color: '#666',
  },
  warningText: {
    fontSize: 12,
    color: '#888',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 18,
  },
  buttonContainer: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 10,
    gap: 8,
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  callButton: {
    backgroundColor: '#E53935',
  },
  callButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  // Call Screen Styles
  callContainer: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'space-between',
  },
  callHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
  },
  endCallButton: {
    padding: 8,
  },
  callStatus: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '500',
  },
  placeholder: {
    width: 40,
  },
  callContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  callIconContainer: {
    marginBottom: 30,
  },
  callingText: {
    fontSize: 20,
    color: '#fff',
    marginBottom: 8,
  },
  callNumber: {
    fontSize: 36,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
  },
  callStation: {
    fontSize: 16,
    color: '#ccc',
    marginBottom: 30,
  },
  callDuration: {
    fontSize: 18,
    color: '#E53935',
    fontWeight: '600',
    marginBottom: 40,
  },
  callInfo: {
    alignItems: 'center',
  },
  callInfoText: {
    fontSize: 16,
    color: '#fff',
    marginBottom: 8,
  },
  callInfoSubtext: {
    fontSize: 14,
    color: '#aaa',
    textAlign: 'center',
  },
  callFooter: {
    paddingHorizontal: 20,
    paddingBottom: 50,
    alignItems: 'center',
  },
  endCallRedButton: {
    backgroundColor: '#E53935',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 16,
    borderRadius: 30,
    gap: 10,
  },
  endCallText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
});
