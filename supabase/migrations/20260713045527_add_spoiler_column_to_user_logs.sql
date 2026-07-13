-- Add contains_spoiler column to user_logs
--
-- Why: Users want to flag log entries that contain spoilers in their review
-- text. This lets the UI warn other viewers before revealing the content of
-- a review. Defaults to false so all existing rows remain non-spoiler and
-- backfill is unnecessary.
ALTER TABLE user_logs ADD COLUMN IF NOT EXISTS contains_spoiler boolean NOT NULL DEFAULT false;
