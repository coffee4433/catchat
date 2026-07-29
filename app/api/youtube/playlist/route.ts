import { NextResponse } from 'next/server'
import { getPlaylistTracks } from '@/lib/plugins/cat-music/innertube'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const playlistId = searchParams.get('id')?.trim()

  if (!playlistId) {
    return NextResponse.json({ title: '', tracks: [] })
  }

  try {
    const { title, tracks } = await getPlaylistTracks(playlistId)
    return NextResponse.json({ title, tracks })
  } catch (err) {
    console.error('[v0] YouTube playlist fetch failed:', err)
    return NextResponse.json({ title: '', tracks: [] })
  }
}
