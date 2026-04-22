import { supabaseAdmin } from '../db/supabase';
import {
  XP_PER_KM,
  XP_PACE_BONUS_THRESHOLD_SEC,
  XP_PACE_BONUS_MULTIPLIER,
  XP_STREAK_MULTIPLIER,
  XP_MANUAL_RUN_MULTIPLIER,
  LEVEL_THRESHOLDS,
  BADGES,
} from '@runzilla/shared/constants';
import type { RunInput, Profile } from '@runzilla/shared/types';

export function calculateXP(
  distanceMeters: number,
  avgPaceSecPerKm: number,
  streakDays: number,
  isManual: boolean
): number {
  const distanceKm = distanceMeters / 1000;
  let xp = distanceKm * XP_PER_KM;

  if (avgPaceSecPerKm < XP_PACE_BONUS_THRESHOLD_SEC) {
    xp *= XP_PACE_BONUS_MULTIPLIER;
  }

  if (streakDays > 0) {
    xp *= XP_STREAK_MULTIPLIER;
  }

  if (isManual) {
    xp *= XP_MANUAL_RUN_MULTIPLIER;
  }

  return Math.floor(xp);
}

function getCurrentWeekStart(): string {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
  const monday = new Date(now.setDate(diff));
  return monday.toISOString().split('T')[0];
}

function getCurrentWeekStartIST(): string {
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istTime = new Date(now.getTime() + istOffset);
  const dayOfWeek = istTime.getDay();
  const diff = istTime.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
  const monday = new Date(istTime.setDate(diff));
  return monday.toISOString().split('T')[0];
}

function calculateLevel(lifetimeXp: number): number {
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (lifetimeXp >= LEVEL_THRESHOLDS[i]) {
      return i + 1;
    }
  }
  return 1;
}

export async function updateStreakAndXP(
  userId: string,
  runInput: RunInput
): Promise<{ newXp: number; newStreak: number; newLevel: number; badges: string[] }> {
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (!profile) {
    throw new Error('Profile not found');
  }

  const distance = runInput.distanceMeters ?? runInput.distance_meters ?? 0;
  const pace = runInput.avgPaceSecPerKm ?? runInput.avg_pace_sec_per_km ?? 600;
  const isManual = runInput.isManual ?? runInput.is_manual ?? false;

  const xpEarned = calculateXP(
    distance,
    pace,
    profile.streak_days,
    isManual
  );

  const now = new Date();
  const today = now.toISOString().split('T')[0];
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  let newStreak = profile.streak_days;
  let lastRunDate = profile.last_run_date;

  if (profile.last_run_date === yesterday) {
    newStreak += 1;
  } else if (profile.last_run_date !== today) {
    newStreak = 1;
  }

  const newLifetimeXp = profile.lifetime_xp + xpEarned;
  const newLevel = calculateLevel(newLifetimeXp);

  const updateData: Record<string, unknown> = {
    lifetime_xp: newLifetimeXp,
    streak_days: newStreak,
    last_run_date: today,
    level: newLevel,
  };

  await supabaseAdmin
    .from('profiles')
    .update(updateData)
    .eq('id', userId);

  const badges: string[] = [];

  if (newLifetimeXp >= xpEarned) {
    badges.push(BADGES.FIRST_RUN);
  }

  const { data: totalRuns } = await supabaseAdmin
    .from('runs')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('xp_status', 'confirmed');

  const runCount = totalRuns?.length || 0;

  if (runCount >= 10) badges.push(BADGES.KM_10);
  if (runCount >= 50) badges.push(BADGES.KM_50);
  if (runCount >= 100) badges.push(BADGES.KM_100);

  if (newStreak >= 7) badges.push(BADGES.STREAK_7);
  if (newStreak >= 30) badges.push(BADGES.STREAK_30);
  if (newStreak >= 100) badges.push(BADGES.STREAK_100);

  const runStartTime = runInput.startTime ?? runInput.started_at ?? new Date().toISOString();
  const runStartHour = new Date(runStartTime).getUTCHours();
  if (runStartHour >= 0 && runStartHour < 6) {
    badges.push(BADGES.EARLY_BIRD);
  }
  if (runStartHour >= 21 && runStartHour < 24) {
    badges.push(BADGES.NIGHT_OWL);
  }

  if (pace < 300) {
    badges.push(BADGES.SPEED_DEMON);
  }

  const existingBadges = await supabaseAdmin
    .from('achievements')
    .select('badge_slug')
    .eq('user_id', userId);

  const existingBadgeSet = new Set(existingBadges.data?.map((b) => b.badge_slug) || []);
  const newBadges = badges.filter((b) => !existingBadgeSet.has(b));

  if (newBadges.length > 0) {
    const achievements = newBadges.map((badge) => ({
      user_id: userId,
      badge_slug: badge,
    }));
    await supabaseAdmin.from('achievements').upsert(achievements, { onConflict: 'user_id,badge_slug' });
  }

  return {
    newXp: xpEarned,
    newStreak,
    newLevel,
    badges: newBadges,
  };
}