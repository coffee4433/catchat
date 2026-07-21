import fs from 'node:fs'
import { Pool } from 'pg'

for (const line of fs.readFileSync('.env.development.local', 'utf8').split('\n')) {
  const i = line.indexOf('=')
  if (i > 0) {
    const k = line.slice(0, i).trim()
    let v = line.slice(i + 1).trim()
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'")))
      v = v.slice(1, -1)
    if (!process.env[k]) process.env[k] = v
  }
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const r = await pool.query(
  "select table_name from information_schema.tables where table_schema='public' order by 1",
)
console.log(r.rows.map((x) => x.table_name).join(', ') || '(no tables)')
await pool.end()
