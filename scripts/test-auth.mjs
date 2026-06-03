import { google } from 'googleapis'

const serviceEmail = process.env.GOOGLE_SERVICE_EMAIL
const privateKey = process.env.GOOGLE_PRIVATE_KEY
const sheetId = process.env.GOOGLE_SHEET_ID

console.log('Environment:')
console.log('  SHEET_ID:', sheetId)
console.log('  SERVICE_EMAIL:', serviceEmail)
console.log('  HAS_PRIVATE_KEY:', !!privateKey)
console.log('  PRIVATE_KEY_LENGTH:', privateKey?.length)

try {
  const auth = new google.auth.JWT({
    email: serviceEmail,
    key: privateKey,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  })

  // Try to get an access token first
  console.log('\nRequesting access token...')
  const token = await auth.getAccessToken()
  console.log('  Token obtained:', !!token)

  const sheets = google.sheets({ version: 'v4', auth })

  // Try to get sheet metadata
  console.log('\nFetching spreadsheet metadata...')
  const meta = await sheets.spreadsheets.get({
    spreadsheetId: sheetId,
    fields: 'sheets.properties',
  })
  console.log('  Success! Tabs found:', meta.data.sheets.length)
  for (const s of meta.data.sheets) {
    console.log('   -', s.properties.title)
  }

  // Try to read Guest tab
  console.log('\nReading Guests tab...')
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: 'GUESTS!A1:Z5',
  })
  console.log('  Rows:', res.data.values?.length || 0)
  if (res.data.values) {
    for (const row of res.data.values.slice(0, 3)) {
      console.log('  ', JSON.stringify(row))
    }
  }
} catch (err) {
  console.error('\nERROR:', err.message)
  console.error('  Code:', err.code)
  console.error('  Status:', err.status)
  if (err.response?.data?.error) {
    console.error('  Details:', JSON.stringify(err.response.data.error, null, 2))
  }
}
