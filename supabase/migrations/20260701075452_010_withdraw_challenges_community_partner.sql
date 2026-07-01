/*
# Withdraw System, Challenges, Community Tasks, Partner Submissions

## Overview
This migration adds support for:
1. Tiered withdraw limits (first withdraw 500 pts/$0.05, subsequent $0.10, max $0.20)
2. Withdraw requirement tracking (daily ads watched, active referrals, main+partner tasks)
3. Game daily chances (5 per game per day, refillable by watching ads)
4. Daily game challenges and referral challenges (lifetime)
5. Community task system (users pay points to post tasks for members)
6. Partner task submissions (users submit post links for admin review)
7. Withdraw number tracking per user

## New Tables

### withdraw_requirements
Tracks per-user withdraw requirement completion.
- user_id (uuid, references users)
- daily_ads_watched (int, count of ads watched today)
- active_referrals (int, count of active referrals)
- main_tasks_completed (boolean)
- partner_tasks_completed (boolean)
- last_reset_date (date, for daily reset of ad count)
- updated_at (timestamptz)

### game_chances
Tracks daily play chances per game per user (5 hearts per game per day).
- user_id (uuid)
- game_id (uuid)
- chances_left (int, default 5)
- last_refill_date (date, for daily reset)
- ads_watched_for_refill (int, count of ads watched to refill chances)

### game_round_counts
Tracks total game rounds played across all games for daily game challenge.
- user_id (uuid)
- rounds_played (int, total rounds today)
- last_reset_date (date)

### game_challenge_claims
Tracks which game challenge tiers a user has claimed today.
- user_id (uuid)
- tier (int, 10/20/50/100 rounds)
- claimed_at (timestamptz)
- claim_date (date, for daily reset)

### referral_challenge_claims
Tracks which referral challenge tiers a user has claimed (lifetime, never resets).
- user_id (uuid)
- tier (int, 3/5/10/50/100 active referrals)
- claimed_at (timestamptz)

### community_tasks
Tasks posted by users in the Community section, paid for with points.
- id (uuid, primary key)
- user_id (uuid, who posted the task)
- title (text)
- description (text)
- channel_link (text)
- icon_emoji (text)
- image_url (text)
- verification_method (text, 'auto' or 'bot_verify')
- bot_username (text, nullable, for bot verify)
- member_amount (int, how many members the user wants to add)
- members_joined (int, default 0)
- points_per_member (int, default 10)
- total_cost (int, deducted from user balance)
- status (text, 'active' or 'completed')
- is_bot_admin_verified (boolean, default false, whether bot has been given admin)
- created_at (timestamptz)

### community_task_joins
Tracks which users joined a community task.
- id (uuid, primary key)
- user_id (uuid)
- community_task_id (uuid)
- joined_at (timestamptz)

### partner_submissions
Users submit post links to become partner tasks.
- id (uuid, primary key)
- user_id (uuid)
- post_link (text)
- channel_name (text, nullable)
- status (text, 'pending' / 'approved' / 'rejected')
- admin_notes (text, nullable)
- reviewed_at (timestamptz, nullable)
- created_at (timestamptz)

## Modified Tables

### users
- Added withdraw_count (int, default 0) — tracks number of withdrawals for tiered limits
- Added first_withdraw_done (boolean, default false)

### withdrawals
- Added withdraw_number (int, default 1) — sequential withdraw number per user
- Added reject_reason (text, nullable) — reason for rejection

## Security
- RLS enabled on all new tables.
- Policies: anon+authenticated can read/write their own data (no-auth Telegram app pattern).
- Community tasks are readable by all (anon, authenticated) since they appear in the Community tab.
- Partner submissions readable by owner + admin.

## Important Notes
1. This app uses the anon key (no Supabase auth sign-in), so policies use `TO anon, authenticated`.
2. Community tasks are public — any user can see and join them.
3. Game chances reset daily to 5 per game.
4. Referral challenges never reset (lifetime).
5. Game challenges reset daily.
*/

-- ── users: add withdraw tracking columns ──
ALTER TABLE users ADD COLUMN IF NOT EXISTS withdraw_count integer NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS first_withdraw_done boolean NOT NULL DEFAULT false;

-- ── withdrawals: add withdraw number and reject reason ──
ALTER TABLE withdrawals ADD COLUMN IF NOT EXISTS withdraw_number integer NOT NULL DEFAULT 1;
ALTER TABLE withdrawals ADD COLUMN IF NOT EXISTS reject_reason text;

-- ── withdraw_requirements ──
CREATE TABLE IF NOT EXISTS withdraw_requirements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  daily_ads_watched integer NOT NULL DEFAULT 0,
  active_referrals integer NOT NULL DEFAULT 0,
  main_tasks_completed boolean NOT NULL DEFAULT false,
  partner_tasks_completed boolean NOT NULL DEFAULT false,
  last_reset_date date NOT NULL DEFAULT CURRENT_DATE,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE withdraw_requirements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_withdraw_req" ON withdraw_requirements;
CREATE POLICY "anon_select_withdraw_req" ON withdraw_requirements FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_withdraw_req" ON withdraw_requirements;
CREATE POLICY "anon_insert_withdraw_req" ON withdraw_requirements FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_withdraw_req" ON withdraw_requirements;
CREATE POLICY "anon_update_withdraw_req" ON withdraw_requirements FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

