-- Grant anon role permission to execute SECURITY DEFINER functions
GRANT EXECUTE ON FUNCTION add_points(UUID, BIGINT) TO anon;
GRANT EXECUTE ON FUNCTION record_referral_commission(UUID, BIGINT) TO anon;
GRANT EXECUTE ON FUNCTION check_user_tasks_complete(UUID) TO anon;

-- Anon policies for deposits table
CREATE POLICY "anon_select_deposits" ON deposits FOR SELECT TO anon USING (true);
CREATE POLICY "anon_insert_deposits" ON deposits FOR INSERT TO anon WITH CHECK (true);

-- Update points_to_usd setting to correct value
UPDATE settings SET value = '0.0001' WHERE key = 'points_to_usd';
