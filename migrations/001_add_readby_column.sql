-- Migration: Add readBy column to messages table
-- This column stores a JSON array of user IDs who have read the message

ALTER TABLE messages ADD COLUMN IF NOT EXISTS "readBy" TEXT;

-- Optional: Add an index for better performance when querying read status
-- CREATE INDEX IF NOT EXISTS idx_messages_readby ON messages USING gin ("readBy" jsonb_path_ops);

COMMENT ON COLUMN messages."readBy" IS 'JSON array of user IDs who have read this message';
