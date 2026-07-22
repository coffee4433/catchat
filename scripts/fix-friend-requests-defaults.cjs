const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') })
const { Pool } = require('pg')
const p = new Pool({ connectionString: process.env.DATABASE_URL })

async function fix() {
  await p.query(`ALTER TABLE friend_requests ALTER COLUMN id SET DEFAULT gen_random_uuid()`)
  console.log('Added UUID default on id')
  await p.query(`ALTER TABLE friend_requests ALTER COLUMN created_at SET DEFAULT NOW()`)
  console.log('Added NOW() default on created_at')
  await p.end()
}

fix().catch(e => { console.log(e.message); p.end() })
