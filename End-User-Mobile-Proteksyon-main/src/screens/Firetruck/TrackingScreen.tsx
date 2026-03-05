import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import * as Location from 'expo-location';
import { useNavigation } from '@react-navigation/native';

// TrackingScreen is responsible for:
// - Requesting foreground location permission from the device
// - Subscribing to location updates (GPS)
// - Displaying the latest latitude / longitude on screen
// - Periodically sending the location to the backend API (stubbed for now)

export const TrackingScreen: React.FC = () => {
  const navigation = useNavigation();
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [locationSubscription, setLocationSubscription] =
    useState<Location.LocationSubscription | null>(null);

  const startTracking = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);

      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== 'granted') {
        setErrorMsg('Permission to access location was denied.');
        setLoading(false);
        return;
      }

      const subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          distanceInterval: 10,
          timeInterval: 5000,
        },
        (newLocation) => {
          setLocation(newLocation);
          // Here you would typically send the location to your backend
          console.log('New location:', newLocation);
        }
      );

      setLocationSubscription(subscription);
      setLoading(false);
    } catch (error) {
      console.error('Error getting location:', error);
      setErrorMsg('Error getting location. Please try again.');
      setLoading(false);
    }
  };

  const stopTracking = () => {
    if (locationSubscription) {
      locationSubscription.remove();
      setLocationSubscription(null);
      setLocation(null);
    }
  };

  const handleBack = () => {
    stopTracking();
    navigation.goBack();
  };

  useEffect(() => {
    startTracking();
    return () => {
      if (locationSubscription) {
        locationSubscription.remove();
      }
    };
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Firetruck Tracking</Text>
      </View>

      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator size="large" color="#0000ff" />
        ) : errorMsg ? (
          <Text style={styles.errorText}>{errorMsg}</Text>
        ) : location ? (
          <View style={styles.locationContainer}>
            <Text style={styles.locationText}>
              Latitude: {location.coords.latitude.toFixed(6)}
            </Text>
            <Text style={styles.locationText}>
              Longitude: {location.coords.longitude.toFixed(6)}
            </Text>
            <Text style={styles.accuracyText}>
              Accuracy: {location.coords.accuracy?.toFixed(2)} meters
            </Text>
          </View>
        ) : (
          <Text>Waiting for location...</Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#8B0000',
    padding: 16,
    paddingTop: 50,
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 16,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  locationContainer: {
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 20,
    borderRadius: 10,
    width: '100%',
  },
  locationText: {
    fontSize: 16,
    marginBottom: 8,
  },
  accuracyText: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
  },
  errorText: {
    color: 'red',
    textAlign: 'center',
    marginBottom: 16,
  },
});
