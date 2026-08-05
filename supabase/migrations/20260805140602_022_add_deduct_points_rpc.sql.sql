-- Atomic points deduction function for withdrawals
-- Prevents race conditions and ensures balance can't go negative
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
      updated_at = now()
  WHERE id = user_uuid;

  RETURN true;
END;
$$;

-- Grant execute to anon and authenticated (the app uses anon key)
GRANT EXECUTE ON FUNCTION deduct_points(UUID, INTEGER) TO anon;
GRANT EXECUTE ON FUNCTION deduct_points(UUID, INTEGER) TO authenticated;
