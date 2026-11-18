/**
 * Seed the three E2E test guests into the GUESTS tab — SAFELY and SCOPED.
 *
 * Guarantees:
 *  - Only rows whose Title === "TEST" AND whose (First Name, Last Name) matches
 *    one of the three known test guests are ever written.
 *  - Existing test rows are updated in place; missing ones are appended.
 *  - No other row is touched. The script prints exactly which rows change.
 *  - Idempotent: re-running only writes fields that actually differ.
 *
 * Headers are detected dynamically, so it works whether the invitation column is
 * "Invited To" or "Both Weddings", and whether email is "Email Address" or
 * "Email Address"/"Plus One Email Address" etc.
 *
 * Usage:
 *   node --env-file=.env scripts/seed-test-guests.mjs            # dry-run
 *   node --env-file=.env scripts/seed-test-guests.mjs --apply    # write
 */

import { google } from 'googleapis'
import SHEET_CONFIG from '../api/_sheets-config.js'

const APPLY = process.argv.includes('--apply')

// Firebase Auth test phone numbers (register these in Firebase Console with the
// fixed code in TEST_CODE). Emails are the test inboxes; adjust if you prefer.
const TEST_CODE = '123456'
const TEST_GUESTS = [
  {
    firstName: 'Both',
    lastName: 'Weddings',
    relationship: "Rebecca's Friend",
    role: 'CloseFamily',
    invitedTo: 'Both Weddings',
    plusOne: 'N/A',
    phone: '+15555550100',
    email: 'test-both@abhayandrebecca.com',
  },
  {
    firstName: 'US',
    lastName: 'Only',
    relationship: "Rebecca's Guest",
    role: 'Br-Family',
    invitedTo: 'US Wedding',
    plusOne: 'N/A',
    phone: '+15555550101',
    email: 'test-us@abhayandrebecca.com',
  },
  {
    firstName: 'India',
    lastName: 'Only',
    relationship: "Abhay's Guest",
    role: 'Gr-Friends',
    invitedTo: 'India Wedding',
    plusOne: 'N/A',
    phone: '+15555550102',
    email: 'test-india@abhayandrebecca.com',
  },
]

