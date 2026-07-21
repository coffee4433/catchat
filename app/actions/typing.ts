'use server'

import { supabase } from '@/lib/supabase/server'
import { auth } from '@/lib/auth'
import { headers } from 'next/headers'

async function getUserSession() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) throw new Error('Unauthorized')
  return session.user
}

export async function updateTypingStatus(conversationId: number, isTyping: boolean) {
  try {
    const user = await getUserSession()
    
    if (isTyping) {
      // Insertar o actualizar el estado de typing
      const { error } = await supabase
        .from('typing_status')
        .upsert({
          conversation_id: conversationId,
          user_id: user.id,
          user_name: user.name,
          is_typing: true,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'conversation_id,user_id'
        })

      if (error) throw error
    } else {
      // Eliminar el registro cuando deja de escribir
      const { error } = await supabase
        .from('typing_status')
        .delete()
        .eq('conversation_id', conversationId)
        .eq('user_id', user.id)

      if (error) throw error
    }

    return { success: true }
  } catch (error) {
    console.error('Error updating typing status:', error)
    return { success: false }
  }
}

export async function getTypingUsers(conversationId: number) {
  try {
    const user = await getUserSession()
    
    // Obtener usuarios que están escribiendo (excluyendo al usuario actual)
    const { data, error } = await supabase
      .from('typing_status')
      .select('user_id, user_name')
      .eq('conversation_id', conversationId)
      .eq('is_typing', true)
      .neq('user_id', user.id)
      .gte('updated_at', new Date(Date.now() - 5000).toISOString()) // Últimos 5 segundos

    if (error) throw error

    return data || []
  } catch (error) {
    console.error('Error getting typing users:', error)
    return []
  }
}
