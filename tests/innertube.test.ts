import { describe, expect, it } from 'vitest'
import {
  extractBanner,
  extractChannels,
  extractPlaylists,
  extractVideos,
  parseDurationText,
} from '@/lib/plugins/cat-music/innertube'

/**
 * The fixtures below mirror the two payload generations YouTube serves today:
 * the classic `*Renderer` tree, and the newer `lockupViewModel`. Both shapes
 * reach the same extractors, and a layout change upstream breaks here first —
 * which is the whole point of pinning them.
 *
 * Ids are real-looking (11 chars, `[A-Za-z0-9_-]`) because the parser rejects
 * anything that isn't.
 */

const RICK = 'dQw4w9WgXcQ'
const ROLL = 'oHg5SJYRHA0'
const LIVE = 'live0000000'
const ANON = 'anon0000000'
const CHANNEL_ID = 'UCuAXFkgsw1L7xaCfnd5JJOw'

/** Wraps items the way a search response nests them, several levels deep. */
function searchPayload(items: unknown[]) {
  return {
    contents: {
      twoColumnSearchResultsRenderer: {
        primaryContents: {
          sectionListRenderer: {
            contents: [{ itemSectionRenderer: { contents: items } }],
          },
        },
      },
    },
  }
}

const CLASSIC_SEARCH = searchPayload([
  {
    videoRenderer: {
      videoId: RICK,
      title: { runs: [{ text: 'Never Gonna Give You Up' }] },
      ownerText: { runs: [{ text: 'Rick Astley' }] },
      lengthText: { simpleText: '3:33' },
    },
  },
  {
    videoRenderer: {
      videoId: ROLL,
      title: { simpleText: 'RickRoll' },
      shortBylineText: { runs: [{ text: 'Cats' }] },
      lengthSeconds: '212',
    },
  },
  {
    // A live stream: no duration at all, so `requireDuration` has to drop it.
    videoRenderer: {
      videoId: LIVE,
      title: { simpleText: 'Lo-Fi radio' },
      shortBylineText: { runs: [{ text: 'Chill Cat' }] },
    },
  },
  {
    // Shell result with no title — never playable.
    videoRenderer: { videoId: 'notitle0000', lengthText: { simpleText: '2:00' } },
  },
  {
    videoRenderer: {
      videoId: ANON,
      title: { simpleText: 'Anon track' },
      lengthText: { simpleText: '0:45' },
    },
  },
  {
    // Same video again under a different renderer: must be deduped.
    compactVideoRenderer: {
      videoId: RICK,
      title: { simpleText: 'Never Gonna Give You Up (again)' },
      longBylineText: { simpleText: 'Rick Astley' },
      lengthText: { simpleText: '3:33' },
    },
  },
])

/** Playlist/radio lockup. Radio ids start with `RD` and aren't browsable. */
function playlistLockup(opts: {
  contentId: string
  title: string
  subtitle?: string
  count?: string
  coverId?: string
}) {
  return {
    lockupViewModel: {
      contentType: 'LOCKUP_CONTENT_TYPE_PLAYLIST',
      contentId: opts.contentId,
      contentImage: {
        collectionThumbnailViewModel: {
          primaryThumbnail: {
            thumbnailViewModel: {
              image: {
                sources: [{ url: `https://i.ytimg.com/vi/${opts.coverId ?? RICK}/hqdefault.jpg` }],
              },
              overlays: opts.count
                ? [
                    {
                      thumbnailOverlayBadgeViewModel: {
                        thumbnailBadges: [{ thumbnailBadgeViewModel: { text: opts.count } }],
                      },
                    },
                  ]
                : [],
            },
          },
        },
      },
      metadata: {
        lockupMetadataViewModel: {
          title: { content: opts.title },
          metadata: {
            contentMetadataViewModel: {
              metadataRows: opts.subtitle
                ? [{ metadataParts: [{ text: { content: opts.subtitle } }] }]
                : [],
            },
          },
        },
      },
    },
  }
}

