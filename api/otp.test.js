import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.mock('./_origin.js', () => ({
  isAllowedOrigin: () => true,
}))

vi.mock('./_rate-limit.js', () => ({
  applyLimit: () => null,
}))

import handler from './otp.js'

function makeReq(method, body) {
  return { method, body, headers: {} }
}
function makeRes() {
  const res = {}
  res.status = vi.fn(() => res)
  res.json = vi.fn(() => res)
  return res
}

describe('OTP endpoint', () => {
  beforeEach(() => {})

  it('rejects non-POST methods', async () => {
    const res = makeRes()
    await handler(makeReq('GET'), res)
    expect(res.status).toHaveBeenCalledWith(405)
  })

  it('rejects missing email', async () => {
    const res = makeRes()
    await handler(makeReq('POST', {}), res)
    expect(res.status).toHaveBeenCalledWith(400)
  })

  it('sends a 6-digit code on first request', async () => {
    const res = makeRes()
    await handler(makeReq('POST', { email: 'test@example.com' }), res)
    expect(res.status).toHaveBeenCalledWith(200)
    const body = res.json.mock.calls[0][0]
    expect(body.code).toMatch(/^\d{6}$/)
  })

  it('cooldowns a second send within 5 minutes', async () => {
    await handler(makeReq('POST', { email: 'cooldown@example.com' }), makeRes())
    const res2 = makeRes()
    await handler(makeReq('POST', { email: 'cooldown@example.com' }), res2)
    const body = res2.json.mock.calls[0][0]
    expect(body.cooldown).toBe(true)
    expect(res2.status).toHaveBeenCalledWith(200)
  })

  it('verifies a correct code', async () => {
    const sendRes = makeRes()
    await handler(makeReq('POST', { email: 'verify@example.com' }), sendRes)
    const code = sendRes.json.mock.calls[0][0].code

    const verifyRes = makeRes()
    await handler(makeReq('POST', { email: 'verify@example.com', code }), verifyRes)
    const body = verifyRes.json.mock.calls[0][0]
    expect(body.valid).toBe(true)
  })

  it('rejects an incorrect code', async () => {
    const verifyRes = makeRes()
    await handler(makeReq('POST', { email: 'wrong@example.com', code: '000000' }), verifyRes)
    const body = verifyRes.json.mock.calls[0][0]
    expect(body.valid).toBe(false)
  })

  it('rejects verification when no code was sent', async () => {
    const res = makeRes()
    await handler(makeReq('POST', { email: 'never@example.com', code: '123456' }), res)
    const body = res.json.mock.calls[0][0]
    expect(body.valid).toBe(false)
  })

  it('is one-time use — second verify with same code fails', async () => {
    const sendRes = makeRes()
    await handler(makeReq('POST', { email: 'onetime@example.com' }), sendRes)
    const code = sendRes.json.mock.calls[0][0].code

    const first = makeRes()
    await handler(makeReq('POST', { email: 'onetime@example.com', code }), first)
    expect(first.json.mock.calls[0][0].valid).toBe(true)

    const second = makeRes()
    await handler(makeReq('POST', { email: 'onetime@example.com', code }), second)
    expect(second.json.mock.calls[0][0].valid).toBe(false)
  })
})
