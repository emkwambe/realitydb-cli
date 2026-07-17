-- Schema v3: Entitlements, Certificates, Badges
-- Run against D1 realitydb-labs (1fa51a0c-c851-4cec-8e91-ac1ee2079ff8)

-- ============================================================
-- ENTITLEMENTS: Tier-based access control
-- ============================================================

CREATE TABLE IF NOT EXISTS entitlements (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  tier TEXT NOT NULL DEFAULT 'free',       -- free, core, compliance, enterprise
  max_rows INTEGER NOT NULL DEFAULT 5000,
  max_active_labs INTEGER NOT NULL DEFAULT 2,
  downloads_per_month INTEGER NOT NULL DEFAULT 0,
  downloads_used_this_month INTEGER DEFAULT 0,
  labs_created_today INTEGER DEFAULT 0,
  labs_daily_limit INTEGER NOT NULL DEFAULT 5,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  status TEXT DEFAULT 'active',            -- active, cancelled, past_due
  current_period_start TEXT,
  current_period_end TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_entitlements_user ON entitlements(user_id);
CREATE INDEX IF NOT EXISTS idx_entitlements_tier ON entitlements(tier);
CREATE INDEX IF NOT EXISTS idx_entitlements_stripe ON entitlements(stripe_customer_id);

-- ============================================================
-- DATASET PURCHASES: One-time dataset purchases
-- ============================================================

CREATE TABLE IF NOT EXISTS dataset_purchases (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  template TEXT NOT NULL,
  rows INTEGER NOT NULL,
  price_cents INTEGER NOT NULL,
  stripe_payment_id TEXT,
  status TEXT DEFAULT 'pending',           -- pending, completed, refunded
  lab_credits_remaining INTEGER DEFAULT 3,
  download_count INTEGER DEFAULT 0,
  download_limit INTEGER DEFAULT 3,
  created_at TEXT NOT NULL,
  completed_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_purchases_user ON dataset_purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_purchases_template ON dataset_purchases(user_id, template);

-- Idempotency guard for webhook replays (Dodo/Stripe payment IDs land here) —
-- applied to production via migration, added to CREATE-form schema for parity.
CREATE UNIQUE INDEX IF NOT EXISTS idx_dataset_purchases_stripe_payment_id
  ON dataset_purchases(stripe_payment_id)
  WHERE stripe_payment_id IS NOT NULL;

-- ============================================================
-- CERTIFICATES: Synced from Supabase for public verification
-- ============================================================

CREATE TABLE IF NOT EXISTS certificates (
  id TEXT PRIMARY KEY,
  cert_id TEXT UNIQUE NOT NULL,            -- e.g. RDB-F1A2B3C
  user_id TEXT NOT NULL,
  attempt_id TEXT,
  level TEXT NOT NULL,                     -- foundations, analyst, advanced, specialist
  score INTEGER NOT NULL,
  grade TEXT NOT NULL,                     -- Certified, Distinction
  display_name TEXT,
  challenge_count INTEGER,
  time_taken_seconds INTEGER,
  template_used TEXT,                      -- for Domain Specialist certs
  issued_at TEXT NOT NULL,
  verified_count INTEGER DEFAULT 0         -- how many times employers checked
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_certificates_certid ON certificates(cert_id);
CREATE INDEX IF NOT EXISTS idx_certificates_user ON certificates(user_id);
CREATE INDEX IF NOT EXISTS idx_certificates_level ON certificates(level);

-- ============================================================
-- BADGES: Skill micro-credentials
-- ============================================================

CREATE TABLE IF NOT EXISTS badges (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  badge_type TEXT NOT NULL,                -- join_master, window_pro, etc.
  badge_tier TEXT NOT NULL DEFAULT 'bronze', -- bronze, silver, gold, platinum
  score INTEGER,                           -- aggregate score that earned this tier
  challenges_completed INTEGER,
  earned_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_badges_user_type ON badges(user_id, badge_type);
CREATE INDEX IF NOT EXISTS idx_badges_type ON badges(badge_type);

-- ============================================================
-- TIER DEFINITIONS (reference — not a table, used in code)
-- ============================================================
-- free:       max_rows=5000,  max_active_labs=2,  downloads=0,  labs_daily=5
-- core:       max_rows=50000, max_active_labs=3,  downloads=2,  labs_daily=10
-- compliance: max_rows=100000,max_active_labs=10, downloads=5,  labs_daily=20
-- enterprise: max_rows=1000000,max_active_labs=-1, downloads=-1, labs_daily=-1

-- ============================================================
-- PRICING REFERENCE (used in code, not stored)
-- ============================================================
-- banking:      5k=free, 10k=4900, 50k=4900, 100k=7900
-- oncology:     5k=free, 10k=4900, 50k=9900, 100k=14900
-- healthcare:   5k=free, 10k=4900, 50k=9900, 100k=14900
-- supply-chain: 5k=free, 10k=4900, 50k=4900, 100k=7900
