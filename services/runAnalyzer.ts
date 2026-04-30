import type { GpsPoint, AntiCheatResult } from '../packages/shared/src/types';

interface RouteAnalysis {
  totalDistance: number;
  totalDuration: number;
  avgSpeed: number;
  maxSpeed: number;
  avgPace: number;
  elevationGain: number;
  elevationLoss: number;
  gpsAccuracy: number;
  suspiciousPoints: SuspiciousPoint[];
}

interface SuspiciousPoint {
  index: number;
  type: 'impossible_speed' | 'teleportation' | 'accuracy_issue' | 'stationary';
  details: string;
}

export class RunAnalyzer {
  private points: GpsPoint[];
  private readonly MAX_IMPOSSIBLE_SPEED_MS = 44.72;
  private readonly MIN_ACCURACY_THRESHOLD = 50;
  private readonly STATIONARY_SPEED_THRESHOLD = 0.1;

  constructor(points: GpsPoint[]) {
    this.points = points;
  }

  analyze(): AntiCheatResult {
    const routeAnalysis = this.analyzeRoute();
    
    const issues: string[] = [];
    let isValid = true;

    if (routeAnalysis.suspiciousPoints.length > 0) {
      for (const point of routeAnalysis.suspiciousPoints) {
        issues.push(`${point.type}: ${point.details}`);
      }
      isValid = false;
    }

    if (routeAnalysis.maxSpeed > this.MAX_IMPOSSIBLE_SPEED_MS * 3.6) {
      issues.push('Impossible max speed detected');
      isValid = false;
    }

    if (routeAnalysis.gpsAccuracy > this.MIN_ACCURACY_THRESHOLD) {
      issues.push('GPS accuracy below threshold');
    }

    const distanceMeters = this.calculateTotalDistance();
    const durationSecs = this.calculateTotalDuration();
    const avgPace = distanceMeters > 0 ? (durationSecs / 60) / (distanceMeters / 1000) : 0;

    return {
      isValid,
      issues,
      distanceMeters,
      durationSecs,
    };
  }

  private analyzeRoute(): RouteAnalysis {
    const suspiciousPoints: SuspiciousPoint[] = [];
    let maxSpeed = 0;
    let elevationGain = 0;
    let elevationLoss = 0;
    let totalAccuracy = 0;

    for (let i = 1; i < this.points.length; i++) {
      const prev = this.points[i - 1];
      const curr = this.points[i];

      const distance = this.calculateDistance(
        prev.lat,
        prev.lng,
        curr.lat,
        curr.lng
      );
      const timeDiff = (curr.timestamp - prev.timestamp) / 1000;
      const speed = timeDiff > 0 ? distance / timeDiff : 0;

      if (speed > maxSpeed) {
        maxSpeed = speed;
      }

      if (speed > this.MAX_IMPOSSIBLE_SPEED_MS) {
        suspiciousPoints.push({
          index: i,
          type: 'impossible_speed',
          details: `Speed ${speed.toFixed(1)} m/s at point ${i}`,
        });
      }

      if (distance > 500 && timeDiff < 1) {
        suspiciousPoints.push({
          index: i,
          type: 'teleportation',
          details: `Large jump of ${distance.toFixed(0)}m in ${timeDiff.toFixed(1)}s`,
        });
      }

      if (curr.accuracy > this.MIN_ACCURACY_THRESHOLD) {
        suspiciousPoints.push({
          index: i,
          type: 'accuracy_issue',
          details: `Low accuracy (${curr.accuracy.toFixed(0)}m) at point ${i}`,
        });
      }

      if (speed < this.STATIONARY_SPEED_THRESHOLD && timeDiff > 30) {
        suspiciousPoints.push({
          index: i,
          type: 'stationary',
          details: `Stationary for ${timeDiff.toFixed(0)}s at point ${i}`,
        });
      }

      if (curr.altitude && prev.altitude) {
        const altDiff = curr.altitude - prev.altitude;
        if (altDiff > 0) {
          elevationGain += altDiff;
        } else {
          elevationLoss += Math.abs(altDiff);
        }
      }

      totalAccuracy += curr.accuracy;
    }

    const avgAccuracy = this.points.length > 0 ? totalAccuracy / this.points.length : 0;
    const totalDistance = this.calculateTotalDistance();
    const totalDuration = this.calculateTotalDuration();

    return {
      totalDistance,
      totalDuration,
      avgSpeed: totalDuration > 0 ? totalDistance / totalDuration : 0,
      maxSpeed,
      avgPace: totalDistance > 0 ? (totalDuration / 60) / (totalDistance / 1000) : 0,
      elevationGain,
      elevationLoss,
      gpsAccuracy: avgAccuracy,
      suspiciousPoints,
    };
  }

  calculateTotalDistance(): number {
    let total = 0;
    for (let i = 1; i < this.points.length; i++) {
      const prev = this.points[i - 1];
      const curr = this.points[i];
      total += this.calculateDistance(prev.lat, prev.lng, curr.lat, curr.lng);
    }
    return total;
  }

  calculateTotalDuration(): number {
    if (this.points.length < 2) return 0;
    const first = this.points[0];
    const last = this.points[this.points.length - 1];
    return (last.timestamp - first.timestamp) / 1000;
  }

  private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
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

  smoothPath(accuracyThreshold: number = 30): GpsPoint[] {
    return this.points.filter((p) => p.accuracy <= accuracyThreshold);
  }

  getRouteBounds(): { minLat: number; maxLat: number; minLng: number; maxLng: number } | null {
    if (this.points.length === 0) return null;

    let minLat = this.points[0].lat;
    let maxLat = this.points[0].lat;
    let minLng = this.points[0].lng;
    let maxLng = this.points[0].lng;

    for (const point of this.points) {
      if (point.lat < minLat) minLat = point.lat;
      if (point.lat > maxLat) maxLat = point.lat;
      if (point.lng < minLng) minLng = point.lng;
      if (point.lng > maxLng) maxLng = point.lng;
    }

    return { minLat, maxLat, minLng, maxLng };
  }
}

export function validateAndAnalyzeRun(
  gpsPoints: GpsPoint[],
  userId: string
): AntiCheatResult {
  const analyzer = new RunAnalyzer(gpsPoints);
  return analyzer.analyze();
}

export function calculateCalories(
  distanceMeters: number,
  durationSeconds: number,
  weightKg: number = 70,
  heartRateAvg?: number
): number {
  const MET = 9.8;
  const hours = durationSeconds / 3600;
  let calories = MET * weightKg * hours;

  if (heartRateAvg) {
    const adjustedMET = MET * (1 + (heartRateAvg - 120) / 200);
    calories = adjustedMET * weightKg * hours;
  }

  return Math.round(calories);
}

export function estimateEffortScore(
  distanceMeters: number,
  durationSeconds: number,
  elevationGain: number
): number {
  const distanceKm = distanceMeters / 1000;
  const hours = durationSeconds / 3600;
  const avgSpeed = distanceKm / hours;

  const distanceScore = distanceKm * 10;
  const speedScore = avgSpeed * 5;
  const elevationScore = elevationGain / 10;

  return Math.round(distanceScore + speedScore + elevationScore);
}