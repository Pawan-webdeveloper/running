export declare const XP_PER_KM = 100;
export declare const XP_PACE_BONUS_THRESHOLD_SEC = 300;
export declare const XP_PACE_BONUS_MULTIPLIER = 1.5;
export declare const XP_STREAK_MULTIPLIER = 1.1;
export declare const XP_MANUAL_RUN_MULTIPLIER = 0.5;
export declare const LEVEL_THRESHOLDS: number[];
export declare const BADGES: {
    FIRST_RUN: string;
    KM_10: string;
    KM_50: string;
    KM_100: string;
    STREAK_7: string;
    STREAK_30: string;
    STREAK_100: string;
    EARLY_BIRD: string;
    NIGHT_OWL: string;
    SPEED_DEMON: string;
};
export declare const SUPPORTED_CITIES: string[];
export declare const CITIES_DISPLAY_NAME: Record<string, string>;
export declare const RUN_STATUS: {
    readonly ACTIVE: "active";
    readonly COMPLETED: "completed";
    readonly CANCELLED: "cancelled";
};
export declare const TRANSACTION_TYPE: {
    readonly EARNED: "earned";
    readonly WITHDRAWN: "withdrawn";
    readonly BONUS: "bonus";
    readonly REFUNDED: "refunded";
};
export declare const MAX_SPEED_MPS = 12;
export declare const MAX_POSITION_JUMP_METERS = 500;
export declare const MAX_POSITION_JUMP_SECONDS = 30;
export declare const MIN_GPS_ACCURACY_METERS = 50;
