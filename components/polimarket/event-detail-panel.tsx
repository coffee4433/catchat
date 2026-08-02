'use client'

import React from 'react'
import {
  Calendar,
  Droplets,
  ExternalLink,
  TrendingUp,
  Trophy,
  Gamepad2,
  X,
  Zap,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { parseMarket, formatUsd } from '@/lib/plugins/polimarket/markets'
import {
  CATEGORY_LABELS,
  POLYMARKET_EVENT_URL,
  type PolymarketCategory,
  type PolymarketEvent,
} from '@/lib/plugins/polimarket/types'

function formatDateTime(iso: string | null | undefined) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatRelativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return 'ahora'
  if (mins < 60) return `hace ${mins} min`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `hace ${hours} h`
  return `hace ${Math.floor(hours / 24)} d`
}

type Props = {
  event: PolymarketEvent
  category: PolymarketCategory
  onClose: () => void
}

export function EventDetailPanel({ event, category, onClose }: Props) {
  const [showPolymarket, setShowPolymarket] = React.useState(false)
  const markets = (event.markets ?? [])
    .map(parseMarket)
    .filter((m): m is NonNullable<typeof m> => m !== null)

  const bestArb = markets.reduce<(typeof markets)[0] | null>((best, m) => {
    if (!m.hasArbitrage) return best
    if (!best || m.profitPct > best.profitPct) return m
    return best
  }, null)

  return (
    <aside className="flex h-full w-[min(440px,42vw)] shrink-0 flex-col border-l border-border/40 bg-muted/20">
      <div className="flex items-center gap-2 border-b border-border/40 px-4 py-3">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          {category === 'sports' ? (
            <Trophy className="size-4 shrink-0 text-muted-foreground" />
          ) : (
            <Gamepad2 className="size-4 shrink-0 text-muted-foreground" />
          )}
          <span className="truncate text-sm font-semibold">{CATEGORY_LABELS[category]}</span>
        </div>
        <Button variant="ghost" size="icon-sm" onClick={onClose} title="Cerrar">
          <X className="size-4" />
        </Button>
      </div>

      <div className="thin-scroll flex-1 overflow-y-auto p-4">
        <div className="flex gap-4">
          {event.image ? (
            <img
              src={event.image}
              alt=""
              className="size-20 shrink-0 rounded-xl object-cover"
            />
          ) : (
            <div className="flex size-20 shrink-0 items-center justify-center rounded-xl bg-muted">
              {category === 'sports' ? (
                <Trophy className="size-8 text-muted-foreground" />
              ) : (
                <Gamepad2 className="size-8 text-muted-foreground" />
              )}
            </div>
          )}

          <div className="min-w-0 flex-1">
            <h2 className="text-base font-semibold leading-snug">{event.title}</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Publicado {formatRelativeTime(event.createdAt)}
            </p>
          </div>
        </div>

        {event.description && (
          <p className="mt-4 line-clamp-4 text-sm leading-relaxed text-muted-foreground">
            {event.description.replace(/<[^>]+>/g, '').slice(0, 400)}
          </p>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          {event.volume != null && event.volume > 0 && (
            <StatChip icon={<TrendingUp className="size-3" />} label="Volumen" value={formatUsd(event.volume)} />
          )}
          {event.volume24hr != null && event.volume24hr > 0 && (
            <StatChip icon={<TrendingUp className="size-3" />} label="Vol. 24h" value={formatUsd(event.volume24hr)} />
          )}
          {event.liquidity != null && event.liquidity > 0 && (
            <StatChip icon={<Droplets className="size-3" />} label="Liquidez" value={formatUsd(event.liquidity)} />
          )}
          {event.endDate && (
            <StatChip icon={<Calendar className="size-3" />} label="Cierra" value={formatDateTime(event.endDate)} />
          )}
        </div>

        {bestArb && (
          <div className="mt-4 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-amber-600 dark:text-amber-400">
              <Zap className="size-4" />
              Arbitraje detectado — +{bestArb.profitPct}% margen
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">
              Comprando ambos lados ({bestArb.outcomes.map((o) => o.name).join(' + ')}) por{' '}
              {(bestArb.totalPrice * 100).toFixed(1)}¢ obtienes 100¢ garantizados.
            </p>
          </div>
        )}

        <div className="mt-5">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Mercados ({markets.length})
          </h3>
          <div className="flex flex-col gap-2">
            {markets.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin mercados activos</p>
            ) : (
              markets.map((market) => (
                <MarketBlock key={market.id} market={market} />
              ))
            )}
          </div>
        </div>

        {event.tags && event.tags.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {event.tags.slice(0, 8).map((tag) => (
              <span
                key={tag.id}
                className="rounded-md bg-muted px-2 py-0.5 text-[11px] text-muted-foreground"
              >
                {tag.label}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="border-t border-border/40 p-3">
        <Button
          variant="outline"
          className="w-full"
          onClick={() => setShowPolymarket(true)}
        >
          <ExternalLink className="size-3.5" />
          Abrir en Polymarket
        </Button>
      </div>

      {showPolymarket && (
        <div className="fixed inset-0 z-[80]" role="dialog" aria-modal="true">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowPolymarket(false)}
          />
          <aside className="absolute right-0 top-0 flex h-full w-[min(520px,92vw)] flex-col border-l border-border/40 bg-background shadow-2xl animate-in slide-in-from-right-full duration-300">
            <div className="flex items-center justify-between border-b border-border/40 px-4 py-3">
              <div className="flex min-w-0 items-center gap-2">
                <ExternalLink className="size-4 shrink-0 text-muted-foreground" />
                <span className="truncate text-sm font-semibold">Polymarket</span>
              </div>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setShowPolymarket(false)}
                title="Cerrar"
              >
                <X className="size-4" />
              </Button>
            </div>
            <iframe
              src={`${POLYMARKET_EVENT_URL}/${event.slug}`}
              title="Polymarket"
              className="h-full w-full flex-1 bg-white"
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
            />
          </aside>
        </div>
      )}
    </aside>
  )
}

function StatChip({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string
}) {
  return (
    <div className="inline-flex items-center gap-1.5 rounded-lg border border-border/50 bg-background/60 px-2.5 py-1.5 text-xs">
      <span className="text-muted-foreground">{icon}</span>
      <span className="text-muted-foreground">{label}:</span>
      <span className="font-medium">{value}</span>
    </div>
  )
}

function MarketBlock({ market }: { market: NonNullable<ReturnType<typeof parseMarket>> }) {
  return (
    <div
      className={`rounded-xl border p-3 ${
        market.hasArbitrage
          ? 'border-amber-500/30 bg-amber-500/5'
          : 'border-border/50 bg-background/50'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium leading-snug">{market.question}</p>
        {market.hasArbitrage && (
          <span className="shrink-0 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-600 dark:text-amber-400">
            +{market.profitPct}%
          </span>
        )}
      </div>

      <div className="mt-3 flex flex-col gap-2">
        {market.outcomes.map((outcome) => (
          <div key={outcome.name} className="flex items-center gap-2">
            <span className="w-28 shrink-0 truncate text-xs text-muted-foreground">
              {outcome.name}
            </span>
            <div className="relative h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-muted">
              <div
                className="absolute inset-y-0 left-0 rounded-full bg-primary/70"
                style={{ width: `${Math.min(outcome.impliedPct, 100)}%` }}
              />
            </div>
            <span className="w-12 shrink-0 text-right text-xs font-semibold tabular-nums">
              {outcome.impliedPct}%
            </span>
            <span className="w-14 shrink-0 text-right text-[11px] tabular-nums text-muted-foreground">
              {(outcome.price * 100).toFixed(1)}¢
            </span>
          </div>
        ))}
      </div>

      <div className="mt-2 flex flex-wrap gap-3 text-[11px] text-muted-foreground">
        <span>Suma: {(market.totalPrice * 100).toFixed(1)}¢</span>
        {market.volume > 0 && <span>Vol. {formatUsd(market.volume)}</span>}
        {market.liquidity > 0 && <span>Liq. {formatUsd(market.liquidity)}</span>}
      </div>
    </div>
  )
}
