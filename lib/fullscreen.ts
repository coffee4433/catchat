export function getFullscreenElement(): Element | null {
  const doc = document as Document & {
    webkitFullscreenElement?: Element | null
    msFullscreenElement?: Element | null
  }
  return doc.fullscreenElement ?? doc.webkitFullscreenElement ?? doc.msFullscreenElement ?? null
}

export async function requestElementFullscreen(element: HTMLElement): Promise<void> {
  const el = element as HTMLElement & {
    webkitRequestFullscreen?: () => Promise<void> | void
    msRequestFullscreen?: () => Promise<void> | void
  }

  if (element.requestFullscreen) {
    await element.requestFullscreen()
    return
  }
  if (el.webkitRequestFullscreen) {
    await el.webkitRequestFullscreen()
    return
  }
  if (el.msRequestFullscreen) {
    await el.msRequestFullscreen()
  }
}

export async function exitDocumentFullscreen(): Promise<void> {
  const doc = document as Document & {
    webkitExitFullscreen?: () => Promise<void> | void
    msExitFullscreen?: () => Promise<void> | void
  }

  if (doc.exitFullscreen) {
    await doc.exitFullscreen()
    return
  }
  if (doc.webkitExitFullscreen) {
    await doc.webkitExitFullscreen()
    return
  }
  if (doc.msExitFullscreen) {
    await doc.msExitFullscreen()
  }
}

export function subscribeFullscreenChange(callback: () => void): () => void {
  const events = ['fullscreenchange', 'webkitfullscreenchange', 'MSFullscreenChange'] as const
  for (const event of events) {
    document.addEventListener(event, callback)
  }
  return () => {
    for (const event of events) {
      document.removeEventListener(event, callback)
    }
  }
}
