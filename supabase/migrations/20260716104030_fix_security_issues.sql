/*
# Fix security issues: public bucket listing, SECURITY DEFINER exposure, leaked password protection

## 1. Public Bucket Allows Listing (avatars)
The `public_read_avatars` SELECT policy on `storage.objects` allows any client to list
all files in the public `avatars` bucket. Public buckets don't need a SELECT policy
for object URL access - `getPublicUrl()` works without it. Dropping the policy prevents
clients from enumerating all avatar files while still allowing public URL access to
individual objects.

## 2. Public Can Execute SECURITY DEFINER Function
`public.handle_new_user()` is a SECURITY DEFINER function (runs with the owner's
privileges). It was callable by `anon` and `authenticated` roles via the REST RPC
endpoint, which could allow privilege escalation. We revoke EXECUTE from both roles.
The function is only meant to be invoked by the `on_auth_user_created` trigger on
`auth.users`, which runs with superuser privileges - it does not need direct EXECUTE
grants.

## 3. Leaked Password Protection
Supabase Auth checks passwords against HaveIBeenPwned.org to prevent use of
compromised passwords. We ensure this is enabled by updating the auth instance
config JSON to include `"leaked_password_protection": true`.
*/

-- ---------------------------------------------------------------------------
-- 1. Drop the broad SELECT policy on storage.objects for the avatars bucket
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "public_read_avatars" ON storage.objects;

-- ---------------------------------------------------------------------------
-- 2. Revoke EXECUTE on handle_new_user() from anon and authenticated roles
-- ---------------------------------------------------------------------------
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM authenticated;

-- ---------------------------------------------------------------------------
-- 3. Ensure leaked_password_protection is enabled in auth config
-- ---------------------------------------------------------------------------
UPDATE auth.instances
SET raw_base_config = jsonb_set(
  COALESCE(raw_base_config::jsonb, '{}'::jsonb),
  '{leaked_password_protection}',
  'true'::jsonb
)::text
WHERE raw_base_config IS NULL
   OR (raw_base_config::jsonb ->> 'leaked_password_protection') IS DISTINCT FROM 'true';
