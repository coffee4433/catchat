'use client'

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { fetchAllCategoryEvents } from './api'
import {
  CATEGORY_LABELS,
  DEFAULT_SETTINGS,
  POLYMARKET_EVENT_URL,
  type PolymarketAlert,
  type PolymarketCategory,
  type PolymarketEvent,
  type PolymarketSettings,
} from './types'

const STORAGE_SEEN = 'cz-polimarket-seen-events'
const STORAGE_ALERTS = 'cz-polimarket-alerts'
const STORAGE_SETTINGS = 'cz-polimarket-settings'

type PolimarketContextValue = {
  settings: PolymarketSettings
  updateSettings: (patch: Partial<PolymarketSettings>) => void
  alerts: PolymarketAlert[]
  unreadCount: number
  markAlertRead: (id: string) => void
  markAllRead: () => void
  clearAlerts: () => void
  latestEvents: Record<PolymarketCategory, PolymarketEvent[]>
  isLoading: boolean
  lastCheckedAt: string | null
  lastError: string | null
  refreshNow: () => Promise<void>
  requestNotificationPermission: () => Promise<NotificationPermission>
  notificationPermission: NotificationPermission | 'unsupported'
}

const PolimarketCtx = createContext<PolimarketContextValue | null>(null)

function loadJson<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function saveJson(key: string, value: unknown) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Ignore storage errors
  }
}

function eventKey(category: PolymarketCategory, eventId: string) {
  return `${category}:${eventId}`
}

function sendBrowserNotification(alert: PolymarketAlert) {
  if (typeof window === 'undefined' || !('Notification' in window)) return
  if (Notification.permission !== 'granted') return

  const n = new Notification(`Nueva apuesta — ${CATEGORY_LABELS[alert.category]}`, {
    body: alert.title,
    icon: alert.image || '/catchat.png',
    tag: alert.id,
  })

  n.onclick = () => {
    window.open(`${POLYMARKET_EVENT_URL}/${alert.slug}`, '_blank', 'noopener,noreferrer')
    n.close()
  }
}

