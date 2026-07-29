'use client'

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import type { Room } from 'livekit-client'
import { subscribeIncomingCalls, createCallChannel, broadcastCallInvite, subscribeAndWait, sendCallSignal } from '@/lib/calls/signaling'
import { supabase } from '@/lib/supabase/client'
import type { ActiveCall, CallType, CallInvitePayload } from '@/lib/calls/types'
import type { AppUser } from '@/components/chat-app'

export interface IncomingCall {
  callId: string
  conversationId: number
  callType: CallType
  callerId: string
  callerName: string
  callerImage: string | null
}

interface CallContextValue {
  activeCall: ActiveCall | null
  incoming: IncomingCall | null
  startOutgoingCall: (convId: number, type: CallType, calleeId: string, calleeName: string, calleeImage?: string | null) => void
  cancelOutgoingCall: () => void
  acceptIncomingCall: () => void
  rejectIncomingCall: () => void
  endCall: () => void
  room: Room | null
  setRoom: (room: Room | null) => void
}

const CallContext = createContext<CallContextValue | null>(null)

export function useCallContext() {
  const ctx = useContext(CallContext)
  if (!ctx) throw new Error('useCallContext must be used within CallProvider')
  return ctx
}

export function CallProvider({
  user,
  children,
}: {
  user: AppUser
  children: React.ReactNode
}) {
  const [activeCall, setActiveCall] = useState<ActiveCall | null>(null)
  const [incoming, setIncoming] = useState<IncomingCall | null>(null)
  const [room, setRoom] = useState<Room | null>(null)
  const [channel, setChannel] = useState<ReturnType<typeof createCallChannel> | null>(null)
  const ringTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const incomingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const unsub = subscribeIncomingCalls(user.id, (payload: CallInvitePayload) => {
      if (activeCall) {
        return
      }
      setIncoming({
        callId: payload.callId,
        conversationId: payload.conversationId,
        callType: payload.callType,
        callerId: payload.from,
        callerName: payload.fromName,
        callerImage: null,
      })
    })

    return () => unsub()
  }, [user.id, activeCall])

  // Auto-dismiss incoming call after 30s
  useEffect(() => {
    if (incomingTimeoutRef.current) {
      clearTimeout(incomingTimeoutRef.current)
      incomingTimeoutRef.current = null
    }
    if (incoming) {
      incomingTimeoutRef.current = setTimeout(() => {
        setIncoming(null)
      }, 30000)
    }
    return () => {
      if (incomingTimeoutRef.current) clearTimeout(incomingTimeoutRef.current)
    }
  }, [incoming])

  const startOutgoingCall = useCallback(
    async (convId: number, type: CallType, calleeId: string, calleeName: string, calleeImage?: string | null) => {
      const callId = crypto.randomUUID()
      setActiveCall({
        callId,
        conversationId: convId,
        callType: type,
        state: 'outgoing-ringing',
        peerName: calleeName,
        peerImage: calleeImage ?? null,
      })

      await broadcastCallInvite(
        {
          from: user.id,
          fromName: user.name,
          callId,
          conversationId: convId,
          callType: type,
        },
        calleeId,
      )

      const chan = createCallChannel(convId)
      await subscribeAndWait(chan)
      setChannel(chan)

      chan
        .on('broadcast', { event: 'call:accept' }, async () => {
          if (ringTimeoutRef.current) {
            clearTimeout(ringTimeoutRef.current)
            ringTimeoutRef.current = null
          }
          await fetchTokenAndJoin(callId, convId, type, calleeName, calleeImage ?? null)
        })
        .on('broadcast', { event: 'call:decline' }, () => {
          if (ringTimeoutRef.current) {
            clearTimeout(ringTimeoutRef.current)
            ringTimeoutRef.current = null
          }
          try { supabase.removeChannel(chan) } catch {}
          setActiveCall(null)
          setChannel(null)
        })
        .on('broadcast', { event: 'call:cancel' }, () => {
          if (ringTimeoutRef.current) {
            clearTimeout(ringTimeoutRef.current)
            ringTimeoutRef.current = null
          }
          try { supabase.removeChannel(chan) } catch {}
          setActiveCall(null)
          setChannel(null)
        })

      ringTimeoutRef.current = setTimeout(() => {
        setActiveCall((prev) => prev?.state === 'outgoing-ringing' ? { ...prev, state: 'no-answer' } : null)
        setTimeout(() => {
          try { supabase.removeChannel(chan) } catch {}
          setActiveCall(null)
          setChannel(null)
        }, 2500)
        ringTimeoutRef.current = null
      }, 30000)
      setChannel(chan)
    },
    [user.id, user.name],
  )

  const fetchTokenAndJoin = useCallback(
    async (callId: string, convId: number, type: CallType, peerName: string, peerImage: string | null) => {
      try {
        const res = await fetch('/api/livekit/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ conversationId: convId }),
        })
        if (!res.ok) throw new Error('Token fetch failed')
        const { token, url } = await res.json()
        setActiveCall({
          callId,
          conversationId: convId,
          callType: type,
          state: 'in-call',
          peerName,
          peerImage,
          token,
          livekitUrl: url,
        })
      } catch {
        setActiveCall(null)
        setChannel(null)
      }
    },
    [],
  )

  const acceptIncomingCall = useCallback(async () => {
    if (!incoming) return

    const chan = createCallChannel(incoming.conversationId)
    await subscribeAndWait(chan)
    setChannel(chan)

    await sendCallSignal(chan, 'call:accept', {
      from: user.id,
      callId: incoming.callId,
    })

    await fetchTokenAndJoin(
      incoming.callId,
      incoming.conversationId,
      incoming.callType,
      incoming.callerName,
      incoming.callerImage,
    )
    setIncoming(null)
  }, [incoming, user.id, fetchTokenAndJoin])

  const rejectIncomingCall = useCallback(async () => {
    if (!incoming) return
    const chan = createCallChannel(incoming.conversationId)
    await subscribeAndWait(chan)
    await sendCallSignal(chan, 'call:decline', {
      from: user.id,
      callId: incoming.callId,
    })
    try { supabase.removeChannel(chan) } catch {}
    setIncoming(null)
  }, [incoming, user.id])

  const cancelOutgoingCall = useCallback(() => {
    if (channel) {
      sendCallSignal(channel, 'call:cancel', { from: user.id }).catch(() => {})
      try { supabase.removeChannel(channel) } catch {}
    }
    if (ringTimeoutRef.current) {
      clearTimeout(ringTimeoutRef.current)
      ringTimeoutRef.current = null
    }
    setActiveCall(null)
    setChannel(null)
  }, [channel, user.id])

  const endCall = useCallback(() => {
    if (room) {
      try { room.disconnect() } catch {}
    }
    if (channel) {
      try { supabase.removeChannel(channel) } catch {}
    }
    setActiveCall(null)
    setChannel(null)
    setRoom(null)
  }, [room, channel])

  return (
    <CallContext.Provider
      value={{
        activeCall,
        incoming,
        startOutgoingCall,
        cancelOutgoingCall,
        acceptIncomingCall,
        rejectIncomingCall,
        endCall,
        room,
        setRoom,
      }}
    >
      {children}
    </CallContext.Provider>
  )
}
