import { test, expect, type Page } from '@playwright/test'

/**
 * Access / visibility E2E — runs in both the `mobile` (iPhone 12) and `desktop`
 * projects (see playwright.config.ts). Covers the exact guest shapes seeded into
 * the config sheet:
 *   - "Both Weddings"  -> invited to US + India
 *   - "US Only"        -> invited to US
 *   - "India Only"     -> invited to India
 *
 * These run against the built bundle served by `vite preview` with the session
 * injected via localStorage, so they are fast, deterministic, and cost nothing
 * (no real Firebase / Sheets / email calls). Real network calls are mocked.
 */

const GUESTS = [
  {
    id: 'g132',
    title: 'TEST',
    firstName: 'Both',
    lastName: 'Weddings',
    side: 'bride',
    role: 'close_family',
    relationship: "Rebecca's Friend",
    weddings: ['us', 'india'],
    phone: '15555550100',
    email: 'test-both@abhayandrebecca.com',
  },
  {
    id: 'g133',
    title: 'TEST',
    firstName: 'US',
    lastName: 'Only',
    side: 'bride',
    role: 'invited_guest',
    relationship: "Rebecca's Guest",
    weddings: ['us'],
    phone: '15555550101',
    email: 'test-us@abhayandrebecca.com',
  },
  {
    id: 'g134',
    title: 'TEST',
    firstName: 'India',
    lastName: 'Only',
    side: 'groom',
    role: 'invited_guest',
    relationship: "Abhay's Guest",
    weddings: ['india'],
    phone: '15555550102',
    email: 'test-india@abhayandrebecca.com',
  },
]

function signInUser(g: (typeof GUESTS)[number]) {
  return {
    id: g.id,
    firstName: g.firstName,
    lastName: g.lastName,
    side: g.side,
    role: g.role,
    relationship: g.relationship,
    weddings: g.weddings,
    phone: g.phone,
    email: g.email,
    address: '',
    dietaryPreferences: '',
    rsvpUs: '',
    rsvpIndia: '',
    lastLogin: new Date().toISOString(),
    uid: null,
  }
}

async function mockContent(page: Page) {
  await page.route('**/api/content', route =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ source: 'test', guests: GUESTS, faq: [], loaded: true }),
    }),
  )
}

async function startSignedIn(page: Page, guest: (typeof GUESTS)[number]) {
  await mockContent(page)
  await page.addInitScript(u => {
    window.localStorage.setItem('wedding_user', JSON.stringify(u))
  }, signInUser(guest))
  await page.goto('/')
  await expect(page.locator('#hero')).toBeVisible()
}

test.describe('Access visibility matrix', () => {
  test('signed-out: gated sections are hidden, public sections shown', async ({ page }) => {
    await mockContent(page)
    await page.goto('/')
    await expect(page.locator('#hero')).toBeVisible()
    await expect(page.locator('#gallery')).toBeVisible()
    // Gated for guests: story, details, travel, registry, faq
    await expect(page.locator('#story')).toHaveCount(0)
    await expect(page.locator('#details')).toHaveCount(0)
    await expect(page.locator('#travel')).toHaveCount(0)
    await expect(page.locator('#registry')).toHaveCount(0)
    await expect(page.locator('#faq')).toHaveCount(0)
  })

  test('BOTH weddings: sees all sections and can switch US/India', async ({ page }) => {
    await startSignedIn(page, GUESTS[0]!)
    await expect(page.locator('#story')).toBeVisible()
    await expect(page.locator('#details')).toBeVisible()
    await expect(page.locator('#travel')).toBeVisible()
    await expect(page.locator('#registry')).toBeVisible()
    await expect(page.locator('#faq')).toBeVisible()
    // Both invitation => wedding switcher with US + India options
    const switchers = page.getByRole('radiogroup', { name: 'Select wedding' })
    await expect(switchers.first()).toBeVisible()
    await expect(page.getByRole('radio', { name: /US wedding/ }).first()).toBeVisible()
    await expect(page.getByRole('radio', { name: /India wedding/ }).first()).toBeVisible()
  })

  test('US ONLY: sees US, no India, and no switcher', async ({ page }) => {
    await startSignedIn(page, GUESTS[1]!)
    await expect(page.locator('#details')).toBeVisible()
    await expect(page.locator('#travel')).toBeVisible()
    // Single invitation => no wedding switcher
    await expect(page.getByRole('radiogroup', { name: 'Select wedding' })).toHaveCount(0)
    // US venue shown, India venue not
    await expect(page.locator('#details')).toContainText(/Stone Mill|Bronx/i)
    await expect(page.locator('#details')).not.toContainText(/Dwaraka/i)
  })

  test('INDIA ONLY: sees India, no US, and no switcher', async ({ page }) => {
    await startSignedIn(page, GUESTS[2]!)
    await expect(page.locator('#details')).toBeVisible()
    await expect(page.getByRole('radiogroup', { name: 'Select wedding' })).toHaveCount(0)
    await expect(page.locator('#details')).toContainText(/Dwaraka/i)
    await expect(page.locator('#details')).not.toContainText(/Stone Mill|Bronx/i)
  })
})

const CODE_GUEST = {
  id: 'g900',
  title: 'Mr.',
  firstName: 'Email',
  lastName: 'Tester',
  side: 'bride',
  role: 'invited_guest',
  relationship: 'Friend',
  weddings: ['us', 'india'],
  phone: '5550009999',
  email: 'email-tester@example.com',
}

test.describe('Email OTP access', () => {
  test('email code: sign in via 6-digit code reveals gated content', async ({ page }) => {
    await page.route('**/api/content', route =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ source: 'test', guests: [...GUESTS, CODE_GUEST], faq: [], loaded: true }),
      }),
    )
    // Mock OTP + session + writes + EmailJS so no real network / cost.
    await page.route('**/api/otp', async route => {
      const body = route.request().postDataJSON() || {}
      if (body.code === undefined)
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ code: '654321' }) })
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ valid: body.code === '654321' }),
      })
    })
    await page.route('**/api/auth/session', route =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) }),
    )
    await page.route('**/api/guest/**', route =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ updated: 1 }) }),
    )
    await page.route('https://api.emailjs.com/**', route =>
      route.fulfill({ status: 200, contentType: 'text/plain', body: 'OK' }),
    )

    await page.goto('/')
    await expect(page.locator('#hero')).toBeVisible()

    // Open the sign-in modal via the Hero call-to-action (works on mobile + desktop).
    await page.getByText('Sign in to find your invite').click()
    const nameInput = page.getByPlaceholder('Start typing your name')
    await expect(nameInput).toBeVisible()
    await nameInput.fill('Email')
    await page.getByText('Email Tester').first().click()

    // Email "Confirm" is the second Confirm button (phone is first).
    await page.getByRole('button', { name: /^confirm$/i }).nth(1).click()

    const firstCode = page.locator('input[inputmode="numeric"]').first()
    await expect(firstCode).toBeVisible({ timeout: 10000 })
    await firstCode.fill('654321')

    // Signed in => gated content appears.
    await expect(page.locator('#details')).toBeVisible({ timeout: 15000 })
    await page.waitForFunction(() => !!window.localStorage.getItem('wedding_user'), null, { timeout: 15000 })
  })
})
