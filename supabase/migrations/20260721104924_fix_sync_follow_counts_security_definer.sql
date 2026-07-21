-- Fix: sync_follow_counts trigger was NOT SECURITY DEFINER, so RLS blocked
-- the cross-user follower_count update (the acting user can update their own
-- following_count but not the followed user's follower_count). Make it
-- SECURITY DEFINER so it runs as the postgres role and bypasses RLS.

CREATE OR REPLACE FUNCTION sync_follow_counts()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
IF TG_OP = 'INSERT' THEN
UPDATE profiles SET following_count = following_count + 1 WHERE id = NEW.follower_id;
UPDATE profiles SET follower_count  = follower_count  + 1 WHERE id = NEW.following_id;
ELSIF TG_OP = 'DELETE' THEN
UPDATE profiles SET following_count = GREATEST(following_count - 1, 0) WHERE id = OLD.follower_id;
UPDATE profiles SET follower_count  = GREATEST(follower_count  - 1, 0) WHERE id = OLD.following_id;
END IF;
RETURN NULL;
END;
$$;

-- Backfill: recompute follower_count / following_count from the follows table
-- so existing follows (whose triggers were silently no-op'd by RLS) are
-- reflected correctly.
UPDATE profiles p
SET follower_count = COALESCE(
  (SELECT count(*) FROM follows f WHERE f.following_id = p.id),
  0
),
following_count = COALESCE(
  (SELECT count(*) FROM follows f WHERE f.follower_id = p.id),
  0
);
