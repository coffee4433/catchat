import { NextResponse } from 'next/server'
import { searchVideos, searchPlaylists, searchChannels } from '@/lib/plugins/cat-music/innertube'
import { enforceRateLimit, MAX_QUERY_LENGTH } from '@/lib/plugins/cat-music/route-guard'

export const dynamic = 'force-dynamic'

const TYPES = ['video', 'playlist', 'channel'] as const
type SearchType = (typeof TYPES)[number]

export async function GET(request: Request) {
  const limited = enforceRateLimit(request)
  if (limited) return limited

  const { searchParams } = new URL(request.url)
  const query = searchParams.get('q')?.trim()
  const rawType = searchParams.get('type')?.trim() || 'video'

  if (!TYPES.includes(rawType as SearchType)) {
    return NextResponse.json({ error: 'invalid_type', results: [] }, { status: 400 })
  }
  const type = rawType as SearchType

  if (!query || query.length < 2) {
    return NextResponse.json({ results: [] })
  }
  if (query.length > MAX_QUERY_LENGTH) {
    return NextResponse.json({ error: 'query_too_long', results: [] }, { status: 400 })
  }

  try {
    if (type === 'playlist') {
      const { ok, playlists } = await searchPlaylists(query)
      if (!ok) return upstreamUnavailable()
      return NextResponse.json({ results: playlists })
    }

    if (type === 'channel') {
      const { ok, channels } = await searchChannels(query)
      if (!ok) return upstreamUnavailable()
      return NextResponse.json({ results: channels })
    }

    const { ok, tracks } = await searchVideos(query)
    if (!ok) return upstreamUnavailable()
    return NextResponse.json({ results: tracks })
  } catch (err) {
    console.error('[cat-music] YouTube search failed:', err)
    return upstreamUnavailable()
  }
}

/**
 * 502 rather than an empty 200: the client has to be able to tell "YouTube is
 * down" apart from "nothing matched", or it shows a wrong empty state.
 */
function upstreamUnavailable() {
  return NextResponse.json({ error: 'upstream_unavailable', results: [] }, { status: 502 })
}
