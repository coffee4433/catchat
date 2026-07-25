'use client'

import React, { useState } from 'react'
import { Heart, MoreVertical, Play, Pause, Plus, Info, Radio, Download } from 'lucide-react'
import type { Track } from '@/lib/plugins/cat-music/types'
import { useCatMusicPlayer } from '@/lib/plugins/cat-music/player-context'
import { useLibrary } from '@/lib/plugins/cat-music/library-context'
import { formatDuration } from '@/lib/plugins/cat-music/youtube'

export function TrackRow({
  track,
  index,
  queue,
  onSelectArtist,
  onSelectTrack,
}: {
  track: Track
  index?: number
  queue?: Track[]
  onSelectArtist?: (artistName: string) => void
  onSelectTrack?: (track: Track) => void
}) {
  const { currentTrack, playerState, playTrack, togglePlayPause } = useCatMusicPlayer()
  const { isFavorite, toggleFavorite, playlists, addTrackToPlaylist, startDownload } = useLibrary()
  const [showMenu, setShowMenu] = useState(false)

  const isCurrent = currentTrack?.id === track.id
  const isPlaying = isCurrent && playerState.isPlaying
  const fav = isFavorite(track.id)

  const handlePlayClick = () => {
    if (isCurrent) {
      togglePlayPause()
    } else {
      playTrack(track, queue)
    }
  }

  return (
    <div
      className={`group relative flex items-center justify-between gap-3 rounded-xl px-3 py-2 text-[13px] transition-all ${
        isCurrent
          ? 'bg-primary/10 font-medium text-primary ring-1 ring-primary/20'
          : 'hover:bg-secondary/60 text-foreground'
      }`}
    >
      {/* Index / Play Button */}
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className="relative flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-secondary/80">
          <img
            src={track.artworkUrl}
            alt={track.title}
            className="size-8 rounded-lg object-cover"
            onError={(e) => {
              ;(e.target as HTMLElement).setAttribute('src', '/placeholder.svg')
            }}
          />
          <button
            onClick={handlePlayClick}
            aria-label={isPlaying ? 'Pausar' : 'Reproducir'}
            className={`absolute inset-0 flex items-center justify-center bg-black/50 text-white transition-opacity ${
              isCurrent ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
            }`}
          >
            {isPlaying ? <Pause className="size-4 fill-current" /> : <Play className="size-4 fill-current ml-0.5" />}
          </button>
        </div>

        {/* Info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <button
              onClick={() => onSelectTrack?.(track)}
              className={`text-left truncate font-semibold hover:underline ${isCurrent ? 'text-primary' : 'text-foreground'}`}
            >
              {track.title}
            </button>
            {isPlaying && (
              <span className="flex items-end gap-0.5 h-3 shrink-0">
                <span className="w-0.5 bg-primary animate-pulse h-3" />
                <span className="w-0.5 bg-primary animate-pulse h-2 delay-75" />
                <span className="w-0.5 bg-primary animate-pulse h-3.5 delay-150" />
              </span>
            )}
          </div>
          <button
            onClick={() => onSelectArtist?.(track.artist)}
            className="block text-left truncate text-[11.5px] text-muted-foreground hover:text-primary hover:underline transition-colors"
          >
            {track.artist}
          </button>
        </div>
      </div>

      {/* Album / Genre Badge */}
      {track.genre && (
        <span className="hidden sm:inline-block rounded-full bg-secondary/80 px-2.5 py-0.5 text-[10.5px] text-muted-foreground shrink-0">
          {track.genre}
        </span>
      )}

      {/* Duration */}
      <span className="text-[11.5px] font-mono text-muted-foreground shrink-0">
        {formatDuration(track.durationSeconds)}
      </span>

      {/* Actions */}
      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={() => toggleFavorite(track)}
          aria-label={fav ? 'Quitar de favoritos' : 'Añadir a favoritos'}
          className={`rounded-lg p-1.5 transition-colors ${
            fav ? 'text-rose-500 hover:bg-rose-500/10' : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
          }`}
        >
          <Heart className={`size-4 ${fav ? 'fill-current' : ''}`} />
        </button>

        {/* Options Menu */}
        <div className="relative">
          <button
            onClick={() => setShowMenu((v) => !v)}
            aria-label="Más opciones"
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
          >
            <MoreVertical className="size-4" />
          </button>

          {showMenu && (
            <div
              className="absolute right-0 top-full z-50 mt-1 w-52 rounded-xl border border-border/80 bg-card/95 p-1.5 shadow-xl backdrop-blur-xl space-y-0.5"
              onClick={(e) => e.stopPropagation()}
            >
              {onSelectTrack && (
                <button
                  onClick={() => {
                    onSelectTrack(track)
                    setShowMenu(false)
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[12px] hover:bg-secondary transition-colors"
                >
                  <Info className="size-3.5 text-primary" />
                  <span>Información de la canción</span>
                </button>
              )}

              {onSelectArtist && (
                <button
                  onClick={() => {
                    onSelectArtist(track.artist)
                    setShowMenu(false)
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[12px] hover:bg-secondary transition-colors"
                >
                  <Radio className="size-3.5 text-primary" />
                  <span>Ver canal del artista</span>
                </button>
              )}

              <button
                onClick={() => {
                  startDownload(track)
                  setShowMenu(false)
                }}
                className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[12px] hover:bg-secondary transition-colors"
              >
                <Download className="size-3.5 text-primary" />
                <span>Descargar MP3</span>
              </button>

              <div className="my-1 h-[1px] bg-border/40" />

              <div className="px-2 py-1 text-[10.5px] font-bold text-muted-foreground uppercase tracking-wider">
                Añadir a playlist
              </div>
              {playlists.map((pl) => (
                <button
                  key={pl.id}
                  onClick={() => {
                    addTrackToPlaylist(pl.id, track)
                    setShowMenu(false)
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[12px] hover:bg-secondary transition-colors"
                >
                  <Plus className="size-3.5 text-muted-foreground" />
                  <span className="truncate">{pl.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
