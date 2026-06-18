import { describe, it, expect, beforeEach, vi } from 'vitest'

const mockValuesGet = vi.fn()
const mockBatchUpdate = vi.fn()
const mockSheets = vi.fn(() => ({
  spreadsheets: {
    values: {
      get: mockValuesGet,
      batchUpdate: mockBatchUpdate,
    },
  },
}))
class MockJWT {
  constructor() {
    return {}
  }
}
const mockGoogle = {
  auth: { JWT: MockJWT },
  sheets: mockSheets,
}

vi.mock('googleapis', () => ({
  google: mockGoogle,
}))

const mockGetSession = vi.fn()
vi.mock('../_session.js', async () => {
  const actual = await vi.importActual('../_session.js')
  return {
    ...actual,
    getSession: mockGetSession,
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
  mockValuesGet.mockReset()
  mockBatchUpdate.mockReset()
  mockSheets.mockClear()
  const mod = await import('./[id].js')
  handler = mod.default
})

function makeReq({ id = '1', body = {}, headers = {}, method = 'PATCH' } = {}) {
  return {
    method,
    query: { id },
    url: `/api/guest/${id}`,
    headers,
    body,
  }
}

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

const GUESTS_HEADERS = [
  'Title',
  'First Name',
  'Middle Initial',
  'Last Name',
  'Relationship',
  'Role',
  'Invited To',
  'Plus One',
  'Email Address',
  'Phone Number',
  'Mailing Address',
  'Dietary Preferences',
  'LastLogin',
  'LastUpdated',
  'FirebaseUID',
  'LoginFailed',
  'US-RSVP',
  'India-RSVP',
]

const colIdx = name => GUESTS_HEADERS.findIndex(h => h === name)

function makeGuestRow({ email = '', role = 'invited_guest', uid = '', phone = '' } = {}) {
  const row = new Array(GUESTS_HEADERS.length).fill('')
  row[colIdx('Email Address')] = email
  row[colIdx('Phone Number')] = phone
  row[colIdx('Role')] = role
  row[colIdx('FirebaseUID')] = uid
  return row
}

describe('PATCH /api/guest/:id', () => {
  it('rejects non-PATCH methods', async () => {
    const res = makeRes()
    await handler(makeReq({ method: 'GET' }), res)
    expect(res.statusCode).toBe(405)
  })

  it('rejects when session is missing', async () => {
    mockGetSession.mockResolvedValue(null)
    const res = makeRes()
    await handler(makeReq(), res)
    expect(res.statusCode).toBe(401)
    expect(res.body).toEqual({ error: 'Authentication required' })
  })

  it('rejects when Firebase env is missing but Bearer token sent', async () => {
    mockGetSession.mockResolvedValue({ kind: 'unconfigured' })
    const res = makeRes()
    await handler(makeReq({ headers: { authorization: 'Bearer x.y.z' } }), res)
    expect(res.statusCode).toBe(503)
  })

  it('rejects invalid row index', async () => {
    mockGetSession.mockResolvedValue({ kind: 'cookie', guestId: 'g001', role: 'invited_guest' })
    const res = makeRes()
    await handler(makeReq({ id: 'abc' }), res)
    expect(res.statusCode).toBe(400)
  })

  it('returns 404 when target row is empty', async () => {
    mockGetSession.mockResolvedValue({ kind: 'cookie', guestId: 'g005', role: 'invited_guest' })
    mockValuesGet
      .mockResolvedValueOnce({ data: { values: [GUESTS_HEADERS] } })
      .mockResolvedValueOnce({ data: { values: [[]] } })
    const res = makeRes()
    await handler(makeReq({ id: '5' }), res)
    expect(res.statusCode).toBe(404)
  })

  it('allows cookie-based owner to update their own row', async () => {
    mockGetSession.mockResolvedValue({ kind: 'cookie', guestId: 'g005', role: 'invited_guest' })
    const targetRow = makeGuestRow({ email: 'guest@example.com', role: 'invited_guest' })
    mockValuesGet
      .mockResolvedValueOnce({ data: { values: [GUESTS_HEADERS] } })
      .mockResolvedValueOnce({ data: { values: [targetRow] } })
    mockBatchUpdate.mockResolvedValueOnce({})
    const res = makeRes()
    await handler(makeReq({ id: '5', body: { phone: '5551234' } }), res)
    expect(res.statusCode).toBe(200)
    expect(res.body).toEqual({ updated: 1 })
    expect(mockBatchUpdate).toHaveBeenCalledOnce()
  })

  it('forbids cookie-based non-owner non-admin', async () => {
    mockGetSession.mockResolvedValue({ kind: 'cookie', guestId: 'g001', role: 'invited_guest' })
    const targetRow = makeGuestRow({ email: 'other@example.com', role: 'invited_guest' })
    mockValuesGet
      .mockResolvedValueOnce({ data: { values: [GUESTS_HEADERS] } })
      .mockResolvedValueOnce({ data: { values: [targetRow] } })
    const res = makeRes()
    await handler(makeReq({ id: '5', body: { phone: 'x' } }), res)
    expect(res.statusCode).toBe(403)
    expect(mockBatchUpdate).not.toHaveBeenCalled()
  })

  it('allows cookie-based admin to edit another row', async () => {
    mockGetSession.mockResolvedValue({ kind: 'cookie', guestId: 'g001', role: 'bride' })
    const targetRow = makeGuestRow({ email: 'other@example.com', role: 'invited_guest' })
    mockValuesGet
      .mockResolvedValueOnce({ data: { values: [GUESTS_HEADERS] } })
      .mockResolvedValueOnce({ data: { values: [targetRow] } })
    mockBatchUpdate.mockResolvedValueOnce({})
    const res = makeRes()
    await handler(makeReq({ id: '5', body: { phone: '5550000' } }), res)
    expect(res.statusCode).toBe(200)
  })

  it('allows Firebase session by matching email', async () => {
    mockGetSession.mockResolvedValue({
      kind: 'firebase',
      uid: 'uid-abc',
      email: 'me@example.com',
      emailVerified: true,
    })
    const targetRow = makeGuestRow({ email: 'me@example.com', role: 'invited_guest' })
    mockValuesGet
      .mockResolvedValueOnce({ data: { values: [GUESTS_HEADERS] } })
      .mockResolvedValueOnce({ data: { values: [targetRow] } })
    mockBatchUpdate.mockResolvedValueOnce({})
    const res = makeRes()
    await handler(makeReq({ id: '3', body: { address: '123 Main' } }), res)
    expect(res.statusCode).toBe(200)
  })

  it('allows Firebase session by matching FirebaseUID when email is empty', async () => {
    mockGetSession.mockResolvedValue({
      kind: 'firebase',
      uid: 'uid-xyz',
      email: 'me@example.com',
      emailVerified: true,
    })
    const targetRow = makeGuestRow({ role: 'bride', uid: 'uid-xyz' })
    mockValuesGet
      .mockResolvedValueOnce({ data: { values: [GUESTS_HEADERS] } })
      .mockResolvedValueOnce({ data: { values: [targetRow] } })
    mockBatchUpdate.mockResolvedValueOnce({})
    const res = makeRes()
    await handler(makeReq({ id: '1', body: { phone: '555' } }), res)
    expect(res.statusCode).toBe(200)
  })

  it('allows Firebase session via admin role when email does not match', async () => {
    mockGetSession.mockResolvedValue({
      kind: 'firebase',
      uid: 'uid-groom',
      email: 'groom@example.com',
      emailVerified: true,
    })
    const targetRow = makeGuestRow({ email: 'other@example.com', role: 'invited_guest' })
    const groomRow = makeGuestRow({ email: 'groom@example.com', role: 'Groom' })
    mockValuesGet
      .mockResolvedValueOnce({ data: { values: [GUESTS_HEADERS] } })
      .mockResolvedValueOnce({ data: { values: [targetRow] } })
      .mockResolvedValueOnce({ data: { values: [groomRow] } })
    mockBatchUpdate.mockResolvedValueOnce({})
    const res = makeRes()
    await handler(makeReq({ id: '5', body: { phone: '555' } }), res)
    expect(res.statusCode).toBe(200)
  })

  it('forbids Firebase session when no ownership or admin match', async () => {
    mockGetSession.mockResolvedValue({
      kind: 'firebase',
      uid: 'uid-1',
      email: 'invited@example.com',
      emailVerified: true,
    })
    const targetRow = makeGuestRow({ email: 'other@example.com', role: 'invited_guest' })
    const userRow = makeGuestRow({ email: 'invited@example.com', role: 'Br-Family' })
    mockValuesGet
      .mockResolvedValueOnce({ data: { values: [GUESTS_HEADERS] } })
      .mockResolvedValueOnce({ data: { values: [targetRow] } })
      .mockResolvedValueOnce({ data: { values: [userRow] } })
    const res = makeRes()
    await handler(makeReq({ id: '5', body: { phone: 'x' } }), res)
    expect(res.statusCode).toBe(403)
  })

  it('auto-writes the FirebaseUID for a Firebase owner on first contact', async () => {
    mockGetSession.mockResolvedValue({
      kind: 'firebase',
      uid: 'uid-newuser',
      email: 'new@example.com',
      emailVerified: true,
    })
    const targetRow = makeGuestRow({ email: 'new@example.com', role: 'invited_guest' })
    mockValuesGet
      .mockResolvedValueOnce({ data: { values: [GUESTS_HEADERS] } })
      .mockResolvedValueOnce({ data: { values: [targetRow] } })
    mockBatchUpdate.mockResolvedValueOnce({})
    const res = makeRes()
    await handler(makeReq({ id: '4', body: { phone: '555' } }), res)
    expect(res.statusCode).toBe(200)
    const arg = mockBatchUpdate.mock.calls[0][0]
    const data = arg.requestBody.data
    const uidUpdate = data.find(d => d.values[0][0] === 'uid-newuser')
    expect(uidUpdate).toBeDefined()
    expect(uidUpdate.range).toMatch(/O5$/)
  })

  it('does not rewrite FirebaseUID if it already matches', async () => {
    mockGetSession.mockResolvedValue({
      kind: 'firebase',
      uid: 'uid-same',
      email: 'me@example.com',
      emailVerified: true,
    })
    const targetRow = makeGuestRow({
      email: 'me@example.com',
      role: 'invited_guest',
      uid: 'uid-same',
    })
    mockValuesGet
      .mockResolvedValueOnce({ data: { values: [GUESTS_HEADERS] } })
      .mockResolvedValueOnce({ data: { values: [targetRow] } })
    mockBatchUpdate.mockResolvedValueOnce({})
    const res = makeRes()
    await handler(makeReq({ id: '3', body: { phone: '555' } }), res)
    expect(res.statusCode).toBe(200)
    const arg = mockBatchUpdate.mock.calls[0][0]
    const ranges = arg.requestBody.data.map(d => d.range)
    expect(ranges.some(r => r.includes('FirebaseUID'))).toBe(false)
  })

  it('ignores unknown / disallowed fields in the body', async () => {
    mockGetSession.mockResolvedValue({ kind: 'cookie', guestId: 'g001', role: 'invited_guest' })
    const targetRow = makeGuestRow({ role: 'invited_guest' })
    mockValuesGet
      .mockResolvedValueOnce({ data: { values: [GUESTS_HEADERS] } })
      .mockResolvedValueOnce({ data: { values: [targetRow] } })
    mockBatchUpdate.mockResolvedValueOnce({})
    const res = makeRes()
    await handler(
      makeReq({ id: '1', body: { role: 'bride', firebaseUid: 'forged', phone: '555' } }),
      res,
    )
    expect(res.statusCode).toBe(200)
    const arg = mockBatchUpdate.mock.calls[0][0]
    const data = arg.requestBody.data
    expect(data).toHaveLength(1)
    expect(data[0].values).toEqual([['555']])
  })

  it('returns 200 with updated: 0 when no fields would change', async () => {
    mockGetSession.mockResolvedValue({ kind: 'cookie', guestId: 'g001', role: 'invited_guest' })
    const targetRow = makeGuestRow({ role: 'invited_guest' })
    mockValuesGet
      .mockResolvedValueOnce({ data: { values: [GUESTS_HEADERS] } })
      .mockResolvedValueOnce({ data: { values: [targetRow] } })
    const res = makeRes()
    await handler(makeReq({ id: '1', body: {} }), res)
    expect(res.statusCode).toBe(200)
    expect(res.body).toEqual({ updated: 0 })
    expect(mockBatchUpdate).not.toHaveBeenCalled()
  })

  it('caches the column map across requests (reads A1:Z1 once)', async () => {
    mockGetSession.mockResolvedValue({ kind: 'cookie', guestId: 'g001', role: 'invited_guest' })
    const targetRow = makeGuestRow({ role: 'invited_guest' })
    mockValuesGet
      .mockResolvedValueOnce({ data: { values: [GUESTS_HEADERS] } })
      .mockResolvedValueOnce({ data: { values: [targetRow] } })
    mockBatchUpdate.mockResolvedValue({})
    const res1 = makeRes()
    await handler(makeReq({ id: '1', body: { phone: '1' } }), res1)
    const res2 = makeRes()
    await handler(makeReq({ id: '2', body: { phone: '2' } }), res2)
    const headerReads = mockValuesGet.mock.calls.filter(([arg]) => arg.range?.endsWith('A1:Z1'))
    expect(headerReads.length).toBe(1)
  })
})
