#!/usr/bin/env node
/**
 * Send reminder emails to guests who logged in but haven't RSVPed.
 *
 * Usage:
 *   node scripts/send-reminders.mjs                    # Dry run (preview only)
 *   node scripts/send-reminders.mjs --send             # Actually send emails
 *   node scripts/send-reminders.mjs --limit 5          # Send to first 5 guests only
 *   node scripts/send-reminders.mjs --test-email you@example.com  # Send test to specific email
 */

import { google } from 'googleapis'
import { Resend } from 'resend'
import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '..', '.env') })

const SHEET_ID = process.env.GOOGLE_SHEET_ID
const SERVICE_EMAIL = process.env.GOOGLE_SERVICE_EMAIL
const PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n')
const RESEND_API_KEY = process.env.RESEND_API_KEY

if (!SHEET_ID || !SERVICE_EMAIL || !PRIVATE_KEY) {
  console.error('❌ Missing Google Sheets credentials in .env')
  process.exit(1)
}

if (!RESEND_API_KEY) {
  console.error('❌ Missing RESEND_API_KEY in .env')
  process.exit(1)
}

const args = process.argv.slice(2)
const isDryRun = !args.includes('--send')
const limit = args.includes('--limit') ? parseInt(args[args.indexOf('--limit') + 1]) : null
const testEmail = args.includes('--test-email') ? args[args.indexOf('--test-email') + 1] : null

async function getGuests() {
  const auth = new google.auth.JWT({
    email: SERVICE_EMAIL,
    key: PRIVATE_KEY,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  })

  const sheets = google.sheets({ version: 'v4', auth })
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: 'Guests!A:Z',
  })

  const rows = response.data.values || []
  if (rows.length === 0) return []

  const headers = rows[0]
  const colMap = {}
  headers.forEach((header, idx) => {
    colMap[header.trim()] = idx
  })

  return rows.slice(1).map((row, idx) => ({
    id: `g${String(idx + 2).padStart(3, '0')}`,
    rowNumber: idx + 2,
    firstName: row[colMap['First Name']] || '',
    lastName: row[colMap['Last Name']] || '',
    title: row[colMap['Title']] || '',
    email: row[colMap['Email']] || '',
    invitedTo: row[colMap['Invited To']] || '',
    rsvpUs: row[colMap['US-RSVP']] || '',
    rsvpIndia: row[colMap['India-RSVP']] || '',
    lastLogin: row[colMap['Last Login']] || '',
  }))
}

function buildReminderEmail(guest) {
  const name = [guest.title, guest.firstName, guest.lastName].filter(Boolean).join(' ').trim()
  const greeting = guest.firstName || 'Friend'

  const invited = guest.invitedTo.toLowerCase()
  const hasUs = invited.includes('us') || invited.includes('both')
  const hasIndia = invited.includes('india') || invited.includes('both')

  let rsvpStatus = ''
  if (hasUs && !guest.rsvpUs) {
    rsvpStatus += `<li style="margin-bottom: 8px;">US Wedding (May 30, 2027)</li>`
  }
  if (hasIndia && !guest.rsvpIndia) {
    rsvpStatus += `<li style="margin-bottom: 8px;">India Wedding (February 25, 2027)</li>`
  }

  const html = `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width" />
        <title>RSVP reminder for Rebecca & Abhay's wedding</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #FAF7F2; font-family: 'Georgia', 'Times New Roman', serif;">
        <div style="max-width: 600px; margin: 0 auto; padding: 32px 24px;">
          <div style="text-align: center; margin-bottom: 32px;">
            <p style="margin: 0; font-size: 12px; letter-spacing: 0.3em; text-transform: uppercase; color: #C9A96E;">Rebecca &amp; Abhay</p>
            <p style="margin: 4px 0 0 0; font-size: 11px; letter-spacing: 0.2em; text-transform: uppercase; color: #6B5D4F;">May 30, 2027 &nbsp;·&nbsp; February 25, 2027</p>
          </div>
          <div style="background-color: #FFFFFF; border: 1px solid #E8DDC9; padding: 32px 28px;">
            <p style="margin: 0 0 16px 0; font-size: 22px; color: #2B1F14; font-weight: 400;">Hi ${greeting},</p>
            <p style="margin: 0 0 20px 0; font-size: 15px; line-height: 1.6; color: #4A3D2E;">
              We noticed you haven't RSVPed yet for:
            </p>
            <ul style="margin: 0 0 24px 20px; padding: 0; font-size: 15px; line-height: 1.8; color: #4A3D2E;">
              ${rsvpStatus}
            </ul>
            <p style="margin: 0 0 20px 0; font-size: 15px; line-height: 1.6; color: #4A3D2E;">
              We'd love to know if you'll be able to celebrate with us! Please take a moment to RSVP:
            </p>
            <div style="margin: 24px 0; text-align: center;">
              <a href="https://abhayandrebecca.com" style="display: inline-block; padding: 14px 32px; background-color: #C9A96E; color: #FFFFFF; text-decoration: none; font-size: 14px; letter-spacing: 0.1em; text-transform: uppercase; border-radius: 2px;">RSVP Now</a>
            </div>
            <p style="margin: 24px 0 0 0; font-size: 13px; line-height: 1.6; color: #8A7B6B;">
              If you've already responded or have any questions, please reach out to us directly.
            </p>
          </div>
          <div style="text-align: center; margin-top: 24px; font-size: 11px; color: #8A7B6B; letter-spacing: 0.05em;">
            <p style="margin: 0;">With love,</p>
            <p style="margin: 4px 0 0 0; font-style: italic;">Rebecca &amp; Abhay</p>
          </div>
        </div>
      </body>
    </html>
  `

  return {
    subject: `RSVP reminder for Rebecca & Abhay's wedding`,
    html,
  }
}

