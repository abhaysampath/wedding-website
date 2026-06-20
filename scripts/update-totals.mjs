/**
 * Update the TOTALS tab in the Config Sheet with live guest and RSVP counts.
 *
 * Reads the GUESTS tab, computes totals, and writes them to the TOTALS tab.
 * The TOTALS tab must exist (create it manually if it doesn't).
 *
 * Usage:
 *   node scripts/update-totals.mjs
 *
 * Required env vars (same as the rest of the sheet-using scripts):
 *   GOOGLE_SHEET_ID, GOOGLE_SERVICE_EMAIL, GOOGLE_PRIVATE_KEY
 */

import { fileURLToPath } from 'url'
import { dirname } from 'path'
import SHEET_CONFIG from '../api/sheets-config.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const IS_TEST = !!process.env.VITEST

const TAB_RANGES = { guests: 'A:R', totals: 'A1:B100' }
const TOTALS_TAB = 'TOTALS'

export function sanitizeCell(val) {
  const v = (val || '').trim()
  return v.startsWith('#') ? '' : v
}

export function parseSheet(values, columnConfig) {
  if (!values || values.length < 2) return []
  const [headerRow, ...dataRows] = values
  const indexMap = {}
  for (const [fieldName, headerLabel] of Object.entries(columnConfig)) {
    const idx = headerRow.findIndex(h => h.trim().toLowerCase() === headerLabel.toLowerCase())
    if (idx !== -1) indexMap[fieldName] = idx
  }
  return dataRows.map(row => {
    const obj = {}
    for (const [fieldName, idx] of Object.entries(indexMap)) {
      obj[fieldName] = sanitizeCell(row[idx])
    }
    return obj
  })
}

function normalizeRsvp(v) {
  if (!v) return ''
  const upper = v.toUpperCase()
  if (upper === 'YES') return 'Yes'
  if (upper === 'NO') return 'No'
  return ''
}

function invitedWeddings(v) {
  const lower = (v || '').toLowerCase()
  const weddings = []
  if (lower.includes('both') || lower.includes('us')) weddings.push('us')
  if (lower.includes('both') || lower.includes('india')) weddings.push('india')
  return weddings
}

