import SHEET_CONFIG from '../sheets-config.js'
import { isAllowedOrigin } from '../_origin.js'
import { getSession, isAdminRole } from '../_session.js'
import { applyLimit } from '../_rate-limit.js'

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

async function readRow(sheets, sheetId, tabName, rowIndex, colMap) {
  const lastCol = lastColLetter(colMap)
  const sheetRow = rowIndex + 1
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: `${tabName}!A${sheetRow}:${lastCol}${sheetRow}`,
  })
  return res.data.values?.[0] || []
}

async function readAllRows(sheets, sheetId, tabName, colMap) {
  const lastCol = lastColLetter(colMap)
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: `${tabName}!A2:${lastCol}`,
  })
  return res.data.values || []
}

function findRowIndexByField(rows, colMap, field, value) {
  const idx = colMap[field]
  if (idx === undefined) return -1
  const target = String(value || '')
    .trim()
    .toLowerCase()
  if (!target) return -1
  for (let i = 0; i < rows.length; i++) {
    if (
      String(rows[i][idx] || '')
        .trim()
        .toLowerCase() === target
    )
      return i + 1
  }
  return -1
}

function findRowIndexByName(rows, colMap, name) {
  const firstIdx = colMap.firstName
  const lastIdx = colMap.lastName
  if (firstIdx === undefined) return -1
  let best = -1
  let bestScore = 0
  for (let i = 0; i < rows.length; i++) {
    const full = `${rows[i][firstIdx] || ''} ${rows[i][lastIdx] || ''}`.trim()
    const score = nameSimilarity(name, full)
    if (score > bestScore && score >= NAME_MATCH_THRESHOLD) {
      bestScore = score
      best = i + 1
    }
  }
  return best
}

const PLUS_ONE_ALLOWED = 'Allowed+1'
const PLUS_ONE_IS = 'Is+1'

