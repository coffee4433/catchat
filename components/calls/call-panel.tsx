'use client'

import { AnimatePresence, motion } from 'framer-motion'
import {
  LiveKitRoom,
  RoomAudioRenderer,
  useTracks,
  GridLayout,
  ParticipantTile,
  VideoTrack,
  useRoomContext,
} from '@livekit/components-react'
import { Track } from 'livekit-client'
import { Phone, Video, X } from 'lucide-react'
import React, { useEffect, useRef } from 'react'
import { useCallContext } from './call-provider'
import { CallControls } from './call-controls'
import { ScreenPicker } from './screen-picker'

function initialsOf(name: string) {
  return name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

function Avatar({
  name,
  image,
  size = 'size-[72px]',
  ring,
  pulse,
  dim,
}: {
  name: string
  image?: string | null
  size?: string
  ring?: boolean
  pulse?: boolean
  dim?: boolean
}) {
  return (
    <div
      className={`relative flex ${size} shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/10 ${
        ring ? 'ring-2 ring-white/20 ring-offset-4 ring-offset-black' : ''
      } ${pulse ? 'call-ring-pulse' : ''} ${dim ? 'opacity-60' : ''}`}
    >
      {image ? (
        <img src={image || '/placeholder.svg'} alt={name} className="size-full object-cover" />
      ) : (
        <span className="text-xl font-bold text-white/60">{initialsOf(name)}</span>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* LiveKit in-call stage                                               */
/* ------------------------------------------------------------------ */

function RoomBridge() {
  const room = useRoomContext()
  const { setRoom } = useCallContext()
  useEffect(() => {
    setRoom(room)
    return () => setRoom(null)
  }, [room, setRoom])
  return null
}

function LocalScreenPreview() {
  const allTracks = useTracks([{ source: Track.Source.ScreenShare, withPlaceholder: false }], { onlySubscribed: false })
  const localTrack = allTracks.find((t) => t.participant.isLocal && t.publication)
  const track = localTrack?.publication?.videoTrack
  const trackId = track?.mediaStreamTrack?.id || localTrack?.publication?.trackSid

  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const el = videoRef.current
    if (!el || !track) return
    const mediaStream = new MediaStream([track.mediaStreamTrack])
    el.srcObject = mediaStream
    el.play().catch(() => {})

    return () => {
      el.srcObject = null
    }
  }, [trackId])

  if (!localTrack || !track) return null

  return (
    <div className="absolute bottom-20 left-4 z-30 w-52 overflow-hidden rounded-xl border border-white/20 bg-black/80 shadow-2xl backdrop-blur-md">
      <div className="flex items-center justify-between px-2.5 py-1 bg-white/10 text-[11px] font-medium text-white/80">
        <span>Tu pantalla</span>
      </div>
      <video ref={videoRef} autoPlay playsInline muted className="w-full h-auto object-contain max-h-36 bg-black" />
    </div>
  )
}

const ScreenShareView = React.memo(function ScreenShareView() {
  const allTracks = useTracks([{ source: Track.Source.ScreenShare, withPlaceholder: false }], { onlySubscribed: false })
  const remoteTrack = allTracks.find((t) => !t.participant.isLocal && t.publication)
  const track = remoteTrack?.publication?.videoTrack
  const trackId = track?.mediaStreamTrack?.id || remoteTrack?.publication?.trackSid

  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const el = videoRef.current
    if (!el || !track) return
    const mediaStream = new MediaStream([track.mediaStreamTrack])
    el.srcObject = mediaStream
    el.play().catch(() => {})

    return () => {
      el.srcObject = null
    }
  }, [trackId])

  if (!remoteTrack) return null
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black">
      <video ref={videoRef} autoPlay playsInline className="h-full w-full object-contain" />
    </div>
  )
})