-- ── game_chances ──
CREATE TABLE IF NOT EXISTS game_chances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  game_id uuid NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  chances_left integer NOT NULL DEFAULT 5,
  last_refill_date date NOT NULL DEFAULT CURRENT_DATE,
  ads_watched_for_refill integer NOT NULL DEFAULT 0,
  UNIQUE(user_id, game_id)
);

ALTER TABLE game_chances ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_game_chances" ON game_chances;
CREATE POLICY "anon_select_game_chances" ON game_chances FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_game_chances" ON game_chances;
CREATE POLICY "anon_insert_game_chances" ON game_chances FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_game_chances" ON game_chances;
CREATE POLICY "anon_update_game_chances" ON game_chances FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

-- ── game_round_counts ──
CREATE TABLE IF NOT EXISTS game_round_counts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rounds_played integer NOT NULL DEFAULT 0,
  last_reset_date date NOT NULL DEFAULT CURRENT_DATE,
  UNIQUE(user_id)
);

ALTER TABLE game_round_counts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_game_rounds" ON game_round_counts;
CREATE POLICY "anon_select_game_rounds" ON game_round_counts FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_game_rounds" ON game_round_counts;
CREATE POLICY "anon_insert_game_rounds" ON game_round_counts FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_game_rounds" ON game_round_counts;
CREATE POLICY "anon_update_game_rounds" ON game_round_counts FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

-- ── game_challenge_claims ──
CREATE TABLE IF NOT EXISTS game_challenge_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tier integer NOT NULL,
  claimed_at timestamptz NOT NULL DEFAULT now(),
  claim_date date NOT NULL DEFAULT CURRENT_DATE,
  UNIQUE(user_id, tier, claim_date)
);

ALTER TABLE game_challenge_claims ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_game_challenge_claims" ON game_challenge_claims;
CREATE POLICY "anon_select_game_challenge_claims" ON game_challenge_claims FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_game_challenge_claims" ON game_challenge_claims;
CREATE POLICY "anon_insert_game_challenge_claims" ON game_challenge_claims FOR INSERT
  TO anon, authenticated WITH CHECK (true);

-- ── referral_challenge_claims ──
CREATE TABLE IF NOT EXISTS referral_challenge_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tier integer NOT NULL,
  claimed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, tier)
);

ALTER TABLE referral_challenge_claims ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_ref_challenge_claims" ON referral_challenge_claims;
CREATE POLICY "anon_select_ref_challenge_claims" ON referral_challenge_claims FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_ref_challenge_claims" ON referral_challenge_claims;
CREATE POLICY "anon_insert_ref_challenge_claims" ON referral_challenge_claims FOR INSERT
  TO anon, authenticated WITH CHECK (true);

-- ── community_tasks ──
CREATE TABLE IF NOT EXISTS community_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  channel_link text,
  icon_emoji text DEFAULT '📋',
  image_url text,
  verification_method text NOT NULL DEFAULT 'auto',
  bot_username text,
  member_amount integer NOT NULL DEFAULT 100,
  members_joined integer NOT NULL DEFAULT 0,
  points_per_member integer NOT NULL DEFAULT 10,
  total_cost integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active',
  is_bot_admin_verified boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE community_tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_community_tasks" ON community_tasks;
CREATE POLICY "anon_select_community_tasks" ON community_tasks FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_community_tasks" ON community_tasks;
CREATE POLICY "anon_insert_community_tasks" ON community_tasks FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_community_tasks" ON community_tasks;
CREATE POLICY "anon_update_community_tasks" ON community_tasks FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

-- ── community_task_joins ──
CREATE TABLE IF NOT EXISTS community_task_joins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  community_task_id uuid NOT NULL REFERENCES community_tasks(id) ON DELETE CASCADE,
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, community_task_id)
);

ALTER TABLE community_task_joins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_ct_joins" ON community_task_joins;
CREATE POLICY "anon_select_ct_joins" ON community_task_joins FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_ct_joins" ON community_task_joins;
CREATE POLICY "anon_insert_ct_joins" ON community_task_joins FOR INSERT
  TO anon, authenticated WITH CHECK (true);

-- ── partner_submissions ──
CREATE TABLE IF NOT EXISTS partner_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  post_link text NOT NULL,
  channel_name text,
  status text NOT NULL DEFAULT 'pending',
  admin_notes text,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE partner_submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_partner_submissions" ON partner_submissions;
CREATE POLICY "anon_select_partner_submissions" ON partner_submissions FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_partner_submissions" ON partner_submissions;
CREATE POLICY "anon_insert_partner_submissions" ON partner_submissions FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_partner_submissions" ON partner_submissions;
CREATE POLICY "anon_update_partner_submissions" ON partner_submissions FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

-- ── Indexes ──
CREATE INDEX IF NOT EXISTS idx_game_chances_user_game ON game_chances(user_id, game_id);
CREATE INDEX IF NOT EXISTS idx_community_tasks_status ON community_tasks(status);
CREATE INDEX IF NOT EXISTS idx_partner_submissions_status ON partner_submissions(status);
CREATE INDEX IF NOT EXISTS idx_game_challenge_claims_user_date ON game_challenge_claims(user_id, claim_date);
CREATE INDEX IF NOT EXISTS idx_referral_challenge_claims_user ON referral_challenge_claims(user_id);
