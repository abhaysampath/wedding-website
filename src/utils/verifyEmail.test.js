import { vi, describe, it, expect, beforeAll, afterAll } from 'vitest'
import { generateCode, verifyCode, sendVerificationCode } from './verifyEmail'

// Set EmailJS config to empty so sendVerificationCode skips the emailjs branch
vi.mock('../config', () => ({
  default: {
    debug: false,
    site: { coupleNames: { bride: 'Rebecca', groom: 'Abhay' } },
    sheets: { columns: {} },
    firebase: { apiKey: '', authDomain: '', projectId: '' },
    emailjs: { serviceId: '', templateId: '', publicKey: '' },
    images: {
      hero: { dir: '/jpg/home/', slides: [], interval: 10000, personalized: {} },
      ourStory: { dir: '/jpg/vert/', slides: [] },
      gallery: { home: [], gallery: [], vert: [] },
    },
  },
}))

beforeAll(() => {
  const store = {}
  globalThis.sessionStorage = {
    getItem: (key) => store[key] ?? null,
    setItem: (key, val) => { store[key] = val },
    removeItem: (key) => { delete store[key] },
    clear: () => { Object.keys(store).forEach(k => delete store[k]) },
  }
  globalThis.location = { origin: 'http://localhost', pathname: '/' }
  globalThis.window = { __emailCode: undefined, location: globalThis.location }
})

afterAll(() => {
  globalThis.sessionStorage = undefined
  globalThis.window = undefined
})

describe('generateCode', () => {
  it('returns a 6-digit string', () => {
    const code = generateCode()
    expect(code).toMatch(/^\d{6}$/)
  })

  it('returns different codes on successive calls', () => {
    const a = generateCode()
    const b = generateCode()
    expect(a).not.toBe(b)
  })
})

describe('verifyCode', () => {
  it('returns true after sendVerificationCode sets the code', async () => {
    await sendVerificationCode('test@example.com', 'Test User')
    const code = globalThis.sessionStorage.getItem('pending_email_code')
    expect(verifyCode(code)).toBe(true)
  })

  it('verifies from sessionStorage fallback', async () => {
    await sendVerificationCode('test2@example.com', 'Test User 2')
    const stored = globalThis.sessionStorage.getItem('pending_email_code')
    expect(stored).toMatch(/^\d{6}$/)
    expect(verifyCode(stored)).toBe(true)
  })

  it('returns false for an incorrect code', async () => {
    await sendVerificationCode('test3@example.com', 'Test User 3')
    expect(verifyCode('000000')).toBe(false)
  })

  it('clears the pending code after successful verification', async () => {
    await sendVerificationCode('test4@example.com', 'Test User 4')
    const code = globalThis.sessionStorage.getItem('pending_email_code')
    verifyCode(code)
    expect(verifyCode(code)).toBe(false)
  })
})
