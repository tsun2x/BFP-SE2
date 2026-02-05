import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { API_URL } from '../../config';
import { LocationPermissionModal } from '../../components/LocationPermissionModal';

export const LoginScreen = ({ navigation }) => {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');

  const handleSignIn = async () => {
    if (!phone || !password) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      alert('Please enter your phone number and password.');
      return;
    }

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      const response = await fetch(`${API_URL}/api/login.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          idNumber: phone,
          password,
        }),
      });

      const rawText = await response.text();
      let json: any;
      try {
        json = JSON.parse(rawText);
      } catch (e) {
        console.error('Failed to parse login response JSON:', e, rawText);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        alert('Server response is not valid JSON. Please check PHP logs.');
        return;
      }

      if (!response.ok) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        alert(json.message || 'Login failed.');
        return;
      }

      // Optional: store token/user in memory or AsyncStorage later
      console.log('End-user login success:', json);

      navigation.replace('MainTabs');
    } catch (error) {
      console.error('Login error:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      alert('Network or server error while logging in.');
    }
  };

  return (
    <View style={{ flex: 1 }}>
      {/* Background Gradient */}
      <LinearGradient
        colors={['#7A001F', '#A30025', '#C9002F']}
        style={styles.gradient}
      >
        <SafeAreaView style={{ flex: 1 }} edges={['top', 'left', 'right']}>
          
          {/* TOP SECTION (Title + Circles) */}
          <View style={styles.topSection}>
            <Text style={styles.topTitle}>Welcome back!</Text>
            <Text style={styles.topSubtitle}>Let’s get you signed in</Text>

            {/* Floating Circles */}
            <View style={styles.circle1} />
            <View style={styles.circle2} />
            <View style={styles.circle3} />
          </View>

          {/* BOTTOM WHITE CARD */}
          <View style={styles.card}>
            
            {/* Phone Number (login via phone_number column) */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Phone Number</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="call-outline" size={20} color="#666" />
                <TextInput
                  style={styles.input}
                  placeholder="09123456789"
                  placeholderTextColor="#999"
                  keyboardType="phone-pad"
                  value={phone}
                  onChangeText={setPhone}
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
                  placeholder="Enter your password"
                  placeholderTextColor="#999"
                  secureTextEntry
                  value={password}
                  onChangeText={setPassword}
                />
              </View>
            </View>

            <TouchableOpacity style={styles.forgotPasswordBtn}>
              <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
            </TouchableOpacity>

            {/* SIGN IN BUTTON */}
            <TouchableOpacity style={styles.signInBtn} onPress={handleSignIn}>
              <LinearGradient
                colors={['#A30025', '#7A001F']}
                style={styles.signInGradient}
              >
                <Text style={styles.signInText}>SIGN IN</Text>
              </LinearGradient>
            </TouchableOpacity>

            {/* SIGN UP */}
            <View style={styles.signupRow}>
              <Text style={styles.signupText}>Don't have account? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Register')}>
                <Text style={styles.signupLink}>Sign up</Text>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },

  /* TOP DESIGN */
  topSection: {
    height: "40%",
    justifyContent: "center",
    paddingLeft: 35,
  },
  topTitle: {
    color: "white",
    fontSize: 34,
    fontWeight: "700",
  },
  topSubtitle: {
    color: "white",
    fontSize: 18,
    marginTop: 5,
  },

  /* Floating Circles */
  circle1: {
    position: "absolute",
    width: 90,
    height: 90,
    borderRadius: 100,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    top: 30,
    right: 50,
  },
  circle2: {
    position: "absolute",
    width: 60,
    height: 60,
    borderRadius: 100,
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    top: 120,
    right: 20,
  },
  circle3: {
    position: "absolute",
    width: 40,
    height: 40,
    borderRadius: 100,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    top: 80,
    left: 20,
  },

  /* White Card */
  card: {
    backgroundColor: "white",
    flex: 1,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: 25,
    paddingTop: 35,
  },

  inputGroup: {
    marginBottom: 15,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 5,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F3F3",
    borderRadius: 12,
    paddingHorizontal: 15,
    height: 50,
  },
  input: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
    color: "#333",
  },

  forgotPasswordBtn: {
    alignSelf: "flex-end",
    marginBottom: 18,
  },
  forgotPasswordText: {
    fontSize: 12,
    color: "#A30025",
    fontWeight: "600",
  },

  signInBtn: {
    marginTop: 5,
  },
  signInGradient: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  signInText: {
    color: "white",
    fontSize: 15,
    fontWeight: "700",
  },

  signupRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 25,
  },
  signupText: {
    fontSize: 12,
    color: "#666",
  },
  signupLink: {
    fontSize: 12,
    color: "#A30025",
    fontWeight: "700",
  },
});

