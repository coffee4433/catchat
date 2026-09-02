'use client'

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { createPortal } from 'react-dom'
import { Copy, Minimize2, Minus, Square, X } from 'lucide-react'
import {
  exitDocumentFullscreen,
  getFullscreenElement,
  isFullscreenActive,
  subscribeFullscreenChange,
} from '@/lib/fullscreen'
import { useLanguage } from '@/lib/i18n'

/**
 * The in-app window frame. The OS caption strip is switched off in
 * `electron-main.js` (`titleBarStyle: 'hidden'`), so this bar is the only way to
 * move, maximise or close the window — hence the `app-drag` region and the
 * controls that opt back out of it.
 *
 * It renders in the browser too, minus the window buttons: there it is simply
 * the app's top bar, which is where the active view's name lives.
 */

type WindowBridge = {
  minimize: () => Promise<void>
  toggleMaximize: () => Promise<boolean>
  isMaximized: () => Promise<boolean>
  close: () => Promise<void>
  onMaximizeChange: (callback: (value: boolean) => void) => () => void
}

function windowBridge(): WindowBridge | null {
  if (typeof window === 'undefined') return null
  const bridge = (window as unknown as { desktopWindow?: Partial<WindowBridge> }).desktopWindow
  // An older preload exposes `desktopWindow` without the controls; treat that
  // as "no frame to draw" rather than rendering dead buttons.
  if (!bridge?.minimize || !bridge.toggleMaximize || !bridge.close) return null
  return bridge as WindowBridge
}

const TitlebarContext = createContext<{ title: string; setTitle: (value: string) => void }>({
  title: '',
  setTitle: () => {},
})

/** Publishes the name of whatever the user is looking at to the title bar. */
export function useWindowTitle(title: string) {
  const { setTitle } = useContext(TitlebarContext)
  useEffect(() => {
    setTitle(title)
    document.title = title ? `${title} · CatChat` : 'CatChat'
  }, [title, setTitle])
}

export function TitlebarProvider({ children }: { children: React.ReactNode }) {
  const [title, setTitle] = useState('')
  const value = useMemo(() => ({ title, setTitle }), [title])

  return (
    <TitlebarContext.Provider value={value}>
      <AppTitlebar />
      {children}
    </TitlebarContext.Provider>
  )
}

function ControlButton({
  label,
  onClick,
  danger = false,
  children,
}: {
  label: string
  onClick: () => void
  danger?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`app-no-drag flex h-7 w-9 items-center justify-center rounded-lg text-foreground/55 transition-colors ${
        danger
          ? 'hover:bg-red-500 hover:text-white'
          : 'hover:bg-foreground/10 hover:text-foreground'
      }`}
    >
      {children}
    </button>
  )
}

/** Pointer distance from the top edge that brings the strip back, and lets it go. */
const REVEAL_AT = 8
const HIDE_BELOW = 44
/** How long the strip must have been visible before it accepts a click. */
const ARM_AFTER = 200

/**
 * The window controls while fullscreen. The frame itself is gone — a bar across
 * immersive content is a seam — but unmounting the controls outright left no way
 * to leave fullscreen, minimise or close, so they come back as a strip the
 * moment the pointer reaches for the top edge.
 */
