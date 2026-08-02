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

const FIX_IMAGES_SCRIPT = `<script>
(function () {
  function decodeNextImage(u) {
    if (!u || u.indexOf('/_next/image') !== 0) return null
    var m = u.match(/\\?url=([^&]+)/)
    if (!m) return null
    try {
      return decodeURIComponent(m[1])
    } catch (e) {
      return null
    }
  }
  function fixCandidate(c) {
    c = c.trim()
    if (!c) return ''
    var m = c.match(/^(\\S+)(\\s+(\\d+(\\.\\d+)?[wxh]))?$/i)
    if (!m) return ''
    var url = m[1]
    var desc = m[2] || ''
    var decoded = decodeNextImage(url)
    if (decoded) {
      if (decoded.indexOf(' ') !== -1) return ''
      return decoded + desc
    }
    if (url.indexOf(' ') !== -1) return ''
    return c
  }
  function fixSrcset(v) {
    if (!v) return v
    return v
      .split(',')
      .map(fixCandidate)
      .filter(function (x) {
        return x
      })
      .join(', ')
  }
  function fixSrc(u) {
    var decoded = decodeNextImage(u)
    if (decoded && decoded.indexOf(' ') === -1) return decoded
    return u
  }
  function fix(el) {
    if (el.getAttribute('srcset')) {
      var fixed = fixSrcset(el.getAttribute('srcset'))
      if (fixed !== el.getAttribute('srcset')) el.setAttribute('srcset', fixed)
    }
    if (el.tagName === 'IMG' && el.getAttribute('src')) {
      var fixedSrc = fixSrc(el.getAttribute('src'))
      if (fixedSrc !== el.getAttribute('src')) el.setAttribute('src', fixedSrc)
    }
  }
  function fixAll() {
    var els = document.querySelectorAll('img, source')
    for (var i = 0; i < els.length; i++) fix(els[i])
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fixAll)
  } else {
    fixAll()
  }
  var obs = new MutationObserver(function (mut) {
    var dirty = false
    for (var i = 0; i < mut.length; i++) {
      if (mut[i].type === 'childList' && mut[i].addedNodes && mut[i].addedNodes.length) dirty = true
      if (mut[i].type === 'attributes') dirty = true
    }
    if (dirty) fixAll()
  })
  obs.observe(document.documentElement, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ['src', 'srcset'],
  })
})();
<\/script>`

function decodeNextImage(value: string): string | null {
  const m = value.match(/^\/_next\/image[^?]*\?(.*)$/i)
  if (!m) return null
  const query = m[1].replace(/&amp;/g, '&')
  const params = new URLSearchParams(query)
  const target = params.get('url')
  if (!target) return null
  try {
    return decodeURIComponent(target)
  } catch {
    return null
  }
}

function rewriteUrl(value: string, baseUrl: string): string {
  if (!value || value.startsWith('data:') || value.startsWith('blob:')) return value
  const nextImage = decodeNextImage(value)
  let target = nextImage || value
  if (target.startsWith('http')) return target
  const base = new URL(baseUrl).origin
  if (target.startsWith('//')) return `${base}${target}`
  if (target.startsWith('/')) return `${base}${target}`
  return new URL(target, baseUrl).href
}

function rewriteHtmlUrls(html: string, baseUrl: string): string {
  return html.replace(
    /(href|src|action|srcset|data-src|poster)\s*=\s*(['"])(.*?)\2/gi,
    (match, attr: string, quote: string, value: string) => {
      if (attr.toLowerCase() === 'srcset') {
        const rewritten = value
          .split(',')
          .map((candidate) => {
            const parts = candidate.trim().split(/\s+/)
            if (!parts.length) return candidate
            const url = parts.shift()!
            return [rewriteUrl(url, baseUrl), ...parts].join(' ')
          })
          .join(', ')
        return `${attr}=${quote}${rewritten}${quote}`
      }
      return `${attr}=${quote}${rewriteUrl(value, baseUrl)}${quote}`
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
        Referer: 'https://polymarket.com/',
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
      html = html.replace('</head>', `${FIX_IMAGES_SCRIPT}</head>`)
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
