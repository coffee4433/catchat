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

const CHART_SCRIPT = `<script>
(function () {
  var GAMMA = 'https://gamma-api.polymarket.com'
  var CLOB = 'https://clob.polymarket.com'
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
    })
  }
  function getSlug() {
    var q = new URLSearchParams(location.search)
    var u = q.get('url') || location.pathname
    var m = String(u).match(/\\/event\\/([^\\/?&#]+)/)
    return m ? decodeURIComponent(m[1]) : null
  }
  function findHost() {
    var c = document.getElementById('group-chart-container')
    if (c) return c
    var h = document.querySelector('div[style*="--chart-height"]')
    if (h) return h
    var btn = document.querySelector('button.trading-button')
    if (btn) {
      var el = btn
      for (var i = 0; i < 8 && el; i++) {
        if (el.querySelector('h3')) return el.parentElement || document.body
        el = el.parentElement
      }
    }
    return document.querySelector('main') || document.body
  }
  function pathFrom(points) {
    var W = 240, H = 70, PAD = 6
    if (!points || points.length < 2) return null
    var vals = points.map(function (pt) { return pt.p })
    var lo = Math.min.apply(null, vals)
    var hi = Math.max.apply(null, vals)
    var range = hi - lo
    var n = points.length
    var d = ''
    for (var i = 0; i < n; i++) {
      var x = PAD + (i / (n - 1)) * (W - 2 * PAD)
      var norm = range === 0 ? 0.5 : (vals[i] - lo) / range
      var y = H - PAD - norm * (H - 2 * PAD)
      d += (i === 0 ? 'M' : 'L') + x.toFixed(1) + ' ' + y.toFixed(1) + ' '
    }
    return d
  }
  function changePct(points) {
    if (!points || points.length < 2) return 0
    var first = points[0].p, last = points[points.length - 1].p
    if (!first) return 0
    return ((last - first) / first) * 100
  }
  function icUp() {
    return '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 7l-8.5 8.5-5-5L2 17"/><path d="M16 7h6v6"/></svg>'
  }
  function icDown() {
    return '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 17l-8.5-8.5-5 5L2 7"/><path d="M16 17h6v-6"/></svg>'
  }
  function cardHTML(c) {
    var pct = Math.max(0, Math.min(100, Math.round(c.price * 100)))
    var chg = c.change
    var up = chg >= 0
    var chgTone = up ? '#39D98A' : '#FF6A6A'
    var tone = c.tone
    var c1 = tone === 'blue' ? '#2563EB' : '#FF5B5B'
    var c2 = tone === 'blue' ? '#60A5FA' : '#FF8080'
    var gradId = tone === 'blue' ? 'ccBlueGrad' : 'ccRedGrad'
    var flag = c.logo || c.fallbackLogo || ''
    var svg = c.path ? '<svg viewBox="0 0 240 70" fill="none" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="' + gradId + '" x1="0" x2="1"><stop offset="0%" stop-color="' + c1 + '"/><stop offset="100%" stop-color="' + c2 + '"/></linearGradient></defs><path d="' + c.path + '" stroke="url(#' + gradId + ')" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>' : ''
    return '<div class="cc-card ' + tone + '">' +
      '<div class="cc-glow ' + tone + '"></div>' +
      '<div class="cc-inner">' +
      (flag ? '<img class="cc-flag" src="' + esc(flag) + '" alt="' + esc(c.name) + '"/>' : '<div class="cc-flag cc-flag-empty"></div>') +
      '<div class="cc-text">' +
      '<h3 class="cc-name">' + esc(c.name) + '</h3>' +
      '<div class="cc-pctrow">' +
      '<span class="cc-pct ' + tone + '">' + pct + '%</span>' +
      '<div class="cc-chg" style="color:' + chgTone + '">' + (up ? icUp() : icDown()) + '<span>' + Math.abs(chg).toFixed(1) + '%</span></div>' +
      '</div>' +
      '</div>' +
      (svg ? '<div class="cc-chart">' + svg + '</div>' : '') +
      '</div></div>'
  }
  function buildRoot(cards) {
    var root = document.createElement('div')
    root.id = 'cc-root'
    root.innerHTML = '<div class="cc-grid">' + cards.map(cardHTML).join('') + '</div>'
    return root
  }
  function ensureStyle() {
    if (document.getElementById('cc-style')) return
    var style = document.createElement('style')
    style.id = 'cc-style'
    style.textContent = [
      '.cc-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;background:#121826;padding:14px;border-radius:16px;width:100%;box-sizing:border-box}',
      '.cc-card{position:relative;overflow:hidden;height:108px;width:100%;border-radius:16px;border:1px solid;backdrop-filter:blur(24px)}',
      '.cc-card.blue{border-color:rgba(59,130,246,.5);background:linear-gradient(135deg,#18253E,#1A2238 50%,#20253A)}',
      '.cc-card.red{border-color:rgba(255,80,80,.3);background:linear-gradient(135deg,#2B2233,#32243A 50%,#3A2735)}',
      '.cc-glow{position:absolute;inset:0;opacity:.3;pointer-events:none}',
      '.cc-glow.blue{background:radial-gradient(circle at 0% 50%,rgba(59,130,246,.18),transparent 70%)}',
      '.cc-glow.red{background:radial-gradient(circle at 100% 50%,rgba(255,80,80,.18),transparent 70%)}',
      '.cc-inner{position:relative;display:flex;align-items:center;height:100%;padding:0 20px;box-sizing:border-box}',
      '.cc-flag{width:60px;height:60px;border-radius:9999px;border:2px solid rgba(255,255,255,.2);object-fit:cover;flex:none;background:rgba(255,255,255,.08)}',
      '.cc-flag-empty{flex:none}',
      '.cc-text{margin-left:16px;min-width:0;flex:1}',
      '.cc-name{color:#fff;font-weight:600;font-size:20px;line-height:1;margin:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      '.cc-pctrow{margin-top:12px;display:flex;align-items:center;gap:10px}',
      '.cc-pct{font-size:44px;font-weight:700;line-height:1;letter-spacing:-.025em;font-variant-numeric:tabular-nums}',
      '.cc-pct.blue{color:#3B82F6}',
      '.cc-pct.red{color:#FF4E5E}',
      '.cc-chg{display:flex;align-items:center;gap:4px;font-size:16px;font-weight:500}',
      '.cc-chg svg{width:18px;height:18px;flex:none}',
      '.cc-chart{margin-left:auto;width:190px;height:64px;flex:none}',
      '.cc-chart svg{width:100%;height:100%;display:block}',
    ].join('')
    document.head.appendChild(style)
  }
  function parseJsonArray(s) {
    try { return JSON.parse(s) } catch (e) { return [] }
  }
  function fetchHistory(tokenId) {
    return fetch(CLOB + '/prices-history?interval=1d&fidelity=60&market=' + tokenId)
      .then(function (r) { return r.json() })
      .then(function (j) { return (j && j.history) || [] })
      .catch(function () { return [] })
  }
  function findTeam(teams, ordering) {
    for (var i = 0; i < teams.length; i++) {
      if (teams[i].ordering === ordering) return teams[i]
    }
    return null
  }
  function findMkt(markets, line, teamName) {
    for (var i = 0; i < markets.length; i++) {
      var mm = markets[i].marketMetadata || {}
      if (mm.opticOddsSelectionLine === line) return markets[i]
    }
    for (var j = 0; j < markets.length; j++) {
      var gi = markets[j].groupItemTitle
      if (gi && teamName && gi.toLowerCase() === teamName.toLowerCase()) return markets[j]
    }
    return null
  }
  function tokenIdOf(mkt) {
    var ids = parseJsonArray(mkt.clobTokenIds)
    return ids && ids.length ? String(ids[0]) : null
  }
  function priceOf(mkt) {
    var ps = parseJsonArray(mkt.outcomePrices)
    var p = ps && ps.length ? parseFloat(ps[0]) : null
    if (p == null || isNaN(p)) p = mkt.bestBid != null ? parseFloat(mkt.bestBid) : null
    return p != null ? p : 0
  }
  function buildCards(ev) {
    var teams = ev.teams || []
    var homeTeam = findTeam(teams, 'home')
    var awayTeam = findTeam(teams, 'away')
    if (!homeTeam && teams.length >= 2) homeTeam = teams[0]
    if (!awayTeam && teams.length >= 2) awayTeam = teams[1]
    var homeMkt = findMkt(ev.markets || [], 'home', homeTeam && homeTeam.name)
    var awayMkt = findMkt(ev.markets || [], 'away', awayTeam && awayTeam.name)
    var fallbackLogo = ev.icon || ev.image || ''
    var cards = []
    if (homeMkt) cards.push({ tone: 'blue', name: (homeTeam && homeTeam.name) || (homeMkt.groupItemTitle || 'Home'), logo: homeTeam && homeTeam.logo, fallbackLogo: fallbackLogo, mkt: homeMkt })
    if (awayMkt) cards.push({ tone: 'red', name: (awayTeam && awayTeam.name) || (awayMkt.groupItemTitle || 'Away'), logo: awayTeam && awayTeam.logo, fallbackLogo: fallbackLogo, mkt: awayMkt })
    if (!cards.length) {
      for (var i = 0; i < ev.markets.length && cards.length < 2; i++) {
        cards.push({ tone: i === 0 ? 'blue' : 'red', name: ev.markets[i].groupItemTitle || ev.markets[i].question, logo: '', fallbackLogo: fallbackLogo, mkt: ev.markets[i] })
      }
    }
    return cards
  }
  function loadEvent(slug, host) {
    fetch(GAMMA + '/events?slug=' + encodeURIComponent(slug))
      .then(function (r) { return r.json() })
      .then(function (data) {
        var ev = Array.isArray(data) ? data[0] : data
        if (!ev || !ev.markets || !ev.markets.length) return
        var cards = buildCards(ev)
        if (!cards.length) return
        var proms = cards.map(function (c) {
          var t = tokenIdOf(c.mkt)
          if (!t) return Promise.resolve(c)
          return fetchHistory(t).then(function (pts) {
            c.price = priceOf(c.mkt)
            c.points = pts
            c.path = pathFrom(pts)
            c.change = changePct(pts)
            return c
          })
        })
        Promise.all(proms).then(function () {
          ensureStyle()
          var root = buildRoot(cards)
          var old = document.getElementById('cc-root')
          if (old) old.remove()
          host.insertBefore(root, host.firstChild)
        })
      })
      .catch(function () { /* evento sin datos o red caida; se ignora */ })
  }
  function run() {
    var slug = getSlug()
    if (!slug) return
    var host = findHost()
    if (!host) return
    var existing = document.getElementById('cc-root')
    if (existing && existing._ccSlug === slug && existing._ccHost === host) return
    loadEvent(slug, host)
  }
  function start() {
    run()
    var tries = 0
    var timer = setInterval(function () {
      tries++
      run()
      if (tries > 60) clearInterval(timer)
    }, 1000)
    if (window.MutationObserver) {
      var pending = null
      var mo = new MutationObserver(function () {
        clearTimeout(pending)
        pending = setTimeout(run, 120)
      })
      mo.observe(document.body, { childList: true, subtree: true })
    }
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start)
  } else {
    start()
  }
})();
<\/script>`

