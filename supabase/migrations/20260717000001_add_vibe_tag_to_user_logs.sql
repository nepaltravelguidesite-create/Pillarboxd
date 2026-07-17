-- Add vibe_tag column to user_logs
--
-- Why: Users can attach a quick descriptive tag to their review/log entry
-- alongside the numeric star rating. This is a fun, optional label — not a
-- replacement for the rating. Values: 'skip_it', 'timepass', 'go_for_it',
-- 'perfection', or NULL if no tag selected. Defaults to NULL so existing
-- rows are unaffected and no backfill is needed.
ALTER TABLE user_logs ADD COLUMN IF NOT EXISTS vibe_tag text DEFAULT NULL;
