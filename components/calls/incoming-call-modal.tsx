'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { Phone, PhoneOff, Video } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { CallType } from '@/lib/calls/types'

function initialsOf(name: string) {
  return name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

export function IncomingCallModal({
  callerName,
  callerImage,
  callType,
  onAccept,
  onReject,
  onTimeout,
}: {
  callerName: string
  callerImage: string | null
  callType: CallType
  onAccept: () => void
  onReject: () => void
  onTimeout: () => void
}) {
  const [show, setShow] = useState(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const t = setTimeout(() => setShow(true), 50)
    timeoutRef.current = setTimeout(() => {
      onTimeout()
    }, 30000)
    return () => {
      clearTimeout(t)
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [onTimeout])

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.8, y: 40, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.8, y: 40, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="flex w-full max-w-sm flex-col items-center rounded-2xl border border-border bg-card p-8 shadow-2xl"
          >
            <motion.div
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="mb-4 flex size-20 items-center justify-center overflow-hidden rounded-full bg-secondary ring-4 ring-primary/30"
            >
              {callerImage ? (
                <img src={callerImage} alt={callerName} className="size-full object-cover" />
              ) : (
                <span className="text-2xl font-bold text-muted-foreground">
                  {initialsOf(callerName)}
                </span>
              )}
            </motion.div>

            <h2 className="mb-1 text-lg font-semibold text-foreground">{callerName}</h2>
            <p className="mb-6 text-sm text-muted-foreground">
              {callType === 'video' ? 'Incoming video call...' : 'Incoming voice call...'}
            </p>

            <div className="flex gap-4">
              <button
                onClick={onReject}
                className="flex size-14 items-center justify-center rounded-full bg-red-500 text-white shadow-lg transition-transform hover:scale-110 active:scale-95"
              >
                <PhoneOff className="size-6" />
              </button>
              <button
                onClick={onAccept}
                className="flex size-14 items-center justify-center rounded-full bg-green-500 text-white shadow-lg transition-transform hover:scale-110 active:scale-95"
              >
                {callType === 'video' ? <Video className="size-6" /> : <Phone className="size-6" />}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
