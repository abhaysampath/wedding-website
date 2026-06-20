/**
 * Fire-and-forget POST to /api/rsvp-confirmation to email the guest
 * a summary of their RSVP. Returns true on a 2xx response, false otherwise.
 * Never throws.
 */
export async function sendRsvpConfirmation() {
  try {
    const res = await fetch('/api/rsvp-confirmation', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    })
    if (!res.ok) {
      const body = await res.text().catch(() => '')
      console.warn('RSVP confirmation email failed:', res.status, body)
      return false
    }
    return true
  } catch (err) {
    console.warn('RSVP confirmation request error:', err)
    return false
  }
}
