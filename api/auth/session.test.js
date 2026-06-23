import { describe, it, expect, beforeEach, vi } from 'vitest'

const mockValuesGet = vi.fn()
const mockSheets = vi.fn(() => ({
  spreadsheets: { values: { get: mockValuesGet } },
}))

class MockJWT {
  constructor() {
    return {}
  }
}

vi.mock('googleapis', () => ({
  google: {
    auth: { JWT: MockJWT },
    sheets: mockSheets,
  },
}))

const mockGetSession = vi.fn()
vi.mock('../_session.js', async () => {
  const actual = await vi.importActual('../_session.js')
  return {
    ...actual,
    getSession: mockGetSession,
    mintSessionToken: vi.fn(() => 'mocked-token'),
    getSessionCookieHeader: vi.fn(
      () => 'wedding_session=mocked-token; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000',
    ),
    getClearCookieHeader: vi.fn(
      () => 'wedding_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0',
    ),
  }
})

vi.mock('../_origin.js', () => ({
  isAllowedOrigin: vi.fn(() => true),
}))

let handler
beforeEach(async () => {
  vi.clearAllMocks()
  vi.resetModules()
  process.env.GOOGLE_SHEET_ID = 'sheet123'
  process.env.GOOGLE_SERVICE_EMAIL = 'svc@test.iam'
  process.env.GOOGLE_PRIVATE_KEY = 'a'.repeat(250)
  process.env.SESSION_SECRET = 'a'.repeat(64)
  mockValuesGet.mockReset()
  mockSheets.mockClear()
  const mod = await import('./session.js')
  handler = mod.default
})

function makeRes() {
  const res = {
    statusCode: 200,
    headers: {},
    body: null,
    status(code) {
      this.statusCode = code
      return this
    },
    json(payload) {
      this.body = payload
      return this
    },
    setHeader(k, v) {
      this.headers[k] = v
    },
    end() {},
  }
  return res
}

const HEADERS = ['Title', 'First Name', 'Last Name', 'Role', 'Email Address']

describe('GET /api/auth/session', () => {
  it('returns authenticated: false when no session', async () => {
    mockGetSession.mockResolvedValue(null)
    const res = makeRes()
    await handler({ method: 'GET' }, res)
    expect(res.statusCode).toBe(200)
    expect(res.body).toEqual({ authenticated: false })
  })

  it('returns session info when authenticated', async () => {
    mockGetSession.mockResolvedValue({ kind: 'cookie', guestId: 'g001', role: 'bride' })
    const res = makeRes()
    await handler({ method: 'GET' }, res)
    expect(res.statusCode).toBe(200)
    expect(res.body.authenticated).toBe(true)
    expect(res.body.kind).toBe('cookie')
  })

  it('returns 200 authenticated=false when no session', async () => {
    mockGetSession.mockResolvedValue(null)
    const res = makeRes()
    await handler({ method: 'GET' }, res)
    expect(res.statusCode).toBe(200)
    expect(res.body).toEqual({ authenticated: false })
  })
})

describe('POST /api/auth/session', () => {
  it('rejects when no guestId', async () => {
    const res = makeRes()
    await handler({ method: 'POST', body: {} }, res)
    expect(res.statusCode).toBe(400)
  })

  it('rejects malformed guestId', async () => {
    const res = makeRes()
    await handler({ method: 'POST', body: { guestId: 'not-a-guest-id' } }, res)
    expect(res.statusCode).toBe(400)
  })

  it('mints a cookie for a valid guest', async () => {
    const row = ['Mx.', 'Abhay', 'Sampath', 'Groom', 'abhay@example.com']
    mockValuesGet
      .mockResolvedValueOnce({ data: { values: [HEADERS] } })
      .mockResolvedValueOnce({ data: { values: [row] } })
    const res = makeRes()
    await handler({ method: 'POST', body: { guestId: 'g002' } }, res)
    expect(res.statusCode).toBe(200)
    expect(res.body).toEqual({ ok: true, guestId: 'g002', role: 'groom' })
    expect(res.headers['Set-Cookie']).toContain('wedding_session=')
  })

  it('returns 404 if the row is empty', async () => {
    mockValuesGet
      .mockResolvedValueOnce({ data: { values: [HEADERS] } })
      .mockResolvedValueOnce({ data: { values: [[]] } })
    const res = makeRes()
    await handler({ method: 'POST', body: { guestId: 'g999' } }, res)
    expect(res.statusCode).toBe(404)
  })
})

describe('DELETE /api/auth/session', () => {
  it('clears the cookie', async () => {
    const res = makeRes()
    await handler({ method: 'DELETE' }, res)
    expect(res.statusCode).toBe(200)
    expect(res.body).toEqual({ ok: true })
    expect(res.headers['Set-Cookie']).toContain('Max-Age=0')
  })
})

describe('method handling', () => {
  it('rejects PUT with 405', async () => {
    const res = makeRes()
    await handler({ method: 'PUT' }, res)
    expect(res.statusCode).toBe(405)
  })
})
