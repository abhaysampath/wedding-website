/**
 * Google Sheets Guest List Syncer
 *
 * Reads guest data from a Google Sheet and generates src/data/guests.json.
 *
 * Setup:
 *   1. Create a Google Cloud project, enable Google Sheets API
 *   2. Create a service account, download the JSON key
 *   3. Share your Google Sheet with the service account email
 *   4. Copy .env.example to .env and fill in:
 *      - GOOGLE_SERVICE_ACCOUNT_EMAIL
 *      - GOOGLE_PRIVATE_KEY
 *      - GOOGLE_SHEET_ID
 *   5. Run: npm run sync-guests
 *
 * Expected sheet header row:
 *   firstName | lastName | side | relationship | role | weddings | plusOne | email
 *
 * side: "bride" or "groom"
 * role: "bride", "groom", "close_family", "invited_guest", "vendor"
 * weddings: comma-separated, e.g. "us" or "us,india"
 * plusOne: "true" or "false"
 */

import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const outputFile = join(__dirname, '..', 'src', 'data', 'guests.json')

async function syncFromSheet() {
  const envPath = join(__dirname, '..', '.env')

  if (!existsSync(envPath)) {
    console.log('No .env file found. Using local guests.json as-is.')
    console.log('See scripts/sync-guests.js for setup instructions.')
    return
  }

  let envContent
  try {
    envContent = readFileSync(envPath, 'utf-8')
  } catch {
    console.log('Could not read .env file. Using local guests.json.')
    return
  }

  const getEnv = (key) => {
    const match = envContent.match(new RegExp(`^${key}=["']?(.*?)["']?$`, 'm'))
    return match ? match[1] : null
  }

  const sheetId = getEnv('GOOGLE_SHEET_ID')
  const serviceEmail = getEnv('GOOGLE_SERVICE_ACCOUNT_EMAIL')
  const privateKey = getEnv('GOOGLE_PRIVATE_KEY')

  if (!sheetId || !serviceEmail || !privateKey) {
    console.log('Incomplete .env config. Using local guests.json.')
    return
  }

  // Dynamic import of googleapis (optional dependency)
  let google
  try {
    google = (await import('googleapis')).google
  } catch {
    console.log('googleapis package not installed. Run: npm install googleapis')
    console.log('Falling back to local guests.json.')
    return
  }

  const auth = new google.auth.JWT({
    email: serviceEmail,
    key: privateKey.replace(/\\n/g, '\n'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  })

  const sheets = google.sheets({ version: 'v4', auth })
  const range = 'Sheet1!A:H'

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range,
  })

  const rows = res.data.values
  if (!rows || rows.length < 2) {
    console.log('No data found in sheet.')
    return
  }

  const headers = rows[0].map((h) => h.trim().toLowerCase())
  const guests = rows.slice(1).map((row, i) => {
    const obj = {}
    headers.forEach((h, idx) => {
      obj[h] = (row[idx] || '').trim()
    })
    return {
      id: `g${String(i + 1).padStart(3, '0')}`,
      firstName: obj.firstname || '',
      lastName: obj.lastname || '',
      side: obj.side || 'bride',
      relationship: obj.relationship || '',
      role: obj.role || 'invited_guest',
      weddings: obj.weddings
        ? obj.weddings.split(',').map((w) => w.trim()).filter(Boolean)
        : ['us'],
      plusOne: obj.plusone === 'true',
    }
  })

  writeFileSync(outputFile, JSON.stringify(guests, null, 2))
  console.log(`Synced ${guests.length} guests from Google Sheet → src/data/guests.json`)
}

syncFromSheet().catch((err) => {
  console.error('Sync failed:', err.message)
  console.log('Falling back to local guests.json.')
})
