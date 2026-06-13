/**
 * Preview Check — Quick visual sanity before deploy.
 * Takes 2 mobile screenshots (most critical views) and emails them.
 *
 * Usage:
 *   node scripts/preview-check.mjs <url>
 *
 * Env vars (email):
 *   SMTP_USER, SMTP_PASS  — Gmail app password
 *   SCREENSHOT_RECIPIENT  — where to send (default: REPORT_RECIPIENT)
 */

import { chromium } from 'playwright'
import { existsSync, mkdirSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { createTransport } from 'nodemailer'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT = resolve(__dirname, '..', 'screenshots')
const URL = process.argv[2] || 'http://localhost:3000'
const RECIPIENT = process.env.SCREENSHOT_RECIPIENT || process.env.REPORT_RECIPIENT

async function main() {
  console.log(`📱 Preview Check\n   Target: ${URL}\n`)

  if (!existsSync(OUT)) mkdirSync(OUT, { recursive: true })

  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
  })

  try {
    // ── Screenshot 1: Unauthenticated landing page ──────────
    console.log('  1/2  Unauthenticated — home')
    const page1 = await context.newPage()
    await page1.goto(URL, { waitUntil: 'networkidle0', timeout: 30000 })
    await page1.screenshot({ path: resolve(OUT, 'unauthenticated-home.png'), fullPage: false })
    await page1.close()

    // ── Screenshot 2: Invited guest — event details ─────────
    console.log('  2/2  Invited guest — event details')
    const page2 = await context.newPage()
    await page2.addInitScript(() => {
      localStorage.setItem('wedding_user', JSON.stringify({
        id: 'g-preview',
        firstName: 'Preview',
        lastName: 'Guest',
        side: 'groom',
        role: 'invited_guest',
        relationship: 'Friend of Couple',
        weddings: ['us', 'india'],
        phone: '+15555550100',
        lastLogin: new Date().toISOString(),
        uid: null,
        email: '',
        plusOne: false,
        address: '',
        dietaryPreferences: '',
      }))
    })
    await page2.goto(URL, { waitUntil: 'networkidle0', timeout: 30000 })
    // Navigate to event details
    await page2.evaluate(() => {
      const el = document.getElementById('details')
      if (el) el.scrollIntoView({ block: 'start' })
    })
    await page2.waitForTimeout(800)
    await page2.screenshot({ path: resolve(OUT, 'invited-guest-details.png'), fullPage: false })
    await page2.close()

    // ── Email ─────────────────────────────────────────────
    const { SMTP_USER, SMTP_PASS } = process.env
    if (SMTP_USER && SMTP_PASS && RECIPIENT) {
      const transporter = createTransport({
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        auth: { user: SMTP_USER, pass: SMTP_PASS },
      })
      await transporter.sendMail({
        from: SMTP_USER,
        to: RECIPIENT,
        subject: `👀 Preview Check — ${new Date().toLocaleDateString()}`,
        html: `
          <h2>Preview Check</h2>
          <p><strong>Target:</strong> ${URL}</p>
          <hr/>
          <h3>1. Unauthenticated — Landing Page</h3>
          <img src="cid:unauthenticated-home" width="390" style="border:1px solid #ddd;border-radius:4px"/>
          <h3>2. Invited Guest — Event Details</h3>
          <img src="cid:invited-guest-details" width="390" style="border:1px solid #ddd;border-radius:4px"/>
        `,
        attachments: [
          { filename: 'unauthenticated-home.png', path: resolve(OUT, 'unauthenticated-home.png'), cid: 'unauthenticated-home' },
          { filename: 'invited-guest-details.png', path: resolve(OUT, 'invited-guest-details.png'), cid: 'invited-guest-details' },
        ],
      })
      console.log(`\n📧 Sent to ${RECIPIENT}`)
    } else {
      console.log('\n⚠️  SMTP not configured — skipping email')
    }

    console.log('\n✅ Done')
  } finally {
    await browser.close()
  }
}

main().catch(err => {
  console.error('❌', err)
  process.exit(1)
})
