import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuthStore } from '@/stores/authStore';
import { setAuthToken } from '@/lib/api';
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from '@react-navigation/native';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import * as Linking from 'expo-linking';
import 'react-native-reanimated';

export const unstable_settings = {
  anchor: '(tabs)',
};

function RootStackLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#fff' },
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
    </Stack>
  );
}

function AuthStackLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#fff' },
      }}
    >
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const { token, isLoading, loadAuth, setAuth } = useAuthStore();
  const router = useRouter();

  // Load stored auth on startup
  useEffect(() => {
    loadAuth();
  }, []);

  // Handle the deep-link callback from ScaleKit
  // URL format: runzilla://auth/callback?token=...&is_new_user=...&profile=...
  useEffect(() => {
    const handleDeepLink = async (event: { url: string }) => {
      const url = event.url;
      if (!url.includes('auth/callback')) return;

      try {
        const parsed = new URL(url);
        const error = parsed.searchParams.get('error');

        if (error) {
          // Error is handled inside initiateScalekitAuth() — nothing to do here
          return;
        }

        const incomingToken = parsed.searchParams.get('token');
        const isNewUser = parsed.searchParams.get('is_new_user') === 'true';
        const profileRaw = parsed.searchParams.get('profile');

        if (!incomingToken) return;

        const profile = profileRaw
          ? JSON.parse(decodeURIComponent(profileRaw))
          : null;

        await setAuthToken(incomingToken);
        await setAuth(incomingToken, profile);

        router.replace(isNewUser ? '/(auth)/onboarding' : '/(tabs)');
      } catch (e) {
        console.error('Deep-link parse error:', e);
      }
    };

    // Subscribe to incoming deep links while app is running
    const sub = Linking.addEventListener('url', handleDeepLink);

    // Also handle the initial URL if the app was opened via deep link
    Linking.getInitialURL().then((url) => {
      if (url) handleDeepLink({ url });
    });

    return () => sub.remove();
  }, []);

  if (isLoading) return null;

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      {token ? <RootStackLayout /> : <AuthStackLayout />}
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
