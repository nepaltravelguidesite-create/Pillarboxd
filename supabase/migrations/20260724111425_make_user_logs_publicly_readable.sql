/*
# Make user_logs publicly readable for reviews & ratings

1. Background / Problem
- The only SELECT policy on `user_logs` was `select_own_user_logs`, scoped
  to `auth.uid() = user_id`. That policy was written when `user_logs` was a
  private diary table, before the review feed, ratings histogram, and social
  features were built on top of it.
- As a result, every later feature that reads *other* users' logs has been
  silently blocked at the database level: the ratings histogram could never
  reflect other users' ratings, and the review feed could never show anyone
  else's review. This is a database-level block, not a frontend issue.
- The rest of the app already assumes reviews/ratings are publicly visible
  (the Letterboxd model), so this brings the policy in line with that model.

2. Changes
- DROP the old owner-only SELECT policy `select_own_user_logs` on `user_logs`.
- CREATE a new SELECT policy `select_all_user_logs` allowing any
  authenticated user to read all rows (`USING (true)`). This is intentional
  public/shared review data, matching the app's social model.

3. What is NOT changed
- The existing INSERT / UPDATE / DELETE policies on `user_logs` remain
  exactly as they are - they are correctly scoped to `auth.uid() = user_id`
  and stay that way. Only who can READ log entries changes; who can write or
  modify them is unaffected.

4. Security notes
- SELECT is intentionally public to all authenticated users (reviews and
  ratings are shared social content, same as Letterboxd).
- Writes remain owner-only - no other user can create, edit, or delete
  someone else's log entries.
- Idempotent: DROP IF EXISTS before CREATE so the migration is safe to re-run.
*/

DROP POLICY IF EXISTS "select_own_user_logs" ON user_logs;

CREATE POLICY "select_all_user_logs" ON user_logs FOR SELECT
  TO authenticated USING (true);
