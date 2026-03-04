import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Alert,
  ScrollView,
  TextInput,
  Animated,
  Vibration,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { io as ioClient } from 'socket.io-client/dist/socket.io.js';
import { NODE_API_URL, TEST_CALLER_PHONE } from '../../config';
import useTwilioVoice from '../../hooks/useTwilioVoice';
import { useAuth } from '../../context/AuthContext';

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

// Call state type
type CallPhase = 'idle' | 'confirming' | 'locating' | 'sending' | 'dialing' | 'ringing' | 'redirecting' | 'connected' | 'ended' | 'error';

export const EmergencyCallScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [selectedEmergency, setSelectedEmergency] = useState<any>(null);
  const [showDialModal, setShowDialModal] = useState(false);
  const [dialNumber, setDialNumber] = useState('');
  const [emergencyDescription, setEmergencyDescription] = useState('');

  // Calling UI state
  const [callPhase, setCallPhase] = useState<CallPhase>('idle');
  const [showCallingScreen, setShowCallingScreen] = useState(false);
  const [dispatchedStation, setDispatchedStation] = useState<number | null>(null);
  const [dispatchedStationName, setDispatchedStationName] = useState<string | null>(null);
  const [callTimer, setCallTimer] = useState(0);
  const [callError, setCallError] = useState<string | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const socketRef = useRef<any>(null);
  const alarmIdRef = useRef<number | null>(null);
  const voipHangUpRef = useRef<() => void>(() => {});

  // Twilio Voice SDK for VoIP calls — identity + JWT from auth context
  const { token: jwtToken, user: authUser } = useAuth();
  const civilianPhone = authUser?.phone || TEST_CALLER_PHONE;
  const civilianIdentity = `CIV_${civilianPhone.replace(/[^0-9]/g, '')}`;
  const { status: voipStatus, activeCall, makeCall: voipCall, hangUp: voipHangUp, error: voipError } = useTwilioVoice(civilianIdentity, jwtToken);

  // Keep ref up-to-date so socket closures always have the latest hangUp
  useEffect(() => { voipHangUpRef.current = voipHangUp; }, [voipHangUp]);

  // Diagnostic: log auth + VoIP state
  useEffect(() => {
    console.log(`[EmergencyCall] AUTH: jwtToken=${jwtToken ? 'YES(' + jwtToken.length + ')' : 'NULL'}, user=${authUser?.phone || 'null'}, civilianIdentity=${civilianIdentity}`);
    console.log(`[EmergencyCall] VOIP: status=${voipStatus}, error=${voipError || 'none'}`);
  }, [jwtToken, voipStatus, voipError]);

  // Pulse animation for the calling screen
  useEffect(() => {
    if (showCallingScreen && (callPhase === 'dialing' || callPhase === 'ringing' || callPhase === 'redirecting')) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.3, duration: 800, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [showCallingScreen, callPhase]);

  // Call timer when connected
  useEffect(() => {
    if (callPhase === 'connected') {
      setCallTimer(0);
      timerRef.current = setInterval(() => setCallTimer(t => t + 1), 1000);
      return () => { if (timerRef.current) clearInterval(timerRef.current); };
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
  }, [callPhase]);

  // Watch VoIP activeCall drop — only transition from connected → ended
  useEffect(() => {
    if (!activeCall && callPhase === 'connected') {
      setCallPhase('ended');
    }
  }, [activeCall]);

  const formatTimer = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  // Socket.IO: connect when calling screen opens for failover events
  useEffect(() => {
    if (!showCallingScreen) return;

    const socket = ioClient(NODE_API_URL, { transports: ['websocket'] });
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('[Socket] Civilian connected:', socket.id);
      // If alarmId is already known, join the room right away
      if (alarmIdRef.current) {
        socket.emit('join-alarm', { alarmId: alarmIdRef.current });
      }
    });

    socket.on('failover-redirect', (data: any) => {
      console.log('[Failover] Redirecting to:', data.toStationName);
      // Hang up current Twilio call before transitioning (use ref to avoid stale closure)
      try { voipHangUpRef.current(); } catch (e) { console.warn('[Failover] hangUp error:', e); }
      setCallPhase('redirecting' as CallPhase);
      setDispatchedStation(data.toStationId);
      setDispatchedStationName(data.toStationName);

      // After 2.5s transition, resume dialing the new station (stays yellow)
      setTimeout(async () => {
        setCallPhase('dialing');
        // Place Twilio VoIP call to the next station (substation or main admin)
        const newIdentity = data.toStationId === 'main' ? 'ADM_MAIN' : `ADM_SUB_${data.toStationId}`;
        console.log(`[Failover] Calling new station: ${newIdentity}`);
        try {
          const call = await voipCall(newIdentity);
          if (call) setCallPhase('ringing');
          console.log('[Failover] New call result:', !!call);
        } catch (e) {
          console.warn('[Failover] New Twilio call failed:', e);
          setCallPhase('ringing');
        }
      }, 2500);
    });

    // A station accepted the call — NOW go green
    socket.on('call-accepted', (data: any) => {
      console.log('[Socket] Call accepted by station:', data.stationName || data.stationId);
      if (data.stationName) setDispatchedStationName(data.stationName);
      setCallPhase('connected');
    });

    socket.on('failover-exhausted', () => {
      console.log('[Failover] No more stations available');
      setCallPhase('error');
      setCallError('No answer from any station. Please try again.');
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [showCallingScreen]);

  const getCallPhaseText = (): string => {
    switch (callPhase) {
      case 'locating': return 'Getting your location...';
      case 'sending': return 'Sending alert to station...';
      case 'dialing': return 'Dialing nearest station...';
      case 'ringing': return 'Ringing...';
      case 'redirecting': return `Redirecting to ${dispatchedStationName || 'another station'}...`;
      case 'connected': return 'Connected';
      case 'ended': return 'Call Ended';
      case 'error': return callError || 'Something went wrong';
      default: return '';
    }
  };

  const handleEndCall = () => {
    if (activeCall) {
      voipHangUp();
    }
    // Tell backend to cancel failover and dismiss all station modals
    if (socketRef.current && alarmIdRef.current) {
      socketRef.current.emit('call-cancelled', { alarmId: alarmIdRef.current });
      console.log('[EndCall] Emitted call-cancelled for alarm', alarmIdRef.current);
    }
    // Disconnect socket
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    alarmIdRef.current = null;
    setCallPhase('ended');
    setTimeout(() => {
      setShowCallingScreen(false);
      setCallPhase('idle');
      setDispatchedStation(null);
      setDispatchedStationName(null);
      setCallError(null);
    }, 1500);
  };

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
    setShowDialModal(false);
    initiateEmergencyCall();
  };

  const handleQuickEmergency = () => {
    setCallPhase('confirming');
    setShowCallingScreen(false);
    Alert.alert(
      '🚨 Emergency Confirmation',
      'Are you sure this is an actual emergency?\n\nThis will immediately alert the nearest fire station and initiate a call.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => setCallPhase('idle'),
        },
        {
          text: 'YES, CALL NOW',
          style: 'destructive',
          onPress: () => initiateEmergencyCall(),
        },
      ],
    );
  };

  const initiateEmergencyCall = async () => {
    Vibration.vibrate([0, 100, 50, 100]);
    setShowCallingScreen(true);
    setCallPhase('locating');
    setCallError(null);

    try {
      // Step 1: Get location
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setCallPhase('error');
        setCallError('Location permission denied. Enable location to proceed.');
        return;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      const latitude = position.coords.latitude;
      const longitude = position.coords.longitude;

      // Step 2: Send alarm
      setCallPhase('sending');
      const phoneNumber = civilianPhone;

      const response = await fetch(`${NODE_API_URL}/api/enduser/create-alarm`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true',
          ...(jwtToken ? { Authorization: `Bearer ${jwtToken}` } : {}),
        },
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
        setCallPhase('error');
        setCallError(data.message || 'Failed to create alarm.');
        return;
      }

      console.log('Alarm created from emergency call:', data);
      alarmIdRef.current = data.alarmId || null;
      setDispatchedStation(data.dispatchedStationId || null);
      setDispatchedStationName(data.dispatchedStationName || null);

      // Join the alarm socket room so we receive failover-redirect events
      if (socketRef.current?.connected && data.alarmId) {
        socketRef.current.emit('join-alarm', { alarmId: data.alarmId });
        console.log(`[Socket] Joined alarm room: alarm-${data.alarmId}`);
      }

      // Step 3: Determine Twilio identity — substation or main admin (direct dispatch)
      const isMainAdmin = !data.dispatchedStationId && data.dispatchedStationName === 'Central Fire Station (Main)';
      const stationIdentity = isMainAdmin ? 'ADM_MAIN' : data.dispatchedStationId ? `ADM_SUB_${data.dispatchedStationId}` : null;

      if (stationIdentity) {
        setCallPhase('dialing');
        console.log(`[VoIP] Calling station identity: ${stationIdentity}, voipStatus: ${voipStatus}, voipError: ${voipError}`);

        try {
          const call = await voipCall(stationIdentity);
          if (call) {
            console.log('[VoIP] Call initiated successfully');
            setCallPhase('ringing');
          } else {
            console.warn('[VoIP] First attempt returned null, retrying in 2s...');
            setCallPhase('ringing');
            setTimeout(async () => {
              try {
                const retryCall = await voipCall(stationIdentity);
                console.log('[VoIP] Retry result:', !!retryCall);
              } catch (retryErr) {
                console.warn('[VoIP] Retry failed:', retryErr);
              }
            }, 2000);
          }
        } catch (err: any) {
          console.error('[VoIP] Call failed:', err);
          setCallPhase('ringing');
        }
      } else {
        setCallPhase('error');
        setCallError('No station available to dispatch. Please try again.');
      }
    } catch (err: any) {
      console.error('Emergency call error:', err);
      setCallPhase('error');
      setCallError(err?.message || 'Network error. Check your connection.');
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

        {/* VoIP Active Call Banner */}
        {activeCall && (
          <View style={{ backgroundColor: '#28a745', borderRadius: 12, padding: 16, marginHorizontal: 16, marginBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View>
              <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>On VoIP Call</Text>
              <Text style={{ color: '#ffffffcc', fontSize: 13 }}>Connected to {dispatchedStationName || 'fire station'}</Text>
            </View>
            <TouchableOpacity
              onPress={voipHangUp}
              style={{ backgroundColor: '#dc3545', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 10 }}
            >
              <Text style={{ color: '#fff', fontWeight: 'bold' }}>Hang Up</Text>
            </TouchableOpacity>
          </View>
        )}

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

      {/* ── Full-Screen Calling UI ────────────────────────────── */}
      <Modal
        visible={showCallingScreen}
        animationType="slide"
        onRequestClose={handleEndCall}
      >
        <View style={callingStyles.container}>
          {/* Top area */}
          <View style={callingStyles.topArea}>
            <Text style={callingStyles.callingLabel}>
              {callPhase === 'connected' ? 'CONNECTED' : callPhase === 'redirecting' ? 'REDIRECTING...' : 'EMERGENCY CALL'}
            </Text>
            <Text style={callingStyles.stationName}>
              {dispatchedStationName || (dispatchedStation ? `Fire Station #${dispatchedStation}` : 'Nearest Fire Station')}
            </Text>
            <Text style={callingStyles.phaseText}>{getCallPhaseText()}</Text>
            {callPhase === 'connected' && (
              <Text style={callingStyles.timerText}>{formatTimer(callTimer)}</Text>
            )}
          </View>

          {/* Center — pulsing icon */}
          <View style={callingStyles.centerArea}>
            <Animated.View style={[
              callingStyles.pulseCircleOuter,
              { transform: [{ scale: pulseAnim }] },
              callPhase === 'connected' && { backgroundColor: 'rgba(76,175,80,0.15)' },
              callPhase === 'redirecting' && { backgroundColor: 'rgba(255,152,0,0.15)' },
              callPhase === 'ended' && { backgroundColor: 'rgba(158,158,158,0.15)' },
              callPhase === 'error' && { backgroundColor: 'rgba(229,57,53,0.15)' },
            ]}>
              <View style={[
                callingStyles.pulseCircleInner,
                callPhase === 'connected' && { backgroundColor: '#4CAF50' },
                callPhase === 'redirecting' && { backgroundColor: '#FF9800' },
                callPhase === 'ended' && { backgroundColor: '#9E9E9E' },
                callPhase === 'error' && { backgroundColor: '#E53935' },
              ]}>
                <Ionicons
                  name={
                    callPhase === 'error' ? 'alert-circle' :
                    callPhase === 'ended' ? 'call' :
                    callPhase === 'connected' ? 'call' :
                    'call-outline'
                  }
                  size={48}
                  color="#fff"
                />
              </View>
            </Animated.View>

            {(callPhase === 'locating' || callPhase === 'sending') && (
              <Text style={callingStyles.subPhaseText}>Please wait...</Text>
            )}

            {callPhase === 'error' && (
              <TouchableOpacity
                style={callingStyles.retryButton}
                onPress={() => { setShowCallingScreen(false); setCallPhase('idle'); }}
              >
                <Text style={callingStyles.retryText}>Dismiss</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Bottom — hang up */}
          <View style={callingStyles.bottomArea}>
            {callPhase !== 'error' && callPhase !== 'ended' && (
              <TouchableOpacity style={callingStyles.hangUpButton} onPress={handleEndCall}>
                <Ionicons name="call" size={32} color="#fff" style={{ transform: [{ rotate: '135deg' }] }} />
              </TouchableOpacity>
            )}
            {callPhase !== 'error' && callPhase !== 'ended' && (
              <Text style={callingStyles.hangUpLabel}>End Call</Text>
            )}
            {callPhase === 'ended' && (
              <TouchableOpacity
                style={[callingStyles.hangUpButton, { backgroundColor: '#666' }]}
                onPress={() => { setShowCallingScreen(false); setCallPhase('idle'); }}
              >
                <Ionicons name="close" size={32} color="#fff" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>

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

const callingStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  topArea: {
    alignItems: 'center',
    marginTop: 40,
  },
  callingLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff80',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  stationName: {
    fontSize: 26,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
    textAlign: 'center',
  },
  phaseText: {
    fontSize: 16,
    color: '#ffffffcc',
    marginBottom: 4,
  },
  timerText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#4CAF50',
    marginTop: 8,
    fontVariant: ['tabular-nums'],
  },
  centerArea: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseCircleOuter: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(229, 57, 53, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pulseCircleInner: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#E53935',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#E53935',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },
  subPhaseText: {
    fontSize: 14,
    color: '#ffffff60',
    marginTop: 20,
  },
  retryButton: {
    marginTop: 24,
    backgroundColor: '#ffffff20',
    borderRadius: 12,
    paddingHorizontal: 32,
    paddingVertical: 12,
  },
  retryText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  bottomArea: {
    alignItems: 'center',
    marginBottom: 20,
  },
  hangUpButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#E53935',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#E53935',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  hangUpLabel: {
    color: '#ffffff80',
    fontSize: 14,
    marginTop: 12,
  },
});
