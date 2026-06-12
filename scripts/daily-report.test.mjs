// @vitest-environment node
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, mkdirSync, writeFileSync, readdirSync, existsSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'

// Mock googleapis before any imports that use it
const mockGet = vi.fn()
const mockJWT = vi.fn().mockImplementation(function () { return {} })
vi.mock('googleapis', () => ({
  google: {
    auth: { JWT: mockJWT },
    sheets: vi.fn().mockReturnValue({ spreadsheets: { values: { get: mockGet } } }),
  },
}))

import {
  e,
  sanitizeCell,
  parseSheet,
  daysAgo,
  collectImageFiles,
  chunkedSettle,
  nameStr,
  main,
} from './daily-report.mjs'

import SHEET_CONFIG from '../api/sheets-config.js'
const ALL_COLUMNS = Object.values(SHEET_CONFIG.guests.columns)

// ── Pure Function Tests ──────────────────────────────────────────

describe('e', () => {
  it('wraps content in HTML tag', () => {
    expect(e('h2', 'Title')).toBe('<h2>Title</h2>')
  })

  it('handles empty content', () => {
    expect(e('br', '')).toBe('<br></br>')
  })

  it('does not escape HTML', () => {
    expect(e('div', '<b>bold</b>')).toBe('<div><b>bold</b></div>')
  })
})

describe('sanitizeCell', () => {
  it('trims whitespace', () => {
    expect(sanitizeCell('  hello  ')).toBe('hello')
  })

  it('empties comment cells starting with #', () => {
    expect(sanitizeCell('# comment')).toBe('')
  })

  it('empties null/undefined', () => {
    expect(sanitizeCell(null)).toBe('')
    expect(sanitizeCell(undefined)).toBe('')
  })

  it('preserves normal values', () => {
    expect(sanitizeCell('John')).toBe('John')
    expect(sanitizeCell('123')).toBe('123')
  })

  it('preserves # in the middle of a value', () => {
    expect(sanitizeCell('C# code')).toBe('C# code')
  })
})

describe('parseSheet', () => {
  const colConfig = { name: 'Name', role: 'Role', email: 'Email' }

  it('parses valid rows into objects', () => {
    const values = [
      ['Name', 'Role', 'Email'],
      ['Alice', 'bride', 'a@t.com'],
      ['Bob', 'groom', 'b@t.com'],
    ]
    expect(parseSheet(values, colConfig)).toEqual([
      { name: 'Alice', role: 'bride', email: 'a@t.com' },
      { name: 'Bob', role: 'groom', email: 'b@t.com' },
    ])
  })

  it('returns empty array for < 2 rows', () => {
    expect(parseSheet([], colConfig)).toEqual([])
    expect(parseSheet([['Name']], colConfig)).toEqual([])
    expect(parseSheet(null, colConfig)).toEqual([])
  })

  it('sets missing columns to undefined', () => {
    const values = [['Name', 'Email'], ['Alice', 'a@t.com']]
    expect(parseSheet(values, colConfig)).toEqual([
      { name: 'Alice', role: undefined, email: 'a@t.com' },
    ])
  })

  it('sanitizes cell values', () => {
    expect(parseSheet([['Name', 'Role'], ['  Alice  ', '# skip']], colConfig)).toEqual([
      { name: 'Alice', role: '', email: undefined },
    ])
  })

  it('matches headers case-insensitively', () => {
    expect(parseSheet([['NAME', 'role'], ['Alice', 'bride']], colConfig)).toEqual([
      { name: 'Alice', role: 'bride', email: undefined },
    ])
  })
})

