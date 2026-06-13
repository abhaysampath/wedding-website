import { render } from '@testing-library/react'
import { vi, describe, it, expect } from 'vitest'
import React from 'react'

import { AuthContext } from './AuthContext'
import { useAuth } from './useAuth'

function TestHarness() {
  const auth = useAuth()
  return <div data-testid="auth">{JSON.stringify(auth)}</div>
}

describe('useAuth', () => {
  it('returns context value when used inside AuthProvider', () => {
    const value = { user: { name: 'Jane' }, firebaseLoading: false }
    const { getByTestId } = render(
      <AuthContext.Provider value={value}>
        <TestHarness />
      </AuthContext.Provider>,
    )
    expect(getByTestId('auth').textContent).toBe(JSON.stringify(value))
  })

  it('throws error when used outside AuthProvider', () => {
    function BadComponent() {
      useAuth()
      return null
    }
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => render(<BadComponent />)).toThrow(
      'useAuth must be used within AuthProvider',
    )
    spy.mockRestore()
  })
})
