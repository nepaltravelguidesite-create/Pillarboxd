-- Add season_number column for season-scoped reviews/ratings
ALTER TABLE user_logs ADD COLUMN IF NOT EXISTS season_number integer;

-- Drop NOT NULL on watched_date so users can submit without picking a date
ALTER TABLE user_logs ALTER COLUMN watched_date DROP NOT NULL;

-- Index for duplicate-prevention lookups: (user_id, show_id, season_number) where review is not null
CREATE INDEX IF NOT EXISTS idx_user_logs_user_show_season_review
  ON user_logs(user_id, show_id, season_number)
  WHERE review IS NOT NULL AND review != '';
