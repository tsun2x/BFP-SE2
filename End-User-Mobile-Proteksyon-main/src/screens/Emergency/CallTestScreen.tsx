import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Button, StyleSheet, Alert, ScrollView } from 'react-native';
import { RTCPeerConnection, RTCIceCandidate, RTCSessionDescription, mediaDevices } from 'react-native-webrtc';
import * as Location from 'expo-location';
import { API_URL, NODE_API_URL } from '../../config';

export const CallTestScreen = ({ navigation, route }: any) => {
  const [log, setLog] = useState<string>('');
  const [creating, setCreating] = useState(false);
  const [autoStarted, setAutoStarted] = useState(false);
  const [status, setStatus] = useState<string>('Ready to start an emergency call.');
  const [callPhase, setCallPhase] = useState<'idle' | 'connecting' | 'ringing' | 'inCall' | 'ended' | 'error'>('idle');
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const sinceIdRef = useRef<number>(0);

  const appendLog = (msg: string) => {
    setLog((prev) => prev + `\n${new Date().toLocaleTimeString()} - ${msg}`);
  };

  // If navigated with autoStart=true (e.g., from Quick Emergency), automatically
  // run the full KNN + VoIP pipeline without requiring another button press.
  useEffect(() => {
    if (route?.params?.autoStart && !autoStarted) {
      setAutoStarted(true);
      createOfferAndSend();
    }
  }, [route?.params?.autoStart, autoStarted]);

  const createOfferAndSend = async () => {
    // If a previous call is still in progress, avoid starting another
    if (creating) return;

    // If there is an existing peer connection or polling loop from a prior call,
    // clean them up before starting a new one so we always start from a fresh state.
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    if (pcRef.current) {
      try {
        pcRef.current.getSenders().forEach((sender: any) => {
          if (sender.track) sender.track.stop();
        });
        pcRef.current.close();
      } catch (e) {
        // ignore cleanup errors
      }
      pcRef.current = null;
    }

    setCreating(true);
    setCallPhase('connecting');
    setStatus('Preparing your emergency call...');
    appendLog('Starting emergency VoIP call with KNN dispatch...');
    appendLog('API_URL: ' + API_URL + '/api/webrtc_send_signal.php');

    try {
      // 1) Get location permission and current GPS for KNN dispatch
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

      // 2) Create alarm via Node backend (KNN picks nearest ready station)
      const phoneNumber = '9997778888'; // TODO: use real user phone when auth is wired
      const alarmResponse = await fetch(`${NODE_API_URL}/api/enduser/create-alarm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber,
          latitude,
          longitude,
          incidentType: 'Fire',
          alarmLevel: 'Alarm 1',
          location: 'VoIP emergency call',
          narrative: 'Emergency VoIP call from mobile app',
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
        `Alarm ${alarmData.alarmId} created; dispatched to station ${targetStationId}. Creating WebRTC offer...`,
      );
      setStatus(`Connecting you to Fire Station ${targetStationId}...`);

      // 3) Set up WebRTC connection and send offer to the dispatched station
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
      });
      pcRef.current = pc;

      // Listen for remote audio tracks from the station
      pc.ontrack = (event: any) => {
        appendLog('Remote track received on user (end-user device)');
        setCallPhase('inCall');
        setStatus('Call connected. You are now speaking with the fire station.');
      };

      // Get audio stream
      const stream = await mediaDevices.getUserMedia({ audio: true, video: false });
      stream.getTracks().forEach((track: any) => pc.addTrack(track, stream));

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      appendLog('Offer created, sending to backend for station ' + targetStationId + '...');

      const response = await fetch(`${API_URL}/api/webrtc_send_signal.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from_user_id: 201, // TODO: replace with real logged-in user id when available
          to_station_id: targetStationId,
          type: 'offer',
          payload: offer,
        }),
      });

      const data = await response.json();
      if (!data.success) {
        appendLog('Backend error: ' + (data.error || 'unknown'));
        setCallPhase('error');
        Alert.alert('Error', 'Failed to send offer: ' + (data.error || 'unknown'));
      } else {
        appendLog('Offer sent successfully. Signal id: ' + data.id);
        Alert.alert('Success', 'Your call is being connected to the fire station. Please wait...');
        sinceIdRef.current = data.id;
        setCallPhase('ringing');
        setStatus('Ringing... Please wait for the fire station to answer.');
        startPollingForAnswerAndIce();
      }
    } catch (err: any) {
      try {
        appendLog('Error object: ' + JSON.stringify(err));
      } catch (e) {
        // ignore JSON stringify errors
      }
      appendLog('Error: ' + (err?.message || 'Unknown error'));
      Alert.alert('Error', err?.message || 'Unknown error');
    } finally {
      setStatus('We could not complete the emergency call. Please try again, or use the hotline numbers on the previous screen.');
      setCallPhase((prev) => (prev === 'inCall' || prev === 'ringing' || prev === 'connecting' ? 'error' : prev));
      setCreating(false);
    }
  };

  const endCall = () => {
    // Allow user to manually hang up like a normal phone call
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    if (pcRef.current) {
      try {
        pcRef.current.getSenders().forEach((sender: any) => {
          if (sender.track) sender.track.stop();
        });
        pcRef.current.close();
      } catch (e) {
        // ignore cleanup errors
      }
      pcRef.current = null;
    }
    setCreating(false);
    setCallPhase('ended');
    setStatus('Call ended.');
  };

  const startPollingForAnswerAndIce = () => {
    if (pollingRef.current) return;
    appendLog('Starting polling for answer/ICE for user_id=201');

    const poll = async () => {
      const pc = pcRef.current;
      if (!pc) return;

      try {
        const url = `${API_URL}/api/webrtc_poll_for_user.php?user_id=201&since_id=${sinceIdRef.current}`;
        const res = await fetch(url);
        const data = await res.json();

        if (!data.success) {
          appendLog('User poll backend error: ' + (data.error || 'unknown'));
          return;
        }

        if (Array.isArray(data.signals) && data.signals.length > 0) {
          // First apply any answers
          for (const sig of data.signals) {
            if (sig.id > sinceIdRef.current) {
              sinceIdRef.current = sig.id;
            }

            if (sig.type === 'answer') {
              appendLog('User poll signal (answer): ' + JSON.stringify(sig));
              if (sig.payload && sig.payload.sdp && sig.payload.type) {
                await pc.setRemoteDescription(new RTCSessionDescription(sig.payload));
                appendLog('Remote answer applied to peer connection');
              }
            }
          }

          // Then apply ICE candidates, but only if we already have a remote description
          for (const sig of data.signals) {
            if (sig.type === 'ice') {
              appendLog('User poll signal (ice): ' + JSON.stringify(sig));
              // react-native-webrtc exposes remoteDescription (not currentRemoteDescription)
              if (!pc.remoteDescription) {
                appendLog('Skipping ICE candidate because remote description is not set yet');
                continue;
              }
              if (sig.payload) {
                await pc.addIceCandidate(new RTCIceCandidate(sig.payload));
                appendLog('Remote ICE candidate added');
              }
            }
          }
        }
      } catch (err: any) {
        appendLog('User poll fetch error: ' + (err?.message || 'unknown'));
      }
    };

    pollingRef.current = setInterval(poll, 1000);
  };

  // Cleanup on unmount: stop polling and close any active peer connection so
  // the next emergency call starts with a clean WebRTC state.
  useEffect(() => {
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
      if (pcRef.current) {
        try {
          pcRef.current.getSenders().forEach((sender: any) => {
            if (sender.track) sender.track.stop();
          });
          pcRef.current.close();
        } catch (e) {
          // ignore cleanup errors
        }
        pcRef.current = null;
      }
    };
  }, []);

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
