/**
 * GET /api/guests
 * Returns the full guest list from a Google Sheet.
 * Protected by a service account — only accessible from authorized Vercel deployments.
 *
 * Environment variables (set in Vercel dashboard):
 *   GOOGLE_SHEET_ID         — ID from the sheet URL
 *   GOOGLE_SERVICE_EMAIL    — service account email
 *   GOOGLE_PRIVATE_KEY      — service account private key
 */

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
    const auth = new google.auth.JWT(serviceEmail, null, privateKey.replace(/\\n/g, '\n'), [
      'https://www.googleapis.com/auth/spreadsheets.readonly',
    ])
    const sheets = google.sheets({ version: 'v4', auth })
    const tabName = process.env.GOOGLE_SHEET_TAB || 'Guest List'
    const range = `${tabName}!A:H`

    const res_ = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range,
    })

    const rows = res_.data.values
    if (!rows || rows.length < 2) {
      return res.json({ guests: [] })
    }

    const headers = rows[0].map((h) => h.trim().toLowerCase())
    const guests = rows.slice(1).map((row, i) => ({
      id: `g${String(i + 1).padStart(3, '0')}`,
      firstName: row[headers.indexOf('firstname')] || '',
      lastName: row[headers.indexOf('lastname')] || '',
      side: row[headers.indexOf('side')] || 'bride',
      relationship: row[headers.indexOf('relationship')] || '',
      role: row[headers.indexOf('role')] || 'invited_guest',
      weddings: (row[headers.indexOf('weddings')] || 'us').split(',').map((w) => w.trim()),
      plusOne: (row[headers.indexOf('plusone')] || '').toLowerCase() === 'true',
    }))

    return res.json({ guests, source: 'sheet' })
  } catch (err) {
    console.error('Sheet read failed:', err)
    return res.status(502).json({ error: 'Sheet read failed', source: 'local' })
  }
}
