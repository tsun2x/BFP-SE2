import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useAuth } from '../context/AuthContext';

type Props = {
  onGoToLogin: () => void;
};

const RegisterScreen: React.FC<Props> = ({ onGoToLogin }) => {
  const { register, isLoading } = useAuth();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [idNumber, setIdNumber] = useState('');
  const [rank, setRank] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleRegister = async () => {
    setError(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    try {
      await register({ firstName, lastName, idNumber: idNumber.trim(), rank, password });
      onGoToLogin();
    } catch (e: any) {
      setError(e?.message || 'Registration failed.');
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.container}>
          <Text style={styles.title}>BFP Firetruck</Text>
          <Text style={styles.subtitle}>Create a new driver account</Text>

          <View style={styles.form}>
            <Text style={styles.label}>First Name</Text>
            <TextInput style={styles.input} placeholder="Juan" value={firstName} onChangeText={setFirstName} />

            <Text style={styles.label}>Last Name</Text>
            <TextInput style={styles.input} placeholder="Dela Cruz" value={lastName} onChangeText={setLastName} />

            <Text style={styles.label}>BFP Badge ID</Text>
            <TextInput style={styles.input} placeholder="e.g. BFP-00010" autoCapitalize="characters" value={idNumber} onChangeText={setIdNumber} />

            <Text style={styles.label}>Rank</Text>
            <TextInput style={styles.input} placeholder="e.g. FO1, SFO1, FINSP" value={rank} onChangeText={setRank} />

            <Text style={styles.label}>Password</Text>
            <TextInput style={styles.input} placeholder="Min 6 characters" secureTextEntry value={password} onChangeText={setPassword} />

            <Text style={styles.label}>Confirm Password</Text>
            <TextInput style={styles.input} placeholder="Re-enter password" secureTextEntry value={confirmPassword} onChangeText={setConfirmPassword} />

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <TouchableOpacity
              style={[styles.button, isLoading && styles.buttonDisabled]}
              onPress={handleRegister}
              disabled={isLoading}
            >
              {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Create Account</Text>}
            </TouchableOpacity>

            <TouchableOpacity onPress={onGoToLogin} style={styles.linkButton}>
              <Text style={styles.linkText}>Already have an account? <Text style={styles.linkBold}>Sign In</Text></Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  scrollContent: { flexGrow: 1 },
  container: { flex: 1, backgroundColor: '#ffffff', paddingHorizontal: 24, paddingTop: 60, paddingBottom: 40 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#B71C1C', marginBottom: 4, textAlign: 'center' },
  subtitle: { fontSize: 14, color: '#555', textAlign: 'center', marginBottom: 24 },
  form: { marginTop: 8 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 6, color: '#333' },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 6, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 14, fontSize: 14 },
  button: { backgroundColor: '#B71C1C', paddingVertical: 12, borderRadius: 6, alignItems: 'center', marginTop: 8 },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  error: { color: '#D32F2F', marginBottom: 8 },
  linkButton: { marginTop: 16, alignItems: 'center' },
  linkText: { color: '#555', fontSize: 14 },
  linkBold: { color: '#B71C1C', fontWeight: '700' },
});

export default RegisterScreen;
