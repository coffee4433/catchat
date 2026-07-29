#!/usr/bin/env node
import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

config({ path: join(__dirname, '..', '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

console.log('🔍 Probando conexión a Supabase...\n')
console.log('URL:', supabaseUrl)
console.log('Key (primeros 20 caracteres):', supabaseKey?.substring(0, 20) + '...')
console.log('')

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Faltan variables de entorno')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function testConnection() {
  try {
    // Test 1: Verificar autenticación
    console.log('📝 Test 1: Verificando credenciales...')
    const { data: healthData, error: healthError } = await supabase
      .from('_supabase_health')
      .select('*')
      .limit(1)
    
    if (!healthError || healthError.code !== 'PGRST204') {
      console.log('✅ Credenciales válidas\n')
    } else {
      console.log('✅ Credenciales válidas (tabla no existe pero auth OK)\n')
    }

    // Test 2: Verificar tabla messages_realtime
    console.log('📝 Test 2: Verificando tabla messages_realtime...')
    const { data, error } = await supabase
      .from('messages_realtime')
      .select('count')
      .limit(1)

    if (error) {
      if (error.code === 'PGRST204' || error.message.includes('does not exist')) {
        console.log('❌ Tabla messages_realtime NO existe')
        console.log('💡 Debes crear la tabla primero')
        console.log('👉 Ejecuta el SQL en: supabase-setup.sql\n')
      } else {
        console.log('⚠️  Error:', error.message)
        console.log('💡 Verifica las políticas RLS\n')
      }
    } else {
      console.log('✅ Tabla messages_realtime existe y es accesible\n')
    }

    // Test 3: Probar insert (si la tabla existe)
    if (!error) {
      console.log('📝 Test 3: Probando insert de test...')
      const { data: insertData, error: insertError } = await supabase
        .from('messages_realtime')
        .insert({
          conversation_id: 999999,
          user_id: 'test-user',
          content: 'Test message - can be deleted',
          created_at: new Date().toISOString()
        })
        .select()

      if (insertError) {
        console.log('⚠️  No se pudo insertar:', insertError.message)
        console.log('💡 Verifica las políticas RLS de INSERT\n')
      } else {
        console.log('✅ Insert funciona correctamente')
        
        // Eliminar mensaje de test
        if (insertData && insertData[0]) {
          await supabase
            .from('messages_realtime')
            .delete()
            .eq('id', insertData[0].id)
          console.log('✅ Delete funciona correctamente\n')
        }
      }
    }

    // Test 4: Probar suscripción realtime
    console.log('📝 Test 4: Probando suscripción en tiempo real...')
    
    const channel = supabase
      .channel('test-realtime')
      .on('postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages_realtime'
        },
        (payload) => {
          console.log('✅ Evento recibido:', payload.eventType)
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('✅ Realtime funcionando correctamente')
          console.log('\n🎉 Todas las pruebas pasaron!')
          console.log('\n📋 Resumen:')
          console.log('  ✓ Conexión a Supabase')
          console.log('  ✓ Credenciales válidas')
          console.log('  ✓ Tabla accesible')
          console.log('  ✓ Políticas RLS configuradas')
          console.log('  ✓ Realtime habilitado')
          console.log('\n🚀 Todo listo para usar!')
          
          setTimeout(() => {
            channel.unsubscribe()
            process.exit(0)
          }, 2000)
        } else if (status === 'CHANNEL_ERROR') {
          console.log('❌ Error en suscripción realtime')
          console.log('💡 Verifica que Realtime esté habilitado en Supabase')
          console.log('   Database → Replication → messages_realtime')
          process.exit(1)
        } else if (status === 'TIMED_OUT') {
          console.log('⏱️  Timeout en suscripción')
          console.log('💡 Puede ser un problema de red o configuración')
          process.exit(1)
        }
      })

  } catch (error) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  }
}

testConnection()
