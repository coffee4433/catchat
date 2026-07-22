'use client'

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { subscribeIncomingCalls, createCallChannel, broadcastCallInvite, subscribeAndWait, sendCallSignal } from '@/lib/calls/signaling'
import type { ActiveCall, CallType, CallInvitePayload } from '@/lib/calls/types'
import type { AppUser } from '@/components/chat-app'
import { IncomingCallModal } from './incoming-call-modal'
import { CallRoom } from './call-room'

interface CallContextValue {
  activeCall: ActiveCall | null
  startOutgoingCall: (convId: number, type: CallType, calleeId: string, calleeName: string) => void
  endCall: () => void
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
  const [incoming, setIncoming] = useState<{
    callId: string
    conversationId: number
    callType: CallType
    callerId: string
    callerName: string
    callerImage: string | null
  } | null>(null)
  const [callerNameCache, setCallerNameCache] = useState<Record<string, string>>({})
  const [channel, setChannel] = useState<ReturnType<typeof createCallChannel> | null>(null)
  const ringTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const unsub = subscribeIncomingCalls(user.id, (payload: CallInvitePayload) => {
      if (activeCall) {
        return
      }
      setCallerNameCache((prev) => ({ ...prev, [payload.from]: payload.fromName }))
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

  const startOutgoingCall = useCallback(
    async (convId: number, type: CallType, calleeId: string, calleeName: string) => {
      const callId = crypto.randomUUID()
      setActiveCall({
        callId,
        conversationId: convId,
        callType: type,
        state: 'outgoing-ringing',
        peerName: calleeName,
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
          await fetchTokenAndJoin(callId, convId, type, calleeName)
        })
        .on('broadcast', { event: 'call:decline' }, () => {
          if (ringTimeoutRef.current) {
            clearTimeout(ringTimeoutRef.current)
            ringTimeoutRef.current = null
          }
          setActiveCall(null)
          setChannel(null)
        })
        .on('broadcast', { event: 'call:cancel' }, () => {
          if (ringTimeoutRef.current) {
            clearTimeout(ringTimeoutRef.current)
            ringTimeoutRef.current = null
          }
          setActiveCall(null)
          setChannel(null)
        })

      ringTimeoutRef.current = setTimeout(() => {
        setActiveCall(null)
        setChannel(null)
        ringTimeoutRef.current = null
      }, 30000)
      setChannel(chan)
    },
    [user.id, user.name],
  )

  const fetchTokenAndJoin = useCallback(
    async (callId: string, convId: number, type: CallType, peerName: string) => {
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

  const handleAcceptIncoming = useCallback(async () => {
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
    )
    setIncoming(null)
  }, [incoming, user.id, fetchTokenAndJoin])

  const handleRejectIncoming = useCallback(async () => {
    if (!incoming) return
    const chan = createCallChannel(incoming.conversationId)
    await subscribeAndWait(chan)
    await sendCallSignal(chan, 'call:decline', {
      from: user.id,
      callId: incoming.callId,
    })
    setIncoming(null)
  }, [incoming, user.id])

  const endCall = useCallback(() => {
    setActiveCall(null)
    setChannel(null)
  }, [])

  return (
    <CallContext.Provider
      value={{
        activeCall,
        startOutgoingCall,
        endCall,
      }}
    >
      {children}
      {incoming && (
        <IncomingCallModal
          callerName={incoming.callerName}
          callerImage={incoming.callerImage}
          callType={incoming.callType}
          onAccept={handleAcceptIncoming}
          onReject={handleRejectIncoming}
          onTimeout={() => setIncoming(null)}
        />
      )}
      {activeCall?.state === 'in-call' && activeCall.token && activeCall.livekitUrl && (
        <CallRoom
          token={activeCall.token}
          serverUrl={activeCall.livekitUrl}
          callType={activeCall.callType}
          peerName={activeCall.peerName}
          onDisconnected={endCall}
        />
      )}
    </CallContext.Provider>
  )
}
