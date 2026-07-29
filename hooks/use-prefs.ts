'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

export type Prefs = {
  desktopNotifications: boolean
  messageSounds: boolean
  enterToSend: boolean
  showOnlineStatus: boolean
  readReceipts: boolean
  muteUntil: string | null
  newContactNotifications: boolean
  whoCanMessage: 'everyone' | 'contacts'
  hideLastSeen: boolean
  fontSize: 'small' | 'medium' | 'large'
  chatDensity: 'compact' | 'normal' | 'spacious'
  timeFormat: '12h' | '24h'
  showTimestamps: boolean
  language: string
  timezone: string
}

function getDefaultTimezone(): string {
  if (typeof window === 'undefined') return 'UTC'
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone
  } catch {
    return 'UTC'
  }
}

export const DEFAULT_PREFS: Prefs = {
  desktopNotifications: true,
  messageSounds: true,
  enterToSend: true,
  showOnlineStatus: true,
  readReceipts: true,
  muteUntil: null,
  newContactNotifications: true,
  whoCanMessage: 'everyone',
  hideLastSeen: false,
  fontSize: 'medium',
  chatDensity: 'normal',
  timeFormat: '24h',
  showTimestamps: true,
  language: 'en',
  timezone: 'UTC',
}

export const PREFS_KEY = 'cz-prefs'

function readPrefs(): Prefs {
  if (typeof window === 'undefined') return DEFAULT_PREFS
  try {
    const raw = localStorage.getItem(PREFS_KEY)
    if (raw) return { ...DEFAULT_PREFS, ...JSON.parse(raw) }
  } catch {
    /* ignore */
  }
  return DEFAULT_PREFS
}

export function usePrefs() {
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS)
  const prefsRef = useRef(prefs)
  prefsRef.current = prefs

  useEffect(() => {
    setPrefs(readPrefs())
    const handler = () => setPrefs(readPrefs())
    window.addEventListener('cz-prefs-changed', handler)
    return () => window.removeEventListener('cz-prefs-changed', handler)
  }, [])

  const update = useCallback((patch: Partial<Prefs>) => {
    const next = { ...prefsRef.current, ...patch }
    localStorage.setItem(PREFS_KEY, JSON.stringify(next))
    setPrefs(next)
    window.dispatchEvent(new Event('cz-prefs-changed'))
  }, [])

  return [prefs, update] as const
}
