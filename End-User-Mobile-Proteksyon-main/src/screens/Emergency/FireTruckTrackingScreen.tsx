import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  StatusBar,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';

export const FireTruckTrackingScreen: React.FC = () => {
  const navigation = useNavigation<any>();

  const handleBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      // Fallback to MainTabs if we can't go back
      navigation.navigate('MainTabs');
    }
  };

  const handleRefresh = () => {
    Alert.alert('Refresh', 'Updating live tracking data...');
  };

  const handleViewMap = () => {
    // Use navigate instead of push to avoid stack issues
    navigation.navigate('MapScreen');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar barStyle="light-content" backgroundColor="#8B0000" />

      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Live Tracking</Text>

        <View style={styles.headerButtons}>
          <TouchableOpacity 
            style={styles.headerButton} 
            onPress={handleViewMap}
          >
            <Ionicons name="map" size={24} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.headerButton} 
            onPress={handleRefresh}
          >
            <Ionicons name="refresh" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* MAP PLACEHOLDER */}
        <View style={styles.mapPlaceholder}>
          <View style={styles.mapContent}>
            <Ionicons name="map" size={48} color="#ccc" />
            <Text style={styles.mapText}>Live Firetruck Tracking</Text>
            <Text style={styles.mapSubtext}>Monitor emergency vehicles in real-time</Text>

            <View style={styles.firetruckMarker}>
              <Ionicons name="car" size={16} color="#fff" />
            </View>

            <View style={[styles.firetruckMarker, styles.truck2]}>
              <Ionicons name="car" size={16} color="#fff" />
            </View>

            <View style={[styles.firetruckMarker, styles.ambulance]}>
              <Ionicons name="medkit" size={16} color="#fff" />
            </View>
          </View>
        </View>

        {/* STATUS BAR */}
        <View style={styles.statusBar}>
          <Text style={styles.statusText}>3 Active Vehicles</Text>
          <Text style={styles.updateText}>Updated just now</Text>
        </View>

        {/* VEHICLE LIST */}
        <View style={styles.vehicleList}>
          <Text style={styles.listTitle}>Available Trucks</Text>

          {/* CARD 1 */}
          <TouchableOpacity style={styles.vehicleCard}>
            <View style={styles.vehicleIcon}>
              <Ionicons name="car" size={24} color="#E53935" />
            </View>
            <View style={styles.vehicleInfo}>
              <Text style={styles.vehicleName}>Fire Truck #1</Text>
              <Text style={styles.vehicleStatus}>Responding to emergency</Text>
            </View>
            <View style={styles.vehicleDistance}>
              <Text style={styles.distanceText}>2.3 km</Text>
            </View>
          </TouchableOpacity>

          {/* CARD 2 */}
          <TouchableOpacity style={styles.vehicleCard}>
            <View style={styles.vehicleIcon}>
              <Ionicons name="car" size={24} color="#E53935" />
            </View>
            <View style={styles.vehicleInfo}>
              <Text style={styles.vehicleName}>Fire Truck #2</Text>
              <Text style={styles.vehicleStatus}>En route to scene</Text>
            </View>
            <View style={styles.vehicleDistance}>
              <Text style={styles.distanceText}>4.7 km</Text>
            </View>
          </TouchableOpacity>

          {/* CARD 3 */}
          <TouchableOpacity style={styles.vehicleCard}>
            <View style={styles.vehicleIcon}>
              <Ionicons name="medkit" size={24} color="#E53935" />
            </View>
            <View style={styles.vehicleInfo}>
              <Text style={styles.vehicleName}>Ambulance #1</Text>
              <Text style={styles.vehicleStatus}>Transporting patient</Text>
            </View>
            <View style={styles.vehicleDistance}>
              <Text style={styles.distanceText}>1.8 km</Text>
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#8B0000',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
  },

  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
  },

  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  headerButton: {
    marginLeft: 16,
  },

  mapPlaceholder: {
    height: 300,
    margin: 16,
    backgroundColor: '#fff',
    borderRadius: 12,

    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },

  mapContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },

  mapText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginTop: 8,
  },

  mapSubtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },

  firetruckMarker: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E53935',
    justifyContent: 'center',
    alignItems: 'center',
  },
  truck2: {
    top: '30%',
    left: '70%',
    backgroundColor: '#FF9800',
  },
  ambulance: {
    bottom: '20%',
    right: '25%',
    backgroundColor: '#2196F3',
  },

  statusBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 8,
    padding: 12,
    borderRadius: 8,

    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },

  statusText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#333',
  },

  updateText: {
    fontSize: 12,
    color: '#666',
  },

  vehicleList: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 30,
  },

  listTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 12,
  },

  vehicleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 10,

    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },

  vehicleIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#ffebee',
    justifyContent: 'center',
    alignItems: 'center',
  },

  vehicleInfo: {
    flex: 1,
    marginLeft: 12,
  },

  vehicleName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
  },

  vehicleStatus: {
    fontSize: 14,
    color: '#666',
  },

  vehicleDistance: {
    alignItems: 'flex-end',
  },

  distanceText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#E53935',
  },
});

