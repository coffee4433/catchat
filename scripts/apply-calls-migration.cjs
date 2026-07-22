const { config } = require('dotenv')
const { readFileSync } = require('fs')
const { join } = require('path')
const { Pool } = require('pg')

config({ path: join(__dirname, '..', '.env.local') })

async function migrate() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  })

  try {
    const sql = readFileSync(join(__dirname, '..', 'migrations', '004_add_calls_table.sql'), 'utf-8')
    console.log('Applying migration: calls table...')
    await pool.query(sql)
    console.log('Migration applied successfully.')

    const result = await pool.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'calls'
      ORDER BY ordinal_position
    `)
    console.log('\nCalls table columns:')
    result.rows.forEach(r => console.log(`  ${r.column_name}: ${r.data_type}`))
  } catch (e) {
    if (e.code === '42P07') {
      console.log('Table "calls" already exists. Skipping.')
    } else {
      console.error('Migration failed:', e.message)
      process.exit(1)
    }
  } finally {
    await pool.end()
  }
}

migrate()
