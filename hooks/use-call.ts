'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  startCall,
  answerCall as answerCallAction,
  endCall as endCallAction,
} from '@/app/actions/calls'
import {
  CallConnection,
  getAudioStream,
  getAudioVideoStream,
  getScreenStream,
} from '@/lib/calls/webrtc'
import {
  broadcastCallRequest,
  createCallChannel,
  subscribeCallChannel,
  sendCallSignal,
  subscribeAndWait,
} from '@/lib/calls/signaling'
import type {
  CallState,
  CallType,
  ActiveCall,
  RemoteMediaState,
} from '@/lib/calls/types'

let activeCallId: string | null = null

export function isCallActive() {
  return activeCallId !== null
}

export function useCall(userId: string, userName: string) {
  const [state, setState] = useState<CallState>('idle')
  const [callId, setCallId] = useState<string | null>(null)
  const [callType, setCallType] = useState<CallType>('audio')
  const [conversationId, setConversationId] = useState<number | null>(null)
  const [peerId, setPeerId] = useState<string>('')
  const [peerName, setPeerName] = useState<string>('')
  const [duration, setDuration] = useState(0)
  const [micOn, setMicOn] = useState(true)
  const [camOn, setCamOn] = useState(false)
  const [screenOn, setScreenOn] = useState(false)
  const [remoteMediaState, setRemoteMediaState] = useState<RemoteMediaState>({
    micOn: true,
    camOn: false,
    screenOn: false,
  })
  const [localStream, setLocalStream] = useState<MediaStream | null>(null)
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null)
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null)
  const [connectionQuality, setConnectionQuality] = useState<{
    rtt: number
    packetLoss: number
  }>({ rtt: 0, packetLoss: 0 })

  const connRef = useRef<CallConnection | null>(null)
  const channelRef = useRef<ReturnType<typeof createCallChannel> | null>(null)
  const durationTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const qualityTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const cleanup = useCallback(() => {
    if (durationTimerRef.current) {
      clearInterval(durationTimerRef.current)
      durationTimerRef.current = null
    }
    if (qualityTimerRef.current) {
      clearInterval(qualityTimerRef.current)
      qualityTimerRef.current = null
    }
    if (connRef.current) {
      connRef.current.close()
      connRef.current = null
    }
    if (localStream) {
      localStream.getTracks().forEach((t) => t.stop())
    }
    if (screenStream) {
      screenStream.getTracks().forEach((t) => t.stop())
    }
    setLocalStream(null)
    setRemoteStream(null)
    setScreenStream(null)
    activeCallId = null
  }, [localStream, screenStream])

  const endCall = useCallback(
    async (endStatus: 'missed' | 'rejected' | 'ended' = 'ended') => {
      if (callId) {
        try {
          await endCallAction(callId, endStatus)
        } catch {}
        if (channelRef.current) {
          await sendCallSignal(channelRef.current, 'call-end', {
            from: userId,
            callId,
          })
        }
      }
      cleanAll()
    }, [callId, userId],
  )

  const cleanAll = useCallback(() => {
    cleanup()
    setState('ended')
    setCallId(null)
    setConversationId(null)
    setPeerId('')
    setPeerName('')
    setDuration(0)
    setTimeout(() => setState('idle'), 500)
  }, [cleanup])

  const hangUp = useCallback(() => {
    endCall('ended')
  }, [endCall])

  const rejectCall = useCallback(
    async (incomingCallId: string) => {
      const chan = createCallChannel(conversationId!)
      await subscribeAndWait(chan)
      await sendCallSignal(chan, 'call-reject', {
        from: userId,
        callId: incomingCallId,
        reason: 'declined',
      })
      setTimeout(() => chan.unsubscribe(), 500)
      cleanAll()
    },
    [userId, conversationId, cleanAll],
  )

  const timeoutCall = useCallback(
    async (incomingCallId: string) => {
      await endCallAction(incomingCallId, 'missed')
      cleanAll()
    },
    [cleanAll],
  )

  const outgoingCall = useCallback(
    async (convId: number, type: CallType, calleeId: string, calleeName: string) => {
      const newCallId = crypto.randomUUID()
      activeCallId = newCallId

      setCallId(newCallId)
      setCallType(type)
      setConversationId(convId)
      setPeerId(calleeId)
      setPeerName(calleeName)
      setState('outgoing-ringing')

      try {
        await startCall(convId, type, newCallId)
      } catch (e) {
        console.error('Failed to start call:', e)
        cleanAll()
        return
      }

      await broadcastCallRequest(
        {
          from: userId,
          callType: type,
          callId: newCallId,
          conversationId: convId,
        },
        calleeId,
      )

      const timeout = setTimeout(() => {
        if (activeCallId === newCallId && state === 'outgoing-ringing') {
          endCallAction(newCallId, 'missed')
          cleanAll()
        }
      }, 30000)
    },
    [userId, state, cleanAll],
  )

  const acceptIncoming = useCallback(
    async (incomingCallId: string, incomingConvId: number, incomingType: CallType, callerId: string, callerName: string) => {
      activeCallId = incomingCallId
      setCallId(incomingCallId)
      setCallType(incomingType)
      setConversationId(incomingConvId)
      setPeerId(callerId)
      setPeerName(callerName)
      setState('connecting')

      try {
        await answerCallAction(incomingCallId)
      } catch {}

      const chan = createCallChannel(incomingConvId)
      await subscribeAndWait(chan)
      channelRef.current = chan

      await sendCallSignal(chan, 'call-accept', {
        from: userId,
        callId: incomingCallId,
      })

      let localStreamObj: MediaStream | null = null
      try {
        if (incomingType === 'video') {
          localStreamObj = await getAudioVideoStream()
          setCamOn(true)
        } else {
          localStreamObj = await getAudioStream()
        }
        setMicOn(true)
      } catch {
        setMicOn(false)
      }
      if (localStreamObj) {
        setLocalStream(localStreamObj)
      }

      const conn = new CallConnection()
      connRef.current = conn
      conn.setOnIceCandidate((c) => {
        if (c) {
          sendCallSignal(chan, 'ice-candidate', {
            from: userId,
            callId: incomingCallId,
            candidate: c.toJSON(),
          })
        }
      })

      conn.onRemoteStream = (stream) => {
        setRemoteStream(stream)
      }

      conn.onRemoteScreenStream = (stream) => {
        console.log('[use-call] onRemoteScreenStream', stream.getVideoTracks().length, 'tracks')
        setScreenStream(stream)
        setRemoteMediaState((prev) => ({ ...prev, screenOn: true }))
      }

      conn.onNegotiationNeeded = async () => {
        try {
          const reoffer = await conn.negotiate()
          await sendCallSignal(chan, 'renegotiate', {
            from: userId,
            callId: incomingCallId,
            sdp: reoffer,
          })
        } catch {}
      }

      conn.onConnectionLost = () => {
        endCall('ended')
      }

      conn.onIceFailed = () => {
        endCall('ended')
      }

      if (localStreamObj) {
        localStreamObj.getTracks().forEach((t) => conn.pc.addTrack(t, localStreamObj!))
      }

      subscribeCallChannel(incomingConvId, {
        onAccept: () => {},
        onReject: () => {},
        onCancel: () => {},
        onSdpOffer: async (p) => {
          if (p.callId !== incomingCallId) return
          await conn.handleOffer(p.sdp)
          const answer = await conn.createAnswer()
          await sendCallSignal(chan, 'sdp-answer', { from: userId, callId: incomingCallId, sdp: answer })
          conn.established = true
          setState('in-call')
          startDuration()
          startQuality()
        },
        onSdpAnswer: () => {},
        onIceCandidate: async (p) => {
          if (p.callId !== incomingCallId) return
          await conn.addIceCandidate(p.candidate)
        },
        onRenegotiate: async (p) => {
          if (p.callId !== callId) return
          console.log('[use-call] onRenegotiate type:', p.sdp.type)
          if (p.sdp.type === 'answer') {
            await conn.pc.setRemoteDescription(new RTCSessionDescription(p.sdp))
          } else {
            const answer = await conn.handleRenegotiation(p.sdp)
            await sendCallSignal(chan, 'renegotiate', { from: userId, callId, sdp: answer })
          }
        },
        onCallEnd: () => { endCall('ended') },
        onMediaState: (p) => {
          if (p.callId !== incomingCallId) return
          setRemoteMediaState({ micOn: p.micOn, camOn: p.camOn, screenOn: p.screenOn })
        },
      })
    },
    [userId, endCall],
  )

  const connectAsCaller = useCallback(
    async (targetCallType: CallType) => {
      if (!callId || !conversationId) return
      setState('connecting')

      const chan = createCallChannel(conversationId)
      await subscribeAndWait(chan)
      channelRef.current = chan

      let localStreamObj: MediaStream | null = null
      try {
        if (targetCallType === 'video') {
          localStreamObj = await getAudioVideoStream()
          setCamOn(true)
        } else {
          localStreamObj = await getAudioStream()
        }
        setMicOn(true)
      } catch {
        setMicOn(false)
      }
      if (localStreamObj) {
        setLocalStream(localStreamObj)
      }

      const conn = new CallConnection()
      connRef.current = conn
      conn.setOnIceCandidate((c) => {
        if (c) {
          sendCallSignal(chan, 'ice-candidate', {
            from: userId,
            callId,
            candidate: c.toJSON(),
          })
        }
      })

      conn.onRemoteStream = (stream) => {
        setRemoteStream(stream)
      }

      conn.onRemoteScreenStream = (stream) => {
        console.log('[use-call] onRemoteScreenStream', stream.getVideoTracks().length, 'tracks')
        setScreenStream(stream)
        setRemoteMediaState((prev) => ({ ...prev, screenOn: true }))
      }

      conn.onNegotiationNeeded = async () => {
        try {
          const reoffer = await conn.negotiate()
          await sendCallSignal(chan, 'renegotiate', {
            from: userId,
            callId,
            sdp: reoffer,
          })
        } catch {}
      }

      conn.onConnectionLost = () => {
        endCall('ended')
      }

      conn.onIceFailed = () => {
        endCall('ended')
      }

      if (localStreamObj) {
        localStreamObj.getTracks().forEach((t) => conn.pc.addTrack(t, localStreamObj!))
      }

      const offer = await conn.createOffer()
      await sendCallSignal(chan, 'sdp-offer', {
        from: userId,
        callId,
        sdp: offer,
      })

      subscribeCallChannel(conversationId, {
        onAccept: () => {},
        onReject: () => {},
        onCancel: () => {},
        onSdpOffer: () => {},
        onSdpAnswer: async (p) => {
          if (p.callId !== callId) return
          await conn.handleAnswer(p.sdp)
          conn.established = true
          setState('in-call')
          startDuration()
          startQuality()
        },
        onIceCandidate: async (p) => {
          if (p.callId !== callId) return
          await conn.addIceCandidate(p.candidate)
        },
        onRenegotiate: async (p) => {
          if (p.callId !== callId) return
          const answer = await conn.handleRenegotiation(p.sdp)
          await sendCallSignal(chan, 'renegotiate', { from: userId, callId, sdp: answer })
        },
        onCallEnd: () => { endCall('ended') },
        onMediaState: (p) => {
          if (p.callId !== callId) return
          setRemoteMediaState({ micOn: p.micOn, camOn: p.camOn, screenOn: p.screenOn })
        },
      })
    },
    [callId, conversationId, userId, endCall],
  )

  useEffect(() => {
    if (!callId || !conversationId) return
    if (state !== 'outgoing-ringing' && state !== 'connecting') return

    const chan = createCallChannel(conversationId)
    subscribeAndWait(chan).then(() => {
      channelRef.current = chan
    })

    const unsub = subscribeCallChannel(conversationId, {
      onAccept: () => {
        connectAsCaller(callType)
      },
      onReject: () => {
        endCall('rejected')
      },
      onCancel: () => {},
      onSdpOffer: () => {},
      onSdpAnswer: () => {},
      onIceCandidate: () => {},
      onRenegotiate: () => {},
      onCallEnd: () => {},
      onMediaState: () => {},
    })

    return () => {
      unsub.unsubscribe()
    }
  }, [state, callId, conversationId, callType, connectAsCaller, endCall])

  const startDuration = useCallback(() => {
    setDuration(0)
    const start = Date.now()
    durationTimerRef.current = setInterval(() => {
      setDuration(Math.floor((Date.now() - start) / 1000))
    }, 1000)
  }, [])

  const startQuality = useCallback(() => {
    qualityTimerRef.current = setInterval(async () => {
      if (connRef.current) {
        try {
          const stats = await connRef.current.getStats()
          setConnectionQuality(stats)
        } catch {}
      }
    }, 3000)
  }, [])

  const toggleMic = useCallback(async () => {
    if (connRef.current) {
      if (micOn) {
        await connRef.current.muteMic()
      } else {
        await connRef.current.unmuteMic()
      }
      const newState = !micOn
      setMicOn(newState)
      if (channelRef.current && callId) {
        sendCallSignal(channelRef.current, 'media-state', {
          from: userId,
          callId,
          micOn: newState,
          camOn,
          screenOn,
        })
      }
    }
  }, [micOn, camOn, screenOn, userId, callId])

  const toggleCam = useCallback(async () => {
    if (!connRef.current) return
    if (camOn) {
      await connRef.current.removeVideoTrack()
      setCamOn(false)
    } else {
      try {
        const videoStream = await navigator.mediaDevices.getUserMedia({
          video: { width: 1280, height: 720, frameRate: 30 },
        })
        const track = videoStream.getVideoTracks()[0]
        if (track) {
          const sender = connRef.current.pc.getSenders().find((s) => s.track?.kind === 'video')
          if (sender) {
            await sender.replaceTrack(track)
          } else {
            connRef.current.pc.addTrack(track, videoStream)
          }
          setLocalStream((prev) => {
            if (prev) {
              prev.getVideoTracks().forEach((t) => t.stop())
            }
            return videoStream
          })
        }
      } catch {}
      setCamOn(true)
    }
    const newState = !camOn
    if (channelRef.current && callId) {
      sendCallSignal(channelRef.current, 'media-state', {
        from: userId,
        callId,
        micOn,
        camOn: newState,
        screenOn,
      })
    }
  }, [camOn, micOn, screenOn, userId, callId])

  const startScreenShare = useCallback(async () => {
    console.log('[use-call] startScreenShare called')
    try {
      const stream = await getScreenStream()
      console.log('[use-call] screen stream obtained')
      setScreenStream(stream)
      if (connRef.current) {
        await connRef.current.addScreenTrack(stream)
        connRef.current.onScreenEnded = () => {
          setScreenOn(false)
          if (channelRef.current && callId) {
            sendCallSignal(channelRef.current, 'media-state', {
              from: userId,
              callId,
              micOn,
              camOn,
              screenOn: false,
            })
          }
        }
      }
      setScreenOn(true)
      if (channelRef.current && callId) {
        sendCallSignal(channelRef.current, 'media-state', {
          from: userId,
          callId,
          micOn,
          camOn,
          screenOn: true,
        })
      }
    } catch {
      // user cancelled
    }
  }, [micOn, camOn, userId, callId])

  const stopScreenShare = useCallback(() => {
    if (screenStream) {
      screenStream.getTracks().forEach((t) => t.stop())
      setScreenStream(null)
    }
    if (localStream && connRef.current) {
      connRef.current.restoreCameraTrack(localStream)
    }
    setScreenOn(false)
    if (channelRef.current && callId) {
      sendCallSignal(channelRef.current, 'media-state', {
        from: userId,
        callId,
        micOn,
        camOn,
        screenOn: false,
      })
    }
  }, [screenStream, micOn, camOn, userId, callId])

  const activeCall: ActiveCall | null =
    callId && state !== 'idle' && state !== 'ended'
      ? {
          callId,
          conversationId: conversationId!,
          callType,
          state,
          peerId,
          peerName,
          duration,
          micOn,
          camOn,
          screenOn,
          remoteMediaState,
          localStream,
          remoteStream,
          screenStream,
        }
      : null

  return {
    state,
    callId,
    callType,
    activeCall,
    duration,
    connectionQuality,
    localStream,
    remoteStream,
    screenStream,
    micOn,
    camOn,
    screenOn,
    remoteMediaState,
    outgoingCall,
    acceptIncoming,
    rejectCall,
    hangUp,
    toggleMic,
    toggleCam,
    startScreenShare,
    stopScreenShare,
    connectAsCaller,
    timeoutCall,
    setState,
    setCallId,
    setCallType,
    setConversationId,
    setPeerId,
    setPeerName,
    cleanup: cleanAll,
  }
}
