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
          </View>
        </View>

        {/* STATUS BAR */}
        <View style={styles.statusBar}>
          <Text style={styles.statusText}>3 Active Vehicles</Text>
          <Text style={styles.updateText}>Updated just now</Text>
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

});

