import emailjs from '@emailjs/browser'
import config from '../config'

export function generateCode() {
  return String(Math.floor(100000 + Math.random() * 900000))
}

let _currentCode = ''

export async function sendVerificationCode(email, name = '') {
  const code = generateCode()
  _currentCode = code
  sessionStorage.setItem('pending_email_code', code)
  sessionStorage.setItem('pending_email_addr', email)
  sessionStorage.setItem('pending_email_name', name)

  const slug = name.trim().toLowerCase().replace(/\s+/g, '-')
  const verifyUrl = slug
    ? `${window.location.origin}/g/${encodeURIComponent(slug)}?code=${code}`
    : `${window.location.origin}${window.location.pathname}?code=${code}`

  const { serviceId, templateId, publicKey } = config.emailjs
  if (serviceId && templateId && publicKey) {
    try {
      await emailjs.send(serviceId, templateId, {
        email: email,
        verification_code: code,
        name: name,
        to_email: email,
        code: code,
        verify_link: verifyUrl,
      }, publicKey)
    } catch (error) {
      console.error('EmailJS error:', error)
      throw error
    }
  } else {

  }
}

export function verifyCode(input) {
  const expected = _currentCode || sessionStorage.getItem('pending_email_code') || ''
  const valid = input === expected
  if (valid) {
    _currentCode = ''
    sessionStorage.removeItem('pending_email_code')
    sessionStorage.removeItem('pending_email_addr')
    sessionStorage.removeItem('pending_email_name')
  }
  return valid
}
