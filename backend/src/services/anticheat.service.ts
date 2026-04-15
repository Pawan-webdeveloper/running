import { supabaseAdmin } from '../db/supabase';
import {
  MAX_SPEED_MPS,
  MAX_POSITION_JUMP_METERS,
  MAX_POSITION_JUMP_SECONDS,
  MIN_GPS_ACCURACY_METERS,
} from '@runzilla/shared/constants';
import type { GpsPoint, AntiCheatResult } from '@runzilla/shared/types';

function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export async function analyzeRun(runId: string): Promise<AntiCheatResult> {
  const { data: run } = await supabaseAdmin
    .from('runs')
    .select('*, profiles!inner(city)')
    .eq('id', runId)
    .single();

  if (!run) {
    return { passed: false, reasons: ['Run not found'], confidence_score: 0 };
  }

  const { data: gpsPoints } = await supabaseAdmin
    .from('run_gps_points')
    .select('*')
    .eq('run_id', runId)
    .order('recorded_at', { ascending: true });

  if (!gpsPoints || gpsPoints.length === 0) {
    return { passed: false, reasons: ['NO_GPS_DATA'], confidence_score: 0 };
  }

  const reasons: string[] = [];
  let impossibleSpeedCount = 0;
  let teleportCount = 0;

  for (let i = 1; i < gpsPoints.length; i++) {
    const prev = gpsPoints[i - 1];
    const curr = gpsPoints[i];

    const timeDiff =
      (new Date(curr.recorded_at).getTime() - new Date(prev.recorded_at).getTime()) / 1000;
    const distance = calculateDistance(prev.lat, prev.lng, curr.lat, curr.lng);

    if (timeDiff > 0) {
      const speed = distance / timeDiff;

      if (speed > MAX_SPEED_MPS) {
        impossibleSpeedCount++;
        if (impossibleSpeedCount >= 3) {
          reasons.push('IMPOSSIBLE_SPEED');
          break;
        }
      }
    }

    if (timeDiff < MAX_POSITION_JUMP_SECONDS && distance > MAX_POSITION_JUMP_METERS) {
      teleportCount++;
      if (teleportCount >= 1) {
        reasons.push('TELEPORTATION');
        break;
      }
    }
  }

  const durationMinutes = run.duration_seconds / 60;
  const pointsPerMinute = gpsPoints.length / durationMinutes;

  if (durationMinutes > 5 && gpsPoints.length < 50) {
    reasons.push('INSUFFICIENT_GPS_DATA');
  }

  const suspiciousAccuracy = gpsPoints.filter(
    (p) => p.accuracy_m && p.accuracy_m > MIN_GPS_ACCURACY_METERS
  ).length;

  if (suspiciousAccuracy / gpsPoints.length > 0.3) {
    reasons.push('POOR_GPS_ACCURACY');
  }

  const { data: duplicateRuns } = await supabaseAdmin
    .from('runs')
    .select('id')
    .eq('user_id', run.user_id)
    .neq('id', runId)
    .gte('started_at', new Date(new Date(run.started_at).getTime() - 30 * 60 * 1000).toISOString())
    .lte('started_at', new Date(new Date(run.started_at).getTime() + 30 * 60 * 1000).toISOString());

  if (duplicateRuns && duplicateRuns.length > 0) {
    reasons.push('DUPLICATE_RUN');
  }

  let confidenceScore = 1.0;
  if (reasons.includes('IMPOSSIBLE_SPEED')) confidenceScore -= 0.5;
  if (reasons.includes('TELEPORTATION')) confidenceScore -= 0.3;
  if (reasons.includes('DUPLICATE_RUN')) confidenceScore -= 0.2;
  if (reasons.includes('INSUFFICIENT_GPS_DATA')) confidenceScore -= 0.2;

  const passed = reasons.length === 0;

  if (!passed) {
    await supabaseAdmin
      .from('anticheat_flags')
      .insert({
        run_id: runId,
        reason: reasons.join(', '),
        confidence: confidenceScore,
      });

    await supabaseAdmin
      .from('runs')
      .update({
        anticheat_status: 'flagged',
        xp_status: 'provisional',
        anticheat_score: confidenceScore,
      })
      .eq('id', runId);
  } else {
    await supabaseAdmin
      .from('runs')
      .update({
        anticheat_status: 'passed',
        xp_status: 'confirmed',
        anticheat_score: confidenceScore,
      })
      .eq('id', runId);
  }

  return {
    passed,
    reasons,
    confidence_score: confidenceScore,
  };
}