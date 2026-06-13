import { render, screen } from '@testing-library/react'
import { vi, describe, it, expect } from 'vitest'
import React from 'react'
import { ErrorBoundary } from './ErrorBoundary'

function Bomb() {
  throw new Error('💥')
}

describe('ErrorBoundary', () => {
  it('renders children when no error occurs', () => {
    render(<ErrorBoundary><p>all good</p></ErrorBoundary>)
    expect(screen.getByText('all good')).toBeTruthy()
  })

  it('renders fallback UI when child throws', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    render(<ErrorBoundary><Bomb /></ErrorBoundary>)
    expect(screen.getByText('Something went wrong')).toBeTruthy()
    expect(screen.getByText('Refresh Page')).toBeTruthy()
    expect(screen.getByText("We've encountered an issue, but our team has been notified. Please try refreshing the page or come back later.")).toBeTruthy()
    vi.restoreAllMocks()
  })

  it('shows error details only in non-production', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const env = process.env.NODE_ENV
    process.env.NODE_ENV = 'development'
    render(<ErrorBoundary><Bomb /></ErrorBoundary>)
    expect(screen.getByText('Error details:')).toBeTruthy()
    process.env.NODE_ENV = env
    vi.restoreAllMocks()
  })

  it('hides error details in production', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const env = process.env.NODE_ENV
    process.env.NODE_ENV = 'production'
    render(<ErrorBoundary><Bomb /></ErrorBoundary>)
    expect(screen.queryByText('Error details:')).toBeNull()
    process.env.NODE_ENV = env
    vi.restoreAllMocks()
  })
})
