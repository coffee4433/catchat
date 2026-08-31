'use client'

/**
 * The live accent store.
 *
 * One colour, shared by every part of the plugin — the shell, the floating
 * player bar and the dock widget all render in different React subtrees, so
 * the value lives outside React and they subscribe to it. That also means the
 * (relatively costly) pixel read happens once per artwork, not once per
 * consumer, and a track you return to recolours instantly from cache.
 */

import { useEffect, useSyncExternalStore, type CSSProperties } from 'react'
import { DEFAULT_ACCENT, fallbackAccent, pickAccentFromPixels, type Hsl } from './accent'

/** Cover art downscaled to this square before reading pixels. */
const SAMPLE_SIZE = 24

const cache = new Map<string, Hsl>()
const listeners = new Set<() => void>()

let current: Hsl = DEFAULT_ACCENT
/** The artwork the current colour belongs to — guards against stale loads. */
let currentKey = ''

function emit() {
  for (const listener of listeners) listener()
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function commit(key: string, accent: Hsl) {
  cache.set(key, accent)
  if (key !== currentKey) return
  current = accent
  emit()
}

/** Draws the artwork tiny and reads it back. Throws if the canvas is tainted. */
async function readArtwork(url: string): Promise<Hsl> {
  const image = new Image()
  image.crossOrigin = 'anonymous'
  image.decoding = 'async'

  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve()
    image.onerror = () => reject(new Error(`artwork failed to load: ${url}`))
    image.src = url
  })

  const canvas = document.createElement('canvas')
  canvas.width = SAMPLE_SIZE
  canvas.height = SAMPLE_SIZE
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) throw new Error('2d context unavailable')

  ctx.drawImage(image, 0, 0, SAMPLE_SIZE, SAMPLE_SIZE)
  const { data } = ctx.getImageData(0, 0, SAMPLE_SIZE, SAMPLE_SIZE)
  return pickAccentFromPixels(data) ?? fallbackAccent(url)
}

/**
 * Points the accent at a piece of artwork. Cheap to call repeatedly: repeats
 * of the current artwork are ignored and previously read art is served from
 * cache, so several components can call it with the same URL.
 */
export function requestAccent(artworkUrl?: string | null) {
  const key = artworkUrl || ''
  if (key === currentKey) return
  currentKey = key

  if (!key) {
    current = DEFAULT_ACCENT
    emit()
    return
  }

  const cached = cache.get(key)
  if (cached) {
    current = cached
    emit()
    return
  }

  // Deliberately not awaited: the UI keeps the previous colour and crossfades
  // (via the transition on `.cm-root`) once the pixels land.
  void readArtwork(key)
    .then((accent) => commit(key, accent))
    .catch(() => commit(key, fallbackAccent(key)))
}

/** Subscribes to the shared accent. */
export function useCatMusicAccent(): Hsl {
  return useSyncExternalStore(
    subscribe,
    () => current,
    () => DEFAULT_ACCENT,
  )
}

/** Declares which artwork should be driving the accent right now. */
export function useAccentSource(artworkUrl?: string | null) {
  useEffect(() => {
    requestAccent(artworkUrl)
  }, [artworkUrl])
}

/**
 * The custom properties to spread onto a `.cm-root` element. Inline styles
 * win over the class's own defaults, and everything inside inherits them.
 */
export function accentVars({ h, s, l }: Hsl): CSSProperties {
  return {
    '--cm-accent-h': String(h),
    '--cm-accent-s': `${s}%`,
    '--cm-accent-l': `${l}%`,
  } as CSSProperties
}

/**
 * Subscribes and returns the properties in one call, for the chrome that
 * renders outside the plugin shell. Pair it with `className="cm-scope"`: the
 * class derives `--cm-accent`, `--cm-halo` and friends from the three raw
 * channels this returns, which is what `.cm-root` does for the shell itself.
 */
export function useAccentScopeStyle(): CSSProperties {
  return accentVars(useCatMusicAccent())
}
