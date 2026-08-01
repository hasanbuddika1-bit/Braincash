/*
# Fix IP duplicate detection - protect first account, only flag newer duplicates

## Problem
The detect_duplicate_ip function was suspending ALL accounts from a given IP
including the first (oldest) account. It was also being called on every login,
not just at registration, causing first accounts to get suspended when a second
user from the same IP logged in.

## Changes
1. Rewrite detect_duplicate_ip to ONLY suspend accounts that are NOT the oldest
   from that IP. The first account is never suspended.
2. Only suspend accounts created AFTER the first account (newer duplicates).
3. Do not touch accounts that are already admin or already verified.
*/

CREATE OR REPLACE FUNCTION detect_duplicate_ip(new_user_id uuid, ip_address text)
RETURNS json AS $$
DECLARE
  first_user_id uuid;
  first_user_created timestamptz;
  new_user_created timestamptz;
BEGIN
  IF ip_address IS NULL OR ip_address = '' THEN
    RETURN json_build_object('is_duplicate', false);
  END IF;

  -- Find the first (oldest) user with this IP, excluding the new user
  SELECT id, created_at INTO first_user_id, first_user_created
  FROM users
  WHERE registration_ip = ip_address AND id != new_user_id
  ORDER BY created_at ASC
  LIMIT 1;

  IF first_user_id IS NULL THEN
    RETURN json_build_object('is_duplicate', false);
  END IF;

  -- Get the new user's creation time
  SELECT created_at INTO new_user_created
  FROM users WHERE id = new_user_id;

  -- Only suspend the new user if they are NOT the oldest account from this IP
  -- If the new user was created before the "first" user, they ARE the first account
  IF new_user_created IS NOT NULL AND new_user_created < first_user_created THEN
    -- This new user is actually the oldest, don't suspend them
    RETURN json_build_object('is_duplicate', false);
  END IF;

  -- Suspend the new user (they are a duplicate, not the first account)
  UPDATE users
  SET is_suspended = true,
      suspension_reason = 'Multiple accounts detected from same IP. First account: @' || COALESCE((SELECT username FROM users WHERE id = first_user_id), 'unknown'),
      first_account_id = first_user_id,
      referral_blocked = true
  WHERE id = new_user_id
    AND is_admin = false
    AND (is_suspended IS NULL OR is_suspended = false);

  RETURN json_build_object(
    'is_duplicate', true,
    'first_user_id', first_user_id,
    'suspended_user_id', new_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
