/**
 * Pre-deploy Screenshot Review
 * Takes mobile screenshots for all roles and emails them via SMTP.
 *
 * Usage:
 *   node scripts/predeploy-screenshots.mjs <url>
 *   Requires env: SMTP_USER, SMTP_PASS, SCREENSHOT_RECIPIENT
 */

import { chromium } from 'playwright'
import { existsSync, mkdirSync, readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { createTransport } from 'nodemailer'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT = resolve(__dirname, '..', 'screenshots')
const URL = process.argv[2] || 'http://localhost:3000'

const RECIPIENT = process.env.SCREENSHOT_RECIPIENT || process.env.REPORT_RECIPIENT

const guests = [
  { name: 'unauthenticated', user: null },
  { name: 'bride', user: { id: 'g1000', firstName: 'Test', lastName: 'Bride', side: 'bride', relationship: 'The Bride', role: 'bride', weddings: ['us', 'india'], phone: '+15555550100' } },
  { name: 'groom', user: { id: 'g1001', firstName: 'Test', lastName: 'Groom', side: 'groom', relationship: 'The Groom', role: 'groom', weddings: ['us', 'india'], phone: '+15555550100' } },
  { name: 'close-family', user: { id: 'g1002', firstName: 'Test', lastName: 'CloseFamily', side: 'bride', relationship: "Abhay's Family", role: 'close_family', weddings: ['us', 'india'], phone: '+15555550100' } },
  { name: 'vendor', user: { id: 'g1003', firstName: 'Test', lastName: 'Vendor', side: 'bride', relationship: 'Vendor', role: 'vendor', weddings: ['us', 'india'], phone: '+15555550100' } },
  { name: 'invited-guest', user: { id: 'g1004', firstName: 'Test', lastName: 'Guest', side: 'groom', relationship: 'Friend of Couple', role: 'invited_guest', weddings: ['us', 'india'], phone: '+15555550100' } },
]

const sections = ['home', 'details', 'gallery']

function buildGuestPayload(user) {
  return {
    ...user,
    lastLogin: new Date().toISOString(),
    uid: null,
    email: '',
    plusOne: false,
    address: '',
    dietaryPreferences: '',
  }
}

async function takeScreenshots(browser) {
  if (!existsSync(OUT)) mkdirSync(OUT, { recursive: true })

  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
  })

  const results = []

  for (const guest of guests) {
    console.log(`\n👤 ${guest.name}`)
    const page = await context.newPage()

    if (guest.user) {
      const payload = buildGuestPayload(guest.user)
      await page.addInitScript((g) => {
        localStorage.setItem('wedding_user', JSON.stringify(g))
      }, payload)
    }

    await page.goto(URL, { waitUntil: 'networkidle0', timeout: 30000 })

    for (const section of sections) {
      const name = `${guest.name}-${section}`
      console.log(`  📸 ${name}`)

      if (section === 'details') {
        await page.evaluate(() => {
          const el = document.getElementById('details')
          if (el) el.scrollIntoView({ block: 'start' })
        })
        await page.waitForTimeout(800)
      } else if (section === 'gallery') {
        await page.evaluate(() => {
          const headings = document.querySelectorAll('h2')
          for (const h of headings) {
            if (h.textContent === 'Gallery') {
              h.scrollIntoView({ block: 'start' })
              break
            }
          }
        })
        await page.waitForTimeout(4000)
      }

      await page.screenshot({ path: resolve(OUT, `${name}.png`), fullPage: false })
      results.push(name)
    }

    await page.close()
  }

  await context.close()
  return results
}

async function emailScreenshots(results) {
  const { SMTP_USER, SMTP_PASS } = process.env

  if (!SMTP_USER || !SMTP_PASS) {
    console.log('⚠️  SMTP not configured — skipping email')
    return
  }

  const transporter = createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  })

  const attachments = results.map((name) => ({
    filename: `${name}.png`,
    path: resolve(OUT, `${name}.png`),
    cid: name,
  }))

  const roleGroups = {}
  for (const name of results) {
    const role = name.replace(/-(home|details|gallery)$/, '')
    if (!roleGroups[role]) roleGroups[role] = []
    roleGroups[role].push(name)
  }

  const summaryHtml = Object.entries(roleGroups).map(([role, shots]) =>
    `<div style="margin:16px 0">
      <h3 style="margin:0 0 8px">${role.replace('-', ' ')}</h3>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        ${shots.map(s => `<img src="cid:${s}" width="120" style="border:1px solid #ddd;border-radius:4px" />`).join('\n        ')}
      </div>
    </div>`
  ).join('\n')

  const info = await transporter.sendMail({
    from: SMTP_USER,
    to: RECIPIENT,
    subject: `📱 Pre-deploy Screenshots — ${new Date().toLocaleDateString()}`,
    html: `
      <h2>Pre-deploy Visual Review</h2>
      <p>${results.length} screenshots from ${Object.keys(roleGroups).length} roles</p>
      <p><strong>Target:</strong> ${URL}</p>
      <hr/>
      ${summaryHtml}
    `,
    attachments,
  })

  console.log(`\n📧 Emailed ${results.length} screenshots to ${RECIPIENT} (message id: ${info.messageId})`)
}

async function main() {
  console.log(`📱 Pre-deploy Screenshots\n   Target: ${URL}\n`)

  const browser = await chromium.launch({ headless: true })

  try {
    const results = await takeScreenshots(browser)
    console.log(`\n✅ ${results.length} screenshots saved to ${OUT}`)
    await emailScreenshots(results)
  } finally {
    await browser.close()
  }
}

main().catch(err => {
  console.error('❌', err)
  process.exit(1)
})
