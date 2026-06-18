import SHEET_CONFIG from './sheets-config.js'
import { isAllowedOrigin } from './_origin.js'
import { applyLimit } from './_rate-limit.js'
import { cacheGet, cacheSet } from './_cache.js'

const TAB_RANGES = {
  guests: 'A:R',
  faq: 'A:C',
}

const CONTENT_CACHE_TTL_MS = 60 * 1000

const ROLE_MAP = {
  Bride: 'bride',
  Groom: 'groom',
  CloseFamily: 'close_family',
  'Br-Family': 'invited_guest',
  'Br-Friends': 'invited_guest',
  'Gr-Friends': 'invited_guest',
  'Gr-Family': 'invited_guest',
}
const PLUSONE_VALUES = ['+1NOTALLOWED', 'N/A', 'Allowed+1', 'Is+1']

function normalizePlusOne(raw) {
  const v = String(raw || '').trim()
  return PLUSONE_VALUES.includes(v) ? v : 'N/A'
}

function inferSide(firstName, lastName, relationship, role) {
  const full = `${firstName} ${lastName}`.toLowerCase()
  if (full === 'abhay sampath' || full.startsWith('abhay')) return 'groom'
  if (full === 'rebecca erde' || full.startsWith('rebecca')) return 'bride'
  const rel = (relationship || '').toLowerCase()
  if (rel.includes('abhay')) return 'groom'
  if (rel.includes('rebecca')) return 'bride'
  if (role === 'Br-Family') return 'bride'
  return 'bride'
}

function parseWeddings(val) {
  const v = (val || '').toLowerCase()
  if (v.includes('both')) return ['us', 'india']
  if (v.includes('us')) return ['us']
  if (v.includes('india')) return ['india']
  return ['us']
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  if (!isAllowedOrigin(req)) {
    return res.status(403).json({ error: 'Forbidden' })
  }

  const limited = applyLimit(req, res, 'content')
  if (limited) return limited

  const sheetId = process.env.GOOGLE_SHEET_ID
  const serviceEmail = process.env.GOOGLE_SERVICE_EMAIL
  const privateKey = process.env.GOOGLE_PRIVATE_KEY

  if (!sheetId || !serviceEmail || !privateKey || privateKey.length < 200) {
    return res
      .status(503)
      .json({
        error:
          'Sheets not configured. Set GOOGLE_SHEET_ID, GOOGLE_SERVICE_EMAIL, GOOGLE_PRIVATE_KEY.',
      })
  }

  const cacheKey = `content:${sheetId}`
  const cached = cacheGet(cacheKey)
  if (cached) {
    res.setHeader('X-Cache', 'HIT')
    return res.json(cached)
  }
  res.setHeader('X-Cache', 'MISS')

  try {
    const { google } = await import('googleapis')
    const auth = new google.auth.JWT({
      email: serviceEmail,
      key: privateKey.replace(/\\n/g, '\n'),
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    })
    const sheets = google.sheets({ version: 'v4', auth })

    const sheetErrors = []
    const read = (tab, range) =>
      sheets.spreadsheets.values
        .get({ spreadsheetId: sheetId, range: `${tab}!${range}` })
        .catch(e => {
          sheetErrors.push(`${tab}: ${e?.response?.data?.error?.message || e.message}`)
          return { data: { values: null } }
        })

    const [guestsRes, faqRes] = await Promise.all([
      read(SHEET_CONFIG.guests.tab, TAB_RANGES.guests),
      read(SHEET_CONFIG.faq.tab, TAB_RANGES.faq),
    ])

    const guests = parseSheet(guestsRes.data.values, SHEET_CONFIG.guests.columns, (row, i) => {
      const firstName = row.firstName || ''
      const lastName = row.lastName || ''
      const relationship = row.relationship || ''
      const roleRaw = row.role || ''
      const plusOneRaw = row.plusOne || ''
      const title = row.title || ''
      return {
        id: `g${String(i + 1).padStart(3, '0')}`,
        firstName,
        lastName,
        side: inferSide(firstName, lastName, relationship, roleRaw),
        title,
        relationship,
        role: ROLE_MAP[roleRaw] || 'invited_guest',
        weddings: parseWeddings(row.invitedTo),
        plusOne: normalizePlusOne(plusOneRaw),
        email: row.email || '',
        phone: row.phone || '',
        address: row.address || '',
        dietaryPreferences: row.dietaryPreferences || '',
        rsvpUs: row.rsvpUs || '',
        rsvpIndia: row.rsvpIndia || '',
      }
    })

    const faqHeaders = faqRes.data.values?.[0] || []
    const faqWeddingLabel = SHEET_CONFIG.faq.columns.wedding.toLowerCase()
    const faqWeddingColFound = faqHeaders.some(h => h.trim().toLowerCase() === faqWeddingLabel)
    if (!faqWeddingColFound && faqHeaders.length > 0) {
      console.warn(
        `FAQ sheet is missing a column with header "${SHEET_CONFIG.faq.columns.wedding}" — FAQ filtering by wedding will not work until you add it`,
      )
    }
    function parseFaqWedding(val) {
      const v = (val || '').trim().toLowerCase()
      if (v === 'hide') return 'hide'
      if (v.includes('both')) return 'both'
      if (v.includes('india')) return 'india'
      if (v.includes('us')) return 'us'
      return 'both'
    }
    const faq = parseSheet(faqRes.data.values, SHEET_CONFIG.faq.columns, row => ({
      q: row.question || '',
      a: row.answer || '',
      wedding: parseFaqWedding(row.wedding),
    }))

    const visibleGuests = guests.filter(g => g.title !== 'KIDS')
    const body = {
      source: 'sheet',
      guests: visibleGuests,
      faq,
      faqWeddingColFound,
      faqHeaderRow: faqHeaders,
    }
    if (sheetErrors.length > 0) body.error = sheetErrors.join('; ')
    if (sheetErrors.length === 0) {
      cacheSet(cacheKey, body, CONTENT_CACHE_TTL_MS)
    }
    return res.json(body)
  } catch (err) {
    console.error('Sheet read failed:', err)
    const msg = err?.response?.data?.error?.message || err?.message || 'unknown error'
    return res.status(503).json({ error: msg })
  }
}

function sanitizeCell(val) {
  const v = (val || '').trim()
  return v.startsWith('#') ? '' : v
}

function parseSheet(values, columnConfig, mapper) {
  if (!values || values.length < 2) return []
  const [headerRow, ...dataRows] = values

  const indexMap = {}
  for (const [fieldName, headerLabel] of Object.entries(columnConfig)) {
    const idx = headerRow.findIndex(h => h.trim().toLowerCase() === headerLabel.toLowerCase())
    if (idx !== -1) indexMap[fieldName] = idx
  }

  return dataRows.map((row, i) => {
    const obj = {}
    for (const [fieldName, idx] of Object.entries(indexMap)) {
      obj[fieldName] = sanitizeCell(row[idx])
    }
    return mapper(obj, i)
  })
}
