'use client'

import React, { useState } from 'react'
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
} from 'lucide-react'
import type { Track } from '@/lib/plugins/cat-music/types'
import { useCatMusicPlayer } from '@/lib/plugins/cat-music/player-context'
import { useLibrary } from '@/lib/plugins/cat-music/library-context'
import { formatDuration } from '@/lib/plugins/cat-music/youtube'
import { SEED_TRACKS } from '@/lib/plugins/cat-music/catalog'
import { TrackRow } from './track-row'

export function TrackDetailView({
  track,
  onBack,
  onSelectArtist,
}: {
  track: Track
  onBack: () => void
  onSelectArtist: (artistName: string) => void
}) {
  const { currentTrack, playerState, playTrack, togglePlayPause } = useCatMusicPlayer()
  const { isFavorite, toggleFavorite, playlists, addTrackToPlaylist } = useLibrary()

  const [playlistMenuOpen, setPlaylistMenuOpen] = useState(false)
  const isCurrent = currentTrack?.id === track.id
  const isPlaying = isCurrent && playerState.isPlaying
  const fav = isFavorite(track.id)

  const relatedTracks = SEED_TRACKS.filter((t) => t.id !== track.id && (t.artist === track.artist || t.genre === track.genre)).slice(0, 5)

  return (
    <div className="flex h-full w-full flex-col overflow-y-auto thin-scroll text-white">
      {/* Hero Section with Header */}
      <div className="relative px-4 pt-4 md:px-8 md:pt-6 pb-8">
        {/* Gradient glow behind artwork */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10">
          {/* Back Button */}
          <button
            onClick={onBack}
            aria-label="Volver"
            className="inline-flex items-center gap-2 rounded-xl bg-white/[0.06] px-4 py-2 text-[13px] font-semibold text-white/70 hover:bg-white/[0.12] hover:text-white transition-all mb-6"
          >
            <ArrowLeft className="size-4" />
            <span>Volver</span>
          </button>

          <div className="flex flex-col md:flex-row items-center gap-8">
            {/* Large Artwork */}
            <div className="relative size-56 md:size-64 shrink-0 overflow-hidden rounded-3xl shadow-2xl ring-1 ring-white/[0.06]">
              <img
                src={track.artworkUrl}
                alt={track.title}
                className="size-full object-cover"
                onError={(e) => { (e.target as HTMLElement).setAttribute('src', '/placeholder.svg') }}
              />
              {isPlaying && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                  <span className="flex items-end gap-1 h-8">
                    <span className="w-1.5 bg-emerald-400 animate-pulse h-8 rounded-full" />
                    <span className="w-1.5 bg-emerald-400 animate-pulse h-5 delay-75 rounded-full" />
                    <span className="w-1.5 bg-emerald-400 animate-pulse h-9 delay-150 rounded-full" />
                  </span>
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 space-y-4 text-center md:text-left">
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                <span className="rounded-full bg-emerald-500/20 px-3 py-0.5 text-[11px] font-bold text-emerald-400">
                  {track.genre || 'Canción'}
                </span>
                {track.year && (
                  <span className="rounded-full bg-white/[0.06] px-3 py-0.5 text-[11px] text-white/40">
                    {track.year}
                  </span>
                )}
                <span className="rounded-full bg-white/[0.06] px-3 py-0.5 text-[11px] text-white/40 flex items-center gap-1">
                  <Clock className="size-3" />
                  {formatDuration(track.durationSeconds)}
                </span>
              </div>

              <h1 className="text-3xl md:text-4xl font-black tracking-tight text-white">{track.title}</h1>

              <button
                onClick={() => onSelectArtist(track.artist)}
                className="inline-flex items-center gap-2 text-base font-semibold text-white/50 hover:text-emerald-400 transition-colors group"
              >
                <div className="size-8 rounded-full bg-white/[0.06] flex items-center justify-center overflow-hidden">
                  <Radio className="size-4 group-hover:text-emerald-400 transition-colors" />
                </div>
                <span className="group-hover:underline">{track.artist}</span>
              </button>

              {track.album && (
                <p className="text-sm text-white/30">
                  Álbum: <span className="text-white/60 font-medium">{track.album}</span>
                </p>
              )}

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 pt-2">
                <button
                  onClick={() => (isCurrent ? togglePlayPause() : playTrack(track))}
                  className="flex items-center gap-2 rounded-2xl bg-emerald-500 px-6 py-3 text-sm font-extrabold text-white shadow-xl shadow-emerald-500/25 transition-all hover:bg-emerald-400 hover:scale-105 active:scale-95"
                >
                  {isPlaying ? <Pause className="size-5 fill-current" /> : <Play className="size-5 fill-current" />}
                  <span>{isPlaying ? 'Pausar' : 'Reproducir'}</span>
                </button>

                <button
                  onClick={() => toggleFavorite(track)}
                  className={`flex items-center gap-2 rounded-2xl border px-5 py-3 text-sm font-bold transition-all hover:scale-105 active:scale-95 ${
                    fav
                      ? 'border-rose-500/30 bg-rose-500/10 text-rose-400'
                      : 'border-white/[0.08] bg-white/[0.04] text-white/70 hover:bg-white/[0.08] hover:text-white'
                  }`}
                >
                  <Heart className={`size-4.5 ${fav ? 'fill-current' : ''}`} />
                  <span>{fav ? 'En Favoritos' : 'Guardar'}</span>
                </button>

                {/* Add to Playlist */}
                <div className="relative">
                  <button
                    onClick={() => setPlaylistMenuOpen((v) => !v)}
                    className="flex items-center gap-2 rounded-2xl border border-white/[0.08] bg-white/[0.04] px-5 py-3 text-sm font-bold text-white/70 transition-all hover:bg-white/[0.08] hover:text-white hover:scale-105 active:scale-95"
                  >
                    <Plus className="size-4.5" />
                    <span>Playlist</span>
                  </button>
                  {playlistMenuOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setPlaylistMenuOpen(false)} />
                      <div className="absolute left-0 bottom-full mb-2 z-50 w-56 rounded-2xl border border-white/[0.08] bg-[#1a1b1e] p-2 shadow-2xl">
                        <div className="px-2.5 py-1.5 text-[10px] font-bold text-white/30 uppercase tracking-wider">
                          Añadir a playlist
                        </div>
                        {playlists.length > 0 ? (
                          playlists.map((pl) => (
                            <button key={pl.id}
                              onClick={() => { addTrackToPlaylist(pl.id, track); setPlaylistMenuOpen(false) }}
                              className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-[12px] text-white/70 hover:bg-white/[0.08] hover:text-white transition-colors">
                              <ListMusic className="size-3.5" />
                              <span className="truncate">{pl.name}</span>
                            </button>
                          ))
                        ) : (
                          <div className="px-2.5 py-2 text-[11px] text-white/30">No tienes playlists</div>
                        )}
                      </div>
                    </>
                  )}
                </div>

              </div>

            </div>
          </div>
        </div>
      </div>

      {/* Related Tracks */}
      {relatedTracks.length > 0 && (
        <div className="px-4 md:px-8 pb-8 space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-emerald-400" />
            <h3 className="text-base font-bold text-white">Canciones similares de {track.artist}</h3>
          </div>
          <div className="cm-acrylic rounded-2xl divide-y divide-white/[0.04]">
            {relatedTracks.map((t, idx) => (
              <TrackRow
                key={t.id}
                track={t}
                index={idx + 1}
                queue={relatedTracks}
                onSelectArtist={onSelectArtist}
                onSelectTrack={(tr) => {}}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
