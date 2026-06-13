import { render, screen } from '@testing-library/react'
import { vi, describe, it, expect } from 'vitest'
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

vi.mock('../config', () => ({
  default: {
    images: {
      ourStory: {
        dir: 'https://cdn.jsdelivr.net/gh/abhaysampath/wedding-website@main/public/pics/vert/',
        slides: [
          { file: 'BNE-l.jpeg', alt: 'BNE' },
          { file: 'botgrdn-w-geordi.jpeg', alt: 'Botanical Garden with Geordi' },
        ],
      },
    },
  },
}))

import OurStory from './OurStory'

describe('OurStory', () => {
  it('renders section title', () => {
    render(<OurStory />)
    expect(screen.getByText('Our Story')).toBeTruthy()
  })

  it('renders story text content', () => {
    render(<OurStory />)
    expect(screen.getByText(/began in the modern way/)).toBeTruthy()
    expect(screen.getByText(/Belize/)).toBeTruthy()
    expect(screen.getByText(/2027/)).toBeTruthy()
  })

  it('renders image slides with alt text', () => {
    render(<OurStory />)
    const images = screen.getAllByRole('img')
    expect(images.length).toBeGreaterThanOrEqual(1)
    expect(images[0].getAttribute('alt')).toBeTruthy()
  })

  it('renders dot navigation buttons for each slide', () => {
    render(<OurStory />)
    const dots = screen.getAllByRole('button')
    expect(dots).toHaveLength(2)
  })

  it('renders without crashing', () => {
    render(<OurStory />)
    expect(screen.getByText('Our Story')).toBeTruthy()
  })
})
