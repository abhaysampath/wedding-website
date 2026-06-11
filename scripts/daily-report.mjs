/**
 * Daily Guest Report
 * Reads the Google Sheet, analyzes guest activity, and emails a combined summary.
 *
 * Frequency: controlled by the cron schedule in .github/workflows/daily-report.yml
 * To change how often this runs, edit the `cron` value there.
 *
 * Required env vars:
 *   GOOGLE_SHEET_ID, GOOGLE_SERVICE_EMAIL, GOOGLE_PRIVATE_KEY  (sheet access)
 *   SMTP_USER, SMTP_PASS                                       (Gmail SMTP credentials)
 *
 * Optional:
 *   REPORT_RECIPIENT  — email to send to (default: sera.belize@gmail.com)
 *   DAYS_BETWEEN      — only flag logins/updates within this many days (default: 1)
 *   SITE_URL          — production URL for link validation (default: https://abhayandrebecca.com)
 */

import { readdirSync, statSync, writeFileSync, existsSync } from 'fs'
import { join, relative } from 'path'
import { fileURLToPath } from 'url'
import SHEET_CONFIG from '../api/sheets-config.js'

const {
  GOOGLE_SHEET_ID,
  GOOGLE_SERVICE_EMAIL,
  GOOGLE_PRIVATE_KEY,
  SMTP_USER,
  SMTP_PASS,
  REPORT_RECIPIENT = 'sera.belize@gmail.com',
  DAYS_BETWEEN = '1',
  SITE_URL = 'https://abhayandrebecca.com',
} = process.env

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const ROOT = join(__dirname, '..')
const PICS_DIR = join(ROOT, 'public', 'pics')
const BACKUP_PATH = join(ROOT, 'public', 'guests-backup.json')

const TAB_RANGES = { guests: 'A:Q' }
const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.avif'])
const PIC_DIRS = ['home', 'vert', 'gallery']
const CDN_BASE = 'https://cdn.jsdelivr.net/gh/abhaysampath/wedding-website@main/public/pics'

function e(tag, content) {
  return `<${tag}>${content}</${tag}>`
}

function sanitizeCell(val) {
  const v = (val || '').trim()
  return v.startsWith('#') ? '' : v
}

function parseSheet(values, columnConfig) {
  if (!values || values.length < 2) return []
  const [headerRow, ...dataRows] = values
  const indexMap = {}
  for (const [fieldName, headerLabel] of Object.entries(columnConfig)) {
    const idx = headerRow.findIndex(
      (h) => h.trim().toLowerCase() === headerLabel.toLowerCase()
    )
    if (idx !== -1) indexMap[fieldName] = idx
  }
  return dataRows.map((row) => {
    const obj = {}
    for (const [fieldName, idx] of Object.entries(indexMap)) {
      obj[fieldName] = sanitizeCell(row[idx])
    }
    return obj
  })
}

function daysAgo(dateStr) {
  if (!dateStr) return Infinity
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return Infinity
  return (Date.now() - d.getTime()) / (1000 * 60 * 60 * 24)
}

function collectImageFiles(dir) {
  const results = []
  for (const subdir of PIC_DIRS) {
    const full = join(dir, subdir)
    if (!existsSync(full)) continue
    for (const f of readdirSync(full)) {
      const ext = f.toLowerCase().slice(f.lastIndexOf('.'))
      if (IMAGE_EXTENSIONS.has(ext)) {
        results.push({ file: f, subdir, url: `${CDN_BASE}/${subdir}/${f}` })
      }
    }
  }
  return results
}

function chunkedSettle(items, fn, limit = 10) {
  const results = []
  const chunks = []
  for (let i = 0; i < items.length; i += limit) {
    chunks.push(items.slice(i, i + limit))
  }
  return chunks.reduce(async (prev, chunk) => {
    await prev
    const settled = await Promise.allSettled(chunk.map(fn))
    results.push(...settled)
    return results
  }, Promise.resolve())
}

function nameStr(g) {
  return `${g.firstName || ''} ${g.lastName || ''}`.trim() || '(no name)'
}

