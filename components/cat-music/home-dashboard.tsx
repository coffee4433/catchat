'use client'

import React from 'react'
import {
  Heart,
  Clock,
  ListMusic,
  Music,
  Play,
  Sparkles,
  TrendingUp,
} from 'lucide-react'
import { SEED_TRACKS } from '@/lib/plugins/cat-music/catalog'
import type { Track } from '@/lib/plugins/cat-music/types'
import { useLanguage } from '@/lib/i18n'
import { GlassPanel } from './glass-panel'
import { TrackCard } from './track-card'
import { TrackRow } from './track-row'

function StatChip({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: number
  accent?: boolean
}) {
  return (
    <div className="cm-glass flex flex-1 items-center gap-2 rounded-2xl px-3 py-2">
      <div className={`flex size-7 shrink-0 items-center justify-center rounded-lg ${accent ? 'bg-[var(--cm-accent-veil)]' : 'bg-white/[0.06]'}`}>
        <Icon className={`size-3.5 ${accent ? 'text-[var(--cm-accent-hi)]' : 'text-white/50'}`} />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] text-white/45">{label}</p>
        <p className={`text-base font-black leading-tight ${accent ? 'text-[var(--cm-accent-hi)]' : 'text-white'}`}>{value}</p>
      </div>
    </div>
  )
}

export function HomeDashboard({
  greeting,
  featuredTrack,
  favoritesCount,
  playlistsCount,
  historyCount,
  currentTrack,
  isPlaying,
  artistBannerUrl,
  onPlayFeatured,
  onSelectArtist,
  onSelectTrack,
}: {
  greeting: string
  featuredTrack: Track
  favoritesCount: number
  playlistsCount: number
  historyCount: number
  currentTrack: Track | null
  isPlaying: boolean
  artistBannerUrl?: string
  onPlayFeatured: () => void
  onSelectArtist: (name: string) => void
  onSelectTrack: (track: Track) => void
}) {
  const { t } = useLanguage()
  return (
    <div className="flex h-full flex-col space-y-3 px-1 pt-1">
      {/* Hero — dark glass, coherente con el resto */}
      <GlassPanel className="relative overflow-hidden !rounded-[28px] p-4 md:p-5">
        {artistBannerUrl && (
          <div className="absolute inset-0">
            <img src={artistBannerUrl} alt="" className="size-full object-cover opacity-20 blur-sm scale-105" />
          </div>
        )}
        <div className="flex flex-col gap-3 md:flex-row md:items-center relative z-10">
          <div className="size-24 shrink-0 overflow-hidden rounded-[16px] ring-2 ring-white/20 md:size-28">
            <img src={featuredTrack.artworkUrl} alt={featuredTrack.artist} className="size-full object-cover" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-[var(--cm-accent-edge)] bg-[var(--cm-accent-veil)] px-3 py-1 text-[11px] font-bold text-[var(--cm-accent-hi)]">
              <Sparkles className="size-3" />
              {greeting}
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white md:text-3xl">{featuredTrack.artist}</h1>
            <p className="mt-1 truncate text-sm text-white/55 md:text-sm">{featuredTrack.title}</p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                onClick={onPlayFeatured}
                className="flex items-center gap-2 rounded-full bg-[var(--cm-accent)] px-5 py-2 text-[13px] font-bold text-white shadow-lg shadow-[var(--cm-halo)] transition-all hover:bg-[var(--cm-accent-hi)] hover:scale-[1.02] active:scale-95"
              >
                <Play className="size-4 fill-current" />
                {t.play}
              </button>
              <button
                onClick={() => onSelectArtist(featuredTrack.artist)}
                className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-[13px] font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/15"
              >
                {t.viewArtist}
              </button>
            </div>
          </div>

          {currentTrack && (
            <div className="hidden shrink-0 flex-col gap-2 rounded-2xl border border-white/10 bg-black/30 p-4 backdrop-blur-md lg:flex lg:w-52">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--cm-accent-hi)]">{t.reproduciendo}</p>
              <div className="flex items-center gap-2.5">
                <div className="size-11 shrink-0 overflow-hidden rounded-xl ring-1 ring-white/10">
                  <img src={currentTrack.artworkUrl} alt="" className="size-full object-cover" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12px] font-bold text-white">{currentTrack.title}</p>
                  <p className="truncate text-[10px] text-white/45">{currentTrack.artist}</p>
                </div>
              </div>
              {isPlaying && (
                <span className="flex h-3 items-end justify-center gap-0.5">
                  <span className="h-3 w-0.5 animate-pulse rounded-full bg-[var(--cm-accent)]" />
                  <span className="h-2 w-0.5 animate-pulse rounded-full bg-[var(--cm-accent)]" />
                  <span className="h-3.5 w-0.5 animate-pulse rounded-full bg-[var(--cm-accent)]" />
                </span>
              )}
            </div>
          )}
        </div>
      </GlassPanel>

      {/* Stats — fila horizontal integrada */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <StatChip icon={Heart} label={t.favorites} value={favoritesCount} accent />
        <StatChip icon={ListMusic} label={t.playlists} value={playlistsCount} />
        <StatChip icon={Clock} label={t.history} value={historyCount} />
      </div>

      {/* Two-column layout */}
      <div className="flex flex-1 flex-col gap-3 lg:flex-row min-h-0">
        {/* Escuchas rápidas — left column */}
        <GlassPanel className="flex flex-1 flex-col overflow-hidden rounded-[24px] p-3">
          <div className="shrink-0">
            <h2 className="mb-0.5 flex items-center gap-2 text-sm font-bold text-white">
              <TrendingUp className="size-4 text-[var(--cm-accent-hi)]" />
              {t.recommendedForYou}
            </h2>
            <p className="mb-2 text-[10px] text-white/40">{t.basedOn} {featuredTrack.artist}</p>
          </div>
          <div className="flex-1 overflow-y-auto thin-scroll">
            <div className="grid grid-cols-4 gap-1">
            {SEED_TRACKS.slice(0, 12).map((t) => (
              <TrackCard key={t.id} track={t} queue={SEED_TRACKS} />
            ))}
            </div>
          </div>
        </GlassPanel>

        {/* Populares — right column */}
        <GlassPanel className="flex w-full flex-col overflow-hidden rounded-[24px] lg:flex-1">
          <div className="shrink-0 border-b border-white/[0.06] px-3 py-2 md:px-4">
            <h2 className="flex items-center gap-2 text-base font-bold text-white">
              <Music className="size-4 text-[var(--cm-accent-hi)]" />
              {t.popularNow}
            </h2>
          </div>
          <div className="flex-1 divide-y divide-white/[0.06] overflow-y-auto thin-scroll">
            {SEED_TRACKS.map((t, idx) => (
              <TrackRow
                key={t.id}
                track={t}
                index={idx + 1}
                queue={SEED_TRACKS}
                showIndex
                onSelectArtist={onSelectArtist}
                onSelectTrack={onSelectTrack}
              />
            ))}
          </div>
        </GlassPanel>
      </div>
    </div>
  )
}
