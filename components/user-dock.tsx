'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { LogOut, Settings, Download, RotateCw, AlertCircle, Radio, Activity, PhoneOff, Mic, MicOff, Video, VideoOff, MonitorUp, MonitorOff, Sparkles, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { authClient } from '@/lib/auth-client'
import { getFullscreenElement, subscribeFullscreenChange } from '@/lib/fullscreen'
import { useLanguage } from '@/lib/i18n'
import { ElectricBorder } from '@/components/electric-border'
import { useCallContext } from '@/components/calls/call-provider'
import type { ActiveCall } from '@/lib/calls/types'
import { usePlugins } from '@/lib/plugins/plugin-provider'
import { CatMusicDockWidget } from '@/components/cat-music/dock-widget'

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

/** Remaining download time as `m:ss`, or null while the rate is still unknown. */
function formatEta(progress: DownloadProgress): string | null {
  const remaining = progress.total - progress.transferred
  if (remaining <= 0 || progress.bytesPerSecond <= 0) return null
  const seconds = Math.round(remaining / progress.bytesPerSecond)
  if (seconds < 60) return `${seconds}s`
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
}

type UpdateInfo = {
  version: string
  files: Array<{ url: string; size: number }>
  releaseNotes?: string
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
    checkForUpdates?: () => Promise<unknown>
    downloadUpdate: () => Promise<void>
    quitAndInstall: () => void
    getVersion?: () => Promise<string>
  } | null
}

function DiscordVoiceDockWidget({ call }: { call: ActiveCall | null }) {
  const { endCall, cancelOutgoingCall, room } = useCallContext()
  const [, forceRender] = useState(0)

  const lastCallRef = useRef(call)
  if (call) {
    lastCallRef.current = call
  }

  const currentCall = call || lastCallRef.current
  const localParticipant = room?.localParticipant

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
        console.error('[DiscordVoiceDockWidget] screen share failed:', e)
      }
    }
    refresh()
  }, [localParticipant, screenEnabled, refresh])

  if (!currentCall) return null

  const peerName = currentCall.peerName || 'Llamada'
  const isRinging = currentCall.state === 'outgoing-ringing'

  return (
    <div className="w-64 border-b border-border/50 bg-[#1e1f22] p-2.5 space-y-2">
      {/* Header section: Connection status & Peer name */}
      <div className="flex items-center justify-between px-0.5">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-[#23a55a]/15 text-[#23a55a]">
            <Radio className="size-4 animate-pulse" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="block text-[12px] font-semibold text-[#23a55a] leading-tight">
              {isRinging ? 'Llamando...' : 'Voz conectada'}
            </span>
            <span className="block truncate text-[11px] font-medium text-white/70 leading-tight">
              {peerName}
            </span>
          </div>
        </div>

        {/* Right side icons: Audio wave + Red hangup button */}
        <div className="flex items-center gap-1.5 shrink-0">
          <Activity className="size-3.5 text-white/40 animate-pulse" />
          <button
            onClick={isRinging ? cancelOutgoingCall : endCall}
            title="Desconectar"
            className="flex size-7 items-center justify-center rounded-lg bg-[#da373c] text-white transition-all hover:bg-[#a12828] active:scale-95 shadow-sm"
          >
            <PhoneOff className="size-3.5" />
          </button>
        </div>
      </div>

      {/* Control Pills Row (Camera, Screen Share, Activities/Grid, Mute) */}
      <div className="grid grid-cols-4 gap-1.5 pt-0.5">
        {/* Cam button */}
        <button
          onClick={toggleCam}
          title={camEnabled ? 'Apagar cámara' : 'Encender cámara'}
          className={`flex h-8 items-center justify-center rounded-lg transition-all ${
            camEnabled
              ? 'bg-white text-[#1e1f22] hover:bg-white/90'
              : 'bg-white/10 text-white/70 hover:bg-white/20 hover:text-white'
          }`}
        >
          {camEnabled ? <Video className="size-4" /> : <VideoOff className="size-4" />}
        </button>

        {/* Screen share button */}
        <button
          onClick={toggleScreenShare}
          title={screenEnabled ? 'Dejar de compartir' : 'Compartir pantalla'}
          className={`flex h-8 items-center justify-center rounded-lg transition-all ${
            screenEnabled
              ? 'bg-white text-[#1e1f22] hover:bg-white/90'
              : 'bg-white/10 text-white/70 hover:bg-white/20 hover:text-white'
          }`}
        >
          {screenEnabled ? <MonitorOff className="size-4" /> : <MonitorUp className="size-4" />}
        </button>

        {/* Activity button */}
        <button
          title="Actividades"
          className="flex h-8 items-center justify-center rounded-lg bg-white/10 text-white/70 transition-all hover:bg-white/20 hover:text-white"
        >
          <Sparkles className="size-4" />
        </button>

        {/* Mic button */}
        <button
          onClick={toggleMic}
          title={micEnabled ? 'Silenciar' : 'Activar micrófono'}
          className={`flex h-8 items-center justify-center rounded-lg transition-all ${
            micEnabled
              ? 'bg-white/10 text-white/70 hover:bg-white/20 hover:text-white'
              : 'bg-[#da373c] text-white hover:bg-[#da373c]/90'
          }`}
        >
          {micEnabled ? <Mic className="size-4" /> : <MicOff className="size-4" />}
        </button>
      </div>
    </div>
  )
}

