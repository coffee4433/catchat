import fs from 'node:fs'
import { Pool } from 'pg'

for (const file of ['.env.development.local', '.env.local', '.env']) {
  if (!fs.existsSync(file)) continue
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const i = line.indexOf('=')
    if (i <= 0) continue
    const k = line.slice(0, i).trim()
    let v = line.slice(i + 1).trim()
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'")))
      v = v.slice(1, -1)
    if (!process.env[k]) process.env[k] = v
  }
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL })

async function main() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS conversation_participants (
      id SERIAL PRIMARY KEY,
      "conversationId" INTEGER NOT NULL,
      "userId" TEXT NOT NULL,
      "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
      UNIQUE ("conversationId", "userId")
    );
  `)
  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_participants_user ON conversation_participants ("userId");
  `)
  // Backfill: every existing conversation owner becomes a participant
  await pool.query(`
    INSERT INTO conversation_participants ("conversationId", "userId")
    SELECT id, "userId" FROM conversations
    ON CONFLICT ("conversationId", "userId") DO NOTHING;
  `)
  const r = await pool.query('SELECT COUNT(*) FROM conversation_participants')
  console.log('conversation_participants rows:', r.rows[0].count)
  await pool.end()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
