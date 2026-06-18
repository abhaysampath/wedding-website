import { isAllowedOrigin } from '../_origin.js'
import {
  mintSessionToken,
  getSessionCookieHeader,
  getClearCookieHeader,
  getSession,
  isAdminRole,
} from '../_session.js'
import SHEET_CONFIG from '../sheets-config.js'

let _colMapCache = null

async function getColumnMap(sheets, sheetId, tabName) {
  if (_colMapCache && _colMapCache.sheetId === sheetId && _colMapCache.tabName === tabName) {
    return _colMapCache.colMap
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

const RAW_ROLE_TO_NORMALIZED = {
  bride: 'bride',
  groom: 'groom',
  closefamily: 'close_family',
  'br-family': 'invited_guest',
  'br-friends': 'invited_guest',
  'gr-friends': 'invited_guest',
  'gr-family': 'invited_guest',
  'n/a': 'invited_guest',
}

function normalizeRole(raw) {
  const key = String(raw || '')
    .trim()
    .toLowerCase()
  return RAW_ROLE_TO_NORMALIZED[key] || 'invited_guest'
}

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const session = await getSession(req)
    if (!session) return res.status(200).json({ authenticated: false })
    if (session.kind === 'unconfigured')
      return res.status(503).json({ error: 'Auth not configured' })
    return res.status(200).json({ authenticated: true, kind: session.kind, ...session })
  }
  if (req.method !== 'POST' && req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' })
  }
  if (!isAllowedOrigin(req)) {
    return res.status(403).json({ error: 'Forbidden' })
  }

  if (req.method === 'DELETE') {
    res.setHeader('Set-Cookie', getClearCookieHeader())
    return res.status(200).json({ ok: true })
  }

  const sheetId = process.env.GOOGLE_SHEET_ID
  const serviceEmail = process.env.GOOGLE_SERVICE_EMAIL
  const privateKey = process.env.GOOGLE_PRIVATE_KEY
  if (!sheetId || !serviceEmail || !privateKey || privateKey.length < 200) {
    return res.status(503).json({ error: 'Sheet not configured' })
  }

  try {
    const data = typeof req.body === 'object' ? req.body : JSON.parse(req.body || '{}')
    const { guestId } = data
    if (!guestId) {
      return res.status(400).json({ error: 'guestId required' })
    }
    const guestIdStr = String(guestId)
    if (!/^g\d+$/i.test(guestIdStr)) {
      return res.status(400).json({ error: 'Invalid guestId format' })
    }
    const rowIndex = parseInt(guestIdStr.replace(/[^\d]/g, ''), 10)
    if (isNaN(rowIndex) || rowIndex < 1) {
      return res.status(400).json({ error: 'Invalid guestId' })
    }

    const { google } = await import('googleapis')
    const auth = new google.auth.JWT({
      email: serviceEmail,
      key: privateKey.replace(/\\n/g, '\n'),
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    })
    const sheets = google.sheets({ version: 'v4', auth })
    const tabName = process.env.GOOGLE_SHEET_TAB || SHEET_CONFIG.guests.tab
    const colMap = await getColumnMap(sheets, sheetId, tabName)
    const lastColIdx = Math.max(...Object.values(colMap), 0)
    let lastLetter = 'Z'
    let s = ''
    let i = lastColIdx
    while (i >= 0) {
      s = String.fromCharCode(65 + (i % 26)) + s
      i = Math.floor(i / 26) - 1
    }
    lastLetter = s
    const sheetRow = rowIndex + 1
    const rowRes = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: `${tabName}!A${sheetRow}:${lastLetter}${sheetRow}`,
    })
    const row = rowRes.data.values?.[0] || []
    if (row.length === 0) {
      return res.status(404).json({ error: 'Guest not found' })
    }
    const roleRaw = String(row[colMap.role] || '').trim()
    const role = normalizeRole(roleRaw)
    const token = mintSessionToken({ guestId: guestIdStr, role })
    res.setHeader('Set-Cookie', getSessionCookieHeader(token))
    return res.status(200).json({ ok: true, guestId: guestIdStr, role })
  } catch (err) {
    console.error('Session mint failed:', err)
    return res.status(502).json({ error: err?.response?.data?.error?.message || err.message })
  }
}
