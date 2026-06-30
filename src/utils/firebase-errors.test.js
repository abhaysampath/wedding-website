import { describe, it, expect } from 'vitest'
import { friendlyAuthError } from './firebase-errors.js'

describe('friendlyAuthError', () => {
  it('returns fallback for null/undefined', () => {
    expect(friendlyAuthError(null)).toMatch(/try again/i)
    expect(friendlyAuthError(undefined)).toMatch(/try again/i)
  })

  it('returns original message for unknown Firebase codes', () => {
    expect(friendlyAuthError({ code: 'auth/unknown-code', message: 'Specific' })).toBe('Specific')
  })

  it('uses provided fallback only when error has no message', () => {
    expect(friendlyAuthError({ code: 'auth/unknown' }, 'Custom fallback')).toBe('Custom fallback')
    expect(friendlyAuthError({}, 'Custom fallback')).toBe('Custom fallback')
  })

  it('maps auth/too-many-requests to a friendly message', () => {
    expect(friendlyAuthError({ code: 'auth/too-many-requests' })).toMatch(/too many attempts/i)
  })

  it('maps reCAPTCHA errors to the "sign in with email" message', () => {
    expect(friendlyAuthError({ code: 'auth/captcha-check-failed' })).toMatch(/sign in with email/i)
    expect(friendlyAuthError({ code: 'auth/invalid-app-credential' })).toMatch(
      /sign in with email/i,
    )
  })

  it('detects reCAPTCHA in error message when code is missing', () => {
    expect(friendlyAuthError({ message: 'something about reCAPTCHA failed' })).toMatch(
      /sign in with email/i,
    )
  })

  it('detects network errors in message', () => {
    expect(friendlyAuthError({ message: 'network error' })).toMatch(/connection/i)
  })
})
