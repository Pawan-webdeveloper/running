import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { deleteStoredItem, getStoredItem, setStoredItem } from './authStorage';

// ─── API URL ─────────────────────────────────────────────────────────────────
const hostUri =
  Constants.expoConfig?.hostUri ?? (Constants.expoGoConfig as any)?.debuggerHost;
const host = hostUri?.split(':')[0];
const defaultApiUrl = host ? `http://${host}:3000` : 'http://localhost:3000';

function normalizeApiUrl(url: string): string {
  if (Platform.OS === 'android') {
    return url
      .replace('://localhost', '://10.0.2.2')
      .replace('://127.0.0.1', '://10.0.2.2');
  }
  return url;
}

export const API_URL = normalizeApiUrl(
  process.env.EXPO_PUBLIC_API_URL || defaultApiUrl,
);

console.log('API_URL:', API_URL);

// ─── Token management ─────────────────────────────────────────────────────────
let authToken: string | null = null;

export async function setAuthToken(token: string) {
  authToken = token || null;
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

// ─── Base fetch ───────────────────────────────────────────────────────────────
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

// ─── Auth API ─────────────────────────────────────────────────────────────────
// All auth flows go through ScaleKit's hosted page (lib/scalekit.ts).
// These helpers are kept for session management and logout only.
const auth = {
  getApiUrl: () => API_URL,

  /** Clear the stored token and log the user out */
  signOut: async () => {
    await deleteStoredItem('auth_token');
    await deleteStoredItem('user_data');
    authToken = null;
    return { error: undefined };
  },
};

// ─── Profile ──────────────────────────────────────────────────────────────────
const profile = {
  get: async () => fetchApi<any>('/api/profile', { method: 'GET' }),

  update: async (data: { display_name?: string; city?: string; avatar_index?: number }) =>
    fetchApi<any>('/api/profile', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

// ─── Runs ─────────────────────────────────────────────────────────────────────
const runs = {
  start: async (gpsPoints: any[]) =>
    fetchApi<any>('/api/runs/start', {
      method: 'POST',
      body: JSON.stringify({ gps_points: gpsPoints }),
    }),

  complete: async (
    runId: string,
    gpsPoints: any[],
    distanceMeters: number,
    durationSecs: number,
  ) =>
    fetchApi<any>(`/api/runs/${runId}/complete`, {
      method: 'POST',
      body: JSON.stringify({
        gps_points: gpsPoints,
        distance_meters: distanceMeters,
        duration_secs: durationSecs,
      }),
    }),

  getActive: async () => fetchApi<any>('/api/runs/active', { method: 'GET' }),

  getRecent: async (limit = 10) =>
    fetchApi<any>(`/api/runs/recent?limit=${limit}`, { method: 'GET' }),
};

// ─── Leaderboard ──────────────────────────────────────────────────────────────
const leaderboard = {
  get: async (scope = 'national', limit = 100) =>
    fetchApi<any>(`/api/leaderboard?scope=${scope}&limit=${limit}`, { method: 'GET' }),
};

// ─── Wallet ───────────────────────────────────────────────────────────────────
const wallet = {
  get: async () => fetchApi<any>('/api/wallet', { method: 'GET' }),
};

// ─── Export ───────────────────────────────────────────────────────────────────
export const api = {
  auth,
  profile,
  runs,
  leaderboard,
  wallet,
};
