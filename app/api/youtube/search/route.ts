import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('q')?.trim()

  if (!query || query.length < 2) {
    return NextResponse.json({ results: [] })
  }

  const instances = [
    'https://invidious.nerdvpn.de',
    'https://inv.tux.pizza',
    'https://invidious.drgns.space',
    'https://vid.puffyan.us',
    'https://invidious.privacydev.net',
  ]

  for (const instance of instances) {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 3000)

      const res = await fetch(
        `${instance}/api/v1/search?q=${encodeURIComponent(query + ' music')}&type=video`,
        {
          signal: controller.signal,
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          },
        }
      )
      clearTimeout(timeoutId)

      if (!res.ok) continue
      const items = await res.json()

      if (Array.isArray(items) && items.length > 0) {
        const results = items
          .filter((item: any) => item.videoId)
          .slice(0, 30)
          .map((item: any) => ({
            id: item.videoId,
            title: item.title || 'YouTube Track',
            artist: item.author || 'YouTube Artist',
            album: 'YouTube Music',
            durationSeconds: item.lengthSeconds || 180,
            artworkUrl: `https://i.ytimg.com/vi/${item.videoId}/mqdefault.jpg`,
            genre: 'YouTube Music',
            year: 2024,
            source: 'youtube',
          }))

        if (results.length > 0) {
          return NextResponse.json({ results })
        }
      }
    } catch {
      // Try next endpoint
    }
  }

  return NextResponse.json({ results: [] })
}