describe('daysAgo', () => {
  it('returns Infinity for empty/invalid/null', () => {
    expect(daysAgo('')).toBe(Infinity)
    expect(daysAgo(null)).toBe(Infinity)
    expect(daysAgo('garbage')).toBe(Infinity)
  })

  it('returns ~0 for now', () => {
    expect(daysAgo(new Date().toISOString())).toBeLessThan(0.01)
  })

  it('returns ~1 for yesterday', () => {
    const d = new Date(Date.now() - 86400000).toISOString()
    expect(daysAgo(d)).toBeGreaterThan(0.99)
    expect(daysAgo(d)).toBeLessThan(1.01)
  })

  it('returns > 1000 for old date', () => {
    expect(daysAgo('2020-01-01')).toBeGreaterThan(1000)
  })
})

describe('nameStr', () => {
  it('joins firstName and lastName', () => {
    expect(nameStr({ firstName: 'John', lastName: 'Doe' })).toBe('John Doe')
  })

  it('handles missing lastName', () => {
    expect(nameStr({ firstName: 'John' })).toBe('John')
  })

  it('handles missing firstName', () => {
    expect(nameStr({ lastName: 'Doe' })).toBe('Doe')
  })

  it('falls back for empty object', () => {
    expect(nameStr({})).toBe('(no name)')
  })

  it('falls back for null/undefined', () => {
    expect(nameStr(null)).toBe('(no name)')
    expect(nameStr(undefined)).toBe('(no name)')
  })
})

describe('chunkedSettle', () => {
  it('processes all items with success', async () => {
    const fn = vi.fn().mockResolvedValue('ok')
    const results = await chunkedSettle([1, 2, 3], fn, 2)
    expect(results).toHaveLength(3)
    results.forEach((r) => expect(r.status).toBe('fulfilled'))
    expect(fn).toHaveBeenCalledTimes(3)
  })

  it('handles mixed success and failure', async () => {
    const fn = vi
      .fn()
      .mockResolvedValueOnce('a')
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValueOnce('c')
    const results = await chunkedSettle([1, 2, 3], fn, 2)
    expect(results[0].status).toBe('fulfilled')
    expect(results[1].status).toBe('rejected')
    expect(results[2].status).toBe('fulfilled')
  })

  it('returns empty array for empty input', async () => {
    const fn = vi.fn()
    const results = await chunkedSettle([], fn)
    expect(results).toEqual([])
    expect(fn).not.toHaveBeenCalled()
  })
})

// ── collectImageFiles Tests ─────────────────────────────────────

describe('collectImageFiles', () => {
  let tmpDir

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'report-test-'))
    mkdirSync(join(tmpDir, 'home'), { recursive: true })
    mkdirSync(join(tmpDir, 'vert'), { recursive: true })
    mkdirSync(join(tmpDir, 'gallery'), { recursive: true })
  })

  it('collects images from all subdirs', () => {
    writeFileSync(join(tmpDir, 'home', 'a.jpg'), '')
    writeFileSync(join(tmpDir, 'home', 'b.jpeg'), '')
    writeFileSync(join(tmpDir, 'home', 'c.txt'), '')
    writeFileSync(join(tmpDir, 'vert', 'd.png'), '')
    writeFileSync(join(tmpDir, 'gallery', 'e.webp'), '')
    writeFileSync(join(tmpDir, 'gallery', 'f.avif'), '')

    const result = collectImageFiles(tmpDir, 'https://cdn.test/pics')
    expect(result).toEqual([
      { file: 'a.jpg', subdir: 'home', url: 'https://cdn.test/pics/home/a.jpg' },
      { file: 'b.jpeg', subdir: 'home', url: 'https://cdn.test/pics/home/b.jpeg' },
      { file: 'd.png', subdir: 'vert', url: 'https://cdn.test/pics/vert/d.png' },
      { file: 'e.webp', subdir: 'gallery', url: 'https://cdn.test/pics/gallery/e.webp' },
      { file: 'f.avif', subdir: 'gallery', url: 'https://cdn.test/pics/gallery/f.avif' },
    ])
  })

  it('skips non-image extensions', () => {
    writeFileSync(join(tmpDir, 'home', 'a.jpg'), '')
    writeFileSync(join(tmpDir, 'home', 'b.txt'), '')
    writeFileSync(join(tmpDir, 'home', 'c.pdf'), '')

    const result = collectImageFiles(tmpDir, 'https://cdn.test/pics')
    expect(result).toHaveLength(1)
    expect(result[0].file).toBe('a.jpg')
  })

  it('returns empty for missing subdirs', () => {
    const emptyDir = mkdtempSync(join(tmpdir(), 'report-empty-'))
    expect(collectImageFiles(emptyDir)).toEqual([])
  })

  it('returns empty for non-existent root', () => {
    expect(collectImageFiles('/nonexistent/path')).toEqual([])
  })
})

