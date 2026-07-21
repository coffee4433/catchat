#!/usr/bin/env node
import { config } from 'dotenv'
import pg from 'pg'
import { createClient } from '@supabase/supabase-js'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

config({ path: join(__dirname, '..', '.env.local') })

const { Pool } = pg

const neonPool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function migrateMessages() {
  console.log('🔄 Migrando mensajes de Neon a Supabase...\n')

  try {
    // Obtener todos los mensajes de Neon
    console.log('📥 Obteniendo mensajes de Neon...')
    const { rows: neonMessages } = await neonPool.query(`
      SELECT 
        id,
        "conversationId" as conversation_id,
        "userId" as user_id,
        content,
        "createdAt" as created_at,
        replytoid as reply_to_id,
        ispinned as is_pinned,
        reactions,
        "readBy" as read_by
      FROM messages
      ORDER BY id
    `)

    console.log(`✓ ${neonMessages.length} mensajes encontrados en Neon\n`)

    if (neonMessages.length === 0) {
      console.log('⚠️  No hay mensajes para migrar')
      return
    }

    // Insertar mensajes en Supabase
    console.log('📤 Insertando mensajes en Supabase...')
    
    let successCount = 0
    let errorCount = 0

    for (const msg of neonMessages) {
      const { error } = await supabase
        .from('messages_realtime')
        .insert({
          id: msg.id,
          conversation_id: msg.conversation_id,
          user_id: msg.user_id,
          content: msg.content,
          created_at: msg.created_at,
          reply_to_id: msg.reply_to_id,
          is_pinned: msg.is_pinned,
          reactions: msg.reactions,
          read_by: msg.read_by
        })

      if (error) {
        if (error.code === '23505') {
          // Ya existe, actualizar
          const { error: updateError } = await supabase
            .from('messages_realtime')
            .update({
              conversation_id: msg.conversation_id,
              user_id: msg.user_id,
              content: msg.content,
              created_at: msg.created_at,
              reply_to_id: msg.reply_to_id,
              is_pinned: msg.is_pinned,
              reactions: msg.reactions,
              read_by: msg.read_by
            })
            .eq('id', msg.id)

          if (updateError) {
            console.log(`  ❌ Error actualizando mensaje ${msg.id}:`, updateError.message)
            errorCount++
          } else {
            successCount++
          }
        } else {
          console.log(`  ❌ Error insertando mensaje ${msg.id}:`, error.message)
          errorCount++
        }
      } else {
        successCount++
      }

      // Mostrar progreso
      if (successCount % 10 === 0) {
        process.stdout.write(`\r  ✓ ${successCount}/${neonMessages.length} mensajes migrados...`)
      }
    }

    console.log(`\n\n✅ Migración completada!`)
    console.log(`  ✓ Exitosos: ${successCount}`)
    if (errorCount > 0) {
      console.log(`  ✗ Errores: ${errorCount}`)
    }

    // Actualizar secuencia de ID
    console.log('\n🔢 Actualizando secuencia de IDs...')
    const maxId = Math.max(...neonMessages.map(m => m.id))
    
    const { error: seqError } = await supabase.rpc('exec_sql', {
      query: `SELECT setval('messages_realtime_id_seq', ${maxId}, true);`
    })

    if (!seqError) {
      console.log(`✓ Secuencia actualizada a ${maxId}`)
    }

    // Verificar migración
    console.log('\n🔍 Verificando migración...')
    const { count } = await supabase
      .from('messages_realtime')
      .select('*', { count: 'exact', head: true })

    console.log(`✓ ${count} mensajes en Supabase`)

    if (count === neonMessages.length) {
      console.log('\n🎉 Migración exitosa! Todos los mensajes fueron copiados.')
    } else {
      console.log(`\n⚠️  Algunos mensajes no se copiaron (${neonMessages.length - count} faltantes)`)
    }

  } catch (error) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  } finally {
    await neonPool.end()
  }
}

migrateMessages()
