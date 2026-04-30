import { setAuthToken } from '@/lib/api';
import { initiateScalekitAuth } from '@/lib/scalekit';
import { useAuthStore } from '@/stores/authStore';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from 'react-native';

export default function LoginScreen() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    try {
      const result = await initiateScalekitAuth();

      if (!result || result.error) {
        Alert.alert('Login Failed', result?.error || 'Authentication failed. Please try again.');
        return;
      }

      await setAuthToken(result.token);
      await setAuth(result.token, result.profile);

      router.replace(result.is_new_user ? '/(auth)/onboarding' : '/(tabs)');
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Logo */}
      <View style={styles.logoContainer}>
        <Text style={styles.logo}>🏃‍♂️</Text>
        <Text style={styles.title}>Runzilla</Text>
        <Text style={styles.subtitle}>Run. Earn. Win.</Text>
      </View>

      {/* Auth options description */}
      <View style={styles.methodsContainer}>
        <Text style={styles.methodsTitle}>Sign in with</Text>
        <View style={styles.methodsList}>
          {['📱 Phone OTP', '📧 Email / Magic Link', '🔵 Google', '🔑 Passkeys'].map((m) => (
            <View key={m} style={styles.methodItem}>
              <Text style={styles.methodText}>{m}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Single CTA button */}
      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleLogin}
        disabled={loading}
        activeOpacity={0.85}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Continue</Text>
        )}
      </TouchableOpacity>

      <Text style={styles.hint}>
        You'll choose your preferred sign-in method on the next screen.
      </Text>

      {/* Sign Up link */}
      <View style={styles.switchContainer}>
        <Text style={styles.switchText}>New to Runzilla? </Text>
        <TouchableOpacity onPress={handleLogin} disabled={loading}>
          <Text style={styles.switchLink}>Create an account</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'center',
    padding: 28,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 48,
  },
  logo: { fontSize: 72, marginBottom: 12 },
  title: { fontSize: 36, fontWeight: '800', color: '#FF6B35', letterSpacing: -0.5 },
  subtitle: { fontSize: 16, color: '#888', marginTop: 4 },

  methodsContainer: {
    backgroundColor: '#fafafa',
    borderRadius: 16,
    padding: 20,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  methodsTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#aaa',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  methodsList: { gap: 8 },
  methodItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  methodText: { fontSize: 15, color: '#444', fontWeight: '500' },

  button: {
    backgroundColor: '#FF6B35',
    paddingVertical: 18,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: '#FF6B35',
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  buttonDisabled: { backgroundColor: '#ccc', shadowOpacity: 0 },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: '700' },

  hint: {
    textAlign: 'center',
    color: '#bbb',
    fontSize: 13,
    marginTop: 14,
    lineHeight: 18,
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 32,
  },
  switchText: { color: '#888', fontSize: 15 },
  switchLink: { color: '#FF6B35', fontSize: 15, fontWeight: '700' },
});