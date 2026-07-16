/*
# Revoke PUBLIC EXECUTE on handle_new_user()

The previous migration revoked EXECUTE from `anon` and `authenticated` roles,
but the function still had EXECUTE granted to `PUBLIC` (the default grant for
functions), which means both roles inherit the privilege. We revoke from PUBLIC
to close this gap. The trigger on `auth.users` still works because trigger
functions execute with the definer's privileges, not the caller's.
*/

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
