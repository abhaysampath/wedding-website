/**
 * In-memory fixed-window rate limiter, keyed by client IP and endpoint.
 *
 * Limits are per-IP, per-endpoint. State lives in module scope and resets
 * on cold start. For multi-region Vercel deployments, replace with Vercel KV
 * or Edge Config (see docs/v1-suggestions.md #3).
 *
 * The Vercel serverless runtime gives a fresh module instance on cold start,
 * so this is a best-effort guard against casual abuse, not a hard guarantee.
 * A determined attacker hitting different Lambda instances could bypass it.
 */

const buckets = new Map()

function getClientIp(req) {
  const xff = req.headers?.['x-forwarded-for']
  if (xff) {
    const first = String(xff)
      .split(',')[0]
      .trim()
    if (first) return first
  }
  const xri = req.headers?.['x-real-ip']
  if (xri) return String(xri).trim()
  return 'unknown'
}

/**
 * Check (and increment) the rate-limit bucket for a request.
 * Returns `{ allowed, remaining, resetMs }`.
 * - `allowed=false` means the caller should respond 429.
 * - `resetMs` is how long until the current window expires.
 */
export function checkRateLimit(req, endpoint, limit, windowMs) {
  const ip = getClientIp(req)
  const key = `${endpoint}:${ip}`
  const now = Date.now()
  const bucket = buckets.get(key)

  if (!bucket || now - bucket.windowStart >= windowMs) {
    buckets.set(key, { windowStart: now, count: 1 })
    return { allowed: true, remaining: limit - 1, resetMs: windowMs }
  }

  if (bucket.count >= limit) {
    const resetMs = windowMs - (now - bucket.windowStart)
    return { allowed: false, remaining: 0, resetMs: Math.max(resetMs, 0) }
  }

  bucket.count++
  return {
    allowed: true,
    remaining: limit - bucket.count,
    resetMs: windowMs - (now - bucket.windowStart),
  }
}

/**
 * Convenience wrapper: returns either `null` (allowed) or a Response-like
 * object that the handler can return directly. The caller is responsible
 * for setting the Retry-After header if they want.
 */
export function rateLimitResponse(result) {
  if (result.allowed) return null
  return {
    status: 429,
    headers: { 'Retry-After': String(Math.ceil(result.resetMs / 1000)) },
    body: { error: 'Too many requests' },
  }
}

export const LIMITS = {
  contact: { limit: 5, windowMs: 60 * 1000 },
  'alert-error': { limit: 30, windowMs: 60 * 1000 },
  content: { limit: 60, windowMs: 60 * 1000 },
  guest: { limit: 10, windowMs: 60 * 1000 },
  'auth-session': { limit: 20, windowMs: 60 * 1000 },
  'rsvp-confirmation': { limit: 10, windowMs: 60 * 1000 },
}

export function applyLimit(req, res, endpoint) {
  const cfg = LIMITS[endpoint]
  if (!cfg) return null
  const result = checkRateLimit(req, endpoint, cfg.limit, cfg.windowMs)
  res.setHeader('X-RateLimit-Limit', String(cfg.limit))
  res.setHeader('X-RateLimit-Remaining', String(Math.max(0, result.remaining)))
  res.setHeader('X-RateLimit-Reset', String(Math.ceil(result.resetMs / 1000)))
  if (!result.allowed) {
    res.setHeader('Retry-After', String(Math.ceil(result.resetMs / 1000)))
    return res.status(429).json({ error: 'Too many requests' })
  }
  return null
}

export function _resetBucketsForTesting() {
  buckets.clear()
}

export const _internal = { buckets, getClientIp }
