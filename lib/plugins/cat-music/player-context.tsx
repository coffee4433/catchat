'use client'

import React, { createContext, useContext, useEffect, useRef, useSyncExternalStore } from 'react'
import type { PlayerState, RepeatMode, Track } from './types'
import { SEED_TRACKS } from './catalog'
import { loadYouTubeIframeApi } from './youtube'
import { catMusicStore } from './cat-music-store'

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
  stopPlayback: () => void
}

const PlayerContext = createContext<PlayerContextType | null>(null)

export function CatMusicPlayerProvider({ children }: { children: React.ReactNode }) {
  const playerState = useSyncExternalStore(
    catMusicStore.subscribe,
    catMusicStore.getSnapshot,
    catMusicStore.getSnapshot,
  )

  const ytPlayerRef = useRef<any>(null)
  const animFrameRef = useRef<number | null>(null)
  const isSeekingRef = useRef(false)

  const currentTrack = playerState.queue[playerState.index] || null

  // Initialize YT Player once inside isolated hidden container outside React VDOM
  useEffect(() => {
    let mounted = true

    loadYouTubeIframeApi().then((YT) => {
      if (!mounted) return
      if (ytPlayerRef.current) return

      let container = document.getElementById('cat-music-yt-container')
      if (!container) {
        container = document.createElement('div')
        container.id = 'cat-music-yt-container'
        container.style.position = 'fixed'
        container.style.top = '-9999px'
        container.style.left = '-9999px'
        container.style.width = '1px'
        container.style.height = '1px'
        container.style.opacity = '0'
        container.style.pointerEvents = 'none'
        container.style.zIndex = '-9999'
        const iframeTarget = document.createElement('div')
        iframeTarget.id = 'cat-music-yt-iframe'
        container.appendChild(iframeTarget)
        document.body.appendChild(container)
      }

      try {
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
                ytPlayerRef.current.setVolume(catMusicStore.getSnapshot().volume)
              }
            },
            onStateChange: (event: any) => {
              if (event.data === 1) {
                catMusicStore.setState({ isPlaying: true, isBuffering: false, error: null })
              } else if (event.data === 2) {
                catMusicStore.setState({ isPlaying: false, isBuffering: false })
              } else if (event.data === 3) {
                catMusicStore.setState({ isBuffering: true })
              } else if (event.data === 0) {
                handleTrackEnded()
              }
            },
            onError: () => {
              catMusicStore.setState({
                error: 'Vídeo o audio no disponible. Saltando a la siguiente canción...',
              })
              setTimeout(() => nextTrack(), 1500)
            },
          },
        })
      } catch {
        // Suppress initial YT init errors
      }
    })

    return () => {
      mounted = false
    }
  }, [])

  // Position ticker via rAF (throttled to avoid frame drops)
  useEffect(() => {
    let lastTick = 0

    const tick = (now: number) => {
      if (now - lastTick > 500) {
        lastTick = now
        if (ytPlayerRef.current && typeof ytPlayerRef.current.getCurrentTime === 'function' && !isSeekingRef.current) {
          const currentTime = ytPlayerRef.current.getCurrentTime() || 0
          const dur = ytPlayerRef.current.getDuration() || currentTrack?.durationSeconds || 180
          const currentState = catMusicStore.getSnapshot()
          if (Math.abs(currentState.position - currentTime) >= 0.5 || currentState.duration !== dur) {
            catMusicStore.setState({ position: currentTime, duration: dur })
          }
        }
      }
      if (catMusicStore.getSnapshot().isPlaying) {
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
    const s = catMusicStore.getSnapshot()
    if (s.repeat === 'one') {
      if (ytPlayerRef.current?.seekTo) {
        ytPlayerRef.current.seekTo(0, true)
        ytPlayerRef.current.playVideo()
      }
      return
    }

    let nextIndex = s.index + 1
    if (nextIndex >= s.queue.length) {
      if (s.repeat === 'all') {
        nextIndex = 0
      } else {
        catMusicStore.setState({ isPlaying: false, position: 0 })
        return
      }
    }

    const nextTr = s.queue[nextIndex]
    if (nextTr && ytPlayerRef.current?.loadVideoById) {
      ytPlayerRef.current.loadVideoById(nextTr.id)
    }

    catMusicStore.setState({ index: nextIndex, position: 0 })
  }

  const playTrack = (track: Track, newQueue?: Track[], context?: { type: string; id?: string }) => {
    const s = catMusicStore.getSnapshot()
    const queueToUse = newQueue || s.queue
    let trackIndex = queueToUse.findIndex((t) => t.id === track.id)
    if (trackIndex < 0) {
      queueToUse.push(track)
      trackIndex = queueToUse.length - 1
    }

    catMusicStore.setState({
      queue: queueToUse,
      index: trackIndex,
      isPlaying: true,
      position: 0,
      context: context || s.context,
      error: null,
    })

    if (ytPlayerRef.current?.loadVideoById) {
      ytPlayerRef.current.loadVideoById(track.id)
    }
  }

  const togglePlayPause = () => {
    if (!ytPlayerRef.current) return
    const s = catMusicStore.getSnapshot()

    if (s.isPlaying) {
      ytPlayerRef.current.pauseVideo?.()
      catMusicStore.setState({ isPlaying: false })
    } else {
      ytPlayerRef.current.playVideo?.()
      catMusicStore.setState({ isPlaying: true })
    }
  }

  const nextTrack = () => {
    const s = catMusicStore.getSnapshot()
    if (s.queue.length === 0) return
    let nextIdx = s.index + 1
    if (nextIdx >= s.queue.length) nextIdx = 0
    const nextTr = s.queue[nextIdx]
    if (nextTr && ytPlayerRef.current?.loadVideoById) {
      ytPlayerRef.current.loadVideoById(nextTr.id)
    }
    catMusicStore.setState({ index: nextIdx, isPlaying: true, position: 0 })
  }

  const previousTrack = () => {
    const s = catMusicStore.getSnapshot()
    if (s.queue.length === 0) return
    if (s.position > 3) {
      ytPlayerRef.current?.seekTo?.(0, true)
      catMusicStore.setState({ position: 0 })
      return
    }
    let prevIdx = s.index - 1
    if (prevIdx < 0) prevIdx = s.queue.length - 1
    const prevTr = s.queue[prevIdx]
    if (prevTr && ytPlayerRef.current?.loadVideoById) {
      ytPlayerRef.current.loadVideoById(prevTr.id)
    }
    catMusicStore.setState({ index: prevIdx, isPlaying: true, position: 0 })
  }

  const seekTo = (seconds: number) => {
    isSeekingRef.current = true
    catMusicStore.setState({ position: seconds })
    if (ytPlayerRef.current?.seekTo) {
      ytPlayerRef.current.seekTo(seconds, true)
    }
    setTimeout(() => {
      isSeekingRef.current = false
    }, 300)
  }

  const setVolume = (vol: number) => {
    const clamped = Math.max(0, Math.min(100, vol))
    catMusicStore.setState({ volume: clamped, muted: clamped === 0 })
    if (ytPlayerRef.current?.setVolume) {
      ytPlayerRef.current.setVolume(clamped)
    }
  }

  const toggleMute = () => {
    const s = catMusicStore.getSnapshot()
    const nextMuted = !s.muted
    if (ytPlayerRef.current) {
      if (nextMuted) ytPlayerRef.current.mute?.()
      else ytPlayerRef.current.unMute?.()
    }
    catMusicStore.setState({ muted: nextMuted })
  }

  const toggleShuffle = () => {
    const s = catMusicStore.getSnapshot()
    const nextShuffle = !s.shuffle
    let nextQueue = [...s.queue]
    if (nextShuffle && nextQueue.length > 1) {
      const currentTr = nextQueue[s.index]
      const rest = nextQueue.filter((_, i) => i !== s.index)
      for (let i = rest.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[rest[i], rest[j]] = [rest[j], rest[i]]
      }
      nextQueue = [currentTr, ...rest]
      catMusicStore.setState({ shuffle: true, queue: nextQueue, index: 0 })
      return
    }
    catMusicStore.setState({ shuffle: false })
  }

  const cycleRepeat = () => {
    const s = catMusicStore.getSnapshot()
    const modes: RepeatMode[] = ['off', 'all', 'one']
    const currentIdx = modes.indexOf(s.repeat)
    const nextMode = modes[(currentIdx + 1) % modes.length]
    catMusicStore.setState({ repeat: nextMode })
  }

  const addToQueue = (track: Track) => {
    const s = catMusicStore.getSnapshot()
    catMusicStore.setState({ queue: [...s.queue, track] })
  }

  const removeFromQueue = (idx: number) => {
    const s = catMusicStore.getSnapshot()
    const newQ = s.queue.filter((_, i) => i !== idx)
    let newIdx = s.index
    if (idx < s.index) newIdx -= 1
    if (newIdx >= newQ.length) newIdx = Math.max(0, newQ.length - 1)
    catMusicStore.setState({ queue: newQ, index: newIdx })
  }

  const clearQueue = () => {
    catMusicStore.setState({ queue: currentTrack ? [currentTrack] : [], index: 0 })
  }

  const stopPlayback = () => {
    if (ytPlayerRef.current) {
      ytPlayerRef.current.stopVideo?.()
      ytPlayerRef.current.pauseVideo?.()
    }
    catMusicStore.setState({ queue: [], index: 0, isPlaying: false, isBuffering: false, position: 0, duration: 0 })
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
        stopPlayback,
      }}
    >
      {children}
    </PlayerContext.Provider>
  )
}

const defaultPlayerContext: PlayerContextType = {
  playerState: {
    queue: [],
    index: 0,
    isPlaying: false,
    isBuffering: false,
    position: 0,
    duration: 0,
    volume: 80,
    muted: false,
    shuffle: false,
    repeat: 'off',
    context: null,
    error: null,
  },
  currentTrack: null,
  playTrack: () => {},
  togglePlayPause: () => {},
  nextTrack: () => {},
  previousTrack: () => {},
  seekTo: () => {},
  setVolume: () => {},
  toggleMute: () => {},
  toggleShuffle: () => {},
  cycleRepeat: () => {},
  addToQueue: () => {},
  removeFromQueue: () => {},
  clearQueue: () => {},
  stopPlayback: () => {},
}

export function useCatMusicPlayer() {
  const ctx = useContext(PlayerContext)
  return ctx || defaultPlayerContext
}
