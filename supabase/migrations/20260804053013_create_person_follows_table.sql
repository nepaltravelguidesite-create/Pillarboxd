-- person_follows: allows users to follow TMDB people (actors/creators)
-- Unlike the follows table (user-to-user), this tracks user-to-person follows
-- since a TMDB person is not a user in this system.

CREATE TABLE IF NOT EXISTS person_follows (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  person_id   integer NOT NULL,
  person_name text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, person_id)
);

-- Enable RLS so only the owner can read/manage their person follows
ALTER TABLE person_follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_own_person_follows"
  ON person_follows FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "insert_own_person_follows"
  ON person_follows FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "delete_own_person_follows"
  ON person_follows FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- Index for quick lookups
CREATE INDEX idx_person_follows_user_id ON person_follows(user_id);
CREATE INDEX idx_person_follows_person_id ON person_follows(person_id);
