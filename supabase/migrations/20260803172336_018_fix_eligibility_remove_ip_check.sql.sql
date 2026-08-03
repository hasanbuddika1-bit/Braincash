-- Remove IP-based blocking from eligibility check
-- Users should not be penalized for missing IP at registration time
-- Only ban/suspend/referral_blocked should affect eligibility

CREATE OR REPLACE FUNCTION check_user_eligibility(target_user_id uuid)
RETURNS json AS $$
DECLARE
  u_referral_blocked boolean;
  u_is_suspended boolean;
  u_is_banned boolean;
BEGIN
  SELECT referral_blocked, is_suspended, is_banned
  INTO u_referral_blocked, u_is_suspended, u_is_banned
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

  RETURN json_build_object('eligible', true, 'reason', null);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update block_suspicious_users to only block based on admin action, not missing IP/username
-- This function is now a no-op for automatic blocking; keeping it for compatibility
CREATE OR REPLACE FUNCTION block_suspicious_users()
RETURNS integer AS $$
BEGIN
  -- No longer auto-block users for missing IP or username
  -- These fields are optional and can be updated later
  RETURN 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION check_user_eligibility(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION block_suspicious_users() TO anon, authenticated;
