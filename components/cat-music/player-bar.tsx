'use client'

import React, { useState } from 'react'
import {
  Heart,
  ListMusic,
  Maximize2,
  Pause,
  Play,
  Repeat,
  Repeat1,
  Shuffle,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
} from 'lucide-react'
import { useCatMusicPlayer } from '@/lib/plugins/cat-music/player-context'
import { useLibrary } from '@/lib/plugins/cat-music/library-context'
import { formatDuration } from '@/lib/plugins/cat-music/youtube'
import { QueuePanel } from './queue-panel'

export function CatMusicPlayerBar() {
  const {
    currentTrack,
    playerState,
    togglePlayPause,
    nextTrack,
    previousTrack,
    seekTo,
    setVolume,
    toggleMute,
    toggleShuffle,
    cycleRepeat,
  } = useCatMusicPlayer()

  const { isFavorite, toggleFavorite } = useLibrary()
  const [showQueue, setShowQueue] = useState(false)

  if (!currentTrack) return null

  const fav = isFavorite(currentTrack.id)
  const isPlaying = playerState.isPlaying
  const pos = playerState.position || 0
  const dur = playerState.duration || 180
  const progressPct = Math.min(100, Math.max(0, (pos / dur) * 100))

  return (
    <>
      {/* Slide-out Queue Panel */}
      {showQueue && (
        <div className="fixed right-4 bottom-24 z-50 animate-in fade-in slide-in-from-bottom-5">
          <QueuePanel onClose={() => setShowQueue(false)} />
        </div>
      )}

      {/* Main Glassmorphic Player Bar */}
      <div className="fixed bottom-3 left-1/2 -translate-x-1/2 z-40 w-[95%] max-w-5xl rounded-3xl border border-primary/20 bg-card/90 p-3 shadow-2xl backdrop-blur-2xl transition-all">
        <div className="flex items-center justify-between gap-4">
          {/* Left: Track Info */}
          <div className="flex items-center gap-3 min-w-0 w-1/4">
            <div className="relative size-12 shrink-0 overflow-hidden rounded-xl bg-secondary shadow-md">
              <img
                src={currentTrack.artworkUrl}
                alt={currentTrack.title}
                className="size-full object-cover"
                onError={(e) => {
                  ;(e.target as HTMLElement).setAttribute('src', '/placeholder.svg')
                }}
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-bold text-foreground">{currentTrack.title}</p>
              <p className="truncate text-[11.5px] text-muted-foreground">{currentTrack.artist}</p>
            </div>
            <button
              onClick={() => toggleFavorite(currentTrack)}
              aria-label={fav ? 'Quitar de favoritos' : 'Añadir a favoritos'}
              className={`shrink-0 rounded-lg p-1.5 transition-colors ${
                fav ? 'text-rose-500 hover:bg-rose-500/10' : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
              }`}
            >
              <Heart className={`size-4 ${fav ? 'fill-current' : ''}`} />
            </button>
          </div>

          {/* Center: Playback Controls & Progress */}
          <div className="flex flex-col items-center gap-1.5 flex-1 max-w-md">
            <div className="flex items-center gap-4">
              <button
                onClick={toggleShuffle}
                aria-label="Aleatorio"
                className={`rounded-lg p-1.5 transition-colors ${
                  playerState.shuffle ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Shuffle className="size-4" />
              </button>

              <button
                onClick={previousTrack}
                aria-label="Anterior"
                className="rounded-lg p-1.5 text-muted-foreground hover:text-foreground transition-colors"
              >
                <SkipBack className="size-4 fill-current" />
              </button>

              <button
                onClick={togglePlayPause}
                aria-label={isPlaying ? 'Pausar' : 'Reproducir'}
                className="flex size-9 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105 active:scale-95"
              >
                {isPlaying ? <Pause className="size-4 fill-current" /> : <Play className="size-4 fill-current ml-0.5" />}
              </button>

              <button
                onClick={nextTrack}
                aria-label="Siguiente"
                className="rounded-lg p-1.5 text-muted-foreground hover:text-foreground transition-colors"
              >
                <SkipForward className="size-4 fill-current" />
              </button>

              <button
                onClick={cycleRepeat}
                aria-label="Repetir"
                className={`rounded-lg p-1.5 transition-colors ${
                  playerState.repeat !== 'off' ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {playerState.repeat === 'one' ? <Repeat1 className="size-4" /> : <Repeat className="size-4" />}
              </button>
            </div>

            {/* Slider Bar */}
            <div className="flex w-full items-center gap-2 text-[11px] font-mono text-muted-foreground">
              <span className="w-9 text-right shrink-0">{formatDuration(pos)}</span>
              <div className="group relative flex-1 h-1.5 cursor-pointer items-center rounded-full bg-secondary">
                <div
                  className="h-full rounded-full bg-primary transition-all group-hover:bg-primary/90"
                  style={{ width: `${progressPct}%` }}
                />
                <input
                  type="range"
                  min={0}
                  max={dur || 100}
                  value={pos}
                  onChange={(e) => seekTo(parseFloat(e.target.value))}
                  className="absolute inset-0 size-full opacity-0 cursor-pointer"
                />
              </div>
              <span className="w-9 shrink-0">{formatDuration(dur)}</span>
            </div>
          </div>

          {/* Right: Volume & Queue Toggle */}
          <div className="flex items-center justify-end gap-3 w-1/4">
            <div className="flex items-center gap-1.5">
              <button
                onClick={toggleMute}
                aria-label={playerState.muted ? 'Activar sonido' : 'Silenciar'}
                className="rounded-lg p-1 text-muted-foreground hover:text-foreground"
              >
                {playerState.muted || playerState.volume === 0 ? (
                  <VolumeX className="size-4 text-rose-500" />
                ) : (
                  <Volume2 className="size-4" />
                )}
              </button>
              <input
                type="range"
                min={0}
                max={100}
                value={playerState.muted ? 0 : playerState.volume}
                onChange={(e) => setVolume(parseInt(e.target.value))}
                className="h-1 w-20 cursor-pointer accent-primary bg-secondary rounded-lg"
              />
            </div>

            <button
              onClick={() => setShowQueue((v) => !v)}
              aria-label="Ver cola de reproducción"
              className={`rounded-xl p-2 transition-colors ${
                showQueue ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
              }`}
            >
              <ListMusic className="size-4" />
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
