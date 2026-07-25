'use client'

import React, { createContext, useContext, useEffect, useRef, useState } from 'react'
import type { PlayerState, RepeatMode, Track } from './types'
import { SEED_TRACKS } from './catalog'
import { loadYouTubeIframeApi } from './youtube'

type PlayerContextType = {
  playerState: PlayerState
  currentTrack: Track | null
  playTrack: (track: Track, newQueue?: Track[], context?: { type: string; id?: string }) => void
  togglePlayPause: () => void
  nextTrack: () => void
  previousTrack: () => void
  seekTo: (seconds: number) => void
  setVolume: (volume: number) => void
  toggleMute: () => void
  toggleShuffle: () => void
  cycleRepeat: () => void
  addToQueue: (track: Track) => void
  removeFromQueue: (index: number) => void
  clearQueue: () => void
}

const PlayerContext = createContext<PlayerContextType | null>(null)

export function CatMusicPlayerProvider({ children }: { children: React.ReactNode }) {
  const [playerState, setPlayerState] = useState<PlayerState>({
    queue: SEED_TRACKS,
    index: 0,
    isPlaying: false,
    isBuffering: false,
    position: 0,
    duration: SEED_TRACKS[0]?.durationSeconds || 180,
    volume: 80,
    muted: false,
    shuffle: false,
    repeat: 'off',
    context: null,
    error: null,
  })

  const ytPlayerRef = useRef<any>(null)
  const animFrameRef = useRef<number | null>(null)
  const isSeekingRef = useRef(false)

  const currentTrack = playerState.queue[playerState.index] || null

  // Initialize YT Player once inside hidden container
  useEffect(() => {
    let mounted = true

    loadYouTubeIframeApi().then((YT) => {
      if (!mounted) return
      if (ytPlayerRef.current) return

      const playerDiv = document.getElementById('cat-music-yt-iframe')
      if (!playerDiv) return

      ytPlayerRef.current = new YT.Player('cat-music-yt-iframe', {
        height: '200',
        width: '200',
        videoId: currentTrack ? currentTrack.id : SEED_TRACKS[0].id,
        playerVars: {
          autoplay: 0,
          controls: 0,
          disablekb: 1,
          modestbranding: 1,
          playsinline: 1,
          rel: 0,
          origin: typeof window !== 'undefined' ? window.location.origin : '',
        },
        events: {
          onReady: () => {
            if (ytPlayerRef.current?.setVolume) {
              ytPlayerRef.current.setVolume(playerState.volume)
            }
          },
          onStateChange: (event: any) => {
            // YT.PlayerState: ENDED = 0, PLAYING = 1, PAUSED = 2, BUFFERING = 3
            if (event.data === 1) {
              setPlayerState((s) => ({ ...s, isPlaying: true, isBuffering: false, error: null }))
            } else if (event.data === 2) {
              setPlayerState((s) => ({ ...s, isPlaying: false, isBuffering: false }))
            } else if (event.data === 3) {
              setPlayerState((s) => ({ ...s, isBuffering: true }))
            } else if (event.data === 0) {
              handleTrackEnded()
            }
          },
          onError: () => {
            setPlayerState((s) => ({
              ...s,
              error: 'Vídeo o audio no disponible. Saltando a la siguiente canción...',
            }))
            setTimeout(() => nextTrack(), 1500)
          },
        },
      })
    })

    return () => {
      mounted = false
    }
  }, [])

  // Position ticker via rAF
  useEffect(() => {
    let lastTick = 0

    const tick = (now: number) => {
      if (now - lastTick > 250) {
        // ~4 fps update for smooth UI without re-render spam
        lastTick = now
        if (ytPlayerRef.current && typeof ytPlayerRef.current.getCurrentTime === 'function' && !isSeekingRef.current) {
          const currentTime = ytPlayerRef.current.getCurrentTime() || 0
          const dur = ytPlayerRef.current.getDuration() || currentTrack?.durationSeconds || 180
          setPlayerState((s) => ({ ...s, position: currentTime, duration: dur }))
        }
      }
      if (playerState.isPlaying) {
        animFrameRef.current = requestAnimationFrame(tick)
      }
    }

    if (playerState.isPlaying) {
      animFrameRef.current = requestAnimationFrame(tick)
    } else {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    }

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    }
  }, [playerState.isPlaying, currentTrack])

  // Sync MediaSession API for OS media controls
  useEffect(() => {
    if (typeof window !== 'undefined' && 'mediaSession' in navigator && currentTrack) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentTrack.title,
        artist: currentTrack.artist,
        album: currentTrack.album || 'CatMusic',
        artwork: [{ src: currentTrack.artworkUrl, sizes: '512x512', type: 'image/jpeg' }],
      })
      navigator.mediaSession.setActionHandler('play', () => togglePlayPause())
      navigator.mediaSession.setActionHandler('pause', () => togglePlayPause())
      navigator.mediaSession.setActionHandler('previoustrack', () => previousTrack())
      navigator.mediaSession.setActionHandler('nexttrack', () => nextTrack())
    }
  }, [currentTrack])

  const handleTrackEnded = () => {
    setPlayerState((s) => {
      if (s.repeat === 'one') {
        if (ytPlayerRef.current?.seekTo) {
          ytPlayerRef.current.seekTo(0, true)
          ytPlayerRef.current.playVideo()
        }
        return s
      }

      let nextIndex = s.index + 1
      if (nextIndex >= s.queue.length) {
        if (s.repeat === 'all') {
          nextIndex = 0
        } else {
          return { ...s, isPlaying: false, position: 0 }
        }
      }

      const nextTr = s.queue[nextIndex]
      if (nextTr && ytPlayerRef.current?.loadVideoById) {
        ytPlayerRef.current.loadVideoById(nextTr.id)
      }

      return { ...s, index: nextIndex, position: 0 }
    })
  }

  const playTrack = (track: Track, newQueue?: Track[], context?: { type: string; id?: string }) => {
    const queueToUse = newQueue || playerState.queue
    let trackIndex = queueToUse.findIndex((t) => t.id === track.id)
    if (trackIndex < 0) {
      queueToUse.push(track)
      trackIndex = queueToUse.length - 1
    }

    setPlayerState((s) => ({
      ...s,
      queue: queueToUse,
      index: trackIndex,
      isPlaying: true,
      position: 0,
      context: context || s.context,
      error: null,
    }))

    if (ytPlayerRef.current?.loadVideoById) {
      ytPlayerRef.current.loadVideoById(track.id)
    }
  }

  const togglePlayPause = () => {
    if (!ytPlayerRef.current) return

    if (playerState.isPlaying) {
      ytPlayerRef.current.pauseVideo?.()
      setPlayerState((s) => ({ ...s, isPlaying: false }))
    } else {
      ytPlayerRef.current.playVideo?.()
      setPlayerState((s) => ({ ...s, isPlaying: true }))
    }
  }

  const nextTrack = () => {
    setPlayerState((s) => {
      if (s.queue.length === 0) return s
      let nextIdx = s.index + 1
      if (nextIdx >= s.queue.length) nextIdx = 0
      const nextTr = s.queue[nextIdx]
      if (nextTr && ytPlayerRef.current?.loadVideoById) {
        ytPlayerRef.current.loadVideoById(nextTr.id)
      }
      return { ...s, index: nextIdx, isPlaying: true, position: 0 }
    })
  }

  const previousTrack = () => {
    setPlayerState((s) => {
      if (s.queue.length === 0) return s
      if (s.position > 3) {
        ytPlayerRef.current?.seekTo?.(0, true)
        return { ...s, position: 0 }
      }
      let prevIdx = s.index - 1
      if (prevIdx < 0) prevIdx = s.queue.length - 1
      const prevTr = s.queue[prevIdx]
      if (prevTr && ytPlayerRef.current?.loadVideoById) {
        ytPlayerRef.current.loadVideoById(prevTr.id)
      }
      return { ...s, index: prevIdx, isPlaying: true, position: 0 }
    })
  }

  const seekTo = (seconds: number) => {
    isSeekingRef.current = true
    setPlayerState((s) => ({ ...s, position: seconds }))
    if (ytPlayerRef.current?.seekTo) {
      ytPlayerRef.current.seekTo(seconds, true)
    }
    setTimeout(() => {
      isSeekingRef.current = false
    }, 300)
  }

  const setVolume = (vol: number) => {
    const clamped = Math.max(0, Math.min(100, vol))
    setPlayerState((s) => ({ ...s, volume: clamped, muted: clamped === 0 }))
    if (ytPlayerRef.current?.setVolume) {
      ytPlayerRef.current.setVolume(clamped)
    }
  }

  const toggleMute = () => {
    setPlayerState((s) => {
      const nextMuted = !s.muted
      if (ytPlayerRef.current) {
        if (nextMuted) ytPlayerRef.current.mute?.()
        else ytPlayerRef.current.unMute?.()
      }
      return { ...s, muted: nextMuted }
    })
  }

  const toggleShuffle = () => {
    setPlayerState((s) => {
      const nextShuffle = !s.shuffle
      let nextQueue = [...s.queue]
      if (nextShuffle && nextQueue.length > 1) {
        // Fisher-Yates shuffle keeping current track at index 0
        const currentTr = nextQueue[s.index]
        const rest = nextQueue.filter((_, i) => i !== s.index)
        for (let i = rest.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1))
          ;[rest[i], rest[j]] = [rest[j], rest[i]]
        }
        nextQueue = [currentTr, ...rest]
        return { ...s, shuffle: true, queue: nextQueue, index: 0 }
      }
      return { ...s, shuffle: false }
    })
  }

  const cycleRepeat = () => {
    setPlayerState((s) => {
      const modes: RepeatMode[] = ['off', 'all', 'one']
      const currentIdx = modes.indexOf(s.repeat)
      const nextMode = modes[(currentIdx + 1) % modes.length]
      return { ...s, repeat: nextMode }
    })
  }

  const addToQueue = (track: Track) => {
    setPlayerState((s) => ({ ...s, queue: [...s.queue, track] }))
  }

  const removeFromQueue = (idx: number) => {
    setPlayerState((s) => {
      const newQ = s.queue.filter((_, i) => i !== idx)
      let newIdx = s.index
      if (idx < s.index) newIdx -= 1
      if (newIdx >= newQ.length) newIdx = Math.max(0, newQ.length - 1)
      return { ...s, queue: newQ, index: newIdx }
    })
  }

  const clearQueue = () => {
    setPlayerState((s) => ({ ...s, queue: currentTrack ? [currentTrack] : [], index: 0 }))
  }

  return (
    <PlayerContext.Provider
      value={{
        playerState,
        currentTrack,
        playTrack,
        togglePlayPause,
        nextTrack,
        previousTrack,
        seekTo,
        setVolume,
        toggleMute,
        toggleShuffle,
        cycleRepeat,
        addToQueue,
        removeFromQueue,
        clearQueue,
      }}
    >
      {children}
    </PlayerContext.Provider>
  )
}

export function useCatMusicPlayer() {
  const ctx = useContext(PlayerContext)
  if (!ctx) {
    throw new Error('useCatMusicPlayer must be used within a CatMusicPlayerProvider')
  }
  return ctx
}
