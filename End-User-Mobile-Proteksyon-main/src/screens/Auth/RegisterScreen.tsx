import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { NODE_API_URL } from '../../config';

export const RegisterScreen = ({ navigation }) => {
  const [signUpMethod, setSignUpMethod] = useState<'phone' | 'email'>('phone');
  const [form, setForm] = useState({
    lastName: '',
    firstName: '',
    phone: '',
    gmail: '',
    address: '',
    password: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (key: string, val: string) => {
    setForm({ ...form, [key]: val });
  };

  const handleSignUp = async () => {
    if (!form.lastName || !form.firstName || !form.password || !form.confirmPassword) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      alert('Please fill in all required fields.');
      return;
    }
    if (signUpMethod === 'phone' && !form.phone.trim()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      alert('Please enter your phone number.');
      return;
    }
    if (signUpMethod === 'email' && !form.gmail.trim()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      alert('Please enter your email address.');
      return;
    }
    if (form.password !== form.confirmPassword) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      alert('Passwords do not match.');
      return;
    }

    // Basic phone validation (only required when signing up with phone)
    const phone = form.phone.trim();
    if (phone && !phone.startsWith('09') && !phone.startsWith('+63') && !phone.startsWith('63')) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      alert('Phone number must start with 09 or +63.');
      return;
    }

    try {
      setLoading(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      const res = await fetch(`${NODE_API_URL}/api/end-user-signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true',
        },
        body: JSON.stringify({
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          phone,
          password: form.password,
          email: form.gmail.trim() || undefined,
          address: form.address.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        alert(data.message || 'Registration failed.');
        return;
      }

      // Account created in DB — now send OTP for verification via backend
      let normPhone = phone;
      if (normPhone && normPhone.startsWith('09')) normPhone = '+63' + normPhone.slice(1);
      else if (normPhone && normPhone.startsWith('63')) normPhone = '+' + normPhone;

      const otpBody: any = {};
      if (signUpMethod === 'phone' && normPhone) {
        otpBody.phone = normPhone;
      } else if (signUpMethod === 'email' && form.gmail.trim()) {
        otpBody.email = form.gmail.trim().toLowerCase();
      }

      if (otpBody.phone || otpBody.email) {
        const otpRes = await fetch(`${NODE_API_URL}/api/send-otp`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' },
          body: JSON.stringify(otpBody),
        });
        const otpData = await otpRes.json();

        if (!otpRes.ok) {
          console.warn('OTP send error:', otpData.message);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          alert('Account created! Could not send OTP: ' + (otpData.message || 'Unknown error') + '. You can still login.');
          navigation.navigate('Login');
          return;
        }

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        navigation.navigate('VerifyOtp', {
          phone: otpBody.phone || undefined,
          email: otpBody.email || undefined,
        });
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        alert('Account created! Please login.');
        navigation.navigate('Login');
      }
    } catch (e: any) {
      console.error('Signup error:', e);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      alert('Network or server error. Please try again.');
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
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
              <View style={{ flex: 1 }}>
                
                {/* TOP SECTION */}
                <View style={styles.topSection}>
                  <Text style={styles.topTitle}>Create your account</Text>
                  <Text style={styles.topSubtitle}>
                    Get started with the Proteksyon App
                  </Text>

                  {/* Floating circles */}
                  <View style={styles.circle1} />
                  <View style={styles.circle2} />
                  <View style={styles.circle3} />

                  {/* Phone / Email toggle */}
                  <View style={styles.toggleRow}>
                    <TouchableOpacity
                      style={[
                        styles.toggleBtn,
                        signUpMethod === 'phone' && styles.toggleBtnActive,
                      ]}
                      onPress={() => setSignUpMethod('phone')}
                    >
                      <Ionicons
                        name="call-outline"
                        size={16}
                        color={signUpMethod === 'phone' ? '#fff' : 'rgba(255,255,255,0.6)'}
                        style={{ marginRight: 6 }}
                      />
                      <Text
                        style={[
                          styles.toggleText,
                          signUpMethod === 'phone' && styles.toggleTextActive,
                        ]}
                      >
                        Phone
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.toggleBtn,
                        signUpMethod === 'email' && styles.toggleBtnActive,
                      ]}
                      onPress={() => setSignUpMethod('email')}
                    >
                      <Ionicons
                        name="mail-outline"
                        size={16}
                        color={signUpMethod === 'email' ? '#fff' : 'rgba(255,255,255,0.6)'}
                        style={{ marginRight: 6 }}
                      />
                      <Text
                        style={[
                          styles.toggleText,
                          signUpMethod === 'email' && styles.toggleTextActive,
                        ]}
                      >
                        Email
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* WHITE CARD */}
                <View style={styles.card}>
                  <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.scrollContent}
                  >

                    {/* Last Name */}
                    <View style={styles.inputGroup}>
                      <Text style={styles.label}>Last Name</Text>
                      <View style={styles.inputContainer}>
                        <Ionicons name="person-outline" size={20} color="#666" />
                        <TextInput
                          style={styles.input}
                          placeholder="Dela Cruz"
                          placeholderTextColor="#999"
                          value={form.lastName}
                          onChangeText={(t) => handleChange('lastName', t)}
                        />
                      </View>
                    </View>

                    <View style={styles.inputGroup}>
                      <Text style={styles.label}>First Name</Text>
                      <View style={styles.inputContainer}>
                        <Ionicons name="person-outline" size={20} color="#666" />
                        <TextInput
                          style={styles.input}
                          placeholder="Juan"
                          placeholderTextColor="#999"
                          value={form.firstName}
                          onChangeText={(t) => handleChange('firstName', t)}
                        />
                      </View>
                    </View>

                    {/* Phone Number — always shown when method is phone, optional when email */}
                    {signUpMethod === 'phone' ? (
                      <View style={styles.inputGroup}>
                        <Text style={styles.label}>Phone Number</Text>
                        <View style={styles.inputContainer}>
                          <Ionicons name="call-outline" size={20} color="#666" />
                          <TextInput
                            style={styles.input}
                            placeholder="09123456789"
                            placeholderTextColor="#999"
                            keyboardType="phone-pad"
                            value={form.phone}
                            onChangeText={(t) => handleChange('phone', t)}
                          />
                        </View>
                      </View>
                    ) : (
                      <View style={styles.inputGroup}>
                        <Text style={styles.label}>Email</Text>
                        <View style={styles.inputContainer}>
                          <Ionicons name="mail-outline" size={20} color="#666" />
                          <TextInput
                            style={styles.input}
                            placeholder="email@gmail.com"
                            placeholderTextColor="#999"
                            keyboardType="email-address"
                            autoCapitalize="none"
                            value={form.gmail}
                            onChangeText={(t) => handleChange('gmail', t)}
                          />
                        </View>
                      </View>
                    )}

                    {/* Secondary field (optional) */}
                    {signUpMethod === 'phone' ? (
                      <View style={styles.inputGroup}>
                        <Text style={styles.label}>Email (optional)</Text>
                        <View style={styles.inputContainer}>
                          <Ionicons name="mail-outline" size={20} color="#666" />
                          <TextInput
                            style={styles.input}
                            placeholder="email@gmail.com"
                            placeholderTextColor="#999"
                            keyboardType="email-address"
                            autoCapitalize="none"
                            value={form.gmail}
                            onChangeText={(t) => handleChange('gmail', t)}
                          />
                        </View>
                      </View>
                    ) : (
                      <View style={styles.inputGroup}>
                        <Text style={styles.label}>Phone Number (optional)</Text>
                        <View style={styles.inputContainer}>
                          <Ionicons name="call-outline" size={20} color="#666" />
                          <TextInput
                            style={styles.input}
                            placeholder="09123456789"
                            placeholderTextColor="#999"
                            keyboardType="phone-pad"
                            value={form.phone}
                            onChangeText={(t) => handleChange('phone', t)}
                          />
                        </View>
                      </View>
                    )}

                    {/* Address */}
                    <View style={styles.inputGroup}>
                      <Text style={styles.label}>Address/Location</Text>
                      <View style={styles.inputContainer}>
                        <Ionicons name="location-outline" size={20} color="#666" />
                        <TextInput
                          style={styles.input}
                          placeholder="Enter your address"
                          placeholderTextColor="#999"
                          value={form.address}
                          onChangeText={(t) => handleChange('address', t)}
                        />
                      </View>
                    </View>

                    {/* Password */}
                    <View style={styles.inputGroup}>
                      <Text style={styles.label}>Password</Text>
                      <View style={styles.inputContainer}>
                        <Ionicons name="lock-closed-outline" size={20} color="#666" />
                        <TextInput
                          style={styles.input}
                          placeholder="Enter password"
                          placeholderTextColor="#999"
                          secureTextEntry
                          value={form.password}
                          onChangeText={(t) => handleChange('password', t)}
                        />
                      </View>
                    </View>

                    {/* Confirm Password */}
                    <View style={styles.inputGroup}>
                      <Text style={styles.label}>Confirm Password</Text>
                      <View style={styles.inputContainer}>
                        <Ionicons name="lock-closed-outline" size={20} color="#666" />
                        <TextInput
                          style={styles.input}
                          placeholder="Confirm password"
                          placeholderTextColor="#999"
                          secureTextEntry
                          value={form.confirmPassword}
                          onChangeText={(t) => handleChange('confirmPassword', t)}
                        />
                      </View>
                    </View>

                    {/* SIGN UP BUTTON */}
                    <TouchableOpacity style={{ marginTop: 10 }} onPress={handleSignUp} disabled={loading}>
                      <LinearGradient
                        colors={['#A30025', '#7A001F']}
                        style={styles.signUpGradient}
                      >
                        {loading ? (
                          <ActivityIndicator color="#fff" />
                        ) : (
                          <Text style={styles.signUpText}>SIGN UP</Text>
                        )}
                      </LinearGradient>
                    </TouchableOpacity>

                    {/* Already have account */}
                    <View style={styles.bottomRow}>
                      <Text style={styles.bottomText}>Already have an account? </Text>
                      <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                        <Text style={styles.bottomLink}>Sign in</Text>
                      </TouchableOpacity>
                    </View>

                  </ScrollView>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </LinearGradient>
    </View>
  );
};

// ------------------------------------------------------------
// STYLES
// ------------------------------------------------------------
const styles = StyleSheet.create({
  gradient: { flex: 1 },

  topSection: {
    justifyContent: 'flex-end',
    paddingLeft: 30,
    paddingBottom: 15,
    paddingTop: 20,
  },
  toggleRow: {
    flexDirection: 'row',
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 25,
    padding: 4,
    marginTop: 14,
    marginBottom: 8,
  },
  toggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 22,
    borderRadius: 22,
  },
  toggleBtnActive: {
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  toggleText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    fontWeight: '600',
  },
  toggleTextActive: {
    color: '#fff',
  },
  topTitle: {
    color: 'white',
    fontSize: 26,
    fontWeight: '700',
  },
  topSubtitle: {
    color: 'white',
    fontSize: 14,
    fontWeight: '400',
    marginTop: 4,
  },

  // Floating circles
  circle1: {
    position: 'absolute',
    width: 85,
    height: 85,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 100,
    top: 10,
    right: 50,
  },
  circle2: {
    position: 'absolute',
    width: 55,
    height: 55,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 100,
    top: 90,
    right: 15,
  },
  circle3: {
    position: 'absolute',
    width: 40,
    height: 40,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 100,
    top: 70,
    left: 10,
  },

  // White container
  card: {
    flex: 1,
    backgroundColor: 'white',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: 25,
    paddingTop: 25,
    paddingBottom: 40, // avoids bottom nav overlap
  },

  scrollContent: {
    paddingBottom: 60, // ensures last input stays above nav bar
  },

  // Inputs
  inputGroup: { marginBottom: 16 },
  label: {
    fontSize: 13,
    color: '#333',
    fontWeight: '600',
    marginBottom: 5,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F3F3',
    borderRadius: 12,
    paddingHorizontal: 15,
    height: 50,
  },
  input: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
    color: '#333',
  },

  // Button
  signUpGradient: {
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  signUpText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '700',
  },

  // Bottom text
  bottomRow: {
    marginTop: 25,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  bottomText: {
    fontSize: 12,
    color: '#666',
  },
  bottomLink: {
    fontSize: 12,
    color: '#A30025',
    fontWeight: '700',
  },
});
