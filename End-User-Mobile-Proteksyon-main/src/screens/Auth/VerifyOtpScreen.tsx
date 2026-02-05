import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { API_URL } from '../../config';

export const VerifyOtpScreen = ({ route, navigation }) => {
  const { userId, phone } = route.params || {};
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleVerify = async () => {
    if (!code.trim()) {
      setError('Please enter the code sent to your phone.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      const response = await fetch(`${API_URL}/api/verify_phone_otp.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userId,
          code: code.trim(),
        }),
      });

      const json = await response.json();

      if (!response.ok || !json.success) {
        setError(json.error || 'Invalid or expired code. Please try again.');
        return;
      }

      // OTP verified – proceed to main app
      navigation.replace('MainTabs');
    } catch (e) {
      console.error('Error verifying OTP:', e);
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <LinearGradient
        colors={['#7A001F', '#A30025', '#C9002F']}
        style={styles.gradient}
      >
        <SafeAreaView style={{ flex: 1 }} edges={['top', 'left', 'right']}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={{ flex: 1 }}
          >
            <View style={styles.container}>
              <Text style={styles.title}>Verify your phone</Text>
              <Text style={styles.subtitle}>
                We sent a 6-digit code to {phone || 'your phone number'}
              </Text>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Verification Code</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter code"
                  placeholderTextColor="#999"
                  keyboardType="number-pad"
                  value={code}
                  onChangeText={setCode}
                  maxLength={6}
                />
              </View>

              {error && <Text style={styles.error}>{error}</Text>}

              <TouchableOpacity
                style={{ marginTop: 20 }}
                onPress={handleVerify}
                disabled={loading}
              >
                <LinearGradient
                  colors={['#A30025', '#7A001F']}
                  style={styles.button}
                >
                  <Text style={styles.buttonText}>
                    {loading ? 'VERIFYING...' : 'VERIFY'}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    marginBottom: 24,
  },
  inputGroup: { marginBottom: 16 },
  label: {
    fontSize: 13,
    color: '#fff',
    fontWeight: '600',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#F3F3F3',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 50,
    fontSize: 16,
    color: '#333',
  },
  error: {
    color: '#FFCDD2',
    marginTop: 8,
    textAlign: 'center',
  },
  button: {
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '700',
  },
});

export default VerifyOtpScreen;
