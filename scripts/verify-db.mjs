#!/usr/bin/env node
import { config } from 'dotenv'
import pg from 'pg'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

config({ path: join(__dirname, '..', '.env.local') })

const { Pool } = pg

async function verifyDatabase() {
  console.log('🔍 Verificando estructura de la base de datos...\n')
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  })

  try {
    // Verificar columnas de messages
    const columns = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'messages'
      ORDER BY ordinal_position
    `)
    
    console.log('📋 Columnas en la tabla messages:')
    console.log('─'.repeat(50))
    columns.rows.forEach(col => {
      const check = col.column_name === 'readBy' ? '✓' : ' '
      console.log(`${check} ${col.column_name.padEnd(20)} ${col.data_type.padEnd(15)} ${col.is_nullable}`)
    })
    
    // Verificar si readBy existe
    const hasReadBy = columns.rows.some(col => col.column_name === 'readBy')
    
    console.log('\n' + '─'.repeat(50))
    if (hasReadBy) {
      console.log('✅ Columna readBy encontrada - Todo correcto!')
    } else {
      console.log('❌ Columna readBy NO encontrada - Ejecuta: pnpm migrate')
    }
    
    // Contar mensajes
    const count = await pool.query('SELECT COUNT(*) as total FROM messages')
    console.log(`\n📊 Total de mensajes en la base de datos: ${count.rows[0].total}`)
    
    // Verificar mensajes recientes
    const recent = await pool.query(`
      SELECT id, content, "userId", "readBy", "createdAt"
      FROM messages
      ORDER BY "createdAt" DESC
      LIMIT 3
    `)
    
    if (recent.rows.length > 0) {
      console.log('\n📝 Últimos 3 mensajes:')
      console.log('─'.repeat(50))
      recent.rows.forEach((msg, i) => {
        console.log(`${i + 1}. [${msg.id}] ${msg.content.substring(0, 30)}...`)
        console.log(`   Usuario: ${msg.userId}`)
        console.log(`   ReadBy: ${msg.readBy || 'null'}`)
        console.log(`   Fecha: ${msg.createdAt}`)
        console.log('')
      })
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

verifyDatabase()
