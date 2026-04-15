import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Linking } from 'react-native';
import { useAuth } from '../context/AuthContext';

export const ProfileScreen: React.FC = () => {
  const { user, logout } = useAuth();

  const normalizePhoneNumber = (rawPhone: string): string => {
    const cleaned = rawPhone.replace(/[^\d+]/g, '');
    if (!cleaned) return '';

    if (cleaned.startsWith('+')) {
      return '+' + cleaned.slice(1).replace(/\+/g, '');
    }

    return cleaned;
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: () => logout() },
    ]);
  };

  const handleCallParentStation = async () => {
    if (!user?.assignedStationId) {
      Alert.alert('No assigned station', 'This firetruck account has no parent station assigned.');
      return;
    }

    const stationPhone = user.stationContactNumber || '';
    const normalized = normalizePhoneNumber(stationPhone);

    if (!normalized) {
      Alert.alert('No station contact', 'No contact number is set for your assigned parent station.');
      return;
    }

    const telUrl = 'tel:' + normalized;
    const canCall = await Linking.canOpenURL(telUrl);

    if (!canCall) {
      Alert.alert('Call unavailable', 'This device cannot place phone calls.');
      return;
    }

    await Linking.openURL(telUrl);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Officer Profile</Text>

      {user ? (
        <>
        <View style={styles.card}>
          <Text style={styles.name}>{user.name}</Text>

          <View style={styles.row}>
            <Text style={styles.label}>Badge ID:</Text>
            <Text style={styles.value}>{user.idNumber}</Text>
          </View>

          {user.rank ? (
            <View style={styles.row}>
              <Text style={styles.label}>Rank:</Text>
              <Text style={styles.value}>{user.rank}</Text>
            </View>
          ) : null}

          {user.role ? (
            <View style={styles.row}>
              <Text style={styles.label}>Role:</Text>
              <Text style={styles.value}>{user.role}</Text>
            </View>
          ) : null}

          {user.stationName ? (
            <View style={styles.row}>
              <Text style={styles.label}>Station:</Text>
              <Text style={styles.value}>{user.stationName}</Text>
            </View>
          ) : null}

          {user.stationType ? (
            <View style={styles.row}>
              <Text style={styles.label}>Station Type:</Text>
              <Text style={styles.value}>{user.stationType}</Text>
            </View>
          ) : null}

          {user.stationContactNumber ? (
            <View style={styles.row}>
              <Text style={styles.label}>Station Contact:</Text>
              <Text style={styles.value}>{user.stationContactNumber}</Text>
            </View>
          ) : null}
        </View>

        <TouchableOpacity
          style={[styles.callBtn, !user.stationContactNumber && styles.callBtnDisabled]}
          onPress={handleCallParentStation}
          disabled={!user.stationContactNumber}
        >
          <Text style={styles.callBtnText}>Call Parent Station</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
        </>
      ) : (
        <Text style={styles.subtitle}>
          Not signed in. Please log in as a BFP officer to see your profile.
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingTop: 40,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
    color: '#B71C1C',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#555555',
    textAlign: 'center',
    marginTop: 16,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  name: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
    color: '#333',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  label: {
    fontSize: 14,
    color: '#777',
    fontWeight: '600',
  },
  value: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  callBtn: {
    marginTop: 16,
    backgroundColor: '#1976D2',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  callBtnDisabled: {
    backgroundColor: '#90A4AE',
  },
  callBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  logoutBtn: {
    marginTop: 24,
    backgroundColor: '#B71C1C',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  logoutText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});

export default ProfileScreen;