import { parseMarket } from './markets'
import type { ArbitrageOpportunity, PolymarketCategory, PolymarketEvent } from './types'

export function findArbitrageOpportunities(
  events: PolymarketEvent[],
  category: PolymarketCategory,
): ArbitrageOpportunity[] {
  const opportunities: ArbitrageOpportunity[] = []

  for (const event of events) {
    for (const rawMarket of event.markets ?? []) {
      const market = parseMarket(rawMarket)
      if (!market?.hasArbitrage) continue

      opportunities.push({
        eventId: event.id,
        eventTitle: event.title,
        eventSlug: event.slug,
        category,
        image: event.image || event.icon,
        marketId: market.id,
        marketQuestion: market.question,
        outcomes: market.outcomes,
        profitPct: market.profitPct,
        totalCost: market.totalPrice,
        volume: market.volume,
        liquidity: market.liquidity,
      })
    }
  }

  return opportunities.sort((a, b) => b.profitPct - a.profitPct)
}

export function findAllArbitrage(
  data: Record<PolymarketCategory, PolymarketEvent[]>,
): ArbitrageOpportunity[] {
  return [
    ...findArbitrageOpportunities(data.sports, 'sports'),
    ...findArbitrageOpportunities(data.esports, 'esports'),
  ].sort((a, b) => b.profitPct - a.profitPct)
}

export function filterArbitrage(
  opportunities: ArbitrageOpportunity[],
  query: string,
): ArbitrageOpportunity[] {
  const q = query.trim().toLowerCase()
  if (!q) return opportunities

  return opportunities.filter((op) => {
    const haystack = [
      op.eventTitle,
      op.marketQuestion,
      ...op.outcomes.map((o) => o.name),
    ]
      .join(' ')
      .toLowerCase()
    return haystack.includes(q)
  })
}
