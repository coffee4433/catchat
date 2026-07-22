'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { useEffect, useState } from 'react'

interface ScreenSource {
  id: string
  name: string
  thumbnail: string
}

export function ScreenPickerModal({
  open,
  onSelect,
  onClose,
}: {
  open: boolean
  onSelect: (sourceId: string | null) => void
  onClose: () => void
}) {
  const [sources, setSources] = useState<ScreenSource[]>([])

  useEffect(() => {
    if (!open) return
    const screenShareApi = (window as any).screenShare as
      | {
          onSources: (cb: (sources: ScreenSource[]) => void) => () => void
          select: (sourceId: string | null) => Promise<void>
        }
      | undefined

    if (screenShareApi) {
      const unsub = screenShareApi.onSources((s: ScreenSource[]) => {
        setSources(s)
      })
      return () => unsub()
    }
  }, [open])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.9, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, y: 20, opacity: 0 }}
            className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl"
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">
                Choose what to share
              </h2>
              <button
                onClick={onClose}
                className="rounded-md p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="grid max-h-80 grid-cols-2 gap-3 overflow-auto">
              {sources.map((source) => (
                <button
                  key={source.id}
                  onClick={() => onSelect(source.id)}
                  className="flex flex-col items-center gap-2 rounded-xl border border-border bg-secondary p-3 text-left transition-colors hover:bg-secondary/80"
                >
                  {source.thumbnail ? (
                    <img
                      src={source.thumbnail}
                      alt={source.name}
                      className="w-full rounded object-cover"
                      style={{ aspectRatio: '16/10' }}
                    />
                  ) : (
                    <div className="w-full rounded bg-muted" style={{ aspectRatio: '16/10' }} />
                  )}
                  <span className="w-full truncate text-center text-xs text-foreground">
                    {source.name}
                  </span>
                </button>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
