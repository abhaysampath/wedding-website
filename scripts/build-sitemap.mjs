/**
 * Build-time sitemap generator.
 *
 * Tries to fetch the live guest list from the Google Sheet. Falls back
 * to the local src/data/guests.js when env vars are missing (e.g. CI
 * without Google creds, or local dev).
 *
 * Output: public/sitemap.xml
 *
 * Run via `npm run build` (wired in scripts/verify-build.mjs).
 */

import { writeFileSync, existsSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const OUT = resolve(ROOT, 'public', 'sitemap.xml')

function getSiteUrl() {
  return process.env.SITE_URL || 'https://abhayandrebecca.com'
}

function getSlug(guest) {
  const full = `${guest.firstName || ''} ${guest.lastName || ''}`.trim()
  if (!full) return null
  return full
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
}

async function fetchFromSheet() {
  const sheetId = process.env.GOOGLE_SHEET_ID
  const serviceEmail = process.env.GOOGLE_SERVICE_EMAIL
  const privateKey = process.env.GOOGLE_PRIVATE_KEY
  if (!sheetId || !serviceEmail || !privateKey || privateKey.length < 200) return null

  try {
    const { google } = await import('googleapis')
    const auth = new google.auth.JWT({
      email: serviceEmail,
      key: privateKey.replace(/\\n/g, '\n'),
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    })
    const sheets = google.sheets({ version: 'v4', auth })
    const SHEET_CONFIG = (await import('../api/sheets-config.js')).default
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: `${SHEET_CONFIG.guests.tab}!A2:R`,
    })
    const rows = res.data.values || []
    return rows
      .map((row, i) => ({
        firstName: row[1] || '',
        lastName: row[3] || '',
        title: row[0] || '',
      }))
      .filter(g => g.title !== 'KIDS' && (g.firstName || g.lastName))
      .map(g => ({ ...g, id: `g${String(i + 1).padStart(3, '0')}` }))
  } catch (err) {
    console.warn('Sitemap: sheet fetch failed, using fallback:', err.message)
    return null
  }
}

async function loadFallback() {
  const mod = await import('../src/data/guests.js')
  return mod.default || []
}

function buildXml(urls) {
  const siteUrl = getSiteUrl()
  const entries = urls
    .map(
      u => `  <url>
    <loc>${u.loc}</loc>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`,
    )
    .join('\n')
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${siteUrl}/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
${entries}
</urlset>
`
}

export async function buildSitemap() {
  let guests = await fetchFromSheet()
  if (!guests) {
    guests = await loadFallback()
    console.log(`Sitemap: using fallback (${guests.length} guests)`)
  } else {
    console.log(`Sitemap: from sheet (${guests.length} guests)`)
  }

  const guestUrls = guests
    .map(g => {
      const slug = getSlug(g)
      if (!slug) return null
      return {
        loc: `${getSiteUrl()}/g/${encodeURIComponent(slug)}`,
        changefreq: 'weekly',
        priority: '0.7',
      }
    })
    .filter(Boolean)

  const xml = buildXml(guestUrls)
  writeFileSync(OUT, xml, 'utf8')
  console.log(`Sitemap: wrote ${OUT} (${guestUrls.length} guest URLs + 1 home)`)
  return guestUrls.length + 1
}

if (import.meta.url === `file://${process.argv[1]}`) {
  buildSitemap().catch(err => {
    console.error('Sitemap build failed:', err)
    process.exit(1)
  })
}
