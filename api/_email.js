/**
 * Shared email utilities for API endpoints.
 * Centralizes the HTML escape helper, the Resend client setup, and the
 * RSVP confirmation email builder.
 */

let _resend = null

export function getResend() {
  if (_resend) return _resend
  const API_KEY = process.env.RESEND_API_KEY
  if (!API_KEY) return null
  const { Resend } = require('resend')
  _resend = new Resend(API_KEY)
  return _resend
}

export function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export const ALERT_FROM = 'Wedding Site Alerts <onboarding@resend.dev>'
export const RSVP_FROM = 'Rebecca & Abhay <onboarding@resend.dev>'

/**
 * Shared email shell. Wraps body HTML in the consistent header/footer.
 */
export function emailShell({ title, preview, body }) {
  return `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width" />
        <title>${escapeHtml(title)}</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #FAF7F2; font-family: 'Georgia', 'Times New Roman', serif;">
        <span style="display: none; max-height: 0; overflow: hidden;">${escapeHtml(preview || '')}</span>
        <div style="max-width: 600px; margin: 0 auto; padding: 32px 24px;">
          <div style="text-align: center; margin-bottom: 32px;">
            <p style="margin: 0; font-size: 12px; letter-spacing: 0.3em; text-transform: uppercase; color: #C9A96E;">Rebecca &amp; Abhay</p>
            <p style="margin: 4px 0 0 0; font-size: 11px; letter-spacing: 0.2em; text-transform: uppercase; color: #6B5D4F;">May 30, 2027 &nbsp;·&nbsp; February 25, 2027</p>
          </div>
          <div style="background-color: #FFFFFF; border: 1px solid #E8DDC9; padding: 32px 28px;">
            ${body}
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

const WEDDING_LABELS = {
  us: { name: 'US Wedding', date: 'Sunday, May 30, 2027' },
  india: { name: 'India Wedding', date: 'Thursday, February 25, 2027' },
}

function normalizeRsvp(value) {
  if (value === 'YES') return 'Yes'
  if (value === 'NO') return 'No'
  return value || ''
}

function parseInvitedWeddings(invitedTo) {
  const v = String(invitedTo || '').toLowerCase()
  const weddings = []
  const wantsBoth = v.includes('both')
  if (wantsBoth || v.includes('us')) weddings.push('us')
  if (wantsBoth || v.includes('india')) weddings.push('india')
  return weddings
}

function rsvpRowHtml(label, value) {
  const display = value || '—'
  const isYes = value === 'Yes'
  const isNo = value === 'No'
  const color = isYes ? '#C9A96E' : isNo ? '#6B5D4F' : '#8A7B6B'
  const weight = isYes ? '600' : '400'
  return `
    <tr>
      <td style="padding: 8px 0; color: #6B5D4F; font-size: 14px; width: 50%;">${escapeHtml(label)}</td>
      <td style="padding: 8px 0; color: ${color}; font-size: 14px; font-weight: ${weight}; text-align: right;">${escapeHtml(display)}</td>
    </tr>
  `
}

/**
 * Build the RSVP confirmation email for a user (and their +1 guests if any
 * of them have responded). Returns { subject, html, preview }.
 *
 * `user` and each `plusOne` in `plusOnes` are normalized guest objects with
 * at least: firstName, lastName, invitedTo, rsvpUs, rsvpIndia,
 * dietaryPreferences, email (for the user only).
 */
export function buildConfirmationEmail({ user, plusOnes = [] }) {
  const firstName = String(user.firstName || '').trim()
  const lastName = String(user.lastName || '').trim()
  const fullName = [firstName, lastName].filter(Boolean).join(' ').trim()
  const greetingName = firstName || 'there'

  const invited = parseInvitedWeddings(user.invitedTo)
  const hasUs = invited.includes('us')
  const hasIndia = invited.includes('india')

  let rsvpRows = ''
  if (hasUs) rsvpRows += rsvpRowHtml(WEDDING_LABELS.us.name, normalizeRsvp(user.rsvpUs))
  if (hasIndia) rsvpRows += rsvpRowHtml(WEDDING_LABELS.india.name, normalizeRsvp(user.rsvpIndia))

  const plusOneBlocks = plusOnes
    .filter(p => normalizeRsvp(p.rsvpUs) || normalizeRsvp(p.rsvpIndia))
    .map(p => {
      const pName = [p.firstName, p.lastName].filter(Boolean).join(' ').trim() || 'Your guest'
      const pInvited = parseInvitedWeddings(p.invitedTo)
      let rows = ''
      if (pInvited.includes('us')) rows += rsvpRowHtml(WEDDING_LABELS.us.name, normalizeRsvp(p.rsvpUs))
      if (pInvited.includes('india'))
        rows += rsvpRowHtml(WEDDING_LABELS.india.name, normalizeRsvp(p.rsvpIndia))
      return `
        <div style="margin-top: 16px; padding: 16px; background-color: #FAF7F2; border-left: 2px solid #C9A96E;">
          <p style="margin: 0 0 6px 0; font-size: 11px; letter-spacing: 0.2em; text-transform: uppercase; color: #8A7B6B;">RSVP for</p>
          <p style="margin: 0 0 10px 0; font-size: 15px; color: #2B1F14;">${escapeHtml(pName)}</p>
          <table style="width: 100%; border-collapse: collapse;">${rows}</table>
        </div>
      `
    })
    .join('')

  const dietaryBlock = user.dietaryPreferences
    ? `
        <div style="margin-top: 16px; padding: 12px 16px; background-color: #FAF7F2; border-left: 2px solid #C9A96E;">
          <p style="margin: 0 0 4px 0; font-size: 11px; letter-spacing: 0.2em; text-transform: uppercase; color: #8A7B6B;">Dietary preferences noted</p>
          <p style="margin: 0; font-size: 14px; color: #2B1F14;">${escapeHtml(user.dietaryPreferences)}</p>
        </div>
      `
    : ''

  const rsvpTable = rsvpRows
    ? `
        <table style="width: 100%; border-collapse: collapse; margin: 0;">
          <tr>
            <td colspan="2" style="padding: 0 0 8px 0; font-size: 11px; letter-spacing: 0.2em; text-transform: uppercase; color: #8A7B6B;">Your RSVP</td>
          </tr>
          ${rsvpRows}
        </table>
      `
    : ''

  const summary = plusOneBlocks
    ? ' and the RSVPs you submitted on behalf of your guests'
    : ''

  const body = `
    <p style="margin: 0 0 16px 0; font-size: 22px; color: #2B1F14; font-weight: 400;">Thank you, ${escapeHtml(greetingName)}.</p>
    <p style="margin: 0 0 20px 0; font-size: 15px; line-height: 1.6; color: #4A3D2E;">
      We're so grateful you took the time to let us know. Here's a summary of your RSVP${summary}:
    </p>
    ${rsvpTable}
    ${plusOneBlocks}
    ${dietaryBlock}
    <p style="margin: 24px 0 0 0; font-size: 15px; line-height: 1.6; color: #4A3D2E;">
      If you need to update anything, you can sign back in to the
      <a href="https://abhayandrebecca.com" style="color: #C9A96E; text-decoration: underline;">wedding website</a>
      at any time.
    </p>
    <p style="margin: 24px 0 0 0; font-size: 15px; line-height: 1.6; color: #4A3D2E;">
      We can't wait to celebrate with you.
    </p>
  `

  return {
    subject: `Your RSVP for Rebecca & Abhay's wedding — ${fullName || 'Confirmation'}`,
    preview: `Thanks for RSVPing, ${greetingName}! Here's a summary of your response.`,
    html: emailShell({ title: 'RSVP Confirmation', preview: `Thanks for RSVPing, ${greetingName}!`, body }),
  }
}
