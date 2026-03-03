import React, { useEffect, useState } from 'react';
import { View, Text, Button, StyleSheet, Alert, ScrollView } from 'react-native';
import * as Location from 'expo-location';
import { NODE_API_URL } from '../../config';

export const CallTestScreen = ({ navigation, route }: any) => {
  const [log, setLog] = useState<string>('');
  const [creating, setCreating] = useState(false);
  const [autoStarted, setAutoStarted] = useState(false);
  const [status, setStatus] = useState<string>('Ready to start an emergency call.');
  const [callPhase, setCallPhase] = useState<'idle' | 'connecting' | 'ringing' | 'inCall' | 'ended' | 'error'>('idle');

  const appendLog = (msg: string) => {
    setLog((prev) => prev + `\n${new Date().toLocaleTimeString()} - ${msg}`);
  };

  // If navigated with autoStart=true (e.g., from Quick Emergency), automatically
  // run the full KNN dispatch flow without requiring another button press.
  useEffect(() => {
    if (route?.params?.autoStart && !autoStarted) {
      setAutoStarted(true);
      createOfferAndSend();
    }
  }, [route?.params?.autoStart, autoStarted]);

  const createOfferAndSend = async () => {
    if (creating) return;

    setCreating(true);
    setCallPhase('connecting');
    setStatus('Preparing your emergency call...');
    appendLog('Starting emergency call via nearest-station dispatch flow...');

    try {
      appendLog('Requesting location permission for KNN dispatch...');
      setStatus('Requesting location permission...');
      const { status: locationStatus } = await Location.requestForegroundPermissionsAsync();
      if (locationStatus !== 'granted') {
        appendLog('Location permission denied; cannot dispatch via KNN.');
        setStatus('Location permission denied. Turn on location services to call the nearest station.');
        setCallPhase('error');
        Alert.alert(
          'Location Required',
          'Please enable location access to start an emergency call.'
        );
        return;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const latitude = position.coords.latitude;
      const longitude = position.coords.longitude;
      appendLog(`Got GPS location lat=${latitude}, lon=${longitude}. Creating alarm via KNN...`);
      setStatus('Finding the nearest fire station...');

      const phoneNumber = '9997778888';
      const alarmResponse = await fetch(`${NODE_API_URL}/api/enduser/create-alarm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber,
          latitude,
          longitude,
          incidentType: 'Fire',
          alarmLevel: 'Alarm 1',
          location: 'Mobile emergency call',
          narrative: 'Emergency call from mobile app',
        }),
      });

      const alarmData = await alarmResponse.json();
      if (!alarmResponse.ok) {
        appendLog('KNN alarm error: ' + (alarmData.message || 'unknown'));
        setCallPhase('error');
        Alert.alert('Emergency Error', alarmData.message || 'Failed to create alarm.');
        return;
      }

      const targetStationId = alarmData.dispatchedStationId || 101;
      appendLog(
        `Alarm ${alarmData.alarmId} created; dispatched to station ${targetStationId}. Twilio voice call integration not yet implemented.`,
      );

      setCallPhase('inCall');
      setStatus('Alarm created. Station will contact you. Voice call support (Twilio) coming soon.');
    } catch (err: any) {
      try {
        appendLog('Error object: ' + JSON.stringify(err));
      } catch (e) {
      }
      appendLog('Error: ' + (err?.message || 'Unknown error'));
      Alert.alert('Error', err?.message || 'Unknown error');
      setStatus('We could not complete the emergency call. Please try again, or use the hotline numbers on the previous screen.');
      setCallPhase('error');
    } finally {
      setCreating(false);
    }
  };

  const endCall = () => {
    setCreating(false);
    setCallPhase('ended');
    setStatus('Call ended.');
  };

  const isBusy = callPhase === 'connecting' || callPhase === 'ringing' || callPhase === 'inCall';

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Emergency Call – Nearest Station</Text>
      <Text style={styles.subtitle}>
        Start a live voice call with your assigned fire station. Keep your phone
        close and clearly describe your emergency.
      </Text>
      <View style={styles.statusCard}>
        <Text style={styles.statusLabel}>Call status</Text>
        <Text style={styles.statusText}>{status}</Text>
      </View>
      <Button
        title={
          callPhase === 'connecting'
            ? 'Connecting to station...'
            : callPhase === 'ringing'
            ? 'Ringing station...'
            : callPhase === 'inCall'
            ? 'Call in progress'
            : 'Start Emergency Call'
        }
        onPress={createOfferAndSend}
        disabled={isBusy}
      />
      <View style={{ height: 8 }} />
      <Button
        title="End Call"
        onPress={endCall}
        color="#D32F2F"
        disabled={!isBusy}
      />
      <View style={styles.logContainer}>
        <Text style={styles.logTitle}>Connection log (for support)</Text>
        <ScrollView style={styles.logScroll}>
          <Text style={styles.logText}>{log}</Text>
        </ScrollView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 16,
  },
  statusCard: {
    marginTop: 8,
    marginBottom: 16,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#FFF3E0',
    borderWidth: 1,
    borderColor: '#FFB74D',
  },
  statusLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#BF360C',
    marginBottom: 4,
  },
  statusText: {
    fontSize: 14,
    color: '#4E342E',
  },
  logContainer: {
    flex: 1,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 8,
  },
  logTitle: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  logScroll: {
    flex: 1,
  },
  logText: {
    fontSize: 12,
  },
});
