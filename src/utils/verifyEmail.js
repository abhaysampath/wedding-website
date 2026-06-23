import emailjs from '@emailjs/browser'
import config from '../config'

let _sendInFlight = null

export function generateCode() {
  return String(Math.floor(100000 + Math.random() * 900000))
}

export async function sendVerificationCode(email, name = '') {
  if (_sendInFlight) return _sendInFlight

  const slug = name.trim().toLowerCase().replace(/\s+/g, '-')
  const verifyUrl = slug
    ? `${window.location.origin}/g/${encodeURIComponent(slug)}?code=__CODE__`
    : `${window.location.origin}${window.location.pathname}?code=__CODE__`

  const { serviceId, templateId, publicKey } = config.emailjs
  if (!serviceId || !templateId || !publicKey) {
    throw new Error('EmailJS not configured')
  }

  const sendPromise = (async () => {
    const res = await fetch('/api/otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })
    const data = await res.json().catch(() => ({}))
    if (data.cooldown) {
      return { cooldown: true, retryAfter: data.retryAfter }
    }
    if (!res.ok) {
      throw new Error(data.error || 'Failed to generate code')
    }
    const code = data.code
    const link = verifyUrl.replace('__CODE__', code)

    try {
      await emailjs.send(
        serviceId,
        templateId,
        {
          email: email,
          verification_code: code,
          name: name,
          to_email: email,
          code: code,
          verify_link: link,
        },
        publicKey,
      )
    } catch (error) {
      throw new Error(error?.text || error?.message || 'Failed to send email', { cause: error })
    }
    return { code }
  })()

  _sendInFlight = sendPromise
  try {
    return await sendPromise
  } finally {
    _sendInFlight = null
  }
}

export async function verifyCodeServer(input, email) {
  if (!email) return { valid: false, reason: 'No email' }
  try {
    const res = await fetch('/api/otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, code: input }),
    })
    if (!res.ok) return { valid: false, reason: 'Server error' }
    return await res.json()
  } catch {
    return { valid: false, reason: 'Network error' }
  }
}
