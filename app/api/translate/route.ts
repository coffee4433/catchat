import { NextRequest, NextResponse } from 'next/server'

const DEEPL_API_KEY = process.env.DEEPL_API_KEY || ''
const DEEPL_API_URL = process.env.DEEPL_API_URL || 'https://api-free.deepl.com/v2/translate'

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
      return NextResponse.json(
        { error: `DeepL API error: ${response.status} - ${errorText}` },
        { status: response.status }
      )
    }

    const data = await response.json()
    const translatedText = data.translations?.[0]?.text ?? text

    return NextResponse.json({ translatedText })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json(
      { error: `Translation failed: ${message}` },
      { status: 500 }
    )
  }
}
