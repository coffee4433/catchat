#!/usr/bin/env node
import { config } from 'dotenv'
import pg from 'pg'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Cargar variables de entorno
config({ path: join(__dirname, '..', '.env.local') })

const { Pool } = pg

async function applyMigration() {
  console.log('🔄 Conectando a la base de datos Neon...')
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  })

  try {
    // Leer el archivo de migración
    const migrationPath = join(__dirname, '..', 'migrations', '001_add_readby_column.sql')
    const migrationSQL = readFileSync(migrationPath, 'utf-8')

    console.log('📝 Aplicando migración: Agregar columna readBy a messages...')
    
    // Ejecutar la migración
    await pool.query(migrationSQL)
    
    console.log('✅ Migración aplicada exitosamente!')
    
    // Verificar que la columna existe
    const result = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'messages' AND column_name = 'readBy'
    `)
    
    if (result.rows.length > 0) {
      console.log('✓ Columna readBy confirmada en la tabla messages')
      console.log(`  Tipo de dato: ${result.rows[0].data_type}`)
    } else {
      console.log('⚠️  Advertencia: No se pudo verificar la columna')
    }
    
    console.log('\n🎉 Todo listo! Ahora puedes ejecutar: pnpm dev')
    
  } catch (error) {
    console.error('❌ Error al aplicar la migración:', error.message)
    
    if (error.code === '42701') {
      console.log('\n⚠️  La columna readBy ya existe. No hay problema, puedes continuar.')
    } else {
      console.error('\nDetalles del error:', error)
      process.exit(1)
    }
  } finally {
    await pool.end()
  }
}

applyMigration()
