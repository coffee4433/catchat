'use client'

import type { PlayerState, RepeatMode, Track } from './types'

type Listener = () => void

const STORAGE_KEY = 'catmusic-player-v1'

/** Only these survive a reload — transient playback flags must not. */
type PersistedPlayerState = {
  queue: Track[]
  index: number
  volume: number
  muted: boolean
  shuffle: boolean
  repeat: RepeatMode
}

const initialPlayerState: PlayerState = {
  queue: [], // Starts empty - no song loaded until user plays a track
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
}

const REPEAT_MODES: RepeatMode[] = ['off', 'all', 'one']

function isTrack(value: unknown): value is Track {
  if (!value || typeof value !== 'object') return false
  const t = value as Partial<Track>
  return typeof t.id === 'string' && t.id.length > 0 && typeof t.title === 'string'
}

/** Defensive read: the payload comes from user-editable storage. */
function readPersisted(): Partial<PersistedPlayerState> | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<PersistedPlayerState>
    const out: Partial<PersistedPlayerState> = {}

    if (Array.isArray(parsed.queue)) out.queue = parsed.queue.filter(isTrack)
    if (typeof parsed.index === 'number' && parsed.index >= 0) out.index = Math.floor(parsed.index)
    if (typeof parsed.volume === 'number') out.volume = Math.max(0, Math.min(100, parsed.volume))
    if (typeof parsed.muted === 'boolean') out.muted = parsed.muted
    if (typeof parsed.shuffle === 'boolean') out.shuffle = parsed.shuffle
    if (typeof parsed.repeat === 'string' && REPEAT_MODES.includes(parsed.repeat as RepeatMode)) {
      out.repeat = parsed.repeat as RepeatMode
    }

    // An index past the end of a restored queue would render a blank player.
    if (out.queue && out.index !== undefined && out.index >= out.queue.length) {
      out.index = out.queue.length > 0 ? out.queue.length - 1 : 0
    }

    return out
  } catch {
    return null
  }
}

class CatMusicStoreManager {
  private listeners = new Set<Listener>()
  private state: PlayerState = initialPlayerState
  private hydrated = false
  private restored = new Set<keyof PersistedPlayerState>()
  private saveTimer: ReturnType<typeof setTimeout> | null = null

  getSnapshot = (): PlayerState => {
    return this.state
  }

  /**
   * Stable snapshot for SSR. Hydration happens later from an effect, so the
   * server and the first client render always agree.
   */
  getServerSnapshot = (): PlayerState => {
    return initialPlayerState
  }

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  /** Restores the persisted slice. Safe to call more than once. */
  hydrate = () => {
    if (this.hydrated || typeof window === 'undefined') return
    this.hydrated = true
    const persisted = readPersisted()
    if (persisted && Object.keys(persisted).length > 0) {
      for (const key of Object.keys(persisted) as (keyof PersistedPlayerState)[]) {
        this.restored.add(key)
      }
      this.state = { ...this.state, ...persisted }
      this.listeners.forEach((fn) => fn())
    }
  }

  /**
   * Whether a field came back from storage. Lets the caller tell "the user
   * chose 80" apart from "80 is just the default", so a first-run preference
   * can be applied without overwriting a real choice.
   */
  wasRestored = (key: keyof PersistedPlayerState): boolean => {
    return this.restored.has(key)
  }

  setState(partial: Partial<PlayerState> | ((prev: PlayerState) => Partial<PlayerState>)) {
    const nextPartial = typeof partial === 'function' ? partial(this.state) : partial
    this.state = { ...this.state, ...nextPartial }
    this.listeners.forEach((fn) => fn())
    this.schedulePersist(nextPartial)
  }

  private schedulePersist(changed: Partial<PlayerState>) {
    if (typeof window === 'undefined') return
    // Position/duration tick twice a second; persisting those would be churn.
    const relevant: (keyof PersistedPlayerState)[] = [
      'queue',
      'index',
      'volume',
      'muted',
      'shuffle',
      'repeat',
    ]
    if (!relevant.some((key) => key in changed)) return

    if (this.saveTimer) clearTimeout(this.saveTimer)
    this.saveTimer = setTimeout(() => this.persist(), 500)
  }

  private persist() {
    try {
      const { queue, index, volume, muted, shuffle, repeat } = this.state
      const payload: PersistedPlayerState = { queue, index, volume, muted, shuffle, repeat }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
    } catch {
      // Private mode or a full quota: playback must not break over this.
    }
  }
}

export const catMusicStore = new CatMusicStoreManager()
