/*
# Add Reward Codes Table and Game Play Tracking

1. New Tables
- `reward_codes` - Stores redeemable codes that admins create and users claim
  - `id` (uuid, primary key)
  - `code` (text, unique) - the code string users enter
  - `reward_points` (integer) - points awarded on claim
  - `max_claims` (integer) - max number of users who can claim
  - `claimed_count` (integer, default 0) - how many have claimed
  - `expires_at` (timestamptz, nullable) - when the code expires
  - `is_active` (boolean, default true)
  - `created_at` (timestamptz, default now)
- `reward_code_claims` - Tracks which users claimed which codes
  - `id` (uuid, primary key)
  - `code_id` (uuid, references reward_codes)
  - `user_id` (uuid, references users)
  - `claimed_at` (timestamptz, default now)
  - Unique constraint on (code_id, user_id) to prevent double claims
- `game_plays` - Tracks daily game plays per user per game for the 2-chance limit
  - `id` (uuid, primary key)
  - `user_id` (uuid, references users)
  - `game_id` (text) - which game was played
  - `played_at` (timestamptz, default now)

2. Security
- Enable RLS on all new tables
- anon/authenticated can read active reward codes and insert claims
- anon/authenticated can insert game_plays
- Admin access via existing patterns

3. Indexes
- Index on game_plays (user_id, game_id, played_at) for daily limit queries
- Index on reward_code_claims (user_id) for user history
*/

CREATE TABLE IF NOT EXISTS reward_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  reward_points integer NOT NULL DEFAULT 10,
  max_claims integer NOT NULL DEFAULT 100,
  claimed_count integer NOT NULL DEFAULT 0,
  expires_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE reward_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_active_codes" ON reward_codes;
CREATE POLICY "anon_select_active_codes" ON reward_codes FOR SELECT
  TO anon, authenticated USING (is_active = true);

DROP POLICY IF EXISTS "anon_insert_codes" ON reward_codes;
CREATE POLICY "anon_insert_codes" ON reward_codes FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_codes" ON reward_codes;
CREATE POLICY "anon_update_codes" ON reward_codes FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_codes" ON reward_codes;
CREATE POLICY "anon_delete_codes" ON reward_codes FOR DELETE
  TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS reward_code_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code_id uuid NOT NULL REFERENCES reward_codes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  claimed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(code_id, user_id)
);

ALTER TABLE reward_code_claims ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_claims" ON reward_code_claims;
CREATE POLICY "anon_select_claims" ON reward_code_claims FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_claims" ON reward_code_claims;
CREATE POLICY "anon_insert_claims" ON reward_code_claims FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_claims" ON reward_code_claims;
CREATE POLICY "anon_delete_claims" ON reward_code_claims FOR DELETE
  TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS game_plays (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  game_id text NOT NULL,
  played_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE game_plays ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_plays" ON game_plays;
CREATE POLICY "anon_select_plays" ON game_plays FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_plays" ON game_plays;
CREATE POLICY "anon_insert_plays" ON game_plays FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_plays" ON game_plays;
CREATE POLICY "anon_delete_plays" ON game_plays FOR DELETE
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_game_plays_user_game_date ON game_plays (user_id, game_id, played_at);
CREATE INDEX IF NOT EXISTS idx_reward_code_claims_user ON reward_code_claims (user_id);

-- Function to claim a reward code atomically
CREATE OR REPLACE FUNCTION claim_reward_code(p_code text, p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_reward reward_codes;
  v_existing reward_code_claims;
BEGIN
  SELECT * INTO v_reward FROM reward_codes WHERE code = p_code AND is_active = true FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid or expired code');
  END IF;

  IF v_reward.expires_at IS NOT NULL AND v_reward.expires_at < now() THEN
    RETURN jsonb_build_object('success', false, 'error', 'This code has expired');
  END IF;

  IF v_reward.claimed_count >= v_reward.max_claims THEN
    RETURN jsonb_build_object('success', false, 'error', 'This code has reached its claim limit');
  END IF;

  SELECT * INTO v_existing FROM reward_code_claims WHERE code_id = v_reward.id AND user_id = p_user_id;
  IF FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'You already claimed this code');
  END IF;

  INSERT INTO reward_code_claims (code_id, user_id) VALUES (v_reward.id, p_user_id);
  UPDATE reward_codes SET claimed_count = claimed_count + 1 WHERE id = v_reward.id;
  PERFORM add_points(p_user_id, v_reward.reward_points);

  RETURN jsonb_build_object('success', true, 'reward', v_reward.reward_points);
END;
$$;

GRANT EXECUTE ON FUNCTION claim_reward_code(text, uuid) TO anon, authenticated;

-- Function to check and record a game play (enforces 2 per day limit)
CREATE OR REPLACE FUNCTION check_game_play(p_user_id uuid, p_game_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count integer;
  v_today date := CURRENT_DATE;
BEGIN
  SELECT count(*) INTO v_count FROM game_plays
  WHERE user_id = p_user_id AND game_id = p_game_id AND played_at::date = v_today;

  IF v_count >= 2 THEN
    RETURN jsonb_build_object('allowed', false, 'plays_today', v_count, 'message', 'You have used both chances for this game today. Come back tomorrow!');
  END IF;

  INSERT INTO game_plays (user_id, game_id) VALUES (p_user_id, p_game_id);

  RETURN jsonb_build_object('allowed', true, 'plays_today', v_count + 1, 'remaining', 1 - v_count);
END;
$$;

GRANT EXECUTE ON FUNCTION check_game_play(uuid, text) TO anon, authenticated;
