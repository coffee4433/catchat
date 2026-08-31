'use client'

import React, { useState, useEffect, useCallback, useMemo, useRef, type CSSProperties } from 'react'
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
import { SEED_TRACKS, GENRES, ALL_GENRES } from '@/lib/plugins/cat-music/catalog'
import { useCatMusicPlayer } from '@/lib/plugins/cat-music/player-context'
import { useLibrary } from '@/lib/plugins/cat-music/library-context'
import { accentVars, useAccentSource, useCatMusicAccent } from '@/lib/plugins/cat-music/accent-store'
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

/** The `type` each search tab asks the API for. */
const SEARCH_TYPE_BY_TAB: Record<SearchTab, 'video' | 'playlist' | 'channel'> = {
  songs: 'video',
  playlists: 'playlist',
  artists: 'channel',
}

/**
 * Rail item. The active one is marked by an accent bar on the leading edge
 * rather than a filled block, which keeps the rail quiet while still being
 * unmistakable — and it picks up the colour of whatever is playing.
 */
function NavButton({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean
  onClick: () => void
  icon: React.ComponentType<{ className?: string }>
  label: string
}) {
  return (
    <button
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={`cm-focus group relative flex w-full items-center gap-3 overflow-hidden rounded-2xl px-3 py-2.5 text-[13px] font-semibold transition-all ${
        active ? 'cm-tint text-white' : 'text-white/55 hover:bg-white/[0.06] hover:text-white'
      }`}
    >
      <span
        aria-hidden
        className={`absolute left-0 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-r-full bg-[var(--cm-accent-hi)] transition-all ${
          active ? 'opacity-100' : 'opacity-0 group-hover:opacity-40'
        }`}
      />
      <Icon className={`size-4 transition-colors ${active ? 'text-[var(--cm-accent-hi)]' : ''}`} />
      <span>{label}</span>
    </button>
  )
}

/**
 * Placeholder rows shaped like the results that are coming.
 *
 * `label` is visually hidden rather than dropped: the shimmer says "something is
 * loading" to anyone who can see it, and the live region says the same thing to
 * anyone who cannot.
 */
function RowSkeletons({ count = 6, label }: { count?: number; label: string }) {
  return (
    <div className="space-y-1 p-3" role="status" aria-busy="true">
      <span className="sr-only">{label}</span>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="cm-rise flex items-center gap-3 rounded-2xl px-2 py-2" style={{ '--i': i } as CSSProperties}>
          <div className="cm-skeleton size-11 shrink-0 rounded-xl" />
          <div className="flex-1 space-y-2">
            <div className="cm-skeleton h-3 rounded-full" style={{ width: `${68 - i * 6}%` }} />
            <div className="cm-skeleton h-2 rounded-full" style={{ width: `${40 - i * 3}%` }} />
          </div>
        </div>
      ))}
    </div>
  )
}

/** Placeholder tiles for the grid layouts (playlists, artists, trending). */
function CardSkeletons({
  count = 8,
  round = false,
  label,
  className = 'grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5',
}: {
  count?: number
  /** Circular covers for artist grids. */
  round?: boolean
  label: string
  className?: string
}) {
  return (
    <div className={className} role="status" aria-busy="true">
      <span className="sr-only">{label}</span>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="cm-rise space-y-2" style={{ '--i': i } as CSSProperties}>
          <div className={`cm-skeleton aspect-square w-full ${round ? 'rounded-full' : 'rounded-2xl'}`} />
          <div className={`cm-skeleton h-3 w-4/5 rounded-full ${round ? 'mx-auto' : ''}`} />
          {!round && <div className="cm-skeleton h-2 w-1/2 rounded-full" />}
        </div>
      ))}
    </div>
  )
}


