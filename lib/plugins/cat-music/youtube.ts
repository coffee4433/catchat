declare global {
  interface Window {
    YT: any
    onYouTubeIframeAPIReady?: () => void
  }
}

let iframeApiPromise: Promise<any> | null = null

/**
 * Idempotent YouTube IFrame Player API script loader.
 */
export function loadYouTubeIframeApi(): Promise<any> {
  if (iframeApiPromise) return iframeApiPromise

  iframeApiPromise = new Promise((resolve) => {
    if (typeof window === 'undefined') return
    if (window.YT && window.YT.Player) {
      return resolve(window.YT)
    }

    const prevReady = window.onYouTubeIframeAPIReady
    window.onYouTubeIframeAPIReady = () => {
      prevReady?.()
      resolve(window.YT)
    }

    const script = document.createElement('script')
    script.src = 'https://www.youtube.com/iframe_api'
    script.async = true
    document.head.appendChild(script)
  })

  return iframeApiPromise
}

export type ArtworkSize = 'maxres' | 'sd' | 'hq' | 'mq'

/**
 * Pixel dimensions each YouTube thumbnail variant is served at. Used to
 * declare honest `sizes` to the MediaSession API, which otherwise shows a
 * blurry cover in the OS media controls.
 */
export const ARTWORK_DIMENSIONS: Record<ArtworkSize, string> = {
  maxres: '1280x720',
  sd: '640x480',
  hq: '480x360',
  mq: '320x180',
}

const ARTWORK_FILENAME: Record<ArtworkSize, string> = {
  maxres: 'maxresdefault',
  sd: 'sddefault',
  hq: 'hqdefault',
  mq: 'mqdefault',
}

/**
 * Generates deterministic YouTube thumbnail URLs based on size.
 *
 * `mq` and `hq` are generated for every video on the CDN, so they never 404.
 * `sd` and `maxres` only exist for high-resolution uploads — request those
 * only where a broken image is acceptable or an onError fallback is wired up.
 */
export function getArtworkUrl(youtubeId: string, size: ArtworkSize = 'mq'): string {
  if (!youtubeId) return '/placeholder.svg'
  return `https://i.ytimg.com/vi/${youtubeId}/${ARTWORK_FILENAME[size] ?? ARTWORK_FILENAME.mq}.jpg`
}

/**
 * Formats duration seconds into mm:ss or hh:mm:ss.
 */
export function formatDuration(seconds: number): string {
  if (!seconds || isNaN(seconds)) return '0:00'
  const secs = Math.floor(seconds)
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  const s = secs % 60
  const sStr = s < 10 ? `0${s}` : `${s}`

  if (h > 0) {
    const mStr = m < 10 ? `0${m}` : `${m}`
    return `${h}:${mStr}:${sStr}`
  }
  return `${m}:${sStr}`
}
