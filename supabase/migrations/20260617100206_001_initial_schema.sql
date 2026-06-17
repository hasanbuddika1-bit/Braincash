-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_id BIGINT UNIQUE NOT NULL,
  username VARCHAR(255),
  first_name VARCHAR(255),
  last_name VARCHAR(255),
  photo_url TEXT,
  referral_code VARCHAR(20) UNIQUE DEFAULT 'BC' || substr(md5(random()::text), 1, 8),
  referred_by UUID REFERENCES users(id),
  points BIGINT DEFAULT 0,
  total_earned BIGINT DEFAULT 0,
  total_withdrawn BIGINT DEFAULT 0,
  is_admin BOOLEAN DEFAULT FALSE,
  is_banned BOOLEAN DEFAULT FALSE,
  is_verified BOOLEAN DEFAULT FALSE,
  last_active TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tasks table
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  link VARCHAR(500),
  reward_points INTEGER NOT NULL,
  is_partner BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  verification_method VARCHAR(50) DEFAULT 'auto',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User task completions
CREATE TABLE task_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) NOT NULL,
  task_id UUID REFERENCES tasks(id) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, task_id)
);

-- Games table
CREATE TABLE games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  game_type VARCHAR(50) NOT NULL,
  description TEXT,
  icon VARCHAR(50),
  reward_range_min INTEGER DEFAULT 4,
  reward_range_max INTEGER DEFAULT 8,
  is_active BOOLEAN DEFAULT TRUE,
  play_count BIGINT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Game sessions
CREATE TABLE game_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) NOT NULL,
  game_id UUID REFERENCES games(id) NOT NULL,
  score INTEGER DEFAULT 0,
  reward INTEGER DEFAULT 0,
  played_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ad views
CREATE TABLE ad_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) NOT NULL,
  ad_provider VARCHAR(50) NOT NULL,
  ad_type VARCHAR(50) NOT NULL,
  reward INTEGER DEFAULT 0,
  viewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Withdrawals
CREATE TABLE withdrawals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) NOT NULL,
  amount DECIMAL(15, 6) NOT NULL,
  fee DECIMAL(15, 6) NOT NULL,
  net_amount DECIMAL(15, 6) NOT NULL,
  currency VARCHAR(10) NOT NULL,
  wallet_address VARCHAR(200) NOT NULL,
  tx_id VARCHAR(200),
  status VARCHAR(20) DEFAULT 'pending',
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Referral history
CREATE TABLE referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID REFERENCES users(id) NOT NULL,
  referred_id UUID REFERENCES users(id) NOT NULL,
  join_bonus INTEGER DEFAULT 50,
  task_bonus INTEGER DEFAULT 0,
  total_commission BIGINT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(referrer_id, referred_id)
);

-- Daily challenges
CREATE TABLE daily_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID REFERENCES games(id) NOT NULL,
  target_score INTEGER NOT NULL,
  reward_bonus INTEGER DEFAULT 10,
  challenge_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Daily challenge completions
CREATE TABLE daily_challenge_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) NOT NULL,
  challenge_id UUID REFERENCES daily_challenges(id) NOT NULL,
  score INTEGER NOT NULL,
  reward INTEGER NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, challenge_id)
);

-- Settings table for admin
CREATE TABLE settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key VARCHAR(100) UNIQUE NOT NULL,
  value TEXT NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by UUID REFERENCES users(id)
);

-- Notifications
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(50) NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE withdrawals ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_challenge_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users
CREATE POLICY "select_own_user" ON users FOR SELECT
  TO authenticated USING (auth.uid()::text = id::text OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::uuid AND is_admin = TRUE));
CREATE POLICY "update_own_user" ON users FOR UPDATE
  TO authenticated USING (auth.uid()::text = id::text);
CREATE POLICY "insert_user" ON users FOR INSERT
  TO authenticated WITH CHECK (TRUE);
CREATE POLICY "admin_all_users" ON users FOR ALL
  TO authenticated USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::uuid AND is_admin = TRUE));

-- RLS Policies for other tables (user owned)
CREATE POLICY "user_select_tasks" ON tasks FOR SELECT TO authenticated USING (is_active = TRUE OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::uuid AND is_admin = TRUE));
CREATE POLICY "admin_tasks" ON tasks FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::uuid AND is_admin = TRUE));

CREATE POLICY "user_task_completions" ON task_completions FOR SELECT TO authenticated USING (user_id = auth.uid()::uuid);
CREATE POLICY "user_insert_task" ON task_completions FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid()::uuid);
CREATE POLICY "admin_task_completions" ON task_completions FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::uuid AND is_admin = TRUE));

