export const XP_PER_KM = 100;
export const XP_PACE_BONUS_THRESHOLD_SEC = 300;
export const XP_PACE_BONUS_MULTIPLIER = 1.5;
export const XP_STREAK_MULTIPLIER = 1.1;
export const XP_MANUAL_RUN_MULTIPLIER = 0.5;

export const LEVEL_THRESHOLDS = [
  0, 500, 1500, 3500, 7000, 12000, 20000, 35000, 60000, 100000,
];

export const BADGES = {
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

export const SUPPORTED_CITIES = [
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

export const CITIES_DISPLAY_NAME: Record<string, string> = {
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

export const RUN_STATUS = {
  ACTIVE: 'active',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
} as const;

export const TRANSACTION_TYPE = {
  EARNED: 'earned',
  WITHDRAWN: 'withdrawn',
  BONUS: 'bonus',
  REFUNDED: 'refunded',
} as const;

export const MAX_SPEED_MPS = 12;
export const MAX_POSITION_JUMP_METERS = 500;
export const MAX_POSITION_JUMP_SECONDS = 30;
export const MIN_GPS_ACCURACY_METERS = 50;