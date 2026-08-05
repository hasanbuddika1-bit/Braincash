-- Updated deduct_points: also increments withdraw_count and sets first_withdraw_done atomically
DROP FUNCTION IF EXISTS deduct_points(UUID, INTEGER);
CREATE OR REPLACE FUNCTION deduct_points(user_uuid UUID, amount INTEGER)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_points INTEGER;
BEGIN
  SELECT points INTO current_points FROM users WHERE id = user_uuid FOR UPDATE;

  IF current_points IS NULL THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  IF current_points < amount THEN
    RAISE EXCEPTION 'Insufficient points: have %, need %', current_points, amount;
  END IF;

  UPDATE users
  SET points = points - amount,
      withdraw_count = withdraw_count + 1,
      first_withdraw_done = true,
      updated_at = now()
  WHERE id = user_uuid;

  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION deduct_points(UUID, INTEGER) TO anon;
GRANT EXECUTE ON FUNCTION deduct_points(UUID, INTEGER) TO authenticated;

-- Update withdraw config: first=0.05, others=0.15
UPDATE withdraw_requirements_config
SET
  first_withdraw_usd = 0.05,
  second_withdraw_usd = 0.15,
  min_withdraw = 0.05
WHERE id IS NOT NULL;