async function main() {
  const missing = []
  if (!GOOGLE_SHEET_ID) missing.push('GOOGLE_SHEET_ID')
  if (!GOOGLE_SERVICE_EMAIL) missing.push('GOOGLE_SERVICE_EMAIL')
  if (!GOOGLE_PRIVATE_KEY) missing.push('GOOGLE_PRIVATE_KEY')
  if (!SMTP_USER) missing.push('SMTP_USER')
  if (!SMTP_PASS) missing.push('SMTP_PASS')
  if (missing.length > 0) {
    console.error(`Missing env vars: ${missing.join(', ')}`)
    process.exit(1)
  }

  const { JWT } = await import('google-auth-library')
  const { sheets } = await import('@googleapis/sheets')
  const auth = new JWT({
    email: GOOGLE_SERVICE_EMAIL,
    key: GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  })
  const sheetsApi = sheets({ version: 'v4', auth })

  console.log('Reading sheet...')
  const res = await sheetsApi.spreadsheets.values.get({
    spreadsheetId: GOOGLE_SHEET_ID,
    range: `${SHEET_CONFIG.guests.tab}!${TAB_RANGES.guests}`,
  })

  const rows = parseSheet(res.data.values, SHEET_CONFIG.guests.columns)
  const total = rows.length
  const dayThreshold = parseFloat(DAYS_BETWEEN) || 1
  const recentDays = `(last ${dayThreshold}d)`

  // ── Guest Summary Stats ──────────────────────────────────

  const hasLogin = rows.filter((r) => r.lastLogin)
  const noLogin = rows.filter((r) => !r.lastLogin)
  const loginFailed = rows.filter((r) => r.loginFailed && r.loginFailed.toUpperCase() !== 'SUCCESS')
  const recentFailed = loginFailed.filter((r) => daysAgo(r.lastUpdated || r.lastLogin) <= dayThreshold)
  const recentLogins = hasLogin.filter((r) => daysAgo(r.lastLogin) <= dayThreshold)
  const noEmail = rows.filter((r) => !r.email)
  const noPhone = rows.filter((r) => !r.phone)
  const rsvpUsYes = rows.filter((r) => r.rsvpUs && r.rsvpUs.toUpperCase() === 'YES').length
  const rsvpUsNo = rows.filter((r) => r.rsvpUs && r.rsvpUs.toUpperCase() === 'NO').length
  const rsvpUsPending = rows.filter((r) => !r.rsvpUs).length
  const rsvpIndiaYes = rows.filter((r) => r.rsvpIndia && r.rsvpIndia.toUpperCase() === 'YES').length
  const rsvpIndiaNo = rows.filter((r) => r.rsvpIndia && r.rsvpIndia.toUpperCase() === 'NO').length
  const rsvpIndiaPending = rows.filter((r) => !r.rsvpIndia).length

  // ── Image Dead Link Check ────────────────────────────────

  console.log('Checking images...')
  const images = collectImageFiles(PICS_DIR)
  const brokenImages = []
  await chunkedSettle(images, async (img) => {
    try {
      const resp = await fetch(img.url, { method: 'HEAD' })
      if (!resp.ok) brokenImages.push({ ...img, status: resp.status })
    } catch {
      brokenImages.push({ ...img, status: 'FETCH_ERROR' })
    }
  }, 10)

  // ── Guest Link Validation ────────────────────────────────

  console.log('Validating guest links...')
  const brokenLinks = []
  await chunkedSettle(rows, async (g) => {
    const name = nameStr(g)
    if (!name) return
    const slug = name.toLowerCase().replace(/\s+/g, '-')
    const url = `${SITE_URL}/g/${encodeURIComponent(slug)}`
    try {
      const resp = await fetch(url)
      if (resp.status === 404) brokenLinks.push({ name, url, status: resp.status })
    } catch {
      brokenLinks.push({ name, url, status: 'FETCH_ERROR' })
    }
  }, 10)

  // ── Duplicate Contact Detector ───────────────────────────

  console.log('Checking for duplicate contacts...')
  const phoneMap = {}
  const emailMap = {}
  for (const g of rows) {
    const phone = g.phone?.replace(/\D/g, '')
    if (phone && phone.length >= 10) {
      if (!phoneMap[phone]) phoneMap[phone] = []
      phoneMap[phone].push(g)
    }
    const email = (g.email || '').trim().toLowerCase()
    if (email) {
      if (!emailMap[email]) emailMap[email] = []
      emailMap[email].push(g)
    }
  }
  const dupPhones = Object.values(phoneMap).filter((a) => a.length > 1)
  const dupEmails = Object.values(emailMap).filter((a) => a.length > 1)

  // ── Build Report ─────────────────────────────────────────

  const lines = []
  lines.push(e('h2', 'Daily Guest Report'))
  lines.push(`<p>Generated: ${new Date().toLocaleString()}</p>`)
  lines.push(`<hr/>`)

  // ── Section: Guest Summary ───────────────────────────────

  lines.push(e('h3', 'Guest Overview'))
  lines.push('<table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse">')
  lines.push('<tr><th>Metric</th><th>Count</th></tr>')
  lines.push(`<tr><td>Total guests</td><td>${total}</td></tr>`)
  lines.push(`<tr><td>Logged in</td><td>${hasLogin.length} / ${total}</td></tr>`)
  lines.push(`<tr><td>Never logged in</td><td>${noLogin.length}</td></tr>`)
  lines.push(`<tr><td>Login failures</td><td>${loginFailed.length}</td></tr>`)
  lines.push(`<tr><td>Missing email</td><td>${noEmail.length}</td></tr>`)
  lines.push(`<tr><td>Missing phone</td><td>${noPhone.length}</td></tr>`)
  lines.push('</table>')

  lines.push(e('h3', 'RSVP — US Wedding'))
  lines.push('<table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse">')
  lines.push('<tr><th>Status</th><th>Count</th></tr>')
  lines.push(`<tr><td>Yes</td><td>${rsvpUsYes}</td></tr>`)
  lines.push(`<tr><td>No</td><td>${rsvpUsNo}</td></tr>`)
  lines.push(`<tr><td>Pending</td><td>${rsvpUsPending}</td></tr>`)
  lines.push('</table>')

  lines.push(e('h3', 'RSVP — India Wedding'))
  lines.push('<table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse">')
  lines.push('<tr><th>Status</th><th>Count</th></tr>')
  lines.push(`<tr><td>Yes</td><td>${rsvpIndiaYes}</td></tr>`)
  lines.push(`<tr><td>No</td><td>${rsvpIndiaNo}</td></tr>`)
  lines.push(`<tr><td>Pending</td><td>${rsvpIndiaPending}</td></tr>`)
  lines.push('</table>')

  if (recentLogins.length > 0) {
    lines.push(e('h3', `Recent Logins ${recentDays}`))
    lines.push('<table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse">')
    lines.push('<tr><th>Name</th><th>Last Login</th></tr>')
    for (const g of recentLogins) {
      lines.push(`<tr><td>${nameStr(g)}</td><td>${g.lastLogin || ''}</td></tr>`)
    }
    lines.push('</table>')
  }

  const failuresToShow = recentFailed.length > 0 ? recentFailed : loginFailed.slice(0, 20)
  if (failuresToShow.length > 0) {
    lines.push(e('h3', `Unresolved Login Failures ${recentFailed.length > 0 ? recentDays : '(all time)'}`))
    lines.push('<table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse">')
    lines.push('<tr><th>Name</th><th>Status</th><th>Last Updated</th></tr>')
    for (const g of failuresToShow) {
      lines.push(`<tr><td>${nameStr(g)}</td><td>${g.loginFailed}</td><td>${g.lastUpdated || g.lastLogin || ''}</td></tr>`)
    }
    lines.push('</table>')
  }

  const missingContact = rows.filter((r) => !r.email || !r.phone)
  if (missingContact.length > 0) {
    lines.push(e('h3', 'Guests Missing Contact Info'))
    lines.push('<table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse">')
    lines.push('<tr><th>Name</th><th>Has Email</th><th>Has Phone</th><th>Has Address</th></tr>')
    for (const g of missingContact) {
      lines.push(`<tr><td>${nameStr(g)}</td><td>${g.email ? '✅' : '❌'}</td><td>${g.phone ? '✅' : '❌'}</td><td>${g.address ? '✅' : '❌'}</td></tr>`)
    }
    lines.push('</table>')
  }

  // ── Section: Duplicate Contacts ──────────────────────────

  if (dupPhones.length > 0 || dupEmails.length > 0) {
    lines.push(e('h3', 'Duplicate Contacts'))
    for (const group of dupPhones) {
      lines.push(`<p><strong>⚠️ Phone:</strong> ${group[0].phone} shared by: ${group.map((g) => nameStr(g)).join(', ')}</p>`)
    }
    for (const group of dupEmails) {
      lines.push(`<p><strong>⚠️ Email:</strong> ${group[0].email} shared by: ${group.map((g) => nameStr(g)).join(', ')}</p>`)
    }
  }

  // ── Section: Broken Images ───────────────────────────────

  if (brokenImages.length > 0) {
    lines.push(e('h3', `Broken Images (${brokenImages.length})`))
    for (const img of brokenImages) {
      lines.push(`<p>❌ <code>${img.subdir}/${img.file}</code> — HTTP ${img.status}</p>`)
    }
  } else {
    lines.push(`<p>✅ All ${images.length} images loaded successfully.</p>`)
  }

  // ── Section: Broken Guest Links ──────────────────────────

  if (brokenLinks.length > 0) {
    lines.push(e('h3', `Broken Guest Links (${brokenLinks.length})`))
    for (const link of brokenLinks) {
      lines.push(`<p>❌ ${link.name} — <code>${link.url}</code> — HTTP ${link.status}</p>`)
    }
  } else {
    lines.push(`<p>✅ All ${rows.length} guest links resolved.</p>`)
  }

  // ── Section: Sheet Backup ────────────────────────────────

  const backupData = {
    exportedAt: new Date().toISOString(),
    source: SHEET_CONFIG.guests.tab,
    totalGuests: total,
    guests: rows,
  }
  writeFileSync(BACKUP_PATH, JSON.stringify(backupData, null, 2))
  lines.push(`<p>📦 Sheet backup saved as <code>guests-backup.json</code> (artifact available in Actions run).</p>`)

  // ── Send Email ───────────────────────────────────────────

  const html = `<html><body style="font-family:sans-serif;color:#333;max-width:700px;margin:0 auto;padding:20px">
    ${lines.join('\n')}
  </body></html>`

  const text =
    `Daily Guest Report — ${new Date().toLocaleDateString()}\n\n` +
    `Total: ${total}\n` +
    `Logged in: ${hasLogin.length}/${total}\n` +
    `Never logged in: ${noLogin.length}\n` +
    `Login failures: ${loginFailed.length}\n` +
    `Missing email: ${noEmail.length}\n` +
    `Missing phone: ${noPhone.length}\n` +
    `\nRSVP — US Wedding: Yes ${rsvpUsYes} / No ${rsvpUsNo} / Pending ${rsvpUsPending}\n` +
    `RSVP — India Wedding: Yes ${rsvpIndiaYes} / No ${rsvpIndiaNo} / Pending ${rsvpIndiaPending}\n\n` +
    (brokenImages.length > 0 ? `Broken images: ${brokenImages.length}\n` : 'All images OK.\n') +
    (brokenLinks.length > 0 ? `Broken guest links: ${brokenLinks.length}\n` : 'All guest links OK.\n') +
    (dupPhones.length > 0 || dupEmails.length > 0 ? `Duplicate contacts found.\n` : 'No duplicate contacts.\n')

  console.log('Sending report...')
  const nodemailer = await import('nodemailer')
  const transporter = nodemailer.default.createTransport({
    service: 'gmail',
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  })

  await transporter.sendMail({
    from: SMTP_USER,
    to: REPORT_RECIPIENT,
    subject: `Guest Report — ${new Date().toLocaleDateString()}`,
    text,
    html,
  })

  console.log('Report sent to', REPORT_RECIPIENT)
  console.log(`Images checked: ${images.length}, broken: ${brokenImages.length}`)
  console.log(`Links checked: ${rows.length}, broken: ${brokenLinks.length}`)
  console.log(`Backup written to: ${BACKUP_PATH}`)
}

main().catch((err) => {
  console.error('Report failed:', err)
  process.exit(1)
})
