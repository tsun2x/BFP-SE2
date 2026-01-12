// src/screens/Emergency/MapScreen.tsx
import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  StatusBar, 
  Linking,
  ActivityIndicator,
  RefreshControl,
  ScrollView
} from 'react-native';
import MapView, { Marker, UrlTile } from 'react-native-maps';
import { goBack } from '../../utils/navigation';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { API_URL } from '../../config';

// MapTiler Configuration
const MAPTILER_API_KEY = 'qPx9g6hwaJAB3La6VCyl';

export const MapScreen = () => {
  const [firetrucks, setFiretrucks] = useState([]);
  const [fireStations, setFireStations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [region, setRegion] = useState({
    latitude: 6.9214, // Zamboanga City coordinates
    longitude: 122.0790,
    latitudeDelta: 0.1,
    longitudeDelta: 0.1,
  });

  const handleBack = () => {
    goBack();
  };

  // Fetch firetruck locations
  const fetchFiretruckLocations = async () => {
    try {
      // For now, fetch all active, recently online trucks (backend already filters by is_active and last_online)
      const url = `${API_URL}/api/get_firetruck_locations.php?limit=50`;
      console.log('Fetching trucks from', url);
      const response = await fetch(url);
      const json = await response.json();

      // PHP returns { success: boolean, data: [...] }
      const list = Array.isArray(json?.data) ? json.data : Array.isArray(json) ? json : [];

      setFiretrucks(list);
      setError(null);

      if (list.length > 0) {
        const firstTruck = list[0];
        const lat = Number(firstTruck.latitude);
        const lng = Number(firstTruck.longitude);

        if (!isNaN(lat) && !isNaN(lng)) {
          setRegion(prev => ({
            ...prev,
            latitude: lat,
            longitude: lng,
          }));
        }

        // Record the last time we heard from any truck (use last_online from API)
        if (firstTruck.last_online) {
          setLastUpdated(firstTruck.last_online);
        }
      }
    } catch (err) {
      console.error('Error fetching firetruck locations:', err);
      setError('Failed to load firetruck locations.');
    } finally {
      setLoading(false);
    }
  };

  const fetchFireStations = async () => {
    try {
      const url = `${API_URL}/api/get_fire_stations.php`;
      console.log('Fetching stations from', url);
      const response = await fetch(url);
      const json = await response.json();

      const list = Array.isArray(json?.data) ? json.data : Array.isArray(json) ? json : [];

      setFireStations(list);
    } catch (err) {
      console.error('Error fetching fire stations:', err);
    }
  };

  // Poll periodically to keep locations live
  useEffect(() => {
    fetchFiretruckLocations(); // initial
    fetchFireStations();

    const intervalId = setInterval(() => {
      fetchFiretruckLocations();
      fetchFireStations();
    }, 5000); // every 5 seconds

    // Clean up interval on unmount
    return () => clearInterval(intervalId);
  }, []);

  // Handle pull-to-refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        fetchFiretruckLocations(),
        fetchFireStations(),
      ]);
    } finally {
      setRefreshing(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#8B0000" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#8B0000" />
      <SafeAreaView edges={['top']} style={styles.headerContainer}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Firetruck Tracker</Text>
          <View style={styles.headerRight} />
        </View>
      </SafeAreaView>

      <ScrollView
        style={styles.container}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={['#8B0000']}
            tintColor="#8B0000"
          />
        }
      >
        <View style={styles.externalMapContainer}>
          <Text style={styles.externalMapText}>
            Tap the button below to view the live firetruck and fire station map in your browser.
          </Text>
          <TouchableOpacity
            style={styles.externalMapButton}
            onPress={() => Linking.openURL(`${API_URL}/map_enduser.html`)}
          >
            <Ionicons name="map" size={20} color="#fff" style={{ marginRight: 8 }} />
            <Text style={styles.externalMapButtonText}>Open Live Map</Text>
          </TouchableOpacity>
        </View>

        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <Ionicons name="flame" size={20} color="#8B0000" />
            <Text style={styles.legendText}>Firetruck</Text>
          </View>
          <View style={styles.legendItem}>
            <Ionicons name="home" size={20} color="#D32F2F" />
            <Text style={styles.legendText}>Fire Station</Text>
          </View>
          {lastUpdated && (
            <Text style={styles.lastUpdated}>
              {firetrucks.length > 0
                ? `Active: last updated ${lastUpdated}`
                : `Inactive: last updated ${lastUpdated}`}
            </Text>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  headerContainer: {
    backgroundColor: '#8B0000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    flex: 1,
    marginLeft: -24, // Offset for the back button
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerRight: {
    width: 40,
  },
  map: {
    width: '100%',
    height: 500,
    marginTop: -1, // (unused now but kept for possible future native map)
  },
  externalMapContainer: {
    padding: 16,
  },
  externalMapText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 12,
  },
  externalMapButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#8B0000',
  },
  externalMapButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  truckMarker: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  stationMarker: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  speedBadge: {
    position: 'absolute',
    bottom: -5,
    right: -5,
    backgroundColor: '#8B0000',
    borderRadius: 10,
    paddingHorizontal: 4,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  speedText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  errorContainer: {
    backgroundColor: 'rgba(255, 0, 0, 0.1)',
    padding: 12,
    margin: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#D32F2F',
  },
  errorText: {
    color: '#D32F2F',
    fontSize: 14,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#333',
  },
  lastUpdated: {
    fontSize: 12,
    color: '#666',
  },
  attributionContainer: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
  attributionText: {
    fontSize: 10,
    color: '#333',
    textDecorationLine: 'underline',
  },
});

export default MapScreen;