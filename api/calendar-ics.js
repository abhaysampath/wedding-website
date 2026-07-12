import { isAllowedOrigin } from './_origin.js'
import { getSession } from './_session.js'
import { applyLimit } from './_rate-limit.js'
import SHEET_CONFIG from './_sheets-config.js'
import weddingsData from '../src/data/weddings.json' with { type: 'json' }

let _colMapCache = null

async function getColumnMap(sheets, sheetId, tabName) {
  if (_colMapCache && _colMapCache.sheetId === sheetId && _colMapCache.tabName === tabName) {
    return _colMapCache
  }
  const meta = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: `${tabName}!A1:Z1`,
  })
  const headers = meta.data.values?.[0] || []
  const colMap = {}
  for (const [field, label] of Object.entries(SHEET_CONFIG.guests.columns)) {
    const idx = headers.findIndex(h => String(h).trim().toLowerCase() === label.toLowerCase())
    if (idx !== -1) colMap[field] = idx
  }
  _colMapCache = { sheetId, tabName, colMap }
  return colMap
}

function colLetter(n) {
  let s = ''
  let i = n
  while (i >= 0) {
    s = String.fromCharCode(65 + (i % 26)) + s
    i = Math.floor(i / 26) - 1
  }
  return s
}

function lastColLetter(colMap) {
  const indices = Object.values(colMap)
  if (indices.length === 0) return 'Z'
  return colLetter(Math.max(...indices))
}

function normalizeRsvp(value) {
  if (value === 'YES') return 'Yes'
  if (value === 'NO') return 'No'
  return value || ''
}

function rowToGuest(row, colMap) {
  if (!row || row.length === 0) return null
  return {
    firstName: String(row[colMap.firstName] || '').trim(),
    lastName: String(row[colMap.lastName] || '').trim(),
    email: String(row[colMap.email] || '').trim(),
    invitedTo: String(row[colMap.invitedTo] || '').trim(),
    rsvpUs: normalizeRsvp(String(row[colMap.rsvpUs] || '').trim()),
    rsvpIndia: normalizeRsvp(String(row[colMap.rsvpIndia] || '').trim()),
  }
}

function rowIndexFromId(id) {
  if (!id) return 0
  return parseInt(String(id).replace(/[^\d]/g, ''), 10)
}

function parseInvitedWeddings(invitedTo) {
  const v = String(invitedTo || '').toLowerCase()
  const weddings = []
  const wantsBoth = v.includes('both')
  if (wantsBoth || v.includes('us')) weddings.push('us')
  if (wantsBoth || v.includes('india')) weddings.push('india')
  return weddings
}

function formatDateForICS(dateStr) {
  const date = new Date(dateStr)
  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
}

function generateICS(events) {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Rebecca & Abhay//Wedding//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ]

  events.forEach((event, idx) => {
    const uid = `wedding-event-${idx + 1}@abhayandrebecca.com`
    const now = formatDateForICS(new Date().toISOString())

    lines.push('BEGIN:VEVENT')
    lines.push(`UID:${uid}`)
    lines.push(`DTSTAMP:${now}`)
    lines.push(`DTSTART:${event.dtstart}`)
    lines.push(`DTEND:${event.dtend}`)
    lines.push(`SUMMARY:${event.summary}`)
    if (event.description) lines.push(`DESCRIPTION:${event.description}`)
    if (event.location) lines.push(`LOCATION:${event.location}`)
    lines.push('END:VEVENT')
  })

  lines.push('END:VCALENDAR')
  return lines.join('\r\n')
}

export default async function handler(req, res) {
  if (!isAllowedOrigin(req)) {
    return res.status(403).json({ error: 'Forbidden' })
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const limited = applyLimit(req, res, 'calendar-ics')
  if (limited) return limited

  const session = await getSession(req)
  if (!session) {
    return res.status(401).json({ error: 'Authentication required' })
  }
  if (session.kind === 'unconfigured') {
    return res.status(503).json({ error: 'Server auth not configured' })
  }

  const sheetId = process.env.GOOGLE_SHEET_ID
  const serviceEmail = process.env.GOOGLE_SERVICE_EMAIL
  const privateKey = process.env.GOOGLE_PRIVATE_KEY
  if (!sheetId || !serviceEmail || !privateKey || privateKey.length < 200) {
    return res.status(503).json({ error: 'Sheet not configured' })
  }

  const userRowIndex = rowIndexFromId(session.guestId)
  if (isNaN(userRowIndex) || userRowIndex < 1) {
    return res.status(400).json({ error: 'Invalid guest id in session' })
  }

  try {
    const { google } = await import('googleapis')
    const auth = new google.auth.JWT({
      email: serviceEmail,
      key: privateKey.replace(/\\n/g, '\n'),
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    })
    const sheets = google.sheets({ version: 'v4', auth })
    const tabName = process.env.GOOGLE_SHEET_TAB || SHEET_CONFIG.guests.tab
    const colMap = await getColumnMap(sheets, sheetId, tabName)
    const lastCol = lastColLetter(colMap)

    const userRes = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: `${tabName}!A${userRowIndex + 1}:${lastCol}${userRowIndex + 1}`,
    })
    const userRow = userRes.data.values?.[0] || []
    if (userRow.length === 0) {
      return res.status(404).json({ error: 'Guest not found' })
    }
    const user = rowToGuest(userRow, colMap)

    const invited = parseInvitedWeddings(user.invitedTo)
    const events = []

    if (invited.includes('us') && user.rsvpUs === 'Yes') {
      const usWedding = weddingsData.us
      usWedding.timeline.forEach(event => {
        if (event.visibility === 'public' || event.visibility === 'close_family') {
          events.push({
            summary: `${event.label} — Rebecca & Abhay's Wedding`,
            description: `View details: https://abhayandrebecca.com`,
            location: event.location || usWedding.venue,
            dtstart: formatDateForICS(`${usWedding.date} ${event.time || '18:00'}`),
            dtend: formatDateForICS(`${usWedding.date} ${event.time || '20:00'}`),
          })
        }
      })
    }

    if (invited.includes('india') && user.rsvpIndia === 'Yes') {
      const indiaWedding = weddingsData.india
      indiaWedding.timeline.forEach(event => {
        events.push({
          summary: `${event.label} — Rebecca & Abhay's Wedding`,
          description: `View details: https://abhayandrebecca.com`,
          location: event.location || indiaWedding.venue,
          dtstart: formatDateForICS(`${indiaWedding.date} ${event.time || '10:00'}`),
          dtend: formatDateForICS(`${indiaWedding.date} ${event.time || '12:00'}`),
        })
      })
    }

    if (events.length === 0) {
      return res.status(400).json({ error: 'No RSVP events to export' })
    }

    const icsContent = generateICS(events)

    res.setHeader('Content-Type', 'text/calendar; charset=utf-8')
    res.setHeader('Content-Disposition', 'attachment; filename="rebecca-abhay-wedding.ics"')
    res.status(200).send(icsContent)
  } catch (err) {
    console.error('Calendar ICS generation failed:', err)
    return res.status(500).json({ error: err?.message || 'Server error' })
  }
}
