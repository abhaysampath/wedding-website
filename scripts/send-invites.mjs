#!/usr/bin/env node
/**
 * Send invite emails to guests who haven't logged in yet.
 *
 * Usage:
 *   node scripts/send-invites.mjs                    # Dry run (preview only)
 *   node scripts/send-invites.mjs --send             # Actually send emails
 *   node scripts/send-invites.mjs --limit 5          # Send to first 5 guests only
 *   node scripts/send-invites.mjs --test-email you@example.com  # Send test to specific email
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

function buildInviteEmail(guest) {
  const name = [guest.title, guest.firstName, guest.lastName].filter(Boolean).join(' ').trim()
  const greeting = guest.firstName || 'Friend'

  const invited = guest.invitedTo.toLowerCase()
  const hasUs = invited.includes('us') || invited.includes('both')
  const hasIndia = invited.includes('india') || invited.includes('both')

  let eventDetails = ''
  if (hasUs && hasIndia) {
    eventDetails = `
      <p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.6; color: #4A3D2E;">
        We're getting married in <strong>two ceremonies</strong> — one in New York and one in Chennai — and we'd be honored to have you celebrate with us.
      </p>
      <div style="margin: 20px 0; padding: 16px; background-color: #FAF7F2; border-left: 2px solid #C9A96E;">
        <p style="margin: 0 0 8px 0; font-size: 14px; color: #2B1F14;"><strong>US Wedding</strong></p>
        <p style="margin: 0; font-size: 13px; color: #6B5D4F;">Sunday, May 30, 2027 · Stone Mill, NY Botanical Garden</p>
      </div>
      <div style="margin: 20px 0; padding: 16px; background-color: #FAF7F2; border-left: 2px solid #C9A96E;">
        <p style="margin: 0 0 8px 0; font-size: 14px; color: #2B1F14;"><strong>India Wedding</strong></p>
        <p style="margin: 0; font-size: 13px; color: #6B5D4F;">Thursday, February 25, 2027 · Dwaraka Palace, Chennai</p>
      </div>
    `
  } else if (hasUs) {
    eventDetails = `
      <p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.6; color: #4A3D2E;">
        We're getting married and we'd be honored to have you celebrate with us!
      </p>
      <div style="margin: 20px 0; padding: 16px; background-color: #FAF7F2; border-left: 2px solid #C9A96E;">
        <p style="margin: 0 0 8px 0; font-size: 14px; color: #2B1F14;"><strong>US Wedding</strong></p>
        <p style="margin: 0; font-size: 13px; color: #6B5D4F;">Sunday, May 30, 2027 · Stone Mill, NY Botanical Garden</p>
      </div>
    `
  } else if (hasIndia) {
    eventDetails = `
      <p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.6; color: #4A3D2E;">
        We're getting married and we'd be honored to have you celebrate with us!
      </p>
      <div style="margin: 20px 0; padding: 16px; background-color: #FAF7F2; border-left: 2px solid #C9A96E;">
        <p style="margin: 0 0 8px 0; font-size: 14px; color: #2B1F14;"><strong>India Wedding</strong></p>
        <p style="margin: 0; font-size: 13px; color: #6B5D4F;">Thursday, February 25, 2027 · Dwaraka Palace, Chennai</p>
      </div>
    `
  }

  const html = `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width" />
        <title>You're invited to Rebecca & Abhay's wedding!</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #FAF7F2; font-family: 'Georgia', 'Times New Roman', serif;">
        <div style="max-width: 600px; margin: 0 auto; padding: 32px 24px;">
          <div style="text-align: center; margin-bottom: 32px;">
            <p style="margin: 0; font-size: 12px; letter-spacing: 0.3em; text-transform: uppercase; color: #C9A96E;">Rebecca &amp; Abhay</p>
            <p style="margin: 4px 0 0 0; font-size: 11px; letter-spacing: 0.2em; text-transform: uppercase; color: #6B5D4F;">May 30, 2027 &nbsp;·&nbsp; February 25, 2027</p>
          </div>
          <div style="background-color: #FFFFFF; border: 1px solid #E8DDC9; padding: 32px 28px;">
            <p style="margin: 0 0 16px 0; font-size: 22px; color: #2B1F14; font-weight: 400;">Dear ${name},</p>
            ${eventDetails}
            <p style="margin: 24px 0 0 0; font-size: 15px; line-height: 1.6; color: #4A3D2E;">
              Please visit our wedding website to RSVP and see all the details:
            </p>
            <div style="margin: 24px 0; text-align: center;">
              <a href="https://abhayandrebecca.com" style="display: inline-block; padding: 14px 32px; background-color: #C9A96E; color: #FFFFFF; text-decoration: none; font-size: 14px; letter-spacing: 0.1em; text-transform: uppercase; border-radius: 2px;">Visit Wedding Website</a>
            </div>
            <p style="margin: 24px 0 0 0; font-size: 13px; line-height: 1.6; color: #8A7B6B;">
              If you have any questions, please don't hesitate to reach out to us directly.
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
    subject: `You're invited to Rebecca & Abhay's wedding!`,
    html,
  }
}

async function main() {
  console.log('📧 Fetching guest list from Google Sheets...')
  const guests = await getGuests()
  console.log(`✓ Found ${guests.length} guests`)

  const eligible = guests.filter(g => {
    if (!g.email) return false
    if (g.lastLogin) return false
    return true
  })

  console.log(`✓ Found ${eligible.length} guests who haven't logged in`)

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
    console.log(`  - ${name} <${g.email}> (invited to: ${g.invitedTo})`)
  })

  if (isDryRun) {
    console.log('\n🔍 DRY RUN - No emails sent')
    console.log('To send emails, run: node scripts/send-invites.mjs --send')

    if (toSend.length > 0) {
      const sample = toSend[0]
      const email = buildInviteEmail(sample)
      const outputPath = path.join(__dirname, '..', '.test-output', 'invite-sample.html')
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
    const email = buildInviteEmail(guest)
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
