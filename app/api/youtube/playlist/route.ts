import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const playlistId = searchParams.get('id')?.trim()

  if (!playlistId) {
    return NextResponse.json({ tracks: [] })
  }

  try {
    const response = await fetch(
      `https://www.youtube.com/playlist?list=${encodeURIComponent(playlistId)}`,
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
          json?.contents?.twoColumnBrowseResultsRenderer?.tabs?.[0]?.tabRenderer?.content
            ?.sectionListRenderer?.contents?.[0]?.itemSectionRenderer?.contents?.[0]
            ?.playlistVideoListRenderer?.contents

        if (Array.isArray(contents)) {
          const tracks: any[] = []

          for (const item of contents) {
            const video = item.playlistVideoRenderer
            if (!video || !video.videoId) continue

            const videoId = video.videoId
            const title = video.title?.runs?.[0]?.text || video.title?.simpleText || 'Canción'
            const artist =
              video.shortBylineText?.runs?.[0]?.text ||
              video.longBylineText?.runs?.[0]?.text ||
              'Artista'
            const durationStr = video.lengthText?.simpleText || '3:30'

            const parts = durationStr.split(':').map(Number)
            let secs = 180
            if (parts.length === 2) secs = parts[0] * 60 + parts[1]
            else if (parts.length === 3) secs = parts[0] * 3600 + parts[1] * 60 + parts[2]

            tracks.push({
              id: videoId,
              title,
              artist,
              album: 'YouTube Playlist',
              durationSeconds: secs,
              artworkUrl: `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`,
              genre: 'YouTube Playlist',
              year: 2024,
              source: 'youtube',
            })
          }

          if (tracks.length > 0) {
            return NextResponse.json({ tracks })
          }
        }
      }
    }
  } catch (err) {
    console.error('YouTube Playlist Track Parser Error:', err)
  }

  return NextResponse.json({ tracks: [] })
}
