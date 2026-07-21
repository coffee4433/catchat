'use server'

import { supabase } from '@/lib/supabase/server'
import { auth } from '@/lib/auth'
import { headers } from 'next/headers'

async function getUserId() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) throw new Error('Unauthorized')
  return session.user.id
}

export async function getTranslatorFavorites(): Promise<string[]> {
  try {
    const userId = await getUserId()
    const { data, error } = await supabase
      .from('user_preferences')
      .select('translator_favorites')
      .eq('user_id', userId)
      .single()

    if (error && error.code !== 'PGRST116') {
      console.error('Error loading translator favorites:', error)
      return ['en', 'es']
    }

    if (data?.translator_favorites) {
      try {
        return JSON.parse(data.translator_favorites)
      } catch {
        return ['en', 'es']
      }
    }

    return ['en', 'es']
  } catch {
    return ['en', 'es']
  }
}

export async function saveTranslatorFavorites(favorites: string[]): Promise<void> {
  try {
    const userId = await getUserId()
    const { error } = await supabase
      .from('user_preferences')
      .upsert({
        user_id: userId,
        translator_favorites: JSON.stringify(favorites),
        updated_at: new Date().toISOString(),
      })

    if (error) {
      console.error('Error saving translator favorites:', error)
    }
  } catch (err) {
    console.error('Error saving translator favorites:', err)
  }
}
