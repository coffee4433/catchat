'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { useLocalParticipant, useMediaDeviceSelect } from '@livekit/components-react'
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  MonitorUp,
  MonitorOff,
  ChevronDown,
  ChevronUp,
  MoreHorizontal,
  Check,
  Phone,
} from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'

function DeviceMenu({
  kind,
  onClose,
}: {
  kind: 'audioinput' | 'videoinput'
  onClose: () => void
}) {
  const { devices, activeDeviceId, setActiveMediaDevice } = useMediaDeviceSelect({ kind })
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 8, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.96 }}
      transition={{ duration: 0.15, ease: 'easeOut' }}
      className="absolute bottom-full left-0 z-50 mb-2 w-64 overflow-hidden rounded-xl border border-white/10 bg-[#111214] p-1.5 shadow-2xl"
    >
      <p className="px-2.5 pb-1.5 pt-1 text-[10px] font-bold uppercase tracking-wider text-white/40">
        {kind === 'audioinput' ? 'Micrófono' : 'Cámara'}
      </p>
      {devices.length === 0 && (
        <p className="px-2.5 py-2 text-[12px] text-white/40">No hay dispositivos</p>
      )}
      {devices.map((d) => {
        const active = d.deviceId === activeDeviceId
        return (
          <button
            key={d.deviceId}
            onClick={() => {
              setActiveMediaDevice(d.deviceId)
              onClose()
            }}
            className={`flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left text-[12.5px] transition-colors ${
              active ? 'bg-white/10 text-white' : 'text-white/70 hover:bg-white/5 hover:text-white'
            }`}
          >
            <span className="truncate">{d.label || 'Dispositivo'}</span>
            {active && <Check className="size-3.5 shrink-0 text-[#23a55a]" />}
          </button>
        )
      })}
    </motion.div>
  )
}

export function CallControls({ onHangUp, compact }: { onHangUp: () => void; compact?: boolean }) {
  const { localParticipant } = useLocalParticipant()
  const [openMenu, setOpenMenu] = useState<'audioinput' | 'videoinput' | null>(null)
  const [, forceRender] = useState(0)

  const micEnabled = localParticipant?.isMicrophoneEnabled ?? false
  const camEnabled = localParticipant?.isCameraEnabled ?? false
  const screenEnabled = localParticipant?.isScreenShareEnabled ?? false

  const refresh = useCallback(() => forceRender((v) => v + 1), [])

  const toggleMic = useCallback(async () => {
    if (!localParticipant) return
    await localParticipant.setMicrophoneEnabled(!micEnabled)
    refresh()
  }, [localParticipant, micEnabled, refresh])

  const toggleCam = useCallback(async () => {
    if (!localParticipant) return
    await localParticipant.setCameraEnabled(!camEnabled)
    refresh()
  }, [localParticipant, camEnabled, refresh])

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
    refresh()
  }, [localParticipant, screenEnabled, refresh])

  if (compact) {
    return (
      <div className="flex items-center gap-1.5">
        <button
          onClick={toggleMic}
          className={`flex size-8 items-center justify-center rounded-full transition-all ${
            micEnabled ? 'bg-white/10 text-white/80 hover:bg-white/20' : 'bg-[#da373c] text-white'
          }`}
        >
          {micEnabled ? <Mic className="size-3.5" /> : <MicOff className="size-3.5" />}
        </button>
        <button
          onClick={onHangUp}
          className="flex h-8 items-center justify-center rounded-full bg-[#f23f42] px-3 text-white transition-all hover:bg-[#da373c] active:scale-95"
          title="Colgar"
        >
          <Phone className="size-3.5 rotate-[135deg]" />
        </button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2.5">
      {/* Pill 1: mic + camera with device dropdowns */}
      <div className="flex items-center rounded-xl border border-white/[0.06] bg-[#1e1f22]/95 p-1.5 shadow-xl backdrop-blur-md">
        {/* Mic */}
        <div className="relative flex items-center">
          <button
            onClick={toggleMic}
            title={micEnabled ? 'Silenciar' : 'Activar micrófono'}
            className={`flex size-10 items-center justify-center rounded-l-lg transition-colors ${
              micEnabled
                ? 'text-white/90 hover:bg-white/10'
                : 'bg-white text-[#1e1f22] hover:bg-white/90'
            }`}
          >
            {micEnabled ? <Mic className="size-5" /> : <MicOff className="size-5" />}
          </button>
          <button
            onClick={() => setOpenMenu(openMenu === 'audioinput' ? null : 'audioinput')}
            title="Seleccionar micrófono"
            className="flex h-10 w-6 items-center justify-center rounded-r-lg text-white/50 transition-colors hover:bg-white/10 hover:text-white/90"
          >
            {openMenu === 'audioinput' ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
          </button>
          <AnimatePresence>
            {openMenu === 'audioinput' && <DeviceMenu kind="audioinput" onClose={() => setOpenMenu(null)} />}
          </AnimatePresence>
        </div>

        <div className="mx-1 h-6 w-px bg-white/10" />

        {/* Camera */}
        <div className="relative flex items-center">
          <button
            onClick={toggleCam}
            title={camEnabled ? 'Apagar cámara' : 'Encender cámara'}
            className={`flex size-10 items-center justify-center rounded-l-lg transition-colors ${
              camEnabled
                ? 'bg-white text-[#1e1f22] hover:bg-white/90'
                : 'text-white/90 hover:bg-white/10'
            }`}
          >
            {camEnabled ? <Video className="size-5" /> : <VideoOff className="size-5" />}
          </button>
          <button
            onClick={() => setOpenMenu(openMenu === 'videoinput' ? null : 'videoinput')}
            title="Seleccionar cámara"
            className="flex h-10 w-6 items-center justify-center rounded-r-lg text-white/50 transition-colors hover:bg-white/10 hover:text-white/90"
          >
            {openMenu === 'videoinput' ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
          </button>
          <AnimatePresence>
            {openMenu === 'videoinput' && <DeviceMenu kind="videoinput" onClose={() => setOpenMenu(null)} />}
          </AnimatePresence>
        </div>
      </div>

      {/* Pill 2: screen share + more */}
      <div className="flex items-center gap-0.5 rounded-xl border border-white/[0.06] bg-[#1e1f22]/95 p-1.5 shadow-xl backdrop-blur-md">
        <button
          onClick={toggleScreenShare}
          title={screenEnabled ? 'Dejar de compartir' : 'Compartir pantalla'}
          className={`flex size-10 items-center justify-center rounded-lg transition-colors ${
            screenEnabled ? 'bg-white text-[#1e1f22] hover:bg-white/90' : 'text-white/90 hover:bg-white/10'
          }`}
        >
          {screenEnabled ? <MonitorOff className="size-5" /> : <MonitorUp className="size-5" />}
        </button>
        <button
          title="Más opciones"
          className="flex size-10 items-center justify-center rounded-lg text-white/90 transition-colors hover:bg-white/10"
        >
          <MoreHorizontal className="size-5" />
        </button>
      </div>

      {/* Hang up — red rounded rect */}
      <button
        onClick={onHangUp}
        title="Colgar"
        className="flex h-[52px] items-center justify-center rounded-xl bg-[#da373c] px-6 text-white shadow-xl transition-all hover:bg-[#a12828] hover:scale-[1.03] active:scale-95"
      >
        <Phone className="size-5 rotate-[135deg]" />
      </button>
    </div>
  )
}
