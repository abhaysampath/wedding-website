import { render, act } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import React from 'react'

vi.mock('../firebase', () => ({
  signInWithGoogle: vi.fn(),
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
import { fullName } from '../utils/guest'

function TestHarness() {
  const { firebaseLoading, firebaseError, user } = useAuth()
  return (
    <div>
      <div data-testid="loading">{String(firebaseLoading)}</div>
      <div data-testid="error">{firebaseError || ''}</div>
      <div data-testid="user">{user ? fullName(user) : ''}</div>
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

describe('AuthProvider sign-in path', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    sessionStorage.clear()
  })

  it('renders without crashing and shows no user initially', () => {
    const { getByTestId } = renderProvider()
    expect(getByTestId('user').textContent).toBe('')
  })
})