export function PolimarketRootProvider({
  children,
  active = true,
}: {
  children: ReactNode
  user?: unknown
  active?: boolean
}) {
  const [settings, setSettings] = useState<PolymarketSettings>(DEFAULT_SETTINGS)
  const [alerts, setAlerts] = useState<PolymarketAlert[]>([])
  const [latestEvents, setLatestEvents] = useState<Record<PolymarketCategory, PolymarketEvent[]>>({
    sports: [],
    esports: [],
  })
  const [isLoading, setIsLoading] = useState(false)
  const [lastCheckedAt, setLastCheckedAt] = useState<string | null>(null)
  const [lastError, setLastError] = useState<string | null>(null)
  const [notificationPermission, setNotificationPermission] = useState<
    NotificationPermission | 'unsupported'
  >('default')

  const seenRef = useRef<Set<string>>(new Set())
  const initializedRef = useRef(false)
  const pollingRef = useRef(false)

  useEffect(() => {
    setSettings(loadJson(STORAGE_SETTINGS, DEFAULT_SETTINGS))
    setAlerts(loadJson<PolymarketAlert[]>(STORAGE_ALERTS, []))
    seenRef.current = new Set(loadJson<string[]>(STORAGE_SEEN, []))

    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotificationPermission(Notification.permission)
    } else {
      setNotificationPermission('unsupported')
    }
  }, [])

  const persistSettings = useCallback((next: PolymarketSettings) => {
    setSettings(next)
    saveJson(STORAGE_SETTINGS, next)
  }, [])

  const updateSettings = useCallback(
    (patch: Partial<PolymarketSettings>) => {
      persistSettings({ ...settings, ...patch })
    },
    [persistSettings, settings],
  )

  const persistAlerts = useCallback((next: PolymarketAlert[]) => {
    setAlerts(next)
    saveJson(STORAGE_ALERTS, next)
  }, [])

  const persistSeen = useCallback((seen: Set<string>) => {
    seenRef.current = seen
    saveJson(STORAGE_SEEN, Array.from(seen))
  }, [])

  const processEvents = useCallback(
    (data: Record<PolymarketCategory, PolymarketEvent[]>) => {
      setLatestEvents(data)

      const newAlerts: PolymarketAlert[] = []
      const nextSeen = new Set(seenRef.current)
      const categories: PolymarketCategory[] = ['sports', 'esports']

      const categoryEnabled: Record<PolymarketCategory, boolean> = {
        sports: settings.notifySports,
        esports: settings.notifyEsports,
      }

      for (const category of categories) {
        if (!categoryEnabled[category]) continue

        for (const event of data[category]) {
          const key = eventKey(category, event.id)
          if (nextSeen.has(key)) continue

          nextSeen.add(key)

          if (initializedRef.current) {
            newAlerts.push({
              id: `${key}-${Date.now()}`,
              eventId: event.id,
              title: event.title,
              slug: event.slug,
              category,
              image: event.image || event.icon,
              createdAt: event.createdAt,
              detectedAt: new Date().toISOString(),
              read: false,
            })
          }
        }
      }

      persistSeen(nextSeen)
      initializedRef.current = true

      if (newAlerts.length > 0) {
        setAlerts((prev) => {
          const merged = [...newAlerts, ...prev].slice(0, 100)
          saveJson(STORAGE_ALERTS, merged)
          return merged
        })

        if (settings.browserNotifications) {
          for (const alert of newAlerts) {
            sendBrowserNotification(alert)
          }
        }
      }
    },
    [persistSeen, settings.browserNotifications, settings.notifyEsports, settings.notifySports],
  )

  const refreshNow = useCallback(async () => {
    if (pollingRef.current) return
    pollingRef.current = true
    setIsLoading(true)
    setLastError(null)

    try {
      const data = await fetchAllCategoryEvents(25)
      processEvents(data)
      setLastCheckedAt(new Date().toISOString())
    } catch (err) {
      setLastError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setIsLoading(false)
      pollingRef.current = false
    }
  }, [processEvents])

  useEffect(() => {
    if (!active || !settings.monitoring) return

    refreshNow()
    const timer = setInterval(refreshNow, settings.pollIntervalMs)
    return () => clearInterval(timer)
  }, [active, refreshNow, settings.monitoring, settings.pollIntervalMs])

  const markAlertRead = useCallback(
    (id: string) => {
      persistAlerts(alerts.map((a) => (a.id === id ? { ...a, read: true } : a)))
    },
    [alerts, persistAlerts],
  )

  const markAllRead = useCallback(() => {
    persistAlerts(alerts.map((a) => ({ ...a, read: true })))
  }, [alerts, persistAlerts])

  const clearAlerts = useCallback(() => {
    persistAlerts([])
  }, [persistAlerts])

  const requestNotificationPermission = useCallback(async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      setNotificationPermission('unsupported')
      return 'denied' as NotificationPermission
    }

    const permission = await Notification.requestPermission()
    setNotificationPermission(permission)
    return permission
  }, [])

  const unreadCount = alerts.filter((a) => !a.read).length

  return (
    <PolimarketCtx.Provider
      value={{
        settings,
        updateSettings,
        alerts,
        unreadCount,
        markAlertRead,
        markAllRead,
        clearAlerts,
        latestEvents,
        isLoading,
        lastCheckedAt,
        lastError,
        refreshNow,
        requestNotificationPermission,
        notificationPermission,
      }}
    >
      {children}
    </PolimarketCtx.Provider>
  )
}

export function usePolimarket(): PolimarketContextValue {
  const ctx = useContext(PolimarketCtx)
  if (!ctx) {
    throw new Error('usePolimarket must be used within PolimarketRootProvider')
  }
  return ctx
}
