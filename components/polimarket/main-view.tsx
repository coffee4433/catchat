'use client'

import React, { useMemo, useState } from 'react'
import {
  Bell,
  BellOff,
  BellRing,
  ExternalLink,
  Loader2,
  RefreshCw,
  Trophy,
  Gamepad2,
  CheckCheck,
  Trash2,
  Pause,
  Play,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { usePolimarket } from '@/lib/plugins/polimarket/polimarket-provider'
import {
  CATEGORY_LABELS,
  POLYMARKET_EVENT_URL,
  type PolymarketAlert,
  type PolymarketCategory,
  type PolymarketEvent,
} from '@/lib/plugins/polimarket/types'

type Tab = 'alerts' | 'sports' | 'esports'

function formatRelativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return 'ahora mismo'
  if (mins < 60) return `hace ${mins} min`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `hace ${hours} h`
  const days = Math.floor(hours / 24)
  return `hace ${days} d`
}

function formatDateTime(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('es-ES', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function EventCard({
  event,
  category,
  isNew,
  onOpen,
}: {
  event: PolymarketEvent
  category: PolymarketCategory
  isNew?: boolean
  onOpen?: () => void
}) {
  const market = event.markets?.[0]
  let prices: string[] | null = null
  if (market?.outcomePrices) {
    try {
      prices = JSON.parse(market.outcomePrices) as string[]
    } catch {
      prices = null
    }
  }

  return (
    <a
      href={`${POLYMARKET_EVENT_URL}/${event.slug}`}
      target="_blank"
      rel="noopener noreferrer"
      onClick={onOpen}
      className="group flex gap-3 rounded-2xl border border-border/50 bg-background/60 p-3 transition-all hover:border-primary/40 hover:bg-muted/40"
    >
      {event.image ? (
        <img
          src={event.image}
          alt=""
          className="size-12 shrink-0 rounded-xl object-cover"
        />
      ) : (
        <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-muted">
          {category === 'sports' ? (
            <Trophy className="size-5 text-muted-foreground" />
          ) : (
            <Gamepad2 className="size-5 text-muted-foreground" />
          )}
        </div>
      )}

      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-2">
          <p className="line-clamp-2 text-sm font-medium leading-snug group-hover:text-primary">
            {event.title}
          </p>
          {isNew && (
            <span className="shrink-0 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
              Nuevo
            </span>
          )}
        </div>

        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span className="rounded-md bg-muted px-1.5 py-0.5">{CATEGORY_LABELS[category]}</span>
          <span>{formatRelativeTime(event.createdAt)}</span>
          {prices && prices.length >= 2 && (
            <span>
              {Math.round(Number(prices[0]) * 100)}% / {Math.round(Number(prices[1]) * 100)}%
            </span>
          )}
        </div>
      </div>

      <ExternalLink className="mt-1 size-4 shrink-0 opacity-0 transition-opacity group-hover:opacity-60" />
    </a>
  )
}

function AlertRow({ alert, onRead }: { alert: PolymarketAlert; onRead: () => void }) {
  return (
    <div
      className={`flex gap-3 rounded-2xl border p-3 transition-colors ${
        alert.read
          ? 'border-border/30 bg-background/30 opacity-70'
          : 'border-emerald-500/30 bg-emerald-500/5'
      }`}
    >
      {alert.image ? (
        <img src={alert.image} alt="" className="size-10 shrink-0 rounded-lg object-cover" />
      ) : (
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
          {alert.category === 'sports' ? (
            <Trophy className="size-4" />
          ) : (
            <Gamepad2 className="size-4" />
          )}
        </div>
      )}

      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium leading-snug">{alert.title}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {CATEGORY_LABELS[alert.category]} · detectado {formatRelativeTime(alert.detectedAt)}
        </p>
      </div>

      <div className="flex shrink-0 flex-col gap-1">
        <a
          href={`${POLYMARKET_EVENT_URL}/${alert.slug}`}
          target="_blank"
          rel="noopener noreferrer"
          title="Abrir en Polymarket"
          className="inline-flex size-7 items-center justify-center rounded-lg hover:bg-muted"
        >
          <ExternalLink className="size-3.5" />
        </a>
        {!alert.read && (
          <Button variant="ghost" size="icon-sm" onClick={onRead} title="Marcar como leída">
            <CheckCheck className="size-3.5" />
          </Button>
        )}
      </div>
    </div>
  )
}

export function PolimarketMainView() {
  const {
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
  } = usePolimarket()

  const [activeTab, setActiveTab] = useState<Tab>('alerts')

  const recentAlertIds = useMemo(
    () => new Set(alerts.slice(0, 20).map((a) => `${a.category}:${a.eventId}`)),
    [alerts],
  )

  const tabs: { id: Tab; label: string; icon: React.ReactNode; badge?: number }[] = [
    {
      id: 'alerts',
      label: 'Alertas',
      icon: <BellRing className="size-4" />,
      badge: unreadCount,
    },
    {
      id: 'sports',
      label: 'Deportes',
      icon: <Trophy className="size-4" />,
    },
    {
      id: 'esports',
      label: 'Esports',
      icon: <Gamepad2 className="size-4" />,
    },
  ]

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-border/40 px-6 py-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Polimarket Alerts</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Te avisa cuando llega una apuesta nueva de deportes o esports
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => updateSettings({ monitoring: !settings.monitoring })}
            >
              {settings.monitoring ? (
                <>
                  <Pause className="size-3.5" />
                  Pausar
                </>
              ) : (
                <>
                  <Play className="size-3.5" />
                  Reanudar
                </>
              )}
            </Button>
            <Button variant="outline" size="sm" onClick={refreshNow} disabled={isLoading}>
              {isLoading ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <RefreshCw className="size-3.5" />
              )}
              Actualizar
            </Button>
          </div>
        </div>

        {/* Status bar */}
        <div className="mt-4 flex flex-wrap items-center gap-3 text-xs">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 ${
              settings.monitoring
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                : 'bg-muted text-muted-foreground'
            }`}
          >
            <span
              className={`size-1.5 rounded-full ${
                settings.monitoring ? 'animate-pulse bg-emerald-500' : 'bg-muted-foreground'
              }`}
            />
            {settings.monitoring ? 'Monitor activo' : 'Monitor pausado'}
          </span>
          <span className="text-muted-foreground">
            Última revisión: {formatDateTime(lastCheckedAt)}
          </span>
          {lastError && (
            <span className="text-destructive">Error: {lastError}</span>
          )}
        </div>
      </div>

      <div className="flex min-h-0 flex-1">
        {/* Sidebar settings */}
        <aside className="hidden w-56 shrink-0 border-r border-border/40 p-4 lg:block">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Configuración
          </p>

          <div className="space-y-4">
            <label className="flex cursor-pointer items-center justify-between gap-2 text-sm">
              <span className="flex items-center gap-2">
                <Trophy className="size-3.5" />
                Deportes
              </span>
              <input
                type="checkbox"
                checked={settings.notifySports}
                onChange={(e) => updateSettings({ notifySports: e.target.checked })}
                className="size-4 rounded accent-primary"
              />
            </label>

            <label className="flex cursor-pointer items-center justify-between gap-2 text-sm">
              <span className="flex items-center gap-2">
                <Gamepad2 className="size-3.5" />
                Esports
              </span>
              <input
                type="checkbox"
                checked={settings.notifyEsports}
                onChange={(e) => updateSettings({ notifyEsports: e.target.checked })}
                className="size-4 rounded accent-primary"
              />
            </label>

            <label className="flex cursor-pointer items-center justify-between gap-2 text-sm">
              <span className="flex items-center gap-2">
                <Bell className="size-3.5" />
                Notif. sistema
              </span>
              <input
                type="checkbox"
                checked={settings.browserNotifications}
                onChange={(e) => updateSettings({ browserNotifications: e.target.checked })}
                className="size-4 rounded accent-primary"
              />
            </label>

            {notificationPermission !== 'granted' && settings.browserNotifications && (
              <Button
                variant="secondary"
                size="sm"
                className="w-full"
                onClick={requestNotificationPermission}
              >
                {notificationPermission === 'denied' ? (
                  <>
                    <BellOff className="size-3.5" />
                    Permiso denegado
                  </>
                ) : (
                  <>
                    <Bell className="size-3.5" />
                    Activar notificaciones
                  </>
                )}
              </Button>
            )}

            <div>
              <label className="mb-1.5 block text-xs text-muted-foreground">
                Intervalo de revisión
              </label>
              <select
                value={settings.pollIntervalMs}
                onChange={(e) => updateSettings({ pollIntervalMs: Number(e.target.value) })}
                className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-sm"
              >
                <option value={30000}>30 segundos</option>
                <option value={60000}>1 minuto</option>
                <option value={120000}>2 minutos</option>
                <option value={300000}>5 minutos</option>
              </select>
            </div>
          </div>
        </aside>

        {/* Main content */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Tabs */}
          <div className="flex gap-1 border-b border-border/40 px-4 pt-3">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative flex items-center gap-2 rounded-t-lg px-4 py-2 text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-muted/60 text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {tab.icon}
                {tab.label}
                {tab.badge != null && tab.badge > 0 && (
                  <span className="rounded-full bg-emerald-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                    {tab.badge}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto p-4">
            {activeTab === 'alerts' && (
              <div className="mx-auto max-w-2xl space-y-3">
                {alerts.length > 0 && (
                  <div className="mb-4 flex justify-end gap-2">
                    <Button variant="ghost" size="sm" onClick={markAllRead}>
                      <CheckCheck className="size-3.5" />
                      Marcar todas leídas
                    </Button>
                    <Button variant="ghost" size="sm" onClick={clearAlerts}>
                      <Trash2 className="size-3.5" />
                      Limpiar
                    </Button>
                  </div>
                )}

                {alerts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <BellRing className="mb-3 size-10 text-muted-foreground/50" />
                    <p className="text-sm font-medium">Sin alertas todavía</p>
                    <p className="mt-1 max-w-sm text-xs text-muted-foreground">
                      Cuando Polymarket publique una apuesta nueva de deportes o esports, aparecerá
                      aquí y recibirás una notificación.
                    </p>
                  </div>
                ) : (
                  alerts.map((alert) => (
                    <AlertRow
                      key={alert.id}
                      alert={alert}
                      onRead={() => markAlertRead(alert.id)}
                    />
                  ))
                )}
              </div>
            )}

            {activeTab === 'sports' && (
              <div className="mx-auto max-w-2xl space-y-2">
                {latestEvents.sports.length === 0 ? (
                  <EmptyCategory label="deportes" loading={isLoading} />
                ) : (
                  latestEvents.sports.map((event) => (
                    <EventCard
                      key={event.id}
                      event={event}
                      category="sports"
                      isNew={recentAlertIds.has(`sports:${event.id}`)}
                    />
                  ))
                )}
              </div>
            )}

            {activeTab === 'esports' && (
              <div className="mx-auto max-w-2xl space-y-2">
                {latestEvents.esports.length === 0 ? (
                  <EmptyCategory label="esports" loading={isLoading} />
                ) : (
                  latestEvents.esports.map((event) => (
                    <EventCard
                      key={event.id}
                      event={event}
                      category="esports"
                      isNew={recentAlertIds.has(`esports:${event.id}`)}
                    />
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function EmptyCategory({ label, loading }: { label: string; loading: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {loading ? (
        <Loader2 className="mb-3 size-8 animate-spin text-muted-foreground" />
      ) : (
        <Trophy className="mb-3 size-10 text-muted-foreground/50" />
      )}
      <p className="text-sm text-muted-foreground">
        {loading ? `Cargando ${label}...` : `No hay apuestas recientes de ${label}`}
      </p>
    </div>
  )
}
