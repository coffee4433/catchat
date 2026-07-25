'use client'

import React from 'react'
import { Trash2, X, Music, Volume2 } from 'lucide-react'
import { useCatMusicPlayer } from '@/lib/plugins/cat-music/player-context'
import { formatDuration } from '@/lib/plugins/cat-music/youtube'

export function QueuePanel({ onClose }: { onClose: () => void }) {
  const { currentTrack, playerState, removeFromQueue, clearQueue, playTrack } = useCatMusicPlayer()

  const queue = playerState.queue
  const upcoming = queue.slice(playerState.index + 1)

  return (
    <div className="flex h-full w-80 flex-col rounded-3xl border border-border/60 bg-card/95 p-4 shadow-2xl backdrop-blur-2xl">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-border/40">
        <div className="flex items-center gap-2">
          <Music className="size-4 text-primary" />
          <h3 className="text-sm font-bold text-foreground">Cola de Reproducción</h3>
        </div>
        <button
          onClick={onClose}
          className="rounded-lg p-1 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
        >
          <X className="size-4" />
        </button>
      </div>

      {/* Body Scrollable */}
      <div className="thin-scroll flex-1 overflow-y-auto py-3 space-y-4">
        {/* Currently Playing */}
        {currentTrack && (
          <div>
            <p className="mb-2 text-[10.5px] font-bold text-primary uppercase tracking-wider">Ahora suena</p>
            <div className="flex items-center gap-3 rounded-xl bg-primary/10 p-2.5 border border-primary/20">
              <img
                src={currentTrack.artworkUrl}
                alt={currentTrack.title}
                className="size-10 rounded-lg object-cover"
                onError={(e) => {
                  ;(e.target as HTMLElement).setAttribute('src', '/placeholder.svg')
                }}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[12.5px] font-bold text-primary">{currentTrack.title}</p>
                <p className="truncate text-[11px] text-muted-foreground">{currentTrack.artist}</p>
              </div>
              <Volume2 className="size-4 text-primary animate-pulse shrink-0" />
            </div>
          </div>
        )}

        {/* Upcoming in Queue */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10.5px] font-bold text-muted-foreground uppercase tracking-wider">
              A continuación ({upcoming.length})
            </p>
            {upcoming.length > 0 && (
              <button
                onClick={clearQueue}
                className="text-[11px] font-semibold text-rose-500 hover:underline"
              >
                Limpiar
              </button>
            )}
          </div>

          {upcoming.length > 0 ? (
            <div className="space-y-1">
              {upcoming.map((track, idx) => {
                const actualIndex = playerState.index + 1 + idx
                return (
                  <div
                    key={`${track.id}-${idx}`}
                    className="group flex items-center justify-between gap-2 rounded-xl p-2 text-[12px] hover:bg-secondary/60 transition-colors cursor-pointer"
                    onClick={() => playTrack(track)}
                  >
                    <img
                      src={track.artworkUrl}
                      alt={track.title}
                      className="size-8 rounded-lg object-cover shrink-0"
                      onError={(e) => {
                        ;(e.target as HTMLElement).setAttribute('src', '/placeholder.svg')
                      }}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-foreground">{track.title}</p>
                      <p className="truncate text-[10.5px] text-muted-foreground">{track.artist}</p>
                    </div>
                    <span className="text-[10.5px] font-mono text-muted-foreground shrink-0">
                      {formatDuration(track.durationSeconds)}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        removeFromQueue(actualIndex)
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-rose-500 transition-opacity"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="py-6 text-center text-[12px] text-muted-foreground">No hay más canciones en la cola.</p>
          )}
        </div>
      </div>
    </div>
  )
}
