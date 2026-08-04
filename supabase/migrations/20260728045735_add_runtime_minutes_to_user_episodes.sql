/*
# Add runtime_minutes column to user_episodes

## Summary
Adds a nullable `runtime_minutes` integer column to the `user_episodes` table
so that each watched episode records its actual TMDB-provided runtime in minutes.
This replaces the flat 45-minute-per-episode estimate previously used on the
Stats page with real, per-episode data.

## Changes
1. New column:
   - `runtime_minutes` (integer, nullable) on `user_episodes`
   - Stores the actual episode runtime from TMDB's `runtime` field on the
     season/episode detail response. Falls back to the show's average
     `episode_run_time` if the specific episode doesn't have a runtime.
   - NULL means "unknown runtime" - the Stats page excludes these from the
     real sum rather than treating them as zero or a flat default.

## Security
- No RLS policy changes - `user_episodes` already has owner-scoped policies.
- The new column is covered by existing SELECT/INSERT/UPDATE policies since
  RLS applies at the row level, not the column level.

## Notes
1. Existing rows will have `runtime_minutes = NULL` until backfilled by the
   `backfill-episode-runtimes` edge function or updated on next toggle.
2. The Stats page continues to work for legacy rows by falling back to a
   reasonable default for episodes without a stored runtime.
3. No data is lost - this is purely additive.
*/

ALTER TABLE user_episodes
  ADD COLUMN IF NOT EXISTS runtime_minutes integer;
