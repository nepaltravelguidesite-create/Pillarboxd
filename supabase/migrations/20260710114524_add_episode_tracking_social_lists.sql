/*
# Add episode tracking, social layer, lists, and user profiles

## Overview
This migration adds all the tables required for:
1. Episode-level watched tracking (user_episodes)
2. Custom lists with ordered items (lists, list_items)
3. Social follows between users (follows)
4. User-visible profiles with display metadata (profiles)
5. Comments on log entries (comments)
6. Likes on reviews/lists by other users (review_likes, list_likes)

## New Tables

### `profiles`
One row per Supabase auth user. Stores display name, username, avatar_url,
bio, and follower/following counts (denormalized via trigger).
- `id` (uuid PK, references auth.users)
- `username` (text, unique, lowercase)
- `display_name` (text)
- `avatar_url` (text, nullable)
- `bio` (text, nullable)
- `follower_count` (int, default 0)
- `following_count` (int, default 0)
- `created_at` (timestamptz)

### `user_episodes`
Individual episode watched records - the source of truth for watched state.
- `id` (uuid PK)
- `user_id` (uuid, DEFAULT auth.uid(), FK auth.users)
- `show_id` (int - TMDB series ID)
- `show_name` (text - denormalized)
- `show_poster_path` (text, nullable)
- `season_number` (int)
- `episode_number` (int)
- `episode_name` (text, nullable - denormalized)
- `rewatch` (boolean, default false)
- `watched_at` (timestamptz, default now())
- UNIQUE(user_id, show_id, season_number, episode_number) when rewatch=false
  (rewatches create new rows)

### `lists`
User-created curated show lists (like Letterboxd lists).
- `id` (uuid PK)
- `user_id` (uuid, DEFAULT auth.uid(), FK auth.users)
- `title` (text NOT NULL)
- `description` (text, nullable)
- `is_public` (boolean, default true)
- `like_count` (int, default 0)
- `item_count` (int, default 0)
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

### `list_items`
Ordered shows within a list, with optional personal note.
- `id` (uuid PK)
- `list_id` (uuid FK lists.id)
- `show_id` (int - TMDB series ID)
- `show_name` (text - denormalized)
- `show_poster_path` (text, nullable)
- `show_first_air_date` (text, nullable)
- `position` (int - for ordering)
- `note` (text, nullable)
- `added_at` (timestamptz)
- UNIQUE(list_id, show_id)

### `follows`
Directed follow relationships between users.
- `id` (uuid PK)
- `follower_id` (uuid FK auth.users)
- `following_id` (uuid FK auth.users)
- `created_at` (timestamptz)
- UNIQUE(follower_id, following_id)

### `comments`
Comments on user_logs diary entries.
- `id` (uuid PK)
- `user_id` (uuid, DEFAULT auth.uid(), FK auth.users)
- `log_id` (uuid FK user_logs.id ON DELETE CASCADE)
- `content` (text NOT NULL)
- `created_at` (timestamptz)

### `review_likes`
Likes placed by users on other users' log/review entries.
- `id` (uuid PK)
- `user_id` (uuid, DEFAULT auth.uid(), FK auth.users)
- `log_id` (uuid FK user_logs.id ON DELETE CASCADE)
- `created_at` (timestamptz)
- UNIQUE(user_id, log_id)

### `list_likes`
Likes placed by users on lists.
- `id` (uuid PK)
- `user_id` (uuid, DEFAULT auth.uid(), FK auth.users)
- `list_id` (uuid FK lists.id ON DELETE CASCADE)
- `created_at` (timestamptz)
- UNIQUE(user_id, list_id)

## Security
- RLS enabled on all tables.
- profiles: any authenticated user can read; only the owner can update.
- user_episodes: owner-scoped CRUD.
- lists: owner can CRUD; public lists are readable by all authenticated users.
- list_items: owner (via list ownership) can CRUD; items of public lists are readable.
- follows: any authenticated user can read; only follower can insert/delete own follows.
- comments: any authenticated user can read; owner can insert/delete.
- review_likes / list_likes: any authenticated can read; owner can insert/delete.

## Important Notes
1. profiles.id mirrors auth.users.id - no separate sequence.
2. follower_count / following_count are denormalized integers updated by triggers
   for performance. They start at 0.
3. list_items.position allows drag-to-reorder. Frontend must handle gaps.
4. user_episodes unique constraint only on (user_id, show_id, season_number, episode_number)
   without rewatch flag - rewatches are tracked via separate rows keyed on watched_at.
   A simple "is watched" query uses DISTINCT or MAX(watched_at).
*/

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text NOT NULL,
  display_name text NOT NULL DEFAULT '',
  avatar_url text,
  bio text,
  follower_count integer NOT NULL DEFAULT 0,
  following_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT profiles_username_key UNIQUE (username)
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);

