/*
# Add notifications table for social activity

## Overview
A single `notifications` table capturing social events directed at a user:
new follows, comments on their reviews, likes on their reviews or lists.

## New Tables

### `notifications`
- `id` (uuid PK)
- `user_id` (uuid, DEFAULT auth.uid() — the RECIPIENT, not the actor)
- `actor_id` (uuid — who performed the action, nullable for system-generated)
- `type` (text: 'follow' | 'comment' | 'review_like' | 'list_like')
- `entity_id` (uuid — the id of the liked/commented entity, nullable for follows)
- `entity_type` (text: 'log' | 'list' | 'profile' — what was acted upon)
- `message` (text — pre-rendered human-readable text, e.g. "jane_doe liked your review of Severance")
- `read` (boolean, default false)
- `created_at` (timestamptz)

## Security
- RLS enabled.
- Owner-scoped: only the notification recipient (user_id) can read/update their notifications.
- Inserts are allowed for any authenticated user (so other users' actions can create
  notifications for the recipient). The application layer is responsible for only
  inserting notifications with the correct user_id.

## Important Notes
1. `actor_id` is nullable because some notifications may be system-generated.
2. `read` defaults to false; the UI marks them read on view.
3. An index on (user_id, read, created_at) supports the "unread count" + "recent list" queries efficiently.
*/

CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  type text NOT NULL,
  entity_id uuid,
  entity_type text,
  message text NOT NULL,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON notifications(user_id, read, created_at DESC) WHERE read = false;

CREATE INDEX IF NOT EXISTS idx_notifications_user_recent
  ON notifications(user_id, created_at DESC);

DROP POLICY IF EXISTS "select_own_notifications" ON notifications;
CREATE POLICY "select_own_notifications" ON notifications FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_notifications" ON notifications;
CREATE POLICY "insert_notifications" ON notifications FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "update_own_notifications" ON notifications;
CREATE POLICY "update_own_notifications" ON notifications FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_notifications" ON notifications;
CREATE POLICY "delete_own_notifications" ON notifications FOR DELETE
  TO authenticated USING (auth.uid() = user_id);
