-- Fix: Allow anon role to update settings (the app uses anon key, no Supabase Auth session)
DROP POLICY IF EXISTS "admin_settings" ON settings;
DROP POLICY IF EXISTS "anon_select_settings" ON settings;

CREATE POLICY "anon_select_settings_v2" ON settings
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "anon_insert_settings_v2" ON settings
  FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "anon_update_settings_v2" ON settings
  FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

CREATE POLICY "anon_delete_settings_v2" ON settings
  FOR DELETE TO anon, authenticated USING (true);

-- Fix: Allow anon to update withdraw_requirements_config
DROP POLICY IF EXISTS "update_withdraw_config" ON withdraw_requirements_config;
DROP POLICY IF EXISTS "read_withdraw_config" ON withdraw_requirements_config;

CREATE POLICY "anon_read_withdraw_config_v2" ON withdraw_requirements_config
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "anon_update_withdraw_config_v2" ON withdraw_requirements_config
  FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

CREATE POLICY "anon_insert_withdraw_config_v2" ON withdraw_requirements_config
  FOR INSERT TO anon, authenticated WITH CHECK (true);

-- Fix: Update update_referral_commission to also increment referred_ad_count
CREATE OR REPLACE FUNCTION update_referral_commission(referred_user_id uuid, amount numeric)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  referrer_id uuid;
  current_lifetime numeric;
  commission_amount numeric;
BEGIN
  SELECT referrer_id INTO referrer_id FROM referrals WHERE referred_id = referred_user_id;
  IF referrer_id IS NULL THEN RETURN; END IF;

  SELECT COALESCE(lifetime_commission, 0) INTO current_lifetime
  FROM referrals WHERE referred_id = referred_user_id;

  commission_amount := amount * 0.05;

  UPDATE referrals
  SET lifetime_commission = current_lifetime + commission_amount,
      total_commission = COALESCE(total_commission, 0) + commission_amount,
      referred_ad_count = COALESCE(referred_ad_count, 0) + 1
  WHERE referred_id = referred_user_id;

  PERFORM add_points(referrer_id, commission_amount);
END;
$$;

-- Create function to explicitly increment referred_ad_count
CREATE OR REPLACE FUNCTION increment_referred_ad_count(watcher_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE referrals
  SET referred_ad_count = COALESCE(referred_ad_count, 0) + 1
  WHERE referred_id = watcher_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION increment_referred_ad_count(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION update_referral_commission(uuid, numeric) TO anon, authenticated;
