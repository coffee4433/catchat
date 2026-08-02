import { NextRequest, NextResponse } from 'next/server'

const BASE = 'https://polymarket.com'

const BLOCKED_HEADERS = [
  'content-security-policy',
  'x-frame-options',
  'content-security-policy-report-only',
]

function stripRestrictiveCsp(csp: string | null): string | null {
  if (!csp) return null
  const directives = csp.split(';')
  return directives
    .map((d) => d.trim())
    .filter((d) => d && !d.startsWith('frame-ancestors'))
    .join('; ') || null
}

function rewriteHtmlUrls(html: string, baseUrl: string): string {
  const base = new URL(baseUrl).origin
  return html.replace(
    /(href|src|action|srcset|data-src|poster|content)\s*=\s*(['"])(.*?)\2/gi,
    (match, attr: string, quote: string, value: string) => {
      if (!value || value.startsWith('http') || value.startsWith('data:') || value.startsWith('blob:')) {
        return match
      }
      if (value.startsWith('//')) {
        return `${attr}=${quote}${base}${value}${quote}`
      }
      if (value.startsWith('/')) {
        return `${attr}=${quote}${base}${value}${quote}`
      }
      const resolved = new URL(value, baseUrl).href
      return `${attr}=${quote}${resolved}${quote}`
    },
  )
}

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url') ?? '/'

  const target = url.startsWith('/') ? `${BASE}${url}` : url

  let parsed: URL
  try {
    parsed = new URL(target)
  } catch {
    return NextResponse.json({ error: 'URL no válida' }, { status: 400 })
  }

  if (parsed.hostname !== 'polymarket.com') {
    return NextResponse.json({ error: 'Dominio no permitido' }, { status: 403 })
  }

  try {
    const upstream = await fetch(parsed.toString(), {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml',
      },
      redirect: 'follow',
      cache: 'no-store',
    })

    const contentType = upstream.headers.get('content-type') ?? ''
    const isHtml = contentType.includes('text/html')

    const resHeaders = new Headers()
    upstream.headers.forEach((value, key) => {
      const lower = key.toLowerCase()
      if (BLOCKED_HEADERS.includes(lower)) return
      if (lower === 'content-security-policy') {
        const stripped = stripRestrictiveCsp(value)
        if (stripped) resHeaders.set(key, stripped)
        return
      }
      if (lower === 'content-encoding' || lower === 'content-length') return
      resHeaders.set(key, value)
    })

    resHeaders.set('Cache-Control', 'no-store')
    resHeaders.set('Access-Control-Allow-Origin', '*')

    let body: BodyInit | null
    if (isHtml) {
      let html = await upstream.text()
      html = rewriteHtmlUrls(html, parsed.toString())
      body = html
      if (!resHeaders.has('content-type')) {
        resHeaders.set('content-type', 'text/html; charset=utf-8')
      }
    } else {
      const buf = await upstream.arrayBuffer()
      body = buf
    }

    return new NextResponse(body, {
      status: upstream.status,
      headers: resHeaders,
    })
  } catch (err) {
    console.error('Polymarket iframe proxy error:', err)
    return NextResponse.json({ error: 'No se pudo conectar con Polymarket' }, { status: 502 })
  }
}
