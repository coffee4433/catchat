'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { useCall } from '@/hooks/use-call'
import { subscribeIncomingCalls } from '@/lib/calls/signaling'
import { createDirectConversation } from '@/app/actions/chat'
import type { ActiveCall, CallRequestPayload, CallType } from '@/lib/calls/types'
import type { AppUser } from '@/components/chat-app'
import { IncomingCallModal } from './incoming-call-modal'
import { CallOverlay } from './call-overlay'

interface CallContextValue {
  activeCall: ActiveCall | null
  state: ReturnType<typeof useCall>['state']
  duration: number
  connectionQuality: { rtt: number; packetLoss: number }
  localStream: MediaStream | null
  remoteStream: MediaStream | null
  screenStream: MediaStream | null
  micOn: boolean
  camOn: boolean
  screenOn: boolean
  remoteMediaState: { micOn: boolean; camOn: boolean; screenOn: boolean }
  startOutgoingCall: (convId: number, type: CallType, calleeId: string, calleeName: string) => void
  acceptIncomingCall: (callId: string, convId: number, type: CallType, callerId: string, callerName: string) => void
  rejectIncomingCall: (callId: string) => void
  hangUp: () => void
  toggleMic: () => void
  toggleCam: () => void
  startScreenShare: () => void
  stopScreenShare: () => void
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
  const call = useCall(user.id, user.name)
  const [incomingCall, setIncomingCall] = useState<{
    callId: string
    conversationId: number
    callType: CallType
    callerId: string
    callerName: string
    callerImage: string | null
  } | null>(null)
  const [incomingError, setIncomingError] = useState<string | null>(null)

  useEffect(() => {
    const unsub = subscribeIncomingCalls(user.id, (payload: CallRequestPayload) => {
      if (call.state !== 'idle') {
        return
      }

      fetch(`/api/users/${payload.from}`)
        .then((r) => {
          if (!r.ok) throw new Error('User not found')
          return r.json()
        })
        .then((data) => {
          setIncomingCall({
            callId: payload.callId,
            conversationId: payload.conversationId,
            callType: payload.callType,
            callerId: payload.from,
            callerName: data.name || 'Unknown',
            callerImage: data.image || null,
          })
        })
        .catch(() => {
          setIncomingCall({
            callId: payload.callId,
            conversationId: payload.conversationId,
            callType: payload.callType,
            callerId: payload.from,
            callerName: 'Unknown',
            callerImage: null,
          })
        })
    })

    return () => {
      unsub()
    }
  }, [user.id, call.state])

  const handleAccept = () => {
    if (!incomingCall) return

    createDirectConversation(incomingCall.callerId)
      .then((result) => {
        call.acceptIncoming(
          incomingCall.callId,
          result.id,
          incomingCall.callType,
          incomingCall.callerId,
          incomingCall.callerName,
        )
        setIncomingCall(null)
        setIncomingError(null)
      })
      .catch((e) => {
        setIncomingError(e instanceof Error ? e.message : 'Failed to create conversation')
      })
  }

  const handleReject = () => {
    if (!incomingCall) return
    call.rejectCall(incomingCall.callId)
    setIncomingCall(null)
  }

  const handleStartOutgoing = (convId: number, type: CallType, calleeId: string, calleeName: string) => {
    call.outgoingCall(convId, type, calleeId, calleeName)
  }

  return (
    <CallContext.Provider
      value={{
        activeCall: call.activeCall,
        state: call.state,
        duration: call.duration,
        connectionQuality: call.connectionQuality,
        localStream: call.localStream,
        remoteStream: call.remoteStream,
        screenStream: call.screenStream,
        micOn: call.micOn,
        camOn: call.camOn,
        screenOn: call.screenOn,
        remoteMediaState: call.remoteMediaState,
        startOutgoingCall: handleStartOutgoing,
        acceptIncomingCall: call.acceptIncoming,
        rejectIncomingCall: call.rejectCall,
        hangUp: call.hangUp,
        toggleMic: call.toggleMic,
        toggleCam: call.toggleCam,
        startScreenShare: call.startScreenShare,
        stopScreenShare: call.stopScreenShare,
      }}
    >
      {children}
      {incomingCall && (
        <IncomingCallModal
          callerName={incomingCall.callerName}
          callerImage={incomingCall.callerImage}
          callType={incomingCall.callType}
          error={incomingError}
          onAccept={handleAccept}
          onReject={handleReject}
          onTimeout={() => {
            call.timeoutCall(incomingCall.callId)
            setIncomingCall(null)
          }}
        />
      )}
      {call.activeCall && (
        <CallOverlay activeCall={call.activeCall} />
      )}
    </CallContext.Provider>
  )
}
