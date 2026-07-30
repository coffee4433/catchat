'use client'

import React, { useState } from 'react'
import { Heart, Pause, Play, SkipBack, SkipForward, Music, X } from 'lucide-react'
import { useCatMusicPlayer } from '@/lib/plugins/cat-music/player-context'
import { useLibrary } from '@/lib/plugins/cat-music/library-context'

export function CatMusicDockWidget({ onOpenCatMusic }: { onOpenCatMusic?: () => void }) {
  const player = useCatMusicPlayer()
  const library = useLibrary()

  if (!player || !library || !player.currentTrack) return null

  const { currentTrack, playerState, togglePlayPause, nextTrack, previousTrack, stopPlayback } = player
  const { isFavorite, toggleFavorite } = library

  const isPlaying = playerState.isPlaying
  const fav = isFavorite(currentTrack.id)
  const pos = playerState.position || 0
  const dur = playerState.duration || 180
  const progressPct = Math.min(100, Math.max(0, (pos / dur) * 100))
  const [closing, setClosing] = useState(false)

  const handleStop = () => {
    setClosing(true)
    setTimeout(() => {
      stopPlayback()
    }, 300)
  }

  return (
    <div className={`w-full border-b border-white/[0.06] px-3 py-2 select-none transition-all duration-300 ${closing ? 'opacity-0 max-h-0 py-0 border-b-0 overflow-hidden' : 'opacity-100'}`}>
      <div className="flex items-center justify-between gap-2 min-w-0">
        {/* Track Artwork */}
        <div
          onClick={onOpenCatMusic}
          className="relative group cursor-pointer size-9 shrink-0 overflow-hidden rounded-lg bg-white/[0.04] shadow-sm"
          title="Abrir CatMusic"
        >
          <img
            src={currentTrack.artworkUrl}
            alt={currentTrack.title}
            className="size-full object-cover"
            onError={(e) => { (e.target as HTMLElement).setAttribute('src', '/placeholder.svg') }}
          />
          {isPlaying && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40">
              <span className="flex items-end gap-0.5 h-3">
                <span className="w-0.5 bg-emerald-400 animate-pulse h-3 rounded-full" />
                <span className="w-0.5 bg-emerald-400 animate-pulse h-2 delay-75 rounded-full" />
                <span className="w-0.5 bg-emerald-400 animate-pulse h-3.5 delay-150 rounded-full" />
              </span>
            </div>
          )}
        </div>

        {/* Track Meta */}
        <div onClick={onOpenCatMusic} className="min-w-0 max-w-32 flex-1 cursor-pointer">
          <div className="flex items-center gap-1">
            <Music className="size-3 text-emerald-400 shrink-0" />
            <p className="truncate text-[11.5px] font-bold text-white leading-tight">{currentTrack.title}</p>
          </div>
          <p className="truncate text-[10px] text-white/40 leading-tight mt-0.5">{currentTrack.artist}</p>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-0.5 shrink-0">
          <button
            onClick={() => toggleFavorite(currentTrack)}
            aria-label={fav ? 'Quitar de favoritos' : 'Añadir a favoritos'}
            className={`rounded-md p-1 transition-colors ${
              fav ? 'text-rose-400' : 'text-white/30 hover:text-white/70'
            }`}
          >
            <Heart className={`size-3.5 ${fav ? 'fill-current' : ''}`} />
          </button>

          <button
            onClick={previousTrack}
            aria-label="Anterior"
            className="rounded-md p-1 text-white/40 hover:text-white transition-colors"
          >
            <SkipBack className="size-3.5 fill-current" />
          </button>

          <button
            onClick={togglePlayPause}
            aria-label={isPlaying ? 'Pausar' : 'Reproducir'}
            className="flex size-7 items-center justify-center rounded-full bg-emerald-500 text-black shadow-sm transition-transform hover:scale-105 active:scale-95"
          >
            {isPlaying ? <Pause className="size-3.5 fill-current" /> : <Play className="size-3.5 fill-current ml-0.5" />}
          </button>

          <button
            onClick={nextTrack}
            aria-label="Siguiente"
            className="rounded-md p-1 text-white/40 hover:text-white transition-colors"
          >
            <SkipForward className="size-3.5 fill-current" />
          </button>

          <button
            onClick={handleStop}
            aria-label="Detener"
            className="rounded-md p-1 text-white/25 hover:text-red-400 transition-colors ml-1"
          >
            <X className="size-3" />
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mt-1 h-0.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
        <div className="h-full rounded-full bg-emerald-500 transition-all duration-300" style={{ width: `${progressPct}%` }} />
      </div>
    </div>
  )
}
