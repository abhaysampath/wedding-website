/**
 * Email CI test failures to the same recipient as the other summaries
 * (Daily Guest Report / Status Check).
 *
 * Designed to run in a GitHub Actions `if: failure()` step. It is best-effort:
 * it never throws (exits 0) so it can't mask or worsen the original failure.
 *
 * Env:
 *   SMTP_USER, SMTP_PASS         — Gmail SMTP credentials (required to send)
 *   REPORT_RECIPIENT             — or NOTIFICATION_EMAIL
 *   FAILURE_STAGE                — human label for what failed (optional)
 *   VITEST_JSON                  — path to Vitest JSON reporter output
 *   PLAYWRIGHT_JSON              — path to Playwright JSON reporter output
 *   GITHUB_*                     — provided automatically by GitHub Actions
 */

import { existsSync, readFileSync } from 'fs'

const RECIPIENT = (process.env.REPORT_RECIPIENT || process.env.NOTIFICATION_EMAIL || '').trim()
const SMTP_USER = process.env.SMTP_USER
const SMTP_PASS = process.env.SMTP_PASS

const GITHUB = {
  repo: process.env.GITHUB_REPOSITORY || '',
  branch: process.env.GITHUB_REF_NAME || '',
  sha: (process.env.GITHUB_SHA || '').slice(0, 7),
  actor: process.env.GITHUB_ACTOR || '',
  workflow: process.env.GITHUB_WORKFLOW || '',
  event: process.env.GITHUB_EVENT_NAME || '',
  server: process.env.GITHUB_SERVER_URL || 'https://github.com',
  runId: process.env.GITHUB_RUN_ID || '',
}
const RUN_URL =
  GITHUB.repo && GITHUB.runId ? `${GITHUB.server}/${GITHUB.repo}/actions/runs/${GITHUB.runId}` : ''
const STAGE = process.env.FAILURE_STAGE || 'CI'

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function readJson(path) {
  try {
    if (path && existsSync(path)) return JSON.parse(readFileSync(path, 'utf8'))
  } catch (err) {
    console.warn(`Could not parse ${path}:`, err.message)
  }
  return null
}

function extractVitest(json) {
  const out = []
  if (!json) return out
  for (const tr of json.testResults || []) {
    const file = tr.name || tr.testFilePath || ''
    for (const a of tr.assertionResults || []) {
      if (a.status === 'failed') {
        out.push({
          file,
          title: a.fullName || a.title || '(untitled)',
          message: (a.failureMessages || []).join('\n').split('\n').slice(0, 6).join('\n'),
        })
      }
    }
  }
  return out
}

function extractPlaywright(json) {
  const out = []
  if (!json) return out

  function walk(suite, path) {
    const cur = suite.title ? [...path, suite.title] : path
    for (const spec of suite.specs || []) {
      const results = spec.tests?.flatMap(t => t.results || []) || []
      const failedResult = results.find(r => r.status && !['passed', 'skipped'].includes(r.status))
      if (spec.ok === false || failedResult) {
        out.push({
          title: [...cur, spec.title].filter(Boolean).join(' › '),
          message: failedResult?.error?.message || '',
        })
      }
    }
    for (const child of suite.suites || []) walk(child, cur)
  }

  for (const s of json.suites || []) walk(s, [])
  for (const err of json.errors || []) {
    if (err?.message) out.push({ title: '(global error)', message: err.message })
  }
  return out
}

