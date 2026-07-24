'use client'

import {
  LiveKitRoom,
  RoomAudioRenderer,
  useTracks,
  GridLayout,
  ParticipantTile,
  VideoTrack,
} from '@livekit/components-react'
import { Track } from 'livekit-client'
import { useEffect, useRef, useState, useCallback } from 'react'
import { CallControls } from './call-controls'
import { ScreenPicker } from './screen-picker'

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

function LocalScreenPreview() {
  const allTracks = useTracks([{ source: Track.Source.ScreenShare, withPlaceholder: false }], { onlySubscribed: false })
  const local = allTracks.filter(t => t.participant.isLocal && t.publication)
  if (local.length === 0) return null
  return (
    <div className="absolute bottom-20 left-4 z-10 w-52 overflow-hidden rounded-xl border-2 border-white/10 shadow-lg">
      <VideoTrack trackRef={local[0] as any} style={{ width: '100%', height: 'auto' }} />
    </div>
  )
}

function ScreenShareView() {
  const allTracks = useTracks([{ source: Track.Source.ScreenShare, withPlaceholder: false }], { onlySubscribed: false })
  const remote = allTracks.filter(t => !t.participant.isLocal && t.publication)
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const el = videoRef.current
    if (!el || remote.length === 0) return
    const pub = remote[0].publication
    if (!pub) return
    const track = pub.videoTrack
    if (!track) return
    const mediaStream = new MediaStream([track.mediaStreamTrack])
    el.srcObject = mediaStream
    el.play().catch(() => {})
    return () => { el.srcObject = null }
  }, [remote])

  if (remote.length === 0) return null
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-[#1e1f22]">
      <video ref={videoRef} autoPlay playsInline className="h-full w-full object-contain" />
    </div>
  )
}

function initialsOf(name: string) {
  return name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

function CallStage({ peerName, hasVideo }: { peerName: string; hasVideo: boolean }) {
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false },
  )

  const cameraTracks = tracks.filter(t => t.source === Track.Source.Camera)
  const hasScreenShare = tracks.some(t => t.source === Track.Source.ScreenShare && !t.participant.isLocal)

  if (tracks.length === 0 && !hasVideo) {
    return (
      <div className="flex size-full items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="flex size-28 items-center justify-center rounded-full bg-white/10 ring-4 ring-white/5">
            <span className="text-4xl font-bold text-white/50">
              {initialsOf(peerName)}
            </span>
          </div>
          <p className="text-sm font-medium text-white/50">{peerName}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative flex h-full">
      {hasScreenShare && <ScreenShareView />}
      <div
        className={hasScreenShare
          ? 'absolute bottom-20 right-4 z-10 flex max-h-[35%] flex-col gap-2'
          : 'flex-1'
        }
      >
        <GridLayout tracks={cameraTracks} style={{ height: hasScreenShare ? 'auto' : '100%' }}>
          <ParticipantTile />
        </GridLayout>
      </div>
    </div>
  )
}

function CallRoomInner({
  callType,
  peerName,
  onDisconnected,
}: {
  callType: 'voice' | 'video'
  peerName: string
  onDisconnected: () => void
}) {
  const [minimized, setMinimized] = useState(false)
  const [controlsVisible, setControlsVisible] = useState(true)
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const durationRef = useRef<HTMLSpanElement>(null)

  // Drag state for pop-out
  const [dragPos, setDragPos] = useState<{ x: number; y: number }>({ x: 20, y: 20 })
  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null)

  useEffect(() => {
    const start = Date.now()
    const timer = setInterval(() => {
      const d = Math.floor((Date.now() - start) / 1000)
      if (durationRef.current) {
        durationRef.current.textContent = formatDuration(d)
      }
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  // Auto-hide controls after 3s of inactivity
  const resetHideTimer = useCallback(() => {
    setControlsVisible(true)
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current)
    hideTimerRef.current = setTimeout(() => setControlsVisible(false), 3000)
  }, [])

  useEffect(() => {
    resetHideTimer()
    return () => { if (hideTimerRef.current) clearTimeout(hideTimerRef.current) }
  }, [resetHideTimer])

  // Drag handlers for pop-out mode
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      origX: dragPos.x,
      origY: dragPos.y,
    }
    const handleMouseMove = (ev: MouseEvent) => {
      if (!dragRef.current) return
      setDragPos({
        x: dragRef.current.origX + (ev.clientX - dragRef.current.startX),
        y: dragRef.current.origY + (ev.clientY - dragRef.current.startY),
      })
    }
    const handleMouseUp = () => {
      dragRef.current = null
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
  }, [dragPos])

  // Pop-out / minimized view
  if (minimized) {
    return (
      <div
        onMouseDown={handleMouseDown}
        className="fixed z-50 flex items-center gap-3 rounded-2xl border border-white/10 bg-[#1e1f22]/95 px-4 py-3 shadow-2xl backdrop-blur-md cursor-move select-none"
        style={{ left: dragPos.x, top: dragPos.y }}
      >
        <span ref={durationRef} className="font-mono text-sm font-medium text-white/70">00:00</span>
        <span className="text-xs text-white/40">{peerName}</span>
        <CallControls onHangUp={onDisconnected} compact />
        <button
          onClick={(e) => { e.stopPropagation(); setMinimized(false) }}
          className="ml-1 rounded-lg bg-white/10 px-2.5 py-1 text-xs text-white/60 hover:bg-white/20 hover:text-white transition-colors"
        >
          Expand
        </button>
      </div>
    )
  }

  return (
    <div onMouseMove={resetHideTimer} className="relative flex h-full flex-col">
      <RoomAudioRenderer />

      {/* Header */}
      <div className={`absolute top-0 inset-x-0 z-20 flex items-center justify-between px-5 py-3 transition-opacity duration-300 ${controlsVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMinimized(true)}
            className="rounded-lg bg-white/10 px-3 py-1.5 text-xs font-medium text-white/70 backdrop-blur-md transition-colors hover:bg-white/20 hover:text-white"
          >
            Minimize
          </button>
          <span className="text-sm font-medium text-white/50">{peerName}</span>
        </div>
        <span ref={durationRef} className="font-mono text-sm text-white/50">00:00</span>
      </div>

      {/* Video stage */}
      <div className="relative flex-1">
        <CallStage peerName={peerName} hasVideo={callType === 'video'} />
        <ScreenPicker />
        <LocalScreenPreview />
      </div>

      {/* Controls bar — floating pill */}
      <div className={`absolute bottom-6 left-1/2 z-20 -translate-x-1/2 transition-all duration-300 ${controlsVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
        <CallControls onHangUp={onDisconnected} />
      </div>
    </div>
  )
}

export function CallRoom({
  token,
  serverUrl,
  callType,
  peerName,
  onDisconnected,
}: {
  token: string
  serverUrl: string
  callType: 'voice' | 'video'
  peerName: string
  onDisconnected: () => void
}) {
  return (
    <LiveKitRoom
      token={token}
      serverUrl={serverUrl}
      connect
      audio
      video={callType === 'video' ? {
        resolution: { width: 1920, height: 1080, frameRate: 60 },
      } : false}
      data-lk-theme="default"
      onDisconnected={onDisconnected}
      className="fixed inset-0 z-40 flex flex-col"
      style={{ backgroundColor: '#2b2d31' }}
    >
      <CallRoomInner callType={callType} peerName={peerName} onDisconnected={onDisconnected} />
    </LiveKitRoom>
  )
}
