/**
 * Server-only YouTube InnerTube client + resilient response parser.
 *
 * Why this exists: YouTube migrated most surfaces from the classic
 * `*Renderer` objects to the newer `lockupViewModel` shape. Playlist
 * browse responses in particular now contain ZERO `playlistVideoRenderer`
 * entries, which is why fixed-path scraping returned empty lists.
 *
 * Everything here is defensive: we recursively collect known node types
 * anywhere in the payload instead of walking brittle fixed paths, so a
 * layout change on YouTube's side degrades instead of breaking.
 */

import type { Track } from './types'

const INNERTUBE_KEY = 'AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8'
const CLIENT_VERSION = '2.20240401.00.00'
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'

export type YtPlaylist = {
  id: string
  playlistId: string
  title: string
  artist: string
  videoCount: string
  coverUrl: string
  tracks: Track[]
}

export type YtChannel = {
  id: string
  name: string
  avatarUrl: string
  subtitle: string
  bannerUrl?: string
}

/** Search filter params (protobuf, url-encoded) */
export const SEARCH_FILTER = {
  video: 'EgIQAQ%3D%3D',
  channel: 'EgIQAg%3D%3D',
  playlist: 'EgIQAw%3D%3D',
} as const

export type SearchFilter = keyof typeof SEARCH_FILTER

/** Low-level InnerTube POST with timeout. */
async function innertube(endpoint: string, body: Record<string, unknown>, timeoutMs = 8000) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const res = await fetch(
      `https://www.youtube.com/youtubei/v1/${endpoint}?key=${INNERTUBE_KEY}&prettyPrint=false`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': UA,
          'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
          Origin: 'https://www.youtube.com',
        },
        body: JSON.stringify({
          context: {
            client: {
              clientName: 'WEB',
              clientVersion: CLIENT_VERSION,
              hl: 'es',
              gl: 'ES',
            },
          },
          ...body,
        }),
        signal: controller.signal,
        cache: 'no-store',
      },
    )

    if (!res.ok) return null
    return (await res.json()) as any
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

/** Recursively collect every value stored under `key`. */
function deepFind(node: any, key: string, out: any[] = []): any[] {
  if (!node || typeof node !== 'object') return out

  if (Array.isArray(node)) {
    for (const item of node) deepFind(item, key, out)
    return out
  }

  for (const k of Object.keys(node)) {
    if (k === key) out.push(node[k])
    else deepFind(node[k], key, out)
  }
  return out
}

/** "3:34" | "1:02:11" -> seconds. Returns 0 when unparseable. */
export function parseDurationText(text: unknown): number {
  if (typeof text !== 'string') return 0
  const m = text.trim().match(/^(?:(\d+):)?(\d{1,2}):(\d{2})$/)
  if (!m) return 0
  const h = m[1] ? parseInt(m[1], 10) : 0
  const min = parseInt(m[2], 10)
  const s = parseInt(m[3], 10)
  return h * 3600 + min * 60 + s
}

/** Stable, param-free thumbnail that never 404s. */
function thumb(videoId: string): string {
  return videoId ? `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg` : '/placeholder.svg'
}