/** Modern video lockup: metadata moved into view models, id into `contentId`. */
function videoLockup(opts: {
  contentId?: string
  thumbId?: string
  title: string
  subtitle?: string
  duration?: string
}) {
  return {
    lockupViewModel: {
      contentType: 'LOCKUP_CONTENT_TYPE_VIDEO',
      ...(opts.contentId ? { contentId: opts.contentId } : {}),
      contentImage: {
        thumbnailViewModel: {
          image: {
            sources: [
              { url: `https://i.ytimg.com/vi/${opts.thumbId ?? opts.contentId}/hqdefault.jpg` },
            ],
          },
          overlays: opts.duration
            ? [
                {
                  thumbnailOverlayBadgeViewModel: {
                    thumbnailBadges: [{ thumbnailBadgeViewModel: { text: opts.duration } }],
                  },
                },
              ]
            : [],
        },
      },
      metadata: {
        lockupMetadataViewModel: {
          title: { content: opts.title },
          metadata: {
            contentMetadataViewModel: {
              metadataRows: [
                // Views come first in the real payload; the parser has to skip
                // rows that start with a digit to find the channel name.
                { metadataParts: [{ text: { content: '1.2M vistas' } }] },
                ...(opts.subtitle
                  ? [{ metadataParts: [{ text: { content: opts.subtitle } }] }]
                  : []),
              ],
            },
          },
        },
      },
    },
  }
}

/** Channel lockup: avatar lives under contentImage, id under contentId. */
function channelLockup(opts: { contentId: string; title: string; subtitle?: string }) {
  return {
    lockupViewModel: {
      contentType: 'LOCKUP_CONTENT_TYPE_CHANNEL',
      contentId: opts.contentId,
      contentImage: {
        avatarViewModel: {
          image: { sources: [{ url: '//yt3.ggpht.com/avatar=s176' }] },
        },
      },
      metadata: {
        lockupMetadataViewModel: {
          title: { content: opts.title },
          metadata: {
            contentMetadataViewModel: {
              metadataRows: opts.subtitle
                ? [{ metadataParts: [{ text: { content: opts.subtitle } }] }]
                : [],
            },
          },
        },
      },
    },
  }
}

const PLAYLIST_ID = 'PLFgquLnL59alW3xmYiWRaoz0oM3H17Lth'
const RADIO_ID = 'RDCLAK5uy_kLWIr9gv1XLlPbaDS965-Db4TrBoUTxQ8'

const LOCKUP_SEARCH = searchPayload([
  videoLockup({
    contentId: RICK,
    title: 'Never Gonna Give You Up',
    subtitle: 'Rick Astley',
    duration: '3:33',
  }),
  // No contentId at all: the id has to be recovered from the thumbnail URL.
  videoLockup({ thumbId: ROLL, title: 'RickRoll', subtitle: 'Cats', duration: '3:32' }),
  // Neither an id nor a usable thumbnail -> unplayable, must be dropped.
  videoLockup({ title: 'Ghost entry', duration: '1:00' }),
  playlistLockup({
    contentId: PLAYLIST_ID,
    title: 'Cat Beats',
    subtitle: 'Chill Cat',
    count: '37 vídeos',
  }),
  // Radio mix: browsable as a queue, not as a playlist.
  playlistLockup({ contentId: RADIO_ID, title: 'Mix - Cat Beats', count: '50 vídeos' }),
])

const CLASSIC_PLAYLISTS = searchPayload([
  {
    playlistRenderer: {
      playlistId: PLAYLIST_ID,
      title: { simpleText: 'Cat Beats' },
      shortBylineText: { runs: [{ text: 'Chill Cat' }] },
      videoCountText: { runs: [{ text: '37' }] },
      navigationEndpoint: { watchEndpoint: { videoId: RICK } },
      thumbnails: [{ thumbnails: [{ url: `https://i.ytimg.com/vi/${ROLL}/default.jpg` }] }],
    },
  },
  { playlistRenderer: { playlistId: RADIO_ID, title: { simpleText: 'Mix' } } },
  // No title -> nothing to show in the UI.
  { playlistRenderer: { playlistId: 'PLnotitle' } },
])

const CLASSIC_CHANNELS = searchPayload([
  {
    channelRenderer: {
      channelId: CHANNEL_ID,
      title: { simpleText: 'Rick Astley' },
      // Protocol-relative URL, and the biggest size comes last.
      thumbnail: {
        thumbnails: [
          { url: '//yt3.ggpht.com/avatar=s88' },
          { url: '//yt3.ggpht.com/avatar=s176' },
        ],
      },
      subscriberCountText: { simpleText: '4.1M subscribers' },
    },
  },
  // Same channel twice in one payload (search often does this).
  { channelRenderer: { channelId: CHANNEL_ID, title: { simpleText: 'Rick Astley (dup)' } } },
  { channelRenderer: { title: { simpleText: 'No id at all' } } },
])

const LOCKUP_CHANNELS = searchPayload([
  channelLockup({ contentId: CHANNEL_ID, title: 'Chill Cat', subtitle: '120K suscriptores' }),
])

