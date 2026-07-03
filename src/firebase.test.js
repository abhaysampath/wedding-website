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
    RecaptchaVerifier: vi.fn(function () {
      this.clear = vi.fn()
    }),
    signInWithPhoneNumber: vi.fn(() =>
      Promise.resolve({
        verificationId: 'verId',
        confirm: vi.fn(() => Promise.resolve({ user: { uid: 'phone-user' } })),
      }),
    ),
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

  it('sendPhoneCode calls signInWithPhoneNumber with phone and verifier', async () => {
    const firebaseAuth = await import('firebase/auth')
    const { sendPhoneCode } = await import('./firebase')
    const result = await sendPhoneCode('+15555550100')
    expect(firebaseAuth.signInWithPhoneNumber).toHaveBeenCalledOnce()
    const [, phoneArg, verifierArg] = firebaseAuth.signInWithPhoneNumber.mock.calls[0]
    expect(phoneArg).toBe('+15555550100')
    expect(verifierArg).toBeInstanceOf(firebaseAuth.RecaptchaVerifier)
    expect(result.verificationId).toBe('verId')
  })

  it('sendPhoneCode throws on SDK failure', async () => {
    const firebaseAuth = await import('firebase/auth')
    firebaseAuth.signInWithPhoneNumber.mockRejectedValueOnce(
      new Error('TOO_MANY_ATTEMPTS_TRY_LATER'),
    )
    const { sendPhoneCode } = await import('./firebase')
    await expect(sendPhoneCode('+15555550100')).rejects.toThrow('TOO_MANY_ATTEMPTS_TRY_LATER')
  })

  it('linkPhoneCredential confirms pending confirmation result', async () => {
    const firebaseAuth = await import('firebase/auth')
    const { sendPhoneCode, linkPhoneCredential, clearRecaptchaVerifier } =
      await import('./firebase')
    clearRecaptchaVerifier()
    await sendPhoneCode('+15555550100')
    const result = await linkPhoneCredential('verId', '123456')
    expect(result.user.uid).toBe('phone-user')
  })

  it('linkPhoneCredential falls back to REST API when no pending confirmation', async () => {
    const { linkPhoneCredential, clearRecaptchaVerifier } = await import('./firebase')
    clearRecaptchaVerifier()
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ idToken: 'jwt', refreshToken: 'rt' }),
    })
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
