-- Add daily challenge indexes
CREATE INDEX IF NOT EXISTS idx_daily_challenges_date ON daily_challenges(challenge_date);
CREATE INDEX IF NOT EXISTS idx_daily_challenge_completions_user ON daily_challenge_completions(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_challenge_completions_challenge ON daily_challenge_completions(challenge_id);

-- Add game sessions indexes
CREATE INDEX IF NOT EXISTS idx_game_sessions_user ON game_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_game_sessions_game ON game_sessions(game_id);

-- Add ad views indexes
CREATE INDEX IF NOT EXISTS idx_ad_views_user ON ad_views(user_id);
CREATE INDEX IF NOT EXISTS idx_ad_views_created ON ad_views(viewed_at);

-- Add task completions index
CREATE INDEX IF NOT EXISTS idx_task_completions_user_task ON task_completions(user_id, task_id);

-- Add referrals index
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referred ON referrals(referred_id);

-- Add withdrawals index
CREATE INDEX IF NOT EXISTS idx_withdrawals_user ON withdrawals(user_id);
CREATE INDEX IF NOT EXISTS idx_withdrawals_status ON withdrawals(status);

-- Add function to add points
CREATE OR REPLACE FUNCTION add_points(user_id UUID, amount BIGINT)
RETURNS VOID AS $$
BEGIN
  UPDATE users
  SET 
    points = points + amount,
    total_earned = total_earned + amount,
    updated_at = NOW()
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add function to record referral commission
CREATE OR REPLACE FUNCTION record_referral_commission(
  referrer_user_id UUID,
  commission_amount BIGINT
)
RETURNS VOID AS $$
BEGIN
  UPDATE referrals
  SET total_commission = total_commission + commission_amount
  WHERE referrer_id = referrer_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add function to check if user completed tasks
CREATE OR REPLACE FUNCTION check_user_tasks_complete(target_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  total_tasks INT;
  completed_tasks INT;
BEGIN
  SELECT COUNT(*) INTO total_tasks FROM tasks WHERE is_active = TRUE;
  
  SELECT COUNT(*) INTO completed_tasks
  FROM task_completions tc
  JOIN tasks t ON t.id = tc.task_id
  WHERE tc.user_id = target_user_id
    AND tc.status = 'completed'
    AND t.is_active = TRUE;
  
  RETURN completed_tasks >= total_tasks;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add deposits table
CREATE TABLE IF NOT EXISTS deposits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) NOT NULL,
  amount DECIMAL(15, 6) NOT NULL,
  currency VARCHAR(10) NOT NULL,
  tx_hash VARCHAR(200),
  status VARCHAR(20) DEFAULT 'pending',
  points_credited INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS on deposits
ALTER TABLE deposits ENABLE ROW LEVEL SECURITY;

-- RLS Policies for deposits
CREATE POLICY "user_deposits" ON deposits FOR SELECT TO authenticated USING (user_id = auth.uid()::uuid);
CREATE POLICY "user_insert_deposits" ON deposits FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid()::uuid);
CREATE POLICY "admin_deposits" ON deposits FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::uuid AND is_admin = TRUE));

-- Add rate limiting table
CREATE TABLE IF NOT EXISTS rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) NOT NULL,
  action_type VARCHAR(50) NOT NULL,
  action_count INT DEFAULT 1,
  window_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, action_type, window_start)
);

-- Add audit log table
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  action VARCHAR(100) NOT NULL,
  details JSONB,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on audit_logs
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_audit_logs" ON audit_logs FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid()::uuid AND is_admin = TRUE));
