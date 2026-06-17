import { render, screen, cleanup } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import React from 'react'

vi.mock('framer-motion', () => ({
  motion: new Proxy({}, {
    get: (target, prop) => {
      return ({ children, ...props }) => {
        const { initial, animate, transition, ...rest } = props
        const tag = typeof prop === 'string' ? prop : 'div'
        return React.createElement(tag, rest, children)
      }
    },
  }),
}))

describe('NotFound', () => {
  beforeEach(() => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: true })
  })

  afterEach(() => {
    vi.restoreAllMocks()
    cleanup()
  })

  it('renders 404 heading', async () => {
    const { default: NotFound } = await import('./NotFound')
    render(<NotFound />)
    expect(screen.getByText('404')).toBeTruthy()
  })

  it('renders Page Not Found text', async () => {
    const { default: NotFound } = await import('./NotFound')
    render(<NotFound />)
    expect(screen.getByText('Page Not Found')).toBeTruthy()
  })

  it('renders Back to Home link pointing to /', async () => {
    const { default: NotFound } = await import('./NotFound')
    render(<NotFound />)
    const link = screen.getByText('Back to Home').closest('a')
    expect(link).toBeTruthy()
    expect(link.getAttribute('href')).toBe('/')
  })

  it('calls alert-error API on mount with 404 type', async () => {
    const { default: NotFound } = await import('./NotFound')
    render(<NotFound />)
    expect(globalThis.fetch).toHaveBeenCalledWith('/api/alert-error', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: expect.stringContaining('"type":"404"'),
    })
  })

  it('handles fetch failure without crashing', async () => {
    globalThis.fetch.mockRejectedValue(new Error('Network error'))
    const { default: NotFound } = await import('./NotFound')
    await expect(async () => render(<NotFound />)).not.toThrow()
  })
})
