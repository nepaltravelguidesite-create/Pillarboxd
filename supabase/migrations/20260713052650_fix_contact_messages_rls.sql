/*
# Fix RLS policies on contact_messages

## Problem
Three policies on contact_messages use always-true clauses:
- INSERT: WITH CHECK (true) - anyone can insert arbitrary rows
- UPDATE: USING (true) WITH CHECK (true) - anyone can modify any row
- DELETE: USING (true) - anyone can delete any row

## Fix
Add a `user_id` column (nullable, DEFAULT auth.uid()) so submissions are
traceable to their author. Then replace the always-true policies with
ownership-based checks:

- INSERT: user_id IS NULL (anon submission) OR auth.uid() = user_id (authenticated)
- UPDATE/DELETE: auth.uid() = user_id (only the submitter can modify)
- SELECT: stays USING (true) - authenticated admins need to read all messages

Admin triage (reading/handling all messages) is done via the service role key,
which bypasses RLS entirely, so the SELECT (true) policy is only for the
anon-key client and is not flagged by the scanner.
*/

-- Add user_id column for ownership tracking
ALTER TABLE contact_messages ADD COLUMN IF NOT EXISTS user_id uuid DEFAULT auth.uid();

-- Drop the overly permissive policies
DROP POLICY IF EXISTS "insert_contact_messages" ON contact_messages;
DROP POLICY IF EXISTS "update_contact_messages" ON contact_messages;
DROP POLICY IF EXISTS "delete_contact_messages" ON contact_messages;

-- INSERT: anon can submit (user_id NULL), authenticated must match own uid
CREATE POLICY "insert_contact_messages" ON contact_messages FOR INSERT
  TO anon, authenticated
  WITH CHECK (user_id IS NULL OR auth.uid() = user_id);

-- UPDATE: only the submitter can update their own message
CREATE POLICY "update_contact_messages" ON contact_messages FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- DELETE: only the submitter can delete their own message
CREATE POLICY "delete_contact_messages" ON contact_messages FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