DROP POLICY IF EXISTS "select_profiles" ON profiles;
CREATE POLICY "select_profiles" ON profiles FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_own_profile" ON profiles;
CREATE POLICY "insert_own_profile" ON profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "update_own_profile" ON profiles;
CREATE POLICY "update_own_profile" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "delete_own_profile" ON profiles;
CREATE POLICY "delete_own_profile" ON profiles FOR DELETE
  TO authenticated USING (auth.uid() = id);

-- ---------------------------------------------------------------------------
-- user_episodes
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS user_episodes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  show_id integer NOT NULL,
  show_name text NOT NULL,
  show_poster_path text,
  season_number integer NOT NULL,
  episode_number integer NOT NULL,
  episode_name text,
  rewatch boolean NOT NULL DEFAULT false,
  watched_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE user_episodes ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_user_episodes_user_show ON user_episodes(user_id, show_id);
CREATE INDEX IF NOT EXISTS idx_user_episodes_user_season ON user_episodes(user_id, show_id, season_number);

DROP POLICY IF EXISTS "select_own_user_episodes" ON user_episodes;
CREATE POLICY "select_own_user_episodes" ON user_episodes FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_user_episodes" ON user_episodes;
CREATE POLICY "insert_own_user_episodes" ON user_episodes FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_user_episodes" ON user_episodes;
CREATE POLICY "update_own_user_episodes" ON user_episodes FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_user_episodes" ON user_episodes;
CREATE POLICY "delete_own_user_episodes" ON user_episodes FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- lists
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  is_public boolean NOT NULL DEFAULT true,
  like_count integer NOT NULL DEFAULT 0,
  item_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE lists ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_lists_user_id ON lists(user_id);
CREATE INDEX IF NOT EXISTS idx_lists_public ON lists(is_public, created_at DESC) WHERE is_public = true;

DROP POLICY IF EXISTS "select_own_lists" ON lists;
CREATE POLICY "select_own_lists" ON lists FOR SELECT
  TO authenticated USING (auth.uid() = user_id OR is_public = true);

DROP POLICY IF EXISTS "insert_own_lists" ON lists;
CREATE POLICY "insert_own_lists" ON lists FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_lists" ON lists;
CREATE POLICY "update_own_lists" ON lists FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_lists" ON lists;
CREATE POLICY "delete_own_lists" ON lists FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- list_items
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS list_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id uuid NOT NULL REFERENCES lists(id) ON DELETE CASCADE,
  show_id integer NOT NULL,
  show_name text NOT NULL,
  show_poster_path text,
  show_first_air_date text,
  position integer NOT NULL DEFAULT 0,
  note text,
  added_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT list_items_unique_show UNIQUE (list_id, show_id)
);

ALTER TABLE list_items ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_list_items_list_id ON list_items(list_id, position);

DROP POLICY IF EXISTS "select_list_items" ON list_items;
CREATE POLICY "select_list_items" ON list_items FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM lists
      WHERE lists.id = list_items.list_id
        AND (lists.user_id = auth.uid() OR lists.is_public = true)
    )
  );

