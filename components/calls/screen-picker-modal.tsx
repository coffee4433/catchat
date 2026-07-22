'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

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
  const gotSources = useRef(false)

  useEffect(() => {
    if (!open) {
      gotSources.current = false
      setSources([])
      return
    }
    const screenShareApi = (window as any).screenShare as
      | {
          onSources: (cb: (sources: ScreenSource[]) => void) => () => void
          select: (sourceId: string | null) => Promise<void>
        }
      | undefined

    if (screenShareApi) {
      const unsub = screenShareApi.onSources((s: ScreenSource[]) => {
        gotSources.current = true
        setSources(s)
      })
      return () => unsub()
    }
  }, [open])

  const handleSelect = async (sourceId: string) => {
    const screenShareApi = (window as any).screenShare
    if (screenShareApi) {
      await screenShareApi.select(sourceId)
    }
    onSelect(sourceId)
  }

  const handleCancel = () => {
    const screenShareApi = (window as any).screenShare
    if (screenShareApi) {
      screenShareApi.select(null).catch(() => {})
    }
    onClose()
  }

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
                onClick={handleCancel}
                className="rounded-md p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="grid max-h-80 grid-cols-2 gap-3 overflow-auto">
              {sources.length === 0 && (
                <p className="col-span-2 py-8 text-center text-sm text-muted-foreground">
                  {gotSources.current ? 'Loading previews...' : 'Waiting for screen sources...'}
                </p>
              )}
              {sources.map((source) => (
                <button
                  key={source.id}
                  onClick={() => handleSelect(source.id)}
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
