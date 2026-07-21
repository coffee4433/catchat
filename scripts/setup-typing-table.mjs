#!/usr/bin/env node

/**
 * Script para crear la tabla typing_status en Supabase
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Cargar variables de entorno
dotenv.config({ path: resolve(__dirname, '../.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: Faltan las credenciales de Supabase en .env.local')
  console.error('   Necesitas: NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

console.log('🚀 Configurando tabla typing_status en Supabase...\n')

async function setupTypingTable() {
  try {
    // Verificar si la tabla ya existe
    console.log('📋 Verificando si la tabla typing_status existe...')
    const { data: existingTable, error: checkError } = await supabase
      .from('typing_status')
      .select('id')
      .limit(1)

    if (!checkError) {
      console.log('✅ La tabla typing_status ya existe')
      console.log('   No es necesario crearla de nuevo\n')
      return
    }

    console.log('📝 La tabla no existe, creando...\n')

    // SQL para crear la tabla
    const createTableSQL = `
-- 1. Crear tabla de typing status
CREATE TABLE IF NOT EXISTS public.typing_status (
  id SERIAL PRIMARY KEY,
  conversation_id INTEGER NOT NULL,
  user_id TEXT NOT NULL,
  user_name TEXT NOT NULL,
  is_typing BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(conversation_id, user_id)
);

-- 2. Crear índices
CREATE INDEX IF NOT EXISTS idx_typing_conversation 
  ON public.typing_status(conversation_id);

CREATE INDEX IF NOT EXISTS idx_typing_updated 
  ON public.typing_status(updated_at);

-- 3. Habilitar Row Level Security
ALTER TABLE public.typing_status ENABLE ROW LEVEL SECURITY;

-- 4. Crear políticas
DROP POLICY IF EXISTS "Enable all access for typing_status" ON public.typing_status;
CREATE POLICY "Enable all access for typing_status" 
  ON public.typing_status 
  FOR ALL 
  USING (true);
`

    // Nota: Supabase client no soporta SQL arbitrario con el service key
    console.log('⚠️  No puedo ejecutar SQL directamente desde Node.js')
    console.log('📋 Por favor, copia y pega este SQL en la consola de Supabase:\n')
    console.log('🔗 URL: https://elaezozqikxdyuqwzwzs.supabase.co/project/elaezozqikxdyuqwzwzs/sql/new\n')
    console.log('=' .repeat(80))
    console.log(createTableSQL)
    console.log('=' .repeat(80))
    console.log('\n✨ Después de ejecutar el SQL, también necesitas:')
    console.log('   1. Ir a Database → Replication')
    console.log('   2. Buscar la tabla "typing_status"')
    console.log('   3. Activar el toggle de Realtime\n')

  } catch (error) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  }
}

setupTypingTable()
