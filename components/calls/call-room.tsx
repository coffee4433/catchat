'use client'

import {
  LiveKitRoom,
  RoomAudioRenderer,
  useTracks,
  useSpeakingParticipants,
  GridLayout,
  ParticipantTile,
  TrackRefContext,
} from '@livekit/components-react'
import { Track } from 'livekit-client'
import { useState } from 'react'
import { CallControls } from './call-controls'

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

function CallStage({ peerName, hasVideo }: { peerName: string; hasVideo: boolean }) {
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: true },
  )

  const speakingParticipants = useSpeakingParticipants()

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
    <GridLayout tracks={tracks} style={{ height: '100%' }}>
      <ParticipantTile />
    </GridLayout>
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
  const [duration, setDuration] = useState(0)
  const [minimized, setMinimized] = useState(false)

  return (
    <LiveKitRoom
      token={token}
      serverUrl={serverUrl}
      connect
      audio
      video={callType === 'video'}
      data-lk-theme="default"
      onConnected={() => {
        const start = Date.now()
        const timer = setInterval(() => {
          setDuration(Math.floor((Date.now() - start) / 1000))
        }, 1000)
        return () => clearInterval(timer)
      }}
      onDisconnected={onDisconnected}
      className={minimized ? 'fixed bottom-4 right-4 z-50 rounded-2xl border border-border bg-card p-2 shadow-2xl' : 'fixed inset-0 z-40 flex flex-col bg-black'}
    >
      {minimized ? (
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-white">{formatDuration(duration)}</span>
          <CallControls onHangUp={onDisconnected} />
        </div>
      ) : (
        <>
          <div className="relative flex-1">
            <RoomAudioRenderer />
            <CallStage peerName={peerName} hasVideo={callType === 'video'} />
          </div>
          <div className="absolute top-4 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1">
            <p className="text-sm text-white/60">{formatDuration(duration)}</p>
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
      )}
    </LiveKitRoom>
  )
}
