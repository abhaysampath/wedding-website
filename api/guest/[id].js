import SHEET_CONFIG from '../sheets-config.js'

export default async function handler(req, res) {
  if (req.method !== 'PATCH') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const sheetId = process.env.GOOGLE_SHEET_ID
  const serviceEmail = process.env.GOOGLE_SERVICE_EMAIL
  const privateKey = process.env.GOOGLE_PRIVATE_KEY

  if (!sheetId || !serviceEmail || !privateKey) {
    return res.status(503).json({ error: 'Sheet not configured' })
  }

  try {
    const id = req.query?.id || req.url.split('/').pop()
    const rowIndex = parseInt(id.replace(/[^\d]/g, ''), 10)
    if (isNaN(rowIndex) || rowIndex < 1) {
      return res.status(400).json({ error: 'Invalid row index' })
    }

    const data = typeof req.body === 'object' ? req.body : JSON.parse(req.body || '{}')

    const { google } = await import('googleapis')
    const auth = new google.auth.JWT({
      email: serviceEmail,
      key: privateKey,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    })
    const sheets = google.sheets({ version: 'v4', auth })
    const tabName = process.env.GOOGLE_SHEET_TAB || SHEET_CONFIG.guests.tab

    // Read headers to find column positions
    const meta = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: `${tabName}!A1:Z1`,
    })
    const headers = meta.data.values?.[0] || []
    const colMap = {}
    for (const [field, label] of Object.entries(SHEET_CONFIG.guests.columns)) {
      const idx = headers.findIndex((h) => h.trim().toLowerCase() === label.toLowerCase())
      if (idx !== -1) colMap[field] = idx
    }

    // Convert column index to letter
    function colLetter(n) {
      let s = ''
      while (n >= 0) { s = String.fromCharCode(65 + (n % 26)) + s; n = Math.floor(n / 26) - 1 }
      return s
    }

    const sheetRow = rowIndex + 1 // +1 for header row
    const updates = []

    if (data.phone !== undefined && colMap.phone !== undefined) {
      updates.push({ range: `${tabName}!${colLetter(colMap.phone)}${sheetRow}`, values: [[data.phone]] })
    }
    if (data.email !== undefined && colMap.email !== undefined) {
      updates.push({ range: `${tabName}!${colLetter(colMap.email)}${sheetRow}`, values: [[data.email]] })
    }
    if (data.address !== undefined && colMap.address !== undefined) {
      updates.push({ range: `${tabName}!${colLetter(colMap.address)}${sheetRow}`, values: [[data.address]] })
    }
    if (data.dietaryPreferences !== undefined && colMap.dietaryPreferences !== undefined) {
      updates.push({ range: `${tabName}!${colLetter(colMap.dietaryPreferences)}${sheetRow}`, values: [[data.dietaryPreferences]] })
    }
    if (data.lastLogin !== undefined && colMap.lastLogin !== undefined) {
      updates.push({ range: `${tabName}!${colLetter(colMap.lastLogin)}${sheetRow}`, values: [[data.lastLogin]] })
    }
    if (data.lastUpdated !== undefined && colMap.lastUpdated !== undefined) {
      updates.push({ range: `${tabName}!${colLetter(colMap.lastUpdated)}${sheetRow}`, values: [[data.lastUpdated]] })
    }
    if (data.loginFailed !== undefined && colMap.loginFailed !== undefined) {
      updates.push({ range: `${tabName}!${colLetter(colMap.loginFailed)}${sheetRow}`, values: [[data.loginFailed]] })
    }
    if (data.rsvpUs !== undefined && colMap.rsvpUs !== undefined) {
      updates.push({ range: `${tabName}!${colLetter(colMap.rsvpUs)}${sheetRow}`, values: [[data.rsvpUs]] })
    }
    if (data.rsvpIndia !== undefined && colMap.rsvpIndia !== undefined) {
      updates.push({ range: `${tabName}!${colLetter(colMap.rsvpIndia)}${sheetRow}`, values: [[data.rsvpIndia]] })
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
