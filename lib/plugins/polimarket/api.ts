import type { PolymarketCategory, PolymarketEvent } from './types'

export async function fetchPolymarketEvents(
  category: PolymarketCategory,
  limit = 25,
): Promise<PolymarketEvent[]> {
  const res = await fetch(
    `/api/polimarket/events?category=${category}&limit=${limit}`,
    { cache: 'no-store' },
  )

  if (!res.ok) {
    throw new Error(`Error al obtener eventos de ${category}`)
  }

  const data = await res.json()
  return Array.isArray(data.events) ? data.events : []
}

export async function fetchAllCategoryEvents(limit = 25): Promise<
  Record<PolymarketCategory, PolymarketEvent[]>
> {
  const [sports, esports] = await Promise.all([
    fetchPolymarketEvents('sports', limit),
    fetchPolymarketEvents('esports', limit),
  ])

  return { sports, esports }
}
