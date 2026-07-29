ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS catmusic_library JSONB DEFAULT '{}'::jsonb;
