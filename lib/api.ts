import { createClient, SupabaseClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { Platform } from 'react-native';
import { deleteStoredItem, getStoredItem, setStoredItem } from './authStorage';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://ujrmxfvhaifgdipzkmfb.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_KEY || '';

if (!supabaseAnonKey) {
  console.warn('EXPO_PUBLIC_SUPABASE_KEY is not set');
}

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey);

const defaultApiUrl = (() => {
  const hostUri = Constants.expoConfig?.hostUri ?? Constants.expoGoConfig?.debuggerHost;
  const host = hostUri?.split(':')[0];
  return host ? `http://${host}:3000` : 'http://localhost:3000';
})();

function normalizeApiUrl(url: string): string {
  if (Platform.OS === 'android') {
    return url
      .replace('://localhost', '://10.0.2.2')
      .replace('://127.0.0.1', '://10.0.2.2');
  }
  return url;
}

const API_URL = normalizeApiUrl(process.env.EXPO_PUBLIC_API_URL || defaultApiUrl);
const googleWebClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;

if (googleWebClientId) {
  GoogleSignin.configure({
    webClientId: googleWebClientId,
  });
}

let authToken: string | null = null;

export async function setAuthToken(token: string) {
  authToken = token;
  if (token) {
    await setStoredItem('auth_token', token);
  } else {
    await deleteStoredItem('auth_token');
  }
}

export async function getAuthToken(): Promise<string | null> {
  if (authToken) return authToken;
  return getStoredItem('auth_token');
}

async function fetchApi<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = await getAuthToken();
  
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || 'Request failed');
  }

  return response.json();
}

export async function signInWithGoogle(): Promise<{ error?: string; data?: any }> {
  try {
    if (!googleWebClientId) {
      return {
        error:
          'Google sign-in is not configured. Set EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID in your app env.',
      };
    }

    await GoogleSignin.hasPlayServices();
    await GoogleSignin.signOut().catch(() => undefined);
    const response = await GoogleSignin.signIn();

    const idToken = response.data?.idToken;
    if (!idToken) {
      return { error: 'Google sign-in failed: missing ID token' };
    }

    const { data: authData, error: authError } = await supabase.auth.signInWithIdToken({
      provider: 'google',
      token: idToken,
    });

    if (authError || !authData.session?.access_token) {
      return { error: authError?.message || 'Failed to create Supabase session' };
    }

    const responseApi = await fetch(`${API_URL}/api/auth/oauth-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ access_token: authData.session.access_token }),
    });

    const backendData = await responseApi.json();
    if (!responseApi.ok) {
      return { error: backendData.error || 'Google login failed' };
    }

    return { data: backendData };
  } catch (error: any) {
    return { error: error.message || 'Google sign in failed' };
  }
}

const auth = {
  getApiUrl: () => API_URL,
  
  signInWithGoogle,

  login: async (email: string, password: string) => {
    try {
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();
      if (!response.ok) {
        return { error: data.error || 'Login failed' };
      }

      return { data };
    } catch (error: any) {
      return { error: error.message || 'Network error' };
    }
  },

  signup: async (email: string, password: string) => {
    try {
      const response = await fetch(`${API_URL}/api/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();
      if (!response.ok) {
        return { error: data.error || 'Signup failed' };
      }

      return { data };
    } catch (error: any) {
      return { error: error.message || 'Network error' };
    }
  },

  signOut: async () => {
    const { error } = await supabase.auth.signOut();
    await deleteStoredItem('auth_token');
    authToken = null;
    return { error: error?.message };
  },

  sendOtp: async (phone: string) => {
    try {
      const response = await fetch(`${API_URL}/api/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });
      const data = await response.json();
      if (!response.ok) {
        return { error: data.error || 'Failed to send OTP' };
      }
      return { data };
    } catch (error: any) {
      return { error: error.message || 'Network error' };
    }
  },

  verifyOtp: async (phone: string, otp: string) => {
    try {
      const response = await fetch(`${API_URL}/api/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, otp }),
      });
      const data = await response.json();
      if (!response.ok) {
        return { error: data.error || 'Failed to verify OTP' };
      }
      return { data };
    } catch (error: any) {
      return { error: error.message || 'Network error' };
    }
  },
};

const profile = {
  get: async () => {
    return fetchApi<any>('/api/profile', { method: 'GET' });
  },

  update: async (data: { display_name?: string; city?: string; avatar_index?: number }) => {
    return fetchApi<any>('/api/profile', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};

const runs = {
  start: async (gpsPoints: any[]) => {
    return fetchApi<any>('/api/runs/start', {
      method: 'POST',
      body: JSON.stringify({ gps_points: gpsPoints }),
    });
  },

  complete: async (runId: string, gpsPoints: any[], distanceMeters: number, durationSecs: number) => {
    return fetchApi<any>(`/api/runs/${runId}/complete`, {
      method: 'POST',
      body: JSON.stringify({
        gps_points: gpsPoints,
        distance_meters: distanceMeters,
        duration_secs: durationSecs,
      }),
    });
  },

  getActive: async () => {
    return fetchApi<any>('/api/runs/active', { method: 'GET' });
  },

  getRecent: async (limit = 10) => {
    return fetchApi<any>(`/api/runs/recent?limit=${limit}`, { method: 'GET' });
  },
};

const leaderboard = {
  get: async (scope: string = 'national', limit = 100) => {
    return fetchApi<any>(`/api/leaderboard?scope=${scope}&limit=${limit}`, { method: 'GET' });
  },
};

const wallet = {
  get: async () => {
    return fetchApi<any>('/api/wallet', { method: 'GET' });
  },
};

export const api = {
  supabase,
  auth,
  profile,
  runs,
  leaderboard,
  wallet,
};
