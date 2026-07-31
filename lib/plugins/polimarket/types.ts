export type PolymarketTag = {
  id: string
  label: string
  slug: string
}

export type PolymarketMarket = {
  id: string
  question: string
  slug: string
  outcomes?: string
  outcomePrices?: string
  volume?: string
  liquidity?: string
  endDate?: string
  active?: boolean
}

export type PolymarketEvent = {
  id: string
  title: string
  slug: string
  description?: string
  image?: string
  icon?: string
  createdAt: string
  startDate?: string
  endDate?: string
  volume?: number
  volume24hr?: number
  liquidity?: number
  tags?: PolymarketTag[]
  markets?: PolymarketMarket[]
}

export type PolymarketCategory = 'sports' | 'esports'

export type PolymarketAlert = {
  id: string
  eventId: string
  title: string
  slug: string
  category: PolymarketCategory
  image?: string
  createdAt: string
  detectedAt: string
  read: boolean
}

export type ArbitrageOpportunity = {
  eventId: string
  eventTitle: string
  eventSlug: string
  category: PolymarketCategory
  image?: string
  marketId: string
  marketQuestion: string
  outcomes: { name: string; price: number; impliedPct: number }[]
  profitPct: number
  totalCost: number
  volume: number
  liquidity: number
}

export type SelectedPolymarketItem = {
  event: PolymarketEvent
  category: PolymarketCategory
}

export type PolymarketSettings = {
  pollIntervalMs: number
  notifySports: boolean
  notifyEsports: boolean
  browserNotifications: boolean
  monitoring: boolean
}

export const DEFAULT_SETTINGS: PolymarketSettings = {
  pollIntervalMs: 60_000,
  notifySports: true,
  notifyEsports: true,
  browserNotifications: true,
  monitoring: true,
}

export const CATEGORY_LABELS: Record<PolymarketCategory, string> = {
  sports: 'Deportes',
  esports: 'Esports',
}

export const POLYMARKET_EVENT_URL = 'https://polymarket.com/event'
