const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') })
const { Pool } = require('pg')
const p = new Pool({ connectionString: process.env.DATABASE_URL })

const sql = `
ALTER TABLE friend_requests ALTER COLUMN requester_id TYPE TEXT;
ALTER TABLE friend_requests ALTER COLUMN recipient_id TYPE TEXT;
`

p.query(sql)
  .then(() => { console.log('Columns altered to TEXT'); p.end() })
  .catch(e => { console.log(e.message); p.end() })
