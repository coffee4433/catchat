'use client'

import type { PlayerState } from './types'

type Listener = () => void

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

class CatMusicStoreManager {
  private listeners = new Set<Listener>()
  private state: PlayerState = initialPlayerState

  getSnapshot = (): PlayerState => {
    return this.state
  }

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  setState(partial: Partial<PlayerState> | ((prev: PlayerState) => Partial<PlayerState>)) {
    const nextPartial = typeof partial === 'function' ? partial(this.state) : partial
    this.state = { ...this.state, ...nextPartial }
    this.listeners.forEach((fn) => fn())
  }
}

export const catMusicStore = new CatMusicStoreManager()
