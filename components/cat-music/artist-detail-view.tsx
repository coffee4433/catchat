'use client'

import React, { useState, useEffect } from 'react'
import {
  ArrowLeft,
  Heart,
  Music,
  Pause,
  Play,
  Plus,
  Radio,
  ListMusic,
  Sparkles,
  Clock,
  Grid3X3,
  Disc,
} from 'lucide-react'
import type { Track } from '@/lib/plugins/cat-music/types'
import type { YtPlaylist, YtChannel } from '@/lib/plugins/cat-music/innertube'
import { useCatMusicPlayer } from '@/lib/plugins/cat-music/player-context'
import { useLibrary } from '@/lib/plugins/cat-music/library-context'
import { formatDuration } from '@/lib/plugins/cat-music/youtube'
import { TrackRow } from './track-row'

type Tab = 'songs' | 'albums'

export function ArtistDetailView({
  artistName,
  onBack,
  onSelectTrack,
}: {
  artistName: string
  onBack: () => void
  onSelectTrack: (track: Track) => void
}) {
  const { currentTrack, playerState, playTrack, togglePlayPause } = useCatMusicPlayer()
  const { isFavorite, toggleFavorite, playlists, addTrackToPlaylist } = useLibrary()

  const [channel, setChannel] = useState<YtChannel | null>(null)
  const [tracks, setTracks] = useState<Track[]>([])
  const [albums, setAlbums] = useState<YtPlaylist[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('songs')

  const [selectedAlbum, setSelectedAlbum] = useState<YtPlaylist | null>(null)
  const [albumTracks, setAlbumTracks] = useState<Track[]>([])
  const [albumLoading, setAlbumLoading] = useState(false)

  useEffect(() => {
    if (!artistName) return
    setLoading(true)
    setChannel(null)
    setTracks([])
    setAlbums([])
    setSelectedAlbum(null)

    fetch(`/api/youtube/channel?name=${encodeURIComponent(artistName)}`)
      .then((res) => res.json())
      .then((data) => {
        setChannel(data.channel)
        setTracks(data.tracks || [])
        setAlbums(data.playlists || [])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [artistName])

  const handleSelectAlbum = (album: YtPlaylist) => {
    setSelectedAlbum(album)
    setAlbumLoading(true)
    fetch(`/api/youtube/playlist?id=${encodeURIComponent(album.playlistId)}`)
      .then((res) => res.json())
      .then((data) => {
        setAlbumTracks(data.tracks || [])
      })
      .catch(() => {})
      .finally(() => setAlbumLoading(false))
  }

  if (loading) {
    return (
      <div className="flex h-full w-full flex-col overflow-hidden">
        <div className="shrink-0 pt-4 pb-2 px-4">
          <button
            onClick={onBack}
            aria-label="Volver"
            className="cm-acrylic inline-flex items-center gap-2 rounded-xl px-4 py-2 text-[13px] font-semibold text-white/70 hover:bg-white/[0.12] hover:text-white transition-all"
          >
            <ArrowLeft className="size-4" />
            <span>Volver</span>
          </button>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="flex items-center gap-3">
            <span className="size-5 animate-spin rounded-full border-2 border-emerald-400 border-t-transparent" />
            <span className="text-sm text-white/50">Cargando artista...</span>
          </div>
        </div>
      </div>
    )
  }


  return (
    <div className="flex h-full w-full flex-col overflow-hidden">
      {/* Fixed header: back button + hero + tabs */}
      <div className="shrink-0 space-y-4 px-4 md:px-8 pt-4 pb-2">
        <button
          onClick={onBack}
          aria-label="Volver"
          className="cm-acrylic inline-flex items-center gap-2 rounded-xl px-4 py-2 text-[13px] font-semibold text-white/70 hover:bg-white/[0.12] hover:text-white transition-all"
        >
          <ArrowLeft className="size-4" />
          <span>Volver</span>
        </button>

        {/* Hero */}
        <div className="relative overflow-hidden rounded-2xl">
          {channel?.bannerUrl && (
            <img src={channel.bannerUrl} alt="" className="absolute inset-0 size-full object-cover opacity-25 blur-sm" />
          )}
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10">
            <div className="flex flex-col md:flex-row items-center gap-6">
              <div className="relative size-32 md:size-40 shrink-0 overflow-hidden rounded-full shadow-2xl ring-2 ring-emerald-400/30">
                <img
                  src={channel?.avatarUrl || '/placeholder.svg'}
                  alt={artistName}
                  className="size-full object-cover"
                  onError={(e) => { (e.target as HTMLElement).setAttribute('src', '/placeholder.svg') }}
                />
              </div>
              <div className="flex-1 space-y-2 text-center md:text-left min-w-0">
                <span className="rounded-full bg-emerald-500/20 px-3 py-0.5 text-[11px] font-bold text-emerald-400">Artista</span>
                <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white truncate">{channel?.name || artistName}</h1>
                {channel?.subtitle && <p className="text-sm text-white/40">{channel.subtitle}</p>}
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 pt-1">
                  {tracks.length > 0 && (
                    <button onClick={() => playTrack(tracks[0], tracks)} className="flex items-center gap-2 rounded-2xl bg-emerald-500 px-5 py-2.5 text-[13px] font-extrabold text-white shadow-xl shadow-emerald-500/25 transition-all hover:bg-emerald-400 hover:scale-105 active:scale-95">
                      <Play className="size-4 fill-current" />
                      <span>Reproducir todo</span>
                    </button>
                  )}
                  <button className="flex items-center gap-2 rounded-2xl border border-white/[0.08] bg-white/[0.04] px-4 py-2.5 text-[13px] font-bold text-white/70 transition-all hover:bg-white/[0.08] hover:text-white hover:scale-105 active:scale-95">
                    <Heart className="size-4" />
                    <span>Seguir</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 rounded-2xl bg-white/[0.04] p-1 border border-white/[0.06] w-fit">
          <button onClick={() => setTab('songs')} className={`rounded-xl px-4 py-2 text-[12.5px] font-semibold transition-all ${tab === 'songs' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'text-white/50 hover:text-white'}`}>
            <Music className="size-3.5 inline mr-1.5" />Canciones
          </button>
          <button onClick={() => setTab('albums')} className={`rounded-xl px-4 py-2 text-[12.5px] font-semibold transition-all ${tab === 'albums' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'text-white/50 hover:text-white'}`}>
            <Disc className="size-3.5 inline mr-1.5" />Álbumes
          </button>
        </div>

        {/* Fixed section header */}
        <div className="cm-acrylic flex items-center gap-2 rounded-xl px-4 py-3">
          {tab === 'songs' ? (
            <>
              <Sparkles className="size-4 text-emerald-400" />
              <h3 className="text-base font-bold text-white">Canciones populares</h3>
            </>
          ) : (
            <>
              <Disc className="size-4 text-emerald-400" />
              <h3 className="text-base font-bold text-white">Álbumes</h3>
            </>
          )}
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto thin-scroll pb-8 px-4 md:px-8">
        {selectedAlbum ? (
          <div className="space-y-4 pt-4">
            <button onClick={() => setSelectedAlbum(null)} className="cm-acrylic inline-flex items-center gap-2 rounded-xl px-4 py-2 text-[13px] font-semibold text-white/70 hover:bg-white/[0.12] hover:text-white transition-all mb-2">
              <ArrowLeft className="size-4" />
              <span>Volver al artista</span>
            </button>
            <div className="flex flex-col sm:flex-row items-center gap-6 rounded-3xl cm-acrylic p-6">
              <img src={selectedAlbum.coverUrl} alt={selectedAlbum.title} className="size-40 rounded-2xl object-cover shadow-lg ring-1 ring-white/10 shrink-0" onError={(e) => { (e.target as HTMLElement).setAttribute('src', '/placeholder.svg') }} />
              <div className="space-y-3 text-center sm:text-left min-w-0">
                <span className="rounded-full bg-emerald-500/20 px-3 py-0.5 text-[11px] font-bold text-emerald-400">Álbum</span>
                <h2 className="text-2xl font-extrabold text-white truncate">{selectedAlbum.title}</h2>
                <p className="text-sm text-white/40">{selectedAlbum.artist} · {albumTracks.length} canciones</p>
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  {albumTracks.length > 0 && (
                    <button onClick={() => playTrack(albumTracks[0], albumTracks)} className="flex items-center gap-2 rounded-2xl bg-emerald-500 px-5 py-2.5 text-xs font-extrabold text-white shadow-lg shadow-emerald-500/25 hover:bg-emerald-400 transition-all">
                      <Play className="size-4 fill-current" />Reproducir Álbum
                    </button>
                  )}
                </div>
              </div>
            </div>
            <div className="cm-acrylic flex items-center gap-2 rounded-xl px-4 py-3">
              <ListMusic className="size-4 text-emerald-400" />
              <h3 className="text-base font-bold text-white">Canciones del álbum</h3>
            </div>
            {albumLoading ? (
              <div className="flex items-center justify-center gap-3 py-16">
                <span className="size-5 animate-spin rounded-full border-2 border-emerald-400 border-t-transparent" />
                <span className="text-sm text-white/50">Cargando canciones...</span>
              </div>
            ) : albumTracks.length > 0 ? (
              <div className="cm-acrylic rounded-2xl divide-y divide-white/[0.04]">
                {albumTracks.map((t, idx) => (
                  <TrackRow key={`${t.id}-${idx}`} track={t} index={idx + 1} queue={albumTracks} onSelectArtist={() => {}} onSelectTrack={onSelectTrack} />
                ))}
              </div>
            ) : (
              <div className="cm-acrylic rounded-2xl py-16 text-center">
                <Music className="mx-auto size-10 text-white/20 mb-3" />
                <p className="text-sm text-white/40">No se encontraron canciones en este álbum</p>
              </div>
            )}
          </div>
        ) : (
        <>
        {tab === 'songs' && (
          <div className="space-y-3">
            {tracks.length > 0 ? (
              <div className="cm-acrylic rounded-2xl divide-y divide-white/[0.04]">
                {tracks.map((t, idx) => (
                  <TrackRow key={`${t.id}-${idx}`} track={t} index={idx + 1} queue={tracks} onSelectArtist={() => {}} onSelectTrack={onSelectTrack} />
                ))}
              </div>
            ) : (
              <div className="cm-acrylic rounded-2xl py-16 text-center">
                <Music className="mx-auto size-10 text-white/20 mb-3" />
                <p className="text-sm text-white/40">No se encontraron canciones para este artista</p>
              </div>
            )}
          </div>
        )}

        {tab === 'albums' && (
          <div className="space-y-3">
            {albums.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {albums.map((pl) => (
                  <button key={pl.id} onClick={() => handleSelectAlbum(pl)} className="cm-acrylic group relative flex flex-col gap-3 rounded-2xl p-4 transition-all hover:bg-white/[0.06] hover:border-white/[0.12] cursor-pointer text-left">
                    <div className="relative aspect-square overflow-hidden rounded-xl bg-white/[0.04]">
                      <img src={pl.coverUrl || '/placeholder.svg'} alt={pl.title} className="size-full object-cover transition-transform group-hover:scale-105" onError={(e) => { (e.target as HTMLElement).setAttribute('src', '/placeholder.svg') }} />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="flex size-10 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg"><Play className="size-5 fill-current ml-0.5" /></div>
                      </div>
                    </div>
                    <div><h4 className="font-bold text-white text-sm line-clamp-2">{pl.title}</h4><p className="text-xs text-white/40 mt-0.5">Playlist · {pl.artist}</p></div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="cm-acrylic rounded-2xl py-16 text-center">
                <Disc className="mx-auto size-10 text-white/20 mb-3" />
                <p className="text-sm text-white/40">No se encontraron álbumes para este artista</p>
              </div>
            )}
          </div>
        )}
        </>
        )}
      </div>
    </div>
  )
}
