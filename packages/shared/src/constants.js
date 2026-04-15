"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MIN_GPS_ACCURACY_METERS = exports.MAX_POSITION_JUMP_SECONDS = exports.MAX_POSITION_JUMP_METERS = exports.MAX_SPEED_MPS = exports.TRANSACTION_TYPE = exports.RUN_STATUS = exports.CITIES_DISPLAY_NAME = exports.SUPPORTED_CITIES = exports.BADGES = exports.LEVEL_THRESHOLDS = exports.XP_MANUAL_RUN_MULTIPLIER = exports.XP_STREAK_MULTIPLIER = exports.XP_PACE_BONUS_MULTIPLIER = exports.XP_PACE_BONUS_THRESHOLD_SEC = exports.XP_PER_KM = void 0;
exports.XP_PER_KM = 100;
exports.XP_PACE_BONUS_THRESHOLD_SEC = 300;
exports.XP_PACE_BONUS_MULTIPLIER = 1.5;
exports.XP_STREAK_MULTIPLIER = 1.1;
exports.XP_MANUAL_RUN_MULTIPLIER = 0.5;
exports.LEVEL_THRESHOLDS = [
    0, 500, 1500, 3500, 7000, 12000, 20000, 35000, 60000, 100000,
];
exports.BADGES = {
    FIRST_RUN: 'first_run',
    KM_10: 'km_10',
    KM_50: 'km_50',
    KM_100: 'km_100',
    STREAK_7: 'streak_7',
    STREAK_30: 'streak_30',
    STREAK_100: 'streak_100',
    EARLY_BIRD: 'early_bird',
    NIGHT_OWL: 'night_owl',
    SPEED_DEMON: 'speed_demon',
};
exports.SUPPORTED_CITIES = [
    'Bangalore',
    'Mumbai',
    'Delhi',
    'Hyderabad',
    'Chennai',
    'Kolkata',
    'Pune',
    'Jaipur',
    'Ahmedabad',
    'Lucknow',
];
exports.CITIES_DISPLAY_NAME = {
    Bangalore: 'Bangalore',
    Mumbai: 'Mumbai',
    Delhi: 'Delhi',
    Hyderabad: 'Hyderabad',
    Chennai: 'Chennai',
    Kolkata: 'Kolkata',
    Pune: 'Pune',
    Jaipur: 'Jaipur',
    Ahmedabad: 'Ahmedabad',
    Lucknow: 'Lucknow',
};
exports.RUN_STATUS = {
    ACTIVE: 'active',
    COMPLETED: 'completed',
    CANCELLED: 'cancelled',
};
exports.TRANSACTION_TYPE = {
    EARNED: 'earned',
    WITHDRAWN: 'withdrawn',
    BONUS: 'bonus',
    REFUNDED: 'refunded',
};
exports.MAX_SPEED_MPS = 12;
exports.MAX_POSITION_JUMP_METERS = 500;
exports.MAX_POSITION_JUMP_SECONDS = 30;
exports.MIN_GPS_ACCURACY_METERS = 50;
