-- Migration: Add pinnedBy column to messages table
-- Stores the user ID of who pinned the message, null when not pinned
ALTER TABLE messages ADD COLUMN IF NOT EXISTS "pinnedby" TEXT;
COMMENT ON COLUMN messages."pinnedby" IS 'User ID of who pinned this message, null if not pinned';
