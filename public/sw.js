const VERSION = '__SW_VERSION__'
const CACHE = 'wedding-static-' + VERSION
const SHELL_CACHE = 'wedding-shell-' + VERSION

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== CACHE && k !== SHELL_CACHE)
          .map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (e) => {
  const { request } = e
  const url = new URL(request.url)

  if (url.origin !== location.origin) return

  if (request.method !== 'GET') return

  if (url.pathname.startsWith('/api/')) return

  if (request.mode === 'navigate') {
    e.respondWith(
      fetch(request)
        .then(res => {
          const clone = res.clone()
          caches.open(SHELL_CACHE).then(cache => cache.put(request, clone))
          return res
        })
        .catch(() =>
          caches.match(request).then(cached => cached || caches.match('/'))
        )
    )
    return
  }

  e.respondWith(
    caches
      .match(request)
      .then(
        cached =>
          cached ||
          fetch(request).then(res => {
            const clone = res.clone()
            caches.open(CACHE).then(cache => cache.put(request, clone))
            return res
          })
      )
      .catch(() => caches.match('/'))
  )
})

