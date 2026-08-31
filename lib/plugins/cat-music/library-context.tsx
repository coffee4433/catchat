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
  autoplay: true,
  defaultVolume: 80,
}

const DEFAULT_PLAYLISTS: Playlist[] = []

/** The history is capped so the persisted blob can't grow without bound. */
const HISTORY_LIMIT = 100

function newerIso(a?: string, b?: string): boolean {
  const ta = a ? Date.parse(a) : NaN
  const tb = b ? Date.parse(b) : NaN
  if (Number.isNaN(ta)) return false
  if (Number.isNaN(tb)) return true
  return ta > tb
}

/**
 * Union by id, local order first.
 *
 * Length was the old tie-breaker ("prefer whichever side has more"), which
 * dropped items added on this device whenever the server copy happened to be
 * longer. Without delete tombstones a union is the only merge that can't lose
 * data; the cost is that a removal on another device can come back.
 */
function mergeById<T extends { id?: string }>(local: T[], remote: T[]): T[] {
  const out: T[] = []
  const seen = new Set<string>()
  for (const item of [...local, ...remote]) {
    const id = item?.id
    if (!id || seen.has(id)) continue
    seen.add(id)
    out.push(item)
  }
  return out
}

/** Same union, but a playlist present on both sides resolves by `updatedAt`. */
function mergePlaylists(local: Playlist[], remote: Playlist[]): Playlist[] {
  const byId = new Map<string, Playlist>()
  for (const pl of local) {
    if (pl?.id) byId.set(pl.id, pl)
  }
  for (const pl of remote) {
    if (!pl?.id) continue
    const mine = byId.get(pl.id)
    if (!mine) {
      byId.set(pl.id, pl)
      continue
    }
    const winner = newerIso(pl.updatedAt, mine.updatedAt) ? pl : mine
    byId.set(pl.id, {
      ...winner,
      // Tracks union either way: a song added on one device shouldn't vanish
      // just because the other device touched the playlist later.
      tracks: mergeById(mine.tracks || [], pl.tracks || []),
    })
  }
  // Keep local ordering, then anything only the server knew about.
  const ordered: Playlist[] = []
  const emitted = new Set<string>()
  for (const pl of [...local, ...remote]) {
    if (!pl?.id || emitted.has(pl.id)) continue
    emitted.add(pl.id)
    const merged = byId.get(pl.id)
    if (merged) ordered.push(merged)
  }
  return ordered
}

function mergeHistory(local: PlayHistoryEntry[], remote: PlayHistoryEntry[]): PlayHistoryEntry[] {
  return mergeById(local, remote)
    .sort((a, b) => Date.parse(b.playedAt || '') - Date.parse(a.playedAt || ''))
    .slice(0, HISTORY_LIMIT)
}

/**
 * Keeps only settings the player honors, so keys from a removed feature don't
 * ride along in storage forever.
 */
function sanitizeSettings(raw: unknown): CatMusicSettings {
  const patch = (raw || {}) as Partial<CatMusicSettings>
  const volume = Number(patch.defaultVolume)
  return {
    autoplay: typeof patch.autoplay === 'boolean' ? patch.autoplay : DEFAULT_SETTINGS.autoplay,
    defaultVolume: Number.isFinite(volume)
      ? Math.max(0, Math.min(100, Math.round(volume)))
      : DEFAULT_SETTINGS.defaultVolume,
  }
}

export function LibraryProvider({
  children,
  active = true,
}: {
  children: React.ReactNode
  active?: boolean
}) {
  const [favorites, setFavorites] = useState<Track[]>(() => [])
  const [playlists, setPlaylists] = useState<Playlist[]>(DEFAULT_PLAYLISTS)
  const [history, setHistory] = useState<PlayHistoryEntry[]>([])
  const [settings, setSettings] = useState<CatMusicSettings>(DEFAULT_SETTINGS)
  const loadedRef = useRef(false)

  useEffect(() => {
    if (!active || typeof window === 'undefined') return
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed.favorites)) {
          // Early versions stored bare video ids.
          const migrated = parsed.favorites
            .map((f: unknown) =>
              typeof f === 'string'
                ? {
                    id: f,
                    title: f,
                    artist: '',
                    durationSeconds: 0,
                    artworkUrl: '',
                    source: 'youtube' as const,
                  }
                : f,
            )
            .filter((f: Track | null) => f && f.id)
          setFavorites(migrated)
        }
        if (Array.isArray(parsed.playlists)) setPlaylists(parsed.playlists)
        if (Array.isArray(parsed.history)) setHistory(parsed.history)
        if (parsed.settings) setSettings(sanitizeSettings(parsed.settings))
      }
    } catch {
      // Corrupt or unreadable storage: start from the defaults.
    }
    loadedRef.current = true
  }, [active])

  // Sync from Supabase on mount (after local load)
  useEffect(() => {
    if (!active || typeof window === 'undefined' || !loadedRef.current) return
    loadCatMusicLibrary()
      .then((remote) => {
        if (Array.isArray(remote.favorites) && remote.favorites.length > 0) {
          const incoming = (remote.favorites as Track[]).filter((t) => t && t.id)
          setFavorites((prev) => mergeById(prev, incoming))
        }
        if (Array.isArray(remote.playlists) && remote.playlists.length > 0) {
          const incoming = (remote.playlists as Playlist[]).filter((p) => p && p.id)
          setPlaylists((prev) => mergePlaylists(prev, incoming))
        }
        if (Array.isArray(remote.history) && remote.history.length > 0) {
          const incoming = (remote.history as PlayHistoryEntry[]).filter((h) => h && h.id)
          setHistory((prev) => mergeHistory(prev, incoming))
        }
        if (remote.settings && Object.keys(remote.settings).length > 0) {
          setSettings((prev) => sanitizeSettings({ ...prev, ...(remote.settings as object) }))
        }
      })
      .catch(() => {})
  }, [active])

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
    if (!active || typeof window === 'undefined' || !loadedRef.current) return
    const snapshot = { favorites, playlists, history, settings }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot))
    } catch {
      // Quota exceeded or private mode: the Supabase copy below is still the
      // durable one, so losing the local cache must not break the UI.
    }
    saveToSupabase()
  }, [active, favorites, playlists, history, settings, saveToSupabase])

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
      name: name.trim() || 'Playlist',
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

  const recordPlay = useCallback((track: Track, msPlayed: number, completed: boolean) => {
    if (!track?.id) return
    const entry: PlayHistoryEntry = {
      id: `hist-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      trackId: track.id,
      track,
      playedAt: new Date().toISOString(),
      msPlayed,
      completed,
    }
    setHistory((prev) => [entry, ...prev].slice(0, HISTORY_LIMIT))
  }, [])

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
    autoplay: false,
    defaultVolume: 80,
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
