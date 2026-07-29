import { config } from 'dotenv'
import pg from 'pg'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

config({ path: join(__dirname, '..', '.env.local') })

const { Pool } = pg

async function backfill() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL })

  console.log('Pinned messages before backfill:')
  const { rows: before } = await pool.query('SELECT id, ispinned, pinnedby FROM messages WHERE ispinned = true')
  console.log(JSON.stringify(before, null, 2))

  const result = await pool.query('UPDATE messages SET pinnedby = "userId" WHERE ispinned = true AND pinnedby IS NULL')
  console.log('Updated', result.rowCount, 'rows')

  const { rows: after } = await pool.query('SELECT id, ispinned, pinnedby FROM messages WHERE ispinned = true')
  console.log('After backfill:', JSON.stringify(after, null, 2))

  await pool.end()
}

backfill().catch(e => { console.error(e); process.exit(1) })
