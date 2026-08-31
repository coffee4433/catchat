'use client'

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useSyncExternalStore,
} from 'react'
import type { PlayerState, RepeatMode, Track } from './types'
import { SEED_TRACKS } from './catalog'
import { ARTWORK_DIMENSIONS, getArtworkUrl, loadYouTubeIframeApi } from './youtube'
import { catMusicStore } from './cat-music-store'
import { useLibrary } from './library-context'

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

/** Twice a second is enough for a progress bar and cheap enough in a timer. */
const TICK_MS = 500

/** Grace period before skipping an unplayable video, so the error is readable. */
const ERROR_SKIP_DELAY_MS = 1500

/** Under this, a play was a skip-through and doesn't belong in the history. */
const MIN_HISTORY_MS = 5000

/** Restored when unmuting from a muted-at-zero state. */
const FALLBACK_UNMUTE_VOLUME = 50

const REPEAT_MODES: RepeatMode[] = ['off', 'all', 'one']

export function CatMusicPlayerProvider({
  children,
  active = true,
}: {
  children: React.ReactNode
  active?: boolean
}) {
  const playerState = useSyncExternalStore(
    catMusicStore.subscribe,
    catMusicStore.getSnapshot,
    catMusicStore.getServerSnapshot,
  )

  const { recordPlay, settings } = useLibrary()

  const ytPlayerRef = useRef<any>(null)
  const isSeekingRef = useRef(false)
  const seekResetRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const errorSkipRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const preMuteVolumeRef = useRef<number>(playerState.volume)

  // Latest-value refs: the YouTube event handlers are registered once, so they
  // must not close over a specific render's props.
  const recordPlayRef = useRef(recordPlay)
  recordPlayRef.current = recordPlay
  const autoplayRef = useRef(settings.autoplay)
  autoplayRef.current = settings.autoplay

  const currentTrack = playerState.queue[playerState.index] || null

  /** Restore volume/queue/shuffle/repeat from the previous session. */
  useEffect(() => {
    catMusicStore.hydrate()
  }, [])

  const clearErrorSkip = useCallback(() => {
    if (errorSkipRef.current) {
      clearTimeout(errorSkipRef.current)
      errorSkipRef.current = null
    }
  }, [])

  /** Writes the outgoing track to the listening history. */
  const commitHistory = useCallback((track: Track | null, seconds: number, completed: boolean) => {
    if (!track) return
    const ms = Math.round(Math.max(0, seconds) * 1000)
    if (!completed && ms < MIN_HISTORY_MS) return
    recordPlayRef.current(track, ms, completed)
  }, [])

  /** Loads a queue position into the iframe, recording the outgoing track. */
  const goToIndex = useCallback(
    (nextIndex: number, options: { play?: boolean; completed?: boolean } = {}) => {
      const { play = true, completed = false } = options
      const s = catMusicStore.getSnapshot()
      const outgoing = s.queue[s.index] || null
      const target = s.queue[nextIndex]
      if (!target) return

      clearErrorSkip()
      if (outgoing && outgoing.id !== target.id) {
        commitHistory(outgoing, completed ? s.duration || s.position : s.position, completed)
      }

      const yt = ytPlayerRef.current
      if (yt?.loadVideoById) {
        if (play) yt.loadVideoById(target.id)
        else yt.cueVideoById?.(target.id)
      }
      catMusicStore.setState({ index: nextIndex, position: 0, isPlaying: play, error: null })
    },
    [clearErrorSkip, commitHistory],
  )

  const handleTrackEnded = useCallback(() => {
    const s = catMusicStore.getSnapshot()
    const ended = s.queue[s.index] || null

    if (s.repeat === 'one') {
      commitHistory(ended, s.duration || s.position, true)
      const yt = ytPlayerRef.current
      if (yt?.seekTo) {
        yt.seekTo(0, true)
        yt.playVideo?.()
      }
      catMusicStore.setState({ position: 0, isPlaying: true })
      return
    }

    const isLast = s.index + 1 >= s.queue.length

    // `autoplay: false` means "stop when this track ends" — but an explicit
    // repeat setting is a stronger, more specific signal, so it still wins.
    if (!autoplayRef.current && s.repeat === 'off') {
      commitHistory(ended, s.duration || s.position, true)
      catMusicStore.setState({ isPlaying: false, position: 0 })
      return
    }

    if (isLast && s.repeat !== 'all') {
      commitHistory(ended, s.duration || s.position, true)
      catMusicStore.setState({ isPlaying: false, position: 0 })
      return
    }

    goToIndex(isLast ? 0 : s.index + 1, { play: true, completed: true })
  }, [commitHistory, goToIndex])

  const nextTrack = useCallback(() => {
    const s = catMusicStore.getSnapshot()
    if (s.queue.length === 0) return
    const isLast = s.index + 1 >= s.queue.length

    // A manual press always advances, even under `repeat: 'one'` — trapping the
    // user on one track would make the button look broken. At the very end,
    // only `repeat: 'all'` wraps around; otherwise playback stops.
    if (isLast && s.repeat !== 'all') {
      clearErrorSkip()
      const yt = ytPlayerRef.current
      commitHistory(s.queue[s.index] || null, s.position, false)
      yt?.pauseVideo?.()
      yt?.seekTo?.(0, true)
      catMusicStore.setState({ isPlaying: false, position: 0 })
      return
    }

    goToIndex(isLast ? 0 : s.index + 1)
  }, [clearErrorSkip, commitHistory, goToIndex])

  const previousTrack = useCallback(() => {
    const s = catMusicStore.getSnapshot()
    if (s.queue.length === 0) return
    if (s.position > 3) {
      ytPlayerRef.current?.seekTo?.(0, true)
      catMusicStore.setState({ position: 0 })
      return
    }
    const prevIdx = s.index - 1 < 0 ? s.queue.length - 1 : s.index - 1
    goToIndex(prevIdx)
  }, [goToIndex])

  // The player lives in a hidden container outside the React tree so a re-render
  // can never unmount the iframe mid-song.
  useEffect(() => {
    if (!active) return
    let mounted = true

    loadYouTubeIframeApi().then((YT) => {
      if (!mounted || ytPlayerRef.current) return

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

      // Read the queue at init time instead of depending on `currentTrack`:
      // re-running this effect per track change would rebuild the iframe.
      const bootTrack = (() => {
        const s = catMusicStore.getSnapshot()
        return s.queue[s.index] || null
      })()

      try {
        ytPlayerRef.current = new YT.Player('cat-music-yt-iframe', {
          height: '200',
          width: '200',
          videoId: bootTrack ? bootTrack.id : SEED_TRACKS[0].id,
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
              const s = catMusicStore.getSnapshot()
              ytPlayerRef.current?.setVolume?.(s.volume)
              if (s.muted) ytPlayerRef.current?.mute?.()
            },
            onStateChange: (event: any) => {
              if (event.data === 1) {
                catMusicStore.setState({ isPlaying: true, isBuffering: false, error: null })
              } else if (event.data === 2) {
                catMusicStore.setState({ isPlaying: false, isBuffering: false })
              } else if (event.data === 3) {
                catMusicStore.setState({ isBuffering: true })
              } else if (event.data === 0) {
                handlersRef.current.handleTrackEnded()
              }
            },
            onError: () => {
              catMusicStore.setState({ isBuffering: false, error: 'unavailable' })
              if (errorSkipRef.current) clearTimeout(errorSkipRef.current)
              errorSkipRef.current = setTimeout(() => {
                errorSkipRef.current = null
                handlersRef.current.nextTrack()
              }, ERROR_SKIP_DELAY_MS)
            },
          },
        })
      } catch {
        // A blocked or sandboxed iframe must not take the whole app down.
      }
    })

    return () => {
      mounted = false
    }
  }, [active])

  // Every pending timer has to die with the provider, or a skip fires into a
  // torn-down tree.
  useEffect(() => {
    return () => {
      if (errorSkipRef.current) clearTimeout(errorSkipRef.current)
      if (seekResetRef.current) clearTimeout(seekResetRef.current)
    }
  }, [])

  // A timer, not requestAnimationFrame: rAF is frozen in a background tab, so
  // the progress bar and the OS scrubber used to stall while audio kept going.
  useEffect(() => {
    if (!active || !playerState.isPlaying) return

    const id = setInterval(() => {
      const yt = ytPlayerRef.current
      if (!yt || typeof yt.getCurrentTime !== 'function' || isSeekingRef.current) return

      const s = catMusicStore.getSnapshot()
      const position = yt.getCurrentTime() || 0
      const duration = yt.getDuration?.() || s.queue[s.index]?.durationSeconds || 0

      if (Math.abs(s.position - position) >= 0.25 || s.duration !== duration) {
        catMusicStore.setState({ position, duration })
      }

      if (duration > 0 && typeof navigator !== 'undefined' && 'mediaSession' in navigator) {
        try {
          navigator.mediaSession.setPositionState?.({
            duration,
            position: Math.min(position, duration),
            playbackRate: 1,
          })
        } catch {
          // Safari rejects a position past the duration; not worth reporting.
        }
      }
    }, TICK_MS)

    return () => clearInterval(id)
  }, [active, playerState.isPlaying])

  const togglePlayPause = useCallback(() => {
    const yt = ytPlayerRef.current
    if (!yt) return
    clearErrorSkip()
    const s = catMusicStore.getSnapshot()

    if (s.isPlaying) {
      yt.pauseVideo?.()
      catMusicStore.setState({ isPlaying: false })
    } else {
      yt.playVideo?.()
      catMusicStore.setState({ isPlaying: true, error: null })
    }
  }, [clearErrorSkip])

  const seekTo = useCallback((seconds: number) => {
    isSeekingRef.current = true
    catMusicStore.setState({ position: seconds })
    ytPlayerRef.current?.seekTo?.(seconds, true)
    if (seekResetRef.current) clearTimeout(seekResetRef.current)
    seekResetRef.current = setTimeout(() => {
      seekResetRef.current = null
      isSeekingRef.current = false
    }, 300)
  }, [])

  const setVolume = useCallback((vol: number) => {
    const clamped = Math.max(0, Math.min(100, Math.round(vol)))
    if (clamped > 0) preMuteVolumeRef.current = clamped
    const yt = ytPlayerRef.current
    yt?.setVolume?.(clamped)
    // Dragging the slider off zero has to lift the iframe's own mute flag, or
    // the volume change applies to a still-silent player.
    if (clamped === 0) yt?.mute?.()
    else yt?.unMute?.()
    catMusicStore.setState({ volume: clamped, muted: clamped === 0 })
  }, [])

  const toggleMute = useCallback(() => {
    const s = catMusicStore.getSnapshot()
    const yt = ytPlayerRef.current

    if (s.muted) {
      // Unmuting from volume 0 has to restore an audible level, otherwise the
      // button reports "unmuted" and nothing comes out.
      const restored = s.volume > 0 ? s.volume : preMuteVolumeRef.current || FALLBACK_UNMUTE_VOLUME
      yt?.unMute?.()
      yt?.setVolume?.(restored)
      catMusicStore.setState({ muted: false, volume: restored })
      return
    }

    if (s.volume > 0) preMuteVolumeRef.current = s.volume
    yt?.mute?.()
    catMusicStore.setState({ muted: true })
  }, [])

  const toggleShuffle = useCallback(() => {
    const s = catMusicStore.getSnapshot()
    if (!s.shuffle && s.queue.length > 1) {
      const currentTr = s.queue[s.index]
      const rest = s.queue.filter((_, i) => i !== s.index)
      for (let i = rest.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[rest[i], rest[j]] = [rest[j], rest[i]]
      }
      catMusicStore.setState({ shuffle: true, queue: [currentTr, ...rest], index: 0 })
      return
    }
    catMusicStore.setState({ shuffle: false })
  }, [])

  const cycleRepeat = useCallback(() => {
    const s = catMusicStore.getSnapshot()
    const currentIdx = REPEAT_MODES.indexOf(s.repeat)
    catMusicStore.setState({ repeat: REPEAT_MODES[(currentIdx + 1) % REPEAT_MODES.length] })
  }, [])

  const playTrack = useCallback(
    (track: Track, newQueue?: Track[], context?: { type: string; id?: string }) => {
      const s = catMusicStore.getSnapshot()
      // Copy: `newQueue` is often a caller's state array or a module constant,
      // and pushing into it mutated data nobody expected to change.
      const queue = [...(newQueue ?? s.queue)]

      let trackIndex = queue.findIndex((t) => t.id === track.id)
      if (trackIndex < 0) {
        queue.push(track)
        trackIndex = queue.length - 1
      }

      clearErrorSkip()
      const outgoing = s.queue[s.index] || null
      if (outgoing && outgoing.id !== track.id) {
        commitHistory(outgoing, s.position, false)
      }

      catMusicStore.setState({
        queue,
        index: trackIndex,
        isPlaying: true,
        position: 0,
        duration: track.durationSeconds || 0,
        context: context || s.context,
        error: null,
      })

      ytPlayerRef.current?.loadVideoById?.(track.id)
    },
    [clearErrorSkip, commitHistory],
  )

  const addToQueue = useCallback((track: Track) => {
    const s = catMusicStore.getSnapshot()
    if (s.queue.some((t) => t.id === track.id)) return
    catMusicStore.setState({ queue: [...s.queue, track] })
  }, [])

  const removeFromQueue = useCallback(
    (idx: number) => {
      const s = catMusicStore.getSnapshot()
      if (idx < 0 || idx >= s.queue.length) return

      const removingCurrent = idx === s.index
      const newQ = s.queue.filter((_, i) => i !== idx)

      if (newQ.length === 0) {
        clearErrorSkip()
        ytPlayerRef.current?.stopVideo?.()
        catMusicStore.setState({
          queue: [],
          index: 0,
          isPlaying: false,
          isBuffering: false,
          position: 0,
          duration: 0,
        })
        return
      }

      let newIdx = s.index
      if (idx < s.index) newIdx -= 1
      if (newIdx >= newQ.length) newIdx = newQ.length - 1

      // Dropping the playing track used to leave the iframe on the old video
      // while the UI showed a different one.
      if (removingCurrent) {
        clearErrorSkip()
        const target = newQ[newIdx]
        const yt = ytPlayerRef.current
        if (s.isPlaying) yt?.loadVideoById?.(target.id)
        else yt?.cueVideoById?.(target.id)
        catMusicStore.setState({ queue: newQ, index: newIdx, position: 0, duration: 0 })
        return
      }

      catMusicStore.setState({ queue: newQ, index: newIdx })
    },
    [clearErrorSkip],
  )

  const clearQueue = useCallback(() => {
    const s = catMusicStore.getSnapshot()
    const keep = s.queue[s.index]
    catMusicStore.setState({ queue: keep ? [keep] : [], index: 0 })
  }, [])

  const stopPlayback = useCallback(() => {
    clearErrorSkip()
    const s = catMusicStore.getSnapshot()
    commitHistory(s.queue[s.index] || null, s.position, false)
    const yt = ytPlayerRef.current
    yt?.stopVideo?.()
    yt?.pauseVideo?.()
    catMusicStore.setState({
      queue: [],
      index: 0,
      isPlaying: false,
      isBuffering: false,
      position: 0,
      duration: 0,
      context: null,
      error: null,
    })
  }, [clearErrorSkip, commitHistory])

  // Bridge for the once-registered YouTube callbacks. Written in an effect
  // rather than during render: the iframe can only call back after mount, so
  // committing the latest handlers post-commit is both correct and lint-clean.
  const handlersRef = useRef({ handleTrackEnded, nextTrack })
  useEffect(() => {
    handlersRef.current = { handleTrackEnded, nextTrack }
  }, [handleTrackEnded, nextTrack])

  // First run only: adopt the saved default volume. A volume that came back from
  // storage is a real user choice and must not be overwritten.
  const defaultVolumeAppliedRef = useRef(false)
  useEffect(() => {
    if (!active || defaultVolumeAppliedRef.current) return
    if (catMusicStore.wasRestored('volume')) {
      defaultVolumeAppliedRef.current = true
      return
    }
    const preferred = settings.defaultVolume
    if (typeof preferred !== 'number' || preferred < 0 || preferred > 100) return
    if (preferred === catMusicStore.getSnapshot().volume) return
    defaultVolumeAppliedRef.current = true
    setVolume(preferred)
  }, [active, settings.defaultVolume, setVolume])

  // OS-level media controls (lock screen, media keys, headset buttons).
  useEffect(() => {
    if (!active || typeof navigator === 'undefined' || !('mediaSession' in navigator)) return

    const ms = navigator.mediaSession
    if (!currentTrack) {
      ms.metadata = null
      ms.playbackState = 'none'
      return
    }

    // Offer both sizes and label them honestly — the OS picks per surface, and
    // a lock screen given a 320x180 image tagged 512x512 renders it blurry.
    const artwork: MediaImage[] = [
      {
        src: getArtworkUrl(currentTrack.id, 'mq'),
        sizes: ARTWORK_DIMENSIONS.mq,
        type: 'image/jpeg',
      },
      {
        src: getArtworkUrl(currentTrack.id, 'hq'),
        sizes: ARTWORK_DIMENSIONS.hq,
        type: 'image/jpeg',
      },
    ]

    ms.metadata = new MediaMetadata({
      title: currentTrack.title,
      artist: currentTrack.artist,
      album: currentTrack.album || 'CatMusic',
      artwork: currentTrack.source === 'youtube' ? artwork : [{ src: currentTrack.artworkUrl }],
    })

    // Each action gets its own handler: mapping play and pause both to a toggle
    // desynced the OS widget whenever it and the app disagreed on state.
    const handlers: [MediaSessionAction, MediaSessionActionHandler][] = [
      [
        'play',
        () => {
          if (!catMusicStore.getSnapshot().isPlaying) togglePlayPause()
        },
      ],
      [
        'pause',
        () => {
          if (catMusicStore.getSnapshot().isPlaying) togglePlayPause()
        },
      ],
      ['previoustrack', () => previousTrack()],
      ['nexttrack', () => nextTrack()],
      ['stop', () => stopPlayback()],
      [
        'seekbackward',
        (details) => {
          const by = details?.seekOffset ?? 10
          seekTo(Math.max(0, catMusicStore.getSnapshot().position - by))
        },
      ],
      [
        'seekforward',
        (details) => {
          const by = details?.seekOffset ?? 10
          const s = catMusicStore.getSnapshot()
          seekTo(Math.min(s.duration || Number.MAX_SAFE_INTEGER, s.position + by))
        },
      ],
      [
        'seekto',
        (details) => {
          if (typeof details?.seekTime === 'number') seekTo(details.seekTime)
        },
      ],
    ]

    for (const [action, handler] of handlers) {
      try {
        ms.setActionHandler(action, handler)
      } catch {
        // Older browsers throw on unknown actions instead of ignoring them.
      }
    }

    return () => {
      for (const [action] of handlers) {
        try {
          ms.setActionHandler(action, null)
        } catch {
          // Same as above.
        }
      }
    }
  }, [active, currentTrack, nextTrack, previousTrack, seekTo, stopPlayback, togglePlayPause])

  // Keep the OS widget's play/pause icon in step with the app.
  useEffect(() => {
    if (!active || typeof navigator === 'undefined' || !('mediaSession' in navigator)) return
    navigator.mediaSession.playbackState = currentTrack
      ? playerState.isPlaying
        ? 'playing'
        : 'paused'
      : 'none'
  }, [active, currentTrack, playerState.isPlaying])

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
