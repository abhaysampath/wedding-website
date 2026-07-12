import { describe, it, expect, vi } from 'vitest'

vi.mock('./_email.js', () => ({
  getResend: () => ({ emails: { send: vi.fn().mockResolvedValue({ id: 'mock' }) } }),
  escapeHtml: s => String(s),
  buildConfirmationEmail: () => ({ subject: 'mock', html: '<p>mock</p>' }),
  emailShell: ({ body }) => `<html>${body}</html>`,
  RSVP_FROM: 'mock@from',
  ALERT_FROM: 'mock@from',
}))

vi.mock('./_session.js', () => ({
  getSession: vi.fn().mockResolvedValue({ guestId: 'g001' }),
  isAdminRole: vi.fn().mockReturnValue(false),
}))

vi.mock('./_rate-limit.js', () => ({
  applyLimit: () => null,
}))

vi.mock('./_origin.js', () => ({
  isAllowedOrigin: () => true,
}))

describe('rsvp-confirmation.js (regression: was ERR_MODULE_NOT_FOUND in prod)', () => {
  it('imports the module without ERR_MODULE_NOT_FOUND', async () => {
    const mod = await import('./rsvp-confirmation.js')
    expect(typeof mod.default).toBe('function')
  })

  it('imports SHEET_CONFIG from the correct relative path', async () => {
    // The fix: was '../sheets-config.js' (resolves to /sheets-config.js = root, missing)
    // Now: './sheets-config.js' (resolves to /api/sheets-config.js, correct)
    const fs = await import('fs')
    const path = await import('path')
    const fileUrl = await import('url')

    const rsvpPath = path.resolve(
      path.dirname(fileUrl.fileURLToPath(import.meta.url)),
      'rsvp-confirmation.js',
    )
    const content = fs.readFileSync(rsvpPath, 'utf8')
    expect(content).toMatch(/^import SHEET_CONFIG from '\.\/_sheets-config\.js'/m)
  })
})
