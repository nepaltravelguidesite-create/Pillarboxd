/*
# Create user_shows and user_logs tables

1. Purpose
   Stores each authenticated user's interactions with TV shows:
   - Ratings (0-10 in half-star increments, stored as numeric)
   - Likes (boolean toggle)
   - Watchlist membership (boolean toggle)
   - Diary / log entries (date watched, episodes, review, rewatch flag)

2. New Tables
   - `user_shows`
     - `id` (uuid, PK)
     - `user_id` (uuid, NOT NULL, DEFAULT auth.uid(), FK to auth.users)
     - `show_id` (integer, NOT NULL - TMDB series ID)
     - `show_name` (text - denormalized for quick display)
     - `show_poster_path` (text, nullable - denormalized poster path)
     - `show_backdrop_path` (text, nullable - denormalized backdrop path)
     - `show_first_air_date` (text, nullable - denormalized year info)
     - `rating` (numeric, nullable - 0.5 to 5.0 in half-star steps, or null = unrated)
     - `liked` (boolean, default false)
     - `watchlisted` (boolean, default false)
     - `created_at` (timestamptz, default now())
     - `updated_at` (timestamptz, default now())
     - UNIQUE constraint on (user_id, show_id)

   - `user_logs`
     - `id` (uuid, PK)
     - `user_id` (uuid, NOT NULL, DEFAULT auth.uid(), FK to auth.users)
     - `show_id` (integer, NOT NULL - TMDB series ID)
     - `show_name` (text - denormalized)
     - `show_poster_path` (text, nullable)
     - `show_backdrop_path` (text, nullable)
     - `show_first_air_date` (text, nullable)
     - `watched_date` (date, NOT NULL - the date the user watched)
     - `seasons_watched` (integer, default 0)
     - `episodes_watched` (integer, default 1)
     - `review` (text, nullable - rich-text review)
     - `rewatch` (boolean, default false)
     - `rating` (numeric, nullable - 0.5 to 5.0)
     - `created_at` (timestamptz, default now())

3. Security
   - RLS enabled on both tables.
   - Owner-scoped CRUD: each authenticated user can only access rows they own.
   - `user_id` defaults to `auth.uid()` so inserts that omit it still satisfy WITH CHECK.
   - 4 policies per table (SELECT, INSERT, UPDATE, DELETE), scoped TO authenticated.

4. Indexes
   - `user_shows`: index on (user_id) and unique on (user_id, show_id)
   - `user_logs`: index on (user_id, watched_date desc) for diary queries

5. Important Notes
   - Both tables use DEFAULT auth.uid() on user_id so frontend inserts work
     without explicitly passing user_id.
   - Denormalized show fields (name, poster_path, etc.) are stored at log time
     so diary entries remain readable even if TMDB data changes.
   - Rating stored as numeric (e.g. 3.5 = 3.5 stars) for half-star precision.
*/

-- ---------------------------------------------------------------------------
-- user_shows table
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS user_shows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  show_id integer NOT NULL,
  show_name text NOT NULL,
  show_poster_path text,
  show_backdrop_path text,
  show_first_air_date text,
  rating numeric(2,1),
  liked boolean NOT NULL DEFAULT false,
  watchlisted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_shows_rating_check CHECK (rating IS NULL OR (rating >= 0 AND rating <= 5)),
  CONSTRAINT user_shows_user_show_key UNIQUE (user_id, show_id)
);

ALTER TABLE user_shows ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_user_shows_user_id ON user_shows(user_id);
CREATE INDEX IF NOT EXISTS idx_user_shows_watchlisted ON user_shows(user_id, watchlisted) WHERE watchlisted = true;
CREATE INDEX IF NOT EXISTS idx_user_shows_liked ON user_shows(user_id, liked) WHERE liked = true;

DROP POLICY IF EXISTS "select_own_user_shows" ON user_shows;
CREATE POLICY "select_own_user_shows" ON user_shows FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_user_shows" ON user_shows;
CREATE POLICY "insert_own_user_shows" ON user_shows FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_user_shows" ON user_shows;
CREATE POLICY "update_own_user_shows" ON user_shows FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_user_shows" ON user_shows;
CREATE POLICY "delete_own_user_shows" ON user_shows FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- user_logs table
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS user_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  show_id integer NOT NULL,
  show_name text NOT NULL,
  show_poster_path text,
  show_backdrop_path text,
  show_first_air_date text,
  watched_date date NOT NULL DEFAULT CURRENT_DATE,
  seasons_watched integer NOT NULL DEFAULT 0,
  episodes_watched integer NOT NULL DEFAULT 1,
  review text,
  rewatch boolean NOT NULL DEFAULT false,
  rating numeric(2,1),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_logs_rating_check CHECK (rating IS NULL OR (rating >= 0 AND rating <= 5))
);

ALTER TABLE user_logs ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_user_logs_user_date ON user_logs(user_id, watched_date DESC);
CREATE INDEX IF NOT EXISTS idx_user_logs_user_id ON user_logs(user_id);

DROP POLICY IF EXISTS "select_own_user_logs" ON user_logs;
CREATE POLICY "select_own_user_logs" ON user_logs FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_user_logs" ON user_logs;
CREATE POLICY "insert_own_user_logs" ON user_logs FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_user_logs" ON user_logs;
CREATE POLICY "update_own_user_logs" ON user_logs FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_user_logs" ON user_logs;
CREATE POLICY "delete_own_user_logs" ON user_logs FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- updated_at trigger for user_shows
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_user_shows_updated_at ON user_shows;
CREATE TRIGGER trg_user_shows_updated_at
  BEFORE UPDATE ON user_shows
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
