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

/**
 * Signup screen — ScaleKit's hosted page handles account creation.
 * The same flow handles both new sign-ups and existing logins automatically.
 */
export default function SignupScreen() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const [loading, setLoading] = useState(false);

  const handleSignUp = async () => {
    setLoading(true);
    try {
      const result = await initiateScalekitAuth();

      if (!result || result.error) {
        Alert.alert('Sign Up Failed', result?.error || 'Authentication failed. Please try again.');
        return;
      }

      await setAuthToken(result.token);
      await setAuth(result.token, result.profile);

      // Always send to onboarding from signup flow
      router.replace('/(auth)/onboarding');
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.logoContainer}>
        <Text style={styles.logo}>🏃‍♂️</Text>
        <Text style={styles.title}>Join Runzilla</Text>
        <Text style={styles.subtitle}>Create your account</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Create an account with</Text>
        {['📱 Phone OTP', '📧 Email / Magic Link', '🔵 Google', '🔑 Passkeys'].map((m) => (
          <View key={m} style={styles.methodItem}>
            <Text style={styles.methodText}>{m}</Text>
          </View>
        ))}
      </View>

      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleSignUp}
        disabled={loading}
        activeOpacity={0.85}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Get Started</Text>
        )}
      </TouchableOpacity>

      <Text style={styles.hint}>
        You'll choose your preferred sign-up method on the next screen.
      </Text>

      <View style={styles.loginContainer}>
        <Text style={styles.loginText}>Already have an account? </Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.loginLink}>Log In</Text>
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
  logoContainer: { alignItems: 'center', marginBottom: 40 },
  logo: { fontSize: 72, marginBottom: 12 },
  title: { fontSize: 36, fontWeight: '800', color: '#FF6B35', letterSpacing: -0.5 },
  subtitle: { fontSize: 16, color: '#888', marginTop: 4 },

  card: {
    backgroundColor: '#fafafa',
    borderRadius: 16,
    padding: 20,
    marginBottom: 28,
    borderWidth: 1,
    borderColor: '#f0f0f0',
    gap: 8,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#aaa',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  methodItem: { flexDirection: 'row', alignItems: 'center' },
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
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 28,
  },
  loginText: { color: '#888', fontSize: 15 },
  loginLink: { color: '#FF6B35', fontSize: 15, fontWeight: '700' },
});