import { NextRequest, NextResponse } from 'next/server'

const GAMMA_API = 'https://gamma-api.polymarket.com'

const VALID_CATEGORIES = new Set(['sports', 'esports'])

const TAG_IDS: Record<string, string> = {
  sports: '1',
  esports: '64',
}

export async function GET(req: NextRequest) {
  const category = req.nextUrl.searchParams.get('category') ?? 'sports'
  const limit = Math.min(Number(req.nextUrl.searchParams.get('limit') ?? '25'), 50)

  if (!VALID_CATEGORIES.has(category)) {
    return NextResponse.json({ error: 'Categoría no válida' }, { status: 400 })
  }

  const tagId = TAG_IDS[category]
  const url = new URL(`${GAMMA_API}/events`)
  url.searchParams.set('tag_id', tagId)
  url.searchParams.set('limit', String(limit))
  url.searchParams.set('order', 'createdAt')
  url.searchParams.set('ascending', 'false')
  url.searchParams.set('active', 'true')
  url.searchParams.set('closed', 'false')

  try {
    const res = await fetch(url.toString(), {
      headers: { Accept: 'application/json' },
      next: { revalidate: 0 },
    })

    if (!res.ok) {
      return NextResponse.json(
        { error: `Polymarket API respondió con ${res.status}` },
        { status: res.status },
      )
    }

    const events = await res.json()
    return NextResponse.json({ category, events: Array.isArray(events) ? events : [] })
  } catch (err) {
    console.error('Polymarket proxy error:', err)
    return NextResponse.json({ error: 'No se pudo conectar con Polymarket' }, { status: 502 })
  }
}