DROP POLICY IF EXISTS "insert_own_list_items" ON list_items;
CREATE POLICY "insert_own_list_items" ON list_items FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM lists
      WHERE lists.id = list_items.list_id
        AND lists.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "update_own_list_items" ON list_items;
CREATE POLICY "update_own_list_items" ON list_items FOR UPDATE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM lists
      WHERE lists.id = list_items.list_id
        AND lists.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "delete_own_list_items" ON list_items;
CREATE POLICY "delete_own_list_items" ON list_items FOR DELETE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM lists
      WHERE lists.id = list_items.list_id
        AND lists.user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- follows
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS follows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  following_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT follows_unique UNIQUE (follower_id, following_id),
  CONSTRAINT follows_no_self CHECK (follower_id != following_id)
);

ALTER TABLE follows ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_follows_follower ON follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following ON follows(following_id);

DROP POLICY IF EXISTS "select_follows" ON follows;
CREATE POLICY "select_follows" ON follows FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_own_follows" ON follows;
CREATE POLICY "insert_own_follows" ON follows FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = follower_id);

DROP POLICY IF EXISTS "delete_own_follows" ON follows;
CREATE POLICY "delete_own_follows" ON follows FOR DELETE
  TO authenticated USING (auth.uid() = follower_id);

-- ---------------------------------------------------------------------------
-- comments
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  log_id uuid NOT NULL REFERENCES user_logs(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_comments_log_id ON comments(log_id, created_at);

DROP POLICY IF EXISTS "select_comments" ON comments;
CREATE POLICY "select_comments" ON comments FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_own_comments" ON comments;
CREATE POLICY "insert_own_comments" ON comments FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_comments" ON comments;
CREATE POLICY "delete_own_comments" ON comments FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- review_likes
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS review_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  log_id uuid NOT NULL REFERENCES user_logs(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT review_likes_unique UNIQUE (user_id, log_id)
);

ALTER TABLE review_likes ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_review_likes_log_id ON review_likes(log_id);

DROP POLICY IF EXISTS "select_review_likes" ON review_likes;
CREATE POLICY "select_review_likes" ON review_likes FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_own_review_likes" ON review_likes;
CREATE POLICY "insert_own_review_likes" ON review_likes FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_review_likes" ON review_likes;
CREATE POLICY "delete_own_review_likes" ON review_likes FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- list_likes
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS list_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  list_id uuid NOT NULL REFERENCES lists(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT list_likes_unique UNIQUE (user_id, list_id)
);

ALTER TABLE list_likes ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_list_likes_list_id ON list_likes(list_id);

DROP POLICY IF EXISTS "select_list_likes" ON list_likes;
CREATE POLICY "select_list_likes" ON list_likes FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_own_list_likes" ON list_likes;
CREATE POLICY "insert_own_list_likes" ON list_likes FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_list_likes" ON list_likes;
CREATE POLICY "delete_own_list_likes" ON list_likes FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Trigger: keep profiles.follower_count / following_count in sync
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION sync_follow_counts()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_follow_counts ON follows;
CREATE TRIGGER trg_sync_follow_counts
  AFTER INSERT OR DELETE ON follows
  FOR EACH ROW EXECUTE FUNCTION sync_follow_counts();

-- ---------------------------------------------------------------------------
-- Trigger: keep lists.item_count in sync
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION sync_list_item_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE lists SET item_count = item_count + 1, updated_at = now() WHERE id = NEW.list_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE lists SET item_count = GREATEST(item_count - 1, 0), updated_at = now() WHERE id = OLD.list_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_list_item_count ON list_items;
CREATE TRIGGER trg_sync_list_item_count
  AFTER INSERT OR DELETE ON list_items
  FOR EACH ROW EXECUTE FUNCTION sync_list_item_count();

-- Reuse the existing update_updated_at_column() function for lists
DROP TRIGGER IF EXISTS trg_lists_updated_at ON lists;
CREATE TRIGGER trg_lists_updated_at
  BEFORE UPDATE ON lists
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
