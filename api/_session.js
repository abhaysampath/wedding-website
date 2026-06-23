import crypto from 'node:crypto'

const COOKIE_NAME = 'wedding_session'
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30
const SESSION_SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex')
if (!process.env.SESSION_SECRET) {
  console.warn(
    'SESSION_SECRET not set — using ephemeral random secret. Sessions will not survive restarts.',
  )
}

let _adminPromise = null

async function getAdmin() {
  if (_adminPromise) return _adminPromise
  const projectId = process.env.FIREBASE_PROJECT_ID
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
  if (!projectId || !clientEmail || !privateKey) {
    _adminPromise = Promise.resolve(null)
    return _adminPromise
  }
  _adminPromise = (async () => {
    try {
      const mod = await import('firebase-admin')
      const admin = mod.default || mod
      if (!admin.apps.length) {
        admin.initializeApp({
          credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
        })
      }
      return admin
    } catch (err) {
      console.error('firebase-admin init failed:', err)
      return null
    }
  })()
  return _adminPromise
}

function b64urlEncode(buf) {
  return Buffer.from(buf)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

function b64urlDecode(str) {
  const padded = str.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (str.length % 4)) % 4)
  return Buffer.from(padded, 'base64')
}

function sign(payload) {
  const body = b64urlEncode(Buffer.from(JSON.stringify(payload)))
  const sig = crypto.createHmac('sha256', SESSION_SECRET).update(body).digest()
  return `${body}.${b64urlEncode(sig)}`
}

function verifyCookieToken(token) {
  if (!token || typeof token !== 'string') return null
  const dot = token.lastIndexOf('.')
  if (dot < 1) return null
  const body = token.slice(0, dot)
  const sigStr = token.slice(dot + 1)
  let expected
  try {
    expected = b64urlDecode(sigStr)
  } catch {
    return null
  }
  const computed = crypto.createHmac('sha256', SESSION_SECRET).update(body).digest()
  if (expected.length !== computed.length) return null
  if (!crypto.timingSafeEqual(expected, computed)) return null
  let payload
  try {
    payload = JSON.parse(b64urlDecode(body).toString('utf8'))
  } catch {
    return null
  }
  if (typeof payload.exp !== 'number' || payload.exp < Math.floor(Date.now() / 1000)) return null
  return payload
}

function parseCookies(header) {
  const cookies = {}
  if (!header) return cookies
  for (const part of header.split(';')) {
    const trimmed = part.trim()
    if (!trimmed) continue
    const eq = trimmed.indexOf('=')
    if (eq < 0) continue
    const k = trimmed.slice(0, eq).trim()
    const v = trimmed.slice(eq + 1).trim()
    if (k) cookies[k] = decodeURIComponent(v)
  }
  return cookies
}

function isSecureContext() {
  return (
    process.env.VERCEL_ENV === 'production' ||
    process.env.VERCEL_ENV === 'preview' ||
    process.env.NODE_ENV === 'production'
  )
}

export function mintSessionToken({ guestId, role }) {
  if (!guestId) throw new Error('guestId required')
  const now = Math.floor(Date.now() / 1000)
  return sign({
    guestId: String(guestId),
    role: String(role || ''),
    iat: now,
    exp: now + SESSION_TTL_SECONDS,
  })
}

export function getSessionCookieHeader(value) {
  const flags = ['Path=/', 'HttpOnly', 'SameSite=Lax', `Max-Age=${SESSION_TTL_SECONDS}`]
  if (isSecureContext()) flags.push('Secure')
  return `${COOKIE_NAME}=${value}; ${flags.join('; ')}`
}

export function getClearCookieHeader() {
  const flags = ['Path=/', 'HttpOnly', 'SameSite=Lax', 'Max-Age=0']
  if (isSecureContext()) flags.push('Secure')
  return `${COOKIE_NAME}=; ${flags.join('; ')}`
}

/**
 * Resolves the current session from the request.
 *
 * Two paths:
 * 1. Firebase ID token in `Authorization: Bearer <token>` — verified with
 *    firebase-admin. Returns `{ kind: 'firebase', uid, email, emailVerified }`.
 * 2. HttpOnly session cookie (set by /api/auth/session after the email-link
 *    sign-in flow) — verified with HMAC. Returns
 *    `{ kind: 'cookie', guestId, role }`.
 *
 * Returns `null` if no valid session, or
 * `{ kind: 'unconfigured' }` if the server can't verify tokens (env vars
 * missing) but a Bearer header was sent — caller should respond 503.
 */
export async function getSession(req) {
  const authHeader = req.headers?.authorization || req.headers?.Authorization
  if (authHeader && typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7).trim()
    if (token) {
      const admin = await getAdmin()
      if (admin) {
        try {
          const decoded = await admin.auth().verifyIdToken(token)
          if (decoded.uid) {
            return {
              kind: 'firebase',
              uid: decoded.uid,
              email: (decoded.email || '').toLowerCase(),
              name: (decoded.name || decoded['name'] || '').toString(),
              emailVerified: !!decoded.email_verified,
            }
          }
        } catch {
          // fall through to cookie check
        }
      }
    }
  }
  const cookies = parseCookies(req.headers?.cookie)
  const raw = cookies[COOKIE_NAME]
  if (raw) {
    const payload = verifyCookieToken(raw)
    if (payload && payload.guestId) {
      return {
        kind: 'cookie',
        guestId: String(payload.guestId),
        role: String(payload.role || ''),
      }
    }
  }
  return null
}

export const ADMIN_ROLES = ['bride', 'groom', 'close_family']

export function isAdminRole(role) {
  return ADMIN_ROLES.includes(String(role || ''))
}

export const SESSION_COOKIE_NAME = COOKIE_NAME
export { parseCookies, verifyCookieToken, sign, b64urlEncode, b64urlDecode }
