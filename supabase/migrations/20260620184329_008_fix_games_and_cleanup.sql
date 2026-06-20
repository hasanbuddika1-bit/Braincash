-- Remove duplicate games
DELETE FROM games WHERE game_type = 'math';
DELETE FROM games WHERE game_type = 'word';
DELETE FROM games WHERE name = 'Reaction' AND game_type = 'reaction';

-- Ensure only correct games exist
UPDATE games SET name = 'Reaction Time', game_type = 'reaction', description = 'Tap as fast as you can!' WHERE game_type = 'reaction';

-- Add new games: Number Guess and Word Type
INSERT INTO games (id, name, game_type, description, icon, reward_range_min, reward_range_max, is_active, play_count, created_at)
SELECT gen_random_uuid(), 'Number Guess', 'numberguess', 'Guess the secret number 1-100!', '#️⃣', 4, 8, true, 0, NOW()
WHERE NOT EXISTS (SELECT 1 FROM games WHERE game_type = 'numberguess');

INSERT INTO games (id, name, game_type, description, icon, reward_range_min, reward_range_max, is_active, play_count, created_at)
SELECT gen_random_uuid(), 'Word Type', 'wordtype', 'Type the word before time runs out!', '⌨️', 4, 8, true, 0, NOW()
WHERE NOT EXISTS (SELECT 1 FROM games WHERE game_type = 'wordtype');

-- Update mini_app_url to correct Telegram link
UPDATE settings SET value = 'https://t.me/Brain_cashbot/braincash' WHERE key = 'mini_app_url';