const sheetId = process.env.GOOGLE_SHEET_ID
const serviceEmail = process.env.GOOGLE_SERVICE_EMAIL
const rawKey = process.env.GOOGLE_PRIVATE_KEY
if (!sheetId || !serviceEmail || !rawKey) {
  console.error('Missing GOOGLE_SHEET_ID / GOOGLE_SERVICE_EMAIL / GOOGLE_PRIVATE_KEY')
  process.exit(1)
}
const privateKey = rawKey.replace(/^["']|["']$/g, '').replace(/\\n/g, '\n')

function colLetter(n) {
  let s = ''
  let i = n
  while (i >= 0) {
    s = String.fromCharCode(65 + (i % 26)) + s
    i = Math.floor(i / 26) - 1
  }
  return s
}

function findHeader(headers, patterns) {
  for (let i = 0; i < headers.length; i++) {
    const h = String(headers[i] || '')
      .trim()
      .toLowerCase()
    if (patterns.some(p => p.test(h))) return i
  }
  return -1
}

async function main() {
  const auth = new google.auth.JWT({
    email: serviceEmail,
    key: privateKey,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  })
  const sheets = google.sheets({ version: 'v4', auth })
  const tab = process.env.GOOGLE_SHEET_TAB || SHEET_CONFIG.guests.tab

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: `${tab}!A1:Z`,
  })
  const rows = res.data.values || []
  if (rows.length === 0) {
    console.error('Sheet is empty — expected a header row.')
    process.exit(1)
  }
  const headers = rows[0].map(h => String(h || '').trim())

  // Dynamic column detection.
  const cols = {
    title: findHeader(headers, [/^title$/]),
    firstName: findHeader(headers, [/first name/]),
    lastName: findHeader(headers, [/last name/]),
    relationship: findHeader(headers, [/relationship/]),
    role: findHeader(headers, [/^role$/]),
    invitedTo: findHeader(headers, [/invited to/, /both weddings/, /wedding/]),
    plusOne: findHeader(headers, [/plus one/]),
    email: findHeader(headers, [/email/]),
    phone: findHeader(headers, [/phone/]),
    address: findHeader(headers, [/mailing address/]),
    dietary: findHeader(headers, [/dietary/]),
  }
  const required = ['title', 'firstName', 'lastName', 'role', 'invitedTo', 'phone', 'email']
  const missing = required.filter(k => cols[k] < 0)
  console.log('Detected columns:')
  for (const [k, idx] of Object.entries(cols)) {
    console.log(`  ${k.padEnd(12)} -> ${idx >= 0 ? headers[idx] : '(NOT FOUND)'}`)
  }
  if (missing.length) {
    console.error(`\nMissing required columns: ${missing.join(', ')}`)
    process.exit(1)
  }

  const updates = [] // { range, values }
  const appends = [] // row arrays
  const summary = []

  for (const g of TEST_GUESTS) {
    // Locate ONLY this exact test guest (title TEST + first + last match).
    let sheetRow = -1
    for (let i = 1; i < rows.length; i++) {
      const t = String(rows[i][cols.title] ?? '').trim()
      const f = String(rows[i][cols.firstName] ?? '')
        .trim()
        .toLowerCase()
      const l = String(rows[i][cols.lastName] ?? '')
        .trim()
        .toLowerCase()
      if (t === 'TEST' && f === g.firstName.toLowerCase() && l === g.lastName.toLowerCase()) {
        sheetRow = i + 1 // 1-based sheet row
        break
      }
    }

    const wanted = {
      title: 'TEST',
      firstName: g.firstName,
      lastName: g.lastName,
      relationship: g.relationship,
      role: g.role,
      invitedTo: g.invitedTo,
      plusOne: g.plusOne,
      phone: g.phone,
      email: g.email,
    }

    if (sheetRow > 0) {
      const current = rows[sheetRow - 1]
      const changed = {}
      for (const [field, value] of Object.entries(wanted)) {
        if (value === undefined || value === null) continue
        const idx = cols[field]
        if (idx === undefined || idx < 0) continue
        const cur = String(current[idx] ?? '').trim()
        if (cur !== String(value)) changed[field] = value
      }
      if (Object.keys(changed).length === 0) {
        summary.push(`row ${sheetRow} (${g.firstName} ${g.lastName}): no changes`)
        continue
      }
      for (const [field, value] of Object.entries(changed)) {
        updates.push({
          range: `${tab}!${colLetter(cols[field])}${sheetRow}`,
          values: [[value]],
        })
      }
      summary.push(`row ${sheetRow} (${g.firstName} ${g.lastName}): update ${Object.keys(changed).join(', ')}`)
    } else {
      const newRow = new Array(headers.length).fill('')
      for (const [field, value] of Object.entries(wanted)) {
        if (value !== undefined && cols[field] >= 0) newRow[cols[field]] = value
      }
      appends.push({ guest: `${g.firstName} ${g.lastName}`, row: newRow })
      summary.push(`NEW row (${g.firstName} ${g.lastName}): append`)
    }
  }

  console.log('\nPlan:')
  summary.forEach(s => console.log(`  • ${s}`))
  console.log(`\nTest phone numbers (fixed code ${TEST_CODE}):`)
  TEST_GUESTS.forEach(g => console.log(`  ${g.firstName} ${g.lastName}: ${g.phone}  <${g.email}>`))

  if (!APPLY) {
    console.log('\nDRY RUN — nothing written. Re-run with --apply to write.')
    return
  }

  if (updates.length) {
    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId: sheetId,
      requestBody: { valueInputOption: 'USER_ENTERED', data: updates },
    })
    console.log(`\n✅ Updated ${updates.length} cell(s) across existing test rows.`)
  }
  if (appends.length) {
    await sheets.spreadsheets.values.append({
      spreadsheetId: sheetId,
      range: `${tab}!A1`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: appends.map(a => a.row) },
    })
    console.log(`✅ Appended ${appends.length} new test row(s): ${appends.map(a => a.guest).join(', ')}`)
  }
  if (!updates.length && !appends.length) console.log('\n✅ Already up to date — nothing to write.')
}

main().catch(err => {
  console.error('Seed failed:', err?.response?.data?.error?.message || err.message)
  process.exit(1)
})
