import emailjs from '@emailjs/browser'
import config from '../config'

export function generateCode() {
  return String(Math.floor(1000 + Math.random() * 9000))
}

let _currentCode = ''

export function getCurrentCode() {
  return _currentCode
}

export async function sendVerificationCode(email, name = '') {
  const code = generateCode()
  _currentCode = code
  window.__emailCode = code
  sessionStorage.setItem('pending_email_code', code)
  sessionStorage.setItem('pending_email_addr', email)
  sessionStorage.setItem('pending_email_name', name)

  const verifyUrl = `${window.location.origin}${window.location.pathname}?code=${code}`

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
      console.log('Email verification code for', email, ':', code)
      console.log('Verify URL:', verifyUrl)
      if (import.meta.env.DEV) {
        window.__emailCode = code
      }
      throw error
    }
  } else {
    console.log('Email verification code for', email, ':', code)
    console.log('Verify URL:', verifyUrl)
    if (import.meta.env.DEV) {
      window.__emailCode = code
    }
  }
}

export function verifyCode(input) {
  const expected = _currentCode || sessionStorage.getItem('pending_email_code') || window.__emailCode || ''
  const valid = input === expected
  if (valid) {
    _currentCode = ''
    window.__emailCode = ''
    sessionStorage.removeItem('pending_email_code')
    sessionStorage.removeItem('pending_email_addr')
    sessionStorage.removeItem('pending_email_name')
  }
  return valid
}
