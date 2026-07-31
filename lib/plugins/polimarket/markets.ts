import type { PolymarketMarket } from './types'

export type ParsedOutcome = {
  name: string
  price: number
  impliedPct: number
}

export type ParsedMarket = {
  id: string
  question: string
  slug: string
  outcomes: ParsedOutcome[]
  volume: number
  liquidity: number
  totalPrice: number
  profitPct: number
  hasArbitrage: boolean
}

const MIN_ARB_PROFIT_PCT = 0.5

export function parseMarket(market: PolymarketMarket): ParsedMarket | null {
  let prices: string[] = []
  let outcomeNames: string[] = []

  try {
    if (market.outcomePrices) prices = JSON.parse(market.outcomePrices) as string[]
    if (market.outcomes) outcomeNames = JSON.parse(market.outcomes) as string[]
  } catch {
    return null
  }

  if (prices.length < 2 || outcomeNames.length < 2) return null
  if (prices.length !== outcomeNames.length) return null

  const outcomes: ParsedOutcome[] = outcomeNames.map((name, i) => {
    const price = Number(prices[i]) || 0
    return {
      name,
      price,
      impliedPct: Math.round(price * 1000) / 10,
    }
  })

  const totalPrice = outcomes.reduce((sum, o) => sum + o.price, 0)
  const profitPct = totalPrice < 1 ? (1 - totalPrice) * 100 : 0
  const hasArbitrage =
    outcomes.length === 2 && totalPrice > 0 && profitPct >= MIN_ARB_PROFIT_PCT

  return {
    id: market.id,
    question: market.question,
    slug: market.slug,
    outcomes,
    volume: Number(market.volume) || 0,
    liquidity: Number(market.liquidity) || 0,
    totalPrice,
    profitPct: Math.round(profitPct * 100) / 100,
    hasArbitrage,
  }
}

export function formatUsd(value: number) {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`
  return `$${value.toFixed(0)}`
}
