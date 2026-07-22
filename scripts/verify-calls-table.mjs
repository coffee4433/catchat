import { eq } from 'drizzle-orm'
import { db } from './lib/db'
import { calls } from './lib/db/schema'

// This will error if the table doesn't exist yet.
// Run the SQL migration first: migrations/004_add_calls_table.sql
async function verify() {
  const existing = await db.select().from(calls).limit(1)
  console.log('Calls table exists, query returned:', existing.length, 'rows')
  process.exit(0)
}

verify()
