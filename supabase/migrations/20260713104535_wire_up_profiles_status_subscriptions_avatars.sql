/*
# Wire up profiles table as source of truth, add watch status, user subscriptions, and avatar storage

## 1. profiles table changes
- Add twitter_url, instagram_url, website_url columns (text, nullable)
- Add unique constraint on username (profiles_username_key)

## 2. Auto-create profile on signup
- Create handle_new_user() function that inserts a profiles row
  seeded from raw_user_meta_data, falling back to email prefix
- Create trigger on auth.users AFTER INSERT

## 3. Backfill existing users
- Insert profiles rows for any auth.users that don't have one yet

## 4. user_shows changes
- Add status column (text, nullable, CHECK constraint limiting to
  'watching', 'completed', 'want_to_watch', 'on_hold', 'dropped')
- Backfill: watchlisted=true → 'want_to_watch', else → 'watching'

## 5. user_subscriptions table (new)
- Tracks which streaming providers a user pays for
- user_id, provider_id, provider_name, unique on (user_id, provider_id)
- RLS: owner-scoped CRUD (4 policies, authenticated only)

## 6. Storage
- Create public 'avatars' bucket
- Storage policies: public read, authenticated upload/update/delete own folder

## Security
- RLS enabled on user_subscriptions
- Storage policies restrict writes to own user-id folder
- profiles trigger function is SECURITY DEFINER (runs as server)
*/

-- 1. Add social link columns to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS twitter_url text,
  ADD COLUMN IF NOT EXISTS instagram_url text,
  ADD COLUMN IF NOT EXISTS website_url text;

-- Add unique constraint on username if not exists
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_username_key'
  ) THEN
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_username_key UNIQUE (username);
  END IF;
END $$;

-- 2. Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  meta jsonb;
  fb_username text;
  fb_display text;
BEGIN
  meta := NEW.raw_user_meta_data;
  fb_username := COALESCE(
    meta->>'username',
    meta->>'preferred_username',
    split_part(NEW.email, '@', 1)
  );
  fb_display := COALESCE(
    meta->>'full_name',
    meta->>'name',
    meta->>'username',
    split_part(NEW.email, '@', 1)
  );

  INSERT INTO public.profiles (id, username, display_name)
  VALUES (NEW.id, fb_username, fb_display)
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. Backfill existing auth.users without a profiles row
INSERT INTO public.profiles (id, username, display_name)
SELECT
  u.id,
  COALESCE(
    u.raw_user_meta_data->>'username',
    u.raw_user_meta_data->>'preferred_username',
    split_part(u.email, '@', 1)
  ),
  COALESCE(
    u.raw_user_meta_data->>'full_name',
    u.raw_user_meta_data->>'name',
    u.raw_user_meta_data->>'username',
    split_part(u.email, '@', 1)
  )
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = u.id)
ON CONFLICT DO NOTHING;

-- 4. Add status column to user_shows
ALTER TABLE public.user_shows
  ADD COLUMN IF NOT EXISTS status text
  CHECK (status IS NULL OR status IN ('watching', 'completed', 'want_to_watch', 'on_hold', 'dropped'));

UPDATE public.user_shows SET status = 'want_to_watch' WHERE watchlisted = true AND status IS NULL;
UPDATE public.user_shows SET status = 'watching' WHERE watchlisted = false AND status IS NULL;

-- 5. user_subscriptions table
CREATE TABLE IF NOT EXISTS public.user_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  provider_id integer NOT NULL,
  provider_name text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, provider_id)
);

ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_subscriptions" ON public.user_subscriptions;
CREATE POLICY "select_own_subscriptions" ON public.user_subscriptions
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_subscriptions" ON public.user_subscriptions;
CREATE POLICY "insert_own_subscriptions" ON public.user_subscriptions
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_subscriptions" ON public.user_subscriptions;
CREATE POLICY "update_own_subscriptions" ON public.user_subscriptions
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_subscriptions" ON public.user_subscriptions;
CREATE POLICY "delete_own_subscriptions" ON public.user_subscriptions
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 6. Avatars storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "public_read_avatars" ON storage.objects;
CREATE POLICY "public_read_avatars" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "auth_upload_own_avatar" ON storage.objects;
CREATE POLICY "auth_upload_own_avatar" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "auth_update_own_avatar" ON storage.objects;
CREATE POLICY "auth_update_own_avatar" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "auth_delete_own_avatar" ON storage.objects;
CREATE POLICY "auth_delete_own_avatar" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