function FullscreenControls({ bridge }: { bridge: WindowBridge }) {
  const { t } = useLanguage()
  const [revealed, setRevealed] = useState(false)

  // Re-parented into whatever element is fullscreen: the top layer paints only
  // that subtree, so a strip left outside it would never show. Same reason the
  // player bar portals — see components/cat-music/player-bar.tsx.
  const [host, setHost] = useState<Element | null>(null)
  useEffect(() => {
    const sync = () => setHost(getFullscreenElement())
    sync()
    return subscribeFullscreenChange(sync)
  }, [])

  // Two thresholds rather than one: the strip is as tall as the band that would
  // hide it, so a single line would make it vanish under the pointer on the way
  // to its own buttons. Between the two it holds whatever state it is in.
  useEffect(() => {
    const onMove = (event: MouseEvent) => {
      setRevealed((current) => {
        if (event.clientY <= REVEAL_AT) return true
        if (event.clientY > HIDE_BELOW) return false
        return current
      })
    }
    const onLeave = () => setRevealed(false)
    window.addEventListener('mousemove', onMove)
    document.addEventListener('mouseleave', onLeave)
    return () => {
      window.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseleave', onLeave)
    }
  }, [])

  // The strip lands on top of whatever the plugin keeps in that corner — in
  // CatMusic, its own fullscreen button. A pointer already on its way there must
  // not press `close` instead, so clicks only count once the strip has been on
  // screen long enough to have been seen. The keyboard is unaffected.
  const [armed, setArmed] = useState(false)
  useEffect(() => {
    if (!revealed) return
    const id = window.setTimeout(() => setArmed(true), ARM_AFTER)
    return () => {
      window.clearTimeout(id)
      setArmed(false)
    }
  }, [revealed])

  const strip = (
    <div
      // Focus reveals it too, so the controls are reachable by keyboard: hidden
      // is only opacity, and Tab still lands on the buttons.
      onFocus={() => setRevealed(true)}
      onBlur={() => setRevealed(false)}
      className={`fixed right-1.5 top-1.5 z-[200] flex items-center gap-0.5 rounded-xl bg-background/85 p-0.5 shadow-lg backdrop-blur-xl transition-opacity duration-150 ${
        revealed ? 'opacity-100' : 'opacity-0'
      } ${armed ? '' : 'pointer-events-none'}`}
    >
      <ControlButton
        label={t.exitFullscreen}
        onClick={() => void exitDocumentFullscreen().catch(() => {})}
      >
        <Minimize2 className="size-3.5" />
      </ControlButton>
      <ControlButton label={t.windowMinimize} onClick={() => void bridge.minimize()}>
        <Minus className="size-3.5" />
      </ControlButton>
      <ControlButton label={t.windowClose} onClick={() => void bridge.close()} danger>
        <X className="size-4" />
      </ControlButton>
    </div>
  )

  return host ? createPortal(strip, host) : strip
}

function AppTitlebar() {
  const { title } = useContext(TitlebarContext)
  const { t } = useLanguage()
  const [bridge, setBridge] = useState<WindowBridge | null>(null)
  const [maximized, setMaximized] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)

  // Resolved after mount: the preload bridge does not exist during SSR, and
  // reading it during render would desync hydration.
  useEffect(() => {
    setBridge(windowBridge())
  }, [])

  useEffect(() => {
    if (!bridge) return
    bridge.isMaximized().then(setMaximized).catch(() => {})
    return bridge.onMaximizeChange(setMaximized)
  }, [bridge])

  // Fullscreen owns the whole screen: a frame on top of it would be a seam.
  useEffect(() => {
    const sync = () => setFullscreen(isFullscreenActive())
    sync()
    return subscribeFullscreenChange(sync)
  }, [])

  const toggleMaximize = useCallback(() => {
    bridge?.toggleMaximize().then(setMaximized).catch(() => {})
  }, [bridge])

  // The frame gives way to the strip. In the browser there is no window to
  // minimise or close: nothing to offer, so nothing is drawn.
  if (fullscreen) return bridge ? <FullscreenControls bridge={bridge} /> : null

  return (
    <header
      className="app-drag fixed inset-x-0 top-0 z-[200] flex h-9 select-none items-center gap-2 bg-gradient-to-b from-background/90 to-background/60 pl-2.5 pr-1.5 backdrop-blur-xl"
      data-desktop={bridge ? 'true' : undefined}
    >
      <span className="flex shrink-0 items-center gap-2">
        <img
          src="/cat-chat-logo.png"
          alt=""
          aria-hidden
          className="size-5 shrink-0 rounded-md object-contain"
        />
        <span className="text-[12px] font-extrabold tracking-tight text-foreground/85">CatChat</span>
      </span>

      {/* Centred on the window rather than on the space left over, so it does not
          drift when the controls appear or the brand text changes width. */}
      <span className="pointer-events-none absolute inset-x-0 flex justify-center px-32">
        <span className="truncate text-[12.5px] font-semibold text-foreground/70">{title}</span>
      </span>

      <span className="ml-auto flex shrink-0 items-center gap-0.5">
        {bridge && (
          <>
            <ControlButton label={t.windowMinimize} onClick={() => void bridge.minimize()}>
              <Minus className="size-3.5" />
            </ControlButton>
            <ControlButton
              label={maximized ? t.windowRestore : t.windowMaximize}
              onClick={toggleMaximize}
            >
              {maximized ? <Copy className="size-3" /> : <Square className="size-3" />}
            </ControlButton>
            <ControlButton label={t.windowClose} onClick={() => void bridge.close()} danger>
              <X className="size-4" />
            </ControlButton>
          </>
        )}
      </span>
    </header>
  )
}
