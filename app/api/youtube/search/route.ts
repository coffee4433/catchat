import { NextResponse } from 'next/server'
import { searchVideos, searchPlaylists, searchChannels } from '@/lib/plugins/cat-music/innertube'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('q')?.trim()
  const type = (searchParams.get('type')?.trim() || 'video') as 'video' | 'playlist' | 'channel'

  if (!query || query.length < 2) {
    return NextResponse.json({ results: [] })
  }

  try {
    if (type === 'playlist') {
      const results = await searchPlaylists(query)
      return NextResponse.json({ results })
    }

    if (type === 'channel') {
      const results = await searchChannels(query)
      return NextResponse.json({ results })
    }

    const results = await searchVideos(query)
    return NextResponse.json({ results })
  } catch (err) {
    console.error('[v0] YouTube search failed:', err)
    return NextResponse.json({ results: [], error: 'search_failed' }, { status: 200 })
  }
}
