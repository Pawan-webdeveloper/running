import { Router } from 'express';
import { supabaseAdmin } from '../db/supabase';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { calculateXP, updateStreakAndXP } from '../services/xp.service';
import { addXPToLeaderboard } from '../services/leaderboard.service';
import { analyzeRun } from '../services/anticheat.service';

const router = Router();

router.post('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const {
      started_at,
      ended_at,
      distance_meters,
      duration_seconds,
      avg_pace_sec_per_km,
      elevation_gain_m = 0,
      gps_points,
      is_manual = false,
      route_image_url,
    } = req.body;

    if (!started_at || !ended_at || !distance_meters || !duration_seconds || !avg_pace_sec_per_km) {
      return res.status(400).json({ error: 'Missing required fields', code: 'MISSING_PARAMS' });
    }

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('streak_days, city, is_banned')
      .eq('id', userId)
      .single();

    if (!profile) {
      return res.status(404).json({ error: 'Profile not found', code: 'PROFILE_NOT_FOUND' });
    }

    if (profile.is_banned) {
      return res.status(403).json({ error: 'Account banned', code: 'BANNED' });
    }

    const xpEarned = calculateXP(
      distance_meters,
      avg_pace_sec_per_km,
      profile.streak_days,
      is_manual
    );

    const { data: run, error: runError } = await supabaseAdmin
      .from('runs')
      .insert({
        user_id: userId,
        started_at,
        ended_at,
        distance_meters,
        duration_seconds,
        avg_pace_sec_per_km,
        elevation_gain_m,
        xp_earned: xpEarned,
        xp_status: 'provisional',
        anticheat_status: 'pending',
        route_image_url: route_image_url || null,
        is_manual,
      })
      .select()
      .single();

    if (runError || !run) {
      console.error('Run creation error:', runError);
      return res.status(500).json({ error: 'Failed to create run', code: 'RUN_ERROR' });
    }

    if (gps_points && gps_points.length > 0) {
      const gpsData = gps_points.map((point: { lat: number; lng: number; speed_mps?: number; elevation_m?: number; accuracy_m?: number; recorded_at: string }) => ({
        run_id: run.id,
        recorded_at: point.recorded_at,
        lat: point.lat,
        lng: point.lng,
        speed_mps: point.speed_mps || null,
        elevation_m: point.elevation_m || null,
        accuracy_m: point.accuracy_m || null,
      }));

      await supabaseAdmin.from('run_gps_points').insert(gpsData);
    }

    const { data: updatedProfile } = await supabaseAdmin
      .from('profiles')
      .select('streak_days, city')
      .eq('id', userId)
      .single();

    if (updatedProfile && !is_manual) {
      await addXPToLeaderboard(userId, updatedProfile.city, xpEarned);
    }

    setTimeout(async () => {
      try {
        await analyzeRun(run.id);
      } catch (err) {
        console.error('Anti-cheat analysis failed:', err);
      }
    }, 1000);

    const result = await updateStreakAndXP(userId, {
      user_id: userId,
      started_at,
      ended_at,
      distance_meters,
      duration_seconds,
      avg_pace_sec_per_km,
      elevation_gain_m,
      gps_points: gps_points || [],
      is_manual,
      route_image_url,
    });

    res.json({
      run,
      xp_earned: xpEarned,
      new_streak: result.newStreak,
      new_level: result.newLevel,
      badges: result.badges,
    });
  } catch (error) {
    console.error('Run submission error:', error);
    res.status(500).json({ error: 'Failed to submit run', code: 'RUN_SUBMIT_ERROR' });
  }
});

router.get('/', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const { limit = 10, offset = 0 } = req.query;

    const { data: runs, error } = await supabaseAdmin
      .from('runs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(Number(offset), Number(offset) + Number(limit) - 1);

    if (error) {
      console.error('Get runs error:', error);
      return res.status(500).json({ error: 'Failed to get runs', code: 'RUNS_ERROR' });
    }

    const { count } = await supabaseAdmin
      .from('runs')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId);

    res.json({
      runs,
      total: count,
      limit: Number(limit),
      offset: Number(offset),
    });
  } catch (error) {
    console.error('Get runs error:', error);
    res.status(500).json({ error: 'Failed to get runs', code: 'RUNS_ERROR' });
  }
});

router.get('/:id', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    const { data: run, error } = await supabaseAdmin
      .from('runs')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !run) {
      return res.status(404).json({ error: 'Run not found', code: 'RUN_NOT_FOUND' });
    }

    if (run.user_id !== req.user!.id) {
      return res.status(403).json({ error: 'Access denied', code: 'ACCESS_DENIED' });
    }

    const { data: gpsPoints } = await supabaseAdmin
      .from('run_gps_points')
      .select('*')
      .eq('run_id', id)
      .order('recorded_at', { ascending: true });

    res.json({
      ...run,
      gps_points: gpsPoints || [],
    });
  } catch (error) {
    console.error('Get run error:', error);
    res.status(500).json({ error: 'Failed to get run', code: 'RUN_ERROR' });
  }
});

export default router;