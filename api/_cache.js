/**
 * In-memory cache with TTL for Sheets API responses.
 *
 * Module-level state. Resets on cold start. Not distributed — for
 * multi-region Vercel, replace with Vercel KV or Edge Config.
 */

const store = new Map()

export function cacheGet(key) {
  const entry = store.get(key)
  if (!entry) return null
  if (Date.now() >= entry.expiresAt) {
    store.delete(key)
    return null
  }
  return entry.value
}

export function cacheSet(key, value, ttlMs) {
  store.set(key, { value, expiresAt: Date.now() + ttlMs })
}

export function cacheInvalidate(key) {
  store.delete(key)
}

export function cacheInvalidatePrefix(prefix) {
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) store.delete(key)
  }
}

export function _clearCacheForTesting() {
  store.clear()
}

export function _cacheSize() {
  return store.size
}
