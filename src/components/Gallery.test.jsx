global.IntersectionObserver = class IntersectionObserver {
  constructor() { return null; }
  observe() { return null; }
  unobserve() { return null; }
  disconnect() { return null; }
}

global.requestIdleCallback = (cb) => setTimeout(cb, 0)
global.cancelIdleCallback = (id) => clearTimeout(id)

import { render, screen } from '@testing-library/react'
import { vi } from 'vitest'

vi.mock('../config', () => ({
  default: {
    images: {
      baseUrl: '/test-base-url/',
      gallery: {
        home: [
          null,
          undefined,
          { file: 'home1.jpg', alt: 'Home 1', tier: 1 },
          { file: '', alt: 'Empty file' },
          { alt: 'No file property', tier: 2 },
          { file: 'home2.jpg', alt: 'Home 2', tier: 2 },
        ],
        gallery: [{ file: 'gal1.jpg', alt: 'Gallery 1', tier: 1 }, { file: 'gal2.jpg', alt: 'Gallery 2', tier: 2 }],
        vert: [{ file: 'vert1.jpg', alt: 'Vert 1', tier: 1 }],
      },
    },
  },
}))

vi.mock('../context/useAuth', () => ({
  useAuth: () => ({ user: null, setShowAuthModal: vi.fn() }),
}))

import Gallery from './Gallery'

describe('Gallery', () => {
  test('renders without throwing even with null/undefined/missing-file entries', () => {
    expect(() => render(<Gallery />)).not.toThrow()
  })

  test('renders a heading with "Gallery"', () => {
    render(<Gallery />)
    const heading = screen.queryByText('Gallery')
    expect(heading).not.toBeNull()
    expect(heading.tagName).toBe('H2')
  })
})