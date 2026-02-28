// src/screens/LoginScreen.tsx

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../context/AuthContext';

const LoginScreen: React.FC = () => {
  const { login, isLoading } = useAuth();

  const [idNumber, setIdNumber] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    setError(null);

    if (!idNumber.trim()) {
      setError('Please enter your Badge ID.');
      return;
    }

    // 🔥 Demo Mode (no real authentication restriction)
    await login(idNumber.trim(), password || 'demo');
  };

  return (
    <LinearGradient
      colors={['#1C1C1E', '#4A0E0E', '#B71C1C']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      {/* Header */}
      <View style={styles.header}>
        <Ionicons name="flame" size={52} color="#ffffff" />
        <Text style={styles.title}>BFP Firetruck</Text>
        <Text style={styles.subtitle}>Emergency Response System</Text>
      </View>

      {/* Login Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Sign In</Text>

        {/* Badge ID Input */}
        <View style={styles.inputContainer}>
          <Ionicons name="card-outline" size={18} color="#B71C1C" />
          <TextInput
            style={styles.input}
            placeholder="Badge ID (e.g. BFP-123)"
            placeholderTextColor="#999"
            autoCapitalize="characters"
            value={idNumber}
            onChangeText={setIdNumber}
          />
        </View>

        {/* Password Input */}
        <View style={styles.inputContainer}>
          <Ionicons name="lock-closed-outline" size={18} color="#B71C1C" />
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor="#999"
            secureTextEntry={!showPassword}
            value={password}
            onChangeText={setPassword}
          />
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
            <Ionicons
              name={showPassword ? 'eye-off-outline' : 'eye-outline'}
              size={18}
              color="#666"
            />
          </TouchableOpacity>
        </View>

        {error && <Text style={styles.error}>{error}</Text>}

        {/* Login Button */}
        <TouchableOpacity
          style={[styles.button, isLoading && styles.buttonDisabled]}
          onPress={handleLogin}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.buttonText}>LOGIN</Text>
          )}
        </TouchableOpacity>

        <Text style={styles.demoNote}>
          Demo Mode: Any Badge ID and Password accepted
        </Text>
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },

  header: {
    alignItems: 'center',
    marginBottom: 35,
  },

  title: {
    color: '#ffffff',
    fontSize: 26,
    fontWeight: 'bold',
    marginTop: 10,
  },

  subtitle: {
    color: '#dddddd',
    fontSize: 13,
    marginTop: 4,
  },

  card: {
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderRadius: 20,
    padding: 24,
    elevation: 10,
  },

  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 22,
    textAlign: 'center',
    color: '#B71C1C',
  },

  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e5e5',
    borderRadius: 14,
    paddingHorizontal: 14,
    marginBottom: 18,
    backgroundColor: '#f9f9f9',
  },

  input: {
    flex: 1,
    paddingVertical: 14,
    marginLeft: 10,
    fontSize: 14,
    color: '#333',
  },

  button: {
    backgroundColor: '#B71C1C',
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 10,
  },

  buttonDisabled: {
    opacity: 0.7,
  },

  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },

  error: {
    color: '#D32F2F',
    textAlign: 'center',
    marginBottom: 10,
  },

  demoNote: {
    marginTop: 14,
    fontSize: 11,
    textAlign: 'center',
    color: '#777',
  },
});

export default LoginScreen;