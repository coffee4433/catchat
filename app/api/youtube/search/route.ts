import { NextResponse } from 'next/server'

// Recursive JSON parser to extract playlist objects from ytInitialData
function parsePlaylistsFromYtData(obj: any, results: any[] = [], seen = new Set<string>()) {
  if (!obj || typeof obj !== 'object') return results

  const pl = obj.playlistRenderer || obj.gridPlaylistRenderer
  if (pl && pl.playlistId && !seen.has(pl.playlistId)) {
    const playlistId = pl.playlistId
    seen.add(playlistId)

    const title =
      pl.title?.simpleText ||
      pl.title?.runs?.[0]?.text ||
      'Playlist Oficial'

    const owner =
      pl.shortBylineText?.runs?.[0]?.text ||
      pl.longBylineText?.runs?.[0]?.text ||
      ''

    let thumbUrl = ''
    const videoId = pl.navigationEndpoint?.watchEndpoint?.videoId || ''
    if (videoId) {
      thumbUrl = `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`
    } else if (pl.thumbnails && pl.thumbnails.length > 0) {
      const thumbs = pl.thumbnails[0]?.thumbnails || pl.thumbnails
      thumbUrl = thumbs[thumbs.length - 1]?.url || thumbs[0]?.url || ''
    }

    results.push({
      id: playlistId,
      playlistId,
      title,
      artist: owner,
      videoCount: pl.videoCount || pl.videoCountText?.runs?.[0]?.text || 'Vídeos',
      coverUrl: thumbUrl || '/placeholder.svg',
      tracks: [],
    })
  }

  if (Array.isArray(obj)) {
    for (const item of obj) {
      parsePlaylistsFromYtData(item, results, seen)
    }
  } else {
    for (const key of Object.keys(obj)) {
      if (typeof obj[key] === 'object' && obj[key] !== null) {
        parsePlaylistsFromYtData(obj[key], results, seen)
      }
    }
  }

  return results
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('q')?.trim()
  const type = searchParams.get('type')?.trim() // 'video' | 'playlist'

  if (!query || query.length < 2) {
    return NextResponse.json({ results: [] })
  }

  // 1. YouTube Official Channel Playlists Search Parser
  if (type === 'playlist') {
    const cleanHandle = query.toLowerCase().replace(/[^a-z0-9_]/g, '')
    const channelUrls = [
      `https://www.youtube.com/@${cleanHandle}/playlists`,
      `https://www.youtube.com/c/${encodeURIComponent(query)}/playlists`,
      `https://www.youtube.com/results?search_query=${encodeURIComponent(query + ' playlist')}&sp=EgIQAw%253D%253D`,
    ]

    for (const targetUrl of channelUrls) {
      try {
        const response = await fetch(targetUrl, {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
            'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
          },
        })

        if (response.ok) {
          const html = await response.text()
          const match =
            html.match(/var ytInitialData = ({.*?});<\/script>/) ||
            html.match(/window\["ytInitialData"\] = ({.*?});/)

          if (match && match[1]) {
            const json = JSON.parse(match[1])
            const foundPlaylists = parsePlaylistsFromYtData(json)

            if (foundPlaylists.length > 0) {
              // Return top 5-6 official playlists
              return NextResponse.json({ results: foundPlaylists.slice(0, 6) })
            }
          }
        }
      } catch (err) {
        console.error('YouTube Channel Playlists fetch error:', err)
      }
    }
  }

  // 2. Direct YouTube HTML Video search parser (Server-side, 100% reliable)
  try {
    const response = await fetch(
      `https://www.youtube.com/results?search_query=${encodeURIComponent(query + ' music')}&sp=EgIQAQ%253D%253D`,
      {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
          'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
        },
      }
    )

    if (response.ok) {
      const html = await response.text()

      const match =
        html.match(/var ytInitialData = ({.*?});<\/script>/) ||
        html.match(/window\["ytInitialData"\] = ({.*?});/)

      if (match && match[1]) {
        const json = JSON.parse(match[1])
        const contents =
          json?.contents?.twoColumnSearchResultsRenderer?.primaryContents
            ?.sectionListRenderer?.contents?.[0]?.itemSectionRenderer?.contents

        if (Array.isArray(contents)) {
          const results: any[] = []

          for (const item of contents) {
            const video = item.videoRenderer
            if (!video || !video.videoId) continue

            const videoId = video.videoId
            const title = video.title?.runs?.[0]?.text || 'Canción'
            const artist =
              video.ownerText?.runs?.[0]?.text ||
              video.longBylineText?.runs?.[0]?.text ||
              'Artista'
            const durationStr = video.lengthText?.simpleText || '3:30'

            const parts = durationStr.split(':').map(Number)
            let secs = 180
            if (parts.length === 2) secs = parts[0] * 60 + parts[1]
            else if (parts.length === 3) secs = parts[0] * 3600 + parts[1] * 60 + parts[2]

            results.push({
              id: videoId,
              title,
              artist,
              album: 'YouTube Music',
              durationSeconds: secs,
              artworkUrl: `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`,
              genre: 'YouTube Music',
              year: 2024,
              source: 'youtube',
            })
          }

          if (results.length > 0) {
            return NextResponse.json({ results })
          }
        }
      }
    }
  } catch (err) {
    console.error('YouTube Search HTML parser error:', err)
  }

  // 3. Secondary API proxy fallbacks
  const instances = [
    'https://invidious.nerdvpn.de',
    'https://inv.tux.pizza',
    'https://api.piped.yt',
  ]

  for (const instance of instances) {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 2500)
      const res = await fetch(
        `${instance}/api/v1/search?q=${encodeURIComponent(query + ' music')}&type=video`,
        { signal: controller.signal }
      )
      clearTimeout(timeoutId)
      if (res.ok) {
        const items = await res.json()
        const list = Array.isArray(items) ? items : items.items || []
        if (list.length > 0) {
          const results = list
            .filter((i: any) => i.videoId || i.url)
            .slice(0, 25)
            .map((i: any) => {
              const vId = i.videoId || (i.url ? i.url.split('v=')[1]?.split('&')[0] : '')
              return {
                id: vId,
                title: i.title || 'Canción',
                artist: i.author || i.uploaderName || 'Artista',
                album: 'YouTube Music',
                durationSeconds: i.lengthSeconds || i.duration || 180,
                artworkUrl: `https://i.ytimg.com/vi/${vId}/mqdefault.jpg`,
                genre: 'YouTube Music',
                year: 2024,
                source: 'youtube',
              }
            })
          if (results.length > 0) return NextResponse.json({ results })
        }
      }
    } catch {
      // Continue
    }
  }

  return NextResponse.json({ results: [] })
}
