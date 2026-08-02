'use client'

import React, { useMemo, useState } from 'react'
import {
  Bell,
  BellOff,
  BellRing,
  CheckCheck,
  Gamepad2,
  Loader2,
  Pause,
  Play,
  RefreshCw,
  Search,
  Trash2,
  Trophy,
  Zap,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EventDetailPanel } from '@/components/polimarket/event-detail-panel'
import { findAllArbitrage, filterArbitrage } from '@/lib/plugins/polimarket/arbitrage'
import { formatUsd, parseMarket } from '@/lib/plugins/polimarket/markets'
import { usePolimarket } from '@/lib/plugins/polimarket/polimarket-provider'
import {
  CATEGORY_LABELS,
  type ArbitrageOpportunity,
  type PolymarketAlert,
  type PolymarketCategory,
  type PolymarketEvent,
  type SelectedPolymarketItem,
} from '@/lib/plugins/polimarket/types'

type Tab = 'alerts' | 'sports' | 'esports'

function formatRelativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return 'ahora'
  if (mins < 60) return `${mins}m`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h`
  return `${Math.floor(hours / 24)}d`
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

function findEvent(
  latestEvents: Record<PolymarketCategory, PolymarketEvent[]>,
  category: PolymarketCategory,
  eventId: string,
): PolymarketEvent | undefined {
  return latestEvents[category].find((e) => e.id === eventId)
}

function EventCard({
  event,
  category,
  isNew,
  selected,
  onSelect,
}: {
  event: PolymarketEvent
  category: PolymarketCategory
  isNew?: boolean
  selected?: boolean
  onSelect: () => void
}) {
  const market = event.markets?.[0] ? parseMarket(event.markets[0]) : null
  const hasArb = (event.markets ?? []).some((m) => parseMarket(m)?.hasArbitrage)

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex h-[168.5px] w-[300px] shrink-0 flex-col rounded-xl border p-3 text-left transition-all hover:border-primary/40 hover:bg-muted/40 ${
        selected
          ? 'border-primary/50 bg-primary/5 ring-1 ring-primary/20'
          : 'border-border/50 bg-background/60'
      }`}
    >
      <div className="flex items-start gap-2.5">
        {event.image ? (
          <img src={event.image} alt="" className="size-11 shrink-0 rounded-lg object-cover" />
        ) : (
          <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-muted">
            {category === 'sports' ? (
              <Trophy className="size-4 text-muted-foreground" />
            ) : (
              <Gamepad2 className="size-4 text-muted-foreground" />
            )}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 text-sm font-medium leading-snug">{event.title}</p>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <span className="rounded bg-muted px-1.5 py-0.5 text-[10px]">
              {CATEGORY_LABELS[category]}
            </span>
            <span className="text-[10px] text-muted-foreground">
              {formatRelativeTime(event.createdAt)}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-auto flex flex-wrap items-center gap-2 pt-2 text-[11px] text-muted-foreground">
        {event.volume != null && event.volume > 0 && (
          <span>Vol. {formatUsd(event.volume)}</span>
        )}
        {event.liquidity != null && event.liquidity > 0 && (
          <span>Liq. {formatUsd(event.liquidity)}</span>
        )}
        {market && market.outcomes.length >= 2 && (
          <span className="tabular-nums">
            {market.outcomes[0].impliedPct}% / {market.outcomes[1].impliedPct}%
          </span>
        )}
        {isNew && (
          <span className="rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[9px] font-bold uppercase text-emerald-600 dark:text-emerald-400">
            Nuevo
          </span>
        )}
        {hasArb && (
          <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[9px] font-bold text-amber-600 dark:text-amber-400">
            <Zap className="size-2.5" />
            Arb
          </span>
        )}
      </div>
    </button>
  )
}

function AlertCard({
  alert,
  selected,
  onSelect,
  onRead,
}: {
  alert: PolymarketAlert
  selected?: boolean
  onSelect: () => void
  onRead: () => void
}) {
  return (
    <div
      className={`flex h-full w-[300px] shrink-0 items-center gap-2 rounded-xl border px-2.5 py-2 transition-colors ${
        selected
          ? 'border-primary/50 bg-primary/5 ring-1 ring-primary/20'
          : alert.read
            ? 'border-border/30 bg-background/30 opacity-75'
            : 'border-emerald-500/30 bg-emerald-500/5'
      }`}
    >
      <button
        type="button"
        onClick={onSelect}
        className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
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
          <p className="line-clamp-2 text-sm font-medium leading-snug">{alert.title}</p>
          <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
            {CATEGORY_LABELS[alert.category]} · {formatRelativeTime(alert.detectedAt)}
          </p>
        </div>
      </button>
      {!alert.read && (
        <Button
          variant="ghost"
          size="icon-sm"
          className="shrink-0"
          onClick={(e) => {
            e.stopPropagation()
            onRead()
          }}
          title="Marcar leída"
        >
          <CheckCheck className="size-3.5" />
        </Button>
      )}
    </div>
  )
}

