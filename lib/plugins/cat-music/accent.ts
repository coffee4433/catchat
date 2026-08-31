/**
 * Colour maths behind CatMusic's living accent.
 *
 * The plugin recolours itself from whatever cover art is playing: the shell
 * writes the picked hue into `--cm-accent-h/s/l` and every green in the UI
 * follows. Keeping the maths here — pure, DOM-free — means it can be unit
 * tested and reused off the main thread later if it ever gets expensive.
 */

export type Hsl = { h: number; s: number; l: number }

/** CatMusic's resting colour: the Spotify-ish green the plugin shipped with. */
export const DEFAULT_ACCENT: Hsl = { h: 145, s: 66, l: 47 }

/**
 * White text sits on top of this colour, and it also tints large blurred
 * areas of the backdrop. Outside this band the UI either glares or turns to
 * mud, so every picked colour is pulled back into range.
 */
const SATURATION_RANGE = [42, 82] as const
const LIGHTNESS_RANGE = [40, 58] as const

/** 12 buckets of 30° — coarse enough that noise and dithering fall together. */
const BUCKETS = 12
const BUCKET_WIDTH = 360 / BUCKETS

const clamp = (value: number, min: number, max: number) =>
  value < min ? min : value > max ? max : value

/** sRGB channels (0-255) to HSL with h in 0-360 and s/l in 0-100. */
export function rgbToHsl(r: number, g: number, b: number): Hsl {
  const rn = r / 255
  const gn = g / 255
  const bn = b / 255
  const max = Math.max(rn, gn, bn)
  const min = Math.min(rn, gn, bn)
  const delta = max - min
  const l = (max + min) / 2

  if (delta === 0) return { h: 0, s: 0, l: l * 100 }

  const s = delta / (1 - Math.abs(2 * l - 1))
  let h: number
  if (max === rn) h = ((gn - bn) / delta) % 6
  else if (max === gn) h = (bn - rn) / delta + 2
  else h = (rn - gn) / delta + 4

  h *= 60
  if (h < 0) h += 360

  return { h, s: s * 100, l: l * 100 }
}

/**
 * Deterministic hue for a string, used when the art gives us nothing to go
 * on (greyscale cover, blocked pixels). Same track always gets the same
 * colour, which matters more here than the colour being "right".
 */
export function hueFromString(input: string): number {
  let hash = 0
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 31 + input.charCodeAt(i)) | 0
  }
  return Math.abs(hash) % 360
}

/** Pulls any colour into the band that stays legible under white text. */
export function clampAccent({ h, s, l }: Hsl): Hsl {
  return {
    h: Math.round(((h % 360) + 360) % 360),
    s: Math.round(clamp(s, SATURATION_RANGE[0], SATURATION_RANGE[1])),
    l: Math.round(clamp(l, LIGHTNESS_RANGE[0], LIGHTNESS_RANGE[1])),
  }
}

/**
 * Picks the dominant *vivid* colour out of raw RGBA pixels.
 *
 * Not an average: averaging cover art reliably produces grey. Instead each
 * pixel votes for a hue bucket with a weight that rewards saturation and
 * mid-lightness, so a small band of neon beats a large expanse of near-black
 * — which is what the eye picks out of the artwork too.
 *
 * Returns null when nothing vivid is present (greyscale or near-empty art);
 * callers should fall back to {@link hueFromString}.
 */
export function pickAccentFromPixels(data: ArrayLike<number>): Hsl | null {
  const weights = new Float64Array(BUCKETS)
  const hues = new Float64Array(BUCKETS)
  const sats = new Float64Array(BUCKETS)
  const lums = new Float64Array(BUCKETS)

  for (let i = 0; i + 3 < data.length; i += 4) {
    if (data[i + 3] < 128) continue

    const { h, s, l } = rgbToHsl(data[i], data[i + 1], data[i + 2])
    // Blown-out and crushed pixels carry no usable hue, and letterboxing is
    // usually one of the two.
    if (l < 12 || l > 92 || s < 18) continue

    const weight = (s / 100) * (1 - Math.abs(l - 50) / 50)
    if (weight <= 0) continue

    const bucket = Math.min(BUCKETS - 1, Math.floor(h / BUCKET_WIDTH))
    weights[bucket] += weight
    hues[bucket] += h * weight
    sats[bucket] += s * weight
    lums[bucket] += l * weight
  }

  let best = -1
  let bestWeight = 0
  for (let b = 0; b < BUCKETS; b += 1) {
    if (weights[b] > bestWeight) {
      bestWeight = weights[b]
      best = b
    }
  }

  if (best < 0) return null

  const total = weights[best]
  return clampAccent({
    h: hues[best] / total,
    s: sats[best] / total,
    l: lums[best] / total,
  })
}

/** The accent for a track when its pixels are unusable or unavailable. */
export function fallbackAccent(seed: string): Hsl {
  return clampAccent({ h: hueFromString(seed), s: 64, l: 50 })
}
