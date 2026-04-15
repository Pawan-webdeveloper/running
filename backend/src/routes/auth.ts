import { Router } from 'express';
import { supabaseAdmin } from '../db/supabase';
import jwt from 'jsonwebtoken';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

async function getOrCreateProfile(params: {
  userId: string;
  email?: string | null;
  phone?: string | null;
  displayName?: string | null;
}) {
  const { userId, email, phone, displayName } = params;
  const { data: existingProfile } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (existingProfile) {
    return { profile: existingProfile, isNewUser: false };
  }

  const fallbackName =
    displayName?.trim() ||
    (email ? email.split('@')[0] : null) ||
    (phone ? `runner_${phone.slice(-4)}` : 'runner');

  const insertPayload: Record<string, any> = {
    id: userId,
    phone: phone ?? '',
    display_name: fallbackName,
    city: '',
    avatar_index: 0,
    level: 1,
    lifetime_xp: 0,
    streak_days: 0,
  };

  if (email) {
    insertPayload.email = email;
  }
  insertPayload.name = fallbackName;
  insertPayload.avatar = null;
  insertPayload.xp = 0;
  insertPayload.badges = [];
  insertPayload.lifetime_km = 0;

  const { data: createdProfile, error: createError } = await supabaseAdmin
    .from('profiles')
    .insert(insertPayload)
    .select('*')
    .single();

  if (createError) {
    throw createError;
  }

  return { profile: createdProfile, isNewUser: true };
}

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required', code: 'MISSING_PARAMS' });
    }

    const { data: authData, error } = await supabaseAdmin.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !authData.user) {
      return res.status(401).json({ error: error?.message || 'Invalid credentials', code: 'INVALID_CREDS' });
    }

    const { profile, isNewUser } = await getOrCreateProfile({
      userId: authData.user.id,
      email: authData.user.email,
      phone: authData.user.phone,
      displayName:
        authData.user.user_metadata?.name ||
        authData.user.user_metadata?.full_name,
    });

    const token = jwt.sign(
      { user_id: authData.user.id, email },
      process.env.ADMIN_JWT_SECRET || 'dev-secret',
      { expiresIn: '30d' }
    );

    res.json({
      token,
      is_new_user: isNewUser,
      profile,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed', code: 'LOGIN_ERROR' });
  }
});

router.post('/signup', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required', code: 'MISSING_PARAMS' });
    }

    const { data: authData, error } = await supabaseAdmin.auth.signUp({
      email,
      password,
    });

    if (error || !authData.user) {
      return res.status(400).json({ error: error?.message || 'Signup failed', code: 'SIGNUP_FAILED' });
    }

    const { profile, isNewUser } = await getOrCreateProfile({
      userId: authData.user.id,
      email: authData.user.email,
      phone: authData.user.phone,
      displayName:
        authData.user.user_metadata?.name ||
        authData.user.user_metadata?.full_name,
    });

    const token = jwt.sign(
      { user_id: authData.user.id, email },
      process.env.ADMIN_JWT_SECRET || 'dev-secret',
      { expiresIn: '30d' }
    );

    res.json({
      token,
      is_new_user: isNewUser,
      profile,
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Signup failed', code: 'SIGNUP_ERROR' });
  }
});

router.post('/verify-otp', async (req, res) => {
  try {
    const { phone, otp } = req.body;

    if (!phone || !otp) {
      return res.status(400).json({ error: 'Phone and OTP required', code: 'MISSING_PARAMS' });
    }

    const { data: otpData, error } = await supabaseAdmin.auth.verifyOtp({
      phone,
      token: otp,
      type: 'sms',
    });

    if (error || !otpData.user) {
      return res.status(401).json({ error: 'Invalid OTP', code: 'INVALID_OTP' });
    }

    const { profile, isNewUser } = await getOrCreateProfile({
      userId: otpData.user.id,
      email: otpData.user.email,
      phone: otpData.user.phone || phone,
      displayName:
        otpData.user.user_metadata?.name ||
        otpData.user.user_metadata?.full_name,
    });

    const token = jwt.sign(
      { user_id: otpData.user.id, phone },
      process.env.ADMIN_JWT_SECRET || 'dev-secret',
      { expiresIn: '30d' }
    );

    res.json({
      token,
      is_new_user: isNewUser,
      profile,
    });
  } catch (error) {
    console.error('Auth error:', error);
    res.status(500).json({ error: 'Authentication failed', code: 'AUTH_ERROR' });
  }
});

router.post('/send-otp', async (req, res) => {
  try {
    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({ error: 'Phone required', code: 'MISSING_PHONE' });
    }

    const { data, error } = await supabaseAdmin.auth.signInWithOtp({
      phone,
    });

    if (error) {
      return res.status(400).json({ error: error.message, code: 'OTP_SEND_FAILED' });
    }

    res.json({ success: true, message: 'OTP sent' });
  } catch (error) {
    console.error('Send OTP error:', error);
    res.status(500).json({ error: 'Failed to send OTP', code: 'OTP_SEND_ERROR' });
  }
});

router.post('/oauth-login', async (req, res) => {
  try {
    const { access_token: accessToken } = req.body;

    if (!accessToken) {
      return res.status(400).json({ error: 'access_token required', code: 'MISSING_TOKEN' });
    }

    const {
      data: { user },
      error,
    } = await supabaseAdmin.auth.getUser(accessToken);

    if (error || !user) {
      return res.status(401).json({ error: 'Invalid Supabase session', code: 'INVALID_SESSION' });
    }

    const { profile, isNewUser } = await getOrCreateProfile({
      userId: user.id,
      email: user.email,
      phone: user.phone,
      displayName: user.user_metadata?.name || user.user_metadata?.full_name,
    });

    const token = jwt.sign(
      { user_id: user.id, email: user.email, phone: user.phone },
      process.env.ADMIN_JWT_SECRET || 'dev-secret',
      { expiresIn: '30d' }
    );

    res.json({
      token,
      is_new_user: isNewUser,
      profile,
    });
  } catch (error) {
    console.error('OAuth login error:', error);
    res.status(500).json({ error: 'OAuth login failed', code: 'OAUTH_ERROR' });
  }
});

router.get('/me', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', req.user!.id)
      .single();

    if (!profile) {
      return res.status(404).json({ error: 'Profile not found', code: 'PROFILE_NOT_FOUND' });
    }

    res.json(profile);
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Failed to get profile', code: 'PROFILE_ERROR' });
  }
});

export default router;
