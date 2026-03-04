// src/screens/TrackingScreen.tsx
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Alert } from 'react-native';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../utils/supabaseClient';

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
      console.log('Sending location to Supabase for truck_id =', truckId);

      // Push location to Supabase history table for real-time broadcasting
      const { error: supabaseError } = await supabase
        .from('firetruck_location_history')
        .insert({
          truck_id: truckId,
          alarm_id: null,
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          speed: location.coords.speed ?? null,
          heading: location.coords.heading ?? null,
          accuracy: location.coords.accuracy ?? null,
          recorded_at: new Date().toISOString(),
        });

      if (supabaseError) {
        console.error('Supabase firetruck_location_history insert error:', supabaseError);
      }
    } catch (error) {
      console.error('Error sending location to Supabase:', error);
    }
  };

  // Start tracking location
  const startTracking = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    try {
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
          timeInterval: 5000, // send update roughly every 5 seconds
          distanceInterval: 0, // always send based on time interval, even if not moving
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
    <View style={styles.container}>
      <Text style={styles.title}>Firetruck Tracking</Text>
      
      <View style={styles.infoContainer}>
        <Text style={styles.label}>Status: {isTracking ? 'Active' : 'Inactive'}</Text>
        
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
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 20,
    flex: 1,
    backgroundColor: '#f5f5f5',
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
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
    color: '#333',
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