function InCallStage({
  peerName,
  peerImage,
  selfName,
  selfImage,
  onHangUp,
}: {
  peerName: string
  peerImage?: string | null
  selfName: string
  selfImage?: string | null
  onHangUp: () => void
}) {
  const durationRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const start = Date.now()
    const timer = setInterval(() => {
      const d = Math.floor((Date.now() - start) / 1000)
      if (durationRef.current) durationRef.current.textContent = formatDuration(d)
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: false },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false },
  )

  const cameraTracks = tracks.filter((t) => t.source === Track.Source.Camera && t.publication)
  const hasRemoteScreenShare = tracks.some((t) => t.source === Track.Source.ScreenShare && !t.participant.isLocal && t.publication)
  const hasLocalScreenShare = tracks.some((t) => t.source === Track.Source.ScreenShare && t.participant.isLocal && t.publication)
  const hasVideoContent = cameraTracks.length > 0 || hasRemoteScreenShare || hasLocalScreenShare

  return (
    <div className={`relative flex w-full flex-col items-center justify-center ${hasVideoContent ? 'h-[420px]' : 'h-[260px]'} transition-[height] duration-300`}>
      <RoomAudioRenderer />
      <RoomBridge />
      <ScreenPicker />

      {hasVideoContent ? (
        <>
          {hasRemoteScreenShare && <ScreenShareView />}
          <div
            className={
              hasRemoteScreenShare
                ? 'absolute bottom-20 right-4 z-10 flex max-h-[35%] w-52 flex-col gap-2'
                : 'absolute inset-0 px-4 pb-20 pt-4'
            }
          >
            <GridLayout tracks={cameraTracks} style={{ height: '100%' }}>
              <ParticipantTile />
            </GridLayout>
          </div>
        </>
      ) : (
        /* Voice call — Discord-style avatar pair */
        <div className="flex items-center justify-center gap-4 pb-16">
          <motion.div
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 24 }}
          >
            <Avatar name={peerName} image={peerImage} ring />
          </motion.div>
          <motion.div
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 24, delay: 0.08 }}
          >
            <Avatar name={selfName} image={selfImage} />
          </motion.div>
        </div>
      )}

      {/* Local screen share floating preview */}
      <LocalScreenPreview />

      {/* Status pill top-left */}
      <div className="absolute left-4 top-3 z-20 flex items-center gap-2 text-[12px] font-medium text-white/60">
        <span className="flex items-center gap-1.5 text-[#23a55a]">
          <span className="size-2 rounded-full bg-[#23a55a] animate-pulse" />
          Voz conectada
        </span>
        <span ref={durationRef} className="font-mono text-white/40">
          00:00
        </span>
      </div>

      {/* Discord-style control pills */}
      <motion.div
        initial={{ y: 24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 320, damping: 28, delay: 0.15 }}
        className="absolute bottom-4 left-1/2 z-20 -translate-x-1/2"
      >
        <CallControls onHangUp={onHangUp} />
      </motion.div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Main panel — docked at top of chat, pushes messages down            */
/* ------------------------------------------------------------------ */