// ── main() Integration Tests ────────────────────────────────────

describe('main', () => {
  const ORIG_ENV = { ...process.env }
  let exitSpy

  beforeEach(() => {
    vi.restoreAllMocks()
    mockGet.mockReset()
    mockJWT.mockClear()
    global.fetch = vi.fn()
    exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit called')
    })
  })

  afterEach(() => {
    // Merge back so vars added by tests remain but deleted ones are restored
    for (const k of Object.keys(process.env)) {
      if (!(k in ORIG_ENV)) delete process.env[k]
    }
    Object.assign(process.env, ORIG_ENV)
    delete global.fetch
    exitSpy.mockRestore()
  })

  function setRequiredEnv() {
    Object.assign(process.env, {
      GOOGLE_SHEET_ID: 'test-sheet',
      GOOGLE_SERVICE_EMAIL: 'svc@test.com',
      GOOGLE_PRIVATE_KEY: 'test-key',
      EMAILJS_SERVICE_ID: 'svc_test',
      EMAILJS_CONTACT_TEMPLATE_ID: 'tpl_contact_test',
      EMAILJS_PUBLIC_KEY: 'pub_test',
      DAYS_BETWEEN: '1',
      SITE_URL: 'https://test-site.com',
      REPORT_RECIPIENT: 'report@test.com',
    })
  }

  it('exits with code 1 when required env vars are missing', async () => {
    // Remove all required vars
    for (const k of ['GOOGLE_SHEET_ID', 'GOOGLE_SERVICE_EMAIL', 'GOOGLE_PRIVATE_KEY',
      'EMAILJS_SERVICE_ID', 'EMAILJS_CONTACT_TEMPLATE_ID', 'EMAILJS_PUBLIC_KEY']) {
      delete process.env[k]
    }
    const consoleErr = vi.spyOn(console, 'error').mockImplementation(() => {})

    await expect(main()).rejects.toThrow('process.exit called')
    expect(consoleErr).toHaveBeenCalledWith(expect.stringContaining('Missing env vars'))
    consoleErr.mockRestore()
  })

  // Build a guest row with proper column alignment.
  // Full column order: Title, First Name, MI, Last Name, Relationship, Role, Invited To,
  // Plus One, Email Address, Phone Number, Mailing Address, Dietary Preferences,
  // LastLogin, LastUpdated, LoginFailed, US-RSVP, India-RSVP
  function mkGuest(overrides = {}) {
    const arr = Array(17).fill('')
    const f = {
      title: 0, firstName: 1, middleInitial: 2, lastName: 3,
      relationship: 4, role: 5, invitedTo: 6, plusOne: 7,
      email: 8, phone: 9, address: 10, dietary: 11,
      lastLogin: 12, lastUpdated: 13, loginFailed: 14,
      rsvpUs: 15, rsvpIndia: 16,
    }
    for (const [k, v] of Object.entries(overrides)) {
      if (k in f) arr[f[k]] = v
    }
    return arr
  }

  it('processes sheet data, checks images, validates links, and sends email', async () => {
    setRequiredEnv()

    mockGet.mockResolvedValue({
      data: {
        values: [
          ALL_COLUMNS,
          mkGuest({ firstName: 'Alice', lastName: 'Smith', role: 'bride',
            relationship: 'Friend', email: 'a@t.com', phone: '+1555001',
            lastLogin: '2026-06-10', loginFailed: 'SUCCESS' }),
          mkGuest({ firstName: 'Bob', lastName: 'Jones', role: 'groom',
            relationship: 'Family', email: 'b@t.com', phone: '+1555002',
            lastLogin: '2026-06-09', lastUpdated: '2026-06-10', loginFailed: 'FAILED' }),
        ],
      },
    })

    mockFetch = vi.fn()
    // Image checks (2 images found): both 200
    mockFetch.mockResolvedValueOnce({ ok: true })
    mockFetch.mockResolvedValueOnce({ ok: true })
    // Link checks
    mockFetch.mockResolvedValueOnce({ ok: true })
    mockFetch.mockResolvedValueOnce({ status: 404, ok: false })
    // EmailJS API: 200
    mockFetch.mockResolvedValue({ ok: true })
    global.fetch = mockFetch

    const consoleLog = vi.spyOn(console, 'log').mockImplementation(() => {})

    await main()

    expect(mockGet).toHaveBeenCalledOnce()

    const emailCall = global.fetch.mock.calls.find(
      (c) => c[0] === 'https://api.emailjs.com/api/v1.0/email/send'
    )
    expect(emailCall).toBeTruthy()
    const body = JSON.parse(emailCall[1].body)
    expect(body.service_id).toBe('svc_test')
    expect(body.template_id).toBe('tpl_contact_test')
    expect(body.user_id).toBe('pub_test')
    expect(body.template_params.email).toBe('report@test.com')
    expect(body.template_params.subject).toContain('Guest Report')
    expect(body.template_params.message).toContain('Total: 2')

    expect(consoleLog).toHaveBeenCalledWith('Report sent to', 'report@test.com')
    consoleLog.mockRestore()
  })

  it('reports broken images', async () => {
    setRequiredEnv()

    mockGet.mockResolvedValue({
      data: {
        values: [
          ALL_COLUMNS,
          mkGuest({ firstName: 'Alice', role: 'bride',
            lastLogin: '2026-06-10', loginFailed: 'SUCCESS' }),
        ],
      },
    })

    // Image check: 404
    mockFetch = vi.fn().mockResolvedValueOnce({ ok: false, status: 404 })
    // Link check: 200
    mockFetch.mockResolvedValueOnce({ ok: true })
    // EmailJS: 200
    mockFetch.mockResolvedValue({ ok: true })
    global.fetch = mockFetch

    const consoleLog = vi.spyOn(console, 'log').mockImplementation(() => {})

    await main()

    const emailCall = global.fetch.mock.calls.find(
      (c) => c[0] === 'https://api.emailjs.com/api/v1.0/email/send'
    )
    const body = JSON.parse(emailCall[1].body)
    expect(body.template_params.message).toContain('images')
    consoleLog.mockRestore()
  })

  it('detects duplicate phone numbers', async () => {
    setRequiredEnv()

    mockGet.mockResolvedValue({
      data: {
        values: [
          ALL_COLUMNS,
          mkGuest({ firstName: 'Alice', lastName: 'A', role: 'bride',
            phone: '+15555550100', lastLogin: '2026-06-10', loginFailed: 'SUCCESS' }),
          mkGuest({ firstName: 'Bob', lastName: 'B', role: 'groom',
            phone: '+15555550100' }),
        ],
      },
    })

    global.fetch = vi.fn().mockResolvedValue({ ok: true })
    const consoleLog = vi.spyOn(console, 'log').mockImplementation(() => {})

    await main()

    const emailCall = global.fetch.mock.calls.find(
      (c) => c[0] === 'https://api.emailjs.com/api/v1.0/email/send'
    )
    const body = JSON.parse(emailCall[1].body)
    expect(body.template_params.message).toContain('Duplicate')
    consoleLog.mockRestore()
  })
})

let mockFetch
