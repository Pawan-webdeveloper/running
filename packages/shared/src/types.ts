export interface Profile {
  id: string;
  phone: string;
  name: string | null;
  avatar: string | null;
  city: string | null;
  xp: number;
  level: number;
  badges: string[];
  lifetime_km: number;
  streak_days: number;
  last_run_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface Run {
  id: string;
  user_id: string;
  status: 'active' | 'completed' | 'cancelled';
  distance_meters: number;
  duration_secs: number;
  avg_pace_sec_per_km: number;
  xp_earned: number;
  money_earned_paise: number;
  start_time: string;
  end_time: string | null;
  route: any;
  elevation_gain: number;
  elevation_loss: number;
  calories: number;
  steps: number;
  created_at: string;
  updated_at: string;
}

export interface GpsPoint {
  lat: number;
  lng: number;
  altitude?: number;
  timestamp: number;
  accuracy: number;
  speed?: number;
  heading?: number;
}

export interface EnhancedGpsPoint extends GpsPoint {
  smoothed: boolean;
  sensorData?: SensorData;
}

export interface SensorData {
  accelerometer?: { x: number; y: number; z: number };
  gyroscope?: { x: number; y: number; z: number };
  barometer?: { pressure: number; relativeAltitude: number };
}

export interface Segment {
  id: string;
  name: string;
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  distance: number;
  created_at?: string;
}

export interface SegmentResult {
  segment: Segment;
  time: number;
  rank: number;
  pr: boolean;
}

export interface PrivacyZone {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  isActive: boolean;
}

export interface RunInput {
  [key: string]: any;
  userId: string;
  user_id?: string;
  distanceMeters: number;
  distance_meters?: number;
  durationSecs: number;
  duration_secs?: number;
  duration_seconds?: number;
  elevation_gain?: number;
  elevation_gain_m?: number;
  elevation_loss?: number;
  calories?: number;
  steps?: number;
  gpsPoints: GpsPoint[];
  gps_points?: GpsPoint[];
  route_image_url?: string;
  isManual: boolean;
  is_manual?: boolean;
  startTime: string;
  started_at?: string;
  endTime: string;
  ended_at?: string;
  avgPaceSecPerKm: number;
  avg_pace_sec_per_km?: number;
}

export interface AntiCheatResult {
  [key: string]: any;
  isValid: boolean;
  passed?: boolean;
  issues: string[];
  reasons?: string[];
  confidence_score?: number;
  distanceMeters: number;
  distance_meters?: number;
  durationSecs: number;
  duration_secs?: number;
}

export interface LeaderboardEntry {
  [key: string]: any;
  rank: number;
  userId: string;
  user_id?: string;
  name: string;
  display_name?: string;
  avatar: string;
  avatar_index?: number;
  xp: number;
  xp_score?: number;
  level: number;
  city?: string;
  is_current_user?: boolean;
}

export interface AntiCheatResult {
  isValid: boolean;
  passed?: boolean;
  issues: string[];
  reasons?: string[];
  confidence_score?: number;
  distanceMeters: number;
  distance_meters?: number;
  durationSecs: number;
  duration_secs?: number;
  [key: string]: any;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  user_id?: string;
  name: string;
  display_name?: string;
  avatar: string;
  avatar_index?: number;
  xp: number;
  xp_score?: number;
  level: number;
  city?: string;
  [key: string]: any;
}

export type LeaderboardScope = 'national' | `city:${string}`;

export interface Wallet {
  id: string;
  user_id: string;
  balance_paise: number;
  lifetime_earned_paise: number;
  created_at: string;
  updated_at: string;
}

export interface Transaction {
  id: string;
  wallet_id: string;
  type: 'earned' | 'withdrawn' | 'bonus' | 'refunded';
  amount_paise: number;
  description: string;
  run_id: string | null;
  created_at: string;
}

export interface AuthResult {
  data?: {
    token: string;
    is_new_user: boolean;
    profile: Profile;
  };
  error?: string;
}