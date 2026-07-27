
-- Remove duplicate comments, keeping only the most recent per (user_id, log_id)
DELETE FROM comments c
USING comments d
WHERE c.user_id = d.user_id
  AND c.log_id = d.log_id
  AND c.id < d.id;

-- Enforce one comment per user per review/log
DROP INDEX IF EXISTS comments_user_log_unique_idx;
CREATE UNIQUE INDEX comments_user_log_unique_idx
  ON comments (user_id, log_id);
