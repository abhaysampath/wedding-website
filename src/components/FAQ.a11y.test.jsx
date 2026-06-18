import { render } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { axe, toHaveNoViolations } from 'jest-axe'
import React from 'react'

expect.extend(toHaveNoViolations)

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
  useInView: () => true,
}))

vi.mock('../context/useAuth', () => ({
  useAuth: () => ({
    user: null,
    activeWedding: 'us',
    content: {
      faq: [
        { q: 'When is the wedding?', a: 'May 30, 2027.', wedding: 'both' },
        { q: 'US-only question?', a: 'US only.', wedding: 'us' },
      ],
    },
  }),
}))

vi.mock('./WeddingSwitcher', () => ({
  default: () => null,
}))

import FAQ from './FAQ'

describe('FAQ a11y', () => {
  beforeEach(() => {})

  it('has no axe violations when collapsed', async () => {
    const { container } = render(<FAQ />)
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })

  it('has no axe violations when an item is expanded', async () => {
    const { container } = render(<FAQ />)
    const button = container.querySelector('button')
    if (button) button.click()
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })
})
