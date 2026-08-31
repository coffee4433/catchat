'use client'

import React, { useState } from 'react'
import {
  ArrowLeft,
  Heart,
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
import { useLanguage } from '@/lib/i18n'
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
  const { t } = useLanguage()

  const [playlistMenuOpen, setPlaylistMenuOpen] = useState(false)
  const isCurrent = currentTrack?.id === track.id
  const isPlaying = isCurrent && playerState.isPlaying
  const fav = isFavorite(track.id)

  const relatedTracks = SEED_TRACKS.filter(
    (candidate) =>
      candidate.id !== track.id &&
      (candidate.artist === track.artist || candidate.genre === track.genre),
  ).slice(0, 5)

  return (
    <div className="flex h-full w-full flex-col overflow-y-auto thin-scroll text-white">
      {/* Hero Section with Header */}
      <div className="relative px-4 pt-4 md:px-8 md:pt-6 pb-8">
        {/* Gradient glow behind artwork */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-[var(--cm-accent-veil)] rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10">
          {/* Back Button */}
          <button
            onClick={onBack}
            aria-label={t.back}
            className="inline-flex items-center gap-2 rounded-xl bg-white/[0.06] px-4 py-2 text-[13px] font-semibold text-white/70 hover:bg-white/[0.12] hover:text-white transition-all mb-6"
          >
            <ArrowLeft className="size-4" />
            <span>{t.back}</span>
          </button>

          <div className="flex flex-col md:flex-row items-center gap-8">
            {/* Large Artwork. The rotating conic ring lives on a wrapper because
                the artwork itself clips, and the mirrored copy underneath sits
                the cover on a surface instead of floating it in the dark. */}
            <div className="shrink-0">
              <div className="cm-halo-ring cm-glow rounded-3xl">
                <div className="relative size-56 md:size-64 overflow-hidden rounded-3xl shadow-2xl ring-1 ring-white/[0.06]">
                  <img
                    src={track.artworkUrl}
                    alt={track.title}
                    className="size-full object-cover"
                    onError={(e) => { (e.target as HTMLElement).setAttribute('src', '/placeholder.svg') }}
                  />
                  {isPlaying && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/45 backdrop-blur-[2px]">
                      <span className="cm-eq h-10 w-10 gap-1" aria-hidden="true">
                        <i /><i /><i /><i />
                      </span>
                    </div>
                  )}
                </div>
              </div>
              <div className="cm-reflect mt-1 h-16 overflow-hidden rounded-3xl" aria-hidden="true">
                <img
                  src={track.artworkUrl}
                  alt=""
                  className="size-full object-cover object-bottom"
                  onError={(e) => { (e.target as HTMLElement).setAttribute('src', '/placeholder.svg') }}
                />
              </div>
            </div>

            {/* Info */}
            <div className="flex-1 space-y-4 text-center md:text-left">
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                <span className="rounded-full bg-[var(--cm-accent-veil)] px-3 py-0.5 text-[11px] font-bold text-[var(--cm-accent-hi)]">
                  {track.genre || t.song}
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
                className="cm-title-link cm-focus group inline-flex items-center gap-2 rounded-full text-base font-semibold text-white/50"
              >
                <div className="size-8 rounded-full bg-white/[0.06] flex items-center justify-center overflow-hidden">
                  <Radio className="size-4 group-hover:text-[var(--cm-accent-hi)] transition-colors" />
                </div>
                <span className="group-hover:underline">{track.artist}</span>
              </button>

              {track.album && (
                <p className="text-sm text-white/30">
                  {t.albumLabel}: <span className="text-white/60 font-medium">{track.album}</span>
                </p>
              )}

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 pt-2">
                <button
                  onClick={() => (isCurrent ? togglePlayPause() : playTrack(track))}
                  className="cm-btn cm-btn-primary cm-focus px-6 py-3 text-sm"
                >
                  {isPlaying ? <Pause className="size-5 fill-current" /> : <Play className="size-5 fill-current" />}
                  <span>{isPlaying ? t.playerPause : t.playerPlay}</span>
                </button>

                <button
                  onClick={() => toggleFavorite(track)}
                  aria-pressed={fav}
                  className={`cm-btn cm-focus px-5 py-3 text-sm ${
                    fav
                      ? 'border border-rose-500/30 bg-rose-500/10 text-rose-400'
                      : 'cm-btn-ghost'
                  }`}
                >
                  <Heart className={`size-4.5 ${fav ? 'fill-current' : ''}`} />
                  <span>{fav ? t.inFavorites : t.save}</span>
                </button>

                {/* Add to Playlist */}
                <div className="relative">
                  <button
                    onClick={() => setPlaylistMenuOpen((v) => !v)}
                    aria-expanded={playlistMenuOpen}
                    className="cm-btn cm-btn-ghost cm-focus px-5 py-3 text-sm"
                  >
                    <Plus className="size-4.5" />
                    <span>{t.playlist}</span>
                  </button>
                  {playlistMenuOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setPlaylistMenuOpen(false)} />
                      <div className="absolute left-0 bottom-full mb-2 z-50 w-56 rounded-2xl border border-white/[0.08] bg-[#1a1b1e] p-2 shadow-2xl">
                        <div className="px-2.5 py-1.5 text-[10px] font-bold text-white/30 uppercase tracking-wider">
                          {t.addToPlaylist}
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
                          <div className="px-2.5 py-2 text-[11px] text-white/30">{t.noPlaylistsYet}</div>
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
            <Sparkles className="size-4 text-[var(--cm-accent-hi)]" />
            <h3 className="text-base font-bold text-white">
              {t.similarSongsBy} {track.artist}
            </h3>
          </div>
          <div className="cm-acrylic rounded-2xl divide-y divide-white/[0.04]">
            {relatedTracks.map((related, idx) => (
              <TrackRow
                key={related.id}
                track={related}
                index={idx + 1}
                queue={relatedTracks}
                onSelectArtist={onSelectArtist}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
