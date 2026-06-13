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
    PhoneAuthProvider: { credential: vi.fn(() => ({})) },
    linkWithCredential: vi.fn(),
    signInWithCredential: vi.fn(),
    signInWithPhoneNumber: vi.fn(() => Promise.resolve({ verificationId: 'verId' })),
    RecaptchaVerifier: vi.fn(),
    browserLocalPersistence: 'local',
    setPersistence: vi.fn(),
  }
})

vi.mock('./config', () => ({
  default: { firebase: { apiKey: 'test-key', authDomain: 'test-domain', projectId: 'test-project' } },
}))

describe('firebase with config', () => {
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

  it('sendPhoneCode calls signInWithPhoneNumber', async () => {
    const firebaseAuth = await import('firebase/auth')
    const { sendPhoneCode } = await import('./firebase')
    const result = await sendPhoneCode('+15555550100', {})
    expect(firebaseAuth.signInWithPhoneNumber).toHaveBeenCalled()
  })

  it('linkPhoneCredential calls linkWithCredential', async () => {
    const firebaseAuth = await import('firebase/auth')
    const { linkPhoneCredential } = await import('./firebase')
    firebaseAuth.getAuth().currentUser = { uid: 'test-user' }
    const result = await linkPhoneCredential('verId', '123456')
    expect(firebaseAuth.linkWithCredential).toHaveBeenCalled()
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
