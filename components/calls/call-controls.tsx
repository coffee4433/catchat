'use client'

import { TrackToggle, useLocalParticipant } from '@livekit/components-react'
import { Track } from 'livekit-client'
import { Mic, MicOff, Video, VideoOff, MonitorUp, MonitorOff, PhoneOff, MoreHorizontal } from 'lucide-react'
import { useCallback } from 'react'

export function CallControls({ onHangUp, compact }: { onHangUp: () => void; compact?: boolean }) {
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

  if (compact) {
    return (
      <div className="flex items-center gap-1.5">
        <TrackToggle
          source={Track.Source.Microphone}
          className="flex size-8 items-center justify-center rounded-full bg-white/10 text-white/80 transition-all hover:bg-white/20 data-[state=off]:bg-red-500/80 data-[state=off]:text-white"
        >
          <Mic className="size-3.5" />
        </TrackToggle>
        <button
          onClick={onHangUp}
          className="flex h-8 items-center justify-center rounded-full bg-[#f23f42] px-3 text-white transition-all hover:bg-[#da373c] active:scale-95"
          title="Hang up"
        >
          <PhoneOff className="size-3.5" />
        </button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-[#1e1f22]/80 px-4 py-2.5 shadow-2xl backdrop-blur-2xl">
      {/* Mic toggle */}
      <TrackToggle
        source={Track.Source.Microphone}
        className="flex size-11 items-center justify-center rounded-full bg-white/10 text-white/90 transition-all hover:bg-white/20 hover:scale-105 active:scale-95 data-[state=off]:bg-red-500/80 data-[state=off]:text-white"
      >
        <MicOff className="size-5 hidden data-[state=off]:block" />
        <Mic className="size-5 block data-[state=off]:hidden" />
      </TrackToggle>

      {/* Camera toggle */}
      <TrackToggle
        source={Track.Source.Camera}
        className="flex size-11 items-center justify-center rounded-full bg-white/10 text-white/90 transition-all hover:bg-white/20 hover:scale-105 active:scale-95 data-[state=off]:bg-red-500/80 data-[state=off]:text-white"
      >
        <VideoOff className="size-5 hidden data-[state=off]:block" />
        <Video className="size-5 block data-[state=off]:hidden" />
      </TrackToggle>

      {/* Screen share */}
      <button
        onClick={toggleScreenShare}
        className={`flex size-11 items-center justify-center rounded-full transition-all hover:scale-105 active:scale-95 ${
          screenEnabled
            ? 'bg-primary text-primary-foreground'
            : 'bg-white/10 text-white/90 hover:bg-white/20'
        }`}
        title={screenEnabled ? 'Stop sharing' : 'Share screen'}
      >
        {screenEnabled ? <MonitorOff className="size-5" /> : <MonitorUp className="size-5" />}
      </button>

      {/* More options */}
      <button
        className="flex size-11 items-center justify-center rounded-full bg-white/10 text-white/90 transition-all hover:bg-white/20 hover:scale-105 active:scale-95"
        title="More options"
      >
        <MoreHorizontal className="size-5" />
      </button>

      {/* Divider */}
      <div className="mx-1 h-6 w-px bg-white/15" />

      {/* Hang up — pill shape, wider, red */}
      <button
        onClick={onHangUp}
        className="flex h-11 items-center justify-center rounded-full bg-[#f23f42] px-6 text-white shadow-lg transition-all hover:scale-105 hover:bg-[#da373c] active:scale-95"
        title="Hang up"
      >
        <PhoneOff className="size-5" />
      </button>
    </div>
  )
}
