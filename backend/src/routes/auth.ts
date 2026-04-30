import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { Scalekit } from '@scalekit-sdk/node';
import { db } from '../db/supabase';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

// ─── ScaleKit client ────────────────────────────────────────────────────────
const scalekit = new Scalekit(
  process.env.SCALEKIT_ENVIRONMENT_URL!,
  process.env.SCALEKIT_CLIENT_ID!,
  process.env.SCALEKIT_CLIENT_SECRET!,
);

// The backend callback URL — must be registered in ScaleKit dashboard
// In dev: http://localhost:3000/api/auth/callback
// After ScaleKit exchanges the code it deep-links back to the Expo app
const BACKEND_CALLBACK_URL =
  process.env.SCALEKIT_REDIRECT_URI || 'http://localhost:3000/api/auth/callback';

// Expo deep-link scheme the app listens on (e.g. "runzilla://")
const APP_SCHEME = process.env.EXPO_APP_SCHEME || 'runzilla';

// ─── Helpers ─────────────────────────────────────────────────────────────────
async function getOrCreateProfile(params: {
  userId: string;
  email?: string | null;
  phone?: string | null;
  displayName?: string | null;
}) {
  const { userId, email, phone, displayName } = params;

  const { data: existing } = await db
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (existing) return { profile: existing, isNewUser: false };

  const fallbackName =
    displayName?.trim() ||
    (email ? email.split('@')[0] : null) ||
    (phone ? `runner_${phone.slice(-4)}` : 'runner');

  const { data: created, error } = await db
    .from('profiles')
    .insert({
      id: userId,
      email: email ?? null,
      phone: phone ?? '',
      display_name: fallbackName,
      name: fallbackName,
      avatar: null,
      avatar_index: 0,
      city: '',
      xp: 0,
      level: 1,
      lifetime_xp: 0,
      streak_days: 0,
      badges: [],
      lifetime_km: 0,
    })
    .select('*')
    .single();

  if (error) throw error;
  return { profile: created, isNewUser: true };
}

function mintJwt(userId: string, email?: string | null, phone?: string | null) {
  return jwt.sign(
    { user_id: userId, email: email ?? null, phone: phone ?? null },
    process.env.ADMIN_JWT_SECRET || 'dev-secret',
    { expiresIn: '30d' },
  );
}

// ─── Route 1: Get the ScaleKit authorization URL ─────────────────────────────
// The mobile app hits this to get the hosted-login URL to open in the browser.
// GET /api/auth/authorize
// Returns: { url: "https://time.scalekit.dev/oauth/authorize?..." }
router.get('/authorize', (req, res) => {
  try {
    const url = scalekit.getAuthorizationUrl(BACKEND_CALLBACK_URL, {
      scopes: ['openid', 'profile', 'email', 'offline_access'],
    });
    res.json({ url });
  } catch (err) {
    console.error('getAuthorizationUrl error:', err);
    res.status(500).json({ error: 'Failed to build auth URL' });
  }
});

// ─── Route 2: ScaleKit OAuth callback ────────────────────────────────────────
// ScaleKit redirects here with ?code=... after the user authenticates.
// We exchange the code, create/find the profile, mint our JWT, then
// deep-link back into the Expo app so the app can capture the token.
// GET /api/auth/callback?code=...
router.get('/callback', async (req, res) => {
  const { code, error, error_description } = req.query as Record<string, string>;

  if (error) {
    console.error('ScaleKit callback error:', error, error_description);
    // Deep-link back to app with the error
    const appUrl = `${APP_SCHEME}://auth/callback?error=${encodeURIComponent(error)}&error_description=${encodeURIComponent(error_description || '')}`;
    return res.redirect(appUrl);
  }

  if (!code) {
    return res.status(400).json({ error: 'No code provided' });
  }

  try {
    const authResult = await scalekit.authenticateWithCode(code, BACKEND_CALLBACK_URL);
    const { user } = authResult;

    const userId = user.id;
    const email = user.email ?? null;
    const name = user.name ?? user.givenName ?? null;

    const { profile, isNewUser } = await getOrCreateProfile({
      userId,
      email,
      displayName: name,
    });

    const token = mintJwt(userId, email);

    // Deep-link back into the Expo app with the token
    const appUrl =
      `${APP_SCHEME}://auth/callback` +
      `?token=${encodeURIComponent(token)}` +
      `&is_new_user=${isNewUser}` +
      `&profile=${encodeURIComponent(JSON.stringify(profile))}`;

    res.redirect(appUrl);
  } catch (err: any) {
    console.error('Callback exchange error:', err);
    const appUrl = `${APP_SCHEME}://auth/callback?error=${encodeURIComponent('Authentication failed')}`;
    res.redirect(appUrl);
  }
});

// ─── Route 3: POST token exchange (alternative - called from mobile directly) ─
// The mobile app can send the code here and get JSON back instead of a redirect.
// POST /api/auth/token  { code }
router.post('/token', async (req, res) => {
  const { code } = req.body;

  if (!code) {
    return res.status(400).json({ error: 'Authorization code required', code: 'MISSING_CODE' });
  }

  try {
    const authResult = await scalekit.authenticateWithCode(code, BACKEND_CALLBACK_URL);
    const { user } = authResult;

    const userId = user.id;
    const email = user.email ?? null;
    const name = user.name ?? user.givenName ?? null;

    const { profile, isNewUser } = await getOrCreateProfile({
      userId,
      email,
      displayName: name,
    });

    const token = mintJwt(userId, email);

    res.json({ token, profile, is_new_user: isNewUser });
  } catch (err: any) {
    console.error('Token exchange error:', err);
    res.status(401).json({ error: 'Token exchange failed', code: 'TOKEN_EXCHANGE_FAILED' });
  }
});

// ─── Route 4: Get current user profile ───────────────────────────────────────
// GET /api/auth/me
router.get('/me', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { data: profile } = await db
      .from('profiles')
      .select('*')
      .eq('id', req.user!.id)
      .single();

    if (!profile) {
      return res.status(404).json({ error: 'Profile not found', code: 'PROFILE_NOT_FOUND' });
    }

    res.json(profile);
  } catch (err) {
    console.error('Get profile error:', err);
    res.status(500).json({ error: 'Failed to get profile', code: 'PROFILE_ERROR' });
  }
});

export default router;
