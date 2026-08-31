'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Heart, MoreHorizontal, Play, Info, Radio, ListMusic } from 'lucide-react'
import type { Track } from '@/lib/plugins/cat-music/types'
import { useCatMusicPlayer } from '@/lib/plugins/cat-music/player-context'
import { useLibrary } from '@/lib/plugins/cat-music/library-context'
import { formatDuration } from '@/lib/plugins/cat-music/youtube'
import { useLanguage } from '@/lib/i18n'

export function TrackRow({
  track,
  index,
  queue,
  onSelectArtist,
  onSelectTrack,
  showIndex,
}: {
  track: Track
  index?: number
  queue?: Track[]
  onSelectArtist?: (artistName: string) => void
  onSelectTrack?: (track: Track) => void
  showIndex?: boolean
}) {
  const { currentTrack, playerState, playTrack, togglePlayPause } = useCatMusicPlayer()
  const { isFavorite, toggleFavorite, playlists, addTrackToPlaylist } = useLibrary()
  const { t } = useLanguage()
  const [showMenu, setShowMenu] = useState(false)

  const isCurrent = currentTrack?.id === track.id
  const isPlaying = isCurrent && playerState.isPlaying
  const fav = isFavorite(track.id)

  const titleRef = useRef<HTMLButtonElement>(null)
  const artistRef = useRef<HTMLButtonElement>(null)
  const [titleOverflows, setTitleOverflows] = useState(false)
  const [artistOverflows, setArtistOverflows] = useState(false)
  const [titleMarquee, setTitleMarquee] = useState('')
  const [artistMarquee, setArtistMarquee] = useState('')

  useEffect(() => {
    if (titleRef.current) {
      const el = titleRef.current
      const overflow = el.scrollWidth - el.clientWidth
      if (overflow > 0) {
        setTitleOverflows(true)
        setTitleMarquee(`-${overflow}px`)
      } else {
        setTitleOverflows(false)
      }
    }
    if (artistRef.current) {
      const el = artistRef.current
      const overflow = el.scrollWidth - el.clientWidth
      if (overflow > 0) {
        setArtistOverflows(true)
        setArtistMarquee(`-${overflow}px`)
      } else {
        setArtistOverflows(false)
      }
    }
  }, [track.title, track.artist])

  const handlePlayClick = () => {
    if (isCurrent) { togglePlayPause() } else { playTrack(track, queue) }
  }

  return (
    <div
      className={`group relative flex items-center gap-3 px-4 py-2.5 text-[13px] transition-all rounded-lg ${
        isCurrent ? 'bg-[var(--cm-accent-veil)]' : 'hover:bg-white/[0.04]'
      }`}
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className="relative flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white/[0.04] ring-1 ring-white/[0.06]">
          {showIndex && !isCurrent && (
            <span className="text-[11px] font-semibold text-white/30 tabular-nums">{index}</span>
          )}
          <img
            src={track.artworkUrl}
            alt={track.title}
            className={`size-10 rounded-xl object-cover ${showIndex && !isCurrent ? 'group-hover:opacity-0' : ''}`}
            onError={(e) => { (e.target as HTMLElement).setAttribute('src', '/placeholder.svg') }}
          />
          <button
            onClick={handlePlayClick}
            aria-label={isPlaying ? t.playerPause : t.playerPlay}
            className={`absolute inset-0 flex items-center justify-center bg-black/60 text-white transition-opacity ${
              isCurrent ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
            }`}
          >
            {isPlaying ? (
              <span className="flex items-end gap-0.5 h-3">
                <span className="w-0.5 bg-[var(--cm-accent)] animate-pulse h-3 rounded-full" />
                <span className="w-0.5 bg-[var(--cm-accent)] animate-pulse h-2 delay-75 rounded-full" />
                <span className="w-0.5 bg-[var(--cm-accent)] animate-pulse h-3.5 delay-150 rounded-full" />
              </span>
            ) : (
              <Play className="size-4 fill-current ml-0.5" />
            )}
          </button>
        </div>

        <div className="min-w-0 flex-1">
          <button
            ref={titleRef}
            onClick={() => onSelectTrack?.(track)}
            className={`block text-left max-w-full font-semibold hover:underline ${titleOverflows ? 'marquee-container' : 'truncate'} ${isCurrent ? 'text-[var(--cm-accent-hi)]' : 'text-white'}`}
          >
            <span className={titleOverflows ? 'marquee-text inline-block whitespace-nowrap' : ''} style={titleOverflows ? { ['--marquee-end' as string]: titleMarquee } : undefined}>{track.title}</span>
          </button>
          <button
            ref={artistRef}
            onClick={() => onSelectArtist?.(track.artist)}
            className={`block text-left max-w-full text-[11.5px] text-white/40 hover:text-white/70 hover:underline transition-colors ${artistOverflows ? 'marquee-container' : 'truncate'}`}
          >
            <span className={artistOverflows ? 'marquee-text inline-block whitespace-nowrap' : ''} style={artistOverflows ? { ['--marquee-end' as string]: artistMarquee } : undefined}>{track.artist}</span>
          </button>
        </div>
      </div>

      <span className="text-[11.5px] font-mono text-white/30 shrink-0 w-11 text-right">
        {formatDuration(track.durationSeconds)}
      </span>

      <div className="flex items-center shrink-0">
        <button
          onClick={() => toggleFavorite(track)}
          aria-label={fav ? t.removeFavorite : t.addFavorite}
          className={`rounded-xl p-1.5 transition-all ${
            fav ? 'text-rose-400 opacity-100' : 'text-white/20 opacity-0 group-hover:opacity-100 hover:text-white/60'
          }`}
        >
          <Heart className={`size-4 ${fav ? 'fill-current' : ''}`} />
        </button>

        <div className="relative">
          <button
            onClick={() => setShowMenu((v) => !v)}
            aria-label={t.moreOptions}
            aria-expanded={showMenu}
            className="rounded-xl p-1.5 text-white/30 opacity-0 group-hover:opacity-100 hover:bg-white/10 hover:text-white transition-all"
          >
            <MoreHorizontal className="size-4" />
          </button>

          {showMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
              <div className="absolute right-0 top-full z-50 mt-1 w-56 cm-glass-strong rounded-2xl p-1.5 shadow-2xl space-y-0.5"
                onClick={(e) => e.stopPropagation()}>
                {onSelectTrack && (
                  <button onClick={() => { onSelectTrack(track); setShowMenu(false) }}
                    className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left text-[12px] text-white/70 hover:bg-white/[0.08] hover:text-white transition-colors">
                    <Info className="size-3.5 text-white/40" />
                    <span>{t.trackInfo}</span>
                  </button>
                )}

                {onSelectArtist && (
                  <button onClick={() => { onSelectArtist(track.artist); setShowMenu(false) }}
                    className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left text-[12px] text-white/70 hover:bg-white/[0.08] hover:text-white transition-colors">
                    <Radio className="size-3.5 text-white/40" />
                    <span>{t.viewArtistChannel}</span>
                  </button>
                )}

                <div className="my-1 h-px bg-white/[0.06]" />

                <div className="px-2.5 py-1 text-[10px] font-bold text-white/30 uppercase tracking-wider">
                  {t.addToPlaylist}
                </div>
                {playlists.map((pl) => (
                  <button key={pl.id}
                    onClick={() => { addTrackToPlaylist(pl.id, track); setShowMenu(false) }}
                    className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left text-[12px] text-white/70 hover:bg-white/[0.08] hover:text-white transition-colors">
                    <ListMusic className="size-3.5 text-white/30" />
                    <span className="truncate">{pl.name}</span>
                  </button>
                ))}
                {playlists.length === 0 && (
                  <div className="px-2.5 py-1.5 text-[11px] text-white/20">{t.noPlaylistsYet}</div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
