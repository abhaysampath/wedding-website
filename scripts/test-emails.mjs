#!/usr/bin/env node
/**
 * Generate test emails for all guest types (US, India, Both).
 * This creates sample HTML files in .test-output/ for manual review.
 *
 * Usage:
 *   node scripts/test-emails.mjs
 */

import { google } from 'googleapis'
import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '..', '.env') })

const SHEET_ID = process.env.GOOGLE_SHEET_ID
const SERVICE_EMAIL = process.env.GOOGLE_SERVICE_EMAIL
const PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n')

if (!SHEET_ID || !SERVICE_EMAIL || !PRIVATE_KEY) {
  console.error('❌ Missing Google Sheets credentials in .env')
  process.exit(1)
}

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

  return `
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
}

function buildReminderEmail(guest) {
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

  return `
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
}

function buildConfirmationEmail(guest) {
  const name = [guest.title, guest.firstName, guest.lastName].filter(Boolean).join(' ').trim()
  const greeting = guest.firstName || 'Friend'
  const invited = guest.invitedTo.toLowerCase()
  const hasUs = invited.includes('us') || invited.includes('both')
  const hasIndia = invited.includes('india') || invited.includes('both')

  let rsvpRows = ''
  if (hasUs) {
    const status = guest.rsvpUs || '—'
    rsvpRows += `
      <tr>
        <td style="padding: 8px 0; color: #6B5D4F; font-size: 14px; width: 50%;">US Wedding</td>
        <td style="padding: 8px 0; color: #C9A96E; font-size: 14px; font-weight: 600; text-align: right;">${status}</td>
      </tr>
    `
  }
  if (hasIndia) {
    const status = guest.rsvpIndia || '—'
    rsvpRows += `
      <tr>
        <td style="padding: 8px 0; color: #6B5D4F; font-size: 14px; width: 50%;">India Wedding</td>
        <td style="padding: 8px 0; color: #C9A96E; font-size: 14px; font-weight: 600; text-align: right;">${status}</td>
      </tr>
    `
  }

  return `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width" />
        <title>Your RSVP for Rebecca & Abhay's wedding</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #FAF7F2; font-family: 'Georgia', 'Times New Roman', serif;">
        <div style="max-width: 600px; margin: 0 auto; padding: 32px 24px;">
          <div style="text-align: center; margin-bottom: 32px;">
            <p style="margin: 0; font-size: 12px; letter-spacing: 0.3em; text-transform: uppercase; color: #C9A96E;">Rebecca &amp; Abhay</p>
            <p style="margin: 4px 0 0 0; font-size: 11px; letter-spacing: 0.2em; text-transform: uppercase; color: #6B5D4F;">May 30, 2027 &nbsp;·&nbsp; February 25, 2027</p>
          </div>
          <div style="background-color: #FFFFFF; border: 1px solid #E8DDC9; padding: 32px 28px;">
            <p style="margin: 0 0 16px 0; font-size: 22px; color: #2B1F14; font-weight: 400;">Thank you, ${name}.</p>
            <p style="margin: 0 0 20px 0; font-size: 15px; line-height: 1.6; color: #4A3D2E;">
              We're so grateful you're joining us in celebrating our wedding. Here's a summary of your RSVP:
            </p>
            <table style="width: 100%; border-collapse: collapse; margin: 0;">
              <tr>
                <td colspan="2" style="padding: 0 0 8px 0; font-size: 11px; letter-spacing: 0.2em; text-transform: uppercase; color: #8A7B6B;">Your RSVP</td>
              </tr>
              ${rsvpRows}
            </table>
            <div style="margin-top: 24px; padding: 20px; background-color: #FAF7F2; border-left: 2px solid #C9A96E;">
              <p style="margin: 0 0 12px 0; font-size: 11px; letter-spacing: 0.2em; text-transform: uppercase; color: #8A7B6B;">Your Events</p>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 12px 0; border-bottom: 1px solid #E8DDC9;">
                    <p style="margin: 0 0 4px 0; font-size: 14px; color: #2B1F14; font-weight: 600;">Ceremony</p>
                    <p style="margin: 0; font-size: 12px; color: #6B5D4F;">Sunday, May 30, 2027</p>
                    <a href="https://calendar.google.com/calendar/render?action=TEMPLATE&text=Ceremony%20—%20Rebecca%20%26%20Abhay's%20Wedding&dates=Sunday,%20May%2030,%202027&details=View%20details:%20https://abhayandrebecca.com&location=Stone%20Mill,%20NY%20Botanical%20Garden" target="_blank" style="display: inline-block; margin-top: 8px; font-size: 11px; color: #C9A96E; text-decoration: none; letter-spacing: 0.1em; text-transform: uppercase;">Add to Google Calendar →</a>
                  </td>
                </tr>
              </table>
            </div>
            <p style="margin: 24px 0 0 0; font-size: 15px; line-height: 1.6; color: #4A3D2E;">
              If you need to update anything, you can sign back in to the
              <a href="https://abhayandrebecca.com" style="color: #C9A96E; text-decoration: underline;">wedding website</a>
              at any time.
            </p>
            <p style="margin: 24px 0 0 0; font-size: 15px; line-height: 1.6; color: #4A3D2E;">
              We can't wait to celebrate with you.
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
}

async function main() {
  console.log('📧 Fetching guest list from Google Sheets...')
  const guests = await getGuests()
  console.log(`✓ Found ${guests.length} guests`)

  const outputDir = path.join(__dirname, '..', '.test-output')
  fs.mkdirSync(outputDir, { recursive: true })

  const usGuest = guests.find(g => g.invitedTo.toLowerCase() === 'us' && g.email)
  const indiaGuest = guests.find(g => g.invitedTo.toLowerCase() === 'india' && g.email)
  const bothGuest = guests.find(g => g.invitedTo.toLowerCase() === 'both' && g.email)

  console.log('\n📋 Sample guests found:')
  if (usGuest) console.log(`  US: ${usGuest.firstName} ${usGuest.lastName} <${usGuest.email}>`)
  if (indiaGuest) console.log(`  India: ${indiaGuest.firstName} ${indiaGuest.lastName} <${indiaGuest.email}>`)
  if (bothGuest) console.log(`  Both: ${bothGuest.firstName} ${bothGuest.lastName} <${bothGuest.email}>`)

  if (usGuest) {
    fs.writeFileSync(path.join(outputDir, 'invite-us.html'), buildInviteEmail(usGuest))
    fs.writeFileSync(path.join(outputDir, 'reminder-us.html'), buildReminderEmail(usGuest))
    usGuest.rsvpUs = 'YES'
    fs.writeFileSync(path.join(outputDir, 'confirmation-us.html'), buildConfirmationEmail(usGuest))
    console.log('✓ Generated US guest emails')
  }

  if (indiaGuest) {
    fs.writeFileSync(path.join(outputDir, 'invite-india.html'), buildInviteEmail(indiaGuest))
    fs.writeFileSync(path.join(outputDir, 'reminder-india.html'), buildReminderEmail(indiaGuest))
    indiaGuest.rsvpIndia = 'YES'
    fs.writeFileSync(path.join(outputDir, 'confirmation-india.html'), buildConfirmationEmail(indiaGuest))
    console.log('✓ Generated India guest emails')
  }

  if (bothGuest) {
    fs.writeFileSync(path.join(outputDir, 'invite-both.html'), buildInviteEmail(bothGuest))
    fs.writeFileSync(path.join(outputDir, 'reminder-both.html'), buildReminderEmail(bothGuest))
    bothGuest.rsvpUs = 'YES'
    bothGuest.rsvpIndia = 'YES'
    fs.writeFileSync(path.join(outputDir, 'confirmation-both.html'), buildConfirmationEmail(bothGuest))
    console.log('✓ Generated Both guest emails')
  }

  console.log(`\n✅ All test emails saved to: ${outputDir}`)
  console.log('\nOpen the HTML files in your browser to preview.')
}

main().catch(err => {
  console.error('❌ Error:', err)
  process.exit(1)
})
