'use client'

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { subscribeIncomingCalls, createCallChannel, broadcastCallInvite, subscribeAndWait, sendCallSignal } from '@/lib/calls/signaling'
import type { ActiveCall, CallType, CallInvitePayload } from '@/lib/calls/types'
import type { AppUser } from '@/components/chat-app'
import { IncomingCallModal } from './incoming-call-modal'
import { OutgoingCallOverlay } from './outgoing-call-overlay'
import { CallRoom } from './call-room'

const RING_TIMEOUT_MS = 35000

interface CallContextValue {
  activeCall: ActiveCall | null
  startOutgoingCall: (
    convId: number,
    type: CallType,
    calleeId: string,
    calleeName: string,
    calleeImage?: string | null,
  ) => void
  endCall: () => void
  cancelOutgoingCall: () => void
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
  const [peerImage, setPeerImage] = useState<string | null>(null)
  const [incoming, setIncoming] = useState<{
    callId: string
    conversationId: number
    callType: CallType
    callerId: string
    callerName: string
    callerImage: string | null
  } | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [channel, setChannel] = useState<ReturnType<typeof createCallChannel> | null>(null)
  const channelRef = useRef<ReturnType<typeof createCallChannel> | null>(null)
  const ringTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const activeCallRef = useRef<ActiveCall | null>(null)
  activeCallRef.current = activeCall

  const showFeedback = useCallback((message: string) => {
    setFeedback(message)
    setTimeout(() => setFeedback(null), 3500)
  }, [])

  const clearRingTimeout = () => {
    if (ringTimeoutRef.current) {
      clearTimeout(ringTimeoutRef.current)
      ringTimeoutRef.current = null
    }
  }

  useEffect(() => {
    const unsub = subscribeIncomingCalls(user.id, (payload: CallInvitePayload) => {
      if (activeCallRef.current) return
      setIncoming({
        callId: payload.callId,
        conversationId: payload.conversationId,
        callType: payload.callType,
        callerId: payload.from,
        callerName: payload.fromName,
        callerImage: null,
      })
      // Fetch caller avatar asynchronously (popover data lives in the users API)
      fetch(`/api/users/${payload.from}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((u) => {
          if (u?.image) {
            setIncoming((prev) =>
              prev && prev.callId === payload.callId ? { ...prev, callerImage: u.image } : prev,
            )
          }
        })
        .catch(() => {})
    })

    return () => unsub()
  }, [user.id])

  // While an incoming call rings, listen for the caller cancelling it
  useEffect(() => {
    if (!incoming) return
    const chan = createCallChannel(incoming.conversationId)
    let removed = false
    chan
      .on('broadcast', { event: 'call:cancel' }, () => {
        setIncoming((prev) => (prev && prev.callId === incoming.callId ? null : prev))
      })
      .subscribe()
    return () => {
      if (!removed) {
        removed = true
        chan.unsubscribe()
      }
    }
  }, [incoming?.callId]) // eslint-disable-line react-hooks/exhaustive-deps

  const startOutgoingCall = useCallback(
    async (
      convId: number,
      type: CallType,
      calleeId: string,
      calleeName: string,
      calleeImage?: string | null,
    ) => {
      if (activeCallRef.current) return
      const callId = crypto.randomUUID()
      // Optimistic UI: show the "calling..." overlay immediately
      setPeerImage(calleeImage ?? null)
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
      channelRef.current = chan
      setChannel(chan)

      chan
        .on('broadcast', { event: 'call:accept' }, async () => {
          clearRingTimeout()
          await fetchTokenAndJoin(callId, convId, type, calleeName)
        })
        .on('broadcast', { event: 'call:decline' }, () => {
          clearRingTimeout()
          setActiveCall(null)
          setChannel(null)
          channelRef.current = null
          showFeedback('Llamada rechazada')
        })
        .on('broadcast', { event: 'call:cancel' }, () => {
          clearRingTimeout()
          setActiveCall(null)
          setChannel(null)
          channelRef.current = null
        })

      ringTimeoutRef.current = setTimeout(() => {
        // No answer: cancel on both ends
        sendCallSignal(chan, 'call:cancel', { from: user.id, callId }).catch(() => {})
        setActiveCall(null)
        setChannel(null)
        channelRef.current = null
        ringTimeoutRef.current = null
        showFeedback('No hay respuesta')
      }, RING_TIMEOUT_MS)
    },
    [user.id, user.name, showFeedback],
  )

  const cancelOutgoingCall = useCallback(() => {
    const call = activeCallRef.current
    clearRingTimeout()
    if (call && channelRef.current) {
      sendCallSignal(channelRef.current, 'call:cancel', {
        from: user.id,
        callId: call.callId,
      }).catch(() => {})
    }
    setActiveCall(null)
    setChannel(null)
    channelRef.current = null
  }, [user.id])

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
        channelRef.current = null
        showFeedback('No se pudo conectar la llamada')
      }
    },
    [showFeedback],
  )

  const handleAcceptIncoming = useCallback(async () => {
    if (!incoming) return

    const chan = createCallChannel(incoming.conversationId)
    await subscribeAndWait(chan)
    channelRef.current = chan
    setChannel(chan)

    await sendCallSignal(chan, 'call:accept', {
      from: user.id,
      callId: incoming.callId,
    })

    setPeerImage(incoming.callerImage)
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
    clearRingTimeout()
    setActiveCall(null)
    setChannel(null)
    channelRef.current = null
  }, [])

  return (
    <CallContext.Provider
      value={{
        activeCall,
        startOutgoingCall,
        endCall,
        cancelOutgoingCall,
      }}
    >
      {children}
      {activeCall?.state === 'outgoing-ringing' && (
        <OutgoingCallOverlay
          calleeName={activeCall.peerName}
          calleeImage={peerImage}
          callType={activeCall.callType}
          onCancel={cancelOutgoingCall}
        />
      )}
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
          peerImage={peerImage}
          onDisconnected={endCall}
        />
      )}
      <AnimatePresence>
        {feedback && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            className="fixed bottom-6 left-1/2 z-[60] -translate-x-1/2 rounded-lg border border-border bg-popover px-4 py-2.5 text-sm font-medium text-popover-foreground shadow-xl"
            role="status"
          >
            {feedback}
          </motion.div>
        )}
      </AnimatePresence>
    </CallContext.Provider>
  )
}
