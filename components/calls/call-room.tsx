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
import { useEffect, useRef, useState } from 'react'
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
    <div style={{ position: 'absolute', bottom: 16, left: 16, width: 200, borderRadius: 8, overflow: 'hidden', border: '2px solid rgba(255,255,255,0.2)', zIndex: 10 }}>
      <VideoTrack trackRef={local[0] as any} style={{ width: '100%', height: 'auto' }} />
    </div>
  )
}

function ScreenShareView() {
  const allTracks = useTracks([{ source: Track.Source.ScreenShare, withPlaceholder: false }], { onlySubscribed: false })
  const remote = allTracks.filter(t => !t.participant.isLocal && t.publication)
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    console.log('[ScreenShareView] remote tracks:', remote.length, remote.map(t => t.participant.identity))
    const el = videoRef.current
    if (!el || remote.length === 0) return
    const pub = remote[0].publication
    if (!pub) return
    const track = pub.videoTrack
    console.log('[ScreenShareView] track:', track?.kind, track?.isMuted)
    if (!track) return
    const mediaStream = new MediaStream([track.mediaStreamTrack])
    el.srcObject = mediaStream
    el.play().catch((e) => console.error('[ScreenShareView] play error:', e))
    return () => {
      el.srcObject = null
    }
  }, [remote])

  if (remote.length === 0) return null
  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#000' }}>
      <video ref={videoRef} autoPlay playsInline style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
    </div>
  )
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
        <div className="flex flex-col items-center gap-3">
          <div className="flex size-24 items-center justify-center rounded-full bg-white/10">
            <span className="text-3xl font-bold text-white/60">
              {peerName
                .split(' ')
                .map((p) => p[0])
                .slice(0, 2)
                .join('')
                .toUpperCase()}
            </span>
          </div>
          <p className="text-sm text-white/60">{peerName}</p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ position: 'relative', height: '100%', display: 'flex' }}>
      {hasScreenShare && (
        <ScreenShareView />
      )}
      <div style={hasScreenShare ? { position: 'absolute', bottom: 16, right: 16, zIndex: 10, display: 'flex', flexDirection: 'column', gap: 8, maxHeight: '40%' } : { flex: 1 }}>
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
  const durationRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const start = Date.now()
    const timer = setInterval(() => {
      const d = Math.floor((Date.now() - start) / 1000)
      const m = Math.floor(d / 60)
      const s = d % 60
      if (durationRef.current) {
        durationRef.current.textContent = formatDuration(d)
      }
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  return minimized ? (
    <div className="flex items-center gap-3">
      <span ref={durationRef} className="text-sm font-medium text-white">00:00</span>
      <CallControls onHangUp={onDisconnected} />
    </div>
  ) : (
    <>
      <div className="relative flex-1">
        <RoomAudioRenderer />
        <CallStage peerName={peerName} hasVideo={callType === 'video'} />
        <ScreenPicker />
        <LocalScreenPreview />
      </div>
      <div className="absolute top-4 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1">
        <span ref={durationRef} className="text-sm text-white/60">00:00</span>
      </div>
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2">
        <CallControls onHangUp={onDisconnected} />
      </div>
      <button
        onClick={() => setMinimized(!minimized)}
        className="absolute top-4 left-4 rounded-lg bg-white/10 px-3 py-1 text-sm text-white/70 hover:bg-white/20"
      >
        {minimized ? 'Expand' : 'Minimize'}
      </button>
    </>
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
      video={callType === 'video'}
      data-lk-theme="default"
      onDisconnected={onDisconnected}
      className="fixed inset-0 z-40 flex flex-col bg-black"
    >
      <CallRoomInner callType={callType} peerName={peerName} onDisconnected={onDisconnected} />
    </LiveKitRoom>
  )
}
