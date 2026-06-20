import SHEET_CONFIG from '../sheets-config.js'
import { isAllowedOrigin } from './_origin.js'
import { getSession } from './_session.js'
import { applyLimit } from './_rate-limit.js'
import { getResend, escapeHtml, buildConfirmationEmail, RSVP_FROM } from './_email.js'

const PLUS_ONE_ALLOWED = 'Allowed+1'
const PLUS_ONE_IS = 'Is+1'

let _colMapCache = null

async function getColumnMap(sheets, sheetId, tabName) {
  if (_colMapCache && _colMapCache.sheetId === sheetId && _colMapCache.tabName === tabName) {
    return _colMapCache
  }
  const meta = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: `${tabName}!A1:Z1`,
  })
  const headers = meta.data.values?.[0] || []
  const colMap = {}
  for (const [field, label] of Object.entries(SHEET_CONFIG.guests.columns)) {
    const idx = headers.findIndex(h => String(h).trim().toLowerCase() === label.toLowerCase())
    if (idx !== -1) colMap[field] = idx
  }
  _colMapCache = { sheetId, tabName, colMap }
  return colMap
}

function colLetter(n) {
  let s = ''
  let i = n
  while (i >= 0) {
    s = String.fromCharCode(65 + (i % 26)) + s
    i = Math.floor(i / 26) - 1
  }
  return s
}

function lastColLetter(colMap) {
  const indices = Object.values(colMap)
  if (indices.length === 0) return 'Z'
  return colLetter(Math.max(...indices))
}

function normalizeRsvp(value) {
  if (value === 'YES') return 'Yes'
  if (value === 'NO') return 'No'
  return value || ''
}

function rowToGuest(row, colMap) {
  if (!row || row.length === 0) return null
  return {
    firstName: String(row[colMap.firstName] || '').trim(),
    lastName: String(row[colMap.lastName] || '').trim(),
    email: String(row[colMap.email] || '').trim(),
    phone: String(row[colMap.phone] || '').trim(),
    address: String(row[colMap.address] || '').trim(),
    dietaryPreferences: String(row[colMap.dietaryPreferences] || '').trim(),
    invitedTo: String(row[colMap.invitedTo] || '').trim(),
    plusOne: String(row[colMap.plusOne] || '').trim(),
    rsvpUs: normalizeRsvp(String(row[colMap.rsvpUs] || '').trim()),
    rsvpIndia: normalizeRsvp(String(row[colMap.rsvpIndia] || '').trim()),
  }
}

function findPlusOneRowIndices(rows, colMap, userRowIndex) {
  const plusOneIdx = colMap.plusOne
  if (plusOneIdx === undefined) return []
  if (userRowIndex < 1 || userRowIndex > rows.length) return []
  const userPlusOne = String(rows[userRowIndex - 1][plusOneIdx] || '').trim()
  if (userPlusOne !== PLUS_ONE_ALLOWED) return []
  const group = []
  for (let i = userRowIndex; i < rows.length; i++) {
    const nextPlusOne = String(rows[i][plusOneIdx] || '').trim()
    if (nextPlusOne === PLUS_ONE_IS) {
      group.push(i + 1)
    } else {
      break
    }
  }
  return group
}

function rowIndexFromId(id) {
  if (!id) return 0
  return parseInt(String(id).replace(/[^\d]/g, ''), 10)
}

export default async function handler(req, res) {
  if (!isAllowedOrigin(req)) {
    return res.status(403).json({ error: 'Forbidden' })
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  if (!process.env.RESEND_API_KEY) {
    return res.status(503).json({ error: 'Resend not configured' })
  }

  const limited = applyLimit(req, res, 'rsvp-confirmation')
  if (limited) return limited

  const session = await getSession(req)
  if (!session) {
    return res.status(401).json({ error: 'Authentication required' })
  }
  if (session.kind === 'unconfigured') {
    return res.status(503).json({ error: 'Server auth not configured' })
  }

  const sheetId = process.env.GOOGLE_SHEET_ID
  const serviceEmail = process.env.GOOGLE_SERVICE_EMAIL
  const privateKey = process.env.GOOGLE_PRIVATE_KEY
  if (!sheetId || !serviceEmail || !privateKey || privateKey.length < 200) {
    return res.status(503).json({ error: 'Sheet not configured' })
  }

  const userRowIndex = rowIndexFromId(session.guestId)
  if (isNaN(userRowIndex) || userRowIndex < 1) {
    return res.status(400).json({ error: 'Invalid guest id in session' })
  }

  try {
    const { google } = await import('googleapis')
    const auth = new google.auth.JWT({
      email: serviceEmail,
      key: privateKey.replace(/\\n/g, '\n'),
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    })
    const sheets = google.sheets({ version: 'v4', auth })
    const tabName = process.env.GOOGLE_SHEET_TAB || SHEET_CONFIG.guests.tab
    const colMap = await getColumnMap(sheets, sheetId, tabName)
    const lastCol = lastColLetter(colMap)

    const userRes = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: `${tabName}!A${userRowIndex + 1}:${lastCol}${userRowIndex + 1}`,
    })
    const userRow = userRes.data.values?.[0] || []
    if (userRow.length === 0) {
      return res.status(404).json({ error: 'Guest not found' })
    }
    const user = rowToGuest(userRow, colMap)
    if (!user.email) {
      return res.status(400).json({ error: 'No email on file' })
    }

    let plusOnes = []
    if (user.plusOne === PLUS_ONE_ALLOWED) {
      const allRes = await sheets.spreadsheets.values.get({
        spreadsheetId: sheetId,
        range: `${tabName}!A2:${lastCol}`,
      })
      const allRows = allRes.data.values || []
      const groupIndices = findPlusOneRowIndices(allRows, colMap, userRowIndex)
      plusOnes = groupIndices
        .map(idx => rowToGuest(allRows[idx - 1], colMap))
        .filter(Boolean)
    }

    const { subject, html } = buildConfirmationEmail({ user, plusOnes })

    const resend = getResend()
    if (!resend) {
      return res.status(503).json({ error: 'Resend client not initialized' })
    }

    const sendRes = await resend.emails.send({
      from: RSVP_FROM,
      to: user.email,
      subject,
      html,
    })

    if (sendRes?.error) {
      console.error('Resend send error:', sendRes.error)
      return res.status(502).json({ error: 'Failed to send email' })
    }

    return res.status(200).json({ success: true, to: user.email })
  } catch (err) {
    console.error('RSVP confirmation failed:', err)
    return res.status(500).json({ error: err?.message || 'Server error' })
  }
}
