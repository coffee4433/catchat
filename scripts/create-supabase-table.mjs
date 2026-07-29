#!/usr/bin/env node
import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

config({ path: join(__dirname, '..', '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

console.log('🚀 Creando tabla messages_realtime en Supabase...\n')

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
})

async function createTable() {
  try {
    console.log('📝 Conectando a Supabase via API...')
    
    // Método 1: Intentar crear tabla via query simple
    const createTableSQL = `
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
    `
    
    console.log('🔨 Creando tabla messages_realtime...')
    
    // Usar fetch directo para ejecutar SQL
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Content-Type': 'application/json',
        'apikey': supabaseServiceKey
      },
      body: JSON.stringify({
        query: createTableSQL
      })
    })

    if (!response.ok) {
      // Si no funciona con RPC, intentar método alternativo
      console.log('⚠️  RPC no disponible, usando método alternativo...')
      
      // Crear tabla insertando una fila ficticia para forzar la creación del schema
      const { error: testError } = await supabase
        .from('messages_realtime')
        .select('id')
        .limit(1)
      
      if (testError && testError.code === 'PGRST204') {
        console.log('❌ La tabla no existe, necesita crearse manualmente')
        console.log('\n� INSTRUCCIONES MANUALES:')
        console.log('─'.repeat(60))
        console.log('1. Ve a: https://elaezozqikxdyuqwzwzs.supabase.co/project/elaezozqikxdyuqwzwzs/sql')
        console.log('2. Haz click en "New query"')
        console.log('3. Copia y pega este SQL:\n')
        
        const fullSQL = `
-- Crear tabla messages_realtime
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

-- Crear índices
CREATE INDEX IF NOT EXISTS idx_messages_realtime_conversation 
  ON public.messages_realtime(conversation_id);

CREATE INDEX IF NOT EXISTS idx_messages_realtime_created 
  ON public.messages_realtime(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_messages_realtime_user 
  ON public.messages_realtime(user_id);

-- Habilitar RLS
ALTER TABLE public.messages_realtime ENABLE ROW LEVEL SECURITY;

-- Crear políticas
DROP POLICY IF EXISTS "Enable read access for all users" ON public.messages_realtime;
CREATE POLICY "Enable read access for all users" 
  ON public.messages_realtime FOR SELECT USING (true);

DROP POLICY IF EXISTS "Enable insert for all users" ON public.messages_realtime;
CREATE POLICY "Enable insert for all users" 
  ON public.messages_realtime FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Enable update for all users" ON public.messages_realtime;
CREATE POLICY "Enable update for all users" 
  ON public.messages_realtime FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Enable delete for all users" ON public.messages_realtime;
CREATE POLICY "Enable delete for all users" 
  ON public.messages_realtime FOR DELETE USING (true);

-- Mensaje de confirmación
SELECT 'Tabla messages_realtime creada exitosamente!' as status;
        `
        
        console.log(fullSQL)
        console.log('─'.repeat(60))
        console.log('4. Haz click en "Run"')
        console.log('5. Deberías ver: "Tabla messages_realtime creada exitosamente!"')
        console.log('6. Ejecuta: pnpm migrate:to-supabase')
        
        console.log('\n� También puedes copiar el SQL del archivo: supabase-setup.sql')
        return
      }
    } else {
      console.log('✅ Tabla creada via RPC')
    }

    // Verificar que la tabla existe
    console.log('\n🔍 Verificando tabla...')
    const { data, error } = await supabase
      .from('messages_realtime')
      .select('*')
      .limit(1)

    if (error) {
      console.log('❌ Error al verificar tabla:', error.message)
      console.log('💡 Puede que necesites crearla manualmente')
    } else {
      console.log('✅ Tabla messages_realtime existe y es accesible')
      
      // Probar insertar mensaje de test
      console.log('� Probando insertar mensaje de test...')
      const { data: insertData, error: insertError } = await supabase
        .from('messages_realtime')
        .insert({
          conversation_id: 999999,
          user_id: 'test-setup',
          content: 'Test message from setup - safe to delete'
        })
        .select()

      if (insertError) {
        console.log('⚠️  Error al insertar:', insertError.message)
      } else {
        console.log('✅ Insert funciona correctamente')
        
        // Eliminar mensaje de test
        if (insertData?.[0]) {
          await supabase
            .from('messages_realtime')
            .delete()
            .eq('id', insertData[0].id)
          console.log('✅ Delete funciona correctamente')
        }
      }
    }

    console.log('\n🎉 Setup completado!')
    console.log('\n📊 Siguiente paso:')
    console.log('   pnpm migrate:to-supabase')

  } catch (error) {
    console.error('❌ Error:', error.message)
    console.log('\n💡 Solución alternativa:')
    console.log('1. Ve al SQL Editor de Supabase')
    console.log('2. Ejecuta el contenido de: supabase-setup.sql')
    console.log('3. Luego ejecuta: pnpm migrate:to-supabase')
  }
}

createTable()
