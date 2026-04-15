import { Router } from 'express';
import { supabaseAdmin } from '../db/supabase';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { SUPPORTED_CITIES } from '@runzilla/shared/constants';

const router = Router();

router.post('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { display_name, city, avatar_index } = req.body;
    const userId = req.user!.id;

    if (!display_name || !city) {
      return res.status(400).json({ error: 'Display name and city required', code: 'MISSING_PARAMS' });
    }

    if (!SUPPORTED_CITIES.includes(city)) {
      return res.status(400).json({ error: 'Invalid city', code: 'INVALID_CITY' });
    }

    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .single();

    if (existingProfile) {
      return res.status(400).json({ error: 'Profile already exists', code: 'PROFILE_EXISTS' });
    }

    const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(userId);

    const { data: profile, error } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: userId,
        phone: authUser.user?.phone || '',
        display_name,
        city,
        avatar_index: avatar_index || 0,
      })
      .select()
      .single();

    if (error) {
      console.error('Profile creation error:', error);
      return res.status(500).json({ error: 'Failed to create profile', code: 'PROFILE_ERROR' });
    }

    await supabaseAdmin
      .from('wallets')
      .insert({
        user_id: userId,
        balance_paise: 0,
        lifetime_earned_paise: 0,
      });

    res.json(profile);
  } catch (error) {
    console.error('Profile creation error:', error);
    res.status(500).json({ error: 'Failed to create profile', code: 'PROFILE_ERROR' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { data: profile, error } = await supabaseAdmin
      .from('profiles')
      .select('id, display_name, city, avatar_index, level, lifetime_xp, streak_days')
      .eq('id', id)
      .single();

    if (error || !profile) {
      return res.status(404).json({ error: 'Profile not found', code: 'PROFILE_NOT_FOUND' });
    }

    res.json(profile);
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Failed to get profile', code: 'PROFILE_ERROR' });
  }
});

router.patch('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { display_name, city, avatar_index, upi_id } = req.body;
    const userId = req.user!.id;

    const updateData: Record<string, unknown> = {};

    if (display_name !== undefined) updateData.display_name = display_name;
    if (city !== undefined) {
      if (!SUPPORTED_CITIES.includes(city)) {
        return res.status(400).json({ error: 'Invalid city', code: 'INVALID_CITY' });
      }
      updateData.city = city;
    }
    if (avatar_index !== undefined) updateData.avatar_index = avatar_index;
    if (upi_id !== undefined) updateData.upi_id = upi_id;

    const { data: profile, error } = await supabaseAdmin
      .from('profiles')
      .update(updateData)
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      console.error('Profile update error:', error);
      return res.status(500).json({ error: 'Failed to update profile', code: 'PROFILE_ERROR' });
    }

    res.json(profile);
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ error: 'Failed to update profile', code: 'PROFILE_ERROR' });
  }
});

export default router;