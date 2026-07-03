import { vi, describe, it, expect, beforeEach } from 'vitest'

vi.mock('firebase/app', () => ({
  initializeApp: vi.fn(() => ({})),
}))

const mockSetCustomParameters = vi.fn()

vi.mock('firebase/auth', () => {
  const mockAuth = { settings: { appVerificationDisabledForTesting: false }, currentUser: null }
  return {
    getAuth: vi.fn(() => mockAuth),
    GoogleAuthProvider: vi.fn(function () {
      this.setCustomParameters = mockSetCustomParameters
      return this
    }),
    signInWithPopup: vi.fn(),
    signInAnonymously: vi.fn(() => Promise.resolve({ user: { uid: 'anon' } })),
    browserLocalPersistence: 'local',
    setPersistence: vi.fn(),
  }
})

vi.mock('./config', () => ({
  default: {
    firebase: { apiKey: 'test-key', authDomain: 'test-domain', projectId: 'test-project' },
  },
}))

const originalFetch = global.fetch

describe('firebase with config', () => {
  let fetchMock

  beforeEach(() => {
    fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ sessionInfo: 'verId' }),
    })
    global.fetch = fetchMock
  })

  afterEach(() => {
    global.fetch = originalFetch
  })

  it('signInWithGoogle calls signInWithPopup', async () => {
    const firebaseAuth = await import('firebase/auth')
    const { signInWithGoogle } = await import('./firebase')
    await signInWithGoogle()
    expect(firebaseAuth.signInWithPopup).toHaveBeenCalled()
  })

  it('createAnonymousSession returns user', async () => {
    const { createAnonymousSession } = await import('./firebase')
    const user = await createAnonymousSession()
    expect(user).toBeTruthy()
  })

  it('sendPhoneCode calls the Identity Platform REST API with phone + recaptchaToken (base64)', async () => {
    const { sendPhoneCode } = await import('./firebase')
    const result = await sendPhoneCode('+15555550100')
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toContain('accounts:sendVerificationCode')
    expect(url).toContain('key=test-key')
    const body = JSON.parse(init.body)
    expect(body.phoneNumber).toBe('+15555550100')
    expect(body.recaptchaToken).toMatch(/^03AGdBq25[a-zA-Z0-9+/]+$/)
    expect(body.recaptchaToken.length).toBeGreaterThan(500)
    expect(result.verificationId).toBe('verId')
  })

  it('sendPhoneCode throws friendly error on API failure', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: () => Promise.resolve({ error: { message: 'INVALID_PHONE_NUMBER' } }),
    })
    const { sendPhoneCode } = await import('./firebase')
    await expect(sendPhoneCode('+15555550100')).rejects.toThrow('INVALID_PHONE_NUMBER')
  })

  it('linkPhoneCredential calls the Identity Platform verify endpoint', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ idToken: 'jwt', refreshToken: 'rt' }),
    })
    const { linkPhoneCredential } = await import('./firebase')
    const result = await linkPhoneCredential('verId', '123456')
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toContain('accounts:signInWithPhoneNumber')
    const body = JSON.parse(init.body)
    expect(body.sessionInfo).toBe('verId')
    expect(body.code).toBe('123456')
    expect(result.idToken).toBe('jwt')
  })
})

describe('firebase utilities', () => {
  it('isTestPhone matches test numbers', async () => {
    const { isTestPhone } = await import('./firebase')
    expect(isTestPhone('+15555550100')).toBe(true)
    expect(isTestPhone('+15555550101')).toBe(true)
    expect(isTestPhone('+1 555-555-0100')).toBe(true)
    expect(isTestPhone('+19999999999')).toBe(false)
  })
})
