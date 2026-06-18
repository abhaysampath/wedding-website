import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { isAllowedOrigin } from './_origin.js'

describe('isAllowedOrigin', () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    process.env = { ...originalEnv }
    delete process.env.VERCEL_URL
    delete process.env.VERCEL_BRANCH_URL
    delete process.env.VERCEL_ENV
  })

  afterEach(() => {
    process.env = originalEnv
  })

  function makeReq({ origin, referer } = {}) {
    return {
      headers: {
        ...(origin !== undefined ? { origin } : {}),
        ...(referer !== undefined ? { referer } : {}),
      },
    }
  }

  describe('production', () => {
    beforeEach(() => {
      process.env.VERCEL_ENV = 'production'
    })

    it('allows exact production origin', () => {
      expect(isAllowedOrigin(makeReq({ origin: 'https://abhayandrebecca.com' }))).toBe(true)
    })

    it('allows www production origin', () => {
      expect(isAllowedOrigin(makeReq({ origin: 'https://www.abhayandrebecca.com' }))).toBe(true)
    })

    it('allows production origin from Referer (with trailing slash)', () => {
      expect(isAllowedOrigin(makeReq({ referer: 'https://abhayandrebecca.com/' }))).toBe(true)
    })

    it('allows production origin from Referer (with path)', () => {
      expect(isAllowedOrigin(makeReq({ referer: 'https://abhayandrebecca.com/g/jane-doe' }))).toBe(true)
    })

    it('rejects unknown origin', () => {
      expect(isAllowedOrigin(makeReq({ origin: 'https://attacker.com' }))).toBe(false)
    })

    it('rejects attacker.com prefixed as production', () => {
      expect(isAllowedOrigin(makeReq({ origin: 'https://abhayandrebecca.com.attacker.com' }))).toBe(false)
    })

    it('rejects empty headers', () => {
      expect(isAllowedOrigin(makeReq())).toBe(false)
    })
  })

  describe('preview/development', () => {
    it('allows any *.vercel.app subdomain in preview', () => {
      expect(isAllowedOrigin(makeReq({ origin: 'https://wedding-website-5cb1y13ud-serabelize-7635s-projects.vercel.app' }))).toBe(true)
    })

    it('allows localhost in dev', () => {
      expect(isAllowedOrigin(makeReq({ origin: 'http://localhost:3000' }))).toBe(true)
    })

    it('rejects unrelated origin', () => {
      expect(isAllowedOrigin(makeReq({ origin: 'https://attacker.com' }))).toBe(false)
    })
  })

  describe('origin normalization', () => {
    it('strips trailing slash from Origin', () => {
      expect(isAllowedOrigin(makeReq({ origin: 'https://abhayandrebecca.com/' }))).toBe(true)
    })

    it('strips path from Referer', () => {
      expect(isAllowedOrigin(makeReq({ referer: 'https://abhayandrebecca.com/some/path?query=1' }))).toBe(true)
    })

    it('handles malformed referer gracefully', () => {
      expect(isAllowedOrigin(makeReq({ referer: 'not-a-url' }))).toBe(false)
    })
  })
})
