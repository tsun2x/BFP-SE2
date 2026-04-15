import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { NODE_API_URL } from "../../config";

type Step = "contact" | "otp" | "newPassword";

export const ForgotPasswordScreen = ({ navigation }: any) => {
  const [step, setStep] = useState<Step>("contact");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const headers = {
    "Content-Type": "application/json",
    "ngrok-skip-browser-warning": "true",
  };

  // Step 1 — send OTP to the phone number
  const handleSendOtp = async () => {
    const trimmed = phone.trim();
    if (!trimmed) {
      setError("Please enter your phone number.");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      const res = await fetch(`${NODE_API_URL}/api/send-otp`, {
        method: "POST",
        headers,
        body: JSON.stringify({ phone: trimmed }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Failed to send OTP. Please try again.");
        return;
      }

      setStep("otp");
    } catch (e) {
      console.error("Send OTP error:", e);
      setError("Network error. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  // Step 2 — move to new-password step (OTP is verified on the server together with the reset)
  const handleVerifyOtp = () => {
    if (otp.trim().length !== 6) {
      setError("Please enter the 6-digit code.");
      return;
    }
    setError(null);
    setStep("newPassword");
  };

  // Step 3 — reset password (server verifies OTP + updates password in one call)
  const handleResetPassword = async () => {
    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      const res = await fetch(`${NODE_API_URL}/api/reset-password`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          phone: phone.trim(),
          otp: otp.trim(),
          newPassword,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Failed to reset password.");
        return;
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        "Password Reset",
        "Your password has been reset successfully. Please sign in with your new password.",
        [{ text: "OK", onPress: () => navigation.replace("Login") }],
      );
    } catch (e) {
      console.error("Reset password error:", e);
      setError("Network error. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  const renderStepContent = () => {
    switch (step) {
      case "contact":
        return (
          <>
            <Text style={styles.title}>Forgot Password</Text>
            <Text style={styles.subtitle}>
              Enter your registered phone number and we'll send you a
              verification code.
            </Text>

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

            {error && <Text style={styles.error}>{error}</Text>}

            <TouchableOpacity
              style={{ marginTop: 20 }}
              onPress={handleSendOtp}
              disabled={loading}
            >
              <LinearGradient
                colors={["#A30025", "#7A001F"]}
                style={styles.button}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>SEND CODE</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </>
        );

      case "otp":
        return (
          <>
            <Text style={styles.title}>Enter Code</Text>
            <Text style={styles.subtitle}>
              We sent a 6-digit code to {phone}
            </Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Verification Code</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="keypad-outline" size={20} color="#666" />
                <TextInput
                  style={styles.input}
                  placeholder="Enter 6-digit code"
                  placeholderTextColor="#999"
                  keyboardType="number-pad"
                  value={otp}
                  onChangeText={setOtp}
                  maxLength={6}
                />
              </View>
            </View>

            {error && <Text style={styles.error}>{error}</Text>}

            <TouchableOpacity
              style={{ marginTop: 20 }}
              onPress={handleVerifyOtp}
              disabled={loading}
            >
              <LinearGradient
                colors={["#A30025", "#7A001F"]}
                style={styles.button}
              >
                <Text style={styles.buttonText}>VERIFY CODE</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.resendRow}
              onPress={handleSendOtp}
              disabled={loading}
            >
              <Text style={styles.resendText}>Didn't get the code? </Text>
              <Text style={styles.resendLink}>Resend</Text>
            </TouchableOpacity>
          </>
        );

      case "newPassword":
        return (
          <>
            <Text style={styles.title}>New Password</Text>
            <Text style={styles.subtitle}>
              Create a new password for your account.
            </Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>New Password</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="lock-closed-outline" size={20} color="#666" />
                <TextInput
                  style={styles.input}
                  placeholder="At least 6 characters"
                  placeholderTextColor="#999"
                  secureTextEntry={!showPassword}
                  value={newPassword}
                  onChangeText={setNewPassword}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword((c) => !c)}
                  style={styles.passwordToggle}
                >
                  <Ionicons
                    name={showPassword ? "eye-off-outline" : "eye-outline"}
                    size={20}
                    color="#666"
                  />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Confirm Password</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="lock-closed-outline" size={20} color="#666" />
                <TextInput
                  style={styles.input}
                  placeholder="Re-enter your password"
                  placeholderTextColor="#999"
                  secureTextEntry={!showPassword}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                />
              </View>
            </View>

            {error && <Text style={styles.error}>{error}</Text>}

            <TouchableOpacity
              style={{ marginTop: 20 }}
              onPress={handleResetPassword}
              disabled={loading}
            >
              <LinearGradient
                colors={["#A30025", "#7A001F"]}
                style={styles.button}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>RESET PASSWORD</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </>
        );
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <LinearGradient
        colors={["#7A001F", "#A30025", "#C9002F"]}
        style={styles.gradient}
      >
        <SafeAreaView style={{ flex: 1 }} edges={["top", "left", "right"]}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={{ flex: 1 }}
          >
            {/* Back button */}
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => {
                if (step === "otp") setStep("contact");
                else if (step === "newPassword") setStep("otp");
                else navigation.goBack();
              }}
            >
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>

            <View style={styles.container}>{renderStepContent()}</View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  backBtn: {
    marginTop: 10,
    marginLeft: 15,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  container: {
    flex: 1,
    backgroundColor: "#fff",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    marginTop: 20,
    paddingHorizontal: 25,
    paddingTop: 35,
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    color: "#333",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: "#666",
    marginBottom: 25,
    lineHeight: 20,
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
  passwordToggle: {
    marginLeft: 10,
    paddingVertical: 4,
  },
  button: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
  error: {
    color: "#D32F2F",
    fontSize: 13,
    marginBottom: 5,
  },
  resendRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 20,
  },
  resendText: {
    fontSize: 13,
    color: "#666",
  },
  resendLink: {
    fontSize: 13,
    color: "#A30025",
    fontWeight: "700",
  },
});
