import { Pool } from 'pg'

const connectionString = 'postgresql://neondb_owner:npg_0doYFiac7LzR@ep-bitter-mode-a2z7mw44-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=verify-full'
console.log('Connecting to:', connectionString)

try {
  const pool = new Pool({ connectionString })
  const r = await pool.query('SELECT 1')
  console.log('SUCCESS:', r.rows)
  await pool.end()
} catch (e) {
  console.error('ERROR connecting to database:', e)
}
