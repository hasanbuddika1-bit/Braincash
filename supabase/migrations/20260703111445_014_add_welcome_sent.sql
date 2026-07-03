/*
# Add welcome_sent column to users
*/
DO $$ BEGIN
  ALTER TABLE users ADD COLUMN IF NOT EXISTS welcome_sent boolean DEFAULT false;
EXCEPTION WHEN duplicate_column THEN NULL; END $$;
