#!/usr/bin/env node

/**
 * Script to create the user_preferences table in Supabase
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

dotenv.config({ path: resolve(__dirname, '../.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Error: Missing Supabase credentials in .env.local')
  console.error('   Need: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

console.log('Setting up user_preferences table in Supabase...\n')

async function setupPreferencesTable() {
  try {
    const { data: existing, error: checkError } = await supabase
      .from('user_preferences')
      .select('user_id')
      .limit(1)

    if (!checkError) {
      console.log('user_preferences table already exists\n')
      return
    }

    console.log('Table does not exist. Creating...\n')

    const createTableSQL = `
CREATE TABLE IF NOT EXISTS public.user_preferences (
  user_id TEXT PRIMARY KEY,
  translator_favorites TEXT DEFAULT '["en","es"]',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access" ON public.user_preferences;
CREATE POLICY "Service role full access"
  ON public.user_preferences
  FOR ALL
  USING (true);
`

    console.log('Run this SQL in the Supabase dashboard:\n')
    console.log('URL: https://elaezozqikxdyuqwzwzs.supabase.co/project/elaezozqikxdyuqwzwzs/sql/new\n')
    console.log('='.repeat(80))
    console.log(createTableSQL)
    console.log('='.repeat(80))
    console.log('\nAfter running the SQL, run this script again to verify.\n')

  } catch (error) {
    console.error('Error:', error.message)
    process.exit(1)
  }
}

setupPreferencesTable()
