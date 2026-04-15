import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { api, setAuthToken } from '@/lib/api';
import { useAuthStore } from '@/stores/authStore';

export default function LoginScreen() {
  const router = useRouter();
  const { setAuth } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [authMethod, setAuthMethod] = useState<'email' | 'phone'>('email');

  const handleEmailLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter email and password');
      return;
    }

    setLoading(true);
    try {
      const result = await api.auth.login(email, password);

      if (result.error) {
        Alert.alert('Error', result.error);
        setLoading(false);
        return;
      }

      if (result.data?.token) {
        await setAuthToken(result.data.token);
        await setAuth(result.data.token, result.data.profile);
        router.replace(result.data.is_new_user ? '/(auth)/onboarding' : '/(tabs)');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Network error');
    }
    setLoading(false);
  };

  const handleSendOtp = async () => {
    if (phone.length !== 10) {
      Alert.alert('Error', 'Please enter a valid 10-digit phone number');
      return;
    }

    setLoading(true);
    const fullPhone = `+91${phone}`;
    const result = await api.auth.sendOtp(fullPhone);

    if (result.error) {
      Alert.alert('Error', result.error);
    } else {
      setOtpSent(true);
    }
    setLoading(false);
  };

  const handleVerifyOtp = async () => {
    if (otp.length !== 6) {
      Alert.alert('Error', 'Please enter the 6-digit OTP');
      return;
    }

    setLoading(true);
    const fullPhone = `+91${phone}`;
    const result = await api.auth.verifyOtp(fullPhone, otp);

    if (result.error) {
      Alert.alert('Error', result.error);
      setLoading(false);
      return;
    }

    if (result.data?.token) {
      await setAuthToken(result.data.token);
      await setAuth(result.data.token, result.data.profile);
      router.replace(result.data.is_new_user ? '/(auth)/onboarding' : '/(tabs)');
    }
    setLoading(false);
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      const result = await api.auth.signInWithGoogle();
      if (result.error) {
        Alert.alert('Error', result.error);
        setLoading(false);
        return;
      }

      if (result.data?.token) {
        await setAuthToken(result.data.token);
        await setAuth(result.data.token, result.data.profile);
        router.replace(result.data.is_new_user ? '/(auth)/onboarding' : '/(tabs)');
      } else {
        Alert.alert('Error', 'Google sign in failed');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Google sign in failed');
    }
    setLoading(false);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.logoContainer}>
          <Text style={styles.logo}>🏃‍♂️</Text>
          <Text style={styles.title}>Runzilla</Text>
          <Text style={styles.subtitle}>Run. Earn. Win.</Text>
        </View>

        <View style={styles.authTabs}>
          <TouchableOpacity
            style={[styles.authTab, authMethod === 'email' && styles.authTabActive]}
            onPress={() => setAuthMethod('email')}
          >
            <Text style={[styles.authTabText, authMethod === 'email' && styles.authTabTextActive]}>
              Email
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.authTab, authMethod === 'phone' && styles.authTabActive]}
            onPress={() => setAuthMethod('phone')}
          >
            <Text style={[styles.authTabText, authMethod === 'phone' && styles.authTabTextActive]}>
              Phone
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.form}>
          {authMethod === 'email' ? (
            <>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="Enter your email"
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
              />

              <Text style={styles.label}>Password</Text>
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="Enter your password"
                secureTextEntry
              />

              <TouchableOpacity
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={handleEmailLogin}
                disabled={loading}
              >
                <Text style={styles.buttonText}>
                  {loading ? 'Please wait...' : 'Sign In'}
                </Text>
              </TouchableOpacity>

              <View style={styles.switchContainer}>
                <Text style={styles.switchText}>Don't have an account? </Text>
                <TouchableOpacity onPress={() => router.push('/(auth)/signup')}>
                  <Text style={styles.switchLink}>Sign Up</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
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
                      {loading ? 'Sending...' : 'Send OTP'}
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
                      {loading ? 'Verifying...' : 'Verify OTP'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.resendButton} onPress={handleSendOtp}>
                    <Text style={styles.resendText}>Resend OTP</Text>
                  </TouchableOpacity>
                </>
              )}
            </>
          )}

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity
            style={[styles.googleButton, loading && styles.buttonDisabled]}
            onPress={handleGoogleLogin}
            disabled={loading}
          >
            <Text style={styles.googleIcon}>G</Text>
            <Text style={styles.googleButtonText}>Continue with Google</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  logoContainer: { alignItems: 'center', marginBottom: 32 },
  logo: { fontSize: 64, marginBottom: 16 },
  title: { fontSize: 32, fontWeight: 'bold', color: '#FF6B35' },
  subtitle: { fontSize: 16, color: '#666', marginTop: 4 },
  authTabs: { flexDirection: 'row', marginBottom: 24, backgroundColor: '#f5f5f5', borderRadius: 12, padding: 4 },
  authTab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 8 },
  authTabActive: { backgroundColor: '#FF6B35' },
  authTabText: { fontSize: 16, fontWeight: '600', color: '#666' },
  authTabTextActive: { color: '#fff' },
  form: { width: '100%' },
  label: { fontSize: 16, fontWeight: '600', marginBottom: 8, color: '#333' },
  input: { fontSize: 18, padding: 16, backgroundColor: '#f5f5f5', borderRadius: 12, marginBottom: 16, color: '#333' },
  phoneInput: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f5f5f5', borderRadius: 12, paddingHorizontal: 16, marginBottom: 16 },
  countryCode: { fontSize: 18, fontWeight: '600', color: '#333', marginRight: 12 },
  otpHint: { fontSize: 14, color: '#666', marginBottom: 12 },
  otpInput: { fontSize: 32, padding: 16, backgroundColor: '#f5f5f5', borderRadius: 12, marginBottom: 16, letterSpacing: 8, textAlign: 'center' },
  button: { backgroundColor: '#FF6B35', paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginTop: 8 },
  buttonDisabled: { backgroundColor: '#ccc' },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: '600' },
  resendButton: { marginTop: 16, alignItems: 'center' },
  resendText: { color: '#FF6B35', fontSize: 16 },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 24 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#eee' },
  dividerText: { marginHorizontal: 16, color: '#999', fontSize: 14 },
  googleButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', paddingVertical: 16, borderRadius: 12, borderWidth: 2, borderColor: '#eee' },
  googleIcon: { fontSize: 24, fontWeight: 'bold', marginRight: 12, color: '#4285F4' },
  googleButtonText: { fontSize: 16, fontWeight: '600', color: '#333' },
  switchContainer: { flexDirection: 'row', justifyContent: 'center', marginTop: 24 },
  switchText: { color: '#666', fontSize: 16 },
  switchLink: { color: '#FF6B35', fontSize: 16, fontWeight: '600' },
});