async function main() {
  console.log('📧 Fetching guest list from Google Sheets...')
  const guests = await getGuests()
  console.log(`✓ Found ${guests.length} guests`)

  const eligible = guests.filter(g => {
    if (!g.email) return false
    if (!g.lastLogin) return false
    const invited = g.invitedTo.toLowerCase()
    const hasUs = invited.includes('us') || invited.includes('both')
    const hasIndia = invited.includes('india') || invited.includes('both')
    const needsUsRsvp = hasUs && !g.rsvpUs
    const needsIndiaRsvp = hasIndia && !g.rsvpIndia
    return needsUsRsvp || needsIndiaRsvp
  })

  console.log(`✓ Found ${eligible.length} guests who logged in but haven't fully RSVPed`)

  let toSend = eligible
  if (testEmail) {
    toSend = eligible.filter(g => g.email === testEmail)
    console.log(`✓ Filtered to test email: ${testEmail} (${toSend.length} found)`)
  }
  if (limit) {
    toSend = toSend.slice(0, limit)
    console.log(`✓ Limited to first ${limit} guests`)
  }

  console.log(`\n📋 Will send to ${toSend.length} guests:`)
  toSend.forEach(g => {
    const name = [g.title, g.firstName, g.lastName].filter(Boolean).join(' ').trim()
    const invited = g.invitedTo.toLowerCase()
    const hasUs = invited.includes('us') || invited.includes('both')
    const hasIndia = invited.includes('india') || invited.includes('both')
    const missing = []
    if (hasUs && !g.rsvpUs) missing.push('US')
    if (hasIndia && !g.rsvpIndia) missing.push('India')
    console.log(`  - ${name} <${g.email}> (missing: ${missing.join(', ')})`)
  })

  if (isDryRun) {
    console.log('\n🔍 DRY RUN - No emails sent')
    console.log('To send emails, run: node scripts/send-reminders.mjs --send')

    if (toSend.length > 0) {
      const sample = toSend[0]
      const email = buildReminderEmail(sample)
      const outputPath = path.join(__dirname, '..', '.test-output', 'reminder-sample.html')
      fs.mkdirSync(path.dirname(outputPath), { recursive: true })
      fs.writeFileSync(outputPath, email.html)
      console.log(`\n📄 Sample email saved to: ${outputPath}`)
    }
    return
  }

  console.log('\n📤 Sending emails...')
  const resend = new Resend(RESEND_API_KEY)
  let sent = 0
  let failed = 0

  for (const guest of toSend) {
    const email = buildReminderEmail(guest)
    try {
      await resend.emails.send({
        from: 'Rebecca & Abhay <onboarding@resend.dev>',
        to: guest.email,
        subject: email.subject,
        html: email.html,
      })
      sent++
      console.log(`✓ Sent to ${guest.email}`)
    } catch (err) {
      failed++
      console.error(`✗ Failed to send to ${guest.email}:`, err.message)
    }
  }

  console.log(`\n✅ Done! Sent: ${sent}, Failed: ${failed}`)
}

main().catch(err => {
  console.error('❌ Error:', err)
  process.exit(1)
})
