'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { PhoneOff } from 'lucide-react'
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
  peerName,
  peerImage,
  callType,
  onCancel,
}: {
  peerName: string
  peerImage?: string | null
  callType: CallType
  onCancel: () => void
}) {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      >
        <motion.div
          initial={{ scale: 0.85, y: 30, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.85, y: 30, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="flex w-full max-w-sm flex-col items-center rounded-2xl border border-border bg-card p-10 shadow-2xl"
        >
          {/* Avatar with ripple rings */}
          <div className="relative mb-6">
            <div className="call-ring-pulse relative flex size-28 items-center justify-center overflow-hidden rounded-full bg-secondary">
              {peerImage ? (
                <img src={peerImage} alt={peerName} className="size-full object-cover" />
              ) : (
                <span className="text-3xl font-bold text-muted-foreground">
                  {initialsOf(peerName)}
                </span>
              )}
            </div>
          </div>

          {/* Caller info */}
          <h2 className="mb-1 text-xl font-bold text-foreground">{peerName}</h2>
          <p className="mb-2 flex items-center gap-1.5 text-sm text-muted-foreground">
            {callType === 'video' ? 'Video call' : 'Voice call'}
          </p>

          {/* Calling... with animated dots */}
          <p className="calling-dots mb-8 text-sm text-muted-foreground">
            Calling<span>.</span><span>.</span><span>.</span>
          </p>

          {/* Cancel button */}
          <button
            onClick={onCancel}
            className="flex size-16 items-center justify-center rounded-full bg-red-500 text-white shadow-lg transition-all hover:scale-110 hover:bg-red-600 active:scale-95"
            title="Cancel call"
          >
            <PhoneOff className="size-7" />
          </button>
          <span className="mt-2.5 text-xs text-muted-foreground">Cancel</span>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
