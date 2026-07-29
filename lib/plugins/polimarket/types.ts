export type PolymarketTag = {
  id: string
  label: string
  slug: string
}

export type PolymarketMarket = {
  id: string
  question: string
  slug: string
  outcomePrices?: string
  volume?: string
  liquidity?: string
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
