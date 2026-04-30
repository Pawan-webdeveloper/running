import { api, setAuthToken } from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export default function LoginScreen() {
  const router = useRouter();
  const { setAuth } = useAuthStore();

  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [authMethod, setAuthMethod] = useState<"phone" | "google">("phone");

  const handleSendOtp = async () => {
    if (phone.length !== 10) {
      Alert.alert("Error", "Please enter a valid 10-digit phone number");
      return;
    }

    setLoading(true);
    const fullPhone = `+91${phone}`;
    const result = await api.auth.sendOtp(fullPhone);

    if (result.error) {
      Alert.alert("Error", result.error);
    } else {
      setOtpSent(true);
    }
    setLoading(false);
  };

  const handleVerifyOtp = async () => {
    if (otp.length !== 6) {
      Alert.alert("Error", "Please enter the 6-digit OTP");
      return;
    }

    setLoading(true);
    const fullPhone = `+91${phone}`;
    const result = await api.auth.verifyOtp(fullPhone, otp);

    if (result.error) {
      Alert.alert("Error", result.error);
      setLoading(false);
      return;
    }

    if (result.data?.token) {
      await setAuthToken(result.data.token);
      await setAuth(result.data.token, result.data.profile);
      router.replace(
        result.data.is_new_user ? "/(auth)/onboarding" : "/(tabs)",
      );
    }
    setLoading(false);
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      const result = await api.auth.signInWithGoogle();
      if (result.error) {
        Alert.alert("Error", result.error);
        setLoading(false);
        return;
      }

      if (result.data?.token) {
        await setAuthToken(result.data.token);
        await setAuth(result.data.token, result.data.profile);
        router.replace(
          result.data.is_new_user ? "/(auth)/onboarding" : "/(tabs)",
        );
      } else {
        Alert.alert("Error", "Google sign in failed");
      }
    } catch (error: any) {
      Alert.alert("Error", error.message || "Google sign in failed");
    }
    setLoading(false);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.logoContainer}>
          <Text style={styles.logo}>🏃‍♂️</Text>
          <Text style={styles.title}>Runzilla</Text>
          <Text style={styles.subtitle}>Run. Earn. Win.</Text>
        </View>

        <View style={styles.authTabs}>
          <TouchableOpacity
            style={[
              styles.authTab,
              authMethod === "phone" && styles.authTabActive,
            ]}
            onPress={() => {
              setAuthMethod("phone");
              setOtpSent(false);
            }}
          >
            <Text
              style={[
                styles.authTabText,
                authMethod === "phone" && styles.authTabTextActive,
              ]}
            >
              Phone
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.authTab,
              authMethod === "google" && styles.authTabActive,
            ]}
            onPress={() => setAuthMethod("google")}
          >
            <Text
              style={[
                styles.authTabText,
                authMethod === "google" && styles.authTabTextActive,
              ]}
            >
              Google
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.form}>
          {authMethod === "phone" ? (
            <>
              {!otpSent ? (
                <>
                  <Text style={styles.label}>Phone Number</Text>
                  <View style={styles.phoneInput}>
                    <Text style={styles.countryCode}>+91</Text>
                    <TextInput
                      style={styles.input}
                      value={phone}
                      onChangeText={setPhone}
                      placeholder="Enter your number"
                      keyboardType="phone-pad"
                      maxLength={10}
                    />
                  </View>

                  <TouchableOpacity
                    style={[styles.button, loading && styles.buttonDisabled]}
                    onPress={handleSendOtp}
                    disabled={loading}
                  >
                    <Text style={styles.buttonText}>
                      {loading ? "Sending..." : "Send OTP"}
                    </Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <Text style={styles.label}>Enter OTP</Text>
                  <Text style={styles.otpHint}>Sent to +91 {phone}</Text>
                  <TextInput
                    style={styles.otpInput}
                    value={otp}
                    onChangeText={setOtp}
                    placeholder="000000"
                    keyboardType="number-pad"
                    maxLength={6}
                    textAlign="center"
                  />

                  <TouchableOpacity
                    style={[styles.button, loading && styles.buttonDisabled]}
                    onPress={handleVerifyOtp}
                    disabled={loading}
                  >
                    <Text style={styles.buttonText}>
                      {loading ? "Verifying..." : "Verify OTP"}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.resendButton}
                    onPress={handleSendOtp}
                  >
                    <Text style={styles.resendText}>Resend OTP</Text>
                  </TouchableOpacity>
                </>
              )}
            </>
          ) : (
            <>
              <TouchableOpacity
                style={[styles.googleButton, loading && styles.buttonDisabled]}
                onPress={handleGoogleLogin}
                disabled={loading}
              >
                <Text style={styles.googleIcon}>G</Text>
                <Text style={styles.googleButtonText}>Continue with Google</Text>
              </TouchableOpacity>
            </>
          )}

          <View style={styles.switchContainer}>
            <Text style={styles.switchText}>Don&apos;t have an account? </Text>
            <TouchableOpacity onPress={() => router.push("/(auth)/signup")}>
              <Text style={styles.switchLink}>Sign Up</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  content: { flexGrow: 1, justifyContent: "center", padding: 24 },
  logoContainer: { alignItems: "center", marginBottom: 32 },
  logo: { fontSize: 64, marginBottom: 16 },
  title: { fontSize: 32, fontWeight: "bold", color: "#FF6B35" },
  subtitle: { fontSize: 16, color: "#666", marginTop: 4 },
  authTabs: {
    flexDirection: "row",
    marginBottom: 24,
    backgroundColor: "#f5f5f5",
    borderRadius: 12,
    padding: 4,
  },
  authTab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderRadius: 8,
  },
  authTabActive: { backgroundColor: "#FF6B35" },
  authTabText: { fontSize: 16, fontWeight: "600", color: "#666" },
  authTabTextActive: { color: "#fff" },
  form: { width: "100%" },
  label: { fontSize: 16, fontWeight: "600", marginBottom: 8, color: "#333" },
  input: {
    fontSize: 18,
    padding: 16,
    backgroundColor: "#f5f5f5",
    borderRadius: 12,
    marginBottom: 16,
    color: "#333",
  },
  phoneInput: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  countryCode: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginRight: 12,
  },
  otpHint: { fontSize: 14, color: "#666", marginBottom: 12 },
  otpInput: {
    fontSize: 32,
    padding: 16,
    backgroundColor: "#f5f5f5",
    borderRadius: 12,
    marginBottom: 16,
    letterSpacing: 8,
    textAlign: "center",
  },
  button: {
    backgroundColor: "#FF6B35",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 8,
  },
  buttonDisabled: { backgroundColor: "#ccc" },
  buttonText: { color: "#fff", fontSize: 18, fontWeight: "600" },
  resendButton: { marginTop: 16, alignItems: "center" },
  resendText: { color: "#FF6B35", fontSize: 16 },
  googleButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#eee",
  },
  googleIcon: {
    fontSize: 24,
    fontWeight: "bold",
    marginRight: 12,
    color: "#4285F4",
  },
  googleButtonText: { fontSize: 16, fontWeight: "600", color: "#333" },
  switchContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 32,
  },
  switchText: { color: "#666", fontSize: 16 },
  switchLink: { color: "#FF6B35", fontSize: 16, fontWeight: "600" },
});