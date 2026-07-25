'use client'

import React, { useState } from 'react'
import {
  ArrowLeft,
  CheckCircle2,
  Disc,
  ListPlus,
  Music,
  Play,
  Radio,
  Sparkles,
  UserCheck,
  UserPlus,
} from 'lucide-react'
import type { Track } from '@/lib/plugins/cat-music/types'
import { SEED_TRACKS } from '@/lib/plugins/cat-music/catalog'
import { useCatMusicPlayer } from '@/lib/plugins/cat-music/player-context'
import { TrackRow } from './track-row'

export type Album = {
  id: string
  title: string
  artist: string
  year: number
  coverUrl: string
  tracks: Track[]
}

export function ArtistDetailView({
  artistName,
  onBack,
  onSelectTrack,
}: {
  artistName: string
  onBack: () => void
  onSelectTrack: (track: Track) => void
}) {
  const [activeTab, setActiveTab] = useState<'tracks' | 'albums'>('tracks')
  const [isFollowing, setIsFollowing] = useState(false)
  const [selectedAlbum, setSelectedAlbum] = useState<Album | null>(null)

  const { playTrack } = useCatMusicPlayer()

  // Filter artist tracks from seed catalog & search cache
  const artistTracks = SEED_TRACKS.filter(
    (t) => t.artist.toLowerCase().includes(artistName.toLowerCase()) || artistName.toLowerCase().includes(t.artist.toLowerCase())
  )

  const tracksToDisplay = artistTracks.length > 0 ? artistTracks : SEED_TRACKS.slice(0, 6)
  const firstTrack = tracksToDisplay[0]

  // Mock Albums for this Channel/Artist
  const albums: Album[] = [
    {
      id: `alb-1-${artistName}`,
      title: `${artistName} - Éxitos y Colección Principal`,
      artist: artistName,
      year: 2024,
      coverUrl: firstTrack?.artworkUrl || '/placeholder.svg',
      tracks: tracksToDisplay,
    },
    {
      id: `alb-2-${artistName}`,
      title: `${artistName} - Deluxe & Remastered Sessions`,
      artist: artistName,
      year: 2023,
      coverUrl: tracksToDisplay[1]?.artworkUrl || firstTrack?.artworkUrl || '/placeholder.svg',
      tracks: tracksToDisplay.slice(1),
    },
  ]

  return (
    <div className="flex h-full w-full flex-col overflow-y-auto bg-background/60 p-5 text-foreground space-y-6">
      {/* Top Header Navigation */}
      <div className="flex items-center gap-3">
        <button
          onClick={selectedAlbum ? () => setSelectedAlbum(null) : onBack}
          aria-label="Volver"
          className="flex size-9 items-center justify-center rounded-xl bg-secondary/80 text-foreground transition-all hover:bg-secondary hover:scale-105 active:scale-95"
        >
          <ArrowLeft className="size-4" />
        </button>
        <div>
          <h1 className="text-base font-bold text-foreground">
            {selectedAlbum ? `Álbum: ${selectedAlbum.title}` : `Canal / Artista: ${artistName}`}
          </h1>
          <p className="text-[11px] text-muted-foreground">
            {selectedAlbum ? 'Lista de canciones del álbum' : 'Canal oficial de YouTube Music'}
          </p>
        </div>
      </div>

      {/* VIEW A: ALBUM DETAIL VIEW */}
      {selectedAlbum ? (
        <div className="space-y-6">
          {/* Album Hero Card */}
          <div className="flex flex-col sm:flex-row items-center gap-6 rounded-3xl border border-border/40 bg-gradient-to-br from-card/80 via-secondary/20 to-background/80 p-6 shadow-xl backdrop-blur-xl">
            <img
              src={selectedAlbum.coverUrl}
              alt={selectedAlbum.title}
              className="size-40 rounded-2xl object-cover shadow-lg ring-1 ring-white/10 shrink-0"
              onError={(e) => {
                ;(e.target as HTMLElement).setAttribute('src', '/placeholder.svg')
              }}
            />
            <div className="space-y-3 text-center sm:text-left min-w-0">
              <span className="rounded-full bg-primary/20 px-3 py-0.5 text-[11px] font-bold text-primary">
                Álbum Oficial
              </span>
              <h2 className="text-2xl font-extrabold tracking-tight text-foreground truncate">{selectedAlbum.title}</h2>
              <p className="text-xs text-muted-foreground">
                Por <span className="font-semibold text-foreground">{selectedAlbum.artist}</span> • {selectedAlbum.year} • {selectedAlbum.tracks.length} canciones
              </p>
              <button
                onClick={() => playTrack(selectedAlbum.tracks[0], selectedAlbum.tracks)}
                className="inline-flex items-center gap-2 rounded-2xl bg-primary px-5 py-2.5 text-xs font-extrabold text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:scale-105 active:scale-95"
              >
                <Play className="size-4 fill-current" />
                <span>Reproducir Álbum</span>
              </button>
            </div>
          </div>

          {/* Album Tracks List */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-foreground">Canciones del Álbum</h3>
            <div className="space-y-1 rounded-2xl border border-border/40 bg-secondary/15 p-3">
              {selectedAlbum.tracks.map((t, idx) => (
                <TrackRow
                  key={t.id}
                  track={t}
                  index={idx}
                  queue={selectedAlbum.tracks}
                  onSelectTrack={onSelectTrack}
                />
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* VIEW B: ARTIST CHANNEL PAGE */
        <div className="space-y-6">
          {/* Artist Channel Hero Header */}
          <div className="relative overflow-hidden rounded-3xl border border-border/40 bg-gradient-to-r from-teal-500/20 via-primary/10 to-indigo-500/20 p-6 shadow-xl backdrop-blur-xl">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
              <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
                <div className="relative size-20 shrink-0 overflow-hidden rounded-full bg-secondary ring-4 ring-primary/30 shadow-lg">
                  <img
                    src={firstTrack?.artworkUrl || '/placeholder.svg'}
                    alt={artistName}
                    className="size-full object-cover"
                    onError={(e) => {
                      ;(e.target as HTMLElement).setAttribute('src', '/placeholder.svg')
                    }}
                  />
                </div>
                <div>
                  <div className="flex items-center justify-center sm:justify-start gap-1.5">
                    <h2 className="text-2xl font-extrabold text-foreground tracking-tight">{artistName}</h2>
                    <CheckCircle2 className="size-5 text-primary fill-primary/20 shrink-0" />
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    1.4M suscriptores • Canal Oficial de YouTube Music
                  </p>
                </div>
              </div>

              {/* Follow Channel Button */}
              <button
                onClick={() => setIsFollowing((v) => !v)}
                className={`flex items-center gap-2 rounded-2xl px-5 py-2.5 text-xs font-extrabold transition-all hover:scale-105 active:scale-95 ${
                  isFollowing
                    ? 'bg-secondary text-foreground border border-border/60'
                    : 'bg-primary text-primary-foreground shadow-lg shadow-primary/25'
                }`}
              >
                {isFollowing ? (
                  <>
                    <UserCheck className="size-4" />
                    <span>Siguiendo Canal</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="size-4" />
                    <span>Seguir Canal</span>
                  </>
                )}
              </button>
            </div>

            {/* Sub-navigation Tabs */}
            <div className="flex items-center gap-2 mt-6 pt-4 border-t border-border/30">
              <button
                onClick={() => setActiveTab('tracks')}
                className={`rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                  activeTab === 'tracks'
                    ? 'bg-primary text-primary-foreground shadow-md'
                    : 'bg-secondary/40 text-muted-foreground hover:bg-secondary hover:text-foreground'
                }`}
              >
                Canciones Populares ({tracksToDisplay.length})
              </button>
              <button
                onClick={() => setActiveTab('albums')}
                className={`rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                  activeTab === 'albums'
                    ? 'bg-primary text-primary-foreground shadow-md'
                    : 'bg-secondary/40 text-muted-foreground hover:bg-secondary hover:text-foreground'
                }`}
              >
                Álbumes y Playlists ({albums.length})
              </button>
            </div>
          </div>

          {/* TAB 1: POPULAR TRACKS */}
          {activeTab === 'tracks' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-foreground">Canciones Populares del Canal</h3>
                <button
                  onClick={() => playTrack(tracksToDisplay[0], tracksToDisplay)}
                  className="flex items-center gap-1.5 text-xs font-bold text-primary hover:underline"
                >
                  <Play className="size-3.5 fill-current" />
                  <span>Reproducir Todas</span>
                </button>
              </div>

              <div className="space-y-1 rounded-2xl border border-border/40 bg-secondary/15 p-3">
                {tracksToDisplay.map((t, idx) => (
                  <TrackRow
                    key={t.id}
                    track={t}
                    index={idx}
                    queue={tracksToDisplay}
                    onSelectTrack={onSelectTrack}
                  />
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: ALBUMS & PLAYLISTS */}
          {activeTab === 'albums' && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-foreground">Álbumes y Colecciones del Canal</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {albums.map((alb) => (
                  <div
                    key={alb.id}
                    onClick={() => setSelectedAlbum(alb)}
                    className="group relative flex flex-col justify-between rounded-2xl border border-border/60 bg-secondary/20 p-4 transition-all hover:border-primary/40 hover:bg-secondary/40 cursor-pointer"
                  >
                    <div className="space-y-3">
                      <div className="relative aspect-square overflow-hidden rounded-xl bg-secondary shadow-md">
                        <img
                          src={alb.coverUrl}
                          alt={alb.title}
                          className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
                          onError={(e) => {
                            ;(e.target as HTMLElement).setAttribute('src', '/placeholder.svg')
                          }}
                        />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                          <span className="flex size-10 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg">
                            <Disc className="size-5" />
                          </span>
                        </div>
                      </div>
                      <div>
                        <h4 className="font-bold text-foreground text-sm truncate">{alb.title}</h4>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Álbum • {alb.year} • {alb.tracks.length} canciones
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
