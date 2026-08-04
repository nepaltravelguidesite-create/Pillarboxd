/*
# Add personal tags to user_logs

## Summary
Adds a `tags` column to the `user_logs` table, allowing users to attach
free-text personal tags to their diary/review entries (e.g. "comfort show",
"cried", "background watch"). Tags are stored as a text array, defaulting
to an empty array. This is separate from genre tags and the existing
single-value `vibe_tag` column - it supports multiple user-defined tags
per log entry.

## Changes
1. New column: `user_logs.tags` - `text[]`, nullable, default `{}`.
   - Stored as a Postgres array for efficient querying.
   - Default empty array means existing rows are unaffected.

## Security
- No new tables created.
- No RLS policy changes needed - the existing per-user CRUD policies on
  `user_logs` already cover the new column (users can only read/write
  their own rows, which includes the tags field).
- The `user_logs` table is already publicly readable for SELECT (review
  feed), so tags will be visible to other users on review cards, which
  is the intended behavior (tags are public content like reviews).

## Important notes
1. Tags are user-created free-text - no predefined tag list.
2. Tags are optional; the column defaults to an empty array.
3. Tags are public (visible on review cards) like the review text itself.
*/

ALTER TABLE user_logs
  ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}'::text[];
