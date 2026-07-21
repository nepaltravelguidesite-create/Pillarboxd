-- Functions default to PUBLIC execute. Revoke from PUBLIC, anon, and
-- authenticated so these SECURITY DEFINER trigger functions can only be
-- invoked by database triggers (the postgres role), not via REST RPC.

REVOKE EXECUTE ON FUNCTION public.notify_on_comment() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.notify_on_follow() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.notify_on_review_like() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.sync_follow_counts() FROM PUBLIC;
