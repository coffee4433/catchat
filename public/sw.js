const CACHE = 'catchat-v2'

// Static assets to pre-cache (DO NOT cache '/' or dynamic HTML to prevent React #419 hydration errors)
const PRECACHE_ASSETS = ['/manifest.json', '/placeholder-logo.png']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE_ASSETS)).then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.map((key) => {
            if (key !== CACHE) {
              return caches.delete(key)
            }
          }),
        ),
      )
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)

  // Skip non-GET requests
  if (event.request.method !== 'GET') return

  // Skip Vercel analytics/insights, Next.js internal routes, API calls, and non-http schemes
  if (
    url.pathname.startsWith('/_vercel') ||
    url.pathname.startsWith('/_next') ||
    url.pathname.startsWith('/api') ||
    !url.protocol.startsWith('http')
  ) {
    return
  }

  // Network-first strategy for navigation / HTML pages to avoid React #419 hydration mismatches
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match(event.request)
      }),
    )
    return
  }

  // Cache-first with network fallback for static assets, with safety catch
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached
      return fetch(event.request).catch((err) => {
        // Graceful error fallback for blocked analytics or network failure
        console.warn('[SW] Fetch failed for:', event.request.url, err)
        return new Response('', { status: 408, statusText: 'Network Error' })
      })
    }),
  )
})
