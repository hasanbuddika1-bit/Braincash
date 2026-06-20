-- Allow anon role (Telegram Mini App users with anon key) to access data
-- These policies enable the frontend to work without Supabase Auth

-- Users table - anon policies
CREATE POLICY "anon_select_users" ON users FOR SELECT TO anon USING (true);
CREATE POLICY "anon_insert_users" ON users FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_update_users" ON users FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- Tasks table - anon policies
CREATE POLICY "anon_select_tasks" ON tasks FOR SELECT TO anon USING (is_active = true);

-- Task completions - anon policies
CREATE POLICY "anon_select_task_completions" ON task_completions FOR SELECT TO anon USING (true);
CREATE POLICY "anon_insert_task_completions" ON task_completions FOR INSERT TO anon WITH CHECK (true);

-- Games - anon policies
CREATE POLICY "anon_select_games" ON games FOR SELECT TO anon USING (true);

-- Game sessions - anon policies
CREATE POLICY "anon_select_game_sessions" ON game_sessions FOR SELECT TO anon USING (true);
CREATE POLICY "anon_insert_game_sessions" ON game_sessions FOR INSERT TO anon WITH CHECK (true);

-- Ad views - anon policies
CREATE POLICY "anon_select_ad_views" ON ad_views FOR SELECT TO anon USING (true);
CREATE POLICY "anon_insert_ad_views" ON ad_views FOR INSERT TO anon WITH CHECK (true);

-- Withdrawals - anon policies
CREATE POLICY "anon_select_withdrawals" ON withdrawals FOR SELECT TO anon USING (true);
CREATE POLICY "anon_insert_withdrawals" ON withdrawals FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_update_withdrawals" ON withdrawals FOR UPDATE TO anon USING (true);

-- Referrals - anon policies
CREATE POLICY "anon_select_referrals" ON referrals FOR SELECT TO anon USING (true);
CREATE POLICY "anon_insert_referrals" ON referrals FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_update_referrals" ON referrals FOR UPDATE TO anon USING (true);

-- Daily challenges - anon policies
CREATE POLICY "anon_select_daily_challenges" ON daily_challenges FOR SELECT TO anon USING (true);

-- Daily challenge completions - anon policies
CREATE POLICY "anon_select_challenge_completions" ON daily_challenge_completions FOR SELECT TO anon USING (true);
CREATE POLICY "anon_insert_challenge_completions" ON daily_challenge_completions FOR INSERT TO anon WITH CHECK (true);

-- Settings - anon read for mini app url / public config
CREATE POLICY "anon_select_settings" ON settings FOR SELECT TO anon USING (true);

-- Notifications - anon policies
CREATE POLICY "anon_select_notifications" ON notifications FOR SELECT TO anon USING (true);
CREATE POLICY "anon_update_notifications" ON notifications FOR UPDATE TO anon USING (true);
