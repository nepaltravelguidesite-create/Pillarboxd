-- Add favorite_shows column to profiles
-- A jsonb array of up to 4 show objects { tmdb_id, name, poster_path }, ordered.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS favorite_shows jsonb NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.profiles.favorite_shows IS
  'User-curated ordered list of up to 4 favorite shows: [{ "tmdb_id": int, "name": text, "poster_path": text|null }]';
