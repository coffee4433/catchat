'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { PhoneOff, Video, Phone } from 'lucide-react'
import { useEffect } from 'react'
import { createRinger } from '@/lib/calls/ringtone'
import type { CallType } from '@/lib/calls/types'

function initialsOf(name: string) {
  return name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

export function OutgoingCallOverlay({
  calleeName,
  calleeImage,
  callType,
  onCancel,
}: {
  calleeName: string
  calleeImage: string | null
  callType: CallType
  onCancel: () => void
}) {
  useEffect(() => {
    const ringer = createRinger('outgoing')
    ringer.start()
    return () => ringer.stop()
  }, [])

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
        role="dialog"
        aria-modal="true"
        aria-label={`Llamando a ${calleeName}`}
      >
        <motion.div
          initial={{ scale: 0.9, y: 24, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.9, y: 24, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 320, damping: 30 }}
          className="flex w-full max-w-sm flex-col items-center rounded-2xl border border-border bg-card p-8 shadow-2xl"
        >
          {/* Avatar with pulsing ripple rings */}
          <div className="incoming-call-ring relative mb-5 size-24">
            <div className="relative z-10 flex size-24 items-center justify-center overflow-hidden rounded-full bg-secondary">
              {calleeImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={calleeImage || '/placeholder.svg'} alt="" className="size-full object-cover" />
              ) : (
                <span className="text-3xl font-bold text-muted-foreground">
                  {initialsOf(calleeName)}
                </span>
              )}
            </div>
          </div>

          <h2 className="mb-1 text-lg font-semibold text-foreground">{calleeName}</h2>
          <p className="mb-8 flex items-center gap-1.5 text-sm text-muted-foreground">
            {callType === 'video' ? <Video className="size-4" /> : <Phone className="size-4" />}
            <span className="calling-dots">Llamando</span>
          </p>

          <button
            onClick={onCancel}
            aria-label="Cancelar llamada"
            className="flex size-14 items-center justify-center rounded-full bg-[#f23f42] text-white shadow-lg transition-transform hover:scale-110 hover:bg-[#da373c] active:scale-95"
          >
            <PhoneOff className="size-6" />
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
