'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { Mic, MicOff, Video, VideoOff, MonitorUp } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { ActiveCall } from '@/lib/calls/types'
import { CallControls } from './call-controls'
import { ScreenPickerModal } from './screen-picker-modal'
import { useCallContext } from './call-provider'

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

export function CallOverlay({ activeCall }: { activeCall: ActiveCall }) {
  const {
    localStream,
    remoteStream,
    screenStream,
    remoteMediaState,
    duration,
    connectionQuality,
    camOn,
    startScreenShare,
    stopScreenShare,
  } = useCallContext()

  const remoteVideoRef = useRef<HTMLVideoElement>(null)
  const localVideoRef = useRef<HTMLVideoElement>(null)
  const screenVideoRef = useRef<HTMLVideoElement>(null)
  const remoteAudioRef = useRef<HTMLAudioElement>(null)
  const [minimized, setMinimized] = useState(false)
  const [screenPickerOpen, setScreenPickerOpen] = useState(false)

  const isElectron = typeof window !== 'undefined' && 'screenShare' in window

  const handleScreenShare = async () => {
    if (isElectron) {
      setScreenPickerOpen(true)
      setTimeout(async () => {
        try {
          await Promise.resolve(startScreenShare())
        } finally {
          setScreenPickerOpen(false)
        }
      }, 50)
    } else {
      startScreenShare()
    }
  }

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream
    }
  }, [remoteStream])

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream
    }
  }, [localStream])

  useEffect(() => {
    if (screenVideoRef.current && screenStream) {
      screenVideoRef.current.srcObject = screenStream
    }
  }, [screenStream])

  useEffect(() => {
    if (remoteAudioRef.current && remoteStream) {
      remoteAudioRef.current.srcObject = remoteStream
    }
  }, [remoteStream])

  const isVideoCall = activeCall.callType === 'video'

  return (
    <AnimatePresence>
      <motion.div
        key={minimized ? 'min' : 'full'}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className={
          minimized
            ? 'fixed bottom-4 right-4 z-50 flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-2 shadow-2xl'
            : 'fixed inset-0 z-40 flex flex-col bg-black'
        }
      >
        {!minimized && (
          <>
            <audio ref={remoteAudioRef} autoPlay playsInline />

            <div className="relative flex-1">
              {screenStream ? (
                <video
                  ref={screenVideoRef}
                  autoPlay
                  playsInline
                  className="size-full object-contain"
                />
              ) : isVideoCall && remoteStream ? (
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  className="size-full object-contain"
                />
              ) : (
                <div className="flex size-full items-center justify-center">
                  <motion.div
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                    className="flex size-32 items-center justify-center rounded-full bg-white/10"
                  >
                    <span className="text-4xl font-bold text-white/60">
                      {initialsOf(activeCall.peerName)}
                    </span>
                  </motion.div>
                </div>
              )}

              {isVideoCall && camOn && localStream && !screenStream && (
                <motion.div
                  drag
                  dragConstraints={{ top: 0, left: 0, right: 0, bottom: 0 }}
                  className="absolute right-4 top-4 w-40 overflow-hidden rounded-xl border-2 border-white/20 shadow-lg"
                >
                  <video
                    ref={localVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full object-cover"
                  />
                </motion.div>
              )}
            </div>

            <div className="absolute top-4 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1">
              <h2 className="text-lg font-semibold text-white">{activeCall.peerName}</h2>
              <p className="text-sm text-white/60">
                {activeCall.state === 'connecting'
                  ? 'Connecting...'
                  : formatDuration(duration)}
              </p>
              {connectionQuality.rtt > 0 && (
                <p className="text-xs text-white/40">
                  {connectionQuality.rtt}ms
                  {connectionQuality.packetLoss > 0
                    ? ` · ${connectionQuality.packetLoss}% loss`
                    : ''}
                </p>
              )}
            </div>

            <div className="absolute top-4 right-4 flex items-center gap-3">
              <div className="flex items-center gap-1 rounded-full bg-white/10 px-2 py-1 text-xs text-white/70">
                {remoteMediaState.micOn ? (
                  <Mic className="size-3" />
                ) : (
                  <MicOff className="size-3 text-red-400" />
                )}
              </div>
              {isVideoCall && (
                <div className="flex items-center gap-1 rounded-full bg-white/10 px-2 py-1 text-xs text-white/70">
                  {remoteMediaState.camOn ? (
                    <Video className="size-3" />
                  ) : (
                    <VideoOff className="size-3 text-red-400" />
                  )}
                </div>
              )}
              {remoteMediaState.screenOn && (
                <div className="flex items-center gap-1 rounded-full bg-white/10 px-2 py-1 text-xs text-white/70">
                  <MonitorUp className="size-3" />
                </div>
              )}
            </div>

            <div className="absolute bottom-6 left-1/2 -translate-x-1/2">
              <CallControls onStartScreenShare={handleScreenShare} />
            </div>
          </>
        )}

        {minimized && (
          <>
            <span className="text-sm font-medium text-foreground">
              {formatDuration(duration)}
            </span>
            <CallControls onStartScreenShare={handleScreenShare} />
          </>
        )}

        <ScreenPickerModal
          open={screenPickerOpen}
          onSelect={() => {}}
          onClose={() => setScreenPickerOpen(false)}
        />

        <button
          onClick={() => setMinimized(!minimized)}
          className={
            minimized
              ? 'hidden'
              : 'absolute top-4 left-4 rounded-lg bg-white/10 px-3 py-1 text-sm text-white/70 hover:bg-white/20'
          }
        >
          {minimized ? 'Expand' : 'Minimize'}
        </button>
      </motion.div>
    </AnimatePresence>
  )
}