async function main() {
  const vitestFailures = extractVitest(readJson(process.env.VITEST_JSON))
  const playwrightFailures = extractPlaywright(readJson(process.env.PLAYWRIGHT_JSON))

  const rows = []
  rows.push('<h2 style="color:#b00020">🔴 CI failure</h2>')
  rows.push(
    '<table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse">',
  )
  if (GITHUB.workflow) rows.push(`<tr><td><b>Workflow</b></td><td>${esc(GITHUB.workflow)}</td></tr>`)
  if (GITHUB.repo) rows.push(`<tr><td><b>Repo</b></td><td>${esc(GITHUB.repo)}</td></tr>`)
  if (GITHUB.branch)
    rows.push(`<tr><td><b>Branch</b></td><td>${esc(GITHUB.branch)}</td></tr>`)
  if (GITHUB.sha) rows.push(`<tr><td><b>Commit</b></td><td><code>${esc(GITHUB.sha)}</code></td></tr>`)
  if (GITHUB.actor) rows.push(`<tr><td><b>Triggered by</b></td><td>${esc(GITHUB.actor)}</td></tr>`)
  if (GITHUB.event) rows.push(`<tr><td><b>Event</b></td><td>${esc(GITHUB.event)}</td></tr>`)
  rows.push(`<tr><td><b>Likely stage</b></td><td>${esc(STAGE)}</td></tr>`)
  if (RUN_URL)
    rows.push(
      `<tr><td><b>Run</b></td><td><a href="${esc(RUN_URL)}">${esc(RUN_URL)}</a></td></tr>`,
    )
  rows.push('</table>')

  const section = (title, list) => {
    if (list.length === 0) return
    rows.push(`<h3>${esc(title)} (${list.length})</h3>`)
    for (const f of list) {
      rows.push(
        `<p style="margin:6px 0"><b>❌ ${esc(f.title)}</b>${
          f.file ? ` <span style="color:#888">— ${esc(f.file)}</span>` : ''
        }${f.message ? `<br/><pre style="white-space:pre-wrap;background:#f6f6f6;padding:8px;border-radius:4px">${esc(f.message)}</pre>` : ''}</p>`,
      )
    }
  }

  section('Failed unit tests (Vitest)', vitestFailures)
  section('Failed browser tests (Playwright)', playwrightFailures)

  if (vitestFailures.length === 0 && playwrightFailures.length === 0) {
    rows.push(
      '<p>No unit or browser test failures were recorded — an earlier step (lint, format, typecheck, build, or a deploy/E2E step) most likely failed. Open the run link above for the exact step and logs.</p>',
    )
  }

  const html = `<html><body style="font-family:sans-serif;color:#333;max-width:760px;margin:0 auto;padding:20px">${rows.join('\n')}</body></html>`
  const text =
    `CI failure — ${GITHUB.workflow || 'workflow'}\n` +
    `Stage: ${STAGE}\n` +
    `Repo: ${GITHUB.repo}  Branch: ${GITHUB.branch}  Commit: ${GITHUB.sha}\n` +
    (RUN_URL ? `Run: ${RUN_URL}\n` : '') +
    `\nUnit test failures: ${vitestFailures.length}\n` +
    vitestFailures.map(f => `  ❌ ${f.title}${f.file ? ` (${f.file})` : ''}`).join('\n') +
    `\nBrowser test failures: ${playwrightFailures.length}\n` +
    playwrightFailures.map(f => `  ❌ ${f.title}`).join('\n')

  if (process.env.DRY_RUN) {
    console.log('--- DRY RUN (no email sent) ---')
    console.log(text)
    console.log(`[vitest failures: ${vitestFailures.length}, playwright failures: ${playwrightFailures.length}]`)
    return
  }

  if (!RECIPIENT || !SMTP_USER || !SMTP_PASS) {
    console.log(
      `Skipping failure email — SMTP_USER/SMTP_PASS or recipient not configured (non-fatal). Would report ${vitestFailures.length} unit + ${playwrightFailures.length} browser failures.`,
    )
    return
  }

  const nodemailer = await import('nodemailer')
  const transporter = nodemailer.default.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  })
  await transporter.sendMail({
    from: SMTP_USER,
    to: RECIPIENT,
    subject: `🔴 CI failed: ${GITHUB.workflow || 'workflow'}${GITHUB.branch ? ` on ${GITHUB.branch}` : ''}${GITHUB.sha ? ` (${GITHUB.sha})` : ''}`,
    text,
    html,
  })
  console.log(`Failure email sent to ${RECIPIENT}`)
}

main()
  .catch(err => {
    // Never fail the job because notifying failed.
    console.error('notify-test-failures error (non-fatal):', err?.message || err)
  })
  .finally(() => process.exit(0))
