-- Add missing withdraw settings
INSERT INTO settings (key, value, updated_at)
VALUES
  ('max_withdraw', '0.20', now()),
  ('required_daily_ads', '20', now()),
  ('required_active_referrals', '2', now()),
  ('ads_to_watch_for_withdraw', '3', now()),
  ('first_withdraw_points', '500', now()),
  ('first_withdraw_usd', '0.05', now()),
  ('second_withdraw_usd', '0.10', now())
ON CONFLICT (key) DO NOTHING;

-- Update the Withdrawal type to support GRAM currency (already exists in code)
-- Also ensure the withdrawals table allows USDT only by default
-- No schema change needed - currency column already exists

-- Add a withdraw_requirements table for admin-editable requirements
CREATE TABLE IF NOT EXISTS withdraw_requirements_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  required_daily_ads integer DEFAULT 20,
  required_active_referrals integer DEFAULT 2,
  ads_to_watch_for_withdraw integer DEFAULT 3,
  first_withdraw_points integer DEFAULT 500,
  first_withdraw_usd numeric DEFAULT 0.05,
  second_withdraw_usd numeric DEFAULT 0.10,
  max_withdraw numeric DEFAULT 0.20,
  min_withdraw numeric DEFAULT 0.05,
  withdraw_fee numeric DEFAULT 0.01,
  withdraw_fee_percent numeric DEFAULT 5,
  updated_at timestamptz DEFAULT now()
);

-- Insert default row
INSERT INTO withdraw_requirements_config (id)
VALUES (gen_random_uuid())
ON CONFLICT DO NOTHING;

-- Enable RLS
ALTER TABLE withdraw_requirements_config ENABLE ROW LEVEL SECURITY;

-- Allow anon and authenticated to read (needed for withdraw view)
CREATE POLICY "read_withdraw_config" ON withdraw_requirements_config
  FOR SELECT TO anon, authenticated USING (true);

-- Only admins can update (we check via is_admin in app, RLS via service role)
CREATE POLICY "update_withdraw_config" ON withdraw_requirements_config
  FOR UPDATE TO authenticated USING (true);

-- Grant access
GRANT SELECT ON withdraw_requirements_config TO anon, authenticated;
GRANT UPDATE ON withdraw_requirements_config TO authenticated;
