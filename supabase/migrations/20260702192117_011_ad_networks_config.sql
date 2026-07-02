-- Add ad network configuration settings
INSERT INTO settings (key, value) VALUES
  ('adsgram_block_id', '35763'),
  ('adsgram_daily_limit', '10'),
  ('adsgram_points_per_ad', '10'),
  ('adsgram_cooldown_seconds', '5'),
  ('monetag_zone_id', '11230846'),
  ('monetag_daily_limit', '10'),
  ('monetag_points_per_ad', '5'),
  ('monetag_cooldown_seconds', '5'),
  ('gigapub_script_id', '7151'),
  ('gigapub_daily_limit', '10'),
  ('gigapub_points_per_ad', '5'),
  ('gigapub_cooldown_seconds', '5')
ON CONFLICT (key) DO NOTHING;

-- Add ad_provider index for daily count queries
CREATE INDEX IF NOT EXISTS idx_ad_views_user_provider_date ON ad_views (user_id, ad_provider, viewed_at);
