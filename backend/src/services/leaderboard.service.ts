import { Redis } from '@upstash/redis';
import { supabaseAdmin } from '../db/supabase';
import type { LeaderboardEntry, LeaderboardScope } from '@runzilla/shared/types';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || '',
  token: process.env.UPSTASH_REDIS_REST_TOKEN || '',
});

function getWeekStart(date: Date = new Date()): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().split('T')[0];
}

export function getLeaderboardKey(scope: LeaderboardScope, weekStart: string): string {
  if (scope === 'national') {
    return `leaderboard:national:${weekStart}`;
  }
  return `leaderboard:${scope}:${weekStart}`;
}

export async function addXPToLeaderboard(
  userId: string,
  city: string,
  xpDelta: number,
  weekStart?: string
): Promise<void> {
  const week = weekStart || getWeekStart();

  await Promise.all([
    redis.zincrby(getLeaderboardKey('national', week), xpDelta, userId),
    redis.zincrby(getLeaderboardKey(`city:${city}` as LeaderboardScope, week), xpDelta, userId),
  ]);

  const ttl = 8 * 24 * 60 * 60;
  await Promise.all([
    redis.expire(getLeaderboardKey('national', week), ttl),
    redis.expire(getLeaderboardKey(`city:${city}` as LeaderboardScope, week), ttl),
  ]);
}

export async function getLeaderboard(
  scope: LeaderboardScope,
  weekStart?: string,
  limit: number = 100
): Promise<LeaderboardEntry[]> {
  const week = weekStart || getWeekStart();
  const key = getLeaderboardKey(scope, week);

  const results = await redis.zrevrange(key, 0, limit - 1, { withScore: true });

  if (!results || results.length === 0) {
    return [];
  }

  const userIds: string[] = [];
  for (let i = 0; i < results.length; i += 2) {
    userIds.push(results[i] as string);
  }

  const { data: profiles } = await supabaseAdmin
    .from('profiles')
    .select('id, display_name, city, avatar_index')
    .in('id', userIds);

  const profileMap = new Map(profiles?.map((p) => [p.id, p]) || []);

  const entries: LeaderboardEntry[] = [];
  for (let i = 0; i < results.length; i += 2) {
    const userId = results[i] as string;
    const score = Math.floor(parseFloat(results[i + 1] as string));
    const profile = profileMap.get(userId);

    if (profile) {
      entries.push({
        rank: Math.floor(i / 2) + 1,
        user_id: userId,
        display_name: profile.display_name,
        city: profile.city,
        avatar_index: profile.avatar_index,
        xp_score: score,
        is_current_user: false,
      });
    }
  }

  return entries;
}

export async function getUserRank(
  userId: string,
  scope: LeaderboardScope,
  weekStart?: string
): Promise<{ rank: number; score: number } | null> {
  const week = weekStart || getWeekStart();
  const key = getLeaderboardKey(scope, week);

  const [rank, score] = await Promise.all([
    redis.zrevrank(key, userId),
    redis.zscore(key, userId),
  ]);

  if (rank === null) {
    return null;
  }

  return {
    rank: rank + 1,
    score: Math.floor(parseFloat(score || '0')),
  };
}

export async function snapshotLeaderboard(weekStart: string): Promise<void> {
  const scopes: LeaderboardScope[] = ['national'];

  const { data: cities } = await supabaseAdmin
    .from('profiles')
    .select('city')
    .not('city', 'is', null);

  const uniqueCities = [...new Set(cities?.map((p) => p.city) || [])];
  for (const city of uniqueCities) {
    scopes.push(`city:${city}` as LeaderboardScope);
  }

  for (const scope of scopes) {
    const entries = await getLeaderboard(scope, weekStart, 1000);

    const snapshots = entries.map((entry, index) => ({
      week_start: weekStart,
      scope,
      user_id: entry.user_id,
      rank: index + 1,
      xp_score: entry.xp_score,
    }));

    if (snapshots.length > 0) {
      await supabaseAdmin
        .from('leaderboard_snapshots')
        .upsert(snapshots, { onConflict: 'week_start,scope,user_id' });
    }
  }
}

export async function resetLeaderboard(weekStart: string): Promise<void> {
  const scopes: LeaderboardScope[] = ['national'];

  const { data: cities } = await supabaseAdmin
    .from('profiles')
    .select('city')
    .not('city', 'is', null);

  const uniqueCities = [...new Set(cities?.map((p) => p.city) || [])];
  for (const city of uniqueCities) {
    scopes.push(`city:${city}` as LeaderboardScope);
  }

  for (const scope of scopes) {
    const key = getLeaderboardKey(scope, weekStart);
    await redis.del(key);
  }
}