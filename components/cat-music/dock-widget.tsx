'use client'

import React, { useState } from 'react'
import { Heart, Pause, Play, SkipBack, SkipForward, Music, X } from 'lucide-react'
import { useCatMusicPlayer } from '@/lib/plugins/cat-music/player-context'
import { useLibrary } from '@/lib/plugins/cat-music/library-context'
import { useAccentScopeStyle } from '@/lib/plugins/cat-music/accent-store'
import { useLanguage } from '@/lib/i18n'

export function CatMusicDockWidget({ onOpenCatMusic }: { onOpenCatMusic?: () => void }) {
  const player = useCatMusicPlayer()
  const library = useLibrary()
  const { t } = useLanguage()
  // Hooks must run before any early return, so this stays above the guards below.
  const [closing, setClosing] = useState(false)
  // The widget lives in the user dock, far from the plugin shell, so it opens
  // its own accent scope rather than inheriting one.
  const accentScope = useAccentScopeStyle()

  if (!player || !library || !player.currentTrack) return null

  const { currentTrack, playerState, togglePlayPause, nextTrack, previousTrack, stopPlayback } = player
  const { isFavorite, toggleFavorite } = library

  const isPlaying = playerState.isPlaying
  const fav = isFavorite(currentTrack.id)
  const pos = playerState.position || 0
  const dur = playerState.duration || 180
  const progressPct = Math.min(100, Math.max(0, (pos / dur) * 100))

  const handleStop = () => {
    setClosing(true)
    setTimeout(() => {
      stopPlayback()
    }, 300)
  }

  return (
    // The accent scope sits on an inner element on purpose: `.cm-scope` carries
    // the `transition` that crossfades the hue, which would replace the
    // collapse transition if both landed on the same node.
    <div
      className={`w-full border-b border-white/[0.06] px-3 py-2 select-none transition-all duration-300 ${closing ? 'opacity-0 max-h-0 py-0 border-b-0 overflow-hidden' : 'opacity-100'}`}
    >
      <div className="cm-scope" style={accentScope}>
        <div className="flex items-center justify-between gap-2 min-w-0">
          {/* Track Artwork */}
          <div
            onClick={onOpenCatMusic}
            className="relative group cursor-pointer size-9 shrink-0 overflow-hidden rounded-lg bg-white/[0.04] shadow-sm"
            title={t.openCatMusic}
          >
            <img
              src={currentTrack.artworkUrl}
              alt={currentTrack.title}
              className="size-full object-cover"
              onError={(e) => { (e.target as HTMLElement).setAttribute('src', '/placeholder.svg') }}
            />
            {isPlaying && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                <span className="cm-eq h-3 text-[var(--cm-accent-hi)]" aria-hidden="true">
                  <i /><i /><i /><i />
                </span>
              </div>
            )}
          </div>

          {/* Track Meta */}
          <div onClick={onOpenCatMusic} className="min-w-0 max-w-32 flex-1 cursor-pointer">
            <div className="flex items-center gap-1">
              <Music className="size-3 text-[var(--cm-accent-hi)] shrink-0" />
              <p className="truncate text-[11.5px] font-bold text-white leading-tight">{currentTrack.title}</p>
            </div>
            <p className="truncate text-[10px] text-white/40 leading-tight mt-0.5">{currentTrack.artist}</p>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-0.5 shrink-0">
            <button
              onClick={() => toggleFavorite(currentTrack)}
              aria-label={fav ? t.removeFavorite : t.addFavorite}
              aria-pressed={fav}
              className={`cm-focus rounded-md p-1 transition-colors ${
                fav ? 'text-rose-400' : 'text-white/30 hover:text-white/70'
              }`}
            >
              <Heart className={`size-3.5 ${fav ? 'fill-current' : ''}`} />
            </button>

            <button
              onClick={previousTrack}
              aria-label={t.playerPrevious}
              className="cm-focus rounded-md p-1 text-white/40 hover:text-white transition-colors"
            >
              <SkipBack className="size-3.5 fill-current" />
            </button>

            <button
              onClick={togglePlayPause}
              aria-label={isPlaying ? t.playerPause : t.playerPlay}
              className="cm-btn cm-btn-primary cm-focus size-7"
            >
              {isPlaying ? <Pause className="size-3.5 fill-current" /> : <Play className="size-3.5 fill-current ml-0.5" />}
            </button>

            <button
              onClick={nextTrack}
              aria-label={t.playerNext}
              className="cm-focus rounded-md p-1 text-white/40 hover:text-white transition-colors"
            >
              <SkipForward className="size-3.5 fill-current" />
            </button>

            <button
              onClick={handleStop}
              aria-label={t.playerStop}
              className="cm-focus rounded-md p-1 text-white/25 hover:text-red-400 transition-colors ml-1"
            >
              <X className="size-3" />
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-1 h-0.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[var(--cm-accent)] to-[var(--cm-accent-hi)] transition-[width] duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>
    </div>
  )
}
