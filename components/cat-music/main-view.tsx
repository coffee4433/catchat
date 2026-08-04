'use client'

import React, { useState, useEffect, useMemo, useRef } from 'react'
import {
  Bell,
  BellOff,
  Clock,
  Heart,
  Home,
  Library,
  ListMusic,
  Maximize2,
  Minimize2,
  Music,
  Plus,
  Radio,
  Search,
  Settings,
  Sparkles,
  Trash2,
  User,
  Play,
  ChevronDown,
  X,
} from 'lucide-react'
import { SEED_TRACKS, GENRES } from '@/lib/plugins/cat-music/catalog'
import { useCatMusicPlayer } from '@/lib/plugins/cat-music/player-context'
import { useLibrary } from '@/lib/plugins/cat-music/library-context'
import { useLanguage } from '@/lib/i18n'
import { TrackCard } from './track-card'
import { TrackRow } from './track-row'
import { TrackDetailView } from './track-detail-view'
import { ArtistDetailView } from './artist-detail-view'
import { GlassPanel } from './glass-panel'
import { HomeDashboard } from './home-dashboard'
import type { PluginViewProps } from '@/lib/plugins/plugin-types'
import type { Track } from '@/lib/plugins/cat-music/types'
import type { YtPlaylist, YtChannel } from '@/lib/plugins/cat-music/innertube'
import {
  exitDocumentFullscreen,
  getFullscreenElement,
  requestElementFullscreen,
  subscribeFullscreenChange,
} from '@/lib/fullscreen'

type Tab = 'home' | 'explore' | 'library'
type SearchTab = 'songs' | 'playlists' | 'artists'

