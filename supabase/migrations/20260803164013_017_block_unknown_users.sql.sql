/*
# Block referrals and rewards for users with Unknown/missing username or IP

## Problem
Users with NULL username or NULL registration_ip can still earn rewards and
make referrals. These should be blocked from referrals and ad rewards.

## Changes
1. Create function `check_user_eligibility` that returns whether a user is
   eligible for rewards and referrals based on having a valid username and IP.
2. Create function `block_suspicious_user` that flags users with missing
   username or IP as referral_blocked.
3. Grant execute to anon and authenticated roles.
*/

CREATE OR REPLACE FUNCTION check_user_eligibility(target_user_id uuid)
RETURNS json AS $$
DECLARE
  u_username text;
  u_ip text;
  u_referral_blocked boolean;
  u_is_suspended boolean;
  u_is_banned boolean;
BEGIN
  SELECT username, registration_ip, referral_blocked, is_suspended, is_banned
  INTO u_username, u_ip, u_referral_blocked, u_is_suspended, u_is_banned
  FROM users WHERE id = target_user_id;

  IF NOT FOUND THEN
    RETURN json_build_object('eligible', false, 'reason', 'User not found');
  END IF;

  IF u_is_banned THEN
    RETURN json_build_object('eligible', false, 'reason', 'User is banned');
  END IF;

  IF u_is_suspended THEN
    RETURN json_build_object('eligible', false, 'reason', 'User is suspended');
  END IF;

  IF u_referral_blocked THEN
    RETURN json_build_object('eligible', false, 'reason', 'Referral blocked');
  END IF;

  IF u_username IS NULL OR u_username = '' OR LOWER(u_username) = 'unknown' THEN
    RETURN json_build_object('eligible', false, 'reason', 'Username is missing or unknown');
  END IF;

  IF u_ip IS NULL OR u_ip = '' THEN
    RETURN json_build_object('eligible', false, 'reason', 'IP address is missing');
  END IF;

  RETURN json_build_object('eligible', true, 'reason', null);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to flag users with missing username/IP as referral_blocked
CREATE OR REPLACE FUNCTION block_suspicious_users()
RETURNS integer AS $$
DECLARE
  blocked_count integer := 0;
BEGIN
  UPDATE users
  SET referral_blocked = true
  WHERE (
    username IS NULL OR username = '' OR LOWER(username) = 'unknown'
    OR registration_ip IS NULL OR registration_ip = ''
  )
  AND is_admin = false
  AND (referral_blocked IS NULL OR referral_blocked = false);

  GET DIAGNOSTICS blocked_count = ROW_COUNT;
  RETURN blocked_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION check_user_eligibility(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION block_suspicious_users() TO anon, authenticated;
