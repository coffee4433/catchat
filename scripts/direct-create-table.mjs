#!/usr/bin/env node
import { config } from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

config({ path: join(__dirname, '..', '.env.local') })

const supabaseUrl = 'https://elaezozqikxdyuqwzwzs.supabase.co'
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVsYWV6b3pxaWt4ZHl1cXd6d3pzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDIxNDk2MCwiZXhwIjoyMDk5NzkwOTYwfQ.g78I58VqbG13g1exvCrrC5xokMWiEhreJ0-cYyPyF6o'

console.log('🚀 Creando tabla messages_realtime en Supabase...\n')

async function createTableDirect() {
  const sql = `
    CREATE TABLE IF NOT EXISTS public.messages_realtime (
      id SERIAL PRIMARY KEY,
      conversation_id INTEGER NOT NULL,
      user_id TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      reply_to_id INTEGER,
      is_pinned BOOLEAN NOT NULL DEFAULT false,
      reactions TEXT,
      read_by TEXT
    );
    
    CREATE INDEX IF NOT EXISTS idx_messages_realtime_conversation ON public.messages_realtime(conversation_id);
    CREATE INDEX IF NOT EXISTS idx_messages_realtime_created ON public.messages_realtime(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_messages_realtime_user ON public.messages_realtime(user_id);
    
    ALTER TABLE public.messages_realtime ENABLE ROW LEVEL SECURITY;
    
    DROP POLICY IF EXISTS "Enable all access for messages_realtime" ON public.messages_realtime;
    CREATE POLICY "Enable all access for messages_realtime" ON public.messages_realtime FOR ALL USING (true);
    
    SELECT 'Tabla messages_realtime creada exitosamente!' as status;
  `

  try {
    console.log('📝 Enviando SQL a Supabase...')
    
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
        'apikey': serviceKey,
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({
        query: sql
      })
    })

    if (response.ok) {
      const result = await response.json()
      console.log('✅ Respuesta de Supabase:', result)
      console.log('✅ Tabla creada exitosamente!')
    } else {
      const error = await response.text()
      console.log('⚠️  Respuesta del servidor:', response.status, error)
      
      if (response.status === 404) {
        console.log('\n❌ El endpoint RPC no está disponible')
        console.log('💡 Debes crear la tabla manualmente:')
        console.log('\n📋 PASOS MANUALES:')
        console.log('1. Ve a: https://elaezozqikxdyuqwzwzs.supabase.co/project/elaezozqikxdyuqwzwzs/sql')
        console.log('2. Crea una nueva query')
        console.log('3. Pega el contenido del archivo: supabase-setup.sql')
        console.log('4. Ejecuta el SQL')
        console.log('5. Luego ejecuta: pnpm migrate:to-supabase')
      }
    }

    // Intentar verificar que la tabla existe
    console.log('\n🔍 Verificando que la tabla existe...')
    
    const verifyResponse = await fetch(`${supabaseUrl}/rest/v1/messages_realtime?select=count&limit=1`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${serviceKey}`,
        'apikey': serviceKey,
        'Prefer': 'count=exact'
      }
    })

    if (verifyResponse.ok) {
      console.log('✅ Tabla messages_realtime verificada - existe y es accesible')
      console.log('\n🎉 Todo listo!')
      console.log('\n📊 Siguiente paso:')
      console.log('   pnpm migrate:to-supabase')
    } else {
      console.log('⚠️  No se pudo verificar la tabla:', verifyResponse.status)
      console.log('💡 Puede que necesites crearla manualmente')
    }

  } catch (error) {
    console.error('❌ Error:', error.message)
    console.log('\n💡 Solución alternativa:')
    console.log('1. Ve a: https://elaezozqikxdyuqwzwzs.supabase.co/project/elaezozqikxdyuqwzwzs/sql')
    console.log('2. Ejecuta el contenido de: supabase-setup.sql')
    console.log('3. Luego ejecuta: pnpm migrate:to-supabase')
  }
}

createTableDirect()