/*
# Add notification triggers for follows, review likes, comments, and ratings

## Overview
Wires up the existing `notifications` table so that real notifications are
created automatically when:
1. User A follows User B → User B gets a "follow" notification
2. User A likes User B's review/log entry → User B gets a "like" notification
3. User A comments on User B's log entry → User B gets a "comment" notification
4. User A rates a show (on user_shows) → no notification (ratings are private)

All trigger functions are SECURITY DEFINER so they can INSERT into the
notifications table even though the acting user has no direct INSERT grant
beyond the permissive RLS policy (which already allows authenticated inserts).
The functions read actor profile info (username, display_name) to build a
human-readable message and skip self-notifications (you never notify yourself).

## New Functions
- `notify_on_follow()` - AFTER INSERT on `follows`
- `notify_on_review_like()` - AFTER INSERT on `review_likes`
- `notify_on_comment()` - AFTER INSERT on `comments`

## New Triggers
- `trg_notify_follow` on `follows`
- `trg_notify_review_like` on `review_likes`
- `trg_notify_comment` on `comments`

## Security
- All trigger functions are SECURITY DEFINER (run as the postgres role).
- Each function guards against self-notifications.
- No new RLS policies needed - the existing `insert_notifications` policy
  allows authenticated inserts, and SECURITY DEFINER functions bypass RLS.

## Important Notes
1. Notifications are only created for the recipient (the followed user, the
   review owner, or the log owner) - never the actor.
2. The `message` column is pre-rendered with the actor's username for display.
3. `entity_type` is set to 'log' for review likes and comments, 'profile' for
   follows, so the frontend can deep-link correctly.
4. `entity_id` is set to the log_id for likes/comments, null for follows.
*/

-- ---------------------------------------------------------------------------
-- Follow notification
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION notify_on_follow()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor_username text;
BEGIN
  -- Don't notify on self-follow (shouldn't happen due to CHECK, but guard anyway)
  IF NEW.follower_id = NEW.following_id THEN
    RETURN NULL;
  END IF;

  SELECT username INTO actor_username FROM profiles WHERE id = NEW.follower_id;

  INSERT INTO notifications (user_id, actor_id, type, entity_id, entity_type, message)
  VALUES (
    NEW.following_id,
    NEW.follower_id,
    'follow',
    NULL,
    'profile',
    COALESCE(actor_username, 'Someone') || ' started following you'
  );

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_follow ON follows;
CREATE TRIGGER trg_notify_follow
  AFTER INSERT ON follows
  FOR EACH ROW EXECUTE FUNCTION notify_on_follow();

-- ---------------------------------------------------------------------------
-- Review like notification
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION notify_on_review_like()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  log_owner uuid;
  show_name text;
  actor_username text;
BEGIN
  -- Get the log owner and show name
  SELECT user_id, show_name INTO log_owner, show_name
  FROM user_logs WHERE id = NEW.log_id;

  -- If we can't find the log, or the liker is the owner, skip
  IF log_owner IS NULL OR log_owner = NEW.user_id THEN
    RETURN NULL;
  END IF;

  SELECT username INTO actor_username FROM profiles WHERE id = NEW.user_id;

  INSERT INTO notifications (user_id, actor_id, type, entity_id, entity_type, message)
  VALUES (
    log_owner,
    NEW.user_id,
    'like',
    NEW.log_id,
    'log',
    COALESCE(actor_username, 'Someone') || ' liked your review of ' || COALESCE(show_name, 'a show')
  );

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_review_like ON review_likes;
CREATE TRIGGER trg_notify_review_like
  AFTER INSERT ON review_likes
  FOR EACH ROW EXECUTE FUNCTION notify_on_review_like();

-- ---------------------------------------------------------------------------
-- Comment notification
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION notify_on_comment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  log_owner uuid;
  show_name text;
  actor_username text;
BEGIN
  -- Get the log owner and show name
  SELECT user_id, show_name INTO log_owner, show_name
  FROM user_logs WHERE id = NEW.log_id;

  -- If we can't find the log, or the commenter is the owner, skip
  IF log_owner IS NULL OR log_owner = NEW.user_id THEN
    RETURN NULL;
  END IF;

  SELECT username INTO actor_username FROM profiles WHERE id = NEW.user_id;

  INSERT INTO notifications (user_id, actor_id, type, entity_id, entity_type, message)
  VALUES (
    log_owner,
    NEW.user_id,
    'comment',
    NEW.log_id,
    'log',
    COALESCE(actor_username, 'Someone') || ' commented on your review of ' || COALESCE(show_name, 'a show')
  );

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_comment ON comments;
CREATE TRIGGER trg_notify_comment
  AFTER INSERT ON comments
  FOR EACH ROW EXECUTE FUNCTION notify_on_comment();

-- ---------------------------------------------------------------------------
-- Enable realtime on notifications, follows, and profiles
-- ---------------------------------------------------------------------------

ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE follows;
ALTER PUBLICATION supabase_realtime ADD TABLE profiles;
