import { describe, expect, it } from 'vitest'
import { formatDuration, getArtworkUrl } from '@/lib/plugins/cat-music/youtube'

describe('formatDuration', () => {
  it('formats under an hour as m:ss', () => {
    expect(formatDuration(5)).toBe('0:05')
    expect(formatDuration(65)).toBe('1:05')
    expect(formatDuration(599)).toBe('9:59')
  })

  it('formats an hour or more as h:mm:ss', () => {
    expect(formatDuration(3600)).toBe('1:00:00')
    expect(formatDuration(3661)).toBe('1:01:01')
    expect(formatDuration(7325)).toBe('2:02:05')
  })

  it('truncates fractional seconds', () => {
    expect(formatDuration(90.9)).toBe('1:30')
  })

  it('falls back to 0:00 for missing or invalid input', () => {
    expect(formatDuration(0)).toBe('0:00')
    expect(formatDuration(NaN)).toBe('0:00')
    expect(formatDuration(undefined as unknown as number)).toBe('0:00')
  })
})

describe('getArtworkUrl', () => {
  it('builds a YouTube thumbnail URL from the video id', () => {
    expect(getArtworkUrl('dQw4w9WgXcQ')).toBe('https://i.ytimg.com/vi/dQw4w9WgXcQ/mqdefault.jpg')
  })

  it('falls back to the local placeholder when there is no id', () => {
    expect(getArtworkUrl('')).toBe('/placeholder.svg')
  })
})
