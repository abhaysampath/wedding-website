/**
 * Daily Guest Report
 * Reads the Google Sheet, analyzes guest activity, and emails a summary.
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
 */

import SHEET_CONFIG from '../api/sheets-config.js'

const {
  GOOGLE_SHEET_ID,
  GOOGLE_SERVICE_EMAIL,
  GOOGLE_PRIVATE_KEY,
  SMTP_USER,
  SMTP_PASS,
  REPORT_RECIPIENT = 'sera.belize@gmail.com',
  DAYS_BETWEEN = '1',
} = process.env

const TAB_RANGES = { guests: 'A:Q' }

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

  const { google } = await import('googleapis')
  const auth = new google.auth.JWT({
    email: GOOGLE_SERVICE_EMAIL,
    key: GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  })
  const sheets = google.sheets({ version: 'v4', auth })

  console.log('Reading sheet...')
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: GOOGLE_SHEET_ID,
    range: `${SHEET_CONFIG.guests.tab}!${TAB_RANGES.guests}`,
  })

  const rows = parseSheet(res.data.values, SHEET_CONFIG.guests.columns)
  const total = rows.length
  const dayThreshold = parseFloat(DAYS_BETWEEN) || 1
  const recentDays = `(last ${dayThreshold}d)`

  const hasLogin = rows.filter((r) => r.lastLogin)
  const noLogin = rows.filter((r) => !r.lastLogin)
  const loginFailed = rows.filter((r) => r.loginFailed && r.loginFailed.toUpperCase() !== 'SUCCESS')
  const recentFailed = loginFailed.filter((r) => daysAgo(r.lastUpdated || r.lastLogin) <= dayThreshold)
  const recentLogins = hasLogin.filter((r) => daysAgo(r.lastLogin) <= dayThreshold)
  const noEmail = rows.filter((r) => !r.email)
  const noPhone = rows.filter((r) => !r.phone)
  const noRsvpUs = rows.filter((r) => !r.rsvpUs)
  const noRsvpIndia = rows.filter((r) => !r.rsvpIndia)

  const lines = []
  lines.push(e('h2', 'Guest Sheet Summary'))
  lines.push(`<p>Report generated: ${new Date().toLocaleString()}</p>`)

  // Overview table
  lines.push(e('h3', 'Overview'))
  lines.push('<table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse">')
  lines.push('<tr><th>Metric</th><th>Count</th></tr>')
  lines.push(`<tr><td>Total guests</td><td>${total}</td></tr>`)
  lines.push(`<tr><td>Logged in</td><td>${hasLogin.length} / ${total}</td></tr>`)
  lines.push(`<tr><td>Never logged in</td><td>${noLogin.length}</td></tr>`)
  lines.push(`<tr><td>Login failures</td><td>${loginFailed.length}</td></tr>`)
  lines.push(`<tr><td>Missing email</td><td>${noEmail.length}</td></tr>`)
  lines.push(`<tr><td>Missing phone</td><td>${noPhone.length}</td></tr>`)
  lines.push(`<tr><td>Missing US RSVP</td><td>${noRsvpUs.length}</td></tr>`)
  lines.push(`<tr><td>Missing India RSVP</td><td>${noRsvpIndia.length}</td></tr>`)
  lines.push('</table>')

  // Recent logins
  if (recentLogins.length > 0) {
    lines.push(e('h3', `Recent Logins ${recentDays}`))
    lines.push('<table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse">')
    lines.push('<tr><th>Name</th><th>Last Login</th></tr>')
    for (const g of recentLogins) {
      const name = `${g.firstName || ''} ${g.lastName || ''}`.trim() || '(no name)'
      lines.push(`<tr><td>${name}</td><td>${g.lastLogin || ''}</td></tr>`)
    }
    lines.push('</table>')
  }

  // Login failures (recent)
  const failuresToShow = recentFailed.length > 0 ? recentFailed : loginFailed.slice(0, 20)
  if (failuresToShow.length > 0) {
    lines.push(e('h3', `Unresolved Login Failures ${recentFailed.length > 0 ? recentDays : '(all time)'}`))
    lines.push('<table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse">')
    lines.push('<tr><th>Name</th><th>Status</th><th>Last Updated</th></tr>')
    for (const g of failuresToShow) {
      const name = `${g.firstName || ''} ${g.lastName || ''}`.trim() || '(no name)'
      lines.push(`<tr><td>${name}</td><td>${g.loginFailed}</td><td>${g.lastUpdated || g.lastLogin || ''}</td></tr>`)
    }
    lines.push('</table>')
  }

  // Guests missing contact info
  const missingContact = rows.filter((r) => !r.email || !r.phone)
  if (missingContact.length > 0) {
    lines.push(e('h3', 'Guests Missing Contact Info'))
    lines.push('<table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse">')
    lines.push('<tr><th>Name</th><th>Has Email</th><th>Has Phone</th><th>Has Address</th></tr>')
    for (const g of missingContact) {
      const name = `${g.firstName || ''} ${g.lastName || ''}`.trim() || '(no name)'
      lines.push(`<tr><td>${name}</td><td>${g.email ? '✅' : '❌'}</td><td>${g.phone ? '✅' : '❌'}</td><td>${g.address ? '✅' : '❌'}</td></tr>`)
    }
    lines.push('</table>')
  }

  const html = `<html><body style="font-family:sans-serif;color:#333;max-width:700px;margin:0 auto;padding:20px">
    ${lines.join('\n')}
  </body></html>`

  const text = `Guest Sheet Summary — ${new Date().toLocaleDateString()}\n\n` +
    `Total: ${total}\n` +
    `Logged in: ${hasLogin.length}/${total}\n` +
    `Never logged in: ${noLogin.length}\n` +
    `Login failures: ${loginFailed.length}\n` +
    `Missing email: ${noEmail.length}\n` +
    `Missing phone: ${noPhone.length}\n` +
    `Missing US RSVP: ${noRsvpUs.length}\n` +
    `Missing India RSVP: ${noRsvpIndia.length}\n`

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
}

main().catch((err) => {
  console.error('Report failed:', err)
  process.exit(1)
})
