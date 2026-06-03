import SHEET_CONFIG from './sheets-config.js'

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
    return res.status(503).json({ error: 'Sheet not configured', source: 'local' })
  }

  try {
    const { google } = await import('googleapis')
    const auth = new google.auth.JWT({
      email: serviceEmail,
      key: privateKey,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    })
    const sheets = google.sheets({ version: 'v4', auth })
    const tabName = process.env.GOOGLE_SHEET_TAB || SHEET_CONFIG.guests.tab
    const range = `${tabName}!A:P`

    const res_ = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range,
    })

    const rows = res_.data.values
    if (!rows || rows.length < 2) {
      return res.json({ guests: [] })
    }

    const headerRow = rows[0]
    const indexMap = {}
    for (const [fieldName, headerLabel] of Object.entries(SHEET_CONFIG.guests.columns)) {
      const idx = headerRow.findIndex((h) => h.trim().toLowerCase() === headerLabel.toLowerCase())
      if (idx !== -1) indexMap[fieldName] = idx
    }

    const guests = rows.slice(1).map((row, i) => {
      const vals = {}
      for (const [fieldName, idx] of Object.entries(indexMap)) {
        vals[fieldName] = (row[idx] || '').trim()
      }
      const firstName = vals.firstName || ''
      const lastName = vals.lastName || ''
      const relationship = vals.relationship || ''
      const roleRaw = vals.role || ''
      const plusOneRaw = vals.plusOne || ''
      return {
        id: `g${String(i + 1).padStart(3, '0')}`,
        firstName,
        lastName,
        side: inferSide(firstName, lastName, relationship, roleRaw),
        relationship,
        role: ROLE_MAP[roleRaw] || 'invited_guest',
        weddings: parseWeddings(vals.invitedTo),
        plusOne: PLUSONE_MAP[plusOneRaw] ?? false,
        email: vals.email || '',
        phone: vals.phone || '',
      }
    })

    return res.json({ guests, source: 'sheet' })
  } catch (err) {
    console.error('Sheet read failed:', err)
    return res.status(502).json({ error: 'Sheet read failed', source: 'local' })
  }
}