export function CatMusicMainView({ onOpenSettings }: PluginViewProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const [activeTab, setActiveTab] = useState<Tab>('home')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchTab, setSearchTab] = useState<SearchTab>('songs')
  const [selectedGenre, setSelectedGenre] = useState(ALL_GENRES)
  const [newPlaylistOpen, setNewPlaylistOpen] = useState(false)
  const [newPlName, setNewPlName] = useState('')
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(null)
  const [songResults, setSongResults] = useState<Track[]>([])
  const [playlistResults, setPlaylistResults] = useState<YtPlaylist[]>([])
  const [channelResults, setChannelResults] = useState<YtChannel[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [searchFailed, setSearchFailed] = useState(false)
  const [retryTick, setRetryTick] = useState(0)
  const [showLibraryPlaylists, setShowLibraryPlaylists] = useState(true)
  const [showNotifications, setShowNotifications] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [notifPermission, setNotifPermission] = useState<NotificationPermission | 'unsupported'>('default')

  const [selectedTrackDetail, setSelectedTrackDetail] = useState<Track | null>(null)
  const [selectedArtistName, setSelectedArtistName] = useState<string | null>(null)
  const [artistBanner, setArtistBanner] = useState<string>()

  /** `tab:query` already loaded, so switching back doesn't refetch. */
  const loadedSearchRef = useRef('')

  const { playTrack, currentTrack, playerState } = useCatMusicPlayer()
  const { favorites, playlists, history, createPlaylist, deletePlaylist, clearHistory } = useLibrary()
  const { t } = useLanguage()

  // The whole plugin is coloured by what is playing; fall back to the featured
  // track's art so the shell is never a flat grey before the first play.
  const accent = useCatMusicAccent()
  useAccentSource(currentTrack?.artworkUrl ?? SEED_TRACKS[3]?.artworkUrl)

  const featuredTrack = currentTrack ?? SEED_TRACKS[3]

  useEffect(() => {
    const artist = featuredTrack.artist
    if (!artist) return
    const controller = new AbortController()
    fetch(`/api/youtube/channel?name=${encodeURIComponent(artist)}`, { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.channel?.bannerUrl) setArtistBanner(data.channel.bannerUrl)
      })
      .catch(() => {
        // Includes the abort on unmount or a featured-track change.
      })
    return () => controller.abort()
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

  const applySearchResults = useCallback((tab: SearchTab, results: unknown[]) => {
    if (tab === 'songs') setSongResults(results as Track[])
    else if (tab === 'playlists') setPlaylistResults(results as YtPlaylist[])
    else setChannelResults(results as YtChannel[])
  }, [])

  // Only the visible tab is fetched. Firing all three per keystroke tripled the
  // upstream traffic for results the user usually never looked at.
  useEffect(() => {
    const query = searchQuery.trim()
    if (query.length < 2) {
      setSongResults([])
      setPlaylistResults([])
      setChannelResults([])
      setIsSearching(false)
      setSearchFailed(false)
      loadedSearchRef.current = ''
      return
    }

    const key = `${searchTab}:${query}`
    if (loadedSearchRef.current === key) return

    const controller = new AbortController()
    setIsSearching(true)
    setSearchFailed(false)

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/youtube/search?q=${encodeURIComponent(query)}&type=${SEARCH_TYPE_BY_TAB[searchTab]}`,
          { signal: controller.signal },
        )
        const data = await res.json().catch(() => ({}))
        if (controller.signal.aborted) return

        if (!res.ok) {
          // 502 means YouTube is unreachable, which is not the same as "nothing
          // matched" — the empty state would otherwise lie about it.
          setSearchFailed(true)
          applySearchResults(searchTab, [])
          return
        }

        applySearchResults(searchTab, Array.isArray(data.results) ? data.results : [])
        loadedSearchRef.current = key
      } catch (err) {
        if ((err as Error)?.name === 'AbortError') return
        setSearchFailed(true)
        applySearchResults(searchTab, [])
      } finally {
        if (!controller.signal.aborted) setIsSearching(false)
      }
    }, 350)

    return () => {
      clearTimeout(timer)
      // Abort in flight: a slow response for an old query used to land after a
      // newer one and overwrite it.
      controller.abort()
    }
  }, [searchQuery, searchTab, retryTick, applySearchResults])

  const retrySearch = useCallback(() => {
    loadedSearchRef.current = ''
    setRetryTick((n) => n + 1)
  }, [])

  const localFiltered = useMemo(() => {
    const needle = searchQuery.trim().toLowerCase()
    return SEED_TRACKS.filter((track) => {
      const matchesQuery =
        !needle ||
        track.title.toLowerCase().includes(needle) ||
        track.artist.toLowerCase().includes(needle)
      const matchesGenre = selectedGenre === ALL_GENRES || track.genre === selectedGenre
      return matchesQuery && matchesGenre
    })
  }, [searchQuery, selectedGenre])

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

  /**
   * The plugin shell. Everything visual hangs off `.cm-root`, whose inline
   * custom properties carry the colour sampled from the current cover art —
   * so the aurora, every accent and every glow shift with the music instead
   * of sitting on a fixed green.
   */
  const withBackground = (children: React.ReactNode) => (
    <div
      ref={rootRef}
      style={accentVars(accent)}
      className={`cm-root cm-grain relative h-full w-full overflow-hidden text-white ${
        isFullscreen ? 'fixed inset-0 z-[9999] !h-dvh !w-dvw rounded-none' : ''
      }`}
    >
      <div className="cm-aurora" data-idle={!playerState.isPlaying} aria-hidden="true">
        {/* The cover art itself, blown up and blurred — free texture that is
            always in key with the accent because it *is* the source of it. */}
        {currentTrack?.artworkUrl && (
          <img src={currentTrack.artworkUrl} alt="" className="cm-immersive-bg" />
        )}
        <span className="cm-blob cm-blob-1" />
        <span className="cm-blob cm-blob-2" />
        <span className="cm-blob cm-blob-3" />
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
                <ListMusic className="size-3.5 shrink-0 text-[var(--cm-accent)]" />
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
          <span className="flex shrink-0 items-center gap-2">
            <span
              aria-hidden
              className="flex size-7 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--cm-accent-hi)] to-[var(--cm-accent-lo)] text-[#08090b] shadow-[0_8px_20px_-8px_var(--cm-halo)]"
            >
              <Music className="size-3.5" />
            </span>
            <span className="text-base font-black tracking-tight">CatMusic</span>
            {playerState.isPlaying && (
              <span className="cm-eq ml-0.5 h-3.5 text-[var(--cm-accent-hi)]" aria-hidden>
                <i /><i /><i /><i />
              </span>
            )}
          </span>

          <div className="flex-1 max-w-xl mx-auto">
            <div className="relative" role="search">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-white/35 z-10 pointer-events-none" />
              <input
                type="search"
                placeholder={t.searchMusicPlaceholder}
                aria-label={t.searchMusicPlaceholder}
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  if (e.target.value.trim().length >= 2) setActiveTab('explore')
                }}
                className="cm-glass w-full rounded-full pl-11 pr-10 py-2.5 text-[13px] text-white placeholder:text-white/35 transition-all focus:outline-none focus:border-[var(--cm-accent-edge)] focus:shadow-[0_0_0_4px_var(--cm-accent-veil)] [&::-webkit-search-cancel-button]:hidden"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  aria-label={t.clearSearch}
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
              aria-label={t.recentActivity}
              className={`cm-focus rounded-full p-2 transition-colors ${
                showNotifications
                  ? 'cm-tint text-[var(--cm-accent-hi)]'
                  : 'text-white/40 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Bell className="size-4" />
            </button>
            <button
              onClick={() => onOpenSettings?.()}
              aria-label={t.openSettings}
              className="cm-focus rounded-full p-2 text-white/40 hover:bg-white/10 hover:text-white transition-colors"
            >
              <Settings className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => void toggleFullscreen()}
              aria-label={isFullscreen ? t.exitFullscreen : t.enterFullscreen}
              aria-pressed={isFullscreen}
              className={`cm-focus rounded-full p-2 transition-colors ${
                isFullscreen
                  ? 'cm-tint text-[var(--cm-accent-hi)]'
                  : 'text-white/40 hover:bg-white/10 hover:text-white'
              }`}
            >
              {isFullscreen ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
            </button>

            {showNotifications && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)} />
                <GlassPanel variant="strong" className="absolute right-0 top-full z-50 mt-2 w-72 p-3 shadow-2xl">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-white/40 mb-3">{t.recentActivity}</p>
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
                    <p className="text-[12px] text-white/40 mb-3">{t.noHistory}</p>
                  )}

                  {notifPermission !== 'granted' && notifPermission !== 'unsupported' && (
                    <button
                      onClick={requestNotifications}
                      className="cm-btn cm-btn-ghost w-full px-3 py-2 text-[12px]"
                    >
                      <Bell className="size-3.5" />
                      {t.enableNotifications}
                    </button>
                  )}
                  {notifPermission === 'denied' && (
                    <p className="mt-2 flex items-center gap-1.5 text-[11px] text-rose-400/80">
                      <BellOff className="size-3.5 shrink-0" />
                      {t.notificationsBlocked}
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
                        <Radio className="size-4 text-[var(--cm-accent-hi)]" />
                        {t.exploreByGenre}
                      </h3>
                      <div className="flex flex-wrap items-center gap-2">
                        {GENRES.map((g) => (
                          <button
                            key={g}
                            onClick={() => {
                              setSelectedGenre(g)
                              setSearchQuery(g === ALL_GENRES ? '' : g)
                            }}
                            aria-pressed={selectedGenre === g}
                            className={`rounded-full px-4 py-2 text-[12.5px] font-semibold transition-all ${
                              selectedGenre === g && searchQuery
                                ? 'bg-[var(--cm-accent-hi)] text-[#08090b] shadow-lg shadow-[var(--cm-halo)]'
                                : 'bg-white/[0.08] text-white/70 hover:bg-white/[0.14] hover:text-white'
                            }`}
                          >
                            {g === ALL_GENRES ? t.allGenres : g}
                          </button>
                        ))}
                      </div>
                    </GlassPanel>

                    <GlassPanel className="p-4 md:p-5">
                      <h3 className="text-sm font-bold text-white/80 mb-4 flex items-center gap-2">
                        <Sparkles className="size-4 text-[var(--cm-accent-hi)]" />
                        {t.trending}
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
                    {/* Segmented control rather than underlined tabs: the sliding
                        accent pill reads as one control instead of three links. */}
                    <div className="px-4 pt-3">
                      <div className="cm-seg" role="tablist" aria-label={t.searchResults}>
                        {(['songs', 'playlists', 'artists'] as SearchTab[]).map((type) => (
                          <button
                            key={type}
                            role="tab"
                            id={`cm-search-tab-${type}`}
                            aria-selected={searchTab === type}
                            aria-controls={`cm-search-panel-${type}`}
                            onClick={() => setSearchTab(type)}
                            className={`cm-focus px-4 py-2 text-[12.5px] font-bold ${
                              searchTab === type ? '' : 'text-white/45 hover:text-white/80'
                            }`}
                          >
                            {type === 'songs' ? t.songs : type === 'playlists' ? t.playlists : t.artists}
                          </button>
                        ))}
                      </div>
                    </div>

                    {searchFailed && (
                      <div
                        role="alert"
                        className="mx-4 mt-3 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3"
                      >
                        <p className="text-[13px] text-rose-100">{t.upstreamError}</p>
                        <button
                          onClick={retrySearch}
                          className="rounded-full bg-white/10 px-4 py-1.5 text-[12.5px] font-semibold text-white transition-colors hover:bg-white/20"
                        >
                          {t.retry}
                        </button>
                      </div>
                    )}

                    {searchTab === 'songs' && (
                      <div role="tabpanel" id="cm-search-panel-songs" aria-labelledby="cm-search-tab-songs">
                        {isSearching ? (
                          <RowSkeletons label={t.searchingSongs} />
                        ) : finalSongResults.length > 0 ? (
                          <div className="divide-y divide-white/[0.06]">
                            {finalSongResults.map((song, idx) => (
                              <TrackRow
                                key={`${song.id}-${idx}`}
                                track={song}
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
                            <p className="text-sm text-white/40">{t.noSongsFoundSearch}</p>
                          </div>
                        )}
                      </div>
                    )}

                    {searchTab === 'playlists' && (
                      <div className="p-4" role="tabpanel" id="cm-search-panel-playlists" aria-labelledby="cm-search-tab-playlists">
                        {isSearching ? (
                          <CardSkeletons
                            label={t.searchingPlaylists}
                            count={8}
                            className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
                          />
                        ) : playlistResults.length > 0 ? (
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                            {playlistResults.map((pl, idx) => (
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
                                style={{ '--i': idx } as CSSProperties}
                                className="cm-glass cm-lift cm-rise cm-focus group flex flex-col gap-3 rounded-2xl p-3 text-left"
                              >
                                <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-white/5">
                                  <img src={pl.coverUrl} alt={pl.title} className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.07]" />
                                  <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-t from-black/70 via-black/10 to-transparent opacity-0 transition-opacity group-hover:opacity-100">
                                    <span className="cm-btn cm-btn-primary size-11 translate-y-2 transition-transform duration-300 group-hover:translate-y-0">
                                      <Play className="size-5 fill-current" />
                                    </span>
                                  </div>
                                </div>
                                <div>
                                  <h4 className="truncate text-[13px] font-bold text-white group-hover:text-[var(--cm-accent-hi)] transition-colors">{pl.title}</h4>
                                  <p className="truncate text-[11px] text-white/50 mt-0.5">{pl.artist}</p>
                                </div>
                              </button>
                            ))}
                          </div>
                        ) : (
                          <div className="py-16 text-center">
                            <ListMusic className="mx-auto size-10 text-white/20 mb-3" />
                            <p className="text-sm text-white/40">{t.noPlaylistsFound}</p>
                          </div>
                        )}
                      </div>
                    )}

                    {searchTab === 'artists' && (
                      <div className="p-4 pt-3" role="tabpanel" id="cm-search-panel-artists" aria-labelledby="cm-search-tab-artists">
                        {isSearching ? (
                          <CardSkeletons
                            label={t.searchingArtists}
                            round
                            count={6}
                            className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6"
                          />
                        ) : channelResults.length > 0 ? (
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                            {channelResults.map((ch, idx) => (
                              <button
                                key={ch.id}
                                onClick={() => setSelectedArtistName(ch.name)}
                                style={{ '--i': idx } as CSSProperties}
                                className="cm-glass cm-lift cm-rise cm-focus group flex flex-col items-center gap-3 rounded-2xl p-4 text-center"
                              >
                                <div className="size-20 overflow-hidden rounded-full ring-2 ring-white/10 transition-all group-hover:ring-[var(--cm-accent-edge)] group-hover:shadow-[0_0_0_6px_var(--cm-accent-veil)]">
                                  <img src={ch.avatarUrl} alt={ch.name} className="size-full object-cover" />
                                </div>
                                <h4 className="w-full truncate text-[13px] font-bold text-white group-hover:text-[var(--cm-accent-hi)] transition-colors">{ch.name}</h4>
                              </button>
                            ))}
                          </div>
                        ) : (
                          <div className="py-16 text-center">
                            <User className="mx-auto size-10 text-white/20 mb-3" />
                            <p className="text-sm text-white/40">{t.noArtistsFound}</p>
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
                    <Library className="size-6 text-[var(--cm-accent-hi)]" />
                    {t.yourLibrary}
                  </h1>
                  <p className="text-sm text-white/50 mt-1">{t.libraryDesc}</p>

                  <div className="mt-4 flex flex-wrap items-center gap-1 rounded-2xl bg-white/[0.04] p-1 border border-white/[0.06] w-fit">
                    <button
                      onClick={() => setSelectedPlaylistId(null)}
                      className={`rounded-xl px-4 py-2 text-[12.5px] font-semibold transition-all ${!selectedPlaylistId ? 'bg-[var(--cm-accent-hi)] text-[#08090b] shadow-lg shadow-[var(--cm-halo)]' : 'text-white/50 hover:text-white'}`}
                    >
                      {t.myPlaylists} ({playlists.length})
                    </button>
                    <button
                      onClick={() => setSelectedPlaylistId('favorites')}
                      className={`rounded-xl px-4 py-2 text-[12.5px] font-semibold transition-all ${selectedPlaylistId === 'favorites' ? 'bg-[var(--cm-accent-hi)] text-[#08090b] shadow-lg shadow-[var(--cm-halo)]' : 'text-white/50 hover:text-white'}`}
                    >
                      <Heart className="size-3.5 inline mr-1" />
                      {t.favorites} ({favorites.length})
                    </button>
                    <button
                      onClick={() => setSelectedPlaylistId('history')}
                      className={`rounded-xl px-4 py-2 text-[12.5px] font-semibold transition-all ${selectedPlaylistId === 'history' ? 'bg-[var(--cm-accent-hi)] text-[#08090b] shadow-lg shadow-[var(--cm-halo)]' : 'text-white/50 hover:text-white'}`}
                    >
                      <Clock className="size-3.5 inline mr-1" />
                      {t.history}
                    </button>
                  </div>
                </GlassPanel>

                {!selectedPlaylistId && (
                  <GlassPanel className="p-4 md:p-5">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-base font-bold">{t.myPlaylists}</h2>
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
                          className="group relative flex flex-col gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.04] p-4 transition-all cursor-pointer hover:bg-white/[0.08] hover:border-[var(--cm-accent-edge)]"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex size-12 items-center justify-center rounded-xl bg-[var(--cm-accent-veil)]">
                              <ListMusic className="size-5 text-[var(--cm-accent-hi)]" />
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
                            <div className="flex size-9 items-center justify-center rounded-full bg-[var(--cm-accent-hi)] text-[#08090b] shadow-lg shadow-[var(--cm-halo)]">
                              <Play className="size-4 fill-current ml-0.5" />
                            </div>
                          </div>
                        </div>
                      ))}
                      {playlists.length === 0 && (
                        <div className="col-span-full py-12 text-center">
                          <ListMusic className="mx-auto size-12 text-white/10 mb-3" />
                          <p className="text-sm text-white/40">{t.noPlaylistsYet}</p>
                          <button
                            onClick={() => setNewPlaylistOpen(true)}
                            className="mt-4 inline-flex items-center gap-2 rounded-full bg-[var(--cm-accent)] px-4 py-2.5 text-[13px] font-bold shadow-lg shadow-[var(--cm-halo)] hover:bg-[var(--cm-accent-hi)] transition-all"
                          >
                            <Plus className="size-4" />
                            {t.createPlaylist}
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
                        <p className="text-[12px] text-white/50 mt-0.5">
                          {selectedPlaylist.tracks.length} {t.playlistsCount}
                        </p>
                      </div>
                      {selectedPlaylist.tracks.length > 0 && (
                        <button
                          onClick={() => playTrack(selectedPlaylist.tracks[0], selectedPlaylist.tracks)}
                          className="flex items-center gap-2 rounded-full bg-[var(--cm-accent)] px-5 py-2.5 text-[13px] font-bold shadow-lg shadow-[var(--cm-halo)] hover:bg-[var(--cm-accent-hi)] transition-all"
                        >
                          <Play className="size-4 fill-current" />
                          {t.play}
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
                          <p className="text-sm text-white/40">{t.emptyPlaylist}</p>
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
                          {t.myFavorites}
                        </h2>
                        <p className="text-[12px] text-white/50 mt-0.5">
                          {favorites.length} {t.savedSongs}
                        </p>
                      </div>
                      {favoriteTracks.length > 0 && (
                        <button
                          onClick={() => playTrack(favoriteTracks[0], favoriteTracks)}
                          className="flex items-center gap-2 rounded-full bg-[var(--cm-accent)] px-5 py-2.5 text-[13px] font-bold shadow-lg shadow-[var(--cm-halo)] hover:bg-[var(--cm-accent-hi)] transition-all"
                        >
                          <Play className="size-4 fill-current" />
                          {t.playAll}
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
                          <p className="text-sm text-white/40">{t.noFavorites}</p>
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
                        {t.listeningHistory}
                      </h2>
                      {history.length > 0 && (
                        <button onClick={clearHistory} className="text-[12px] font-semibold text-rose-400 hover:text-rose-300 transition-colors">
                          {t.clearHistory}
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
                          <p className="text-sm text-white/40">{t.noHistory}</p>
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
          <button onClick={() => setActiveTab('home')} aria-current={activeTab === 'home' ? 'page' : undefined} className={`flex flex-col items-center gap-0.5 px-4 py-1 rounded-xl transition-colors ${activeTab === 'home' ? 'text-[var(--cm-accent-hi)]' : 'text-white/40'}`}>
            <Home className="size-5" />
            <span className="text-[9px] font-semibold">{t.homeTab}</span>
          </button>
          <button onClick={() => setActiveTab('explore')} aria-current={activeTab === 'explore' ? 'page' : undefined} className={`flex flex-col items-center gap-0.5 px-4 py-1 rounded-xl transition-colors ${activeTab === 'explore' ? 'text-[var(--cm-accent-hi)]' : 'text-white/40'}`}>
            <Search className="size-5" />
            <span className="text-[9px] font-semibold">{t.exploreTab}</span>
          </button>
          <button onClick={() => setActiveTab('library')} aria-current={activeTab === 'library' ? 'page' : undefined} className={`flex flex-col items-center gap-0.5 px-4 py-1 rounded-xl transition-colors ${activeTab === 'library' ? 'text-[var(--cm-accent-hi)]' : 'text-white/40'}`}>
            <Library className="size-5" />
            <span className="text-[9px] font-semibold">{t.libraryTab}</span>
          </button>
        </nav>

      {/* Create Playlist Modal */}
      {newPlaylistOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
          // Escape closes, and a click on the backdrop (not the panel) does too.
          onKeyDown={(e) => {
            if (e.key === 'Escape') setNewPlaylistOpen(false)
          }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setNewPlaylistOpen(false)
          }}
        >
          <form
            onSubmit={handleCreatePlaylist}
            className="w-full max-w-sm mx-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="cm-new-playlist-title"
          >
          <GlassPanel variant="strong" className="p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 id="cm-new-playlist-title" className="text-base font-bold">
                {t.newPlaylistModalTitle}
              </h3>
              <button type="button" onClick={() => setNewPlaylistOpen(false)} aria-label={t.close} className="rounded-xl p-1.5 text-white/50 hover:text-white hover:bg-white/10 transition-all">
                <X className="size-4" />
              </button>
            </div>
            <input
              type="text"
              placeholder={t.playlistName}
              aria-label={t.playlistName}
              value={newPlName}
              onChange={(e) => setNewPlName(e.target.value)}
              autoFocus
              className="cm-glass w-full rounded-2xl px-4 py-3 text-[13px] text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-[var(--cm-accent-edge)]"
            />
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setNewPlaylistOpen(false)} className="rounded-xl px-4 py-2.5 text-[12.5px] font-semibold text-white/50 hover:bg-white/5 transition-all">
                {t.cancel}
              </button>
              <button type="submit" className="rounded-xl bg-[var(--cm-accent)] px-5 py-2.5 text-[12.5px] font-bold shadow-lg shadow-[var(--cm-halo)] hover:bg-[var(--cm-accent-hi)] transition-all">
                {t.create}
              </button>
            </div>
          </GlassPanel>
          </form>
        </div>
      )}
    </>
  )
}
