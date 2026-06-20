-- Remove unwanted games
DELETE FROM games WHERE game_type IN ('2048', 'blocks', 'maze', 'sudoku');

-- Add new games
INSERT INTO games (name, game_type, description, icon, reward_range_min, reward_range_max) VALUES
('Reaction Time', 'reaction', 'Tap as fast as you can!', '⚡', 4, 8),
('Word Guess', 'wordguess', 'Guess the hidden word!', '🔤', 4, 8)
ON CONFLICT DO NOTHING;

-- Update existing games to have proper icons
UPDATE games SET icon = '🧠' WHERE game_type = 'memory';
UPDATE games SET icon = '🔗' WHERE game_type = 'connect';
UPDATE games SET icon = '🎨' WHERE game_type = 'color';

-- Add icon_emoji column to tasks for custom task icons
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS icon_emoji VARCHAR(10) DEFAULT '📋';

-- Add task_section column if not exists (was added in migration 004 but just ensure)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tasks' AND column_name='task_section') THEN
    ALTER TABLE tasks ADD COLUMN task_section VARCHAR(20) DEFAULT 'main' CHECK (task_section IN ('main', 'partner', 'other'));
  END IF;
END $$;

-- Update existing tasks with proper icons and sections
UPDATE tasks SET icon_emoji = '📢', task_section = 'main' WHERE task_type = 'channel';
UPDATE tasks SET icon_emoji = '👥', task_section = 'main' WHERE task_type = 'group';
UPDATE tasks SET icon_emoji = '🤖', task_section = 'main' WHERE task_type = 'bot';
UPDATE tasks SET icon_emoji = '📰', task_section = 'main' WHERE task_type = 'post';
UPDATE tasks SET icon_emoji = '🤝', task_section = 'partner' WHERE task_type = 'partner';

-- Add anon policy for icon_emoji if needed (already covered by table-level policies)