/** Pull a video id out of any i.ytimg.com thumbnail URL. */
function videoIdFromThumbUrl(url: unknown): string {
  if (typeof url !== 'string') return ''
  return url.match(/\/vi\/([A-Za-z0-9_-]{11})\//)?.[1] || ''
}

const isVideoId = (v: unknown): v is string =>
  typeof v === 'string' && /^[A-Za-z0-9_-]{11}$/.test(v)

/** First duration-looking badge text inside a lockup thumbnail. */
function durationFromLockup(lockup: any): number {
  const badges = deepFind(lockup?.contentImage, 'thumbnailBadgeViewModel')
  for (const b of badges) {
    const secs = parseDurationText(b?.text)
    if (secs > 0) return secs
  }
  return 0
}

/** Title + subtitle out of lockupMetadataViewModel. */
function metaFromLockup(lockup: any): { title: string; subtitle: string } {
  const meta = lockup?.metadata?.lockupMetadataViewModel
  const title = typeof meta?.title?.content === 'string' ? meta.title.content : ''

  const rows = meta?.metadata?.contentMetadataViewModel?.metadataRows
  let subtitle = ''
  if (Array.isArray(rows)) {
    for (const row of rows) {
      const part = row?.metadataParts?.[0]?.text?.content
      if (typeof part === 'string' && part.trim() && !/^\d/.test(part)) {
        subtitle = part
        break
      }
    }
  }
  return { title, subtitle }
}

/**
 * Extract playable tracks from ANY InnerTube payload.
 * Handles videoRenderer, playlistVideoRenderer, compactVideoRenderer,
 * gridVideoRenderer and the modern lockupViewModel.
 */
export function extractVideos(json: any, opts: { requireDuration?: boolean } = {}): Track[] {
  const { requireDuration = false } = opts
  const tracks: Track[] = []
  const seen = new Set<string>()

  const push = (
    id: string,
    title: string,
    artist: string,
    seconds: number,
    album: string,
  ) => {
    if (!isVideoId(id) || seen.has(id)) return
    if (!title) return
    if (requireDuration && seconds <= 0) return // drops live streams / shorts shells
    seen.add(id)
    tracks.push({
      id,
      title: title.trim(),
      artist: (artist || 'YouTube Music').trim(),
      album,
      durationSeconds: seconds > 0 ? seconds : 0,
      artworkUrl: thumb(id),
      source: 'youtube',
    })
  }

  // --- YouTube Music renderers (different structure) ---
  for (const mr of deepFind(json, 'musicResponsiveListItemRenderer')) {
    const flex0 = mr?.flexColumns?.[0]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs
    const flex1 = mr?.flexColumns?.[1]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs
    const titleRun = flex0?.[0]
    const id =
      titleRun?.navigationEndpoint?.watchEndpoint?.videoId ||
      mr?.overlay?.musicItemThumbnailOverlayRenderer?.content?.musicPlayButtonRenderer?.playNavigationEndpoint?.watchEndpoint?.videoId ||
      mr?.playlistItemData?.videoId
    const title = titleRun?.text || ''
    const artist = flex1 ? flex1.filter((r: any) => !/^\d/.test(r.text) && !/^\d+:\d+/.test(r.text)).map((r: any) => r.text).join('') : ''
    const durationText = flex1 ? flex1[flex1.length - 1]?.text : ''
    const seconds = parseDurationText(durationText)
    push(id, title, artist, seconds, 'YouTube')
  }

  for (const mr of deepFind(json, 'musicTwoRowItemRenderer')) {
    const nav = mr?.navigationEndpoint?.watchEndpoint
    const id = nav?.videoId || mr?.title?.runs?.[0]?.navigationEndpoint?.watchEndpoint?.videoId
    const title = mr?.title?.runs?.[0]?.text || ''
    const subtitles = mr?.subtitle?.runs
    const artist = subtitles ? subtitles.filter((r: any) => !/^\d/.test(r.text) && !/^\d+:\d+/.test(r.text)).map((r: any) => r.text).join('') : ''
    const durationText = subtitles ? subtitles[subtitles.length - 1]?.text : ''
    const seconds = parseDurationText(durationText)
    push(id, title, artist, seconds, 'YouTube')
  }

  // --- classic renderers ---
  for (const key of [
    'videoRenderer',
    'playlistVideoRenderer',
    'compactVideoRenderer',
    'gridVideoRenderer',
    'playlistPanelVideoRenderer',
  ]) {
    for (const v of deepFind(json, key)) {
      const id = v?.videoId
      const title = v?.title?.simpleText || v?.title?.runs?.[0]?.text || ''
      const artist =
        v?.ownerText?.runs?.[0]?.text ||
        v?.shortBylineText?.runs?.[0]?.text ||
        v?.longBylineText?.runs?.[0]?.text ||
        v?.shortBylineText?.simpleText ||
        v?.longBylineText?.simpleText ||
        v?.channelTitle?.simpleText ||
        v?.channelTitle?.runs?.[0]?.text ||
        ''
      const seconds =
        parseDurationText(v?.lengthText?.simpleText) ||
        parseDurationText(v?.lengthText?.runs?.[0]?.text) ||
        (v?.lengthSeconds ? parseInt(v.lengthSeconds, 10) : 0)

      push(id, title, artist, seconds, 'YouTube')
    }
  }

  // --- modern lockups ---
  for (const lockup of deepFind(json, 'lockupViewModel')) {
    if (lockup?.contentType && lockup.contentType !== 'LOCKUP_CONTENT_TYPE_VIDEO') continue

    const id = isVideoId(lockup?.contentId)
      ? lockup.contentId
      : videoIdFromThumbUrl(
          deepFind(lockup?.contentImage, 'sources')?.[0]?.[0]?.url,
        )

    const { title, subtitle } = metaFromLockup(lockup)
    push(id, title, subtitle, durationFromLockup(lockup), 'YouTube')
  }

  return tracks
}

/** Extract playlists/albums from ANY InnerTube payload. */
export function extractPlaylists(json: any): YtPlaylist[] {
  const results: YtPlaylist[] = []
  const seen = new Set<string>()

  const push = (
    playlistId: string,
    title: string,
    artist: string,
    videoCount: string,
    coverUrl: string,
  ) => {
    if (!playlistId || seen.has(playlistId) || !title) return
    // Radio/mix ids aren't browsable as playlists
    if (playlistId.startsWith('RD')) return
    seen.add(playlistId)
    results.push({
      id: playlistId,
      playlistId,
      title: title.trim(),
      artist: (artist || '').trim(),
      videoCount: videoCount || '',
      coverUrl: coverUrl || '/placeholder.svg',
      tracks: [],
    })
  }

  // --- classic renderers ---
  for (const key of ['playlistRenderer', 'gridPlaylistRenderer']) {
    for (const p of deepFind(json, key)) {
      const firstVideo = p?.navigationEndpoint?.watchEndpoint?.videoId
      const rawThumb =
        p?.thumbnails?.[0]?.thumbnails?.slice(-1)?.[0]?.url ||
        p?.thumbnail?.thumbnails?.slice(-1)?.[0]?.url
      const coverId = isVideoId(firstVideo) ? firstVideo : videoIdFromThumbUrl(rawThumb)

      push(
        p?.playlistId,
        p?.title?.simpleText || p?.title?.runs?.[0]?.text || '',
        p?.shortBylineText?.runs?.[0]?.text || p?.longBylineText?.runs?.[0]?.text || '',
        p?.videoCountText?.runs?.[0]?.text || p?.videoCountShortText?.simpleText || '',
        coverId ? thumb(coverId) : rawThumb || '/placeholder.svg',
      )
    }
  }

  // --- modern lockups ---
  for (const lockup of deepFind(json, 'lockupViewModel')) {
    if (lockup?.contentType !== 'LOCKUP_CONTENT_TYPE_PLAYLIST') continue

    const { title, subtitle } = metaFromLockup(lockup)

    // count badge, e.g. "37 vídeos"
    let count = ''
    for (const b of deepFind(lockup?.contentImage, 'thumbnailBadgeViewModel')) {
      if (typeof b?.text === 'string' && /\d/.test(b.text) && !parseDurationText(b.text)) {
        count = b.text
        break
      }
    }

    const coverId = videoIdFromThumbUrl(
      deepFind(lockup?.contentImage, 'sources')?.[0]?.[0]?.url,
    )

    push(lockup?.contentId, title, subtitle, count, coverId ? thumb(coverId) : '/placeholder.svg')
  }

  return results
}

/** Normalize a YouTube avatar/snippet URL to always use https: and be displayable. */
function normalizeAvatarUrl(url: string): string {
  if (!url) return ''
  // YouTube often serves protocol-relative URLs: "//yt3.ggpht.com/..."
  if (url.startsWith('//')) return `https:${url}`
  if (url.startsWith('/')) return `https:${url}`
  return url
}

/** Extract channels from a channel-filtered search payload. */
export function extractChannels(json: any): YtChannel[] {
  const out: YtChannel[] = []
  const seen = new Set<string>()

  // --- classic channelRenderer ---
  for (const c of deepFind(json, 'channelRenderer')) {
    const id = c?.channelId
    const name = c?.title?.simpleText || c?.title?.runs?.[0]?.text || ''
    if (!id || !name || seen.has(id)) continue
    seen.add(id)

    let avatar =
      c?.thumbnail?.thumbnails?.slice(-1)?.[0]?.url ||
      c?.avatar?.thumbnails?.slice(-1)?.[0]?.url ||
      ''

    out.push({
      id,
      name: name.trim(),
      avatarUrl: normalizeAvatarUrl(avatar) || '/placeholder.svg',
      subtitle: c?.videoCountText?.simpleText || c?.subscriberCountText?.simpleText || '',
      bannerUrl: c?.banner?.thumbnails?.slice(-1)?.[0]?.url || c?.mobileBanner?.thumbnails?.slice(-1)?.[0]?.url || undefined,
    })
  }

  // --- modern lockupViewModel shape (e.g. channel search results) ---
  for (const lockup of deepFind(json, 'lockupViewModel')) {
    if (lockup?.contentType !== 'LOCKUP_CONTENT_TYPE_CHANNEL') continue

    const id = lockup?.contentId
    const { title, subtitle } = metaFromLockup(lockup)
    if (!id || !title || seen.has(id)) continue
    seen.add(id)

    // Avatar from lockup contentImage
    let avatar = ''
    const srcs = deepFind(lockup?.contentImage, 'sources')
    if (srcs?.[0]?.[0]?.url) avatar = srcs[0][0].url
    else if (srcs?.[0]?.url) avatar = srcs[0].url

    // Also try thumbnail
    if (!avatar) {
      for (const t of deepFind(lockup, 'thumbnail')) {
        if (typeof t?.url === 'string') { avatar = t.url; break }
      }
    }

    // Try to extract banner from lockup metadata
    let banner: string | undefined
    const bannerSrcs = deepFind(lockup, 'banner')
    for (const b of bannerSrcs) {
      const t = b?.thumbnails?.slice(-1)?.[0]?.url
      if (t) { banner = t; break }
    }

    out.push({
      id,
      name: (title || '').trim(),
      avatarUrl: normalizeAvatarUrl(avatar) || '/placeholder.svg',
      subtitle: (subtitle || '').trim(),
      bannerUrl: banner,
    })
  }

  return out
}

/* ------------------------------------------------------------------ */
/* High-level helpers                                                  */
/* ------------------------------------------------------------------ */

export async function searchVideos(query: string): Promise<Track[]> {
  const json = await innertube('search', { query, params: SEARCH_FILTER.video })
  if (!json) return []
  return extractVideos(json, { requireDuration: true })
}

export async function searchPlaylists(query: string): Promise<YtPlaylist[]> {
  const json = await innertube('search', { query, params: SEARCH_FILTER.playlist })
  if (!json) return []
  return extractPlaylists(json)
}

export async function searchChannels(query: string): Promise<YtChannel[]> {
  const json = await innertube('search', { query, params: SEARCH_FILTER.channel })
  if (!json) return []
  return extractChannels(json)
}

/** Tracks inside a playlist. `VL` prefix = "view list". */
export async function getPlaylistTracks(
  playlistId: string,
): Promise<{ title: string; tracks: Track[] }> {
  const clean = playlistId.replace(/^VL/, '')
  const json = await innertube('browse', { browseId: `VL${clean}` })
  if (!json) return { title: '', tracks: [] }

  const title =
    deepFind(json, 'playlistHeaderRenderer')?.[0]?.title?.simpleText ||
    deepFind(json, 'pageHeaderRenderer')?.[0]?.pageTitle ||
    ''

  return { title, tracks: extractVideos(json) }
}

/** A channel's uploads + its official playlists. */
export async function getChannel(
  channelId: string,
): Promise<{ tracks: Track[]; playlists: YtPlaylist[] }> {
  const [videosTab, playlistsTab] = await Promise.all([
    // EgZ2aWRlb3M% = "videos" tab
    innertube('browse', { browseId: channelId, params: 'EgZ2aWRlb3PyBgQKAjoA' }),
    // EglwbGF5bGlzdHM% = "playlists" tab
    innertube('browse', { browseId: channelId, params: 'EglwbGF5bGlzdHPyBgQKAkIA' }),
  ])

  return {
    tracks: videosTab ? extractVideos(videosTab) : [],
    playlists: playlistsTab ? extractPlaylists(playlistsTab) : [],
  }
}

export async function getChannelBanner(channelId: string): Promise<string | undefined> {
  try {
    const home = await innertube('browse', { browseId: channelId })
    if (!home) return undefined

    // Try various paths where banner might be found
    const bannerThumbs =
      deepFind(home, 'banner')?.[0]?.thumbnails?.[0]?.url ||
      deepFind(home, 'mobileBanner')?.[0]?.thumbnails?.[0]?.url ||
      deepFind(home, 'tvBanner')?.[0]?.thumbnails?.[0]?.url ||
      deepFind(home, 'header')?.[0]?.banner?.thumbnails?.[0]?.url ||
      deepFind(home, 'c4TabbedHeaderRenderer')?.[0]?.banner?.thumbnails?.[0]?.url ||
      undefined

    if (typeof bannerThumbs === 'string') return bannerThumbs

    // Try deepFind for any banner thumbnails
    for (const item of deepFind(home, 'banner')) {
      if (item?.thumbnails?.[0]?.url) return item.thumbnails[0].url
    }

    return undefined
  } catch {
    return undefined
  }
}
