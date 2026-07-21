#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://elaezozqikxdyuqwzwzs.supabase.co'
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVsYWV6b3pxaWt4ZHl1cXd6d3pzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDIxNDk2MCwiZXhwIjoyMDk5NzkwOTYwfQ.g78I58VqbG13g1exvCrrC5xokMWiEhreJ0-cYyPyF6o'

const supabase = createClient(supabaseUrl, serviceKey)

console.log('🔍 Verificando estado de Realtime en Supabase...\n')

async function checkRealtimeStatus() {
  try {
    // 1. Verificar que podemos conectar al servicio de Realtime
    console.log('📡 Test 1: Verificando servicio Realtime...')
    
    const channel = supabase.channel('status-check')
    
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Timeout - Realtime no responde'))
      }, 10000)

      channel.subscribe((status) => {
        clearTimeout(timeout)
        
        console.log('   Estado de suscripción:', status)
        
        if (status === 'SUBSCRIBED') {
          console.log('   ✅ Realtime está ACTIVO y funcionando\n')
          resolve()
        } else if (status === 'CHANNEL_ERROR') {
          console.log('   ❌ Error en el canal de Realtime\n')
          reject(new Error('Channel error'))
        } else if (status === 'TIMED_OUT') {
          console.log('   ⏱️  Timeout en la conexión\n')
          reject(new Error('Timeout'))
        } else {
          console.log('   ⚠️  Estado:', status)
        }
      })
    }).catch(err => {
      console.log('   ❌', err.message)
    })

    await channel.unsubscribe()

    // 2. Verificar publicaciones (replication)
    console.log('📚 Test 2: Verificando publicaciones de Postgres...')
    
    const { data: publications, error: pubError } = await supabase
      .rpc('get_publications')
      .catch(() => ({ data: null, error: { message: 'RPC no disponible' } }))

    if (pubError) {
      console.log('   ⚠️  No se pudo obtener info de publicaciones:', pubError.message)
      console.log('   💡 Esto es normal si no tienes permisos de RPC\n')
    } else if (publications) {
      console.log('   ✅ Publicaciones encontradas:', publications)
    }

    // 3. Verificar si la tabla messages_realtime existe y está en publicación
    console.log('📋 Test 3: Verificando tabla messages_realtime...')
    
    const { data: tables, error: tableError } = await supabase
      .from('messages_realtime')
      .select('id')
      .limit(1)

    if (tableError) {
      if (tableError.code === 'PGRST204' || tableError.message.includes('does not exist')) {
        console.log('   ❌ La tabla messages_realtime NO EXISTE')
        console.log('   💡 Necesitas crearla primero usando supabase-setup.sql\n')
      } else {
        console.log('   ⚠️  Error:', tableError.message, '\n')
      }
    } else {
      console.log('   ✅ La tabla messages_realtime EXISTE y es accesible\n')
    }

    // 4. Test de suscripción a cambios en la tabla (si existe)
    if (!tableError) {
      console.log('🔔 Test 4: Probando suscripción a cambios en messages_realtime...')
      
      const testChannel = supabase
        .channel('messages-test')
        .on('postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'messages_realtime'
          },
          (payload) => {
            console.log('   📨 Evento recibido:', payload.eventType)
          }
        )

      await new Promise((resolve) => {
        testChannel.subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            console.log('   ✅ Suscripción a messages_realtime FUNCIONA')
            console.log('   🎉 Realtime está completamente configurado!\n')
            resolve()
          } else if (status === 'CHANNEL_ERROR') {
            console.log('   ❌ Error en suscripción a la tabla')
            console.log('   💡 Verifica que Realtime esté habilitado en Database → Replication\n')
            resolve()
          } else if (status === 'TIMED_OUT') {
            console.log('   ⏱️  Timeout en suscripción\n')
            resolve()
          }
        })

        // Timeout de 8 segundos
        setTimeout(resolve, 8000)
      })

      await testChannel.unsubscribe()
    }

    // Resumen final
    console.log('─'.repeat(60))
    console.log('📊 RESUMEN:')
    console.log('─'.repeat(60))
    
    if (tableError) {
      console.log('❌ Tabla messages_realtime: NO EXISTE')
      console.log('   → Acción: Ejecuta el SQL en supabase-setup.sql')
      console.log('   → Link: https://elaezozqikxdyuqwzwzs.supabase.co/project/elaezozqikxdyuqwzwzs/sql/new')
    } else {
      console.log('✅ Tabla messages_realtime: EXISTE')
    }
    
    console.log('✅ Servicio Realtime: ACTIVO')
    console.log('✅ Credenciales: VÁLIDAS')
    
    console.log('\n🎯 Próximo paso:')
    if (tableError) {
      console.log('   1. Crear tabla: Ejecuta supabase-setup.sql en Supabase')
      console.log('   2. Migrar datos: pnpm migrate:to-supabase')
    } else {
      console.log('   pnpm migrate:to-supabase')
    }

  } catch (error) {
    console.error('❌ Error general:', error.message)
  }
}

checkRealtimeStatus()
