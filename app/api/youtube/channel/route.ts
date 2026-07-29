import { NextResponse } from 'next/server'
import { getChannel, getChannelBanner, searchChannels, searchVideos } from '@/lib/plugins/cat-music/innertube'

export const dynamic = 'force-dynamic'

/**
 * Resolve an artist/channel page.
 * Accepts either `?id=UC...` (exact) or `?name=Bad Bunny` (resolved via search).
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')?.trim()
  const name = searchParams.get('name')?.trim()

  try {
    let channelId = id && /^UC[A-Za-z0-9_-]{22}$/.test(id) ? id : ''
    let channel = null

    if (!channelId && name) {
      const found = await searchChannels(name)
      const lower = name.toLowerCase()
      channel =
        found.find((c) => c.name.toLowerCase() === lower) ||
        found.find((c) => c.name.toLowerCase().includes(lower)) ||
        found[0] ||
        null
      channelId = channel?.id || ''
    }

    if (!channelId) {
      const tracks = name ? await searchVideos(name) : []
      return NextResponse.json({ channel: null, tracks, playlists: [] })
    }

    const [{ tracks, playlists }, bannerUrl] = await Promise.all([
      getChannel(channelId),
      getChannelBanner(channelId),
    ])

    const finalTracks = tracks.length > 0 ? tracks : name ? await searchVideos(name) : []

    const artistName = channel?.name || name || ''
    if (artistName) {
      for (const t of finalTracks) {
        if (!t.artist || t.artist === 'YouTube Music') t.artist = artistName
      }
    }

    return NextResponse.json({
      channel: { ...(channel || { id: channelId, name: name || '', avatarUrl: '', subtitle: '' }), bannerUrl },
      tracks: finalTracks,
      playlists,
    })
  } catch (err) {
    console.error('[v0] YouTube channel fetch failed:', err)
    return NextResponse.json({ channel: null, tracks: [], playlists: [] })
  }
}
