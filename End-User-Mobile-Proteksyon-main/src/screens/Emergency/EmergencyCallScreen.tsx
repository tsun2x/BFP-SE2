import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Alert,
  ScrollView,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { NODE_API_URL } from '../../config';

const emergencyContacts = [
  {
    id: '1',
    name: 'BFP Zamboanga Hotline',
    number: '160-000-00',
    type: 'Fire Emergency',
    icon: 'fire',
    color: '#E53935',
  },
  {
    id: '2',
    name: 'BFP Zamboanga Office',
    number: '062-991-3225',
    type: 'Office Contact',
    icon: 'business',
    color: '#2196F3',
  },
  {
    id: '3',
    name: 'Zamboanga City Hall',
    number: '062-991-3225',
    type: 'City Government',
    icon: 'business',
    color: '#4CAF50',
  },
];

export const EmergencyCallScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [selectedEmergency, setSelectedEmergency] = useState<any>(null);
  const [showDialModal, setShowDialModal] = useState(false);
  const [dialNumber, setDialNumber] = useState('');
  const [emergencyDescription, setEmergencyDescription] = useState('');

  const handleEmergencyCall = (contact: any) => {
    setSelectedEmergency(contact);
    setShowConfirmModal(true);
  };

  const confirmEmergencyCall = () => {
    setShowConfirmModal(false);
    setDialNumber(selectedEmergency.number);
    setShowDialModal(true);
  };

  const handleDial = async () => {
    await sendAlarmWithCurrentLocation();
    Alert.alert(
      'Emergency Call',
      `Calling ${selectedEmergency.name} at ${selectedEmergency.number}...`,
      [
        { text: 'End Call', style: 'destructive' },
        { text: 'Keep Connected', style: 'default' }
      ]
    );
  };

  const handleQuickEmergency = () => {
    Alert.alert(
      'Quick Emergency',
      'Are you sure you want to start an emergency call to the nearest fire station?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Yes, Call',
          style: 'default',
          onPress: () => {
            // One-tap flow after confirmation: navigate to CallTest and let it auto-run the KNN + VoIP pipeline once
            navigation.navigate('CallTest', { autoStart: true });
          },
        },
      ],
    );
  };

  const sendAlarmWithCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Location Permission Required',
          'Please enable location access so we can send your location to the nearest fire station.'
        );
        return;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const latitude = position.coords.latitude;
      const longitude = position.coords.longitude;

      const phoneNumber = '9997778888';

      const response = await fetch(`${NODE_API_URL}/api/enduser/create-alarm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber,
          latitude,
          longitude,
          incidentType: 'Fire',
          alarmLevel: 'Alarm 1',
          location: emergencyDescription || 'Mobile emergency call',
          narrative: emergencyDescription || 'Emergency call from mobile app',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        Alert.alert('Emergency Error', data.message || 'Failed to create alarm.');
        return;
      }

      console.log('Alarm created from emergency call:', data);
    } catch (err: any) {
      Alert.alert('Emergency Error', err?.message || 'Failed to send your location.');
    }
  };

  const callKnnTest = async (
    latitude: number,
    longitude: number,
    label: string,
    forceStationId?: number,
  ) => {
    try {
      const response = await fetch(`${NODE_API_URL}/api/enduser/create-alarm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber: '9997778888',
          latitude,
          longitude,
          incidentType: 'Fire',
          alarmLevel: 'Alarm 1',
          location: label,
          narrative: `KNN test from app: ${label}`,
          // Dev-only: when provided, backend skips KNN and dispatches
          // directly to this station ID (e.g., 101 or 102).
          forceStationId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        const message = (data && data.message) || 'Request failed';
        Alert.alert('KNN Test Error', message);
        return;
      }

      Alert.alert(
        'KNN Test Result',
        `Dispatched station: ${data.dispatchedStationId}`,
      );
    } catch (error: any) {
      Alert.alert('KNN Test Error', error?.message || 'Network error');
    }
  };

  const handleKnnTest101 = () => {
    // Force dispatch to station 101 for testing (Main)
    callKnnTest(7.5, 122.0, 'Near Station 101', 101);
  };

  const handleKnnTest102 = () => {
    // Force dispatch to station 103 for testing (Sta Catalina Substation)
    // Real coordinates from DB (latitude, longitude): 6.90928916, 122.08716188
    callKnnTest(6.90928916, 122.08716188, 'Near Station 103', 103);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Emergency Calls</Text>
        <Text style={styles.headerSubtitle}>Get immediate help in emergencies</Text>
      </View>

      <ScrollView style={styles.content}>
        {/* Quick Emergency Button */}
        <TouchableOpacity style={styles.quickEmergencyButton} onPress={handleQuickEmergency}>
          <View style={styles.quickEmergencyIcon}>
            <Ionicons name="warning" size={32} color="#fff" />
          </View>
          <Text style={styles.quickEmergencyText}>QUICK EMERGENCY</Text>
          <Text style={styles.quickEmergencySubtext}>Tap for immediate assistance</Text>
        </TouchableOpacity>

        {/* Developer: WebRTC Test Entry */}
        <TouchableOpacity
          style={[styles.quickEmergencyButton, { backgroundColor: '#1976D2' }]}
          onPress={() => navigation.navigate('CallTest')}
        >
          <View style={styles.quickEmergencyIcon}>
            <Ionicons name="call" size={32} color="#fff" />
          </View>
          <Text style={styles.quickEmergencyText}>WEBRTC CALL TEST</Text>
          <Text style={styles.quickEmergencySubtext}>For development: sends SDP offer to station</Text>
        </TouchableOpacity>

        {/* Emergency Contacts */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Emergency Hotlines</Text>
          {emergencyContacts.map((contact) => (
            <TouchableOpacity
              key={contact.id}
              style={styles.contactCard}
              onPress={() => handleEmergencyCall(contact)}
            >
              <View style={[styles.contactIcon, { backgroundColor: contact.color + '20' }]}>
                <Ionicons name={contact.icon as any} size={24} color={contact.color} />
              </View>
              <View style={styles.contactInfo}>
                <Text style={styles.contactName}>{contact.name}</Text>
                <Text style={styles.contactType}>{contact.type}</Text>
                <Text style={styles.contactNumber}>{contact.number}</Text>
              </View>
              <View style={styles.callButton}>
                <Ionicons name="call" size={20} color="#fff" />
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Developer: KNN Dispatch Test</Text>
          <TouchableOpacity
            style={[styles.quickEmergencyButton, { backgroundColor: '#5D4037', marginTop: 12 }]}
            onPress={handleKnnTest101}
          >
            <View style={styles.quickEmergencyIcon}>
              <Ionicons name="locate" size={32} color="#fff" />
            </View>
            <Text style={styles.quickEmergencyText}>KNN TEST 13 NEAR STATION 101</Text>
            <Text style={styles.quickEmergencySubtext}>Send fixed coordinates at Station 101</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.quickEmergencyButton, { backgroundColor: '#6D4C41', marginTop: 12 }]}
            onPress={handleKnnTest102}
          >
            <View style={styles.quickEmergencyIcon}>
              <Ionicons name="locate" size={32} color="#fff" />
            </View>
            <Text style={styles.quickEmergencyText}>KNN TEST 13 NEAR STATION 103</Text>
            <Text style={styles.quickEmergencySubtext}>Send fixed coordinates at Station 103</Text>
          </TouchableOpacity>
        </View>

        {/* Emergency Tips */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Emergency Tips</Text>
          <View style={styles.tipCard}>
            <View style={styles.tipIcon}>
              <Ionicons name="information-circle" size={20} color="#2196F3" />
            </View>
            <Text style={styles.tipText}>
              Stay calm and clearly state your location and emergency type when calling.
            </Text>
          </View>
          <View style={styles.tipCard}>
            <View style={styles.tipIcon}>
              <Ionicons name="location" size={20} color="#4CAF50" />
            </View>
            <Text style={styles.tipText}>
              Make sure your location services are enabled for faster emergency response.
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Confirmation Modal */}
      <Modal
        visible={showConfirmModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowConfirmModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.confirmModal}>
            <View style={styles.confirmIcon}>
              <Ionicons name="alert-circle" size={48} color="#E53935" />
            </View>
            <Text style={styles.confirmTitle}>Emergency Call Confirmation</Text>
            <Text style={styles.confirmMessage}>
              Are you in an emergency situation? Calling {selectedEmergency?.name} at {selectedEmergency?.number}.
            </Text>
            <Text style={styles.confirmSubtext}>
              Please confirm this is an actual emergency to proceed with the call.
            </Text>
            
            <View style={styles.confirmButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowConfirmModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmButton}
                onPress={confirmEmergencyCall}
              >
                <Text style={styles.confirmButtonText}>Yes, Call Now</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Dial Modal */}
      <Modal
        visible={showDialModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowDialModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.dialModal}>
            <View style={styles.dialHeader}>
              <Text style={styles.dialTitle}>Emergency Dial</Text>
              <TouchableOpacity onPress={() => setShowDialModal(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.dialNumberDisplay}>
              <Text style={styles.dialNumber}>{dialNumber}</Text>
            </View>
            
            <TextInput
              style={styles.emergencyInput}
              placeholder="Briefly describe your emergency..."
              placeholderTextColor="#999"
              value={emergencyDescription}
              onChangeText={setEmergencyDescription}
              multiline
              numberOfLines={3}
            />
            
            <View style={styles.dialKeypad}>
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'].map((num) => (
                <TouchableOpacity key={num} style={styles.keypadButton}>
                  <Text style={styles.keypadText}>{num}</Text>
                </TouchableOpacity>
              ))}
            </View>
            
            <TouchableOpacity style={styles.dialCallButton} onPress={handleDial}>
              <Ionicons name="call" size={24} color="#fff" />
              <Text style={styles.dialCallText}>CALL EMERGENCY</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#E53935',
    paddingTop: 20,
    paddingBottom: 24,
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  quickEmergencyButton: {
    backgroundColor: '#E53935',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginVertical: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  quickEmergencyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  quickEmergencyText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  quickEmergencySubtext: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.9)',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 12,
  },
  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  contactIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  contactType: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  contactNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: '#E53935',
  },
  callButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tipCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  tipIcon: {
    marginRight: 12,
  },
  tipText: {
    flex: 1,
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  confirmModal: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    width: '100%',
    maxWidth: 340,
  },
  confirmIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(229, 57, 53, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  confirmTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    textAlign: 'center',
    marginBottom: 12,
  },
  confirmMessage: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 8,
  },
  confirmSubtext: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginBottom: 24,
  },
  confirmButtons: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  confirmButton: {
    flex: 1,
    backgroundColor: '#E53935',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  dialModal: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 360,
  },
  dialHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  dialTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  dialNumberDisplay: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  dialNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#E53935',
  },
  emergencyInput: {
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: '#333',
    marginBottom: 16,
    textAlignVertical: 'top',
  },
  dialKeypad: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  keypadButton: {
    width: '30%',
    aspectRatio: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  keypadText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  dialCallButton: {
    flexDirection: 'row',
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    padding: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dialCallText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});