export function UserDock({
  onOpenSettings,
  user,
  activeView,
  onOpenCatMusic,
}: {
  onOpenSettings: () => void
  user: { id: string; name: string; email: string; image?: string | null; banner?: string | null }
  activeView?: string
  onOpenCatMusic?: () => void
}) {
  const { t, lang } = useLanguage()

  /**
   * A browser that promotes an element to fullscreen renders *only* that subtree,
   * so the dock — a sibling of the plugin view — would disappear. Re-parenting it
   * into whatever element is fullscreen keeps it on screen. (The desktop build
   * takes the window fullscreen instead, where nothing needs moving.)
   */
  const [fullscreenHost, setFullscreenHost] = useState<Element | null>(null)
  useEffect(() => {
    const sync = () => setFullscreenHost(getFullscreenElement())
    sync()
    return subscribeFullscreenChange(sync)
  }, [])
  const { isPluginEnabled, pluginUpdates, updatePlugin, dismissPluginUpdate, installingPluginId, installProgressMap } = usePlugins()
  const router = useRouter()
  const [signingOut, setSigningOut] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const dockRef = useRef<HTMLDivElement>(null)
  const downloadingRef = useRef(false)
  const updateSeenRef = useRef(false)
  const pluginUpdateSeenRef = useRef(false)

  const [update, setUpdate] = useState<UpdateState>({ phase: 'idle' })
  const [appVersion, setAppVersion] = useState<string | null>(
    process.env.NEXT_PUBLIC_APP_VERSION ?? null
  )

  useEffect(() => {
    const updater = getUpdater()
    if (updater?.getVersion) {
      updater.getVersion().then((v: string) => setAppVersion(v)).catch(() => {})
    }
  }, [])

  useEffect(() => {
    const updater = getUpdater()
    if (!updater) return
    const check = () => {
      if (downloadingRef.current) return
      updater.checkForUpdates?.().catch(() => {})
    }
    const id = setInterval(check, 10_000)
    check()
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    const updater = getUpdater()
    if (!updater) return

    const unsubAvailable = updater.onAvailable((info) => {
      if (updateSeenRef.current) return
      updateSeenRef.current = true
      setUpdate({ phase: 'available', info })
    })
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
    downloadingRef.current = true
    setUpdate((prev) =>
      prev.phase === 'available'
        ? { phase: 'downloading', info: prev.info, progress: { percent: 0, transferred: 0, total: 0, bytesPerSecond: 0 } }
        : prev
    )
    try {
      await updater.downloadUpdate()
    } catch {
      setUpdate((prev) => (prev.phase === 'downloading' ? { phase: 'error', message: 'Download failed' } : prev))
    } finally {
      downloadingRef.current = false
    }
  }, [update.phase])

  const handleRestart = useCallback(() => {
    getUpdater()?.quitAndInstall()
  }, [])

  const handleDismiss = useCallback(() => {
    setShowMenu(false)
    updateSeenRef.current = false
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

  const activePluginUpdateId = Object.keys(pluginUpdates || {})[0]
  const activePluginUpdate = activePluginUpdateId ? pluginUpdates[activePluginUpdateId] : null
  const hasPluginUpdate = Boolean(activePluginUpdate)
  const isPluginUpdating = Boolean(activePluginUpdateId && installingPluginId === activePluginUpdateId)
  const pluginUpdateProgress = activePluginUpdateId ? (installProgressMap[activePluginUpdateId] || 0) : 0

  const { activeCall } = useCallContext()
  const hasActiveCall = Boolean(activeCall)
  const hasUpdate = update.phase !== 'idle'
  const glowActive = showMenu || hasUpdate || hasPluginUpdate || hasActiveCall

  useEffect(() => {
    if (hasPluginUpdate && !pluginUpdateSeenRef.current) {
      pluginUpdateSeenRef.current = true
      setShowMenu(true)
    }
    if (!hasPluginUpdate) {
      pluginUpdateSeenRef.current = false
    }
  }, [hasPluginUpdate])

  const wasPlayingBeforeCallRef = useRef(false)

  // Pause music on voice/video call start and resume on call end
  useEffect(() => {
    if (!isPluginEnabled('cat-music') || typeof window === 'undefined') return

    if (hasActiveCall) {
      window.dispatchEvent(new CustomEvent('cat-music:pause-call'))
    } else {
      window.dispatchEvent(new CustomEvent('cat-music:resume-call'))
    }
  }, [hasActiveCall, isPluginEnabled])

  function handleToggle() {
    // If there's an update and menu is closed, show update panel
    // If there's an update and menu is open, toggle off
    // If no update, toggle profile panel
    if ((hasUpdate || hasPluginUpdate) && !showMenu) {
      setShowMenu(true)
    } else {
      setShowMenu((v) => !v)
    }
  }

  const dock = (
    <motion.div
      initial={{ opacity: 0, y: 24, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 380, damping: 32, delay: 0.15 }}
      className="fixed bottom-4 left-4 z-50 w-64"
    >
      <ElectricBorder active={glowActive} roundedClass="rounded-2xl" className="w-64">
        <div
          ref={dockRef}
          className="relative z-10 flex w-64 flex-col-reverse rounded-2xl border border-white/10 shadow-lg backdrop-blur-sm overflow-hidden"
        >
          {/* Collapsed bar */}
          <div
            className="flex w-full cursor-pointer items-center justify-between gap-2 py-2 pl-2 pr-2.5"
            onClick={handleToggle}
          >
            <div className="flex items-center gap-2.5 rounded-xl px-1 py-0.5 min-w-0 flex-1">
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
              <span className="min-w-0 flex-1 pr-1">
                <span className="block truncate text-[13px] font-semibold leading-tight">
                  {user.name}
                  {appVersion && (
                    <span className="ml-1.5 inline-flex items-center rounded-full bg-secondary/60 px-1.5 py-px text-[9.5px] font-medium text-muted-foreground">v{appVersion}</span>
                  )}
                </span>
                <span className="block truncate text-[11px] leading-tight text-muted-foreground">
                  {user.email}
                </span>
              </span>
            </div>
            <div className="flex items-center gap-0.5 shrink-0">
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

          {/* CatMusic Dock Mini Player (shown in Chat view when profile menu & calls are inactive) */}
          <AnimatePresence mode="wait">
            {isPluginEnabled('cat-music') && activeView !== 'cat-music' && !showMenu && !hasActiveCall && (
              <motion.div
                key="cat-music-dock-widget"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                className="overflow-hidden"
              >
                <CatMusicDockWidget onOpenCatMusic={onOpenCatMusic} />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Discord Voice Call Dock Widget */}
          <AnimatePresence>
            {hasActiveCall && (
              <motion.div
                key="voice-dock"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                className="overflow-hidden"
              >
                <DiscordVoiceDockWidget call={activeCall} />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Expanded panel */}
          <AnimatePresence mode="wait">
            {showMenu && (
              <motion.div
                key="expanded"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                className="overflow-hidden"
              >
                {hasUpdate ? (
                  /* App update card. `data-phase` swaps the palette; the parts
                     themselves are shared with the plugin card below. */
                  <div className="w-64 p-2">
                    <div
                      className="upd-card upd-sheen"
                      data-phase={update.phase}
                      role="status"
                      aria-live="polite"
                    >
                      <div className="upd-aurora" aria-hidden="true" />

                      <div className="relative z-4 flex items-start gap-2.5 px-3 pt-3">
                        <span className="upd-orb shrink-0" aria-hidden="true">
                          {update.phase === 'error' ? (
                            <AlertCircle className="size-4" />
                          ) : update.phase === 'downloaded' ? (
                            <Sparkles className="size-4" />
                          ) : (
                            <Download className="size-4" />
                          )}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-[12.5px] font-bold leading-tight text-white">
                            {update.phase === 'available' && (lang === 'es' ? 'Actualización disponible' : 'Update available')}
                            {update.phase === 'downloading' && (lang === 'es' ? 'Descargando' : 'Downloading')}
                            {update.phase === 'downloaded' && (lang === 'es' ? 'Listo para instalar' : 'Ready to install')}
                            {update.phase === 'error' && (lang === 'es' ? 'Error de actualización' : 'Update error')}
                          </p>
                          <p className="mt-0.5 truncate text-[10.5px] leading-tight text-white/45">
                            {update.phase === 'error'
                              ? (lang === 'es' ? 'No se pudo completar' : 'Could not complete')
                              : `${appVersion ? `v${appVersion} → ` : ''}v${update.info.version}`}
                          </p>
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDismiss() }}
                          aria-label={lang === 'es' ? 'Descartar' : 'Dismiss'}
                          className="upd-x shrink-0"
                        >
                          <X className="size-3.5" />
                        </button>
                      </div>

                      <div className="relative z-4 px-3 pb-3 pt-2.5">
                        {update.phase === 'available' && (
                          <div className="space-y-2.5">
                            <div className="flex items-center gap-2">
                              <span className="upd-pill">v{update.info.version}</span>
                              {update.info.files?.[0]?.size != null && (
                                <span className="upd-stat">{formatSize(update.info.files[0].size)}</span>
                              )}
                            </div>
                            {update.info.releaseNotes && (
                              <p className="upd-notes thin-scroll text-[11px] leading-relaxed text-white/55">
                                {update.info.releaseNotes.replace(/<[^>]*>/g, '').trim()}
                              </p>
                            )}
                            <button
                              onClick={(e) => { e.stopPropagation(); handleInstall() }}
                              className="upd-cta"
                            >
                              <Download className="size-3.5" />
                              {lang === 'es' ? 'Instalar ahora' : 'Install now'}
                            </button>
                          </div>
                        )}

                        {update.phase === 'downloading' && (
                          <div className="space-y-2">
                            <div className="flex items-baseline justify-between">
                              <span className="text-[11px] font-medium text-white/55">
                                {lang === 'es' ? 'Descargando…' : 'Downloading…'}
                              </span>
                              <span className="text-[13px] font-bold tabular-nums text-white">
                                {Math.round(update.progress.percent)}%
                              </span>
                            </div>
                            <div className="upd-track">
                              <div className="upd-fill" style={{ width: `${Math.round(update.progress.percent)}%` }} />
                            </div>
                            <div className="flex items-center justify-between gap-2">
                              <span className="upd-stat">
                                {update.progress.total > 0
                                  ? `${formatSize(update.progress.transferred)} / ${formatSize(update.progress.total)}`
                                  : formatSize(update.progress.transferred)}
                              </span>
                              {update.progress.bytesPerSecond > 0 && (
                                <span className="upd-stat">
                                  {formatSize(update.progress.bytesPerSecond)}/s
                                  {formatEta(update.progress) ? ` · ${formatEta(update.progress)}` : ''}
                                </span>
                              )}
                            </div>
                          </div>
                        )}

                        {update.phase === 'downloaded' && (
                          <div className="space-y-2.5">
                            <p className="text-[11.5px] leading-relaxed text-white/55">
                              {lang === 'es'
                                ? 'Descarga completa. Reinicia para aplicar la actualización.'
                                : 'Download complete. Restart to apply the update.'}
                            </p>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleRestart() }}
                              className="upd-cta"
                            >
                              <RotateCw className="size-3.5" />
                              {lang === 'es' ? 'Reiniciar ahora' : 'Restart now'}
                            </button>
                          </div>
                        )}

                        {update.phase === 'error' && (
                          <div className="space-y-2.5">
                            <p className="upd-notes thin-scroll text-[11px] leading-relaxed text-white/55">
                              {update.message}
                            </p>
                            <button
                              onClick={(e) => { e.stopPropagation(); setUpdate({ phase: 'idle' }) }}
                              className="upd-cta upd-cta-ghost"
                            >
                              {lang === 'es' ? 'Entendido' : 'Dismiss'}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : hasPluginUpdate && activePluginUpdate ? (
                  /* Plugin Update panel (same spot as CatChat app update) */
                  <div className="w-64 p-2">
                    <div
                      className="upd-card upd-sheen"
                      data-phase="plugin"
                      role="status"
                      aria-live="polite"
                    >
                      <div className="upd-aurora" aria-hidden="true" />

                      <div className="relative z-4 flex items-start gap-2.5 px-3 pt-3">
                        <span className="upd-orb shrink-0" aria-hidden="true">
                          <Sparkles className="size-4" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-[12.5px] font-bold leading-tight text-white">
                            {lang === 'es' ? 'Actualización de plugin' : 'Plugin update'}
                          </p>
                          <p className="mt-0.5 truncate text-[10.5px] leading-tight text-white/45">
                            {activePluginUpdate.name}
                          </p>
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); activePluginUpdateId && dismissPluginUpdate(activePluginUpdateId) }}
                          aria-label={lang === 'es' ? 'Descartar' : 'Dismiss'}
                          className="upd-x shrink-0"
                        >
                          <X className="size-3.5" />
                        </button>
                      </div>

                      <div className="relative z-4 space-y-2.5 px-3 pb-3 pt-2.5">
                        <div className="flex items-center gap-2">
                          <span className="upd-pill">v{activePluginUpdate.newVersion}</span>
                        </div>
                        {activePluginUpdate.releaseNotes && (
                          <p className="upd-notes thin-scroll text-[11px] leading-relaxed text-white/55">
                            {activePluginUpdate.releaseNotes.replace(/<[^>]*>/g, '').trim()}
                          </p>
                        )}
                        {isPluginUpdating ? (
                          <div className="space-y-2">
                            <div className="flex items-baseline justify-between">
                              <span className="text-[11px] font-medium text-white/55">
                                {lang === 'es' ? 'Descargando…' : 'Downloading…'}
                              </span>
                              <span className="text-[13px] font-bold tabular-nums text-white">
                                {pluginUpdateProgress}%
                              </span>
                            </div>
                            <div className="upd-track">
                              <div className="upd-fill" style={{ width: `${pluginUpdateProgress}%` }} />
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={(e) => { e.stopPropagation(); activePluginUpdateId && updatePlugin(activePluginUpdateId) }}
                            className="upd-cta"
                          >
                            <Download className="size-3.5" />
                            {lang === 'es' ? 'Actualizar plugin' : 'Update plugin'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Profile panel */
                  <div
                    className="relative flex flex-col items-center px-4 pb-4 pt-10 rounded-t-2xl overflow-hidden"
                    style={user.banner ? { backgroundImage: `url(${user.banner})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
                  >
                    {user.banner && <div className="absolute inset-0 bg-linear-to-b from-black/40 to-black/70" />}
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

  return fullscreenHost ? createPortal(dock, fullscreenHost) : dock
}
