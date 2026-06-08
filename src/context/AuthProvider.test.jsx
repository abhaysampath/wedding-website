import { render, act } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import React from 'react'

vi.mock('../firebase', () => ({
  signInWithGoogle: vi.fn(),
  signInWithFacebook: vi.fn(),
  signInWithFacebookToken: vi.fn(),
  createAnonymousSession: vi.fn(),
  sendPhoneCode: vi.fn(),
  linkPhoneCredential: vi.fn(),
  getRecaptchaVerifier: vi.fn(),
  clearRecaptchaVerifier: vi.fn(),
}))

vi.mock('@vercel/analytics', () => ({ track: vi.fn() }))

vi.mock('../data/guests', () => ({
  default: [
    { id: 'g001', firstName: 'Jane', lastName: 'Doe', side: 'bride', role: 'invited_guest', relationship: 'Cousin', phone: '5551234567', email: 'jane@example.com', weddings: ['us'] },
  ],
}))

vi.mock('../utils/time', () => ({
  eastTime: () => '2026-06-08 12:00:00 ET',
}))

import { useAuth } from './useAuth'
import { AuthProvider } from './AuthProvider'
import { signInWithFacebookToken } from '../firebase'

function TestHarness() {
  const { firebaseLoading, firebaseError, user } = useAuth()
  return (
    <div>
      <div data-testid="loading">{String(firebaseLoading)}</div>
      <div data-testid="error">{firebaseError || ''}</div>
      <div data-testid="user">{user ? `${user.firstName} ${user.lastName}` : ''}</div>
    </div>
  )
}

function renderProvider() {
  return render(
    <AuthProvider>
      <TestHarness />
    </AuthProvider>
  )
}

describe('AuthProvider facebook-login event', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    sessionStorage.clear()
  })

  it('calls signInWithFacebookToken with the access token from the event', async () => {
    signInWithFacebookToken.mockRejectedValueOnce(new Error('no guest'))
    renderProvider()

    await act(async () => {
      window.dispatchEvent(new CustomEvent('facebook-login', {
        detail: { accessToken: 'test-token-123' },
      }))
    })

    expect(signInWithFacebookToken).toHaveBeenCalledWith('test-token-123')
  })

  it('sets firebaseLoading true during sign-in and false after', async () => {
    let resolvePromise
    signInWithFacebookToken.mockReturnValueOnce(new Promise((resolve) => { resolvePromise = resolve }))
    const { getByTestId } = renderProvider()

    await act(async () => {
      window.dispatchEvent(new CustomEvent('facebook-login', {
        detail: { accessToken: 'tok' },
      }))
    })

    expect(getByTestId('loading').textContent).toBe('true')

    await act(async () => {
      resolvePromise({ user: { displayName: 'Jane Doe', email: 'jane@example.com', uid: 'fb-uid' } })
    })

    expect(getByTestId('loading').textContent).toBe('false')
  })

  it('sets firebaseError when signInWithFacebookToken rejects', async () => {
    signInWithFacebookToken.mockRejectedValueOnce(new Error('Facebook auth failed'))
    const { getByTestId } = renderProvider()

    await act(async () => {
      window.dispatchEvent(new CustomEvent('facebook-login', {
        detail: { accessToken: 'bad-token' },
      }))
    })

    expect(getByTestId('error').textContent).toContain('Facebook auth failed')
  })

  it('signs in guest when displayName matches a guest name', async () => {
    signInWithFacebookToken.mockResolvedValueOnce({
      user: { displayName: 'Jane Doe', email: 'jane@example.com', uid: 'fb-uid' },
    })
    const { getByTestId } = renderProvider()

    await act(async () => {
      window.dispatchEvent(new CustomEvent('facebook-login', {
        detail: { accessToken: 'tok' },
      }))
    })

    expect(getByTestId('user').textContent).toBe('Jane Doe')
  })

  it('sets firebaseError when Facebook user does not match any guest', async () => {
    signInWithFacebookToken.mockResolvedValueOnce({
      user: { displayName: 'Unknown Person', email: 'unknown@example.com', uid: 'fb-uid' },
    })
    const { getByTestId } = renderProvider()

    await act(async () => {
      window.dispatchEvent(new CustomEvent('facebook-login', {
        detail: { accessToken: 'tok' },
      }))
    })

    expect(getByTestId('error').textContent).toContain('Could not find')
  })

  it('does not sign in user when accessToken is undefined', async () => {
    signInWithFacebookToken.mockResolvedValueOnce(undefined)
    const { getByTestId } = renderProvider()

    await act(async () => {
      window.dispatchEvent(new CustomEvent('facebook-login', { detail: {} }))
    })

    expect(signInWithFacebookToken).toHaveBeenCalledWith(undefined)
    expect(getByTestId('user').textContent).toBe('')
  })
})
