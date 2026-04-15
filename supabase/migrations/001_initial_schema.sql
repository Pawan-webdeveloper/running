-- Runzilla MVP Schema - Migration 001
-- Core tables for run-to-earn app

-- Users (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  phone TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  city TEXT NOT NULL,
  avatar_index INTEGER DEFAULT 0,
  level INTEGER DEFAULT 1,
  lifetime_xp INTEGER DEFAULT 0,
  streak_days INTEGER DEFAULT 0,
  last_run_date DATE,
  kyc_status TEXT DEFAULT 'pending' CHECK (kyc_status IN ('pending', 'submitted', 'verified', 'rejected')),
  aadhaar_hash TEXT,
  pan_number TEXT,
  upi_id TEXT,
  is_banned BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Runs
CREATE TABLE IF NOT EXISTS public.runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ NOT NULL,
  distance_meters FLOAT NOT NULL,
  duration_seconds INTEGER NOT NULL,
  avg_pace_sec_per_km FLOAT,
  elevation_gain_m FLOAT DEFAULT 0,
  xp_earned INTEGER DEFAULT 0,
  xp_status TEXT DEFAULT 'provisional' CHECK (xp_status IN ('provisional', 'confirmed', 'reversed')),
  anticheat_status TEXT DEFAULT 'pending' CHECK (anticheat_status IN ('pending', 'passed', 'flagged', 'banned')),
  anticheat_score FLOAT,
  route_image_url TEXT,
  is_manual BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- GPS points
CREATE TABLE IF NOT EXISTS public.run_gps_points (
  id BIGSERIAL PRIMARY KEY,
  run_id UUID NOT NULL REFERENCES public.runs(id) ON DELETE CASCADE,
  recorded_at TIMESTAMPTZ NOT NULL,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  speed_mps FLOAT,
  elevation_m FLOAT,
  accuracy_m FLOAT
);

CREATE INDEX IF NOT EXISTS idx_gps_run_id ON public.run_gps_points(run_id);

-- Leaderboard snapshots
CREATE TABLE IF NOT EXISTS public.leaderboard_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_start DATE NOT NULL,
  scope TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  rank INTEGER NOT NULL,
  xp_score INTEGER NOT NULL,
  days_held_top3 INTEGER DEFAULT 0,
  payout_amount_paise INTEGER DEFAULT 0,
  payout_status TEXT DEFAULT 'pending' CHECK (payout_status IN ('pending', 'processing', 'paid', 'failed', 'withheld'))
);

CREATE INDEX IF NOT EXISTS idx_snapshot_week_scope ON public.leaderboard_snapshots(week_start, scope);

-- Wallet / payouts
CREATE TABLE IF NOT EXISTS public.payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  amount_paise INTEGER NOT NULL,
  method TEXT DEFAULT 'upi',
  upi_id TEXT,
  razorpay_payout_id TEXT,
  status TEXT DEFAULT 'initiated' CHECK (status IN ('initiated', 'processing', 'paid', 'failed')),
  failure_reason TEXT,
  tds_paise INTEGER DEFAULT 0,
  initiated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Wallet balance
CREATE TABLE IF NOT EXISTS public.wallets (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id),
  balance_paise INTEGER DEFAULT 0,
  lifetime_earned_paise INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Achievements
CREATE TABLE IF NOT EXISTS public.achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  badge_slug TEXT NOT NULL,
  earned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, badge_slug)
);

-- Social: follows
CREATE TABLE IF NOT EXISTS public.follows (
  follower_id UUID NOT NULL REFERENCES public.profiles(id),
  following_id UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (follower_id, following_id)
);

-- Kudos
CREATE TABLE IF NOT EXISTS public.kudos (
  giver_id UUID NOT NULL REFERENCES public.profiles(id),
  run_id UUID NOT NULL REFERENCES public.runs(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (giver_id, run_id)
);

-- Anti-cheat flags
CREATE TABLE IF NOT EXISTS public.anticheat_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES public.runs(id),
  reason TEXT NOT NULL,
  confidence FLOAT,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'confirmed_cheat', 'cleared', 'appealed')),
  reviewer_id UUID REFERENCES public.profiles(id),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payouts ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users read own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Public profiles readable" ON public.profiles FOR SELECT USING (true);

CREATE POLICY "Users insert own runs" ON public.runs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users read own runs" ON public.runs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users read own wallet" ON public.wallets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users read own payouts" ON public.payouts FOR SELECT USING (auth.uid() = user_id);

-- Enable Row Level Security for other tables
ALTER TABLE public.run_gps_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leaderboard_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kudos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.anticheat_flags ENABLE ROW LEVEL SECURITY;

-- Public read policies for leaderboard
CREATE POLICY "Leaderboard snapshots readable" ON public.leaderboard_snapshots FOR SELECT USING (true);
CREATE POLICY "Runs readable" ON public.runs FOR SELECT USING (true);
CREATE POLICY "Achievements readable" ON public.achievements FOR SELECT USING (true);
CREATE POLICY "Kudos readable" ON public.kudos FOR SELECT USING (true);
CREATE POLICY "Follows readable" ON public.follows FOR SELECT USING (true);

-- GPS points policies
CREATE POLICY "Users read own GPS points" ON public.run_gps_points FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.runs WHERE runs.id = run_gps_points.run_id AND runs.user_id = auth.uid())
);