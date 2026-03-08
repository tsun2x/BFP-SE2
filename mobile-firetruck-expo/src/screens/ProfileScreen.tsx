import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useAuth } from '../context/AuthContext';

export const ProfileScreen: React.FC = () => {
  const { user } = useAuth();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Officer Profile</Text>

      {user ? (
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
        </View>
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
});

export default ProfileScreen;