export function computeTotals(rows) {
  const realRows = rows.filter(r => r.title !== 'TEST')
  const guestRows = realRows.filter(r => r.title !== 'KIDS')
  const total = guestRows.length
  const kidsRows = realRows.filter(r => r.title === 'KIDS').length
  const testRows = rows.filter(r => r.title === 'TEST').length

  const invUsOnly = guestRows.filter(r => {
    const ws = invitedWeddings(r.invitedTo)
    return ws.length === 1 && ws[0] === 'us'
  }).length
  const invIndiaOnly = guestRows.filter(r => {
    const ws = invitedWeddings(r.invitedTo)
    return ws.length === 1 && ws[0] === 'india'
  }).length
  const invBoth = guestRows.filter(r => invitedWeddings(r.invitedTo).length === 2).length

  const rsvpUsYes = guestRows.filter(r => normalizeRsvp(r.rsvpUs) === 'Yes').length
  const rsvpUsNo = guestRows.filter(r => normalizeRsvp(r.rsvpUs) === 'No').length
  const rsvpUsPending = total - rsvpUsYes - rsvpUsNo
  const rsvpIndiaYes = guestRows.filter(r => normalizeRsvp(r.rsvpIndia) === 'Yes').length
  const rsvpIndiaNo = guestRows.filter(r => normalizeRsvp(r.rsvpIndia) === 'No').length
  const rsvpIndiaPending = total - rsvpIndiaYes - rsvpIndiaNo

  const attendingUs = guestRows.filter(r => normalizeRsvp(r.rsvpUs) === 'Yes').length
  const attendingIndia = guestRows.filter(r => normalizeRsvp(r.rsvpIndia) === 'Yes').length
  const attendingAny = guestRows.filter(r => {
    return (
      normalizeRsvp(r.rsvpUs) === 'Yes' || normalizeRsvp(r.rsvpIndia) === 'Yes'
    )
  }).length
  const decliningAny = guestRows.filter(r => {
    const us = normalizeRsvp(r.rsvpUs)
    const india = normalizeRsvp(r.rsvpIndia)
    const invited = invitedWeddings(r.invitedTo)
    if (invited.length === 0) return false
    const allDeclined = invited.every(w =>
      w === 'us' ? us === 'No' : w === 'india' ? india === 'No' : false,
    )
    return allDeclined
  }).length
  const attendingBoth = guestRows.filter(
    r => normalizeRsvp(r.rsvpUs) === 'Yes' && normalizeRsvp(r.rsvpIndia) === 'Yes',
  ).length
  const attendingUsOnly = guestRows.filter(
    r => normalizeRsvp(r.rsvpUs) === 'Yes' && normalizeRsvp(r.rsvpIndia) !== 'Yes',
  ).length
  const attendingIndiaOnly = guestRows.filter(
    r => normalizeRsvp(r.rsvpUs) !== 'Yes' && normalizeRsvp(r.rsvpIndia) === 'Yes',
  ).length
  const pendingResponse = total - attendingAny - decliningAny

  const dietaryUs = guestRows.filter(
    r => normalizeRsvp(r.rsvpUs) === 'Yes' && r.dietaryPreferences,
  ).length
  const dietaryIndia = guestRows.filter(
    r => normalizeRsvp(r.rsvpIndia) === 'Yes' && r.dietaryPreferences,
  ).length

  const allowedPlusOne = guestRows.filter(r => r.plusOne === 'Allowed+1').length
  const isPlusOne = guestRows.filter(r => r.plusOne === 'Is+1').length
  const notAllowedPlusOne = guestRows.filter(r => r.plusOne === '+1NOTALLOWED').length
  const naPlusOne = total - allowedPlusOne - isPlusOne - notAllowedPlusOne

  const withEmail = guestRows.filter(r => r.email).length
  const withPhone = guestRows.filter(r => r.phone).length
  const withAddress = guestRows.filter(r => r.address).length
  const withLogin = guestRows.filter(r => r.lastLogin).length
  const withoutLogin = total - withLogin
  const loginFailed = guestRows.filter(
    r => r.loginFailed && r.loginFailed.toUpperCase() !== 'SUCCESS',
  ).length

  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
  const recentLogins = guestRows.filter(r => {
    if (!r.lastLogin) return false
    const d = new Date(r.lastLogin)
    return !isNaN(d.getTime()) && d.getTime() >= sevenDaysAgo
  }).length
  const recentFailed = guestRows.filter(r => {
    if (!r.loginFailed || r.loginFailed.toUpperCase() === 'SUCCESS') return false
    const d = new Date(r.loginFailed)
    return !isNaN(d.getTime()) && d.getTime() >= sevenDaysAgo
  }).length

  return {
    total,
    kidsRows,
    testRows,
    invUsOnly,
    invIndiaOnly,
    invBoth,
    rsvpUsYes,
    rsvpUsNo,
    rsvpUsPending,
    rsvpIndiaYes,
    rsvpIndiaNo,
    rsvpIndiaPending,
    attendingAny,
    decliningAny,
    attendingBoth,
    attendingUsOnly,
    attendingIndiaOnly,
    attendingUs,
    attendingIndia,
    pendingResponse,
    dietaryUs,
    dietaryIndia,
    allowedPlusOne,
    isPlusOne,
    notAllowedPlusOne,
    naPlusOne,
    withEmail,
    withPhone,
    withAddress,
    withLogin,
    withoutLogin,
    loginFailed,
    recentLogins,
    recentFailed,
  }
}

