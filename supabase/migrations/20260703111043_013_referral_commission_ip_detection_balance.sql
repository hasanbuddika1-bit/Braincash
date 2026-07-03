/*
# Add 5% lifetime commission function and IP detection function

1. update_referral_commission: Awards 5% of earnings to referrer, accumulates in lifetime_commission
2. detect_duplicate_ip: Checks for duplicate IP, suspends newer accounts, keeps first, blocks referrals
3. add_balance: Admin function to add/remove balance from users
*/

-- 5% lifetime referral commission
CREATE OR REPLACE FUNCTION update_referral_commission(referred_user_id uuid, amount numeric)
RETURNS void AS $$
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
      total_commission = COALESCE(total_commission, 0) + commission_amount
  WHERE referred_id = referred_user_id;

  PERFORM add_points(referrer_id, commission_amount);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- IP duplicate detection and auto-suspend
CREATE OR REPLACE FUNCTION detect_duplicate_ip(new_user_id uuid, ip_address text)
RETURNS json AS $$
DECLARE
  first_user_id uuid;
  first_user_created timestamptz;
  existing_count integer;
  result json;
BEGIN
  -- Find the first (oldest) user with this IP
  SELECT id, created_at INTO first_user_id, first_user_created
  FROM users
  WHERE registration_ip = ip_address AND id != new_user_id
  ORDER BY created_at ASC
  LIMIT 1;

  IF first_user_id IS NULL THEN
    RETURN json_build_object('is_duplicate', false);
  END IF;

  -- Count all users with this IP
  SELECT count(*) INTO existing_count
  FROM users
  WHERE registration_ip = ip_address AND id != new_user_id;

  -- Suspend the new user, keep first account
  UPDATE users
  SET is_suspended = true,
      suspension_reason = 'Multiple accounts detected from same IP. First account: @' || COALESCE((SELECT username FROM users WHERE id = first_user_id), 'unknown'),
      first_account_id = first_user_id,
      referral_blocked = true
  WHERE id = new_user_id;

  -- Block referrals for all other accounts from this IP (except the first)
  UPDATE users
  SET referral_blocked = true
  WHERE registration_ip = ip_address AND id != first_user_id;

  RETURN json_build_object(
    'is_duplicate', true,
    'first_user_id', first_user_id,
    'suspended_user_id', new_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Admin add/remove balance
CREATE OR REPLACE FUNCTION admin_adjust_balance(target_user_id uuid, amount numeric, is_removal boolean)
RETURNS json AS $$
DECLARE
  current_points numeric;
  new_points numeric;
BEGIN
  SELECT points INTO current_points FROM users WHERE id = target_user_id;
  IF current_points IS NULL THEN RETURN json_build_object('success', false, 'error', 'User not found'); END IF;

  IF is_removal THEN
    new_points := GREATEST(0, current_points - amount);
    UPDATE users SET points = new_points WHERE id = target_user_id;
  ELSE
    new_points := current_points + amount;
    UPDATE users SET points = new_points, total_earned = total_earned + amount WHERE id = target_user_id;
  END IF;

  RETURN json_build_object('success', true, 'new_balance', new_points);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
