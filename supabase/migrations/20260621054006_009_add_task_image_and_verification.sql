-- Add image_url and verification_method columns to tasks
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS verification_method VARCHAR(50) DEFAULT 'auto';

-- Add referred_ad_count to referrals for tracking 10-ad bonus
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS referred_ad_count INTEGER DEFAULT 0;
ALTER TABLE referrals ADD COLUMN IF NOT EXISTS ad_bonus INTEGER DEFAULT 0;