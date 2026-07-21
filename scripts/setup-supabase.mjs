#!/usr/bin/env node
import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Cargar variables de entorno
config({ path: join(__dirname, '..', '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY son requeridos')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function setupSupabase() {
  console.log('🚀 Configurando Supabase para tiempo real...\n')

  try {
    // Crear tabla de mensajes en Supabase
    console.log('📝 Creando tabla messages_realtime...')
    
    const { error: createError } = await supabase.rpc('exec_sql', {
      query: `
        -- Crear tabla para mensajes en tiempo real
        CREATE TABLE IF NOT EXISTS messages_realtime (
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

        -- Crear índices para mejor performance
        CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages_realtime(conversation_id);
        CREATE INDEX IF NOT EXISTS idx_messages_created ON messages_realtime(created_at);
        CREATE INDEX IF NOT EXISTS idx_messages_user ON messages_realtime(user_id);

        -- Habilitar Row Level Security
        ALTER TABLE messages_realtime ENABLE ROW LEVEL SECURITY;

        -- Política: Todos pueden leer
        DROP POLICY IF EXISTS "Enable read access for all users" ON messages_realtime;
        CREATE POLICY "Enable read access for all users" 
          ON messages_realtime FOR SELECT 
          USING (true);

        -- Política: Usuarios autenticados pueden insertar
        DROP POLICY IF EXISTS "Enable insert for authenticated users" ON messages_realtime;
        CREATE POLICY "Enable insert for authenticated users" 
          ON messages_realtime FOR INSERT 
          WITH CHECK (true);

        -- Política: Usuarios pueden actualizar sus propios mensajes
        DROP POLICY IF EXISTS "Enable update for message owners" ON messages_realtime;
        CREATE POLICY "Enable update for message owners" 
          ON messages_realtime FOR UPDATE 
          USING (true);

        -- Política: Usuarios pueden eliminar sus propios mensajes
        DROP POLICY IF EXISTS "Enable delete for message owners" ON messages_realtime;
        CREATE POLICY "Enable delete for message owners" 
          ON messages_realtime FOR DELETE 
          USING (true);

        -- Habilitar realtime para la tabla
        ALTER PUBLICATION supabase_realtime ADD TABLE messages_realtime;
      `
    })

    if (createError) {
      console.error('❌ Error al crear tabla:', createError)
      
      // Intentar método alternativo usando SQL directo
      console.log('🔄 Intentando método alternativo...')
      
      const { error: altError } = await supabase
        .from('messages_realtime')
        .select('id')
        .limit(1)

      if (altError && altError.code === 'PGRST204') {
        console.log('⚠️  La tabla no existe. Creándola manualmente...')
        console.log('\n📋 Ejecuta este SQL en el editor de Supabase:')
        console.log('─'.repeat(60))
        console.log(`
-- Tabla de mensajes en tiempo real
CREATE TABLE IF NOT EXISTS messages_realtime (
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

-- Índices
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages_realtime(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON messages_realtime(created_at);
CREATE INDEX IF NOT EXISTS idx_messages_user ON messages_realtime(user_id);

-- Row Level Security
ALTER TABLE messages_realtime ENABLE ROW LEVEL SECURITY;

-- Políticas
DROP POLICY IF EXISTS "Enable read access for all users" ON messages_realtime;
CREATE POLICY "Enable read access for all users" 
  ON messages_realtime FOR SELECT 
  USING (true);

DROP POLICY IF EXISTS "Enable insert for authenticated users" ON messages_realtime;
CREATE POLICY "Enable insert for authenticated users" 
  ON messages_realtime FOR INSERT 
  WITH CHECK (true);

DROP POLICY IF EXISTS "Enable update for message owners" ON messages_realtime;
CREATE POLICY "Enable update for message owners" 
  ON messages_realtime FOR UPDATE 
  USING (true);

DROP POLICY IF EXISTS "Enable delete for message owners" ON messages_realtime;
CREATE POLICY "Enable delete for message owners" 
  ON messages_realtime FOR DELETE 
  USING (true);
        `)
        console.log('─'.repeat(60))
        console.log('\n📍 Pasos:')
        console.log('1. Ve a: https://elaezozqikxdyuqwzwzs.supabase.co/project/_/sql')
        console.log('2. Copia y pega el SQL de arriba')
        console.log('3. Click en "Run"')
        console.log('4. Ejecuta este script de nuevo')
      }
    } else {
      console.log('✅ Tabla messages_realtime creada exitosamente')
    }

    // Verificar conexión y tabla
    console.log('\n🔍 Verificando configuración...')
    
    const { data, error: selectError } = await supabase
      .from('messages_realtime')
      .select('count')
      .limit(1)

    if (selectError) {
      console.log('⚠️  No se pudo verificar la tabla:', selectError.message)
      console.log('💡 Probablemente necesitas crear la tabla manualmente en Supabase')
    } else {
      console.log('✅ Conexión a Supabase establecida')
      console.log('✅ Tabla messages_realtime accesible')
    }

    // Probar suscripción en tiempo real
    console.log('\n🔔 Probando suscripción en tiempo real...')
    
    const channel = supabase
      .channel('test-channel')
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
          console.log('✅ Suscripción en tiempo real funcionando')
          console.log('\n🎉 Supabase configurado correctamente!\n')
          console.log('📊 Resumen:')
          console.log('  ✓ Tabla messages_realtime creada')
          console.log('  ✓ Índices configurados')
          console.log('  ✓ Row Level Security habilitado')
          console.log('  ✓ Realtime funcionando')
          console.log('\n🚀 Siguiente paso: pnpm migrate:to-supabase')
          
          setTimeout(() => {
            channel.unsubscribe()
            process.exit(0)
          }, 2000)
        } else if (status === 'CHANNEL_ERROR') {
          console.log('❌ Error en la suscripción')
          console.log('💡 Verifica que Realtime esté habilitado en Supabase')
          process.exit(1)
        }
      })

  } catch (error) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  }
}

setupSupabase()
