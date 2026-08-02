'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import type { RealtimeChannel } from '@supabase/supabase-js'

export type RemotePlayerState = {
  id: string
  name: string
  position: [number, number, number]
  rotation: number // yaw angle
  health: number
  action: string
  timestamp: number
}

export type DamageEvent = {
  fromId: string
  fromName: string
  toId: string
  damage: number
}

type MultiplayerState = {
  remotePlayers: Map<string, RemotePlayerState>
  sendState: (state: Omit<RemotePlayerState, 'timestamp'>) => void
  sendDamage: (event: DamageEvent) => void
  onDamage: (callback: (event: DamageEvent) => void) => () => void
  health: number
  setHealth: (h: number) => void
  maxHealth: number
}

export function useMultiplayer(userId: string, userName: string): MultiplayerState {
  const channelRef = useRef<RealtimeChannel | null>(null)
  const [remotePlayers, setRemotePlayers] = useState<Map<string, RemotePlayerState>>(new Map())
  const [health, setHealth] = useState(100)
  const damageCallbacks = useRef<Set<(e: DamageEvent) => void>>(new Set())
  const maxHealth = 100

  const sendState = useCallback(
    (state: Omit<RemotePlayerState, 'timestamp'>) => {
      if (!channelRef.current) return
      channelRef.current.send({
        type: 'broadcast',
        event: 'player_state',
        payload: { ...state, timestamp: Date.now() },
      })
    },
    [],
  )

  const sendDamage = useCallback(
    (event: DamageEvent) => {
      if (!channelRef.current) return
      channelRef.current.send({
        type: 'broadcast',
        event: 'player_damage',
        payload: event,
      })
    },
    [],
  )

  const onDamage = useCallback((callback: (event: DamageEvent) => void) => {
    damageCallbacks.current.add(callback)
    return () => {
      damageCallbacks.current.delete(callback)
    }
  }, [])

  useEffect(() => {
    if (!userId) return

    const channel = supabase.channel('tps-game', {
      config: { broadcast: { self: false } },
    })

    channel
      .on('broadcast', { event: 'player_state' }, ({ payload }) => {
        const state = payload as RemotePlayerState
        if (state.id === userId) return
        setRemotePlayers((prev) => {
          const next = new Map(prev)
          next.set(state.id, state)
          return next
        })
      })
      .on('broadcast', { event: 'player_damage' }, ({ payload }) => {
        const event = payload as DamageEvent
        if (event.toId === userId) {
          setHealth((prev) => Math.max(0, prev - event.damage))
        }
        for (const cb of damageCallbacks.current) {
          cb(event)
        }
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          channelRef.current = channel
        }
      })

    const cleanupInterval = setInterval(() => {
      setRemotePlayers((prev) => {
        const now = Date.now()
        const next = new Map(prev)
        let changed = false
        for (const [id, state] of next) {
          if (now - state.timestamp > 10000) {
            next.delete(id)
            changed = true
          }
        }
        return changed ? next : prev
      })
    }, 2000)

    return () => {
      channel.unsubscribe()
      supabase.removeChannel(channel)
      clearInterval(cleanupInterval)
    }
  }, [userId])

  return {
    remotePlayers,
    sendState,
    sendDamage,
    onDamage,
    health,
    setHealth,
    maxHealth,
  }
}
