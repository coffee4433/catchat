'use client'

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { Copy, Minus, Square, X } from 'lucide-react'
import { isFullscreenActive, subscribeFullscreenChange } from '@/lib/fullscreen'
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

  if (fullscreen) return null

  return (
    <header
      className="app-drag fixed inset-x-0 top-0 z-[200] flex h-9 select-none items-center gap-2 border-b border-border/40 bg-gradient-to-b from-background/90 to-background/60 pl-2.5 pr-1.5 backdrop-blur-xl"
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
