import { NextResponse } from 'next/server'
import { getPlaylistTracks } from '@/lib/plugins/cat-music/innertube'
import { enforceRateLimit, PLAYLIST_ID_RE } from '@/lib/plugins/cat-music/route-guard'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const limited = enforceRateLimit(request)
  if (limited) return limited

  const { searchParams } = new URL(request.url)
  const playlistId = searchParams.get('id')?.trim()

  if (!playlistId) {
    return NextResponse.json({ title: '', tracks: [] })
  }

  if (!PLAYLIST_ID_RE.test(playlistId)) {
    return NextResponse.json(
      { error: 'invalid_playlist_id', title: '', tracks: [] },
      { status: 400 },
    )
  }

  try {
    const { ok, title, tracks } = await getPlaylistTracks(playlistId)
    if (!ok) {
      return NextResponse.json(
        { error: 'upstream_unavailable', title: '', tracks: [] },
        { status: 502 },
      )
    }
    return NextResponse.json({ title, tracks })
  } catch (err) {
    console.error('[cat-music] YouTube playlist fetch failed:', err)
    return NextResponse.json(
      { error: 'upstream_unavailable', title: '', tracks: [] },
      { status: 502 },
    )
  }
}
