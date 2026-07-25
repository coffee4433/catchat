'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import type { Playlist, PlayHistoryEntry, DownloadJob, CatMusicSettings, Track } from './types'
import { SEED_TRACKS } from './catalog'

type LibraryContextType = {
  favorites: string[] // Track IDs
  playlists: Playlist[]
  history: PlayHistoryEntry[]
  downloads: DownloadJob[]
  settings: CatMusicSettings
  toggleFavorite: (track: Track) => void
  isFavorite: (trackId: string) => boolean
  createPlaylist: (name: string, description?: string) => Playlist
  deletePlaylist: (playlistId: string) => void
  addTrackToPlaylist: (playlistId: string, track: Track) => void
  removeTrackFromPlaylist: (playlistId: string, trackId: string) => void
  startDownload: (track: Track) => void
  removeDownload: (trackId: string) => void
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

const DEFAULT_PLAYLISTS: Playlist[] = [
  {
    id: 'pl-favorites-seed',
    name: 'Favoritos de CatChat',
    description: 'Tus canciones favoritas guardadas',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    tracks: [SEED_TRACKS[0], SEED_TRACKS[1], SEED_TRACKS[2]],
  },
]

export function LibraryProvider({ children }: { children: React.ReactNode }) {
  const [favorites, setFavorites] = useState<string[]>(() => [SEED_TRACKS[0].id, SEED_TRACKS[1].id])
  const [playlists, setPlaylists] = useState<Playlist[]>(DEFAULT_PLAYLISTS)
  const [history, setHistory] = useState<PlayHistoryEntry[]>([])
  const [downloads, setDownloads] = useState<DownloadJob[]>([])
  const [settings, setSettings] = useState<CatMusicSettings>(DEFAULT_SETTINGS)

  // Load from localStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (parsed.favorites) setFavorites(parsed.favorites)
        if (parsed.playlists) setPlaylists(parsed.playlists)
        if (parsed.history) setHistory(parsed.history)
        if (parsed.downloads) setDownloads(parsed.downloads)
        if (parsed.settings) setSettings({ ...DEFAULT_SETTINGS, ...parsed.settings })
      }
    } catch {
      // Keep defaults
    }
  }, [])

  // Persist state changes
  useEffect(() => {
    if (typeof window === 'undefined') return
    const snapshot = { favorites, playlists, history, downloads, settings }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot))
  }, [favorites, playlists, history, downloads, settings])

  const isFavorite = (trackId: string) => favorites.includes(trackId)

  const toggleFavorite = (track: Track) => {
    setFavorites((prev) => {
      if (prev.includes(track.id)) {
        return prev.filter((id) => id !== track.id)
      } else {
        return [track.id, ...prev]
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

  const startDownload = (track: Track) => {
    const existing = downloads.find((d) => d.trackId === track.id)
    if (existing) return

    const newJob: DownloadJob = {
      id: `dl-${Date.now()}`,
      trackId: track.id,
      track,
      status: 'processing',
      progress: 15,
      format: 'mp3',
      bitrateKbps: settings.downloadBitrate || 320,
      requestedAt: new Date().toISOString(),
    }

    setDownloads((prev) => [newJob, ...prev])

    let currentProgress = 15
    const interval = setInterval(() => {
      currentProgress += 25
      if (currentProgress >= 100) {
        currentProgress = 100
        clearInterval(interval)
        setDownloads((prev) =>
          prev.map((d) =>
            d.trackId === track.id
              ? { ...d, status: 'ready', progress: 100, completedAt: new Date().toISOString() }
              : d
          )
        )
      } else {
        setDownloads((prev) =>
          prev.map((d) => (d.trackId === track.id ? { ...d, progress: currentProgress } : d))
        )
      }
    }, 350)
  }

  const removeDownload = (trackId: string) => {
    setDownloads((prev) => prev.filter((d) => d.trackId !== trackId))
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
    setHistory((prev) => [entry, ...prev.slice(0, 99)]) // Keep last 100
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
        downloads,
        settings,
        toggleFavorite,
        isFavorite,
        createPlaylist,
        deletePlaylist,
        addTrackToPlaylist,
        removeTrackFromPlaylist,
        startDownload,
        removeDownload,
        recordPlay,
        clearHistory,
        saveSettings,
      }}
    >
      {children}
    </LibraryContext.Provider>
  )
}

export function useLibrary() {
  const ctx = useContext(LibraryContext)
  if (!ctx) {
    throw new Error('useLibrary must be used within a LibraryProvider')
  }
  return ctx
}
