'use client'

import { Mic, MicOff, Video, VideoOff, MonitorUp, MonitorOff, PhoneOff } from 'lucide-react'
import { useCallContext } from './call-provider'

export function CallControls({
  onStartScreenShare,
}: {
  onStartScreenShare?: () => void
}) {
  const {
    micOn,
    camOn,
    screenOn,
    hangUp,
    toggleMic,
    toggleCam,
    startScreenShare,
    stopScreenShare,
    activeCall,
  } = useCallContext()

  if (!activeCall) return null

  const btn =
    'flex size-11 items-center justify-center rounded-full transition-all hover:scale-105 active:scale-95 shadow-lg'

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={toggleMic}
        className={`${btn} ${micOn ? 'bg-secondary text-foreground' : 'bg-red-500/80 text-white'}`}
        title={micOn ? 'Mute microphone' : 'Unmute microphone'}
      >
        {micOn ? <Mic className="size-5" /> : <MicOff className="size-5" />}
      </button>

      <button
        onClick={toggleCam}
        className={`${btn} ${camOn ? 'bg-secondary text-foreground' : 'bg-red-500/80 text-white'}`}
        title={camOn ? 'Turn off camera' : 'Turn on camera'}
      >
        {camOn ? <Video className="size-5" /> : <VideoOff className="size-5" />}
      </button>

      <button
        onClick={screenOn ? stopScreenShare : (onStartScreenShare || startScreenShare)}
        className={`${btn} ${screenOn ? 'bg-primary text-primary-foreground' : 'bg-secondary text-foreground'}`}
        title={screenOn ? 'Stop sharing' : 'Share screen'}
      >
        {screenOn ? <MonitorOff className="size-5" /> : <MonitorUp className="size-5" />}
      </button>

      <button
        onClick={hangUp}
        className="flex size-12 items-center justify-center rounded-full bg-red-500 text-white shadow-lg transition-all hover:scale-105 hover:bg-red-600 active:scale-95"
        title="Hang up"
      >
        <PhoneOff className="size-5" />
      </button>
    </div>
  )
}