const FIX_IMAGES_SCRIPT = `<script>
(function () {
  var PM_ORIGIN = 'https://polymarket.com'
  var CLOB_ORIGIN = 'https://clob.polymarket.com'
  var PROXY_PREFIX = '/api/polimarket/iframe'
  function rebase(pathname) {
    if (pathname.indexOf(PROXY_PREFIX) === 0) return null
    if (pathname === '/prices-history' || pathname.indexOf('/prices-history?') === 0) {
      return CLOB_ORIGIN + pathname
    }
    return PM_ORIGIN + pathname
  }
  var origFetch = window.fetch
  window.fetch = function (input, init) {
    if (typeof input === 'string' && input.indexOf('/') === 0) {
      var r = rebase(input)
      if (r) input = r
    } else if (input instanceof URL && input.origin === location.origin) {
      var p = input.pathname + input.search
      var r2 = rebase(input.pathname)
      if (r2) input = r2 + input.search
    }
    return origFetch.call(this, input, init)
  }
  var origOpen = XMLHttpRequest.prototype.open
  XMLHttpRequest.prototype.open = function (method, url) {
    if (typeof url === 'string' && url.indexOf('/') === 0) {
      var r = rebase(url)
      if (r) url = r
    }
    return origOpen.apply(this, arguments)
  }
  function decodeNextImage(u) {
    if (!u || u.indexOf('/_next/image') !== 0) return null
    var m = u.match(/\\?url=([^&]+)/)
    if (!m) return null
    try {
      var target = decodeURIComponent(m[1])
      if (target.indexOf('://') === -1 && target.charAt(0) === '/') {
        target = PM_ORIGIN + target
      }
      return target
    } catch (e) {
      return null
    }
  }
  function escapeCommas(s) {
    return s.replace(/,/g, '%2C')
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
      return escapeCommas(decoded) + desc
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
  window.addEventListener('load', fixAll)
  setTimeout(fixAll, 1500)
  setTimeout(fixAll, 4000)
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
            return [rewriteUrl(url, baseUrl).replace(/,/g, '%2C'), ...parts].join(' ')
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
      html = html.replace('</head>', `${CHART_SCRIPT}${FIX_IMAGES_SCRIPT}</head>`)
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
