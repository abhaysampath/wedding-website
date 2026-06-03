import SHEET_CONFIG from './sheets-config.js'

const TAB_RANGES = {
  guests: 'A:P',
  faq: 'A:C',
  images: 'A:C',
}

const ROLE_MAP = { 'Bride': 'bride', 'Groom': 'groom', 'CloseFamily': 'close_family', 'Br-Family': 'family' }
const PLUSONE_MAP = { 'N/A': false, 'Allowed+1': true, '+1NOTALLOWED': false }

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

  const sheetId = process.env.GOOGLE_SHEET_ID
  const serviceEmail = process.env.GOOGLE_SERVICE_EMAIL
  const privateKey = process.env.GOOGLE_PRIVATE_KEY

  if (!sheetId || !serviceEmail || !privateKey) {
    return res.status(200).json({ source: 'sample', error: 'Missing GOOGLE_SHEET_ID, GOOGLE_SERVICE_EMAIL, or GOOGLE_PRIVATE_KEY env vars', guests: [], faq: [], images: [] })
  }

  try {
    const { google } = await import('googleapis')
    const auth = new google.auth.JWT({
      email: serviceEmail,
      key: privateKey,
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    })
    const sheets = google.sheets({ version: 'v4', auth })

    const sheetErrors = []
    const read = (tab, range) =>
      sheets.spreadsheets.values.get({ spreadsheetId: sheetId, range: `${tab}!${range}` })
        .catch((e) => {
          sheetErrors.push(`${tab}: ${e?.response?.data?.error?.message || e.message}`)
          return { data: { values: null } }
        })

    const [guestsRes, faqRes, imagesRes] = await Promise.all([
      read(SHEET_CONFIG.guests.tab, TAB_RANGES.guests),
      read(SHEET_CONFIG.faq.tab, TAB_RANGES.faq),
      read(SHEET_CONFIG.images.tab, TAB_RANGES.images),
    ])

    const guests = parseSheet(guestsRes.data.values, SHEET_CONFIG.guests.columns, (row, i) => {
      const firstName = row.firstName || ''
      const lastName = row.lastName || ''
      const relationship = row.relationship || ''
      const roleRaw = row.role || ''
      const plusOneRaw = row.plusOne || ''
      return {
        id: `g${String(i + 1).padStart(3, '0')}`,
        firstName,
        lastName,
        side: inferSide(firstName, lastName, relationship, roleRaw),
        relationship,
        role: ROLE_MAP[roleRaw] || 'invited_guest',
        weddings: parseWeddings(row.invitedTo),
        plusOne: PLUSONE_MAP[plusOneRaw] ?? false,
      }
    })

    const faq = parseSheet(faqRes.data.values, SHEET_CONFIG.faq.columns, (row) => ({
      q: row.question || '',
      a: row.answer || '',
      wedding: row.wedding || 'both',
    }))

    const images = parseSheet(imagesRes.data.values, SHEET_CONFIG.images.columns, (row) => ({
      jpg: row.jpg || '',
      png: row.png || '',
      alt: row.alt || '',
    }))

    const body = { source: 'sheet', guests, faq, images }
    if (sheetErrors.length > 0) body.error = sheetErrors.join('; ')
    return res.json(body)
  } catch (err) {
    console.error('Sheet read failed:', err)
    const msg = err?.response?.data?.error?.message || err?.message || 'unknown error'
    return res.status(200).json({ source: 'sample', error: msg, guests: [], faq: [], images: [] })
  }
}

function parseSheet(values, columnConfig, mapper) {
  if (!values || values.length < 2) return []
  const [headerRow, ...dataRows] = values

  const indexMap = {}
  for (const [fieldName, headerLabel] of Object.entries(columnConfig)) {
    const idx = headerRow.findIndex(
      (h) => h.trim().toLowerCase() === headerLabel.toLowerCase()
    )
    if (idx !== -1) indexMap[fieldName] = idx
  }

  return dataRows.map((row, i) => {
    const obj = {}
    for (const [fieldName, idx] of Object.entries(indexMap)) {
      obj[fieldName] = (row[idx] || '').trim()
    }
    return mapper(obj, i)
  })
}
