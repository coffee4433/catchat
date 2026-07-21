'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { Download, RotateCw, X, AlertCircle } from 'lucide-react'
import { useState, useEffect, useCallback } from 'react'
import { ElectricBorder } from '@/components/electric-border'
import type { UpdateInfo, DownloadProgress } from '@/lib/updater'

type UpdateState =
  | { phase: 'idle' }
  | { phase: 'available'; info: UpdateInfo }
  | { phase: 'downloading'; info: UpdateInfo; progress: DownloadProgress }
  | { phase: 'downloaded'; info: UpdateInfo }
  | { phase: 'error'; message: string }

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function UpdateNotification() {
  const [state, setState] = useState<UpdateState>({ phase: 'idle' })
  const [isElectron, setIsElectron] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined' || !window.updater) return
    setIsElectron(true)

    const unsubAvailable = window.updater.onAvailable((info) => {
      setState({ phase: 'available', info })
    })

    const unsubProgress = window.updater.onDownloadProgress((progress) => {
      setState((prev) => {
        if (prev.phase === 'downloading' || prev.phase === 'available') {
          const info = prev.phase === 'downloading' ? prev.info : (prev as { phase: 'available'; info: UpdateInfo }).info
          return { phase: 'downloading', info, progress }
        }
        return prev
      })
    })

    const unsubDownloaded = window.updater.onDownloaded((info) => {
      setState({ phase: 'downloaded', info })
    })

    const unsubError = window.updater.onError((message) => {
      setState({ phase: 'error', message })
    })

    return () => {
      unsubAvailable()
      unsubProgress()
      unsubDownloaded()
      unsubError()
    }
  }, [])

  const handleInstall = useCallback(async () => {
    if (state.phase !== 'available') return
    try {
      setState((prev) => {
        if (prev.phase === 'available') {
          return { phase: 'downloading', info: prev.info, progress: { percent: 0, transferred: 0, total: 0, bytesPerSecond: 0 } }
        }
        return prev
      })
      await window.updater!.downloadUpdate()
    } catch {
      setState((prev) => {
        if (prev.phase === 'downloading') {
          return { phase: 'error', message: 'Download failed' }
        }
        return prev
      })
    }
  }, [state.phase])

  const handleRestart = useCallback(() => {
    window.updater?.quitAndInstall()
  }, [])

  const handleDismiss = useCallback(() => {
    setState({ phase: 'idle' })
  }, [])

  const handleRetry = useCallback(async () => {
    try {
      const result = await window.updater?.checkForUpdates()
      if (result) {
        setState({ phase: 'available', info: result })
      }
    } catch {
      // ignore
    }
  }, [])

  if (!isElectron) return null

  const show = state.phase !== 'idle'

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 24, scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 380, damping: 32 }}
          className="fixed bottom-4 left-4 z-50"
        >
          <ElectricBorder active={true} color="#5865F2" roundedClass="rounded-2xl">
            <div className="relative z-10 flex flex-col rounded-2xl border border-border bg-card/95 shadow-lg backdrop-blur-sm overflow-hidden min-w-64">
              {/* Header */}
              <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-border/60 bg-gradient-to-r from-[#5865F2]/10 via-transparent to-transparent">
                <div className="flex items-center gap-2">
                  <Download className="size-4 text-[#5865F2]" />
                  <span className="text-[12px] font-semibold text-foreground">
                    {state.phase === 'available' && 'Update Available'}
                    {state.phase === 'downloading' && 'Downloading...'}
                    {state.phase === 'downloaded' && 'Ready to Install'}
                    {state.phase === 'error' && 'Update Error'}
                  </span>
                </div>
                {(state.phase === 'available' || state.phase === 'error') && (
                  <button
                    onClick={handleDismiss}
                    className="text-muted-foreground hover:text-foreground transition-colors p-0.5 rounded-full hover:bg-secondary/60"
                  >
                    <X className="size-3.5" />
                  </button>
                )}
              </div>

              {/* Body */}
              <div className="px-3.5 py-3">
                {state.phase === 'available' && (
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <span className="text-[12px] text-muted-foreground">
                        Version {state.info.version}
                      </span>
                      {state.info.files?.[0]?.size != null && (
                        <span className="block text-[11px] text-muted-foreground/70">
                          {formatSize(state.info.files[0].size)}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={handleInstall}
                      className="w-full flex items-center justify-center gap-2 rounded-lg bg-[#5865F2] px-4 py-2 text-[12.5px] font-semibold text-white hover:bg-[#5865F2]/90 transition-all active:scale-[0.98] shadow-lg shadow-[#5865F2]/25"
                    >
                      <Download className="size-3.5" />
                      Install
                    </button>
                  </div>
                )}

                {state.phase === 'downloading' && (
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                      <span>Downloading update...</span>
                      <span>{Math.round(state.progress.percent)}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-secondary overflow-hidden">
                      <motion.div
                        className="h-full rounded-full bg-[#5865F2]"
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.round(state.progress.percent)}%` }}
                        transition={{ duration: 0.3, ease: 'easeOut' }}
                      />
                    </div>
                    {state.progress.bytesPerSecond > 0 && (
                      <span className="text-[10px] text-muted-foreground/60">
                        {formatSize(state.progress.bytesPerSecond)}/s
                      </span>
                    )}
                  </div>
                )}

                {state.phase === 'downloaded' && (
                  <div className="space-y-3">
                    <span className="text-[12px] text-muted-foreground">
                      Update downloaded. Restart to apply.
                    </span>
                    <button
                      onClick={handleRestart}
                      className="w-full flex items-center justify-center gap-2 rounded-lg bg-[#5865F2] px-4 py-2 text-[12.5px] font-semibold text-white hover:bg-[#5865F2]/90 transition-all active:scale-[0.98] shadow-lg shadow-[#5865F2]/25"
                    >
                      <RotateCw className="size-3.5" />
                      Restart Now
                    </button>
                  </div>
                )}

                {state.phase === 'error' && (
                  <div className="space-y-3">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="size-4 text-red-400 shrink-0 mt-0.5" />
                      <span className="text-[12px] text-muted-foreground">
                        {state.message}
                      </span>
                    </div>
                    <button
                      onClick={handleRetry}
                      className="w-full flex items-center justify-center gap-2 rounded-lg bg-secondary px-4 py-2 text-[12.5px] font-medium text-foreground hover:bg-secondary/80 transition-all active:scale-[0.98]"
                    >
                      Retry
                    </button>
                  </div>
                )}
              </div>
            </div>
          </ElectricBorder>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