function totalsToRows(totals) {
  const now = new Date().toISOString()
  return [
    ['Last updated', now],
    [],
    ['OVERVIEW', ''],
    ['Total guest rows (excl. KIDS/TEST)', totals.total],
    ['KIDS rows', totals.kidsRows],
    ['TEST rows', totals.testRows],
    [],
    ['INVITATIONS', ''],
    ['Invited to US only', totals.invUsOnly],
    ['Invited to India only', totals.invIndiaOnly],
    ['Invited to Both', totals.invBoth],
    [],
    ['RSVP — US Wedding', ''],
    ['US: Yes', totals.rsvpUsYes],
    ['US: No', totals.rsvpUsNo],
    ['US: Pending', totals.rsvpUsPending],
    ['RSVP — India Wedding', ''],
    ['India: Yes', totals.rsvpIndiaYes],
    ['India: No', totals.rsvpIndiaNo],
    ['India: Pending', totals.rsvpIndiaPending],
    [],
    ['COMBINED ATTENDANCE', ''],
    ['Attending at least one wedding', totals.attendingAny],
    ['Declining all invited weddings', totals.decliningAny],
    ['Pending response', totals.pendingResponse],
    ['Attending both weddings', totals.attendingBoth],
    ['Attending US only', totals.attendingUsOnly],
    ['Attending India only', totals.attendingIndiaOnly],
    ['Attending US (count)', totals.attendingUs],
    ['Attending India (count)', totals.attendingIndia],
    [],
    ['MEAL TRACKING (attending only)', ''],
    ['US attending with dietary noted', totals.dietaryUs],
    ['India attending with dietary noted', totals.dietaryIndia],
    [],
    ['+1 ALLOWANCES', ''],
    ['Allowed +1', totals.allowedPlusOne],
    ['Is +1 (added by allowed group)', totals.isPlusOne],
    ['+1 NOTALLOWED', totals.notAllowedPlusOne],
    ['N/A or empty', totals.naPlusOne],
    [],
    ['CONTACT INFO COMPLETENESS', ''],
    ['With email on file', totals.withEmail],
    ['With phone on file', totals.withPhone],
    ['With mailing address', totals.withAddress],
    [],
    ['LOGIN ACTIVITY', ''],
    ['Ever logged in', totals.withLogin],
    ['Never logged in', totals.withoutLogin],
    ['Failed login attempts (all time)', totals.loginFailed],
    ['Logged in last 7 days', totals.recentLogins],
    ['Failed login attempts last 7 days', totals.recentFailed],
  ]
}

export function buildTotalsUpdate(totals) {
  const rows = totalsToRows(totals)
  return rows.map(([label, value]) => [label, value === '' ? '' : value])
}

export async function main() {
  const { GOOGLE_SHEET_ID, GOOGLE_SERVICE_EMAIL, GOOGLE_PRIVATE_KEY } = process.env

  const missing = []
  if (!GOOGLE_SHEET_ID) missing.push('GOOGLE_SHEET_ID')
  if (!GOOGLE_SERVICE_EMAIL) missing.push('GOOGLE_SERVICE_EMAIL')
  if (!GOOGLE_PRIVATE_KEY) missing.push('GOOGLE_PRIVATE_KEY')
  if (missing.length > 0) {
    console.error(`Missing env vars: ${missing.join(', ')}`)
    process.exit(1)
    return
  }

  const { google } = await import('googleapis')
  const auth = new google.auth.JWT({
    email: GOOGLE_SERVICE_EMAIL,
    key: GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  })
  const sheets = google.sheets({ version: 'v4', auth })

  console.log('Reading GUESTS tab...')
  const guestsRes = await sheets.spreadsheets.values.get({
    spreadsheetId: GOOGLE_SHEET_ID,
    range: `${SHEET_CONFIG.guests.tab}!${TAB_RANGES.guests}`,
  })
  const rows = parseSheet(guestsRes.data.values, SHEET_CONFIG.guests.columns)
  console.log(`Read ${rows.length} rows`)

  const totals = computeTotals(rows)
  const updateRows = buildTotalsUpdate(totals)

  const updateRange = `${TOTALS_TAB}!A1:B${updateRows.length}`
  await sheets.spreadsheets.values.update({
    spreadsheetId: GOOGLE_SHEET_ID,
    range: updateRange,
    valueInputOption: 'RAW',
    requestBody: { values: updateRows },
  })

  console.log(`Wrote ${updateRows.length} rows to ${TOTALS_TAB} tab`)
  console.log(`Total guests: ${totals.total}`)
  console.log(`US Yes/No/Pending: ${totals.rsvpUsYes}/${totals.rsvpUsNo}/${totals.rsvpUsPending}`)
  console.log(`India Yes/No/Pending: ${totals.rsvpIndiaYes}/${totals.rsvpIndiaNo}/${totals.rsvpIndiaPending}`)
}

if (!IS_TEST) {
  main().catch(err => {
    console.error('Totals update failed:', err)
    process.exit(1)
  })
}
