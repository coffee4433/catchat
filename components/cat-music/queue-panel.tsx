'use client'

import React from 'react'
import { Trash2, X, Music, Volume2 } from 'lucide-react'
import { useCatMusicPlayer } from '@/lib/plugins/cat-music/player-context'
import { formatDuration } from '@/lib/plugins/cat-music/youtube'
import { useLanguage } from '@/lib/i18n'

export function QueuePanel({ onClose }: { onClose: () => void }) {
  const { currentTrack, playerState, removeFromQueue, clearQueue, playTrack } = useCatMusicPlayer()
  const { t } = useLanguage()

  const queue = playerState.queue
  const upcoming = queue.slice(playerState.index + 1)

  return (
    <div className="flex h-full w-80 flex-col rounded-3xl border border-white/[0.08] bg-[#15161a]/98 p-4 shadow-2xl backdrop-blur-2xl">
      <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          <Music className="size-4 text-[var(--cm-accent-hi)]" />
          <h3 className="text-sm font-bold text-white">{t.playerQueue}</h3>
        </div>
        <button
          onClick={onClose}
          aria-label={t.close}
          className="rounded-lg p-1 text-white/30 hover:bg-white/[0.08] hover:text-white transition-colors"
        >
          <X className="size-4" />
        </button>
      </div>

      <div className="thin-scroll flex-1 overflow-y-auto py-3 space-y-4">
        {currentTrack && (
          <div>
            <p className="mb-2 text-[10.5px] font-bold text-[var(--cm-accent-hi)] uppercase tracking-wider">{t.reproduciendo}</p>
            <div className="flex items-center gap-3 rounded-xl bg-[var(--cm-accent-veil)] p-2.5 border border-[var(--cm-accent-edge)]">
              <img
                src={currentTrack.artworkUrl}
                alt={currentTrack.title}
                className="size-10 rounded-lg object-cover"
                onError={(e) => { (e.target as HTMLElement).setAttribute('src', '/placeholder.svg') }}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[12.5px] font-bold text-[var(--cm-accent-hi)]">{currentTrack.title}</p>
                <p className="truncate text-[11px] text-white/40">{currentTrack.artist}</p>
              </div>
              <Volume2 className="size-4 text-[var(--cm-accent-hi)] animate-pulse shrink-0" />
            </div>
          </div>
        )}

        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10.5px] font-bold text-white/30 uppercase tracking-wider">
              {t.upNext} ({upcoming.length})
            </p>
            {upcoming.length > 0 && (
              <button
                onClick={clearQueue}
                className="text-[11px] font-semibold text-rose-400 hover:underline"
              >
                {t.clear}
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
                    className="group flex items-center justify-between gap-2 rounded-xl p-2 text-[12px] hover:bg-white/[0.04] transition-colors cursor-pointer"
                    onClick={() => playTrack(track)}
                  >
                    <img
                      src={track.artworkUrl}
                      alt={track.title}
                      className="size-8 rounded-lg object-cover shrink-0"
                      onError={(e) => { (e.target as HTMLElement).setAttribute('src', '/placeholder.svg') }}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-white">{track.title}</p>
                      <p className="truncate text-[10.5px] text-white/40">{track.artist}</p>
                    </div>
                    <span className="text-[10.5px] font-mono text-white/30 shrink-0">
                      {formatDuration(track.durationSeconds)}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        removeFromQueue(actualIndex)
                      }}
                      aria-label={t.removeFromQueue}
                      className="opacity-0 group-hover:opacity-100 p-1 text-white/30 hover:text-rose-400 transition-opacity"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="py-6 text-center text-[12px] text-white/30">{t.queueEmpty}</p>
          )}
        </div>
      </div>
    </div>
  )
}