CREATE POLICY "user_select_games" ON games FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "admin_games" ON games FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::uuid AND is_admin = TRUE));

CREATE POLICY "user_game_sessions" ON game_sessions FOR SELECT TO authenticated USING (user_id = auth.uid()::uuid);
CREATE POLICY "user_insert_games" ON game_sessions FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid()::uuid);
CREATE POLICY "admin_game_sessions" ON game_sessions FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::uuid AND is_admin = TRUE));

CREATE POLICY "user_ad_views" ON ad_views FOR SELECT TO authenticated USING (user_id = auth.uid()::uuid);
CREATE POLICY "user_insert_ads" ON ad_views FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid()::uuid);
CREATE POLICY "admin_ad_views" ON ad_views FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::uuid AND is_admin = TRUE));

CREATE POLICY "user_withdrawals" ON withdrawals FOR SELECT TO authenticated USING (user_id = auth.uid()::uuid);
CREATE POLICY "user_insert_withdrawals" ON withdrawals FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid()::uuid);
CREATE POLICY "admin_withdrawals" ON withdrawals FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::uuid AND is_admin = TRUE));

CREATE POLICY "user_referrals" ON referrals FOR SELECT TO authenticated USING (referrer_id = auth.uid()::uuid OR referred_id = auth.uid()::uuid);
CREATE POLICY "user_insert_referrals" ON referrals FOR INSERT TO authenticated WITH CHECK (TRUE);
CREATE POLICY "admin_referrals" ON referrals FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::uuid AND is_admin = TRUE));

CREATE POLICY "user_daily_challenges" ON daily_challenges FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "admin_daily_challenges" ON daily_challenges FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::uuid AND is_admin = TRUE));

CREATE POLICY "user_challenge_completions" ON daily_challenge_completions FOR SELECT TO authenticated USING (user_id = auth.uid()::uuid);
CREATE POLICY "user_insert_challenge" ON daily_challenge_completions FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid()::uuid);

CREATE POLICY "admin_settings" ON settings FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::uuid AND is_admin = TRUE));

CREATE POLICY "user_notifications" ON notifications FOR SELECT TO authenticated USING (user_id = auth.uid()::uuid OR user_id IS NULL);
CREATE POLICY "user_update_notifications" ON notifications FOR UPDATE TO authenticated USING (user_id = auth.uid()::uuid);
CREATE POLICY "admin_notifications" ON notifications FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::uuid AND is_admin = TRUE));

-- Insert default games
INSERT INTO games (name, game_type, description, icon, reward_range_min, reward_range_max) VALUES
('2048', '2048', 'Slide and merge tiles to reach 2048', '🎮', 4, 8),
('Memory Match', 'memory', 'Match pairs of cards', '🧠', 4, 8),
('Tile Connect', 'connect', 'Connect matching tiles', '🔗', 4, 8),
('Sudoku', 'sudoku', 'Fill the grid with numbers 1-9', '🔢', 4, 8),
('Color Match', 'color', 'Match colors quickly', '🎨', 4, 8),
('Block Puzzle', 'blocks', 'Fit blocks into the grid', '🧩', 4, 8),
('Maze Runner', 'maze', 'Navigate through the maze', '🏃', 4, 8);

-- Insert default tasks
INSERT INTO tasks (task_type, title, description, link, reward_points, is_partner, verification_method) VALUES
('channel', 'Join Official Channel', 'Join our official Telegram channel', 'https://t.me/braincash', 10, FALSE, 'auto'),
('group', 'Join Community Group', 'Join our community discussion group', 'https://t.me/braincashgroup', 10, FALSE, 'auto'),
('bot', 'Open Brain Cash Bot', 'Start the Brain Cash bot', 'https://t.me/braincash_bot', 5, FALSE, 'auto'),
('post', 'View Latest Post', 'View our latest announcement post', 'https://t.me/braincash', 5, FALSE, 'auto');

-- Insert default settings
INSERT INTO settings (key, value) VALUES
('points_to_usd', '0.01'),
('min_withdraw', '0.05'),
('withdraw_fee', '0.01'),
('withdraw_fee_percent', '5'),
('referral_join_bonus', '50'),
('referral_task_bonus', '100'),
('referral_commission', '10'),
('points_per_ad_min', '4'),
('points_per_ad_max', '8'),
('bot_token', ''),
('payment_channel', ''),
('ton_wallet', ''),
('usdt_wallet', '');
