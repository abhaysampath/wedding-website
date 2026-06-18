import { render, screen, act, fireEvent } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import React from 'react'

vi.mock('framer-motion', () => ({
  motion: new Proxy(
    {},
    {
      get: (target, prop) => {
        if (prop === 'useInView') return () => true
        return ({ children, ...props }) => {
          const {
            initial,
            animate,
            exit,
            whileHover,
            whileTap,
            variants,
            transition,
            layoutId,
            onAnimationComplete,
            ...rest
          } = props
          const tag = typeof prop === 'string' ? prop : 'div'
          return React.createElement(tag, rest, children)
        }
      },
    },
  ),
  AnimatePresence: ({ children }) => <>{children}</>,
}))

import OfflineBanner from './OfflineBanner'

describe('OfflineBanner', () => {
  const originalOnLine = navigator.onLine

  beforeEach(() => {
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true })
  })

  afterEach(() => {
    Object.defineProperty(navigator, 'onLine', { value: originalOnLine, configurable: true })
  })

  it('does not render when online', () => {
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true })
    render(<OfflineBanner />)
    expect(screen.queryByText(/offline/i)).toBeNull()
  })

  it('renders when navigator is offline at mount', () => {
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true })
    render(<OfflineBanner />)
    expect(screen.getByText(/offline/i)).toBeTruthy()
  })

  it('appears when the offline event fires', () => {
    render(<OfflineBanner />)
    act(() => {
      window.dispatchEvent(new Event('offline'))
    })
    expect(screen.getByText(/offline/i)).toBeTruthy()
  })

  it('disappears when the online event fires', () => {
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true })
    render(<OfflineBanner />)
    expect(screen.getByText(/offline/i)).toBeTruthy()
    act(() => {
      window.dispatchEvent(new Event('online'))
    })
    expect(screen.queryByText(/offline/i)).toBeNull()
  })

  it('has role=status and aria-live=polite', () => {
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true })
    render(<OfflineBanner />)
    const banner = screen.getByRole('status')
    expect(banner.getAttribute('aria-live')).toBe('polite')
  })

  it('cleans up event listeners on unmount', () => {
    const { unmount } = render(<OfflineBanner />)
    unmount()
    expect(() => fireEvent(window, new Event('offline'))).not.toThrow()
  })
})
