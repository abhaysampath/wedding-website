import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../firebase', () => ({
  getIdToken: vi.fn(() => Promise.resolve(null)),
}))

import { writeToSheet, mintServerSession, clearServerSession } from './sheet-write'

describe('writeToSheet', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('returns true and skips fetch when guestId is empty', async () => {
    const result = await writeToSheet('', { phone: '555' })
    expect(result).toBe(true)
  })

  it('throws with server error message on non-OK response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve({
          ok: false,
          status: 401,
          json: () => Promise.resolve({ error: 'Authentication required' }),
        }),
      ),
    )
    await expect(writeToSheet('g001', { phone: '555' })).rejects.toThrow('Authentication required')
  })

  it('returns true when server reports updates', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ updated: 3 }),
        }),
      ),
    )
    const result = await writeToSheet('g001', { phone: '555', email: 'a@b.com' })
    expect(result).toBe(true)
  })

  it('returns false when server reports 0 updates (column missing)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ updated: 0 }),
        }),
      ),
    )
    const result = await writeToSheet('g001', { phone: '555' })
    expect(result).toBe(false)
  })
})

describe('mintServerSession', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('returns ok:false when guestId is empty', async () => {
    const result = await mintServerSession('')
    expect(result.ok).toBe(false)
  })

  it('returns ok:true on success', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ ok: true, guestId: 'g001', role: 'invited_guest' }),
        }),
      ),
    )
    const result = await mintServerSession('g001')
    expect(result.ok).toBe(true)
    expect(result.guestId).toBe('g001')
  })

  it('returns ok:false with error on failure', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve({
          ok: false,
          status: 503,
          json: () => Promise.resolve({ error: 'Sheet not configured' }),
        }),
      ),
    )
    const result = await mintServerSession('g001')
    expect(result.ok).toBe(false)
    expect(result.status).toBe(503)
    expect(result.error).toBe('Sheet not configured')
  })
})