const CHANNEL_PAGE = {
  header: {
    pageHeaderRenderer: {
      content: {
        pageHeaderViewModel: {
          banner: {
            thumbnails: [
              { url: 'https://yt3.googleusercontent.com/banner=w1060' },
              { url: 'https://yt3.googleusercontent.com/banner=w2560' },
            ],
          },
        },
      },
    },
  },
}

const MOBILE_ONLY_BANNER = {
  header: { mobileBanner: { thumbnails: [{ url: '//yt3.ggpht.com/banner=w640' }] } },
}

const NESTED_RENDERERS = searchPayload([
  {
    videoRenderer: {
      videoId: RICK,
      title: { simpleText: 'Never Gonna Give You Up' },
      lengthText: { simpleText: '3:33' },
      // A suggestion nested *inside* an already-matched renderer. deepCollect
      // has to keep descending into matches or this one stays invisible.
      menu: {
        menuRenderer: {
          items: [
            {
              compactVideoRenderer: {
                videoId: ANON,
                title: { simpleText: 'Anon track' },
                lengthText: { simpleText: '0:45' },
              },
            },
          ],
        },
      },
    },
  },
])

describe('parseDurationText', () => {
  it('parses mm:ss and hh:mm:ss', () => {
    expect(parseDurationText('0:45')).toBe(45)
    expect(parseDurationText('3:33')).toBe(213)
    expect(parseDurationText('1:02:11')).toBe(3731)
    expect(parseDurationText('  2:00  ')).toBe(120)
  })

  it('returns 0 for anything it cannot parse', () => {
    expect(parseDurationText('LIVE')).toBe(0)
    expect(parseDurationText('10:5')).toBe(0)
    expect(parseDurationText('')).toBe(0)
    expect(parseDurationText(undefined)).toBe(0)
    expect(parseDurationText(212)).toBe(0)
  })
})

describe('extractVideos — classic renderers', () => {
  it('keeps every playable track, in payload order', () => {
    const tracks = extractVideos(CLASSIC_SEARCH)
    expect(tracks.map((t) => t.id)).toEqual([RICK, ROLL, LIVE, ANON])
  })

  it('reads durations from lengthText and from lengthSeconds', () => {
    const tracks = extractVideos(CLASSIC_SEARCH)
    expect(tracks[0].durationSeconds).toBe(213)
    expect(tracks[1].durationSeconds).toBe(212)
    expect(tracks[2].durationSeconds).toBe(0)
  })

  it('falls back through the byline fields, then to YouTube Music', () => {
    const tracks = extractVideos(CLASSIC_SEARCH)
    expect(tracks[0].artist).toBe('Rick Astley') // ownerText
    expect(tracks[1].artist).toBe('Cats') // shortBylineText
    expect(tracks[3].artist).toBe('YouTube Music') // no byline at all
  })

  it('drops titleless shells and dedupes across renderer kinds', () => {
    const tracks = extractVideos(CLASSIC_SEARCH)
    expect(tracks.map((t) => t.id)).not.toContain('notitle0000')
    expect(tracks.filter((t) => t.id === RICK)).toHaveLength(1)
    // The compactVideoRenderer copy carried a different title; first one wins.
    expect(tracks[0].title).toBe('Never Gonna Give You Up')
  })

  it('drops zero-duration items when requireDuration is set', () => {
    const tracks = extractVideos(CLASSIC_SEARCH, { requireDuration: true })
    expect(tracks.map((t) => t.id)).toEqual([RICK, ROLL, ANON])
  })

  it('builds a param-free mqdefault artwork URL from the id', () => {
    const [first] = extractVideos(CLASSIC_SEARCH)
    expect(first.artworkUrl).toBe(`https://i.ytimg.com/vi/${RICK}/mqdefault.jpg`)
    expect(first.source).toBe('youtube')
    expect(first.album).toBe('YouTube')
  })
})

describe('extractVideos — lockupViewModel', () => {
  it('reads id, title, duration and channel out of the view models', () => {
    const tracks = extractVideos(LOCKUP_SEARCH)
    expect(tracks[0]).toMatchObject({
      id: RICK,
      title: 'Never Gonna Give You Up',
      artist: 'Rick Astley',
      durationSeconds: 213,
    })
  })

  it('recovers the id from the thumbnail URL when contentId is missing', () => {
    const tracks = extractVideos(LOCKUP_SEARCH)
    expect(tracks[1]).toMatchObject({ id: ROLL, title: 'RickRoll', durationSeconds: 212 })
  })

  it('skips the view-count row when looking for the channel name', () => {
    const tracks = extractVideos(LOCKUP_SEARCH)
    expect(tracks.map((t) => t.artist)).not.toContain('1.2M vistas')
  })

  it('ignores lockups with no resolvable id and non-video lockups', () => {
    const tracks = extractVideos(LOCKUP_SEARCH)
    expect(tracks.map((t) => t.id)).toEqual([RICK, ROLL])
    expect(tracks.map((t) => t.title)).not.toContain('Ghost entry')
    expect(tracks.map((t) => t.title)).not.toContain('Cat Beats')
  })
})

