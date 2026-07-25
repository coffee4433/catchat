'use client'

import React, { useState } from 'react'
import {
  ArrowLeft,
  Download,
  Heart,
  Music,
  Pause,
  Play,
  Plus,
  Radio,
  Share2,
  CheckCircle2,
  ListPlus,
  Sparkles,
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
  const { isFavorite, toggleFavorite, playlists, addTrackToPlaylist, downloads, startDownload } = useLibrary()

  const [playlistMenuOpen, setPlaylistMenuOpen] = useState(false)
  const isCurrent = currentTrack?.id === track.id
  const isPlaying = isCurrent && playerState.isPlaying
  const fav = isFavorite(track.id)

  const downloadJob = downloads.find((d) => d.trackId === track.id)
  const isDownloading = downloadJob && (downloadJob.status === 'queued' || downloadJob.status === 'processing')
  const isDownloaded = downloadJob && downloadJob.status === 'ready'

  const relatedTracks = SEED_TRACKS.filter((t) => t.id !== track.id && (t.artist === track.artist || t.genre === track.genre)).slice(0, 5)

  const handleDownload = () => {
    if (!isDownloaded && !isDownloading) {
      startDownload(track)
    }
  }

  return (
    <div className="flex h-full w-full flex-col overflow-y-auto bg-background/60 p-5 text-foreground space-y-6">
      {/* Top Header Navigation */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          aria-label="Volver"
          className="flex size-9 items-center justify-center rounded-xl bg-secondary/80 text-foreground transition-all hover:bg-secondary hover:scale-105 active:scale-95"
        >
          <ArrowLeft className="size-4" />
        </button>
        <div>
          <h1 className="text-base font-bold text-foreground">Información de la Canción</h1>
          <p className="text-[11px] text-muted-foreground">Detalles del tema, descargas y listas de reproducción</p>
        </div>
      </div>

      {/* Hero Track Card Section */}
      <div className="relative overflow-hidden rounded-3xl border border-border/40 bg-gradient-to-br from-card/80 via-secondary/20 to-background/80 p-6 shadow-2xl backdrop-blur-xl">
        <div className="flex flex-col md:flex-row items-center gap-6">
          {/* Big Artwork with Glow */}
          <div className="relative group size-48 md:size-56 shrink-0 overflow-hidden rounded-2xl bg-secondary shadow-xl ring-1 ring-white/10">
            <img
              src={track.artworkUrl}
              alt={track.title}
              className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
              onError={(e) => {
                ;(e.target as HTMLElement).setAttribute('src', '/placeholder.svg')
              }}
            />
            {isPlaying && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                <span className="flex items-end gap-1 h-6">
                  <span className="w-1 bg-primary animate-pulse h-6" />
                  <span className="w-1 bg-primary animate-pulse h-4 delay-75" />
                  <span className="w-1 bg-primary animate-pulse h-7 delay-150" />
                </span>
              </div>
            )}
          </div>

          {/* Details & Actions */}
          <div className="flex flex-1 flex-col justify-between space-y-4 text-center md:text-left min-w-0">
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                <span className="rounded-full bg-primary/20 px-3 py-0.5 text-[11px] font-bold text-primary">
                  {track.genre || 'Single'}
                </span>
                {track.year && (
                  <span className="rounded-full bg-secondary/80 px-2.5 py-0.5 text-[11px] text-muted-foreground">
                    {track.year}
                  </span>
                )}
              </div>

              <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-foreground truncate">
                {track.title}
              </h2>

              {/* Artist Link */}
              <button
                onClick={() => onSelectArtist(track.artist)}
                className="group/art inline-flex items-center gap-1.5 text-sm md:text-base font-semibold text-muted-foreground hover:text-primary transition-colors"
              >
                <Radio className="size-4 text-primary group-hover/art:animate-pulse" />
                <span className="underline-offset-4 group-hover/art:underline">{track.artist}</span>
              </button>

              {track.album && (
                <p className="text-xs text-muted-foreground/80 truncate">
                  Álbum: <span className="text-foreground/90 font-medium">{track.album}</span>
                </p>
              )}
            </div>

            {/* Duration Badge */}
            <div className="flex items-center justify-center md:justify-start gap-2 text-xs font-mono text-muted-foreground">
              <Music className="size-3.5 text-primary" />
              <span>Duración: {formatDuration(track.durationSeconds)}</span>
            </div>

            {/* Primary Action Buttons */}
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 pt-2">
              {/* Play / Pause */}
              <button
                onClick={() => (isCurrent ? togglePlayPause() : playTrack(track))}
                className="flex items-center gap-2 rounded-2xl bg-primary px-5 py-3 text-xs font-extrabold text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:scale-105 active:scale-95"
              >
                {isPlaying ? <Pause className="size-4 fill-current" /> : <Play className="size-4 fill-current" />}
                <span>{isPlaying ? 'Pausar Canción' : 'Reproducir Canción'}</span>
              </button>

              {/* Favorite Heart */}
              <button
                onClick={() => toggleFavorite(track)}
                className={`flex items-center gap-2 rounded-2xl border px-4 py-3 text-xs font-bold transition-all hover:scale-105 active:scale-95 ${
                  fav
                    ? 'border-rose-500/40 bg-rose-500/10 text-rose-500 shadow-md'
                    : 'border-border/60 bg-secondary/40 text-foreground hover:bg-secondary'
                }`}
              >
                <Heart className={`size-4 ${fav ? 'fill-current' : ''}`} />
                <span>{fav ? 'En Favoritos' : 'Añadir a Favoritos'}</span>
              </button>

              {/* Add to Playlist Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setPlaylistMenuOpen((v) => !v)}
                  className="flex items-center gap-2 rounded-2xl border border-border/60 bg-secondary/40 px-4 py-3 text-xs font-bold text-foreground transition-all hover:bg-secondary hover:scale-105 active:scale-95"
                >
                  <Plus className="size-4" />
                  <span>Añadir a Playlist</span>
                </button>

                {playlistMenuOpen && (
                  <div className="absolute left-0 bottom-full mb-2 z-50 w-52 rounded-2xl border border-border/80 bg-card/95 p-2 shadow-2xl backdrop-blur-xl">
                    <div className="px-2.5 py-1 text-[10.5px] font-bold text-muted-foreground uppercase tracking-wider">
                      Seleccionar Playlist
                    </div>
                    {playlists.length > 0 ? (
                      playlists.map((pl) => (
                        <button
                          key={pl.id}
                          onClick={() => {
                            addTrackToPlaylist(pl.id, track)
                            setPlaylistMenuOpen(false)
                          }}
                          className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left text-xs hover:bg-primary/10 hover:text-primary transition-colors"
                        >
                          <ListPlus className="size-3.5 text-primary" />
                          <span className="truncate">{pl.name}</span>
                        </button>
                      ))
                    ) : (
                      <div className="px-2.5 py-2 text-[11px] text-muted-foreground">No tienes playlists creadas.</div>
                    )}
                  </div>
                )}
              </div>

              {/* Download Audio MP3 Button */}
              <button
                onClick={handleDownload}
                disabled={isDownloading}
                className={`flex items-center gap-2 rounded-2xl border px-4 py-3 text-xs font-bold transition-all hover:scale-105 active:scale-95 ${
                  isDownloaded
                    ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400'
                    : isDownloading
                    ? 'border-primary/40 bg-primary/10 text-primary animate-pulse'
                    : 'border-border/60 bg-secondary/40 text-foreground hover:bg-secondary'
                }`}
              >
                {isDownloaded ? (
                  <>
                    <CheckCircle2 className="size-4 text-emerald-400" />
                    <span>Descargado</span>
                  </>
                ) : isDownloading ? (
                  <>
                    <span className="size-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    <span>Descargando ({downloadJob?.progress || 0}%)</span>
                  </>
                ) : (
                  <>
                    <Download className="size-4" />
                    <span>Descargar MP3</span>
                  </>
                )}
              </button>

              {/* View Channel / Artist Button */}
              <button
                onClick={() => onSelectArtist(track.artist)}
                className="flex items-center gap-2 rounded-2xl border border-primary/40 bg-primary/10 px-4 py-3 text-xs font-bold text-primary transition-all hover:bg-primary/20 hover:scale-105 active:scale-95"
              >
                <Radio className="size-4" />
                <span>Ver Canal del Artista</span>
              </button>
            </div>
          </div>
        </div>

        {/* Download Progress Bar */}
        {isDownloading && (
          <div className="mt-4 space-y-1">
            <div className="flex justify-between text-[11px] font-semibold text-primary">
              <span>Procesando descarga de audio...</span>
              <span>{downloadJob?.progress || 0}%</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full bg-primary transition-all duration-300 rounded-full"
                style={{ width: `${downloadJob?.progress || 0}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Related Tracks Section */}
      {relatedTracks.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-primary" />
            <h3 className="text-sm font-bold text-foreground">Canciones Recomendadas de {track.artist}</h3>
          </div>
          <div className="space-y-1 rounded-2xl border border-border/40 bg-secondary/15 p-3">
            {relatedTracks.map((t, idx) => (
              <TrackRow
                key={t.id}
                track={t}
                index={idx}
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
