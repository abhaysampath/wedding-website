/**
 * PATCH /api/guests/[id]
 * Updates a guest's phone and email in the Google Sheet.
 */

export default async function handler(req, res) {
  if (req.method !== 'PATCH') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { id } = req.query
  const { phone, email } = req.body || {}

  const sheetId = process.env.GOOGLE_SHEET_ID
  const serviceEmail = process.env.GOOGLE_SERVICE_EMAIL
  const privateKey = process.env.GOOGLE_PRIVATE_KEY

  if (!sheetId || !serviceEmail || !privateKey) {
    return res.status(200).json({ saved: false, source: 'local' })
  }

  try {
    const { google } = await import('googleapis')
    const auth = new google.auth.JWT(serviceEmail, null, privateKey.replace(/\\n/g, '\n'), [
      'https://www.googleapis.com/auth/spreadsheets',
    ])
    const sheets = google.sheets({ version: 'v4', auth })
    const tabName = process.env.GOOGLE_SHEET_TAB || 'Guest List'
    const range = `${tabName}!A:H`

    const read = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range,
    })

    const rows = read.data.values
    if (!rows || rows.length < 2) {
      return res.status(404).json({ error: 'No data' })
    }

    const headers = rows[0].map((h) => h.trim().toLowerCase())
    const guestIndex = rows.slice(1).findIndex((row, i) => {
      const gid = `g${String(i + 1).padStart(3, '0')}`
      return gid === id
    })

    if (guestIndex === -1) {
      return res.status(404).json({ error: 'Guest not found' })
    }

    const rowNum = guestIndex + 2
    const phoneCol = String.fromCharCode(65 + headers.indexOf('phone'))
    const emailCol = String.fromCharCode(65 + headers.indexOf('email'))

    const updates = []
    if (phone && phoneCol !== '@') {
      updates.push({ range: `${tabName}!${phoneCol}${rowNum}`, values: [[phone]] })
    }
    if (email && emailCol !== '@') {
      updates.push({ range: `${tabName}!${emailCol}${rowNum}`, values: [[email]] })
    }

    if (updates.length > 0) {
      await sheets.spreadsheets.values.batchUpdate({
        spreadsheetId: sheetId,
        requestBody: { data: updates, valueInputOption: 'USER_ENTERED' },
      })
    }

    return res.json({ saved: true, source: 'sheet' })
  } catch (err) {
    console.error('Sheet update failed:', err)
    return res.status(200).json({ saved: false, source: 'local' })
  }
}
