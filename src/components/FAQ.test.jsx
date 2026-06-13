import { render, screen, fireEvent } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import React from 'react'

vi.mock('framer-motion', () => ({
  motion: new Proxy({}, {
    get: (target, prop) => {
      if (prop === 'useInView') return () => true
      return ({ children, ...props }) => {
        const { initial, animate, exit, whileHover, whileTap, variants, transition, layoutId, onAnimationComplete, ...rest } = props
        const tag = typeof prop === 'string' ? prop : 'div'
        return React.createElement(tag, rest, children)
      }
    },
  }),
  AnimatePresence: ({ children }) => <>{children}</>,
  useInView: () => true,
}))

vi.mock('./WeddingSwitcher', () => ({
  default: () => null,
}))

const mockUseAuth = vi.fn()
vi.mock('../context/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}))

import FAQ from './FAQ'

describe('FAQ', () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({
      user: null,
      activeWedding: 'us',
      content: { faq: [] },
    })
  })

  it('renders the FAQ section heading', () => {
    render(<FAQ />)
    expect(screen.getByText('FAQ')).toBeTruthy()
  })

  it('shows empty state when no FAQs are available', () => {
    render(<FAQ />)
    expect(screen.getByText('No FAQs available yet. Check back closer to the wedding date.')).toBeTruthy()
  })

  it('shows both-wedding FAQ items for unauthenticated user', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      activeWedding: 'us',
      content: {
        faq: [
          { q: 'Both question?', a: 'Both answer.', wedding: 'both' },
        ],
      },
    })
    render(<FAQ />)
    expect(screen.getByText('Both question?')).toBeTruthy()
  })

  it('hides wedding-specific FAQ items for unauthenticated user', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      activeWedding: 'us',
      content: {
        faq: [
          { q: 'US only?', a: 'US answer.', wedding: 'us' },
        ],
      },
    })
    render(<FAQ />)
    expect(screen.queryByText('US only?')).toBeNull()
  })

  it('filters FAQ items by active wedding for multi-wedding user', () => {
    mockUseAuth.mockReturnValue({
      user: { weddings: ['us', 'india'] },
      activeWedding: 'us',
      content: {
        faq: [
          { q: 'US question?', a: 'US answer.', wedding: 'us' },
          { q: 'India question?', a: 'India answer.', wedding: 'india' },
        ],
      },
    })
    render(<FAQ />)
    expect(screen.getByText('US question?')).toBeTruthy()
    expect(screen.queryByText('India question?')).toBeNull()
  })

  it('switches filtered FAQs when activeWedding changes', () => {
    mockUseAuth.mockReturnValue({
      user: { weddings: ['us', 'india'] },
      activeWedding: 'india',
      content: {
        faq: [
          { q: 'US question?', a: 'US answer.', wedding: 'us' },
          { q: 'India question?', a: 'India answer.', wedding: 'india' },
        ],
      },
    })
    render(<FAQ />)
    expect(screen.getByText('India question?')).toBeTruthy()
    expect(screen.queryByText('US question?')).toBeNull()
  })

  it('shows both-wedding FAQ items alongside matching wedding-specific ones', () => {
    mockUseAuth.mockReturnValue({
      user: { weddings: ['us', 'india'] },
      activeWedding: 'us',
      content: {
        faq: [
          { q: 'Both?', a: 'Both.', wedding: 'both' },
          { q: 'US?', a: 'US.', wedding: 'us' },
        ],
      },
    })
    render(<FAQ />)
    expect(screen.getByText('Both?')).toBeTruthy()
    expect(screen.getByText('US?')).toBeTruthy()
  })

  it('hides FAQ items with wedding set to hide', () => {
    mockUseAuth.mockReturnValue({
      user: { weddings: ['us', 'india'] },
      activeWedding: 'us',
      content: {
        faq: [
          { q: 'Hidden?', a: 'Hidden answer.', wedding: 'hide' },
        ],
      },
    })
    render(<FAQ />)
    expect(screen.queryByText('Hidden?')).toBeNull()
  })

  it('shows warning banner when all FAQ items have wedding set to both', () => {
    mockUseAuth.mockReturnValue({
      user: { weddings: ['us', 'india'] },
      activeWedding: 'us',
      content: {
        faq: [
          { q: 'Q1', a: 'A1', wedding: 'both' },
          { q: 'Q2', a: 'A2', wedding: 'both' },
        ],
      },
    })
    render(<FAQ />)
    expect(screen.getByText(/FAQ filtering by wedding is not active/)).toBeTruthy()
  })

  it('expands an accordion item on click', () => {
    mockUseAuth.mockReturnValue({
      user: { weddings: ['us', 'india'] },
      activeWedding: 'us',
      content: {
        faq: [
          { q: 'Test question?', a: 'Test answer.', wedding: 'both' },
        ],
      },
    })
    render(<FAQ />)
    expect(screen.queryByText('Test answer.')).toBeNull()

    fireEvent.click(screen.getByText('Test question?'))
    expect(screen.getByText('Test answer.')).toBeTruthy()
  })

  it('collapses an accordion item on second click', () => {
    mockUseAuth.mockReturnValue({
      user: { weddings: ['us', 'india'] },
      activeWedding: 'us',
      content: {
        faq: [
          { q: 'Test question?', a: 'Test answer.', wedding: 'both' },
        ],
      },
    })
    render(<FAQ />)
    fireEvent.click(screen.getByText('Test question?'))
    expect(screen.getByText('Test answer.')).toBeTruthy()

    fireEvent.click(screen.getByText('Test question?'))
    expect(screen.queryByText('Test answer.')).toBeNull()
  })

  it('closes previously open accordion when a new item is clicked', () => {
    mockUseAuth.mockReturnValue({
      user: { weddings: ['us', 'india'] },
      activeWedding: 'us',
      content: {
        faq: [
          { q: 'First?', a: 'First answer.', wedding: 'both' },
          { q: 'Second?', a: 'Second answer.', wedding: 'both' },
        ],
      },
    })
    render(<FAQ />)
    fireEvent.click(screen.getByText('First?'))
    expect(screen.getByText('First answer.')).toBeTruthy()

    fireEvent.click(screen.getByText('Second?'))
    expect(screen.queryByText('First answer.')).toBeNull()
    expect(screen.getByText('Second answer.')).toBeTruthy()
  })

  it('shows FAQ items for single-wedding user without activeWedding filtering', () => {
    mockUseAuth.mockReturnValue({
      user: { weddings: ['us'] },
      activeWedding: 'us',
      content: {
        faq: [
          { q: 'Only US?', a: 'Only US answer.', wedding: 'us' },
        ],
      },
    })
    render(<FAQ />)
    expect(screen.getByText('Only US?')).toBeTruthy()
  })
})
