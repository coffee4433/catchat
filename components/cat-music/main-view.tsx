'use client'

import React, { useState } from 'react'
import {
  Clock,
  Disc,
  Heart,
  ListPlus,
  Music,
  Plus,
  Radio,
  Search,
  Sparkles,
  Trash2,
  Volume2,
} from 'lucide-react'
import { SEED_TRACKS, GENRES } from '@/lib/plugins/cat-music/catalog'
import { useCatMusicPlayer } from '@/lib/plugins/cat-music/player-context'
import { useLibrary } from '@/lib/plugins/cat-music/library-context'
import { TrackCard } from './track-card'
import { TrackRow } from './track-row'
import { TrackDetailView } from './track-detail-view'
import { ArtistDetailView } from './artist-detail-view'
import type { Track } from '@/lib/plugins/cat-music/types'

type Tab = 'home' | 'search' | 'playlists' | 'favorites' | 'history'

export function CatMusicMainView() {
  const [activeTab, setActiveTab] = useState<Tab>('home')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedGenre, setSelectedGenre] = useState('Todos')
  const [newPlaylistOpen, setNewPlaylistOpen] = useState(false)
  const [newPlName, setNewPlName] = useState('')
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(null)
  const [liveResults, setLiveResults] = useState<Track[]>([])
  const [isSearching, setIsSearching] = useState(false)

  // Sub-view navigation state
  const [selectedTrackDetail, setSelectedTrackDetail] = useState<Track | null>(null)
  const [selectedArtistName, setSelectedArtistName] = useState<string | null>(null)

  const { playTrack } = useCatMusicPlayer()
  const { favorites, playlists, history, createPlaylist, deletePlaylist, clearHistory, isFavorite } = useLibrary()

  // Live YouTube Music Search handler via server API route
  React.useEffect(() => {
    const query = searchQuery.trim()
    if (!query || query.length < 2) {
      setLiveResults([])
      setIsSearching(false)
      return
    }

    setIsSearching(true)
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/youtube/search?q=${encodeURIComponent(query)}`)
        if (res.ok) {
          const data = await res.json()
          if (data.results && Array.isArray(data.results)) {
            setLiveResults(data.results)
          }
        }
      } catch {
        setLiveResults([])
      } finally {
        setIsSearching(false)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [searchQuery])

  // Filtered tracks for search tab
  const localFiltered = SEED_TRACKS.filter((t) => {
    const matchesQuery =
      !searchQuery ||
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.artist.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesGenre = selectedGenre === 'Todos' || t.genre === selectedGenre
    return matchesQuery && matchesGenre
  })

  const searchResults =
    searchQuery.trim().length >= 2 && liveResults.length > 0 ? liveResults : localFiltered

  // Favorite tracks
  const favoriteTracks = SEED_TRACKS.filter((t) => favorites.includes(t.id))

  const handleCreatePlaylist = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newPlName.trim()) return
    createPlaylist(newPlName.trim())
    setNewPlName('')
    setNewChatOpenFalse()
  }

  const setNewChatOpenFalse = () => setNewPlaylistOpen(false)

  const selectedPlaylist = playlists.find((p) => p.id === selectedPlaylistId)

  if (selectedTrackDetail) {
    return (
      <TrackDetailView
        track={selectedTrackDetail}
        onBack={() => setSelectedTrackDetail(null)}
        onSelectArtist={(artistName) => {
          setSelectedTrackDetail(null)
          setSelectedArtistName(artistName)
        }}
      />
    )
  }

  if (selectedArtistName) {
    return (
      <ArtistDetailView
        artistName={selectedArtistName}
        onBack={() => setSelectedArtistName(null)}
        onSelectTrack={(track) => {
          setSelectedArtistName(null)
          setSelectedTrackDetail(track)
        }}
      />
    )
  }

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-background/50 p-4 text-foreground">
      {/* Top Header Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-border/40">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-teal-500 to-emerald-400 text-slate-950 font-extrabold shadow-lg shadow-teal-500/20">
            <Radio className="size-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground flex items-center gap-2">
              CatMusic <span className="rounded-full bg-primary/20 px-2 py-0.5 text-[10px] text-primary">Prototipo</span>
            </h1>
            <p className="text-[12px] text-muted-foreground">Tu catálogo infinito sin publicidad ni cortes.</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1.5 rounded-2xl bg-secondary/50 p-1 border border-border/40">
          <button
            onClick={() => setActiveTab('home')}
            className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[12.5px] font-semibold transition-all ${
              activeTab === 'home' ? 'bg-primary text-primary-foreground shadow-md' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Sparkles className="size-3.5" />
            <span>Inicio</span>
          </button>

          <button
            onClick={() => setActiveTab('search')}
            className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[12.5px] font-semibold transition-all ${
              activeTab === 'search' ? 'bg-primary text-primary-foreground shadow-md' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Search className="size-3.5" />
            <span>Buscar</span>
          </button>

          <button
            onClick={() => setActiveTab('playlists')}
            className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[12.5px] font-semibold transition-all ${
              activeTab === 'playlists' ? 'bg-primary text-primary-foreground shadow-md' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <ListPlus className="size-3.5" />
            <span>Playlists ({playlists.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('favorites')}
            className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[12.5px] font-semibold transition-all ${
              activeTab === 'favorites' ? 'bg-primary text-primary-foreground shadow-md' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Heart className="size-3.5" />
            <span>Favoritos ({favorites.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[12.5px] font-semibold transition-all ${
              activeTab === 'history' ? 'bg-primary text-primary-foreground shadow-md' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Clock className="size-3.5" />
            <span>Historial</span>
          </button>
        </div>
      </div>

      {/* Main Tab Content */}
      <div className="thin-scroll flex-1 overflow-y-auto pt-4 pb-28">
        {/* TAB 1: HOME */}
        {activeTab === 'home' && (
          <div className="space-y-6 max-w-6xl mx-auto">
            {/* Hero Header Vibe */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-teal-500/20 via-emerald-500/15 to-cyan-500/10 p-6 border border-teal-500/30">
              <div className="relative z-10 max-w-xl">
                <span className="inline-block rounded-full bg-teal-500/20 px-3 py-1 text-[11px] font-bold text-teal-400 mb-2">
                  ✨ Mix Diario Personalizado
                </span>
                <h2 className="text-2xl font-black text-foreground">Escucha sin límites en CatChat</h2>
                <p className="mt-1 text-[13px] text-muted-foreground">
                  Catálogo impulsado por YouTube API con persistencia local y sincronización inmediata.
                </p>
                <div className="mt-4 flex items-center gap-3">
                  <button
                    onClick={() => playTrack(SEED_TRACKS[0], SEED_TRACKS)}
                    className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-[13px] font-bold text-primary-foreground shadow-lg transition-transform hover:scale-105"
                  >
                    <Disc className="size-4 animate-spin" />
                    <span>Reproducir Mix Diario</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Sigue Escuchando Grid */}
            <div>
              <h3 className="text-base font-bold text-foreground mb-3 flex items-center gap-2">
                <Music className="size-4 text-primary" /> Sigue escuchando
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {SEED_TRACKS.slice(0, 6).map((t) => (
                  <TrackCard key={t.id} track={t} queue={SEED_TRACKS} />
                ))}
              </div>
            </div>

            {/* Rejilla de Recomendados */}
            <div>
              <h3 className="text-base font-bold text-foreground mb-3">Recomendados para ti</h3>
              <div className="space-y-1 rounded-2xl border border-border/40 bg-secondary/15 p-3">
                {SEED_TRACKS.slice(4, 10).map((t, idx) => (
                  <TrackRow
                    key={t.id}
                    track={t}
                    index={idx}
                    queue={SEED_TRACKS}
                    onSelectArtist={(a) => setSelectedArtistName(a)}
                    onSelectTrack={(tr) => setSelectedTrackDetail(tr)}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: SEARCH */}
        {activeTab === 'search' && (
          <div className="space-y-4 max-w-5xl mx-auto">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Buscar canciones, artistas o géneros..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-2xl border border-border/60 bg-secondary/40 pl-10 pr-4 py-3 text-[13.5px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>

            {/* Genre Chips */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {GENRES.map((g) => (
                <button
                  key={g}
                  onClick={() => setSelectedGenre(g)}
                  className={`rounded-full px-3.5 py-1 text-[12px] font-semibold transition-all ${
                    selectedGenre === g
                      ? 'bg-primary text-primary-foreground shadow-md'
                      : 'bg-secondary/60 text-muted-foreground hover:bg-secondary hover:text-foreground'
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>

            {/* Results List */}
            <div className="space-y-1 rounded-2xl border border-border/40 bg-secondary/15 p-3">
              {isSearching ? (
                <div className="py-12 flex items-center justify-center gap-2 text-muted-foreground text-[13px]">
                  <span className="size-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  <span>Buscando canciones en vivo...</span>
                </div>
              ) : searchResults.length > 0 ? (
                searchResults.map((t, idx) => (
                  <TrackRow
                    key={`${t.id}-${idx}`}
                    track={t}
                    index={idx}
                    queue={searchResults}
                    onSelectArtist={(a) => setSelectedArtistName(a)}
                    onSelectTrack={(tr) => setSelectedTrackDetail(tr)}
                  />
                ))
              ) : (
                <div className="py-12 text-center text-muted-foreground text-[13px]">
                  No se encontraron canciones que coincidan con la búsqueda.
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: PLAYLISTS */}
        {activeTab === 'playlists' && (
          <div className="space-y-4 max-w-5xl mx-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-foreground">Mis Playlists</h2>
              <button
                onClick={() => setNewPlaylistOpen(true)}
                className="flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-[12.5px] font-bold text-primary-foreground shadow-md hover:opacity-90 transition-all"
              >
                <Plus className="size-4" />
                <span>Nueva Playlist</span>
              </button>
            </div>

            {/* Playlists Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {playlists.map((pl) => (
                <div
                  key={pl.id}
                  onClick={() => setSelectedPlaylistId(pl.id)}
                  className={`group relative flex flex-col justify-between rounded-2xl border p-4 transition-all cursor-pointer ${
                    selectedPlaylistId === pl.id
                      ? 'border-primary bg-primary/10 ring-2 ring-primary/30'
                      : 'border-border/60 bg-secondary/20 hover:border-primary/40 hover:bg-secondary/40'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <div className="flex size-10 items-center justify-center rounded-xl bg-primary/20 text-primary">
                        <ListPlus className="size-5" />
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          deletePlaylist(pl.id)
                          if (selectedPlaylistId === pl.id) setSelectedPlaylistId(null)
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1.5 text-muted-foreground hover:text-rose-500 transition-opacity"
                        title="Eliminar playlist"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                    <h3 className="mt-3 font-bold text-foreground text-[14px]">{pl.name}</h3>
                    <p className="text-[12px] text-muted-foreground mt-0.5">
                      {pl.description || `${pl.tracks.length} canciones`}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Selected Playlist Tracks */}
            {selectedPlaylist && (
              <div className="mt-6 space-y-3">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  Pistas en <span className="text-primary">{selectedPlaylist.name}</span>
                </h3>
                <div className="space-y-1 rounded-2xl border border-border/40 bg-secondary/15 p-3">
                  {selectedPlaylist.tracks.length > 0 ? (
                    selectedPlaylist.tracks.map((t, idx) => (
                      <TrackRow
                        key={`${t.id}-${idx}`}
                        track={t}
                        index={idx}
                        queue={selectedPlaylist.tracks}
                        onSelectArtist={(a) => setSelectedArtistName(a)}
                        onSelectTrack={(tr) => setSelectedTrackDetail(tr)}
                      />
                    ))
                  ) : (
                    <p className="py-8 text-center text-[12.5px] text-muted-foreground">
                      Esta playlist no tiene canciones aún. Usa el menú de 3 puntos en las canciones para añadir.
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Create Modal */}
            {newPlaylistOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                <form
                  onSubmit={handleCreatePlaylist}
                  className="w-full max-w-sm rounded-3xl border border-border/80 bg-card p-6 shadow-2xl space-y-4"
                >
                  <h3 className="text-base font-bold text-foreground">Crear nueva playlist</h3>
                  <input
                    type="text"
                    placeholder="Nombre de la playlist..."
                    value={newPlName}
                    onChange={(e) => setNewPlName(e.target.value)}
                    autoFocus
                    className="w-full rounded-xl border border-border bg-secondary px-3.5 py-2.5 text-[13px] text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setNewPlaylistOpen(false)}
                      className="rounded-xl px-3.5 py-2 text-[12.5px] font-semibold text-muted-foreground hover:bg-secondary"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="rounded-xl bg-primary px-4 py-2 text-[12.5px] font-bold text-primary-foreground shadow-md hover:opacity-90"
                    >
                      Crear
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: FAVORITES */}
        {activeTab === 'favorites' && (
          <div className="space-y-4 max-w-5xl mx-auto">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <Heart className="size-5 text-rose-500 fill-current" /> Mis Favoritos
                </h2>
                <p className="text-[12.5px] text-muted-foreground">
                  {favoriteTracks.length} canciones guardadas con corazón
                </p>
              </div>
              {favoriteTracks.length > 0 && (
                <button
                  onClick={() => playTrack(favoriteTracks[0], favoriteTracks)}
                  className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-[13px] font-bold text-primary-foreground shadow-md hover:opacity-90"
                >
                  <Sparkles className="size-4" />
                  <span>Reproducir Todos</span>
                </button>
              )}
            </div>

            <div className="space-y-1 rounded-2xl border border-border/40 bg-secondary/15 p-3">
              {favoriteTracks.length > 0 ? (
                favoriteTracks.map((t, idx) => (
                  <TrackRow
                    key={t.id}
                    track={t}
                    index={idx}
                    queue={favoriteTracks}
                    onSelectArtist={(a) => setSelectedArtistName(a)}
                    onSelectTrack={(tr) => setSelectedTrackDetail(tr)}
                  />
                ))
              ) : (
                <div className="py-12 text-center text-muted-foreground text-[13px]">
                  No has marcado canciones como favoritas todavía.
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 5: HISTORY */}
        {activeTab === 'history' && (
          <div className="space-y-4 max-w-5xl mx-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <Clock className="size-4 text-primary" /> Historial de Escuchas
              </h2>
              {history.length > 0 && (
                <button
                  onClick={clearHistory}
                  className="text-[12px] font-semibold text-rose-500 hover:underline"
                >
                  Limpiar historial
                </button>
              )}
            </div>

            <div className="space-y-1 rounded-2xl border border-border/40 bg-secondary/15 p-3">
              {history.length > 0 ? (
                history.map((entry, idx) => (
                  <TrackRow
                    key={`${entry.id}-${idx}`}
                    track={entry.track}
                    queue={history.map((h) => h.track)}
                    onSelectArtist={(a) => setSelectedArtistName(a)}
                    onSelectTrack={(tr) => setSelectedTrackDetail(tr)}
                  />
                ))
              ) : (
                <div className="py-12 text-center text-muted-foreground text-[13px]">
                  Aún no se han registrado escuchas recientes.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
