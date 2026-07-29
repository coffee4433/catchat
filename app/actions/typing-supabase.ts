'use server'

import { supabase } from '@/lib/supabase/server'
import { auth } from '@/lib/auth'
import { headers } from 'next/headers'

async function getUserId() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) throw new Error('Unauthorized')
  return session.user.id
}

/**
 * Reporta que el usuario está escribiendo en una conversación
 */
export async function reportTypingSupabase(conversationId: number, userName: string) {
  try {
    const userId = await getUserId()

    // Upsert: Actualiza si existe, crea si no existe
    const { error } = await supabase
      .from('typing_status')
      .upsert(
        {
          conversation_id: conversationId,
          user_id: userId,
          user_name: userName,
          is_typing: true,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'conversation_id,user_id',
        }
      )

    if (error) {
      console.error('Error reporting typing:', error)
    }
  } catch (error) {
    console.error('Error in reportTypingSupabase:', error)
  }
}

/**
 * Marca que el usuario dejó de escribir
 */
export async function stopTypingSupabase(conversationId: number) {
  try {
    const userId = await getUserId()

    const { error } = await supabase
      .from('typing_status')
      .delete()
      .eq('conversation_id', conversationId)
      .eq('user_id', userId)

    if (error) {
      console.error('Error stopping typing:', error)
    } else {
      console.log('Successfully stopped typing for user:', userId)
    }
  } catch (error) {
    console.error('Error in stopTypingSupabase:', error)
  }
}

/**
 * Obtiene la lista de usuarios que están escribiendo (excluyendo al usuario actual)
 */
export async function getTypingUsersSupabase(conversationId: number): Promise<string[]> {
  try {
    const userId = await getUserId()

    // Limpiar registros antiguos primero (más de 5 segundos)
    const fiveSecondsAgo = new Date(Date.now() - 5000).toISOString()
    await supabase
      .from('typing_status')
      .delete()
      .lt('updated_at', fiveSecondsAgo)

    // Obtener usuarios escribiendo (excluyendo el usuario actual)
    const { data, error } = await supabase
      .from('typing_status')
      .select('user_name')
      .eq('conversation_id', conversationId)
      .eq('is_typing', true)
      .neq('user_id', userId)
      .gte('updated_at', fiveSecondsAgo)

    if (error) {
      console.error('Error getting typing users:', error)
      return []
    }

    return data?.map((row) => row.user_name) || []
  } catch (error) {
    console.error('Error in getTypingUsersSupabase:', error)
    return []
  }
}
