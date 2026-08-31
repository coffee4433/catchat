import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { createRateLimiter } from '@/lib/rate-limit'
import { headers } from 'next/headers'

const DEEPL_API_KEY = process.env.DEEPL_API_KEY || ''
const DEEPL_API_URL = process.env.DEEPL_API_URL || 'https://api-free.deepl.com/v2/translate'

/** Max characters accepted per request, so the shared DeepL quota can't be drained in one call. */
const MAX_TEXT_LENGTH = 5000

/** Per-user request budget, enforced per server instance. */
const limiter = createRateLimiter({ windowMs: 60_000, maxRequests: 60 })

const LANG_MAP: Record<string, string> = {
  bg: 'BG', cs: 'CS', da: 'DA', de: 'DE',
  el: 'EL', en: 'EN', es: 'ES', et: 'ET',
  fi: 'FI', fr: 'FR', hu: 'HU', id: 'ID',
  it: 'IT', ja: 'JA', ko: 'KO', lt: 'LT',
  lv: 'LV', nb: 'NB', nl: 'NL', pl: 'PL',
  pt: 'PT', ro: 'RO', ru: 'RU', sk: 'SK',
  sl: 'SL', sv: 'SV', tr: 'TR', uk: 'UK',
  zh: 'ZH',
}

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const limit = limiter.check(session.user.id)
  if (!limit.allowed) {
    return NextResponse.json(
      { error: 'Too many translation requests' },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } },
    )
  }

  if (!DEEPL_API_KEY) {
    return NextResponse.json(
      { error: 'DeepL API key not configured' },
      { status: 500 }
    )
  }

  try {
    const { text, target_lang, source_lang } = await request.json()

    if (!text || !target_lang) {
      return NextResponse.json(
        { error: 'Missing text or target_lang' },
        { status: 400 }
      )
    }

    if (typeof text !== 'string' || typeof target_lang !== 'string') {
      return NextResponse.json(
        { error: 'text and target_lang must be strings' },
        { status: 400 }
      )
    }

    if (text.length > MAX_TEXT_LENGTH) {
      return NextResponse.json(
        { error: `Text too long (max ${MAX_TEXT_LENGTH} characters)` },
        { status: 413 }
      )
    }

    const target = LANG_MAP[target_lang] || target_lang.toUpperCase()
    const source = source_lang && source_lang !== 'auto'
      ? LANG_MAP[source_lang] || source_lang.toUpperCase()
      : undefined

    const body: Record<string, unknown> = {
      text: [text],
      target_lang: target,
    }
    if (source) {
      body.source_lang = source
    }

    const response = await fetch(DEEPL_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `DeepL-Auth-Key ${DEEPL_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`DeepL API error ${response.status}: ${errorText}`)
      return NextResponse.json(
        { error: 'Translation provider error' },
        { status: response.status }
      )
    }

    const data = await response.json()
    const translatedText = data.translations?.[0]?.text ?? text

    return NextResponse.json({ translatedText })
  } catch (err) {
    console.error('Translation failed:', err)
    return NextResponse.json(
      { error: 'Translation failed' },
      { status: 500 }
    )
  }
}
