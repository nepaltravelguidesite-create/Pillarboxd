/*
# Fix security issues: function search paths and notifications RLS policy

## Overview
This migration addresses three security findings:
1. Three trigger functions have mutable search_path — hardened with `SET search_path = public, pg_temp`.
2. The `notifications` table INSERT policy uses `WITH CHECK (true)` — tightened to `WITH CHECK (auth.uid() = actor_id)`.

## Changes

### 1. Function search path hardening
The following functions are recreated with `SET search_path = public, pg_temp`:
- `public.update_updated_at_column()` — trigger function for updated_at columns
- `public.sync_follow_counts()` — trigger function for follower/following counts
- `public.sync_list_item_count()` — trigger function for list item counts

This prevents search_path hijacking by ensuring only `public` and `pg_temp` are in the path,
and `pg_temp` is always last (so user-created objects can't shadow real tables).

### 2. Notifications INSERT policy tightening
The `insert_notifications` policy previously had `WITH CHECK (true)`, meaning any authenticated
user could insert notifications for ANY user_id. The new policy requires `auth.uid() = actor_id`,
so users can only create notifications where they are the actor (the one who performed the action).
This is correct because:
- When user A likes user B's review, the app inserts a notification with user_id=B, actor_id=A.
- The RLS check is on actor_id (the inserter), not user_id (the recipient).
- A malicious user cannot forge notifications appearing to come from someone else.

## Important Notes
1. Existing triggers are preserved — only the function definitions change.
2. The search_path fix is the recommended Supabase/Postgres security hardening pattern.
3. The notifications policy change means the application must always set actor_id = auth.uid()
   when inserting. The NotificationsContext already does this correctly.
*/

-- ---------------------------------------------------------------------------
-- 1. Harden function search paths
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.sync_follow_counts()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.sync_list_item_count()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE lists SET item_count = item_count + 1, updated_at = now() WHERE id = NEW.list_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE lists SET item_count = GREATEST(item_count - 1, 0), updated_at = now() WHERE id = OLD.list_id;
  END IF;
  RETURN NULL;
END;
$function$;

-- ---------------------------------------------------------------------------
-- 2. Tighten notifications INSERT policy
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "insert_notifications" ON notifications;
CREATE POLICY "insert_notifications" ON notifications FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = actor_id);
