#!/usr/bin/env node
import { config } from 'dotenv'
import pg from 'pg'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

config({ path: join(__dirname, '..', '.env.local') })

const { Pool } = pg

async function applyMigration() {
  console.log('🔄 Conectando a PostgreSQL (Drizzle/Neon)...')

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  })

  try {
    const migrationPath = join(__dirname, '..', 'migrations', '003_add_pinnedby_column.sql')
    const migrationSQL = readFileSync(migrationPath, 'utf-8')

    console.log('📝 Aplicando migración: Agregar columna pinnedBy a messages...')

    await pool.query(migrationSQL)

    console.log('✅ Migración aplicada exitosamente!')

    const result = await pool.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'messages' AND column_name = 'pinnedby'
    `)

    if (result.rows.length > 0) {
      console.log('✓ Columna pinnedby confirmada en la tabla messages')
      console.log(`  Tipo de dato: ${result.rows[0].data_type}`)
    } else {
      console.log('⚠️  Advertencia: No se pudo verificar la columna')
    }

  } catch (error) {
    if (error.code === '42701') {
      console.log('\n⚠️  La columna pinnedby ya existe. No hay problema, puedes continuar.')
    } else {
      console.error('❌ Error al aplicar la migración:', error.message)
      process.exit(1)
    }
  } finally {
    await pool.end()
  }
}

applyMigration()