function ArbitrageCard({
  op,
  selected,
  onSelect,
}: {
  op: ArbitrageOpportunity
  selected?: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex h-full w-[300px] shrink-0 flex-col rounded-xl border p-3 text-left transition-all hover:border-amber-500/40 ${
        selected
          ? 'border-amber-500/50 bg-amber-500/10 ring-1 ring-amber-500/20'
          : 'border-amber-500/25 bg-amber-500/5'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="line-clamp-2 text-sm font-medium leading-snug">{op.eventTitle}</p>
        <span className="shrink-0 rounded-full bg-amber-500/20 px-2 py-0.5 text-xs font-bold text-amber-600 dark:text-amber-400">
          +{op.profitPct}%
        </span>
      </div>

      <p className="mt-1 line-clamp-1 text-[11px] text-muted-foreground">{op.marketQuestion}</p>

      <div className="mt-auto flex items-end justify-between gap-2 pt-2">
        <div className="flex min-w-0 flex-1 gap-2">
          {op.outcomes.map((o) => (
            <div
              key={o.name}
              className="min-w-0 flex-1 rounded-lg bg-background/60 px-2 py-1.5 text-center"
            >
              <p className="truncate text-[10px] text-muted-foreground">{o.name}</p>
              <p className="text-sm font-bold tabular-nums">{o.impliedPct}%</p>
              <p className="text-[10px] tabular-nums text-muted-foreground">
                {(o.price * 100).toFixed(1)}¢
              </p>
            </div>
          ))}
        </div>
        <div className="shrink-0 text-right text-[10px] text-muted-foreground">
          <p>Coste {(op.totalCost * 100).toFixed(1)}¢</p>
          <p className="font-medium text-emerald-600 dark:text-emerald-400">Pago 100¢</p>
        </div>
      </div>
    </button>
  )
}

function HorizontalStrip({
  title,
  icon,
  action,
  empty,
  children,
  rowHeight = 'md',
  className,
}: {
  title: string
  icon?: React.ReactNode
  action?: React.ReactNode
  empty?: React.ReactNode
  children: React.ReactNode
  rowHeight?: 'sm' | 'md'
  className?: string
}) {
  const hasChildren = React.Children.count(children) > 0
  const rowH = rowHeight === 'sm' ? 'min-h-[76px]' : 'min-h-[152px]'

  return (
    <section className={`flex min-w-0 flex-col overflow-hidden ${className ?? ''}`}>
      <div className="mb-2 flex shrink-0 items-center justify-between gap-2 px-1">
        <h3 className="flex min-w-0 items-center gap-1.5 truncate text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {icon}
          {title}
        </h3>
        {action}
      </div>
      {hasChildren ? (
        <div
          className={`thin-scroll flex flex-wrap ${rowH} min-w-0 items-start gap-3 overflow-y-auto rounded-xl border border-border/30 bg-muted/10 px-2 py-2`}
        >
          {children}
        </div>
      ) : (
        (empty ?? (
          <div className="flex h-[76px] items-center justify-center rounded-xl border border-dashed border-border/50 px-4 text-center text-xs text-muted-foreground">
            Sin resultados
          </div>
        ))
      )}
    </section>
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
  const [selected, setSelected] = useState<SelectedPolymarketItem | null>(null)
  const [arbQuery, setArbQuery] = useState('')

  const recentAlertIds = useMemo(
    () => new Set(alerts.slice(0, 20).map((a) => `${a.category}:${a.eventId}`)),
    [alerts],
  )

  const arbitrageOps = useMemo(
    () => findAllArbitrage(latestEvents),
    [latestEvents],
  )

  const filteredArb = useMemo(
    () => filterArbitrage(arbitrageOps, arbQuery),
    [arbitrageOps, arbQuery],
  )

  const selectEvent = (event: PolymarketEvent, category: PolymarketCategory) => {
    setSelected({ event, category })
  }

  const selectByIds = (
    eventId: string,
    category: PolymarketCategory,
    fallback?: Pick<PolymarketAlert, 'title' | 'slug' | 'image' | 'createdAt'>,
  ) => {
    const event = findEvent(latestEvents, category, eventId)
    if (event) {
      selectEvent(event, category)
      return
    }
    if (fallback) {
      selectEvent(
        {
          id: eventId,
          title: fallback.title,
          slug: fallback.slug,
          image: fallback.image,
          createdAt: fallback.createdAt,
          markets: [],
        },
        category,
      )
    }
  }

  const selectArbitrage = (op: ArbitrageOpportunity) => {
    selectByIds(op.eventId, op.category)
  }

  const isSelected = (eventId: string, category: PolymarketCategory) =>
    selected?.event.id === eventId && selected.category === category

  const tabs: { id: Tab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'alerts', label: 'Alertas', icon: <BellRing className="size-4" />, badge: unreadCount },
    { id: 'sports', label: 'Deportes', icon: <Trophy className="size-4" /> },
    { id: 'esports', label: 'Esports', icon: <Gamepad2 className="size-4" /> },
  ]

  return (
    <div className="flex h-full flex-col">
      {/* Header horizontal */}
      <header className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-2 border-b border-border/40 px-4 py-3">
        <div className="mr-auto min-w-0">
          <h1 className="text-lg font-semibold tracking-tight">Polimarket</h1>
          <p className="text-xs text-muted-foreground">
            Alertas · arbitraje · deportes y esports
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs">
          <label className="flex cursor-pointer items-center gap-1.5">
            <input
              type="checkbox"
              checked={settings.notifySports}
              onChange={(e) => updateSettings({ notifySports: e.target.checked })}
              className="size-3.5 rounded accent-primary"
            />
            <Trophy className="size-3" />
            Deportes
          </label>
          <label className="flex cursor-pointer items-center gap-1.5">
            <input
              type="checkbox"
              checked={settings.notifyEsports}
              onChange={(e) => updateSettings({ notifyEsports: e.target.checked })}
              className="size-3.5 rounded accent-primary"
            />
            <Gamepad2 className="size-3" />
            Esports
          </label>
          <label className="flex cursor-pointer items-center gap-1.5">
            <input
              type="checkbox"
              checked={settings.browserNotifications}
              onChange={(e) => updateSettings({ browserNotifications: e.target.checked })}
              className="size-3.5 rounded accent-primary"
            />
            <Bell className="size-3" />
            Notif.
          </label>
          <select
            value={settings.pollIntervalMs}
            onChange={(e) => updateSettings({ pollIntervalMs: Number(e.target.value) })}
            className="rounded-lg border border-border bg-background px-2 py-1 text-xs"
          >
            <option value={30000}>30s</option>
            <option value={60000}>1m</option>
            <option value={120000}>2m</option>
            <option value={300000}>5m</option>
          </select>
        </div>

        {notificationPermission !== 'granted' && settings.browserNotifications && (
          <Button variant="secondary" size="sm" onClick={requestNotificationPermission}>
            {notificationPermission === 'denied' ? (
              <>
                <BellOff className="size-3.5" />
                Denegado
              </>
            ) : (
              <>
                <Bell className="size-3.5" />
                Permiso
              </>
            )}
          </Button>
        )}

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

        <div className="flex w-full flex-wrap items-center gap-2 border-t border-border/30 pt-2 text-[11px] lg:w-auto lg:border-0 lg:pt-0">
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 ${
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
            {settings.monitoring ? 'Activo' : 'Pausado'}
          </span>
          <span className="text-muted-foreground">Rev. {formatDateTime(lastCheckedAt)}</span>
          {lastError && <span className="text-destructive">{lastError}</span>}
          {arbitrageOps.length > 0 && (
            <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400">
              <Zap className="size-3" />
              {arbitrageOps.length} arbitrajes
            </span>
          )}
        </div>
      </header>

      {/* Tabs horizontales */}
      <div className="flex shrink-0 gap-1 border-b border-border/40 px-4">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
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

      {/* Cuerpo: lista horizontal + panel detalle */}
      <div className="flex min-h-0 flex-1">
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden p-4">
          {activeTab === 'alerts' && (
            <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden">
              <HorizontalStrip
                rowHeight="sm"
                title="Alertas recientes"
                icon={<BellRing className="size-3.5" />}
                action={
                  alerts.length > 0 ? (
                    <div className="flex shrink-0 gap-1">
                      <Button variant="ghost" size="sm" onClick={markAllRead}>
                        <CheckCheck className="size-3.5" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={clearAlerts}>
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  ) : undefined
                }
                empty={
                  <div className="flex h-[76px] flex-col items-center justify-center rounded-xl border border-dashed border-border/50 text-center">
                    <BellRing className="mb-1 size-5 text-muted-foreground/40" />
                    <p className="text-xs text-muted-foreground">Sin alertas todavía</p>
                  </div>
                }
              >
                {alerts.map((alert) => (
                  <AlertCard
                    key={alert.id}
                    alert={alert}
                    selected={isSelected(alert.eventId, alert.category)}
                    onSelect={() =>
                      selectByIds(alert.eventId, alert.category, {
                        title: alert.title,
                        slug: alert.slug,
                        image: alert.image,
                        createdAt: alert.createdAt,
                      })
                    }
                    onRead={() => markAlertRead(alert.id)}
                  />
                ))}
              </HorizontalStrip>

              <HorizontalStrip
                rowHeight="md"
                className="min-h-0 flex-1"
                title="Arbitraje entre equipos"
                icon={<Zap className="size-3.5 text-amber-500" />}
                action={
                  <div className="relative shrink-0">
                    <Search className="pointer-events-none absolute left-2 top-1/2 size-3 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="search"
                      value={arbQuery}
                      onChange={(e) => setArbQuery(e.target.value)}
                      placeholder="Buscar equipo..."
                      className="w-36 rounded-lg border border-border bg-background py-1 pl-7 pr-2 text-xs"
                    />
                  </div>
                }
                empty={
                  <div className="flex h-[152px] flex-col items-center justify-center rounded-xl border border-dashed border-amber-500/20 bg-amber-500/5 text-center">
                    <Zap className="mb-2 size-8 text-amber-500/40" />
                    <p className="text-xs text-muted-foreground">
                      {isLoading
                        ? 'Analizando mercados...'
                        : arbQuery
                          ? 'Sin coincidencias'
                          : 'No hay arbitraje ahora (suma < 100%)'}
                    </p>
                  </div>
                }
              >
                {filteredArb.map((op) => (
                  <ArbitrageCard
                    key={`${op.category}:${op.marketId}`}
                    op={op}
                    selected={isSelected(op.eventId, op.category)}
                    onSelect={() => selectArbitrage(op)}
                  />
                ))}
              </HorizontalStrip>
            </div>
          )}

          {(activeTab === 'sports' || activeTab === 'esports') && (
            <HorizontalStrip
              rowHeight="md"
              className="min-h-0 flex-1"
              title={activeTab === 'sports' ? 'Apuestas deportivas' : 'Apuestas esports'}
              icon={
                activeTab === 'sports' ? (
                  <Trophy className="size-3.5" />
                ) : (
                  <Gamepad2 className="size-3.5" />
                )
              }
              empty={
                <div className="flex h-[152px] w-full items-center justify-center gap-3 rounded-xl border border-dashed border-border/50">
                  <EmptyCategory
                    label={activeTab === 'sports' ? 'deportes' : 'esports'}
                    loading={isLoading}
                  />
                </div>
              }
            >
              {latestEvents[activeTab].map((event) => (
                <EventCard
                  key={event.id}
                  event={event}
                  category={activeTab}
                  isNew={recentAlertIds.has(`${activeTab}:${event.id}`)}
                  selected={isSelected(event.id, activeTab)}
                  onSelect={() => selectEvent(event, activeTab)}
                />
              ))}
            </HorizontalStrip>
          )}
        </div>

        {selected && (
          <EventDetailPanel
            event={selected.event}
            category={selected.category}
            onClose={() => setSelected(null)}
          />
        )}
      </div>
    </div>
  )
}

function EmptyCategory({ label, loading }: { label: string; loading: boolean }) {
  return (
    <div className="flex flex-1 items-center justify-center gap-3 rounded-xl border border-dashed border-border/50 py-12">
      {loading ? (
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      ) : (
        <Trophy className="size-6 text-muted-foreground/40" />
      )}
      <p className="text-sm text-muted-foreground">
        {loading ? `Cargando ${label}...` : `No hay apuestas recientes de ${label}`}
      </p>
    </div>
  )
}
