export function maskEmail(email) {
  if (!email) return ''
  const at = email.indexOf('@')
  if (at <= 1) return email
  const local = email.substring(0, at)
  const domain = email.substring(at)
  if (local.length <= 4) return `${local[0]}***${local[local.length - 1]}${domain}`
  return `${local.substring(0, 3)}***${local[local.length - 1]}${domain}`
}

export function maskPhone(phone) {
  if (!phone) return ''
  const digits = phone.replace(/\D/g, '')
  if (digits.length < 4) return ''
  return digits.slice(-4).padStart(digits.length, '*')
}
