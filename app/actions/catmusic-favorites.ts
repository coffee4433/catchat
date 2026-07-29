'use server'

import { supabase } from '@/lib/supabase/server'
import { auth } from '@/lib/auth'
import { headers } from 'next/headers'

async function getUserId() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) throw new Error('Unauthorized')
  return session.user.id
}

export type CatMusicLibrary = {
  favorites: unknown[]
  playlists: unknown[]
  history: unknown[]
  settings: Record<string, unknown>
}

const DEFAULT_LIBRARY: CatMusicLibrary = {
  favorites: [],
  playlists: [],
  history: [],
  settings: {},
}

export async function loadCatMusicLibrary(): Promise<CatMusicLibrary> {
  try {
    const userId = await getUserId()
    const { data, error } = await supabase
      .from('user_preferences')
      .select('catmusic_library')
      .eq('user_id', userId)
      .single()

    if (error && error.code !== 'PGRST116') {
      console.error('Error loading catmusic library:', error)
      return DEFAULT_LIBRARY
    }

    if (data?.catmusic_library && typeof data.catmusic_library === 'object') {
      return {
        ...DEFAULT_LIBRARY,
        ...(data.catmusic_library as Partial<CatMusicLibrary>),
      }
    }

    return DEFAULT_LIBRARY
  } catch {
    return DEFAULT_LIBRARY
  }
}

export async function saveCatMusicLibrary(library: CatMusicLibrary): Promise<void> {
  try {
    const userId = await getUserId()
    const { error } = await supabase
      .from('user_preferences')
      .upsert({
        user_id: userId,
        catmusic_library: library,
        updated_at: new Date().toISOString(),
      })

    if (error) {
      console.error('Error saving catmusic library:', error)
    }
  } catch (err) {
    console.error('Error saving catmusic library:', err)
  }
}