function findPlusOneGroup(rows, colMap, userRowIndex) {
  if (userRowIndex < 1 || userRowIndex > rows.length) return []
  const plusOneIdx = colMap.plusOne
  if (plusOneIdx === undefined) return []
  const userPlusOne = String(rows[userRowIndex - 1][plusOneIdx] || '').trim()
  if (userPlusOne !== PLUS_ONE_ALLOWED) return []
  const group = [userRowIndex]
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

function normalizeName(str) {
  return String(str || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
}

function nameSimilarity(a, b) {
  const aa = normalizeName(a)
  const bb = normalizeName(b)
  if (!aa || !bb) return 0
  if (aa === bb) return 1
  if (aa.includes(bb) || bb.includes(aa)) return 0.8
  const aParts = aa.split(' ')
  const bParts = bb.split(' ')
  const matches = aParts.filter(p => bParts.includes(p)).length
  return matches / Math.max(aParts.length, bParts.length)
}

const NAME_MATCH_THRESHOLD = 0.4

const ALLOWED_PATCH_FIELDS = [
  'phone',
  'email',
  'address',
  'dietaryPreferences',
  'lastLogin',
  'lastUpdated',
  'loginFailed',
  'rsvpUs',
  'rsvpIndia',
]

export default async function handler(req, res) {
  if (req.method !== 'PATCH') {
    return res.status(405).json({ error: 'Method not allowed' })
  }
  if (!isAllowedOrigin(req)) {
    return res.status(403).json({ error: 'Forbidden' })
  }

  const limited = applyLimit(req, res, 'guest')
  if (limited) return limited

  const sheetId = process.env.GOOGLE_SHEET_ID
  const serviceEmail = process.env.GOOGLE_SERVICE_EMAIL
  const privateKey = process.env.GOOGLE_PRIVATE_KEY
  if (!sheetId || !serviceEmail || !privateKey || privateKey.length < 200) {
    return res.status(503).json({ error: 'Sheet not configured' })
  }

  const session = await getSession(req)
  if (!session) {
    return res.status(401).json({ error: 'Authentication required' })
  }
  if (session.kind === 'unconfigured') {
    return res.status(503).json({ error: 'Server auth not configured' })
  }

  try {
    const id = req.query?.id || req.url.split('/').pop()
    const rowIndex = parseInt(String(id).replace(/[^\d]/g, ''), 10)
    if (isNaN(rowIndex) || rowIndex < 1) {
      return res.status(400).json({ error: 'Invalid row index' })
    }

    const data = typeof req.body === 'object' ? req.body : JSON.parse(req.body || '{}')

    const { google } = await import('googleapis')
    const auth = new google.auth.JWT({
      email: serviceEmail,
      key: privateKey.replace(/\\n/g, '\n'),
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    })
    const sheets = google.sheets({ version: 'v4', auth })
    const tabName = process.env.GOOGLE_SHEET_TAB || SHEET_CONFIG.guests.tab

    const colMap = await getColumnMap(sheets, sheetId, tabName)

    const targetRow = await readRow(sheets, sheetId, tabName, rowIndex, colMap)
    if (targetRow.length === 0) {
      return res.status(404).json({ error: 'Guest not found' })
    }

    let authorized = false
    if (session.kind === 'firebase') {
      const targetEmail = String(targetRow[colMap.email] || '')
        .trim()
        .toLowerCase()
      const targetUid = String(targetRow[colMap.firebaseUid] || '').trim()
      if (session.email && targetEmail && session.email === targetEmail) {
        authorized = true
      } else if (session.uid && targetUid && session.uid === targetUid) {
        authorized = true
      } else if (!targetUid && session.name) {
        const targetFullName =
          `${targetRow[colMap.firstName] || ''} ${targetRow[colMap.lastName] || ''}`.trim()
        if (
          targetFullName &&
          nameSimilarity(session.name, targetFullName) >= NAME_MATCH_THRESHOLD
        ) {
          authorized = true
        }
      }
      if (!authorized) {
        const rows = await readAllRows(sheets, sheetId, tabName, colMap)
        let userRowIndex = -1
        if (session.email) {
          userRowIndex = findRowIndexByField(rows, colMap, 'email', session.email)
        }
        if (userRowIndex < 0 && session.uid) {
          userRowIndex = findRowIndexByField(rows, colMap, 'firebaseUid', session.uid)
        }
        if (userRowIndex < 0 && session.name) {
          userRowIndex = findRowIndexByName(rows, colMap, session.name)
        }
        if (userRowIndex > 0) {
          const userRole = String(rows[userRowIndex - 1][colMap.role] || '').trim()
          if (isAdminRole(normalizeRole(userRole))) {
            authorized = true
          } else {
            const groupRows = findPlusOneGroup(rows, colMap, userRowIndex)
            if (groupRows.includes(rowIndex)) authorized = true
          }
        }
      }
    } else if (session.kind === 'cookie') {
      const cookieRowIndex = parseInt(String(session.guestId).replace(/[^\d]/g, ''), 10)
      if (!isNaN(cookieRowIndex) && cookieRowIndex === rowIndex) {
        authorized = true
      } else if (isAdminRole(session.role)) {
        authorized = true
      } else if (!isNaN(cookieRowIndex)) {
        const rows = await readAllRows(sheets, sheetId, tabName, colMap)
        const groupRows = findPlusOneGroup(rows, colMap, cookieRowIndex)
        if (groupRows.includes(rowIndex)) authorized = true
      }
    }

    if (!authorized) {
      return res.status(403).json({ error: 'Forbidden' })
    }

    const sheetRow = rowIndex + 1
    const updates = []
    for (const field of ALLOWED_PATCH_FIELDS) {
      if (data[field] === undefined) continue
      const idx = colMap[field]
      if (idx === undefined) continue
      updates.push({
        range: `${tabName}!${colLetter(idx)}${sheetRow}`,
        values: [[data[field]]],
      })
    }

    if (session.kind === 'firebase' && session.uid && colMap.firebaseUid !== undefined) {
      const existingUid = String(targetRow[colMap.firebaseUid] || '').trim()
      if (existingUid !== session.uid) {
        updates.push({
          range: `${tabName}!${colLetter(colMap.firebaseUid)}${sheetRow}`,
          values: [[session.uid]],
        })
      }
    }

    if (updates.length === 0) {
      return res.status(200).json({ updated: 0 })
    }

    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId: sheetId,
      requestBody: { valueInputOption: 'USER_ENTERED', data: updates },
    })

    return res.json({ updated: updates.length })
  } catch (err) {
    console.error('Guest update failed:', err)
    return res.status(502).json({ error: err?.response?.data?.error?.message || err.message })
  }
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
