import { describe, it, expect, beforeEach } from 'vitest'
import {
  checkRateLimit,
  applyLimit,
  LIMITS,
  _resetBucketsForTesting,
} from './_rate-limit.js'

function makeReq({ ip = '1.2.3.4' } = {}) {
  return { headers: { 'x-forwarded-for': ip } }
}

function makeRes() {
  const res = {
    statusCode: 200,
    headers: {},
    body: null,
    setHeader(k, v) {
      this.headers[k] = v
    },
    status(code) {
      this.statusCode = code
      return this
    },
    json(payload) {
      this.body = payload
      return this
    },
    end() {},
  }
  return res
}

describe('checkRateLimit', () => {
  beforeEach(() => {
    _resetBucketsForTesting()
  })

  it('allows the first request', () => {
    const result = checkRateLimit(makeReq(), 'content', 5, 1000)
    expect(result.allowed).toBe(true)
    expect(result.remaining).toBe(4)
  })

  it('blocks after the limit is reached', () => {
    for (let i = 0; i < 5; i++) {
      checkRateLimit(makeReq(), 'content', 5, 1000)
    }
    const result = checkRateLimit(makeReq(), 'content', 5, 1000)
    expect(result.allowed).toBe(false)
    expect(result.remaining).toBe(0)
    expect(result.resetMs).toBeGreaterThan(0)
  })

  it('tracks IPs independently', () => {
    for (let i = 0; i < 5; i++) {
      checkRateLimit(makeReq({ ip: '1.1.1.1' }), 'content', 5, 1000)
    }
    const result = checkRateLimit(makeReq({ ip: '2.2.2.2' }), 'content', 5, 1000)
    expect(result.allowed).toBe(true)
  })

  it('tracks endpoints independently for the same IP', () => {
    for (let i = 0; i < 5; i++) {
      checkRateLimit(makeReq(), 'contact', 5, 1000)
    }
    const result = checkRateLimit(makeReq(), 'content', 5, 1000)
    expect(result.allowed).toBe(true)
  })

  it('reads x-real-ip as a fallback', () => {
    const req = { headers: { 'x-real-ip': '5.5.5.5' } }
    const result = checkRateLimit(req, 'content', 5, 1000)
    expect(result.allowed).toBe(true)
  })

  it('buckets unknown IPs together when no IP header is present', () => {
    const req = { headers: {} }
    for (let i = 0; i < 5; i++) {
      checkRateLimit(req, 'content', 5, 1000)
    }
    const result = checkRateLimit(req, 'content', 5, 1000)
    expect(result.allowed).toBe(false)
  })

  it('resets after the window passes', () => {
    const req = makeReq()
    for (let i = 0; i < 5; i++) {
      checkRateLimit(req, 'content', 5, 1)
    }
    const blocked = checkRateLimit(req, 'content', 5, 1)
    expect(blocked.allowed).toBe(false)
    return new Promise(resolve => {
      setTimeout(() => {
        const fresh = checkRateLimit(req, 'content', 5, 1)
        expect(fresh.allowed).toBe(true)
        resolve()
      }, 10)
    })
  })
})

describe('applyLimit', () => {
  beforeEach(() => {
    _resetBucketsForTesting()
  })

  it('returns null and sets X-RateLimit headers when allowed', () => {
    const res = makeRes()
    const result = applyLimit(makeReq(), res, 'content')
    expect(result).toBeNull()
    expect(res.headers['X-RateLimit-Limit']).toBe(String(LIMITS.content.limit))
    expect(res.headers['X-RateLimit-Remaining']).toBe(String(LIMITS.content.limit - 1))
  })

  it('returns a 429 when over the limit', () => {
    for (let i = 0; i < LIMITS.contact.limit; i++) {
      applyLimit(makeReq(), makeRes(), 'contact')
    }
    const res = makeRes()
    const result = applyLimit(makeReq(), res, 'contact')
    expect(result).toBe(res)
    expect(res.statusCode).toBe(429)
    expect(res.body).toEqual({ error: 'Too many requests' })
    expect(res.headers['Retry-After']).toBeDefined()
  })

  it('returns null for an unknown endpoint', () => {
    const res = makeRes()
    const result = applyLimit(makeReq(), res, 'nonexistent')
    expect(result).toBeNull()
  })
})

describe('LIMITS', () => {
  it('matches the v1-suggestions spec', () => {
    expect(LIMITS.contact).toEqual({ limit: 5, windowMs: 60 * 1000 })
    expect(LIMITS['alert-error']).toEqual({ limit: 30, windowMs: 60 * 1000 })
    expect(LIMITS.content).toEqual({ limit: 60, windowMs: 60 * 1000 })
    expect(LIMITS.guest).toEqual({ limit: 10, windowMs: 60 * 1000 })
  })
})
