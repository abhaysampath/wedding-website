/**
 * Status Check Script
 * Checks the production site is healthy and emails a report on failure.
 *
 * Usage:
 *   node scripts/status-check.mjs
 *
 * Required env vars (for email):
 *   EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, EMAILJS_PUBLIC_KEY
 *   STATUS_RECIPIENT  — email to send alerts to
 *
 * Optional:
 *   SITE_URL  — production URL (default: https://abhayandrebecca.com)
 */

const SITE_URL = process.env.SITE_URL || 'https://abhayandrebecca.com'
const RECIPIENT = process.env.STATUS_RECIPIENT || process.env.REPORT_RECIPIENT

const checks = []

function check(name, ok, detail) {
  checks.push({ name, ok, detail })
  const icon = ok ? '✅' : '❌'
  console.log(`  ${icon} ${name}${detail ? ` — ${detail}` : ''}`)
}

async function main() {
  console.log(`\n🔍 Status Check\n   Target: ${SITE_URL}\n`)

  // ── 1. HTTP 200 ──────────────────────────────
  try {
    const res = await fetch(SITE_URL)
    check('HTTP 200', res.status === 200, `${res.status}`)
  } catch (err) {
    check('HTTP 200', false, err.message)
  }

  // ── 2. HTML response ──────────────────────────
  try {
    const res = await fetch(SITE_URL)
    const text = await res.text()
    check('Returns HTML', text.includes('<!DOCTYPE html>') || text.includes('<html'))
  } catch (err) {
    check('Returns HTML', false, err.message)
  }

  // ── 3. Key content present ────────────────────
  try {
    const res = await fetch(SITE_URL)
    const text = await res.text()
    const contentChecks = [
      ['Site title', 'Rebecca & Abhay'],
      ['Gallery section', 'Gallery'],
      ['Sign-in prompt', 'Sign in to find your invite'],
    ]
    for (const [label, keyword] of contentChecks) {
      check(label, text.includes(keyword))
    }
  } catch (err) {
    check('Content checks', false, err.message)
  }

  // ── 4. Response time ──────────────────────────
  try {
    const start = Date.now()
    await fetch(SITE_URL)
    const elapsed = Date.now() - start
    check('Response time < 5s', elapsed < 5000, `${elapsed}ms`)
  } catch (err) {
    check('Response time', false, err.message)
  }

  // ── Summary ────────────────────────────────────
  const failed = checks.filter(c => !c.ok)
  console.log(`\n📊 ${checks.length} checks: ${checks.length - failed.length} passed, ${failed.length} failed\n`)

  // ── Email alert on failure ─────────────────────
  if (failed.length > 0 && RECIPIENT) {
    await sendAlert(failed)
  }

  process.exit(failed.length > 0 ? 1 : 0)
}

async function sendAlert(failed) {
  const {
    EMAILJS_SERVICE_ID,
    EMAILJS_TEMPLATE_ID,
    EMAILJS_PUBLIC_KEY,
  } = process.env

  if (!EMAILJS_SERVICE_ID || !EMAILJS_TEMPLATE_ID || !EMAILJS_PUBLIC_KEY) {
    console.log('⚠️  EmailJS not configured — skipping alert')
    return
  }

  const message = [
    `Status Check FAILED — ${new Date().toLocaleString()}`,
    '',
    `Site: ${SITE_URL}`,
    `Failed: ${failed.length}/${checks.length}`,
    '',
    ...failed.map(c => `❌ ${c.name}${c.detail ? ` — ${c.detail}` : ''}`),
  ].join('\n')

  const resp = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      service_id: EMAILJS_SERVICE_ID,
      template_id: EMAILJS_TEMPLATE_ID,
      user_id: EMAILJS_PUBLIC_KEY,
      template_params: {
        email: RECIPIENT,
        name: 'Status Check',
        contact_type: 'status-check',
        subject: `⚠️ Site Alert: ${failed.length} check(s) failed`,
        message,
      },
    }),
  })

  if (resp.ok) {
    console.log(`📧 Alert sent to ${RECIPIENT}`)
  } else {
    console.error(`📧 Failed to send alert: ${resp.status} ${await resp.text()}`)
  }
}

main()
