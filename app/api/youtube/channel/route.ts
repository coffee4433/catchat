import { NextResponse } from 'next/server'
import { getChannel, searchChannels, searchVideos } from '@/lib/plugins/cat-music/innertube'
import {
  CHANNEL_ID_RE,
  MAX_QUERY_LENGTH,
  enforceRateLimit,
} from '@/lib/plugins/cat-music/route-guard'

export const dynamic = 'force-dynamic'

const EMPTY = { channel: null, tracks: [], playlists: [] }

/**
 * Resolve an artist/channel page.
 * Accepts either `?id=UC...` (exact) or `?name=Bad Bunny` (resolved via search).
 */
export async function GET(request: Request) {
  const limited = enforceRateLimit(request)
  if (limited) return limited

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')?.trim()
  const name = searchParams.get('name')?.trim()

  if (!id && !name) {
    return NextResponse.json(EMPTY)
  }
  if (id && !CHANNEL_ID_RE.test(id)) {
    return NextResponse.json({ error: 'invalid_channel_id', ...EMPTY }, { status: 400 })
  }
  if (name && name.length > MAX_QUERY_LENGTH) {
    return NextResponse.json({ error: 'query_too_long', ...EMPTY }, { status: 400 })
  }

  try {
    let channelId = id || ''
    let channel = null

    if (!channelId && name) {
      const found = await searchChannels(name)
      if (!found.ok) return upstreamUnavailable()

      const lower = name.toLowerCase()
      channel =
        found.channels.find((c) => c.name.toLowerCase() === lower) ||
        found.channels.find((c) => c.name.toLowerCase().includes(lower)) ||
        found.channels[0] ||
        null
      channelId = channel?.id || ''
    }

    // No channel matched: fall back to a plain video search for the name.
    if (!channelId) {
      if (!name) return NextResponse.json(EMPTY)
      const fallback = await searchVideos(name)
      if (!fallback.ok) return upstreamUnavailable()
      return NextResponse.json({ channel: null, tracks: fallback.tracks, playlists: [] })
    }

    const { ok, tracks, playlists, bannerUrl } = await getChannel(channelId)
    if (!ok) return upstreamUnavailable()

    let finalTracks = tracks
    if (finalTracks.length === 0 && name) {
      const fallback = await searchVideos(name)
      finalTracks = fallback.tracks
    }

    const artistName = channel?.name || name || ''
    if (artistName) {
      // Copy rather than mutate: these objects come out of the shared response
      // cache, so writing to them would poison later reads.
      finalTracks = finalTracks.map((t) =>
        !t.artist || t.artist === 'YouTube Music' ? { ...t, artist: artistName } : t,
      )
    }

    return NextResponse.json({
      channel: {
        ...(channel || { id: channelId, name: name || '', avatarUrl: '', subtitle: '' }),
        bannerUrl,
      },
      tracks: finalTracks,
      playlists,
    })
  } catch (err) {
    console.error('[cat-music] YouTube channel fetch failed:', err)
    return upstreamUnavailable()
  }
}

function upstreamUnavailable() {
  return NextResponse.json({ error: 'upstream_unavailable', ...EMPTY }, { status: 502 })
}
