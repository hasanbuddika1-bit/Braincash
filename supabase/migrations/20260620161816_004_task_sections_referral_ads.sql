-- Add task_section column for 3-way categorization (main/partner/other)
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS task_section TEXT NOT NULL DEFAULT 'main'
  CHECK (task_section IN ('main', 'partner', 'other'));

-- Update existing tasks: partner tasks go to 'partner' section
UPDATE tasks SET task_section = 'partner' WHERE is_partner = true;

-- Add referral_ad_bonus_paid to referrals to track 10-ad milestone
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS ad_bonus_paid BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS task_bonus_paid BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS referred_ad_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS referred_task_count INTEGER NOT NULL DEFAULT 0;

-- Ensure admin telegram_id is stored
ALTER TABLE users ADD COLUMN IF NOT EXISTS registration_ip TEXT;

-- Insert default games if missing
INSERT INTO games (name, game_type, description, icon, reward_range_min, reward_range_max, is_active)
SELECT name, game_type, description, icon, reward_range_min, reward_range_max, is_active
FROM (VALUES
  ('Brain 2048', '2048', 'Slide tiles to reach 2048!', '🔢', 4, 8, true),
  ('Memory Match', 'memory', 'Find matching pairs fast!', '🧩', 4, 8, true),
  ('Color Rush', 'color', 'Match colors against the clock!', '🎨', 4, 8, true),
  ('Block Puzzle', 'blocks', 'Fill rows to clear the board!', '🟦', 4, 8, true),
  ('Mini Sudoku', 'sudoku', 'Solve the 4x4 puzzle!', '🔢', 4, 8, true),
  ('Tile Connect', 'connect', 'Connect matching emoji tiles!', '🔗', 4, 8, true),
  ('Maze Runner', 'maze', 'Find your way out of the maze!', '🏃', 4, 8, true),
  ('Word Guess', 'word', 'Guess the hidden word!', '📝', 5, 10, true),
  ('Quick Math', 'math', 'Solve math problems fast!', '➕', 5, 10, true),
  ('Reaction', 'reaction', 'Test your reaction speed!', '⚡', 4, 8, true)
) AS v(name, game_type, description, icon, reward_range_min, reward_range_max, is_active)
WHERE NOT EXISTS (SELECT 1 FROM games WHERE game_type = v.game_type);

-- Add default main channel tasks if none exist
INSERT INTO tasks (task_type, task_section, title, description, link, reward_points, is_partner, is_active, verification_method)
SELECT task_type, task_section, title, description, link, reward_points, is_partner, is_active, verification_method
FROM (VALUES
  ('channel', 'main', 'Join Official Channel', 'Join @brain_cach_channel to earn points', 'https://t.me/brain_cach_channel', 50, false, true, 'manual'),
  ('group', 'main', 'Join Community Group', 'Join @braincashgroup for updates', 'https://t.me/braincashgroup', 30, false, true, 'manual'),
  ('channel', 'main', 'Follow Payment Channel', 'Follow @braincashpayment for payment proofs', 'https://t.me/braincashpayment', 20, false, true, 'manual')
) AS v(task_type, task_section, title, description, link, reward_points, is_partner, is_active, verification_method)
WHERE NOT EXISTS (SELECT 1 FROM tasks LIMIT 1);