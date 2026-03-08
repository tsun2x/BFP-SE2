// src/screens/TrackingScreen.tsx
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useMission, ALARM_LEVELS, STATUS_PHASES } from '../context/MissionContext';
import { API_URL } from '../config';

const TrackingScreen = () => {
  const { user, token } = useAuth();
  const { fireStatus, alarmLevel, truckId, broadcastStatus } = useMission();
  const [isTracking, setIsTracking] = useState<boolean>(false);
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const locationSubscription = useRef<Location.LocationSubscription | null>(null);

  const currentAlarm = ALARM_LEVELS.find((a) => a.key === alarmLevel) || ALARM_LEVELS[0];
  const currentStatus = STATUS_PHASES.find((s) => s.key === fireStatus) || STATUS_PHASES[0];

  const requestPermissions = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      setErrorMsg('Permission to access location was denied');
      return false;
    }
    return true;
  };

  const sendLocationToServer = async (loc: Location.LocationObject) => {
    try {
      await fetch(API_URL + '/api/firetrucks/track', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + token,
          'ngrok-skip-browser-warning': 'true',
        },
        body: JSON.stringify({
          truck_id: truckId,
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
          speed: loc.coords.speed ?? null,
          heading: loc.coords.heading ?? null,
          accuracy: loc.coords.accuracy ?? null,
          alarm_level: alarmLevel,
          fire_status: fireStatus,
        }),
      });
      broadcastStatus(fireStatus, alarmLevel, loc.coords.latitude, loc.coords.longitude);
    } catch (error) {
      console.error('Error sending location:', error);
    }
  };

  const startTracking = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;
    try {
      const currentLocation = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      setLocation(currentLocation);
      await sendLocationToServer(currentLocation);
      const subscription = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, timeInterval: 5000, distanceInterval: 0 },
        async (newLocation) => {
          setLocation(newLocation);
          await sendLocationToServer(newLocation);
        }
      );
      locationSubscription.current = subscription;
      setIsTracking(true);
    } catch (error) {
      console.error('Error starting location tracking:', error);
      setErrorMsg('Failed to start location tracking');
    }
  };

  const stopTracking = () => {
    if (locationSubscription.current) {
      locationSubscription.current.remove();
      locationSubscription.current = null;
    }
    setIsTracking(false);
  };

  useEffect(() => {
    return () => { if (locationSubscription.current) locationSubscription.current.remove(); };
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Firetruck Tracking</Text>

      <View style={[styles.statusBanner, { backgroundColor: currentStatus.color + '20', borderColor: currentStatus.color }]}>
        <View style={styles.statusBannerRow}>
          <Ionicons name={currentStatus.icon as any} size={20} color={currentStatus.color} />
          <Text style={[styles.statusBannerText, { color: currentStatus.color }]}>{fireStatus}</Text>
          <View style={styles.statusBannerDivider} />
          <Ionicons name={currentAlarm.icon as any} size={20} color={currentAlarm.color} />
          <Text style={[styles.statusBannerText, { color: currentAlarm.color }]}>{alarmLevel}</Text>
        </View>
      </View>

      <View style={styles.infoContainer}>
        <Text style={styles.label}>
          Tracking: {isTracking ? 'Active' : 'Inactive'}
          {isTracking && ' \u2022 Broadcasting alarm & status'}
        </Text>
        {location ? (
          <View style={styles.coordinates}>
            <Text>Latitude: {location.coords.latitude.toFixed(6)}</Text>
            <Text>Longitude: {location.coords.longitude.toFixed(6)}</Text>
            <Text>Accuracy: {location.coords.accuracy?.toFixed(2)} meters</Text>
            <Text>Speed: {location.coords.speed ? location.coords.speed.toFixed(2) + ' m/s' : 'N/A'}</Text>
          </View>
        ) : (
          <Text style={styles.noLocation}>No location data available</Text>
        )}
        {errorMsg && <Text style={styles.error}>{errorMsg}</Text>}
      </View>

      <TouchableOpacity
        style={[styles.button, isTracking ? styles.stopButton : styles.startButton]}
        onPress={isTracking ? stopTracking : startTracking}
      >
        <Ionicons name={isTracking ? 'stop-circle' : 'navigate-circle'} size={24} color="white" style={styles.buttonIcon} />
        <Text style={styles.buttonText}>{isTracking ? 'STOP TRACKING' : 'START TRACKING'}</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { marginTop: 20, flex: 1, backgroundColor: '#f5f5f5', padding: 20 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 16, color: '#B71C1C', textAlign: 'center' },
  statusBanner: { borderRadius: 10, borderWidth: 1.5, padding: 10, marginBottom: 16 },
  statusBannerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  statusBannerText: { fontSize: 14, fontWeight: '700', marginLeft: 6 },
  statusBannerDivider: { width: 1, height: 18, backgroundColor: '#ccc', marginHorizontal: 12 },
  infoContainer: { backgroundColor: 'white', padding: 20, borderRadius: 10, marginBottom: 20, elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 10, color: '#333' },
  coordinates: { marginTop: 10, padding: 10, backgroundColor: '#f9f9f9', borderRadius: 5 },
  noLocation: { color: '#666', fontStyle: 'italic', textAlign: 'center', marginTop: 10 },
  error: { color: '#D32F2F', marginTop: 10, textAlign: 'center' },
  button: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 30, paddingVertical: 15, borderRadius: 5, marginVertical: 10 },
  startButton: { backgroundColor: '#4CAF50' },
  stopButton: { backgroundColor: '#F44336' },
  buttonText: { color: 'white', fontWeight: 'bold', fontSize: 16, marginLeft: 10 },
  buttonIcon: { marginRight: 5 },
});

export default TrackingScreen;
