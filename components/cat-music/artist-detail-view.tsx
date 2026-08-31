'use client'

import React, { useState, useEffect } from 'react'
import {
  ArrowLeft,
  Heart,
  Music,
  Play,
  ListMusic,
  Sparkles,
  Disc,
} from 'lucide-react'
import type { Track } from '@/lib/plugins/cat-music/types'
import type { YtPlaylist, YtChannel } from '@/lib/plugins/cat-music/innertube'
import { useCatMusicPlayer } from '@/lib/plugins/cat-music/player-context'
import { useLanguage } from '@/lib/i18n'
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
  const { playTrack } = useCatMusicPlayer()
  const { t } = useLanguage()

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
            aria-label={t.back}
            className="cm-acrylic inline-flex items-center gap-2 rounded-xl px-4 py-2 text-[13px] font-semibold text-white/70 hover:bg-white/[0.12] hover:text-white transition-all"
          >
            <ArrowLeft className="size-4" />
            <span>{t.back}</span>
          </button>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="flex items-center gap-3">
            <span className="size-5 animate-spin rounded-full border-2 border-[var(--cm-accent)] border-t-transparent" />
            <span className="text-sm text-white/50">{t.loadingArtist}</span>
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
          aria-label={t.back}
          className="cm-acrylic inline-flex items-center gap-2 rounded-xl px-4 py-2 text-[13px] font-semibold text-white/70 hover:bg-white/[0.12] hover:text-white transition-all"
        >
          <ArrowLeft className="size-4" />
          <span>{t.back}</span>
        </button>

        {/* Hero */}
        <div className="relative overflow-hidden rounded-2xl">
          {channel?.bannerUrl && (
            <img src={channel.bannerUrl} alt="" className="absolute inset-0 size-full object-cover opacity-25 blur-sm" />
          )}
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-[var(--cm-accent-veil)] rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10">
            <div className="flex flex-col md:flex-row items-center gap-6">
              <div className="relative size-32 md:size-40 shrink-0 overflow-hidden rounded-full shadow-2xl ring-2 ring-[var(--cm-accent-edge)]">
                <img
                  src={channel?.avatarUrl || '/placeholder.svg'}
                  alt={artistName}
                  className="size-full object-cover"
                  onError={(e) => { (e.target as HTMLElement).setAttribute('src', '/placeholder.svg') }}
                />
              </div>
              <div className="flex-1 space-y-2 text-center md:text-left min-w-0">
                <span className="rounded-full bg-[var(--cm-accent-veil)] px-3 py-0.5 text-[11px] font-bold text-[var(--cm-accent-hi)]">{t.artist}</span>
                <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white truncate">{channel?.name || artistName}</h1>
                {channel?.subtitle && <p className="text-sm text-white/40">{channel.subtitle}</p>}
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 pt-1">
                  {tracks.length > 0 && (
                    <button onClick={() => playTrack(tracks[0], tracks)} className="flex items-center gap-2 rounded-2xl bg-[var(--cm-accent)] px-5 py-2.5 text-[13px] font-extrabold text-white shadow-xl shadow-[var(--cm-halo)] transition-all hover:bg-[var(--cm-accent-hi)] hover:scale-105 active:scale-95">
                      <Play className="size-4 fill-current" />
                      <span>{t.playAll}</span>
                    </button>
                  )}
                  <button className="flex items-center gap-2 rounded-2xl border border-white/[0.08] bg-white/[0.04] px-4 py-2.5 text-[13px] font-bold text-white/70 transition-all hover:bg-white/[0.08] hover:text-white hover:scale-105 active:scale-95">
                    <Heart className="size-4" />
                    <span>{t.followChannel}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 rounded-2xl bg-white/[0.04] p-1 border border-white/[0.06] w-fit">
          <button onClick={() => setTab('songs')} className={`rounded-xl px-4 py-2 text-[12.5px] font-semibold transition-all ${tab === 'songs' ? 'bg-[var(--cm-accent-hi)] text-[#08090b] shadow-lg shadow-[var(--cm-halo)]' : 'text-white/50 hover:text-white'}`}>
            <Music className="size-3.5 inline mr-1.5" />{t.songs}
          </button>
          <button onClick={() => setTab('albums')} className={`rounded-xl px-4 py-2 text-[12.5px] font-semibold transition-all ${tab === 'albums' ? 'bg-[var(--cm-accent-hi)] text-[#08090b] shadow-lg shadow-[var(--cm-halo)]' : 'text-white/50 hover:text-white'}`}>
            <Disc className="size-3.5 inline mr-1.5" />{t.albums}
          </button>
        </div>

        {/* Fixed section header */}
        <div className="cm-acrylic flex items-center gap-2 rounded-xl px-4 py-3">
          {tab === 'songs' ? (
            <>
              <Sparkles className="size-4 text-[var(--cm-accent-hi)]" />
              <h3 className="text-base font-bold text-white">{t.popularSongs}</h3>
            </>
          ) : (
            <>
              <Disc className="size-4 text-[var(--cm-accent-hi)]" />
              <h3 className="text-base font-bold text-white">{t.albums}</h3>
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
              <span>{t.backToArtist}</span>
            </button>
            <div className="flex flex-col sm:flex-row items-center gap-6 rounded-3xl cm-acrylic p-6">
              <img src={selectedAlbum.coverUrl} alt={selectedAlbum.title} className="size-40 rounded-2xl object-cover shadow-lg ring-1 ring-white/10 shrink-0" onError={(e) => { (e.target as HTMLElement).setAttribute('src', '/placeholder.svg') }} />
              <div className="space-y-3 text-center sm:text-left min-w-0">
                <span className="rounded-full bg-[var(--cm-accent-veil)] px-3 py-0.5 text-[11px] font-bold text-[var(--cm-accent-hi)]">{t.albumLabel}</span>
                <h2 className="text-2xl font-extrabold text-white truncate">{selectedAlbum.title}</h2>
                <p className="text-sm text-white/40">{selectedAlbum.artist} · {albumTracks.length} {t.playlistsCount}</p>
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  {albumTracks.length > 0 && (
                    <button onClick={() => playTrack(albumTracks[0], albumTracks)} className="flex items-center gap-2 rounded-2xl bg-[var(--cm-accent)] px-5 py-2.5 text-xs font-extrabold text-white shadow-lg shadow-[var(--cm-halo)] hover:bg-[var(--cm-accent-hi)] transition-all">
                      <Play className="size-4 fill-current" />{t.playAlbum}
                    </button>
                  )}
                </div>
              </div>
            </div>
            <div className="cm-acrylic flex items-center gap-2 rounded-xl px-4 py-3">
              <ListMusic className="size-4 text-[var(--cm-accent-hi)]" />
              <h3 className="text-base font-bold text-white">{t.albumSongs}</h3>
            </div>
            {albumLoading ? (
              <div className="flex items-center justify-center gap-3 py-16">
                <span className="size-5 animate-spin rounded-full border-2 border-[var(--cm-accent)] border-t-transparent" />
                <span className="text-sm text-white/50">{t.loadingSongs}</span>
              </div>
            ) : albumTracks.length > 0 ? (
              <div className="cm-acrylic rounded-2xl divide-y divide-white/[0.04]">
                {albumTracks.map((item, idx) => (
                  <TrackRow key={`${item.id}-${idx}`} track={item} index={idx + 1} queue={albumTracks} onSelectTrack={onSelectTrack} />
                ))}
              </div>
            ) : (
              <div className="cm-acrylic rounded-2xl py-16 text-center">
                <Music className="mx-auto size-10 text-white/20 mb-3" />
                <p className="text-sm text-white/40">{t.noSongsInAlbum}</p>
              </div>
            )}
          </div>
        ) : (
        <>
        {tab === 'songs' && (
          <div className="space-y-3">
            {tracks.length > 0 ? (
              <div className="cm-acrylic rounded-2xl divide-y divide-white/[0.04]">
                {tracks.map((item, idx) => (
                  <TrackRow key={`${item.id}-${idx}`} track={item} index={idx + 1} queue={tracks} onSelectTrack={onSelectTrack} />
                ))}
              </div>
            ) : (
              <div className="cm-acrylic rounded-2xl py-16 text-center">
                <Music className="mx-auto size-10 text-white/20 mb-3" />
                <p className="text-sm text-white/40">{t.noSongsFound}</p>
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
                        <div className="flex size-10 items-center justify-center rounded-full bg-[var(--cm-accent-hi)] text-[#08090b] shadow-lg"><Play className="size-5 fill-current ml-0.5" /></div>
                      </div>
                    </div>
                    <div><h4 className="font-bold text-white text-sm line-clamp-2">{pl.title}</h4><p className="text-xs text-white/40 mt-0.5">{t.playlist} · {pl.artist}</p></div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="cm-acrylic rounded-2xl py-16 text-center">
                <Disc className="mx-auto size-10 text-white/20 mb-3" />
                <p className="text-sm text-white/40">{t.noAlbumsFound}</p>
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