export function CallPanel({
  currentUser,
}: {
  currentUser: { id: string; name: string; image?: string | null }
}) {
  const {
    activeCall,
    incoming,
    acceptIncomingCall,
    rejectIncomingCall,
    cancelOutgoingCall,
    endCall,
  } = useCallContext()

  const visible = Boolean(incoming || activeCall)

  return (
    <AnimatePresence initial={false}>
      {visible && (
        <motion.div
          key="call-panel"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 30 }}
          className="shrink-0 overflow-hidden bg-black"
        >
          {/* Incoming call banner */}
          {incoming && !activeCall && (
            <div className="flex h-[240px] flex-col items-center justify-center gap-5">
              <div className="flex items-center gap-4">
                <motion.div
                  initial={{ scale: 0.6, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 24 }}
                >
                  <Avatar name={incoming.callerName} image={incoming.callerImage} pulse ring />
                </motion.div>
                <motion.div
                  initial={{ scale: 0.6, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 24, delay: 0.08 }}
                >
                  <Avatar name={currentUser.name} image={currentUser.image} dim />
                </motion.div>
              </div>

              <p className="text-[13px] font-medium text-white/50">
                <span className="font-semibold text-white/80">{incoming.callerName}</span>
                {incoming.callType === 'video' ? ' te está llamando por videollamada...' : ' te está llamando...'}
              </p>

              <motion.div
                initial={{ y: 16, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 320, damping: 26, delay: 0.12 }}
                className="flex items-center gap-3"
              >
                {incoming.callType === 'video' && (
                  <button
                    onClick={acceptIncomingCall}
                    title="Aceptar con video"
                    className="flex h-12 w-16 items-center justify-center rounded-xl bg-[#1a6334] text-white shadow-lg transition-all hover:bg-[#23a55a] hover:scale-105 active:scale-95"
                  >
                    <Video className="size-5" />
                  </button>
                )}
                <button
                  onClick={acceptIncomingCall}
                  title="Aceptar"
                  className="flex h-12 w-16 items-center justify-center rounded-xl bg-[#23a55a] text-white shadow-lg transition-all hover:bg-[#1a8045] hover:scale-105 active:scale-95"
                >
                  <Phone className="size-5" />
                </button>
                <button
                  onClick={rejectIncomingCall}
                  title="Rechazar"
                  className="flex h-12 w-16 items-center justify-center rounded-xl bg-[#da373c] text-white shadow-lg transition-all hover:bg-[#a12828] hover:scale-105 active:scale-95"
                >
                  <X className="size-5" />
                </button>
              </motion.div>
            </div>
          )}

          {/* Outgoing ringing */}
          {(activeCall?.state === 'outgoing-ringing' || activeCall?.state === 'no-answer') && (
            <div className="flex h-[240px] flex-col items-center justify-center gap-5">
              <div className="flex items-center gap-4">
                <motion.div
                  initial={{ scale: 0.6, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 24 }}
                >
                  <Avatar name={currentUser.name} image={currentUser.image} />
                </motion.div>
                <motion.div
                  initial={{ scale: 0.6, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 24, delay: 0.08 }}
                >
                  <Avatar
                    name={activeCall.peerName}
                    image={activeCall.peerImage}
                    pulse={activeCall.state === 'outgoing-ringing'}
                    dim={activeCall.state === 'no-answer'}
                    ring
                  />
                </motion.div>
              </div>

              <p className="calling-dots text-[13px] font-medium text-white/50">
                {activeCall.state === 'no-answer' ? (
                  <>
                    <span className="font-semibold text-white/80">{activeCall.peerName}</span> no contestó
                  </>
                ) : (
                  <>
                    Llamando a <span className="font-semibold text-white/80">{activeCall.peerName}</span>
                    <span>.</span>
                    <span>.</span>
                    <span>.</span>
                  </>
                )}
              </p>

              <motion.button
                initial={{ y: 16, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 320, damping: 26, delay: 0.12 }}
                onClick={cancelOutgoingCall}
                title="Cancelar llamada"
                className="flex h-12 w-20 items-center justify-center rounded-xl bg-[#da373c] text-white shadow-lg transition-all hover:bg-[#a12828] hover:scale-105 active:scale-95"
              >
                <Phone className="size-5 rotate-[135deg]" />
              </motion.button>
            </div>
          )}

          {/* In-call — embedded LiveKit stage */}
          {activeCall?.state === 'in-call' && activeCall.token && activeCall.livekitUrl && (
            <LiveKitRoom
              token={activeCall.token}
              serverUrl={activeCall.livekitUrl}
              connect
              audio
              video={
                activeCall.callType === 'video'
                  ? { resolution: { width: 1920, height: 1080, frameRate: 60 } }
                  : false
              }
              data-lk-theme="default"
              onDisconnected={endCall}
              className="block w-full"
              style={{ backgroundColor: '#000000' }}
            >
              <InCallStage
                peerName={activeCall.peerName}
                peerImage={activeCall.peerImage}
                selfName={currentUser.name}
                selfImage={currentUser.image}
                onHangUp={endCall}
              />
            </LiveKitRoom>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
