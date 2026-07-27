
CREATE OR REPLACE FUNCTION notify_on_comment()
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
  SELECT ul.user_id, ul.show_name
    INTO log_owner, v_show_name
    FROM user_logs ul
   WHERE ul.id = NEW.log_id;

  IF log_owner IS NULL OR log_owner = NEW.user_id THEN
    RETURN NULL;
  END IF;

  SELECT username INTO actor_username
    FROM profiles
   WHERE id = NEW.user_id;

  INSERT INTO notifications (user_id, actor_id, type, entity_id, entity_type, message)
  VALUES (
    log_owner,
    NEW.user_id,
    'comment',
    NEW.log_id,
    'log',
    COALESCE(actor_username, 'Someone') || ' commented on your review of ' || COALESCE(v_show_name, 'a show')
  );

  RETURN NULL;
END;
$$;
