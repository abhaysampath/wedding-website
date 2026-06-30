const VERSION = '__SW_VERSION__'
const CACHE = 'wedding-static-' + VERSION
const SHELL_CACHE = 'wedding-shell-' + VERSION

// skipWaiting() removed: the new SW waits for all tabs to close before
// activating, so the page never refreshes itself mid-session.
// To force an update, post {type:'SKIP_WAITING'} from the client.
self.addEventListener('install', () => {
  // do nothing — let the new SW enter 'waiting' state
})

self.addEventListener('message', e => {
  if (e.data && e.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== CACHE && k !== SHELL_CACHE)
          .map((k) => caches.delete(k))
      )
    )
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
        .then((res) => {
          const clone = res.clone()
          caches.open(SHELL_CACHE).then((cache) => cache.put(request, clone))
          return res
        })
        .catch(() => caches.match(request).then((cached) => cached || fetch('/')))
    )
    return
  }

  e.respondWith(
    caches
      .match(request)
      .then(
        (cached) =>
          cached ||
          fetch(request).then((res) => {
            const clone = res.clone()
            caches.open(CACHE).then((cache) => cache.put(request, clone))
            return res
          })
      )
      .catch(() => fetch('/'))
  )
})
