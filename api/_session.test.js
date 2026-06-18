import { describe, it, expect, beforeEach } from 'vitest'
import crypto from 'node:crypto'
import {
  mintSessionToken,
  getSessionCookieHeader,
  getClearCookieHeader,
  getSession,
  isAdminRole,
  ADMIN_ROLES,
  parseCookies,
  sign,
  verifyCookieToken,
} from './_session.js'

describe('mintSessionToken / verifyCookieToken', () => {
  it('round-trips a payload', () => {
    const token = mintSessionToken({ guestId: 'g001', role: 'bride' })
    const payload = verifyCookieToken(token)
    expect(payload).not.toBeNull()
    expect(payload.guestId).toBe('g001')
    expect(payload.role).toBe('bride')
  })

  it('rejects a tampered token', () => {
    const token = mintSessionToken({ guestId: 'g001', role: 'bride' })
    const tampered = token.slice(0, -2) + 'AA'
    expect(verifyCookieToken(tampered)).toBeNull()
  })

  it('rejects a malformed token', () => {
    expect(verifyCookieToken('garbage')).toBeNull()
    expect(verifyCookieToken('a.b')).toBeNull()
    expect(verifyCookieToken('')).toBeNull()
    expect(verifyCookieToken(null)).toBeNull()
    expect(verifyCookieToken(123)).toBeNull()
  })

  it('rejects an expired token', () => {
    const past = Math.floor(Date.now() / 1000) - 60
    const token = sign({ guestId: 'g001', role: 'bride', iat: past - 100, exp: past })
    expect(verifyCookieToken(token)).toBeNull()
  })

  it('throws when guestId is missing', () => {
    expect(() => mintSessionToken({ role: 'bride' })).toThrow()
  })
})

describe('getSessionCookieHeader / getClearCookieHeader', () => {
  it('sets HttpOnly, SameSite=Lax, and Path=/', () => {
    const header = getSessionCookieHeader('tok')
    expect(header).toContain('wedding_session=tok')
    expect(header).toContain('HttpOnly')
    expect(header).toContain('SameSite=Lax')
    expect(header).toContain('Path=/')
    expect(header).toContain('Max-Age=')
  })

  it('omits Secure in non-Vercel environments', () => {
    const original = process.env.VERCEL_ENV
    const originalNode = process.env.NODE_ENV
    delete process.env.VERCEL_ENV
    process.env.NODE_ENV = 'development'
    const header = getSessionCookieHeader('tok')
    expect(header).not.toContain('Secure')
    process.env.VERCEL_ENV = original
    process.env.NODE_ENV = originalNode
  })

  it('includes Secure in Vercel production', () => {
    const original = process.env.VERCEL_ENV
    process.env.VERCEL_ENV = 'production'
    const header = getSessionCookieHeader('tok')
    expect(header).toContain('Secure')
    process.env.VERCEL_ENV = original
  })

  it('clear cookie sets Max-Age=0', () => {
    const header = getClearCookieHeader()
    expect(header).toContain('wedding_session=')
    expect(header).toContain('Max-Age=0')
  })
})

describe('parseCookies', () => {
  it('parses a single cookie', () => {
    expect(parseCookies('a=1')).toEqual({ a: '1' })
  })
  it('parses multiple cookies', () => {
    expect(parseCookies('a=1; b=2')).toEqual({ a: '1', b: '2' })
  })
  it('decodes URL-encoded values', () => {
    expect(parseCookies('a=hello%20world')).toEqual({ a: 'hello world' })
  })
  it('returns empty object for empty header', () => {
    expect(parseCookies('')).toEqual({})
    expect(parseCookies(null)).toEqual({})
    expect(parseCookies(undefined)).toEqual({})
  })
  it('skips malformed entries', () => {
    expect(parseCookies('; a=1; =2; b=3')).toEqual({ a: '1', b: '3' })
  })
})

describe('isAdminRole / ADMIN_ROLES', () => {
  it('recognizes admin roles', () => {
    expect(isAdminRole('bride')).toBe(true)
    expect(isAdminRole('groom')).toBe(true)
    expect(isAdminRole('close_family')).toBe(true)
  })
  it('rejects non-admin roles', () => {
    expect(isAdminRole('invited_guest')).toBe(false)
    expect(isAdminRole('vendor')).toBe(false)
    expect(isAdminRole('')).toBe(false)
    expect(isAdminRole(null)).toBe(false)
  })
  it('exposes the canonical list', () => {
    expect(ADMIN_ROLES).toEqual(['bride', 'groom', 'close_family'])
  })
})

describe('getSession', () => {
  beforeEach(() => {
    delete process.env.FIREBASE_PROJECT_ID
    delete process.env.FIREBASE_CLIENT_EMAIL
    delete process.env.FIREBASE_PRIVATE_KEY
  })

  it('returns null when no auth header and no cookie', async () => {
    expect(await getSession({ headers: {} })).toBeNull()
  })

  it('returns null when only an invalid cookie is present', async () => {
    expect(await getSession({ headers: { cookie: 'wedding_session=garbage' } })).toBeNull()
  })

  it('returns cookie session for a valid HMAC cookie', async () => {
    const token = mintSessionToken({ guestId: 'g007', role: 'close_family' })
    const session = await getSession({ headers: { cookie: `wedding_session=${token}` } })
    expect(session).toEqual({
      kind: 'cookie',
      guestId: 'g007',
      role: 'close_family',
    })
  })

  it('returns unconfigured when Bearer token is sent but Firebase env is missing', async () => {
    const session = await getSession({
      headers: { authorization: 'Bearer some.jwt.token' },
    })
    expect(session).toEqual({ kind: 'unconfigured' })
  })

  it('returns null for an empty Bearer token (falls through to cookie)', async () => {
    const session = await getSession({ headers: { authorization: 'Bearer ' } })
    expect(session).toBeNull()
  })

  it('reads authorization header case-insensitively', async () => {
    const session = await getSession({
      headers: { Authorization: 'Bearer some.jwt.token' },
    })
    expect(session).toEqual({ kind: 'unconfigured' })
  })

  it('falls through to cookie when no Bearer header is present', async () => {
    const token = mintSessionToken({ guestId: 'g008', role: 'invited_guest' })
    const session = await getSession({
      headers: { cookie: `wedding_session=${token}` },
    })
    expect(session).toEqual({
      kind: 'cookie',
      guestId: 'g008',
      role: 'invited_guest',
    })
  })
})

describe('crypto helpers', () => {
  it('sign produces tokens that verifyCookieToken accepts', () => {
    const future = Math.floor(Date.now() / 1000) + 3600
    const tok = sign({ guestId: 'g010', role: 'invited_guest', iat: future - 60, exp: future })
    const payload = verifyCookieToken(tok)
    expect(payload.guestId).toBe('g010')
  })

  it('verifyCookieToken rejects a token signed with a different secret', () => {
    const future = Math.floor(Date.now() / 1000) + 3600
    const fakeSecret = crypto.randomBytes(32).toString('hex')
    const body = Buffer.from(
      JSON.stringify({ guestId: 'g010', role: 'invited_guest', iat: future - 60, exp: future }),
    )
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '')
    const sig = crypto.createHmac('sha256', fakeSecret).update(body).digest()
    const sigStr = sig.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
    const forged = `${body}.${sigStr}`
    expect(verifyCookieToken(forged)).toBeNull()
  })
})
