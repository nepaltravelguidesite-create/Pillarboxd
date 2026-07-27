
CREATE OR REPLACE FUNCTION notify_on_review_like()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  log_owner      uuid;
  v_show_name    text;
  actor_username text;
BEGIN
  -- Get the log owner and show name
  SELECT ul.user_id, ul.show_name
    INTO log_owner, v_show_name
    FROM user_logs ul
   WHERE ul.id = NEW.log_id;

  -- Don't notify if liker is the log owner
  IF log_owner IS NULL OR log_owner = NEW.user_id THEN
    RETURN NEW;
  END IF;

  -- Get the actor's username
  SELECT username INTO actor_username
    FROM profiles
   WHERE id = NEW.user_id;

  INSERT INTO notifications (user_id, type, actor_id, log_id, message)
  VALUES (
    log_owner,
    'review_like',
    NEW.user_id,
    NEW.log_id,
    COALESCE(actor_username, 'Someone') || ' liked your review of ' || COALESCE(v_show_name, 'a show')
  );

  RETURN NEW;
END;
$$;
