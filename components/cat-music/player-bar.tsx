'use client'

import React, { useState } from 'react'
import {
  Heart,
  ListMusic,
  Pause,
  Play,
  Repeat,
  Repeat1,
  Shuffle,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Mic2,
  MonitorSpeaker,
} from 'lucide-react'
import { useCatMusicPlayer } from '@/lib/plugins/cat-music/player-context'
import { useLibrary } from '@/lib/plugins/cat-music/library-context'
import { formatDuration } from '@/lib/plugins/cat-music/youtube'
import { QueuePanel } from './queue-panel'

export function CatMusicPlayerBar() {
  const player = useCatMusicPlayer()
  const library = useLibrary()

  if (!player || !library) return null

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
  } = player

  const { isFavorite, toggleFavorite } = library
  const [showQueue, setShowQueue] = useState(false)
  const [expanded, setExpanded] = useState(false)

  if (!currentTrack) return null

  const fav = isFavorite(currentTrack.id)
  const isPlaying = playerState.isPlaying
  const pos = playerState.position || 0
  const dur = playerState.duration || 180
  const progressPct = Math.min(100, Math.max(0, (pos / dur) * 100))

  return (
    <>
      {showQueue && (
        <div className="fixed right-4 bottom-24 z-50 animate-in fade-in slide-in-from-bottom-5 md:bottom-28">
          <QueuePanel onClose={() => setShowQueue(false)} />
        </div>
      )}

      {expanded && (
        <div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/95 backdrop-blur-2xl md:hidden"
          onClick={() => setExpanded(false)}
        >
          <div className="size-64 overflow-hidden rounded-[28px] shadow-2xl ring-1 ring-white/10">
            <img
              src={currentTrack.artworkUrl}
              alt={currentTrack.title}
              className="size-full object-cover"
              onError={(e) => { (e.target as HTMLElement).setAttribute('src', '/placeholder.svg') }}
            />
          </div>
          <h2 className="mt-6 text-xl font-bold text-white text-center px-6">{currentTrack.title}</h2>
          <p className="mt-1 text-sm text-white/50">{currentTrack.artist}</p>
        </div>
      )}

      {/* Floating glass player bar */}
      <div className="fixed bottom-4 left-[288px] right-4 z-40">
        <div className="cm-glass-strong cm-player-float mx-auto max-w-[1600px] rounded-[24px] overflow-hidden">
          {/* Progress bar on top edge */}
          <div className="relative h-1 bg-white/[0.06]">
            <div
              className="h-full bg-[#1DB954] transition-all duration-300"
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

          <div className="flex h-[68px] items-center gap-2 px-3 md:px-5">
            {/* Left: Track Info */}
            <div
              className="flex items-center gap-3 min-w-0 flex-1 md:w-1/4 cursor-pointer"
              onClick={() => setExpanded(!expanded)}
            >
              <div className="relative size-12 shrink-0 overflow-hidden rounded-xl bg-white/5 shadow-md ring-1 ring-white/10">
                <img
                  src={currentTrack.artworkUrl}
                  alt={currentTrack.title}
                  className="size-full object-cover"
                  onError={(e) => { (e.target as HTMLElement).setAttribute('src', '/placeholder.svg') }}
                />
                {isPlaying && (
                  <div className="absolute inset-0 flex items-end justify-center gap-0.5 pb-1.5 bg-black/20">
                    <span className="w-0.5 bg-[#1DB954] animate-pulse h-2 rounded-full" />
                    <span className="w-0.5 bg-[#1DB954] animate-pulse h-3 delay-75 rounded-full" />
                    <span className="w-0.5 bg-[#1DB954] animate-pulse h-1.5 delay-150 rounded-full" />
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1 hidden sm:block">
                <p className="truncate text-[13px] font-bold text-white">{currentTrack.title}</p>
                <p className="truncate text-[11px] text-white/40">{currentTrack.artist}</p>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); toggleFavorite(currentTrack) }}
                aria-label={fav ? 'Quitar de favoritos' : 'Añadir a favoritos'}
                className={`hidden sm:flex shrink-0 rounded-xl p-1.5 transition-colors ${
                  fav ? 'text-rose-400' : 'text-white/30 hover:text-white/70'
                }`}
              >
                <Heart className={`size-4 ${fav ? 'fill-current' : ''}`} />
              </button>
            </div>

            {/* Center: Playback Controls */}
            <div className="flex flex-col items-center gap-0.5 max-w-[600px] mx-auto flex-shrink md:flex-1">
              <div className="flex items-center gap-1 md:gap-3">
                <button
                  onClick={toggleShuffle}
                  aria-label="Aleatorio"
                  className={`hidden sm:flex rounded-xl p-1.5 transition-colors ${
                    playerState.shuffle ? 'text-[#1DB954]' : 'text-white/30 hover:text-white/60'
                  }`}
                >
                  <Shuffle className="size-[18px]" />
                </button>

                <button
                  onClick={previousTrack}
                  aria-label="Anterior"
                  className="rounded-xl p-1.5 text-white/50 hover:text-white transition-colors"
                >
                  <SkipBack className="size-[20px] fill-current" />
                </button>

                <button
                  onClick={togglePlayPause}
                  aria-label={isPlaying ? 'Pausar' : 'Reproducir'}
                  className="flex size-10 items-center justify-center rounded-full bg-white text-black shadow-lg transition-transform hover:scale-105 active:scale-95"
                >
                  {isPlaying ? (
                    <Pause className="size-[20px] fill-current" />
                  ) : (
                    <Play className="size-[20px] fill-current ml-0.5" />
                  )}
                </button>

                <button
                  onClick={nextTrack}
                  aria-label="Siguiente"
                  className="rounded-xl p-1.5 text-white/50 hover:text-white transition-colors"
                >
                  <SkipForward className="size-[20px] fill-current" />
                </button>

                <button
                  onClick={cycleRepeat}
                  aria-label="Repetir"
                  className={`hidden sm:flex rounded-xl p-1.5 transition-colors ${
                    playerState.repeat !== 'off' ? 'text-[#1DB954]' : 'text-white/30 hover:text-white/60'
                  }`}
                >
                  {playerState.repeat === 'one' ? <Repeat1 className="size-[17px]" /> : <Repeat className="size-[17px]" />}
                </button>
              </div>

              <div className="hidden md:flex w-full items-center gap-2 text-[10px] font-mono text-white/30 max-w-[500px]">
                <span className="w-9 text-right shrink-0">{formatDuration(pos)}</span>
                <div className="group relative flex-1 h-1 cursor-pointer items-center rounded-full bg-white/[0.08]">
                  <div
                    className="absolute inset-y-0 left-0 rounded-full bg-white group-hover:bg-[#1DB954] transition-colors"
                    style={{ width: `${progressPct}%` }}
                  />
                  <div
                    className="absolute top-1/2 -translate-y-1/2 size-3 rounded-full bg-white opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
                    style={{ left: `calc(${progressPct}% - 6px)` }}
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

            {/* Right: Extra controls */}
            <div className="flex items-center justify-end gap-0.5 md:gap-1 flex-1 md:w-1/4">
              <button className="hidden lg:flex rounded-xl p-1.5 text-white/30 hover:text-white/70 transition-colors" aria-label="Letra">
                <Mic2 className="size-[17px]" />
              </button>
              <button className="hidden lg:flex rounded-xl p-1.5 text-white/30 hover:text-white/70 transition-colors" aria-label="Dispositivo">
                <MonitorSpeaker className="size-[17px]" />
              </button>
              <button
                onClick={toggleMute}
                aria-label={playerState.muted ? 'Activar sonido' : 'Silenciar'}
                className="hidden sm:flex rounded-xl p-1.5 text-white/30 hover:text-white/70 transition-colors"
              >
                {playerState.muted || playerState.volume === 0 ? (
                  <VolumeX className="size-[18px] text-rose-400" />
                ) : (
                  <Volume2 className="size-[18px]" />
                )}
              </button>
              <div className="hidden md:block w-20">
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={playerState.muted ? 0 : playerState.volume}
                  onChange={(e) => setVolume(parseInt(e.target.value))}
                  className="h-1 w-full cursor-pointer accent-[#1DB954] rounded-lg"
                />
              </div>

              <button
                onClick={() => setShowQueue((v) => !v)}
                aria-label="Cola de reproducción"
                className={`rounded-xl p-1.5 transition-colors ${
                  showQueue ? 'text-[#1DB954] bg-[#1DB954]/10' : 'text-white/30 hover:text-white/70'
                }`}
              >
                <ListMusic className="size-[18px]" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
