/**
 * Build-time data syncer
 *
 * Reads your Google Sheet once and writes src/data/*.js files.
 * The site uses these at build time — no runtime API calls, no auth needed in production.
 *
 * Run:   npm run sync
 * After: npm run build  (data is baked into the bundle)
 */

import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')

const SHEETS = {
  guests: { tab: 'GUESTS', range: 'A:P', columns: { firstName: 'First Name', lastName: 'Last Name', side: 'Side', relationship: 'Relationship', role: 'Role', weddings: 'Weddings', plusOne: 'Plus One' } },
  faq:    { tab: 'FAQ', range: 'A:C', columns: { question: 'Question', answer: 'Answer', wedding: 'Wedding' } },
}

function jsArray(name, rows) {
  return `const ${name} = ${JSON.stringify(rows, null, 2)}\n\nexport default ${name}\n`
}

async function run() {
  const envPath = join(root, '.env')
  if (!existsSync(envPath)) { console.log('No .env — using existing data/*.js files'); return }

  const env = readFileSync(envPath, 'utf-8')
  const get = (k) => { const m = env.match(new RegExp(`^${k}=["']?(.*?)["']?$`, 'm')); return m ? m[1] : null }
  const sheetId = get('GOOGLE_SHEET_ID')
  const serviceEmail = get('GOOGLE_SERVICE_EMAIL')
  const privateKey = get('GOOGLE_PRIVATE_KEY')
  if (!sheetId || !serviceEmail || !privateKey) { console.log('Incomplete .env — using existing data/*.js files'); return }

  const { google } = await import('googleapis')
  const auth = new google.auth.JWT({
    email: serviceEmail,
    key: privateKey.replace(/\\n/g, '\n'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  })
  const sheets = google.sheets({ version: 'v4', auth })

  for (const [key, cfg] of Object.entries(SHEETS)) {
    const res = await sheets.spreadsheets.values.get({ spreadsheetId: sheetId, range: `${cfg.tab}!${cfg.range}` }).catch(e => {
      console.error(`  ${cfg.tab}:`, e?.response?.data?.error?.message || e.message)
      return null
    })
    if (!res) continue

    const values = res.data.values
    if (!values || values.length < 2) { console.log(`  ${cfg.tab}: no data rows`); continue }

    const headerRow = values[0]
    const idxMap = {}
    for (const [field, label] of Object.entries(cfg.columns)) {
      const i = headerRow.findIndex(h => h.trim().toLowerCase() === label.toLowerCase())
      if (i !== -1) idxMap[field] = i
    }

    let rows
    if (key === 'guests') {
      rows = values.slice(1).map((row, i) => {
        const g = {}
        for (const [field, i_] of Object.entries(idxMap)) g[field] = (row[i_] || '').trim()
        return {
          id: `g${String(i + 1).padStart(3, '0')}`,
          firstName: g.firstName || '',
          lastName: g.lastName || '',
          side: g.side || 'bride',
          relationship: g.relationship || '',
          role: g.role || 'invited_guest',
          weddings: (g.weddings || 'us').split(',').map(w => w.trim()),
          plusOne: (g.plusOne || '').toLowerCase() === 'true',
        }
      })
    } else {
      rows = values.slice(1).map((row) => {
        const o = {}
        for (const [field, i_] of Object.entries(idxMap)) o[field] = (row[i_] || '').trim()
        return o
      })
    }

    const filePath = join(root, 'src', 'data', `${key}.js`)
    writeFileSync(filePath, jsArray(key, rows))
    console.log(`  ${cfg.tab}: ${rows.length} rows → src/data/${key}.js`)
  }
}

run().catch(e => { console.error('Sync failed:', e.message) })
