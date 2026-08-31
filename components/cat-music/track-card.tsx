'use client'

import React from 'react'
import { Heart, Play, Pause } from 'lucide-react'
import type { Track } from '@/lib/plugins/cat-music/types'
import { useCatMusicPlayer } from '@/lib/plugins/cat-music/player-context'
import { useLibrary } from '@/lib/plugins/cat-music/library-context'
import { useLanguage } from '@/lib/i18n'

export function TrackCard({ track, queue }: { track: Track; queue?: Track[] }) {
  const { currentTrack, playerState, playTrack, togglePlayPause } = useCatMusicPlayer()
  const { isFavorite, toggleFavorite } = useLibrary()
  const { t } = useLanguage()

  const isCurrent = currentTrack?.id === track.id
  const isPlaying = isCurrent && playerState.isPlaying
  const fav = isFavorite(track.id)

  const handlePlay = () => {
    if (isCurrent) {
      togglePlayPause()
    } else {
      playTrack(track, queue)
    }
  }

  return (
    <div className="group relative flex flex-col gap-0.5 rounded-[10px] p-0 transition-colors hover:bg-white/[0.04]">
      <div className="relative aspect-square w-full overflow-hidden rounded-[10px] bg-white/[0.04]">
        <img
          src={track.artworkUrl}
          alt={track.title}
          className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
          onError={(e) => { (e.target as HTMLElement).setAttribute('src', '/placeholder.svg') }}
        />

        <button
          onClick={handlePlay}
          aria-label={isPlaying ? t.playerPause : t.playerPlay}
          className={`absolute right-1 bottom-1 flex size-6 items-center justify-center rounded-full bg-[var(--cm-accent-hi)] text-[#08090b] shadow-lg shadow-[var(--cm-halo)] transition-all ${
            isCurrent ? 'scale-100 opacity-100' : 'translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100'
          } hover:scale-110 active:scale-95`}
        >
          {isPlaying ? <Pause className="size-3.5 fill-current" /> : <Play className="size-3.5 fill-current ml-0.5" />}
        </button>

        {isCurrent && isPlaying && (
          <div className="absolute inset-0 flex items-end justify-center gap-0.5 p-1 bg-black/25">
            <span className="w-0.5 bg-[var(--cm-accent)] rounded-full h-1.5 animate-pulse" />
            <span className="w-0.5 bg-[var(--cm-accent)] rounded-full h-2 animate-pulse delay-75" />
            <span className="w-0.5 bg-[var(--cm-accent)] rounded-full h-1 animate-pulse delay-150" />
          </div>
        )}

        <button
          onClick={(e) => { e.stopPropagation(); toggleFavorite(track) }}
          aria-label={fav ? t.removeFavorite : t.addFavorite}
          className={`absolute left-1 top-1 flex size-5 items-center justify-center rounded-full bg-black/50 backdrop-blur-md transition-all ${
            fav ? 'opacity-100 text-rose-400' : 'opacity-0 group-hover:opacity-100 text-white/70 hover:text-rose-300'
          }`}
        >
          <Heart className={`size-3 ${fav ? 'fill-current' : ''}`} />
        </button>
      </div>

      <div className="min-w-0 px-0">
        <h4 className={`truncate text-[11px] font-semibold leading-tight ${isCurrent ? 'text-[var(--cm-accent-hi)]' : 'text-white'}`}>
          {track.title}
        </h4>
        <p className="truncate text-[10px] text-white/40 leading-tight">{track.artist}</p>
      </div>
    </div>
  )
}