function NavButton({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean
  onClick: () => void
  icon: React.ElementType
  label: string
}) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-[13px] font-semibold transition-all ${
        active
          ? 'bg-[#1DB954]/20 text-white shadow-inner shadow-[#1DB954]/10'
          : 'text-white/55 hover:bg-white/5 hover:text-white'
      }`}
    >
      <Icon className={`size-4 ${active ? 'text-[#1DB954]' : ''}`} />
      <span>{label}</span>
    </button>
  )
}

export function CatMusicMainView({ onOpenSettings }: PluginViewProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const [activeTab, setActiveTab] = useState<Tab>('home')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchTab, setSearchTab] = useState<SearchTab>('songs')
  const [selectedGenre, setSelectedGenre] = useState('Todos')
  const [newPlaylistOpen, setNewPlaylistOpen] = useState(false)
  const [newPlName, setNewPlName] = useState('')
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(null)
  const [songResults, setSongResults] = useState<Track[]>([])
  const [playlistResults, setPlaylistResults] = useState<YtPlaylist[]>([])
  const [channelResults, setChannelResults] = useState<YtChannel[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [showLibraryPlaylists, setShowLibraryPlaylists] = useState(true)
  const [showNotifications, setShowNotifications] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [notifPermission, setNotifPermission] = useState<NotificationPermission | 'unsupported'>('default')

  const [selectedTrackDetail, setSelectedTrackDetail] = useState<Track | null>(null)
  const [selectedArtistName, setSelectedArtistName] = useState<string | null>(null)
  const [artistBanner, setArtistBanner] = useState<string>()

  const { playTrack, currentTrack, playerState, togglePlayPause } = useCatMusicPlayer()
  const queue = playerState.queue
  const { favorites, playlists, history, createPlaylist, deletePlaylist, clearHistory } = useLibrary()
  const { t } = useLanguage()

  const featuredTrack = currentTrack ?? SEED_TRACKS[3]

  useEffect(() => {
    const artist = featuredTrack.artist
    if (!artist) return
    fetch(`/api/youtube/channel?name=${encodeURIComponent(artist)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.channel?.bannerUrl) setArtistBanner(data.channel.bannerUrl)
      })
      .catch(() => {})
  }, [featuredTrack.artist])

  useEffect(() => {
    if (typeof window === 'undefined') return
    setNotifPermission('Notification' in window ? Notification.permission : 'unsupported')
  }, [])

  useEffect(() => {
    return subscribeFullscreenChange(() => {
      const fullEl = getFullscreenElement()
      if (fullEl) {
        setIsFullscreen(true)
      } else {
        setIsFullscreen(false)
      }
    })
  }, [])

  useEffect(() => {
    if (!isFullscreen) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsFullscreen(false)
        if (getFullscreenElement()) {
          exitDocumentFullscreen().catch(() => {})
        }
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [isFullscreen])

  const requestNotifications = async () => {
    if (!('Notification' in window)) return
    const permission = await Notification.requestPermission()
    setNotifPermission(permission)
  }

  const toggleFullscreen = async () => {
    const root = rootRef.current
    if (!root) return

    if (isFullscreen) {
      setIsFullscreen(false)
      if (getFullscreenElement()) {
        try {
          await exitDocumentFullscreen()
        } catch {
          // CSS mode exits via state
        }
      }
      return
    }

    setIsFullscreen(true)
    try {
      await requestElementFullscreen(root)
    } catch {
      // Immersive CSS mode (fixed inset-0 z-[9999]) still applies via isFullscreen state
    }
  }

  useEffect(() => {
    const query = searchQuery.trim()
    if (!query || query.length < 2) {
      setSongResults([])
      setPlaylistResults([])
      setChannelResults([])
      setIsSearching(false)
      return
    }

    setIsSearching(true)
    const timer = setTimeout(async () => {
      try {
        const [songRes, playlistRes, channelRes] = await Promise.all([
          fetch(`/api/youtube/search?q=${encodeURIComponent(query)}&type=video`),
          fetch(`/api/youtube/search?q=${encodeURIComponent(query)}&type=playlist`),
          fetch(`/api/youtube/search?q=${encodeURIComponent(query)}&type=channel`),
        ])
        const [songData, playlistData, channelData] = await Promise.all([
          songRes.ok ? songRes.json() : { results: [] },
          playlistRes.ok ? playlistRes.json() : { results: [] },
          channelRes.ok ? channelRes.json() : { results: [] },
        ])
        setSongResults(songData.results || [])
        setPlaylistResults(playlistData.results || [])
        setChannelResults(channelData.results || [])
      } catch {
        setSongResults([])
        setPlaylistResults([])
        setChannelResults([])
      } finally {
        setIsSearching(false)
      }
    }, 350)

    return () => clearTimeout(timer)
  }, [searchQuery])

  const localFiltered = SEED_TRACKS.filter((t) => {
    const matchesQuery =
      !searchQuery ||
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.artist.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesGenre = selectedGenre === 'Todos' || t.genre === selectedGenre
    return matchesQuery && matchesGenre
  })

  const finalSongResults = searchQuery.trim().length >= 2 && songResults.length > 0 ? songResults : localFiltered
  const favoriteTracks = useMemo(() => {
    const seen = new Set<string>()
    return favorites.filter((t) => {
      if (!t.id || seen.has(t.id)) return false
      seen.add(t.id)
      return true
    })
  }, [favorites])

  const greeting = useMemo(() => {
    const h = new Date().getHours()
    if (h < 12) return t.goodMorning
    if (h < 19) return t.goodAfternoon
    return t.goodEvening
  }, [t])

  const handleCreatePlaylist = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newPlName.trim()) return
    createPlaylist(newPlName.trim())
    setNewPlName('')
    setNewPlaylistOpen(false)
  }

  const selectedPlaylist = playlists.find((p) => p.id === selectedPlaylistId)

  const withBackground = (children: React.ReactNode) => (
    <div
      ref={rootRef}
      className={`relative h-full w-full overflow-hidden text-white ${
        isFullscreen ? 'fixed inset-0 z-[9999] !h-dvh !w-dvw rounded-none' : ''
      }`}
    >
      <div className="pointer-events-none absolute inset-0">
        <img src="/bg.jpg" alt="" className="size-full object-cover" />
        <div className="absolute inset-0 bg-black/50" />
      </div>
      <div className="relative z-10 flex h-full flex-col">
        {children}
      </div>
    </div>
  )

  if (selectedTrackDetail) {
    return withBackground(
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
    return withBackground(
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

  const sidebarWidgets = (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <GlassPanel variant="strong" className="shrink-0 space-y-0.5 rounded-[24px] p-3">
        <NavButton active={activeTab === 'home'} onClick={() => setActiveTab('home')} icon={Home} label={t.homeTab} />
        <NavButton active={activeTab === 'explore'} onClick={() => setActiveTab('explore')} icon={Search} label={t.exploreTab} />
        <NavButton active={activeTab === 'library'} onClick={() => setActiveTab('library')} icon={Library} label={t.libraryTab} />
      </GlassPanel>

      <GlassPanel variant="strong" className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[24px] p-3">
        <div className="flex items-center justify-between px-1 mb-2">
          <button
            onClick={() => setShowLibraryPlaylists(!showLibraryPlaylists)}
            className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-white/40 hover:text-white/70 transition-colors"
          >
            <ChevronDown className={`size-3 transition-transform ${showLibraryPlaylists ? '' : '-rotate-90'}`} />
            {t.yourPlaylists}
          </button>
          <button
            onClick={() => setNewPlaylistOpen(true)}
            className="rounded-xl p-1 text-white/40 hover:bg-white/10 hover:text-white transition-colors"
            title={t.newPlaylist}
          >
            <Plus className="size-3.5" />
          </button>
        </div>
        {showLibraryPlaylists && (
          <div className="flex-1 overflow-y-auto thin-scroll space-y-0.5">
            {playlists.map((pl) => (
              <button
                key={pl.id}
                onClick={() => {
                  setActiveTab('library')
                  setSelectedPlaylistId(pl.id)
                }}
                className="flex w-full items-center gap-2 rounded-xl px-2 py-2 text-left text-[12px] text-white/50 hover:bg-white/5 hover:text-white transition-colors"
              >
                <ListMusic className="size-3.5 shrink-0 text-[#1DB954]/70" />
                <span className="truncate flex-1">{pl.name}</span>
                <span className="text-[10px] text-white/25 shrink-0">{pl.tracks.length}</span>
              </button>
            ))}
            {playlists.length === 0 && (
              <p className="px-2 py-2 text-[11px] text-white/30">{t.noPlaylists}</p>
            )}
          </div>
        )}
      </GlassPanel>
    </div>
  )

  return withBackground(
    <>
      <header className="shrink-0 flex items-center gap-3 px-4 py-3 md:px-6">
          <span className="shrink-0 text-base font-extrabold tracking-tight">CatMusic</span>

          <div className="flex-1 max-w-xl mx-auto">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-white/35 z-10 pointer-events-none" />
              <input
                type="text"
                placeholder={t.searchMusicPlaceholder}
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  if (e.target.value.trim().length >= 2) setActiveTab('explore')
                }}
                className="cm-glass w-full rounded-full pl-11 pr-10 py-2.5 text-[13px] text-white placeholder:text-white/35 focus:outline-none focus:ring-2 focus:ring-[#1DB954]/40 transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-white/40 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>
          </div>

          <div className="hidden md:flex items-center gap-1 shrink-0 relative">
            <button
              onClick={() => setShowNotifications((v) => !v)}
              aria-label="Actividad reciente"
              className={`rounded-full p-2 transition-colors ${
                showNotifications ? 'bg-[#1DB954]/20 text-[#1DB954]' : 'text-white/40 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Bell className="size-4" />
            </button>
            <button
              onClick={() => onOpenSettings?.()}
              aria-label="Abrir ajustes"
              className="rounded-full p-2 text-white/40 hover:bg-white/10 hover:text-white transition-colors"
            >
              <Settings className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => void toggleFullscreen()}
              aria-label={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
              aria-pressed={isFullscreen}
              className={`rounded-full p-2 transition-colors ${
                isFullscreen ? 'bg-[#1DB954]/20 text-[#1DB954]' : 'text-white/40 hover:bg-white/10 hover:text-white'
              }`}
            >
              {isFullscreen ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
            </button>

            {showNotifications && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)} />
                <GlassPanel variant="strong" className="absolute right-0 top-full z-50 mt-2 w-72 p-3 shadow-2xl">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-white/40 mb-3">Actividad reciente</p>
                  {history.length > 0 ? (
                    <div className="max-h-48 overflow-y-auto thin-scroll space-y-1 mb-3">
                      {history.slice(0, 6).map((entry, idx) => (
                        <button
                          key={`${entry.id}-${idx}`}
                          onClick={() => {
                            playTrack(entry.track, history.map((h) => h.track))
                            setShowNotifications(false)
                          }}
                          className="flex w-full items-center gap-2 rounded-xl px-2 py-2 text-left hover:bg-white/5 transition-colors"
                        >
                          <div className="size-8 shrink-0 overflow-hidden rounded-lg">
                            <img src={entry.track.artworkUrl} alt="" className="size-full object-cover" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[12px] font-semibold">{entry.track.title}</p>
                            <p className="truncate text-[10px] text-white/40">{entry.track.artist}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[12px] text-white/40 mb-3">Aún no hay historial de escuchas</p>
                  )}

                  {notifPermission !== 'granted' && notifPermission !== 'unsupported' && (
                    <button
                      onClick={requestNotifications}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-white/[0.08] px-3 py-2 text-[12px] font-semibold hover:bg-white/[0.12] transition-colors"
                    >
                      <Bell className="size-3.5" />
                      Activar notificaciones
                    </button>
                  )}
                  {notifPermission === 'denied' && (
                    <p className="mt-2 flex items-center gap-1.5 text-[11px] text-rose-400/80">
                      <BellOff className="size-3.5 shrink-0" />
                      Notificaciones bloqueadas en el navegador
                    </p>
                  )}
                </GlassPanel>
              </>
            )}
          </div>
        </header>

        {/* Body */}
        <div className="flex flex-1 min-h-0 gap-3 px-3 pb-28 md:px-4 md:pb-24">
          {/* Left sidebar - desktop */}
          <aside className="hidden h-full w-[220px] shrink-0 flex-col min-h-0 lg:flex">
            {sidebarWidgets}
          </aside>

          {/* Main scroll area */}
          <main className="flex-1 min-w-0 overflow-y-auto thin-scroll">
            {activeTab === 'home' && (
              <HomeDashboard
                greeting={greeting}
                featuredTrack={featuredTrack}
                favoritesCount={favorites.length}
                playlistsCount={playlists.length}
                historyCount={history.length}
                currentTrack={currentTrack}
                isPlaying={playerState.isPlaying}
                artistBannerUrl={artistBanner}
                onPlayFeatured={() => playTrack(featuredTrack, SEED_TRACKS)}
                onSelectArtist={setSelectedArtistName}
                onSelectTrack={setSelectedTrackDetail}
              />
            )}

            {/* ======= EXPLORE TAB ======= */}
            {activeTab === 'explore' && (
              <div className="space-y-4 pb-4">
                {!searchQuery && (
                  <>
                    <GlassPanel className="p-4 md:p-5">
                      <h3 className="text-sm font-bold text-white/80 mb-3 flex items-center gap-2">
                        <Radio className="size-4 text-[#1DB954]" />
                        Explora por género
                      </h3>
                      <div className="flex flex-wrap items-center gap-2">
                        {GENRES.map((g) => (
                          <button
                            key={g}
                            onClick={() => {
                              setSelectedGenre(g)
                              setSearchQuery(g === 'Todos' ? '' : g)
                            }}
                            className={`rounded-full px-4 py-2 text-[12.5px] font-semibold transition-all ${
                              selectedGenre === g && searchQuery
                                ? 'bg-[#1DB954] text-white shadow-lg shadow-[#1DB954]/25'
                                : 'bg-white/[0.08] text-white/70 hover:bg-white/[0.14] hover:text-white'
                            }`}
                          >
                            {g}
                          </button>
                        ))}
                      </div>
                    </GlassPanel>

                    <GlassPanel className="p-4 md:p-5">
                      <h3 className="text-sm font-bold text-white/80 mb-4 flex items-center gap-2">
                        <Sparkles className="size-4 text-[#1DB954]" />
                        Tendencias
                      </h3>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                        {SEED_TRACKS.slice(0, 10).map((t) => (
                          <TrackCard key={t.id} track={t} queue={SEED_TRACKS} />
                        ))}
                      </div>
                    </GlassPanel>
                  </>
                )}

                {searchQuery && searchQuery.trim().length >= 2 && (
                  <GlassPanel className="overflow-hidden p-3">
                    <div className="flex items-center gap-1 border-b border-white/[0.06] px-4 pt-3">
                      {(['songs', 'playlists', 'artists'] as SearchTab[]).map((type) => (
                        <button
                          key={type}
                          onClick={() => setSearchTab(type)}
                          className={`px-4 py-2.5 text-[13px] font-semibold rounded-t-xl transition-all ${
                            searchTab === type
                              ? 'text-white border-b-2 border-[#1DB954]'
                              : 'text-white/40 hover:text-white/70'
                          }`}
                        >
                          {type === 'songs' ? 'Canciones' : type === 'playlists' ? 'Playlists' : 'Artistas'}
                        </button>
                      ))}
                    </div>

                    {searchTab === 'songs' && (
                      <div>
                        {isSearching ? (
                          <div className="flex items-center justify-center gap-3 py-16">
                            <span className="size-5 animate-spin rounded-full border-2 border-[#1DB954] border-t-transparent" />
                            <span className="text-sm text-white/50">Buscando canciones...</span>
                          </div>
                        ) : finalSongResults.length > 0 ? (
                          <div className="divide-y divide-white/[0.06]">
                            {finalSongResults.map((t, idx) => (
                              <TrackRow
                                key={`${t.id}-${idx}`}
                                track={t}
                                index={idx + 1}
                                queue={finalSongResults}
                                onSelectArtist={(a) => setSelectedArtistName(a)}
                                onSelectTrack={(tr) => setSelectedTrackDetail(tr)}
                              />
                            ))}
                          </div>
                        ) : (
                          <div className="py-16 text-center">
                            <Music className="mx-auto size-10 text-white/20 mb-3" />
                            <p className="text-sm text-white/40">No se encontraron canciones</p>
                          </div>
                        )}
                      </div>
                    )}

                    {searchTab === 'playlists' && (
                      <div className="p-4">
                        {isSearching ? (
                          <div className="flex items-center justify-center gap-3 py-16">
                            <span className="size-5 animate-spin rounded-full border-2 border-[#1DB954] border-t-transparent" />
                            <span className="text-sm text-white/50">Buscando playlists...</span>
                          </div>
                        ) : playlistResults.length > 0 ? (
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                            {playlistResults.map((pl) => (
                              <button
                                key={pl.id}
                                onClick={() =>
                                  setSelectedTrackDetail({
                                    id: pl.id,
                                    title: pl.title,
                                    artist: pl.artist,
                                    durationSeconds: 0,
                                    artworkUrl: pl.coverUrl,
                                    source: 'youtube',
                                  } as Track)
                                }
                                className="group flex flex-col gap-3 rounded-2xl bg-white/[0.04] border border-white/[0.06] p-3 text-left transition-all hover:bg-white/[0.08] hover:border-white/[0.12]"
                              >
                                <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-white/5">
                                  <img src={pl.coverUrl} alt={pl.title} className="size-full object-cover transition-transform group-hover:scale-105" />
                                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Play className="size-10 fill-white text-white" />
                                  </div>
                                </div>
                                <div>
                                  <h4 className="truncate text-[13px] font-bold text-white group-hover:text-[#1DB954] transition-colors">{pl.title}</h4>
                                  <p className="truncate text-[11px] text-white/50 mt-0.5">{pl.artist}</p>
                                </div>
                              </button>
                            ))}
                          </div>
                        ) : (
                          <div className="py-16 text-center">
                            <ListMusic className="mx-auto size-10 text-white/20 mb-3" />
                            <p className="text-sm text-white/40">No se encontraron playlists</p>
                          </div>
                        )}
                      </div>
                    )}

                    {searchTab === 'artists' && (
                      <div className="pt-1">
                        {isSearching ? (
                          <div className="flex items-center justify-center gap-3 py-16">
                            <span className="size-5 animate-spin rounded-full border-2 border-[#1DB954] border-t-transparent" />
                            <span className="text-sm text-white/50">Buscando artistas...</span>
                          </div>
                        ) : channelResults.length > 0 ? (
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                            {channelResults.map((ch) => (
                              <button
                                key={ch.id}
                                onClick={() => setSelectedArtistName(ch.name)}
                                className="group flex flex-col items-center gap-3 rounded-2xl bg-white/[0.04] border border-white/[0.06] p-4 text-center transition-all hover:bg-white/[0.08]"
                              >
                                <div className="size-20 overflow-hidden rounded-full ring-2 ring-white/10 group-hover:ring-[#1DB954]/40 transition-all">
                                  <img src={ch.avatarUrl} alt={ch.name} className="size-full object-cover" />
                                </div>
                                <h4 className="truncate text-[13px] font-bold text-white group-hover:text-[#1DB954] transition-colors">{ch.name}</h4>
                              </button>
                            ))}
                          </div>
                        ) : (
                          <div className="py-16 text-center">
                            <User className="mx-auto size-10 text-white/20 mb-3" />
                            <p className="text-sm text-white/40">No se encontraron artistas</p>
                          </div>
                        )}
                      </div>
                    )}
                  </GlassPanel>
                )}
              </div>
            )}

            {/* ======= LIBRARY TAB ======= */}
            {activeTab === 'library' && (
              <div className="space-y-4 pb-4">
                <GlassPanel className="p-4 md:p-5">
                  <h1 className="text-2xl font-black flex items-center gap-2">
                    <Library className="size-6 text-[#1DB954]" />
                    Tu Biblioteca
                  </h1>
                  <p className="text-sm text-white/50 mt-1">Playlists, favoritos e historial</p>

                  <div className="mt-4 flex flex-wrap items-center gap-1 rounded-2xl bg-white/[0.04] p-1 border border-white/[0.06] w-fit">
                    <button
                      onClick={() => setSelectedPlaylistId(null)}
                      className={`rounded-xl px-4 py-2 text-[12.5px] font-semibold transition-all ${!selectedPlaylistId ? 'bg-[#1DB954] text-white shadow-lg shadow-[#1DB954]/20' : 'text-white/50 hover:text-white'}`}
                    >
                      Mis Playlists ({playlists.length})
                    </button>
                    <button
                      onClick={() => setSelectedPlaylistId('favorites')}
                      className={`rounded-xl px-4 py-2 text-[12.5px] font-semibold transition-all ${selectedPlaylistId === 'favorites' ? 'bg-[#1DB954] text-white shadow-lg shadow-[#1DB954]/20' : 'text-white/50 hover:text-white'}`}
                    >
                      <Heart className="size-3.5 inline mr-1" />
                      Favoritos ({favorites.length})
                    </button>
                    <button
                      onClick={() => setSelectedPlaylistId('history')}
                      className={`rounded-xl px-4 py-2 text-[12.5px] font-semibold transition-all ${selectedPlaylistId === 'history' ? 'bg-[#1DB954] text-white shadow-lg shadow-[#1DB954]/20' : 'text-white/50 hover:text-white'}`}
                    >
                      <Clock className="size-3.5 inline mr-1" />
                      Historial
                    </button>
                  </div>
                </GlassPanel>

                {!selectedPlaylistId && (
                  <GlassPanel className="p-4 md:p-5">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-base font-bold">Mis Playlists</h2>
                      <button
                        onClick={() => setNewPlaylistOpen(true)}
                        className="flex items-center gap-2 rounded-full bg-white/[0.08] px-4 py-2 text-[12.5px] font-semibold hover:bg-white/[0.14] transition-all"
                      >
                        <Plus className="size-4" />
                        Nueva
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                      {playlists.map((pl) => (
                        <div
                          key={pl.id}
                          onClick={() => setSelectedPlaylistId(pl.id)}
                          className="group relative flex flex-col gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.04] p-4 transition-all cursor-pointer hover:bg-white/[0.08] hover:border-[#1DB954]/30"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex size-12 items-center justify-center rounded-xl bg-[#1DB954]/20">
                              <ListMusic className="size-5 text-[#1DB954]" />
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                deletePlaylist(pl.id)
                              }}
                              className="opacity-0 group-hover:opacity-100 rounded-lg p-1.5 text-white/40 hover:text-rose-400 hover:bg-rose-400/10 transition-all"
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          </div>
                          <div>
                            <h3 className="truncate font-bold text-[13px]">{pl.name}</h3>
                            <p className="text-[11px] text-white/40 mt-0.5">{pl.tracks.length} canciones</p>
                          </div>
                          <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="flex size-9 items-center justify-center rounded-full bg-[#1DB954] text-white shadow-lg shadow-[#1DB954]/30">
                              <Play className="size-4 fill-current ml-0.5" />
                            </div>
                          </div>
                        </div>
                      ))}
                      {playlists.length === 0 && (
                        <div className="col-span-full py-12 text-center">
                          <ListMusic className="mx-auto size-12 text-white/10 mb-3" />
                          <p className="text-sm text-white/40">Aún no tienes playlists</p>
                          <button
                            onClick={() => setNewPlaylistOpen(true)}
                            className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#1DB954] px-4 py-2.5 text-[13px] font-bold shadow-lg shadow-[#1DB954]/20 hover:bg-[#1ed760] transition-all"
                          >
                            <Plus className="size-4" />
                            Crear Playlist
                          </button>
                        </div>
                      )}
                    </div>
                  </GlassPanel>
                )}

                {selectedPlaylistId && selectedPlaylistId !== 'favorites' && selectedPlaylistId !== 'history' && selectedPlaylist && (
                  <GlassPanel className="overflow-hidden p-0">
                    <div className="flex items-center justify-between px-4 pt-4 pb-2 md:px-5">
                      <div>
                        <h2 className="text-xl font-bold">{selectedPlaylist.name}</h2>
                        <p className="text-[12px] text-white/50 mt-0.5">{selectedPlaylist.tracks.length} canciones</p>
                      </div>
                      {selectedPlaylist.tracks.length > 0 && (
                        <button
                          onClick={() => playTrack(selectedPlaylist.tracks[0], selectedPlaylist.tracks)}
                          className="flex items-center gap-2 rounded-full bg-[#1DB954] px-5 py-2.5 text-[13px] font-bold shadow-lg shadow-[#1DB954]/25 hover:bg-[#1ed760] transition-all"
                        >
                          <Play className="size-4 fill-current" />
                          Reproducir
                        </button>
                      )}
                    </div>
                    <div className="divide-y divide-white/[0.06]">
                      {selectedPlaylist.tracks.length > 0 ? (
                        selectedPlaylist.tracks.map((t, idx) => (
                          <TrackRow
                            key={`${t.id}-${idx}`}
                            track={t}
                            index={idx + 1}
                            queue={selectedPlaylist.tracks}
                            onSelectArtist={(a) => setSelectedArtistName(a)}
                            onSelectTrack={(tr) => setSelectedTrackDetail(tr)}
                          />
                        ))
                      ) : (
                        <div className="py-16 text-center">
                          <p className="text-sm text-white/40">Esta playlist está vacía</p>
                        </div>
                      )}
                    </div>
                  </GlassPanel>
                )}

                {selectedPlaylistId === 'favorites' && (
                  <GlassPanel className="overflow-hidden p-0">
                    <div className="flex items-center justify-between px-4 pt-4 pb-2 md:px-5">
                      <div>
                        <h2 className="text-xl font-bold flex items-center gap-2">
                          <Heart className="size-5 text-rose-400 fill-current" />
                          Mis Favoritos
                        </h2>
                        <p className="text-[12px] text-white/50 mt-0.5">{favorites.length} canciones guardadas</p>
                      </div>
                      {favoriteTracks.length > 0 && (
                        <button
                          onClick={() => playTrack(favoriteTracks[0], favoriteTracks)}
                          className="flex items-center gap-2 rounded-full bg-[#1DB954] px-5 py-2.5 text-[13px] font-bold shadow-lg shadow-[#1DB954]/25 hover:bg-[#1ed760] transition-all"
                        >
                          <Play className="size-4 fill-current" />
                          Reproducir todas
                        </button>
                      )}
                    </div>
                    <div className="divide-y divide-white/[0.06]">
                      {favoriteTracks.length > 0 ? (
                        favoriteTracks.map((t, idx) => (
                          <TrackRow
                            key={t.id || idx}
                            track={t}
                            index={idx + 1}
                            queue={favoriteTracks}
                            onSelectArtist={(a) => setSelectedArtistName(a)}
                            onSelectTrack={(tr) => setSelectedTrackDetail(tr)}
                          />
                        ))
                      ) : (
                        <div className="py-16 text-center">
                          <Heart className="mx-auto size-12 text-white/10 mb-3" />
                          <p className="text-sm text-white/40">No hay canciones en favoritos</p>
                        </div>
                      )}
                    </div>
                  </GlassPanel>
                )}

                {selectedPlaylistId === 'history' && (
                  <GlassPanel className="overflow-hidden p-0">
                    <div className="flex items-center justify-between px-4 pt-4 pb-2 md:px-5">
                      <h2 className="text-xl font-bold flex items-center gap-2">
                        <Clock className="size-5 text-white/60" />
                        Historial de escuchas
                      </h2>
                      {history.length > 0 && (
                        <button onClick={clearHistory} className="text-[12px] font-semibold text-rose-400 hover:text-rose-300 transition-colors">
                          Limpiar historial
                        </button>
                      )}
                    </div>
                    <div className="divide-y divide-white/[0.06]">
                      {history.length > 0 ? (
                        history.map((entry, idx) => (
                          <TrackRow
                            key={`${entry.id}-${idx}`}
                            track={entry.track}
                            index={idx + 1}
                            queue={history.map((h) => h.track)}
                            onSelectArtist={(a) => setSelectedArtistName(a)}
                            onSelectTrack={(tr) => setSelectedTrackDetail(tr)}
                          />
                        ))
                      ) : (
                        <div className="py-16 text-center">
                          <Clock className="mx-auto size-12 text-white/10 mb-3" />
                          <p className="text-sm text-white/40">No hay historial de escuchas</p>
                        </div>
                      )}
                    </div>
                  </GlassPanel>
                )}
              </div>
            )}
          </main>
        </div>

        {/* Mobile bottom nav */}
        <nav className="lg:hidden fixed bottom-[76px] left-3 right-3 z-30 cm-glass-strong rounded-[20px] flex items-center justify-around px-2 py-2">
          <button onClick={() => setActiveTab('home')} className={`flex flex-col items-center gap-0.5 px-4 py-1 rounded-xl transition-colors ${activeTab === 'home' ? 'text-[#1DB954]' : 'text-white/40'}`}>
            <Home className="size-5" />
            <span className="text-[9px] font-semibold">Inicio</span>
          </button>
          <button onClick={() => setActiveTab('explore')} className={`flex flex-col items-center gap-0.5 px-4 py-1 rounded-xl transition-colors ${activeTab === 'explore' ? 'text-[#1DB954]' : 'text-white/40'}`}>
            <Search className="size-5" />
            <span className="text-[9px] font-semibold">Explorar</span>
          </button>
          <button onClick={() => setActiveTab('library')} className={`flex flex-col items-center gap-0.5 px-4 py-1 rounded-xl transition-colors ${activeTab === 'library' ? 'text-[#1DB954]' : 'text-white/40'}`}>
            <Library className="size-5" />
            <span className="text-[9px] font-semibold">Biblioteca</span>
          </button>
        </nav>

      {/* Create Playlist Modal */}
      {newPlaylistOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <form
            onSubmit={handleCreatePlaylist}
            className="w-full max-w-sm mx-4"
          >
          <GlassPanel variant="strong" className="p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold">Nueva playlist</h3>
              <button type="button" onClick={() => setNewPlaylistOpen(false)} className="rounded-xl p-1.5 text-white/50 hover:text-white hover:bg-white/10 transition-all">
                <X className="size-4" />
              </button>
            </div>
            <input
              type="text"
              placeholder="Nombre de la playlist"
              value={newPlName}
              onChange={(e) => setNewPlName(e.target.value)}
              autoFocus
              className="cm-glass w-full rounded-2xl px-4 py-3 text-[13px] text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-[#1DB954]/30"
            />
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setNewPlaylistOpen(false)} className="rounded-xl px-4 py-2.5 text-[12.5px] font-semibold text-white/50 hover:bg-white/5 transition-all">
                Cancelar
              </button>
              <button type="submit" className="rounded-xl bg-[#1DB954] px-5 py-2.5 text-[12.5px] font-bold shadow-lg shadow-[#1DB954]/20 hover:bg-[#1ed760] transition-all">
                Crear
              </button>
            </div>
          </GlassPanel>
          </form>
        </div>
      )}
    </>
  )
}
