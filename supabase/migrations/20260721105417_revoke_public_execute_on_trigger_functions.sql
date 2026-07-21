-- Revoke EXECUTE on SECURITY DEFINER trigger functions from anon and
-- authenticated roles. These functions are only meant to be invoked by
-- database triggers — exposing them via /rest/v1/rpc allows any client to
-- call them directly, which is a security risk.

REVOKE EXECUTE ON FUNCTION public.notify_on_comment() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_on_follow() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_on_review_like() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_follow_counts() FROM anon, authenticated;
