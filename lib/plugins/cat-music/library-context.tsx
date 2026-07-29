'use client'

import React, { createContext, useContext, useCallback, useEffect, useRef, useState } from 'react'
import type { Playlist, PlayHistoryEntry, CatMusicSettings, Track } from './types'
import { loadCatMusicLibrary, saveCatMusicLibrary } from '@/app/actions/catmusic-favorites'

type LibraryContextType = {
  favorites: Track[]
  playlists: Playlist[]
  history: PlayHistoryEntry[]
  settings: CatMusicSettings
  toggleFavorite: (track: Track) => void
  isFavorite: (trackId: string) => boolean
  createPlaylist: (name: string, description?: string) => Playlist
  deletePlaylist: (playlistId: string) => void
  addTrackToPlaylist: (playlistId: string, track: Track) => void
  removeTrackFromPlaylist: (playlistId: string, trackId: string) => void
  recordPlay: (track: Track, msPlayed: number, completed: boolean) => void
  clearHistory: () => void
  saveSettings: (patch: Partial<CatMusicSettings>) => void
}

const LibraryContext = createContext<LibraryContextType | null>(null)

const STORAGE_KEY = 'catmusic-library-v1'

const DEFAULT_SETTINGS: CatMusicSettings = {
  audioQuality: 'high',
  autoplay: true,
  crossfadeSeconds: 0,
  defaultVolume: 80,
  explicitAllowed: true,
  downloadBitrate: 320,
}

const DEFAULT_PLAYLISTS: Playlist[] = []

