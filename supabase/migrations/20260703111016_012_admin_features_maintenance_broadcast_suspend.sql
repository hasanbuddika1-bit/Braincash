/*
# Admin Features: Maintenance Mode, Broadcast, Suspend/Unsuspend, Balance Management

## Changes:
1. Add maintenance_mode setting
2. Add is_suspended, suspension_reason, suspended_at, first_account_id, referral_blocked columns to users
3. Add total_deposited, deposit_count columns to users
4. Add lifetime_commission column to referrals
5. Create broadcast_log table
*/

INSERT INTO settings (key, value) VALUES ('maintenance_mode', 'false')
ON CONFLICT (key) DO NOTHING;
INSERT INTO settings (key, value) VALUES ('maintenance_message', 'We are performing scheduled maintenance. Please check back soon!')
ON CONFLICT (key) DO NOTHING;

DO $$ BEGIN
  ALTER TABLE users ADD COLUMN IF NOT EXISTS is_suspended boolean DEFAULT false;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE users ADD COLUMN IF NOT EXISTS suspension_reason text;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE users ADD COLUMN IF NOT EXISTS suspended_at timestamptz;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE users ADD COLUMN IF NOT EXISTS first_account_id uuid;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_blocked boolean DEFAULT false;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE users ADD COLUMN IF NOT EXISTS total_deposited numeric DEFAULT 0;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE users ADD COLUMN IF NOT EXISTS deposit_count integer DEFAULT 0;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE referrals ADD COLUMN IF NOT EXISTS lifetime_commission numeric DEFAULT 0;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS broadcast_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid,
  message text,
  image_url text,
  button_text text,
  button_url text,
  sent_count integer DEFAULT 0,
  failed_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE broadcast_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_read_broadcast_log" ON broadcast_log;
CREATE POLICY "anon_read_broadcast_log" ON broadcast_log FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_broadcast_log" ON broadcast_log;
CREATE POLICY "anon_insert_broadcast_log" ON broadcast_log FOR INSERT
  TO anon, authenticated WITH CHECK (true);
