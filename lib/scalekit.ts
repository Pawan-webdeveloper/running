import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

// ─── Config ──────────────────────────────────────────────────────────────────
const hostUri = Constants.expoConfig?.hostUri ?? (Constants.expoGoConfig as any)?.debuggerHost;
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

// The Expo deep-link scheme that the backend redirects back to after auth
// e.g. "runzilla://auth/callback?token=..."
export const APP_SCHEME = 'runzilla';

// ─── Auth result type ─────────────────────────────────────────────────────────
export interface ScalekitAuthResult {
  token: string;
  profile: any;
  is_new_user: boolean;
  error?: string;
}

// ─── initiateScalekitAuth ─────────────────────────────────────────────────────
/**
 * Full OAuth flow for Expo:
 *  1. Ask the backend for the ScaleKit authorization URL
 *  2. Open it in an in-app browser session (WebBrowser.openAuthSessionAsync)
 *     with the Expo deep-link as the return scheme so the OS hands control back
 *  3. After the user authenticates, ScaleKit → backend callback → deep-link
 *     The returned URL contains ?token=...&is_new_user=...&profile=...
 *     OR ?error=...
 *
 * ScaleKit's hosted page handles ALL auth methods the user has enabled in the
 * dashboard (Google, Email OTP / Magic Link, Phone OTP, Passkeys, SSO, etc.)
 * — no custom SMS code needed here.
 */
export async function initiateScalekitAuth(): Promise<ScalekitAuthResult | null> {
  try {
    // 1. Fetch the authorization URL from our backend
    const res = await fetch(`${API_URL}/api/auth/authorize`);
    if (!res.ok) {
      return { error: 'Failed to get auth URL', token: '', profile: null, is_new_user: false };
    }
    const { url } = await res.json();

    // 2. The backend redirects back to runzilla://auth/callback after auth
    const redirectScheme = Linking.createURL('/');

    const result = await WebBrowser.openAuthSessionAsync(url, redirectScheme);

    if (result.type === 'cancel' || result.type === 'dismiss') {
      return { error: 'Authentication cancelled', token: '', profile: null, is_new_user: false };
    }

    if (result.type !== 'success') {
      return { error: 'Authentication failed', token: '', profile: null, is_new_user: false };
    }

    // 3. Parse the deep-link URL
    const deepLink = new URL(result.url);
    const error = deepLink.searchParams.get('error');

    if (error) {
      const errorDesc = deepLink.searchParams.get('error_description') || error;
      return { error: errorDesc, token: '', profile: null, is_new_user: false };
    }

    const token = deepLink.searchParams.get('token');
    const isNewUser = deepLink.searchParams.get('is_new_user') === 'true';
    const profileRaw = deepLink.searchParams.get('profile');

    if (!token) {
      return { error: 'No token received', token: '', profile: null, is_new_user: false };
    }

    const profile = profileRaw ? JSON.parse(decodeURIComponent(profileRaw)) : null;

    return { token, profile, is_new_user: isNewUser };
  } catch (err: any) {
    console.error('ScaleKit auth error:', err);
    return { error: err?.message || 'Authentication failed', token: '', profile: null, is_new_user: false };
  }
}

export function isScalekitConfigured(): boolean {
  // ScaleKit config lives on the backend — always true if the backend is reachable
  return true;
}
