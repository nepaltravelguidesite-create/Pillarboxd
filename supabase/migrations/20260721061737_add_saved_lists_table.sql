/*
# Add saved_lists table — bookmark editorial lists

1. New Tables
- `saved_lists`
  - `id` (uuid, primary key)
  - `user_id` (uuid, not null, defaults to auth.uid(), references auth.users)
  - `list_id` (uuid, not null, references lists.id)
  - `saved_at` (timestamptz, defaults to now())
  - Unique constraint on (user_id, list_id) to prevent duplicate saves.

2. Security
- RLS enabled on `saved_lists`.
- Owner-scoped CRUD: each authenticated user can only manage their own saved rows.
- SELECT/INSERT/UPDATE/DELETE policies scoped to auth.uid() = user_id.

3. Notes
- Editorial lists (is_editorial = true, user_id = null) cannot be owned by users,
  but users can save/bookmark them via this table.
- A saved editorial list will appear in the user's "My Lists" page alongside
  their owned lists, visually distinguished by a "Saved" tag.
- User-created lists can also be saved if desired, but the primary use case is
  editorial lists.
*/

CREATE TABLE IF NOT EXISTS saved_lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  list_id uuid NOT NULL REFERENCES lists(id) ON DELETE CASCADE,
  saved_at timestamptz NOT NULL DEFAULT now()
);

-- Prevent duplicate saves of the same list by the same user
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'saved_lists_user_list_unique'
  ) THEN
    ALTER TABLE saved_lists ADD CONSTRAINT saved_lists_user_list_unique UNIQUE (user_id, list_id);
  END IF;
END $$;

-- Index for efficient lookup of a user's saved lists
CREATE INDEX IF NOT EXISTS idx_saved_lists_user_id ON saved_lists(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_lists_list_id ON saved_lists(list_id);

ALTER TABLE saved_lists ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_saved_lists" ON saved_lists;
CREATE POLICY "select_own_saved_lists" ON saved_lists FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_saved_lists" ON saved_lists;
CREATE POLICY "insert_own_saved_lists" ON saved_lists FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_saved_lists" ON saved_lists;
CREATE POLICY "update_own_saved_lists" ON saved_lists FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_saved_lists" ON saved_lists;
CREATE POLICY "delete_own_saved_lists" ON saved_lists FOR DELETE
  TO authenticated USING (auth.uid() = user_id);
