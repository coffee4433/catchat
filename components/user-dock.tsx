'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { LogOut, Settings, Download, RotateCw, AlertCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState, useRef, useEffect, useCallback } from 'react'
import { authClient } from '@/lib/auth-client'
import { useLanguage } from '@/lib/i18n'
import { ElectricBorder } from '@/components/electric-border'

function initialsOf(name: string) {
  return name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

type UpdateInfo = {
  version: string
  files: Array<{ url: string; size: number }>
}

type DownloadProgress = {
  percent: number
  transferred: number
  total: number
  bytesPerSecond: number
}

type UpdateState =
  | { phase: 'idle' }
  | { phase: 'available'; info: UpdateInfo }
  | { phase: 'downloading'; info: UpdateInfo; progress: DownloadProgress }
  | { phase: 'downloaded'; info: UpdateInfo }
  | { phase: 'error'; message: string }

function getUpdater() {
  if (typeof window === 'undefined') return null
  return (window as any).updater as {
    onAvailable: (cb: (info: UpdateInfo) => void) => () => void
    onDownloadProgress: (cb: (p: DownloadProgress) => void) => () => void
    onDownloaded: (cb: (info: UpdateInfo) => void) => () => void
    onError: (cb: (msg: string) => void) => () => void
    downloadUpdate: () => Promise<void>
    quitAndInstall: () => void
  } | null
}

export function UserDock({
  onOpenSettings,
  user,
}: {
  onOpenSettings: () => void
  user: { id: string; name: string; email: string; image?: string | null; banner?: string | null }
}) {
  const { t } = useLanguage()
  const router = useRouter()
  const [signingOut, setSigningOut] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const dockRef = useRef<HTMLDivElement>(null)

  const [update, setUpdate] = useState<UpdateState>({ phase: 'idle' })

  useEffect(() => {
    const updater = getUpdater()
    if (!updater) return

    const unsubAvailable = updater.onAvailable((info) => setUpdate({ phase: 'available', info }))
    const unsubProgress = updater.onDownloadProgress((progress) => {
      setUpdate((prev) => {
        if (prev.phase === 'downloading' || prev.phase === 'available') {
          const info = prev.phase === 'downloading' ? prev.info : (prev as any).info
          return { phase: 'downloading' as const, info, progress }
        }
        return prev
      })
    })
    const unsubDownloaded = updater.onDownloaded((info) => setUpdate({ phase: 'downloaded', info }))
    const unsubError = updater.onError((msg) => setUpdate({ phase: 'error', message: msg }))

    return () => {
      unsubAvailable(); unsubProgress(); unsubDownloaded(); unsubError()
    }
  }, [])

  useEffect(() => {
    if (update.phase !== 'idle') setShowMenu(true)
  }, [update.phase])

  const handleInstall = useCallback(async () => {
    const updater = getUpdater()
    if (!updater || update.phase !== 'available') return
    setUpdate((prev) =>
      prev.phase === 'available'
        ? { phase: 'downloading', info: prev.info, progress: { percent: 0, transferred: 0, total: 0, bytesPerSecond: 0 } }
        : prev
    )
    try {
      await updater.downloadUpdate()
    } catch {
      setUpdate((prev) => (prev.phase === 'downloading' ? { phase: 'error', message: 'Download failed' } : prev))
    }
  }, [update.phase])

  const handleRestart = useCallback(() => {
    getUpdater()?.quitAndInstall()
  }, [])

  const handleDismiss = useCallback(() => {
    setShowMenu(false)
    setTimeout(() => setUpdate({ phase: 'idle' }), 300)
  }, [])

  const handleSignOut = async () => {
    if (signingOut) return
    setSigningOut(true)
    await authClient.signOut()
    router.push('/sign-in')
    router.refresh()
  }

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dockRef.current && !dockRef.current.contains(event.target as Node)) {
        setShowMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const hasUpdate = update.phase !== 'idle'
  const glowActive = showMenu || hasUpdate

  function handleToggle() {
    // If there's an update and menu is closed, show update panel
    // If there's an update and menu is open, toggle off
    // If no update, toggle profile panel
    if (hasUpdate && !showMenu) {
      setShowMenu(true)
    } else {
      setShowMenu((v) => !v)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 24, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 380, damping: 32, delay: 0.15 }}
      className="fixed bottom-4 left-4 z-40"
    >
      <ElectricBorder active={glowActive} roundedClass="rounded-2xl">
        <div
          ref={dockRef}
          className="relative z-10 flex flex-col-reverse rounded-2xl border border-border bg-card/95 shadow-lg backdrop-blur-sm overflow-hidden"
        >
          {/* Collapsed bar */}
          <div
            className="flex cursor-pointer items-center gap-2 py-2 pl-2 pr-2.5"
            onClick={handleToggle}
          >
            <div className="flex items-center gap-2.5 rounded-xl px-1 py-0.5">
              <span className="relative flex size-9 shrink-0 items-center justify-center rounded-full bg-secondary text-[12px] font-semibold text-muted-foreground">
                {user.image ? (
                  <img
                    src={user.image || '/placeholder.svg'}
                    alt={user.name}
                    className="size-9 rounded-full object-cover"
                  />
                ) : (
                  initialsOf(user.name)
                )}
                <span className={`absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-card ${hasUpdate ? 'bg-[#5865F2] animate-pulse' : 'bg-success'}`} />
              </span>
              <span className="min-w-0 pr-1">
                <span className="block max-w-32 truncate text-[13px] font-semibold leading-tight">
                  {user.name}
                </span>
                <span className="block max-w-32 truncate text-[11px] leading-tight text-muted-foreground">
                  {user.email}
                </span>
              </span>
            </div>
            <div className="flex items-center gap-0.5">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onOpenSettings()
                }}
                aria-label={t.settingsLabel}
                className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                <Settings className="size-4" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleSignOut()
                }}
                aria-label={t.signOutLabel}
                disabled={signingOut}
                className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:opacity-50"
              >
                <LogOut className="size-4" />
              </button>
            </div>
          </div>

          {/* Expanded panel */}
          <AnimatePresence initial={false}>
            {showMenu && (
              <motion.div
                key="expanded"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                className="overflow-hidden"
              >
                {hasUpdate ? (
                  /* Update panel */
                  <div className="w-64">
                    <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-border/60 bg-gradient-to-r from-[#5865F2]/10 via-transparent to-transparent">
                      <div className="flex items-center gap-2">
                        <Download className="size-4 text-[#5865F2]" />
                        <span className="text-[12px] font-semibold text-foreground">
                          {update.phase === 'available' && 'Update Available'}
                          {update.phase === 'downloading' && 'Downloading...'}
                          {update.phase === 'downloaded' && 'Ready to Install'}
                          {update.phase === 'error' && 'Update Error'}
                        </span>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDismiss() }}
                        className="text-muted-foreground hover:text-foreground transition-colors p-0.5 rounded-full hover:bg-secondary/60"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-3.5"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                      </button>
                    </div>

                    <div className="px-3.5 py-3">
                      {update.phase === 'available' && (
                        <div className="space-y-3">
                          <div className="space-y-1">
                            <span className="text-[12px] text-muted-foreground">Version {update.info.version}</span>
                            {update.info.files?.[0]?.size != null && (
                              <span className="block text-[11px] text-muted-foreground/70">{formatSize(update.info.files[0].size)}</span>
                            )}
                          </div>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleInstall() }}
                            className="w-full flex items-center justify-center gap-2 rounded-lg bg-[#5865F2] px-4 py-2 text-[12.5px] font-semibold text-white hover:bg-[#5865F2]/90 transition-all active:scale-[0.98] shadow-lg shadow-[#5865F2]/25"
                          >
                            <Download className="size-3.5" /> Install
                          </button>
                        </div>
                      )}

                      {update.phase === 'downloading' && (
                        <div className="space-y-2.5">
                          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                            <span>Downloading update...</span>
                            <span>{Math.round(update.progress.percent)}%</span>
                          </div>
                          <div className="h-2 rounded-full bg-secondary overflow-hidden">
                            <motion.div
                              className="h-full rounded-full bg-[#5865F2]"
                              initial={{ width: 0 }}
                              animate={{ width: `${Math.round(update.progress.percent)}%` }}
                              transition={{ duration: 0.3, ease: 'easeOut' }}
                            />
                          </div>
                          {update.progress.bytesPerSecond > 0 && (
                            <span className="text-[10px] text-muted-foreground/60">{formatSize(update.progress.bytesPerSecond)}/s</span>
                          )}
                        </div>
                      )}

                      {update.phase === 'downloaded' && (
                        <div className="space-y-3">
                          <span className="text-[12px] text-muted-foreground">Update downloaded. Restart to apply.</span>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleRestart() }}
                            className="w-full flex items-center justify-center gap-2 rounded-lg bg-[#5865F2] px-4 py-2 text-[12.5px] font-semibold text-white hover:bg-[#5865F2]/90 transition-all active:scale-[0.98] shadow-lg shadow-[#5865F2]/25"
                          >
                            <RotateCw className="size-3.5" /> Restart Now
                          </button>
                        </div>
                      )}

                      {update.phase === 'error' && (
                        <div className="space-y-3">
                          <div className="flex items-start gap-2">
                            <AlertCircle className="size-4 text-red-400 shrink-0 mt-0.5" />
                            <span className="text-[12px] text-muted-foreground">{update.message}</span>
                          </div>
                          <button
                            onClick={(e) => { e.stopPropagation(); setUpdate({ phase: 'idle' }) }}
                            className="w-full flex items-center justify-center gap-2 rounded-lg bg-secondary px-4 py-2 text-[12.5px] font-medium text-foreground hover:bg-secondary/80 transition-all active:scale-[0.98]"
                          >
                            Dismiss
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  /* Profile panel */
                  <div
                    className="relative flex flex-col items-center px-4 pb-4 pt-10 rounded-t-2xl overflow-hidden"
                    style={user.banner ? { backgroundImage: `url(${user.banner})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
                  >
                    {user.banner && <div className="absolute inset-0 bg-gradient-to-b from-black/40 to-black/70" />}
                    <span className="relative mb-3 flex size-16 shrink-0 items-center justify-center rounded-full bg-secondary text-xl font-semibold text-muted-foreground ring-2 ring-white/20">
                      {user.image ? (
                        <img src={user.image || '/placeholder.svg'} alt={user.name} className="size-16 rounded-full object-cover" />
                      ) : (
                        initialsOf(user.name)
                      )}
                      <span className="absolute bottom-0.5 right-0.5 size-4 rounded-full border-[3px] border-card bg-success" />
                    </span>
                    <span className={`relative max-w-full truncate text-center text-base font-semibold leading-tight ${user.banner ? 'text-white' : ''}`}>
                      {user.name}
                    </span>
                    <span className={`relative mt-0.5 max-w-full truncate text-center text-xs leading-tight ${user.banner ? 'text-white/80' : 'text-muted-foreground'}`}>
                      {user.email}
                    </span>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </ElectricBorder>
    </motion.div>
  )
}
