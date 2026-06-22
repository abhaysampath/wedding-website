import crypto from 'crypto'
import { isAllowedOrigin } from './_origin.js'
import { applyLimit } from './_rate-limit.js'

const COOLDOWN_MS = 5 * 60 * 1000
const CODE_TTL_MS = 10 * 60 * 1000
const store = new Map()

function cleanup() {
  const now = Date.now()
  for (const [key, val] of store) {
    if (val.expiresAt < now) store.delete(key)
  }
}

function hash(uid, code) {
  return crypto.createHash('sha256').update(`${uid}:${code}`).digest('hex')
}

export default async function handler(req, res) {
  if (!isAllowedOrigin(req)) {
    return res.status(403).json({ error: 'Forbidden' })
  }
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const limited = applyLimit(req, res, 'otp')
  if (limited) return limited

  cleanup()

  const { email, code, uid } = req.body || {}
  if (!email) {
    return res.status(400).json({ error: 'Email required' })
  }

  const key = String(email).trim().toLowerCase()
  const existing = store.get(key)

  if (code === undefined) {
    if (existing && Date.now() - existing.sentAt < COOLDOWN_MS) {
      return res.status(200).json({ cooldown: true, retryAfter: COOLDOWN_MS - (Date.now() - existing.sentAt) })
    }
    const newCode = String(Math.floor(100000 + Math.random() * 900000))
    const salt = uid || key
    store.set(key, {
      hash: hash(salt, newCode),
      sentAt: Date.now(),
      expiresAt: Date.now() + CODE_TTL_MS,
    })
    return res.status(200).json({ code: newCode })
  }

  if (!existing) {
    return res.status(400).json({ valid: false, reason: 'No code sent or expired' })
  }
  if (existing.expiresAt < Date.now()) {
    store.delete(key)
    return res.status(400).json({ valid: false, reason: 'Code expired' })
  }

  const salt = uid || key
  const valid = existing.hash === hash(salt, String(code))
  if (valid) {
    store.delete(key)
  }
  return res.status(200).json({ valid })
}
