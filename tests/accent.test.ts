/**
 * Tests for the accent picker that drives CatMusic's dynamic colour.
 *
 * The interesting property is not "what colour does this exact image give"
 * but that a *small vivid area beats a large dull one* (that is what the eye
 * does), that unusable art is reported as unusable rather than as grey, and
 * that whatever comes out is always legible under white text.
 */

import { describe, expect, it } from 'vitest'
import {
  DEFAULT_ACCENT,
  clampAccent,
  fallbackAccent,
  hueFromString,
  pickAccentFromPixels,
  rgbToHsl,
} from '@/lib/plugins/cat-music/accent'

/** Builds an RGBA buffer from `[r, g, b, a?]` tuples, repeated `count` times. */
function pixels(...groups: Array<{ rgba: [number, number, number, number?]; count: number }>) {
  const out: number[] = []
  for (const { rgba, count } of groups) {
    for (let i = 0; i < count; i += 1) {
      out.push(rgba[0], rgba[1], rgba[2], rgba[3] ?? 255)
    }
  }
  return out
}

const BLACK: [number, number, number] = [4, 4, 6]
const MAGENTA: [number, number, number] = [214, 24, 198]
const ORANGE: [number, number, number] = [235, 122, 24]

describe('rgbToHsl', () => {
  it('maps the primaries onto the colour wheel', () => {
    expect(rgbToHsl(255, 0, 0)).toEqual({ h: 0, s: 100, l: 50 })
    expect(rgbToHsl(0, 255, 0)).toEqual({ h: 120, s: 100, l: 50 })
    expect(rgbToHsl(0, 0, 255)).toEqual({ h: 240, s: 100, l: 50 })
  })

  it('reports greys as unsaturated', () => {
    expect(rgbToHsl(255, 255, 255)).toEqual({ h: 0, s: 0, l: 100 })
    expect(rgbToHsl(0, 0, 0)).toEqual({ h: 0, s: 0, l: 0 })
    expect(rgbToHsl(128, 128, 128).s).toBe(0)
  })

  it('keeps hue positive when red is the max channel', () => {
    // Magenta-ish reds wrap past 0° and used to come back negative.
    expect(rgbToHsl(255, 0, 128).h).toBeGreaterThan(300)
    expect(rgbToHsl(255, 0, 128).h).toBeLessThan(360)
  })
})

describe('clampAccent', () => {
  it('pulls washed-out and blown-out colours into the legible band', () => {
    expect(clampAccent({ h: 200, s: 3, l: 96 })).toEqual({ h: 200, s: 42, l: 58 })
    expect(clampAccent({ h: 200, s: 100, l: 2 })).toEqual({ h: 200, s: 82, l: 40 })
  })

  it('wraps hue into 0-359 in both directions', () => {
    expect(clampAccent({ h: -30, s: 60, l: 50 }).h).toBe(330)
    expect(clampAccent({ h: 420, s: 60, l: 50 }).h).toBe(60)
  })

  it('leaves a colour already in range alone', () => {
    expect(clampAccent(DEFAULT_ACCENT)).toEqual(DEFAULT_ACCENT)
  })
})

describe('hueFromString', () => {
  it('is deterministic and stays on the wheel', () => {
    const hue = hueFromString('dQw4w9WgXcQ')
    expect(hue).toBe(hueFromString('dQw4w9WgXcQ'))
    expect(hue).toBeGreaterThanOrEqual(0)
    expect(hue).toBeLessThan(360)
  })

  it('separates different artwork', () => {
    expect(hueFromString('track-a')).not.toBe(hueFromString('track-b'))
  })

  it('handles the empty string', () => {
    expect(hueFromString('')).toBe(0)
  })
})

describe('fallbackAccent', () => {
  it('always returns something legible', () => {
    for (const seed of ['', 'a', 'https://i.ytimg.com/vi/dQw4w9WgXcQ/mqdefault.jpg']) {
      const { s, l } = fallbackAccent(seed)
      expect(s).toBeGreaterThanOrEqual(42)
      expect(s).toBeLessThanOrEqual(82)
      expect(l).toBeGreaterThanOrEqual(40)
      expect(l).toBeLessThanOrEqual(58)
    }
  })

  it('gives the same artwork the same colour every time', () => {
    expect(fallbackAccent('cover.jpg')).toEqual(fallbackAccent('cover.jpg'))
  })
})

describe('pickAccentFromPixels', () => {
  it('lets a small vivid area beat a large dark one', () => {
    // 8 magenta pixels against 500 near-black ones: averaging would return
    // black, but the accent should be the magenta you actually notice.
    const accent = pickAccentFromPixels(
      pixels({ rgba: [...BLACK, 255], count: 500 }, { rgba: [...MAGENTA, 255], count: 8 }),
    )
    expect(accent).not.toBeNull()
    expect(accent!.h).toBeGreaterThan(285)
    expect(accent!.h).toBeLessThan(320)
  })

  it('returns null for greyscale artwork so the caller can fall back', () => {
    expect(
      pickAccentFromPixels(
        pixels(
          { rgba: [0, 0, 0, 255], count: 40 },
          { rgba: [128, 128, 128, 255], count: 40 },
          { rgba: [255, 255, 255, 255], count: 40 },
        ),
      ),
    ).toBeNull()
  })

  it('ignores transparent pixels', () => {
    expect(
      pickAccentFromPixels(
        pixels({ rgba: [...MAGENTA, 0], count: 100 }, { rgba: [...ORANGE, 255], count: 10 }),
      )!.h,
    ).toBeLessThan(60)
  })

  it('clamps whatever it finds into the legible band', () => {
    const accent = pickAccentFromPixels(pixels({ rgba: [255, 246, 0, 255], count: 64 }))!
    expect(accent.s).toBeLessThanOrEqual(82)
    expect(accent.l).toBeGreaterThanOrEqual(40)
    expect(accent.l).toBeLessThanOrEqual(58)
  })

  it('returns null for empty and truncated buffers', () => {
    expect(pickAccentFromPixels([])).toBeNull()
    expect(pickAccentFromPixels([255, 0])).toBeNull()
  })
})