describe('extractVideos — traversal', () => {
  it('finds renderers nested inside other renderers', () => {
    const tracks = extractVideos(NESTED_RENDERERS)
    expect(tracks.map((t) => t.id)).toEqual([RICK, ANON])
  })

  it('survives payloads with nothing in them', () => {
    expect(extractVideos(null)).toEqual([])
    expect(extractVideos({})).toEqual([])
    expect(extractVideos(searchPayload([]))).toEqual([])
  })
})

describe('extractPlaylists', () => {
  it('reads classic playlistRenderer entries', () => {
    const [playlist, ...rest] = extractPlaylists(CLASSIC_PLAYLISTS)
    expect(rest).toHaveLength(0)
    expect(playlist).toMatchObject({
      id: PLAYLIST_ID,
      playlistId: PLAYLIST_ID,
      title: 'Cat Beats',
      artist: 'Chill Cat',
      videoCount: '37',
      tracks: [],
    })
  })

  it('prefers the first video over the thumbnail URL for the cover', () => {
    const [playlist] = extractPlaylists(CLASSIC_PLAYLISTS)
    expect(playlist.coverUrl).toBe(`https://i.ytimg.com/vi/${RICK}/mqdefault.jpg`)
  })

  it('reads playlist lockups, including the count badge', () => {
    const [playlist, ...rest] = extractPlaylists(LOCKUP_SEARCH)
    expect(rest).toHaveLength(0)
    expect(playlist).toMatchObject({
      playlistId: PLAYLIST_ID,
      title: 'Cat Beats',
      artist: 'Chill Cat',
      videoCount: '37 vídeos',
      coverUrl: `https://i.ytimg.com/vi/${RICK}/mqdefault.jpg`,
    })
  })

  it('drops radio mixes, which are not browsable as playlists', () => {
    expect(extractPlaylists(LOCKUP_SEARCH).map((p) => p.playlistId)).not.toContain(RADIO_ID)
    expect(extractPlaylists(CLASSIC_PLAYLISTS).map((p) => p.playlistId)).not.toContain(RADIO_ID)
  })

  it('ignores video lockups', () => {
    expect(extractPlaylists(LOCKUP_SEARCH).map((p) => p.title)).not.toContain('RickRoll')
  })
})

describe('extractChannels', () => {
  it('takes the largest avatar and forces https on protocol-relative URLs', () => {
    const channels = extractChannels(CLASSIC_CHANNELS)
    expect(channels).toHaveLength(1)
    expect(channels[0]).toMatchObject({
      id: CHANNEL_ID,
      name: 'Rick Astley',
      avatarUrl: 'https://yt3.ggpht.com/avatar=s176',
      subtitle: '4.1M subscribers',
    })
  })

  it('skips duplicates and entries without an id', () => {
    const names = extractChannels(CLASSIC_CHANNELS).map((c) => c.name)
    expect(names).not.toContain('Rick Astley (dup)')
    expect(names).not.toContain('No id at all')
  })

  it('reads the modern channel lockup shape', () => {
    const [channel] = extractChannels(LOCKUP_CHANNELS)
    expect(channel).toMatchObject({
      id: CHANNEL_ID,
      name: 'Chill Cat',
      subtitle: '120K suscriptores',
      avatarUrl: 'https://yt3.ggpht.com/avatar=s176',
    })
  })

  it('returns nothing for payloads without channels', () => {
    expect(extractChannels(CLASSIC_SEARCH)).toEqual([])
    expect(extractChannels(null)).toEqual([])
  })
})

describe('extractBanner', () => {
  it('picks the widest banner from a channel page', () => {
    expect(extractBanner(CHANNEL_PAGE)).toBe('https://yt3.googleusercontent.com/banner=w2560')
  })

  it('falls back to the mobile banner and normalizes it', () => {
    expect(extractBanner(MOBILE_ONLY_BANNER)).toBe('https://yt3.ggpht.com/banner=w640')
  })

  it('returns undefined when there is no banner', () => {
    expect(extractBanner(CLASSIC_SEARCH)).toBeUndefined()
    expect(extractBanner(null)).toBeUndefined()
  })
})