export function LibraryProvider({ children }: { children: React.ReactNode }) {
  const [favorites, setFavorites] = useState<Track[]>(() => [])
  const [playlists, setPlaylists] = useState<Playlist[]>(DEFAULT_PLAYLISTS)
  const [history, setHistory] = useState<PlayHistoryEntry[]>([])
  const [settings, setSettings] = useState<CatMusicSettings>(DEFAULT_SETTINGS)
  const loadedRef = useRef(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (parsed.favorites) {
          const migrated = parsed.favorites.map((f: unknown) =>
            typeof f === 'string' ? { id: f, title: f, artist: '', durationSeconds: 0, artworkUrl: '', source: 'youtube' as const } : f
          )
          setFavorites(migrated)
        }
        if (parsed.playlists) setPlaylists(parsed.playlists)
        if (parsed.history) setHistory(parsed.history)
        if (parsed.settings) setSettings({ ...DEFAULT_SETTINGS, ...parsed.settings })
      }
    } catch {}
    loadedRef.current = true
  }, [])

  // Sync from Supabase on mount (after local load)
  useEffect(() => {
    if (typeof window === 'undefined' || !loadedRef.current) return
    loadCatMusicLibrary()
      .then((remote) => {
        if (remote.favorites && remote.favorites.length > 0) {
          setFavorites((prev) => {
            const merged = [...prev]
            for (const r of remote.favorites) {
              const track = r as Track
              if (track.id && !merged.some((t) => t.id === track.id)) {
                merged.push(track)
              }
            }
            // Prefer remote if it has items
            return remote.favorites.length > prev.length ? (remote.favorites as Track[]) : merged
          })
        }
        if (remote.playlists && remote.playlists.length > 0) {
          setPlaylists((prev) =>
            remote.playlists.length > prev.length ? (remote.playlists as Playlist[]) : prev
          )
        }
        if (remote.history && remote.history.length > 0) {
          setHistory((prev) =>
            remote.history.length > prev.length ? (remote.history as PlayHistoryEntry[]) : prev
          )
        }
        if (remote.settings && Object.keys(remote.settings).length > 0) {
          setSettings((prev) => ({ ...prev, ...(remote.settings as Partial<CatMusicSettings>) }))
        }
      })
      .catch(() => {})
  }, [])

  // Save to Supabase (debounced)
  const supabaseSaveRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const saveToSupabase = useCallback(() => {
    if (typeof window === 'undefined') return
    if (supabaseSaveRef.current) clearTimeout(supabaseSaveRef.current)
    supabaseSaveRef.current = setTimeout(() => {
      saveCatMusicLibrary({
        favorites: favoritesRef.current,
        playlists: playlistsRef.current,
        history: historyRef.current,
        settings: settingsRef.current,
      }).catch(() => {})
    }, 2000)
  }, [])

  const favoritesRef = useRef(favorites)
  const playlistsRef = useRef(playlists)
  const historyRef = useRef(history)
  const settingsRef = useRef(settings)
  favoritesRef.current = favorites
  playlistsRef.current = playlists
  historyRef.current = history
  settingsRef.current = settings

  useEffect(() => {
    if (typeof window === 'undefined' || !loadedRef.current) return
    const snapshot = { favorites, playlists, history, settings }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot))
    saveToSupabase()
  }, [favorites, playlists, history, settings, saveToSupabase])

  const isFavorite = (trackId: string) => favorites.some((t) => t.id === trackId)

  const toggleFavorite = (track: Track) => {
    setFavorites((prev) => {
      if (prev.some((t) => t.id === track.id)) {
        return prev.filter((t) => t.id !== track.id)
      } else {
        return [track, ...prev]
      }
    })
  }

  const createPlaylist = (name: string, description?: string): Playlist => {
    const newPl: Playlist = {
      id: `pl-${Date.now()}`,
      name: name.trim() || 'Nueva Playlist',
      description,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tracks: [],
    }
    setPlaylists((prev) => [newPl, ...prev])
    return newPl
  }

  const deletePlaylist = (playlistId: string) => {
    setPlaylists((prev) => prev.filter((p) => p.id !== playlistId))
  }

  const addTrackToPlaylist = (playlistId: string, track: Track) => {
    setPlaylists((prev) =>
      prev.map((p) => {
        if (p.id === playlistId) {
          if (p.tracks.some((t) => t.id === track.id)) return p
          return {
            ...p,
            tracks: [...p.tracks, track],
            updatedAt: new Date().toISOString(),
          }
        }
        return p
      }),
    )
  }

  const removeTrackFromPlaylist = (playlistId: string, trackId: string) => {
    setPlaylists((prev) =>
      prev.map((p) => {
        if (p.id === playlistId) {
          return {
            ...p,
            tracks: p.tracks.filter((t) => t.id !== trackId),
            updatedAt: new Date().toISOString(),
          }
        }
        return p
      }),
    )
  }

  const recordPlay = (track: Track, msPlayed: number, completed: boolean) => {
    const entry: PlayHistoryEntry = {
      id: `hist-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      trackId: track.id,
      track,
      playedAt: new Date().toISOString(),
      msPlayed,
      completed,
    }
    setHistory((prev) => [entry, ...prev.slice(0, 99)])
  }

  const clearHistory = () => {
    setHistory([])
  }

  const saveSettings = (patch: Partial<CatMusicSettings>) => {
    setSettings((prev) => ({ ...prev, ...patch }))
  }

  return (
    <LibraryContext.Provider
      value={{
        favorites,
        playlists,
        history,
        settings,
        toggleFavorite,
        isFavorite,
        createPlaylist,
        deletePlaylist,
        addTrackToPlaylist,
        removeTrackFromPlaylist,
        recordPlay,
        clearHistory,
        saveSettings,
      }}
    >
      {children}
    </LibraryContext.Provider>
  )
}

const defaultLibraryContext: LibraryContextType = {
  favorites: [],
  playlists: [],
  history: [],
  settings: {
    audioQuality: 'high',
    autoplay: false,
    crossfadeSeconds: 0,
    defaultVolume: 80,
    explicitAllowed: true,
    downloadBitrate: 320,
  },
  isFavorite: () => false,
  toggleFavorite: () => {},
  createPlaylist: () => ({ id: '', name: '', tracks: [], createdAt: '', updatedAt: '' }),
  deletePlaylist: () => {},
  addTrackToPlaylist: () => {},
  removeTrackFromPlaylist: () => {},
  recordPlay: () => {},
  clearHistory: () => {},
  saveSettings: () => {},
}

export function useLibrary() {
  const ctx = useContext(LibraryContext)
  return ctx || defaultLibraryContext
}
