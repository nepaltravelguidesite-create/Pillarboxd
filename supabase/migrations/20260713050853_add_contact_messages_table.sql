/*
# Add contact_messages table for the Contact page form

## Overview
Stores messages submitted via the public contact form. No auth required to insert
(anyone can send a message); only authenticated admin users can read them.

## New Tables

### `contact_messages`
- `id` (uuid PK)
- `name` (text - sender's name)
- `email` (text - sender's email, for replies)
- `message` (text - the message body)
- `created_at` (timestamptz)
- `handled` (boolean, default false - for admin triage)

## Security
- RLS enabled.
- INSERT: allowed for anyone (anon + authenticated) so non-signed-in visitors can submit.
- SELECT/UPDATE/DELETE: authenticated only (for admin triage).

## Important Notes
1. No email delivery is configured - messages are stored in the database only.
2. The `handled` column lets an admin mark messages as addressed.
*/

CREATE TABLE IF NOT EXISTS contact_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  handled boolean NOT NULL DEFAULT false
);

ALTER TABLE contact_messages ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_contact_messages_created ON contact_messages(created_at DESC);

-- Anyone can insert (contact form is public)
DROP POLICY IF EXISTS "insert_contact_messages" ON contact_messages;
CREATE POLICY "insert_contact_messages" ON contact_messages FOR INSERT
  TO anon, authenticated WITH CHECK (true);

-- Only authenticated users can read (admin triage)
DROP POLICY IF EXISTS "select_contact_messages" ON contact_messages;
CREATE POLICY "select_contact_messages" ON contact_messages FOR SELECT
  TO authenticated USING (true);

-- Only authenticated users can update (mark as handled)
DROP POLICY IF EXISTS "update_contact_messages" ON contact_messages;
CREATE POLICY "update_contact_messages" ON contact_messages FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

-- Only authenticated users can delete
DROP POLICY IF EXISTS "delete_contact_messages" ON contact_messages;
CREATE POLICY "delete_contact_messages" ON contact_messages FOR DELETE
  TO authenticated USING (true);
