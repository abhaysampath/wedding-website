/**
 * GET /api/content
 * Reads all content tabs from the Google Sheet.
 * Falls back to sample data if sheet is not configured.
 *
 * Sheet tabs:
 *   Guests: firstName | lastName | side | relationship | role | weddings | plusOne | phone | email
 *   FAQ:    question | answer | wedding
 *   Images: jpg | png | alt
 */

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const sheetId = process.env.GOOGLE_SHEET_ID
  const serviceEmail = process.env.GOOGLE_SERVICE_EMAIL
  const privateKey = process.env.GOOGLE_PRIVATE_KEY

  if (!sheetId || !serviceEmail || !privateKey) {
    return res.status(200).json({ source: 'sample', guests: [], faq: [], images: [] })
  }

  try {
    const { google } = await import('googleapis')
    const auth = new google.auth.JWT(serviceEmail, null, privateKey.replace(/\\n/g, '\n'), [
      'https://www.googleapis.com/auth/spreadsheets.readonly',
    ])
    const sheets = google.sheets({ version: 'v4', auth })

    const [guestsRes, faqRes, imagesRes] = await Promise.all([
      sheets.spreadsheets.values.get({ spreadsheetId: sheetId, range: 'Guests!A:I' }).catch(() => ({ data: { values: null } })),
      sheets.spreadsheets.values.get({ spreadsheetId: sheetId, range: 'FAQ!A:C' }).catch(() => ({ data: { values: null } })),
      sheets.spreadsheets.values.get({ spreadsheetId: sheetId, range: 'Images!A:C' }).catch(() => ({ data: { values: null } })),
    ])

    const guests = parseRows(guestsRes.data.values, (row, h) => ({
      id: `g${String(row._i + 1).padStart(3, '0')}`,
      firstName: row.firstname || '',
      lastName: row.lastname || '',
      side: row.side || 'bride',
      relationship: row.relationship || '',
      role: row.role || 'invited_guest',
      weddings: (row.weddings || 'us').split(',').map((w) => w.trim()),
      plusOne: (row.plusone || '').toLowerCase() === 'true',
    }))

    const faq = parseRows(faqRes.data.values, (row) => ({
      q: row.question || '',
      a: row.answer || '',
      wedding: row.wedding || 'both',
    }))

    const images = parseRows(imagesRes.data.values, (row) => ({
      jpg: row.jpg || '',
      png: row.png || '',
      alt: row.alt || '',
    }))

    return res.json({ source: 'sheet', guests, faq, images })
  } catch (err) {
    console.error('Sheet read failed:', err)
    return res.status(200).json({ source: 'sample', guests: [], faq: [], images: [] })
  }
}

function parseRows(values, mapper) {
  if (!values || values.length < 2) return []
  const headers = values[0].map((h) => h.trim().toLowerCase())
  return values.slice(1).map((row, i) => {
    const obj = { _i: i }
    headers.forEach((h, idx) => {
      obj[h] = (row[idx] || '').trim()
    })
    return mapper(obj, headers)
  })
}
