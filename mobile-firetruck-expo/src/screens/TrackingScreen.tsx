// src/screens/TrackingScreen.tsx
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Alert, ScrollView } from 'react-native';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';

// Backend base URL – update this to your actual XAMPP URL
// Use the same LAN IP that Expo shows (e.g. exp://192.168.1.60:8081 -> 192.168.1.60)
const API_URL = 'http://192.168.1.60/SE_BFP';

// Node.js backend base URL for firetruck APIs (current alarm, etc.)
const NODE_API_URL = process.env.EXPO_PUBLIC_NODE_API_URL || 'http://192.168.1.60:5000/api';

// Fire alarm levels (match BFP alarm ladder)
const ALARM_LEVELS = [
  '1st Alarm',
  '2nd Alarm',
  '3rd Alarm',
  '4th Alarm',
  '5th Alarm',
  'Task Force Alpha',
  'Task Force Bravo',
  'Task Force Charlie',
  'Task Force Delta',
  'General Alarm',
];

const FIRE_STATUS_OPTIONS = ['Responding', 'On Scene', 'Fire Out'];

const TrackingScreen = () => {
  const [isTracking, setIsTracking] = useState<boolean>(false);
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [truckId, setTruckId] = useState<number>(1); // or whatever real truck_id you saw
  const locationSubscription = useRef<Location.LocationSubscription | null>(null);
  const [alarmLevel, setAlarmLevel] = useState<string>(ALARM_LEVELS[0]);
  const [fireStatus, setFireStatus] = useState<string>(FIRE_STATUS_OPTIONS[0]);
  const { user } = useAuth();

  // Request location permissions
  const requestPermissions = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      setErrorMsg('Permission to access location was denied');
      return false;
    }
    return true;
  };

  // Send location to server
  const sendLocationToServer = async (location: Location.LocationObject) => {
    try {
      console.log('Sending location for truck_id =', truckId);
      
      const response = await fetch(`${API_URL}/api/update_firetruck_location.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          truck_id: truckId,
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          speed: location.coords.speed,
          heading: location.coords.heading,
          accuracy: location.coords.accuracy,
          battery_level: 100, // You can get this from battery API if needed
          alarm_id: null, // Optional: Add if you have alarm system
          alarm_level: alarmLevel,
          fire_status: fireStatus,
        }),
      });

      const rawText = await response.text();
      console.log('Raw response from update_firetruck_location.php:', rawText);

      let data;
      try {
        data = JSON.parse(rawText);
      } catch (parseError) {
        console.error('Error parsing JSON from update_firetruck_location.php:', parseError);
        return;
      }

      if (!response.ok || !data.success) {
        console.error('Failed to update location:', data.error || rawText);
      }
    } catch (error) {
      console.error('Error sending location:', error);
    }
  };

  // Fetch current alarm for this firetruck from Node backend
  const fetchCurrentAlarm = async () => {
    try {
      const url = `${NODE_API_URL}/firetrucks/current-alarm?truck_id=${truckId}`;
      console.log('Fetching current alarm from', url);
      const response = await fetch(url);
      const json = await response.json();

      if (!response.ok || !json.success) {
        console.error('Failed to fetch current alarm:', json);
        return;
      }

      if (json.hasAlarm && json.alarm) {
        console.log('Current alarm for truck', truckId, json.alarm);
      } else {
        console.log('No active alarm for truck', truckId);
      }
    } catch (err) {
      console.error('Error fetching current alarm for firetruck:', err);
    }
  };

  // Start tracking location
  const startTracking = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    try {
      // Check if there is a current alarm for this truck (optional for now)
      await fetchCurrentAlarm();

      // Mark this truck as active so it appears on civilian maps
      fetch(`${API_URL}/api/set_firetruck_active.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ truck_id: truckId, is_active: 1 }),
      }).catch((err) => {
        console.error('Failed to mark truck active:', err);
      });

      // Get current position first
      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      setLocation(currentLocation);
      await sendLocationToServer(currentLocation);

      // Then subscribe to location updates
      const subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 5000, // send update at most every 5 seconds
          distanceInterval: 10, // or when moved ~10 meters
        },
        async (newLocation) => {
          setLocation(newLocation);
          await sendLocationToServer(newLocation);
        }
      );

      // Save subscription so we can stop tracking later
      locationSubscription.current = subscription;

      setIsTracking(true);
    } catch (error) {
      console.error('Error starting location tracking:', error);
      setErrorMsg('Failed to start location tracking');
    }
  };

  // Stop tracking location
  const stopTracking = () => {
    if (locationSubscription.current) {
      locationSubscription.current.remove();
      locationSubscription.current = null;
    }
    setIsTracking(false);
    // Inform backend that this truck is now inactive so it can be hidden from maps
    fetch(`${API_URL}/api/set_firetruck_active.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ truck_id: truckId, is_active: 0 }),
    }).catch((err) => {
      console.error('Failed to mark truck inactive:', err);
    });
  };

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (locationSubscription.current) {
        locationSubscription.current.remove();
      }
    };
  }, []);

  return (
    <View style={styles.screen}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
        <Text style={styles.title}>Firetruck Tracking</Text>
        
        <View style={styles.infoContainer}>
          <Text style={styles.label}>Status: {isTracking ? 'Active' : 'Inactive'}</Text>

          <View style={styles.officerInfo}>
            <Text style={styles.officerLabel}>Officer</Text>
            <Text style={styles.officerValue}>{user?.name || user?.idNumber || 'Unknown'}</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.subLabel}>Alarm Level</Text>
            <View style={styles.chipRow}>
              {ALARM_LEVELS.map((level) => (
                <TouchableOpacity
                  key={level}
                  style={[
                    styles.chip,
                    alarmLevel === level && styles.chipActive,
                  ]}
                  onPress={() => setAlarmLevel(level)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      alarmLevel === level && styles.chipTextActive,
                    ]}
                  >
                    {level}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.subLabel}>Fire Status</Text>
            <View style={styles.chipRow}>
              {FIRE_STATUS_OPTIONS.map((status) => (
                <TouchableOpacity
                  key={status}
                  style={[
                    styles.chip,
                    fireStatus === status && styles.chipActive,
                  ]}
                  onPress={() => setFireStatus(status)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      fireStatus === status && styles.chipTextActive,
                    ]}
                  >
                    {status}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          
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
      </ScrollView>
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.button, isTracking ? styles.stopButton : styles.startButton]}
          onPress={isTracking ? stopTracking : startTracking}
        >
          <Ionicons
            name={isTracking ? 'stop-circle' : 'navigate-circle'}
            size={24}
            color="white"
            style={styles.buttonIcon}
          />
          <Text style={styles.buttonText}>
            {isTracking ? 'STOP TRACKING' : 'START TRACKING'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scroll: {
    flex: 1,
  },
  container: {
    marginTop: 20,
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 30,
    color: '#B71C1C',
    textAlign: 'center',
  },
  infoContainer: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    marginBottom: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  officerInfo: {
    marginBottom: 12,
  },
  officerLabel: {
    fontSize: 12,
    color: '#777',
  },
  officerValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
    color: '#333',
  },
  section: {
    marginTop: 12,
  },
  subLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
    color: '#333',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#ccc',
    marginRight: 8,
    marginBottom: 8,
  },
  chipActive: {
    backgroundColor: '#B71C1C',
    borderColor: '#B71C1C',
  },
  chipText: {
    fontSize: 12,
    color: '#333',
  },
  chipTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  coordinates: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#f9f9f9',
    borderRadius: 5,
  },
  noLocation: {
    color: '#666',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 10,
  },
  error: {
    color: '#D32F2F',
    marginTop: 10,
    textAlign: 'center',
  },
  footer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    paddingTop: 4,
    backgroundColor: '#f5f5f5',
  },
  button: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 5,
    marginVertical: 10,
  },
  startButton: {
    backgroundColor: '#4CAF50',
  },
  stopButton: {
    backgroundColor: '#F44336',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 10,
  },
  buttonIcon: {
    marginRight: 5,
  },
});

export default TrackingScreen;