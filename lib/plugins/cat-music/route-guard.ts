/**
 * Shared guard for the `/api/youtube/*` routes.
 *
 * Those routes proxy YouTube's private InnerTube API on the server's IP, so an
 * unthrottled client can burn the whole app's reputation with YouTube. The
 * limiter is per server instance (same tradeoff as `lib/rate-limit.ts`
 * documents) and keyed by client IP, because these endpoints are read-only and
 * shouldn't pay for a session lookup on every keystroke of a search box.
 */
import { NextResponse } from 'next/server'
import { createRateLimiter } from '@/lib/rate-limit'

/** Roughly one search box typing session per minute, with headroom. */
const limiter = createRateLimiter({ windowMs: 60_000, maxRequests: 90 })

/** Drop expired buckets once in a while so the map can't grow unbounded. */
let sweepCounter = 0

function clientKey(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim()
    if (first) return first
  }
  return request.headers.get('x-real-ip')?.trim() || 'unknown'
}

/**
 * Returns a 429 response when the caller is over budget, or `null` to proceed.
 */
export function enforceRateLimit(request: Request): NextResponse | null {
  if (++sweepCounter % 500 === 0) limiter.sweep()

  const result = limiter.check(clientKey(request))
  if (result.allowed) return null

  return NextResponse.json(
    { error: 'rate_limited', results: [], tracks: [], playlists: [] },
    { status: 429, headers: { 'Retry-After': String(result.retryAfter) } },
  )
}

/** A YouTube video id is exactly 11 url-safe base64 chars. */
export const VIDEO_ID_RE = /^[A-Za-z0-9_-]{11}$/

/** Channel ids are `UC` + 22 url-safe base64 chars. */
export const CHANNEL_ID_RE = /^UC[A-Za-z0-9_-]{22}$/

/**
 * Playlist ids come in several flavours (PL…, OLAK5uy_…, RD…, UU…, LL, WL) and
 * YouTube keeps adding more, so validate the character set and length rather
 * than trying to enumerate prefixes.
 */
export const PLAYLIST_ID_RE = /^(VL)?[A-Za-z0-9_-]{2,60}$/

/** Upper bound on a search query, so we don't forward junk upstream. */
export const MAX_QUERY_LENGTH = 120
