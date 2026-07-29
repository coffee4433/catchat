-- Migration: Add banner column to user table
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "banner" TEXT;
COMMENT ON COLUMN "user"."banner" IS 'URL of the user banner image stored in Supabase Storage';
