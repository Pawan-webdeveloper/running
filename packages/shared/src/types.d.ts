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
    created_at: string;
    updated_at: string;
}
export interface GpsPoint {
    lat: number;
    lng: number;
    timestamp: number;
    accuracy: number;
}
export interface RunInput {
    userId: string;
    distanceMeters: number;
    durationSecs: number;
    gpsPoints: GpsPoint[];
    isManual: boolean;
    startTime: string;
    endTime: string;
}
export interface AntiCheatResult {
    isValid: boolean;
    issues: string[];
    distanceMeters: number;
    durationSecs: number;
}
export interface LeaderboardEntry {
    rank: number;
    userId: string;
    name: string;
    avatar: string;
    xp: number;
    level: number;
    city?: string;
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
