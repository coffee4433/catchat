'use client'

import React from 'react'
import { Heart, Play, Pause } from 'lucide-react'
import type { Track } from '@/lib/plugins/cat-music/types'
import { useCatMusicPlayer } from '@/lib/plugins/cat-music/player-context'
import { useLibrary } from '@/lib/plugins/cat-music/library-context'

export function TrackCard({ track, queue }: { track: Track; queue?: Track[] }) {
  const { currentTrack, playerState, playTrack, togglePlayPause } = useCatMusicPlayer()
  const { isFavorite, toggleFavorite } = useLibrary()

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
    <div className="group relative flex flex-col gap-2.5 rounded-2xl border border-border/40 bg-secondary/20 p-3 transition-all hover:border-primary/30 hover:bg-secondary/40 hover:shadow-lg">
      {/* Artwork Container */}
      <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-secondary/80">
        <img
          src={track.artworkUrl}
          alt={track.title}
          className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
          onError={(e) => {
            ;(e.target as HTMLElement).setAttribute('src', '/placeholder.svg')
          }}
        />

        {/* Overlay Play Button */}
        <button
          onClick={handlePlay}
          aria-label={isPlaying ? 'Pausar' : 'Reproducir'}
          className={`absolute right-2.5 bottom-2.5 flex size-10 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-all ${
            isCurrent ? 'scale-100 opacity-100' : 'scale-90 opacity-0 group-hover:scale-100 group-hover:opacity-100'
          }`}
        >
          {isPlaying ? <Pause className="size-5 fill-current" /> : <Play className="size-5 fill-current ml-0.5" />}
        </button>

        {/* Favorite Heart */}
        <button
          onClick={(e) => {
            e.stopPropagation()
            toggleFavorite(track)
          }}
          aria-label={fav ? 'Quitar de favoritos' : 'Añadir a favoritos'}
          className={`absolute left-2.5 top-2.5 flex size-8 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-md transition-all ${
            fav ? 'text-rose-500 opacity-100' : 'opacity-0 group-hover:opacity-100 hover:text-rose-400'
          }`}
        >
          <Heart className={`size-4 ${fav ? 'fill-current' : ''}`} />
        </button>
      </div>

      {/* Meta */}
      <div className="min-w-0">
        <h4 className={`truncate text-[13px] font-bold ${isCurrent ? 'text-primary' : 'text-foreground'}`}>
          {track.title}
        </h4>
        <p className="truncate text-[11.5px] text-muted-foreground mt-0.5">{track.artist}</p>
      </div>
    </div>
  )
}
