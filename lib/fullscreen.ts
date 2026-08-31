/**
 * Fullscreen, in a browser tab and in the Electron shell.
 *
 * The web API only ever promotes an element inside the window: if the window
 * itself is not fullscreen, "fullscreen" means "as big as the window". In the
 * desktop build the preload exposes the real thing, so requests fall through to
 * it whenever the DOM path is unavailable or refused.
 */

type DesktopWindowBridge = {
  setFullscreen: (flag: boolean) => Promise<boolean>
  isFullscreen: () => Promise<boolean>
  onFullscreenChange: (callback: (value: boolean) => void) => () => void
}

function desktopWindow(): DesktopWindowBridge | null {
  if (typeof window === 'undefined') return null
  return (window as unknown as { desktopWindow?: DesktopWindowBridge }).desktopWindow ?? null
}

/** Last known state of the desktop window, mirrored so reads stay synchronous. */
let nativeFullscreen = false
const nativeListeners = new Set<() => void>()
let nativeWatchAttached = false

/**
 * Starts mirroring the desktop window's fullscreen flag. Idempotent, and a
 * no-op in the browser — every entry point calls it so the mirrored value is
 * never stale by the time something reads it.
 */
function watchNativeFullscreen() {
  if (nativeWatchAttached) return
  const bridge = desktopWindow()
  if (!bridge?.onFullscreenChange) return
  nativeWatchAttached = true
  bridge.onFullscreenChange((value) => {
    nativeFullscreen = value
    for (const listener of nativeListeners) listener()
  })
  bridge
    .isFullscreen()
    .then((value) => {
      nativeFullscreen = value
    })
    .catch(() => {})
}

export function getFullscreenElement(): Element | null {
  const doc = document as Document & {
    webkitFullscreenElement?: Element | null
    msFullscreenElement?: Element | null
  }
  return doc.fullscreenElement ?? doc.webkitFullscreenElement ?? doc.msFullscreenElement ?? null
}

/**
 * Whether anything is fullscreen right now — a promoted element *or* a desktop
 * window that went fullscreen without one. Prefer this over
 * `getFullscreenElement()` for driving UI state.
 */
export function isFullscreenActive(): boolean {
  watchNativeFullscreen()
  if (typeof document !== 'undefined' && getFullscreenElement()) return true
  return nativeFullscreen
}

/** Tries the DOM API; resolves false when the browser has none or refuses. */
async function requestViaDom(element: HTMLElement): Promise<boolean> {
  const el = element as HTMLElement & {
    webkitRequestFullscreen?: () => Promise<void> | void
    msRequestFullscreen?: () => Promise<void> | void
  }

  try {
    if (element.requestFullscreen) {
      await element.requestFullscreen()
    } else if (el.webkitRequestFullscreen) {
      await el.webkitRequestFullscreen()
    } else if (el.msRequestFullscreen) {
      await el.msRequestFullscreen()
    } else {
      return false
    }
  } catch {
    return false
  }

  return getFullscreenElement() !== null
}

export async function requestElementFullscreen(element: HTMLElement): Promise<void> {
  watchNativeFullscreen()

  if (await requestViaDom(element)) return

  const bridge = desktopWindow()
  if (!bridge) throw new Error('fullscreen is unavailable')

  nativeFullscreen = await bridge.setFullscreen(true)
  if (!nativeFullscreen) throw new Error('the window refused to go fullscreen')
}

export async function exitDocumentFullscreen(): Promise<void> {
  watchNativeFullscreen()

  const doc = document as Document & {
    webkitExitFullscreen?: () => Promise<void> | void
    msExitFullscreen?: () => Promise<void> | void
  }

  if (getFullscreenElement()) {
    try {
      if (doc.exitFullscreen) await doc.exitFullscreen()
      else if (doc.webkitExitFullscreen) await doc.webkitExitFullscreen()
      else if (doc.msExitFullscreen) await doc.msExitFullscreen()
    } catch {
      // Falls through to the native path below.
    }
  }

  // Leaving element fullscreen does not necessarily bring the desktop window
  // back, and the window may have been the only thing that went fullscreen.
  if (nativeFullscreen) {
    const bridge = desktopWindow()
    if (bridge) nativeFullscreen = await bridge.setFullscreen(false)
  }
}

/** Fires on element-level changes and on desktop window changes alike. */
export function subscribeFullscreenChange(callback: () => void): () => void {
  watchNativeFullscreen()
  const events = ['fullscreenchange', 'webkitfullscreenchange', 'MSFullscreenChange'] as const
  for (const event of events) {
    document.addEventListener(event, callback)
  }
  nativeListeners.add(callback)
  return () => {
    for (const event of events) {
      document.removeEventListener(event, callback)
    }
    nativeListeners.delete(callback)
  }
}
