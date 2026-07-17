/*
# Add editorial lists support

1. New Columns
- `lists.is_editorial` (boolean, NOT NULL, default false) — marks system-curated
  lists distinct from user-created ones. Editorial lists have no owner.

2. Modified Columns
- `lists.user_id` — dropped NOT NULL constraint so editorial lists can have
  a NULL owner. The DEFAULT auth.uid() remains so regular user inserts still
  work without explicitly passing user_id.

3. Constraints
- `lists_editorial_or_owner` CHECK: is_editorial = true OR user_id IS NOT NULL.
  Every non-editorial list must have an owner; editorial lists are exempt.

4. RLS Policy Updates
- INSERT: added `AND is_editorial = false` so authenticated users can never
  create editorial lists through the app. Only the service role (which bypasses
  RLS) can insert rows with is_editorial = true.
- UPDATE: same restriction — users cannot flip the is_editorial flag on.
- SELECT and DELETE policies are unchanged (public lists remain readable;
  only owners can delete their own lists).

5. Notes
- Editorial lists are seeded via an edge function using the service role key,
  which bypasses RLS entirely. The RLS changes ensure the app's normal
  create-list flow can never produce editorial lists.
- The existing `sync_list_item_count` trigger continues to maintain
  `lists.item_count` automatically when list_items are inserted.
*/

-- 1. Add is_editorial column
ALTER TABLE lists ADD COLUMN IF NOT EXISTS is_editorial boolean NOT NULL DEFAULT false;

-- 2. Make user_id nullable for editorial lists
ALTER TABLE lists ALTER COLUMN user_id DROP NOT NULL;

-- 3. Check constraint: editorial lists don't need an owner; user lists do
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'lists_editorial_or_owner'
  ) THEN
    ALTER TABLE lists ADD CONSTRAINT lists_editorial_or_owner
      CHECK (is_editorial = true OR user_id IS NOT NULL);
  END IF;
END $$;

-- 4. Update INSERT policy to prevent users from creating editorial lists
DROP POLICY IF EXISTS "insert_own_lists" ON lists;
CREATE POLICY "insert_own_lists" ON lists FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id AND is_editorial = false);

-- 5. Update UPDATE policy to prevent users from flipping is_editorial
DROP POLICY IF EXISTS "update_own_lists" ON lists;
CREATE POLICY "update_own_lists" ON lists FOR UPDATE
  TO authenticated USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id AND is_editorial = false);
