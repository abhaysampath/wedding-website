import { google } from 'googleapis'

const serviceEmail = process.env.GOOGLE_SERVICE_EMAIL
const privateKey = process.env.GOOGLE_PRIVATE_KEY
const sheetId = process.env.GOOGLE_SHEET_ID

const auth = new google.auth.JWT({
  email: serviceEmail,
  key: privateKey.replace(/\\n/g, '\n'),
  scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
})
const sheets = google.sheets({ version: 'v4', auth })

async function tryRead(label, range) {
  try {
    const res = await sheets.spreadsheets.values.get({ spreadsheetId: sheetId, range })
    console.log(`\n--- ${label} (${range}) ---`)
    console.log(`  Rows: ${(res.data.values || []).length}`)
    if (res.data.values) {
      for (let i = 0; i < Math.min(res.data.values.length, 6); i++) {
        console.log(`  [${i}]`, JSON.stringify(res.data.values[i]))
      }
    }
  } catch (e) {
    const msg = e?.response?.data?.error?.message || e.message
    console.log(`\n--- ${label} --- ERROR: ${msg}`)
  }
}

// Try multiple tab name variations
for (const tab of ['GUESTS', 'Guests', 'Guest List', 'Guest']) {
  for (const range of ['A:I', 'A:Z', '1:5']) {
    await tryRead(tab, `${tab}!${range}`)
  }
}
