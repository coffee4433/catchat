'use client'

import { TrackToggle, useLocalParticipant } from '@livekit/components-react'
import { Track } from 'livekit-client'
import { Mic, MicOff, Video, VideoOff, MonitorUp, MonitorOff, PhoneOff } from 'lucide-react'
import { useCallback } from 'react'

export function CallControls({ onHangUp }: { onHangUp: () => void }) {
  const { localParticipant } = useLocalParticipant()
  const screenEnabled = localParticipant?.isScreenShareEnabled ?? false

  const toggleScreenShare = useCallback(async () => {
    if (!localParticipant) return
    if (screenEnabled) {
      await localParticipant.setScreenShareEnabled(false)
    } else {
      try {
        await localParticipant.setScreenShareEnabled(true, {
          resolution: { width: 1920, height: 1080, frameRate: 60 },
          contentHint: 'detail',
        })
      } catch (e) {
        console.error('[CallControls] screen share failed:', e)
      }
    }
  }, [localParticipant, screenEnabled])

  return (
    <div className="flex items-center gap-3">
      <TrackToggle
        source={Track.Source.Microphone}
        className="flex size-11 items-center justify-center rounded-full bg-secondary text-foreground shadow-lg transition-all hover:scale-105 active:scale-95 data-[state=off]:bg-red-500/80 data-[state=off]:text-white"
      >
        <MicOff className="size-5 hidden data-[state=off]:block" />
        <Mic className="size-5 block data-[state=off]:hidden" />
      </TrackToggle>

      <TrackToggle
        source={Track.Source.Camera}
        className="flex size-11 items-center justify-center rounded-full bg-secondary text-foreground shadow-lg transition-all hover:scale-105 active:scale-95 data-[state=off]:bg-red-500/80 data-[state=off]:text-white"
      >
        <VideoOff className="size-5 hidden data-[state=off]:block" />
        <Video className="size-5 block data-[state=off]:hidden" />
      </TrackToggle>

      <button
        onClick={toggleScreenShare}
        className={`flex size-11 items-center justify-center rounded-full shadow-lg transition-all hover:scale-105 active:scale-95 ${screenEnabled ? 'bg-primary text-primary-foreground' : 'bg-secondary text-foreground'}`}
        title={screenEnabled ? 'Stop sharing' : 'Share screen'}
      >
        {screenEnabled ? <MonitorOff className="size-5" /> : <MonitorUp className="size-5" />}
      </button>

      <button
        onClick={onHangUp}
        className="flex size-12 items-center justify-center rounded-full bg-red-500 text-white shadow-lg transition-all hover:scale-105 hover:bg-red-600 active:scale-95"
        title="Hang up"
      >
        <PhoneOff className="size-5" />
      </button>
    </div>
  )
}
