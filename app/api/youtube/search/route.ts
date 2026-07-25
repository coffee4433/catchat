import { NextResponse } from 'next/server'

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
      `https://www.youtube.com/results?search_query=${encodeURIComponent(query + ' official playlist')}&sp=EgIQAw%253D%253D`,
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
            const jsonStr = match[1]
            const playlistMatches = jsonStr.match(/{"playlistRenderer":{.*?}}|{"gridPlaylistRenderer":{.*?}}/g)

            if (playlistMatches && playlistMatches.length > 0) {
              const playlists: any[] = []
              const seenIds = new Set<string>()

              for (const pStr of playlistMatches) {
                try {
                  const pObj = JSON.parse(pStr)
                  const pl = pObj.playlistRenderer || pObj.gridPlaylistRenderer
                  if (!pl || !pl.playlistId || seenIds.has(pl.playlistId)) continue

                  const playlistId = pl.playlistId
                  seenIds.add(playlistId)

                  const title = pl.title?.simpleText || pl.title?.runs?.[0]?.text || 'Playlist Oficial'
                  const videoCount = pl.videoCount || pl.videoCountText?.runs?.[0]?.text || 'Vídeos'
                  const owner =
                    pl.shortBylineText?.runs?.[0]?.text ||
                    pl.longBylineText?.runs?.[0]?.text ||
                    query

                  const videoId = pl.navigationEndpoint?.watchEndpoint?.videoId || ''
                  const thumbUrl = videoId
                    ? `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`
                    : pl.sidebarPrimaryRenderer?.thumbnailRenderer?.playlistVideoThumbnailRenderer?.thumbnail?.thumbnails?.[0]?.url ||
                      pl.thumbnails?.[0]?.thumbnails?.[0]?.url ||
                      '/placeholder.svg'

                  playlists.push({
                    id: playlistId,
                    playlistId,
                    title,
                    artist: owner,
                    videoCount,
                    coverUrl: thumbUrl,
                    tracks: [],
                  })
                } catch {
                  // Ignore parse snippet error
                }
              }

              if (playlists.length > 0) {
                // Return official channel playlists (deduplicated & precise)
                return NextResponse.json({ results: playlists.slice(0, 10) })
              }
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

      // Extract ytInitialData object from YouTube search page
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

            // Parse duration string into seconds
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

  // 2. Secondary API proxy fallbacks
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
