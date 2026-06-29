import { describe, it, expect } from 'vitest'
import {
  escapeHtml,
  emailShell,
  buildConfirmationEmail,
} from './_email.js'

describe('_email helpers', () => {
  describe('escapeHtml', () => {
    it('escapes HTML metacharacters', () => {
      expect(escapeHtml('<script>alert("x")</script>')).toBe(
        '&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;',
      )
    })
    it('escapes ampersands first', () => {
      expect(escapeHtml('A & B & C')).toBe('A &amp; B &amp; C')
    })
    it('handles null and undefined', () => {
      expect(escapeHtml(null)).toBe('')
      expect(escapeHtml(undefined)).toBe('')
    })
    it('coerces non-strings', () => {
      expect(escapeHtml(42)).toBe('42')
      expect(escapeHtml(true)).toBe('true')
    })
  })

  describe('emailShell', () => {
    it('wraps body in a complete HTML document', () => {
      const html = emailShell({ title: 'Test', body: '<p>Hi</p>' })
      expect(html).toContain('<!doctype html>')
      expect(html).toContain('<title>Test</title>')
      expect(html).toContain('<p>Hi</p>')
    })
    it('escapes the title and preview', () => {
      const html = emailShell({
        title: '<bad>',
        preview: '<also bad>',
        body: 'safe',
      })
      expect(html).toContain('&lt;bad&gt;')
      expect(html).toContain('&lt;also bad&gt;')
      expect(html).not.toContain('<bad>')
    })
  })

  describe('buildConfirmationEmail', () => {
    it('returns a subject containing the user name and the html', () => {
      const { subject, html, preview } = buildConfirmationEmail({
        user: {
          firstName: 'Akshay',
          lastName: 'Sampath',
          email: 'a@b.com',
          invitedTo: 'US, India',
          rsvpUs: 'Yes',
          rsvpIndia: 'No',
          dietaryPreferences: '',
        },
        plusOnes: [],
      })
      expect(subject).toContain('Akshay Sampath')
      expect(subject).toContain('Rebecca & Abhay')
      expect(html).toContain('Thank you, Akshay')
      expect(html).toContain('US Wedding')
      expect(html).toContain('Yes')
      expect(html).toContain('No')
      expect(preview).toContain('Akshay')
    })

    it('only shows weddings the user is invited to', () => {
      const { html } = buildConfirmationEmail({
        user: {
          firstName: 'US',
          lastName: 'Only',
          email: 'u@x.com',
          invitedTo: 'US',
          rsvpUs: 'Yes',
          rsvpIndia: '',
          dietaryPreferences: '',
        },
        plusOnes: [],
      })
      expect(html).toContain('US Wedding')
      expect(html).not.toContain('India Wedding')
    })

    it('renders Yes/No for each invited wedding in the user table', () => {
      const { html } = buildConfirmationEmail({
        user: {
          firstName: 'Both',
          lastName: 'Weddings',
          email: 'b@x.com',
          invitedTo: 'Both',
          rsvpUs: 'Yes',
          rsvpIndia: 'No',
          dietaryPreferences: '',
        },
        plusOnes: [],
      })
      expect(html.match(/US Wedding/g).length).toBeGreaterThanOrEqual(1)
      expect(html.match(/India Wedding/g).length).toBeGreaterThanOrEqual(1)
    })

    it('shows dietary preferences only when set', () => {
      const withDiet = buildConfirmationEmail({
        user: {
          firstName: 'A',
          lastName: 'B',
          email: 'a@x.com',
          invitedTo: 'US',
          rsvpUs: 'Yes',
          rsvpIndia: '',
          dietaryPreferences: 'Vegetarian',
        },
        plusOnes: [],
      })
      expect(withDiet.html).toContain('Vegetarian')
      expect(withDiet.html).toContain('Dietary preferences noted')

      const withoutDiet = buildConfirmationEmail({
        user: {
          firstName: 'A',
          lastName: 'B',
          email: 'a@x.com',
          invitedTo: 'US',
          rsvpUs: 'Yes',
          rsvpIndia: '',
          dietaryPreferences: '',
        },
        plusOnes: [],
      })
      expect(withoutDiet.html).not.toContain('Dietary preferences noted')
    })

    it('renders an on-behalf-of block per +1 that has any RSVP', () => {
      const { html } = buildConfirmationEmail({
        user: {
          firstName: 'Host',
          lastName: 'Person',
          email: 'h@x.com',
          invitedTo: 'US',
          rsvpUs: 'Yes',
          rsvpIndia: '',
          dietaryPreferences: '',
        },
        plusOnes: [
          {
            firstName: 'Plus',
            lastName: 'One',
            invitedTo: 'US',
            rsvpUs: 'Yes',
            rsvpIndia: '',
          },
          {
            firstName: 'No',
            lastName: 'Response',
            invitedTo: 'US',
            rsvpUs: '',
            rsvpIndia: '',
          },
        ],
      })
      expect(html).toContain('Plus One')
      expect(html).not.toContain('No Response')
    })

    it('normalizes YES/NO values from the sheet', () => {
      const { html } = buildConfirmationEmail({
        user: {
          firstName: 'X',
          lastName: 'Y',
          email: 'x@y.com',
          invitedTo: 'Both',
          rsvpUs: 'YES',
          rsvpIndia: 'NO',
          dietaryPreferences: '',
        },
        plusOnes: [],
      })
      // Both rendered values should be the normalized "Yes"/"No"
      expect(html).toMatch(/Yes/)
      expect(html).toMatch(/No/)
    })

    it('escapes user-supplied values in the rendered html', () => {
      const { html } = buildConfirmationEmail({
        user: {
          firstName: '<img src=x onerror=alert(1)>',
          lastName: 'B',
          email: 'a@x.com',
          invitedTo: 'US',
          rsvpUs: 'Yes',
          rsvpIndia: '',
          dietaryPreferences: '<script>danger</script>',
        },
        plusOnes: [],
      })
      expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;')
      expect(html).toContain('&lt;script&gt;danger&lt;/script&gt;')
      expect(html).not.toContain('<script>danger</script>')
    })
  })

  describe('getResend (regression: was CommonJS require in ESM context)', () => {
    it('imports without throwing ReferenceError', async () => {
      const { getResend } = await import('./_email.js')
      expect(typeof getResend).toBe('function')
      const client = getResend()
      expect(client === null || typeof client.send === 'function' || typeof client.emails?.send === 'function').toBe(true)
    })
  })
})
