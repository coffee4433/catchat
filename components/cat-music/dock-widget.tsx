'use client'

import React from 'react'
import { Heart, Pause, Play, SkipBack, SkipForward, Music } from 'lucide-react'
import { useCatMusicPlayer } from '@/lib/plugins/cat-music/player-context'
import { useLibrary } from '@/lib/plugins/cat-music/library-context'

export function CatMusicDockWidget({ onOpenCatMusic }: { onOpenCatMusic?: () => void }) {
  const { currentTrack, playerState, togglePlayPause, nextTrack, previousTrack } = useCatMusicPlayer()
  const { isFavorite, toggleFavorite } = useLibrary()

  if (!currentTrack) return null

  const isPlaying = playerState.isPlaying
  const fav = isFavorite(currentTrack.id)
  const pos = playerState.position || 0
  const dur = playerState.duration || 180
  const progressPct = Math.min(100, Math.max(0, (pos / dur) * 100))

  return (
    <div className="border-b border-border/40 bg-secondary/30 px-2.5 py-2">
      <div className="flex items-center gap-2">
        {/* Track Artwork + Animated Pulsing Indicator */}
        <div
          onClick={onOpenCatMusic}
          className="relative group cursor-pointer size-9 shrink-0 overflow-hidden rounded-xl bg-secondary shadow-sm"
          title="Abrir CatMusic"
        >
          <img
            src={currentTrack.artworkUrl}
            alt={currentTrack.title}
            className={`size-full object-cover transition-transform ${isPlaying ? 'scale-105' : ''}`}
            onError={(e) => {
              ;(e.target as HTMLElement).setAttribute('src', '/placeholder.svg')
            }}
          />
          {isPlaying && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40">
              <span className="flex items-end gap-0.5 h-3">
                <span className="w-0.5 bg-primary animate-pulse h-3" />
                <span className="w-0.5 bg-primary animate-pulse h-2 delay-75" />
                <span className="w-0.5 bg-primary animate-pulse h-3.5 delay-150" />
              </span>
            </div>
          )}
        </div>

        {/* Track Meta */}
        <div onClick={onOpenCatMusic} className="min-w-0 flex-1 cursor-pointer">
          <div className="flex items-center gap-1.5">
            <Music className="size-3 text-primary shrink-0" />
            <p className="truncate text-[12px] font-bold text-foreground leading-tight">{currentTrack.title}</p>
          </div>
          <p className="truncate text-[10.5px] text-muted-foreground leading-tight mt-0.5">{currentTrack.artist}</p>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-0.5 shrink-0">
          <button
            onClick={() => toggleFavorite(currentTrack)}
            aria-label={fav ? 'Quitar de favoritos' : 'Añadir a favoritos'}
            className={`rounded-lg p-1 transition-colors ${
              fav ? 'text-rose-500 hover:bg-rose-500/10' : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
            }`}
          >
            <Heart className={`size-3.5 ${fav ? 'fill-current' : ''}`} />
          </button>

          <button
            onClick={previousTrack}
            aria-label="Anterior"
            className="rounded-lg p-1 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
          >
            <SkipBack className="size-3.5 fill-current" />
          </button>

          <button
            onClick={togglePlayPause}
            aria-label={isPlaying ? 'Pausar' : 'Reproducir'}
            className="flex size-7 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md transition-transform hover:scale-105 active:scale-95"
          >
            {isPlaying ? <Pause className="size-3.5 fill-current" /> : <Play className="size-3.5 fill-current ml-0.5" />}
          </button>

          <button
            onClick={nextTrack}
            aria-label="Siguiente"
            className="rounded-lg p-1 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
          >
            <SkipForward className="size-3.5 fill-current" />
          </button>
        </div>
      </div>

      {/* Progress Bar Line */}
      <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-secondary/80">
        <div className="h-full rounded-full bg-primary transition-all duration-300" style={{ width: `${progressPct}%` }} />
      </div>
    </div>
  )
}
