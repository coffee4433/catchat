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
 * Generates deterministic YouTube thumbnail URLs based on size.
 */
export function getArtworkUrl(youtubeId: string, size: ArtworkSize = 'mq'): string {
  if (!youtubeId) return '/placeholder.svg'
  // mqdefault is 100% guaranteed on YouTube CDN for all videos without 404 errors
  return `https://i.ytimg.com/vi/${youtubeId}/mqdefault.jpg`
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
