import { initializeApp } from 'firebase/app'
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInAnonymously,
  browserLocalPersistence,
  setPersistence,
  RecaptchaVerifier,
  signInWithPhoneNumber,
} from 'firebase/auth'
import config from './config'

const { apiKey, authDomain, projectId } = config.firebase

let app = null
let auth = null

function init() {
  if (!apiKey || !authDomain || !projectId) return null
  if (!auth) {
    app = initializeApp({ apiKey, authDomain, projectId })
    auth = getAuth(app)
    setPersistence(auth, browserLocalPersistence)
  }
  return auth
}

const TEST_PHONES = ['+15555550100', '+15555550101', '+15555550102', '+1 555-555-0100']

export function isTestPhone(phone) {
  return TEST_PHONES.some(t => phone.replace(/\D/g, '') === t.replace(/\D/g, ''))
}

export async function signInWithGoogle() {
  const a = init()
  if (!a)
    throw new Error(
      'Firebase not configured. Set VITE_FIREBASE_API_KEY, VITE_FIREBASE_AUTH_DOMAIN, VITE_FIREBASE_PROJECT_ID in .env',
    )
  const provider = new GoogleAuthProvider()
  provider.setCustomParameters({ prompt: 'select_account' })
  const result = await signInWithPopup(a, provider)
  return result
}

export async function signOutFirebase() {
  const a = init()
  if (!a) return
  try {
    const { getAuth, signOut } = await import('firebase/auth')
    await signOut(getAuth())
  } catch (err) {
    console.warn('Firebase signOut failed:', err)
  }
}

export async function getIdToken(forceRefresh = false) {
  const a = init()
  if (!a) return null
  const user = a.currentUser
  if (!user) return null
  try {
    return await user.getIdToken(forceRefresh)
  } catch (err) {
    console.error('getIdToken failed:', err)
    return null
  }
}

export async function createAnonymousSession() {
  const a = init()
  if (!a) return null
  if (a.currentUser) return a.currentUser
  try {
    const result = await signInAnonymously(a)
    return result.user
  } catch (err) {
    console.error('signInAnonymously failed:', err.code, err.message)
    return null
  }
}

let recaptchaVerifier = null
let pendingConfirmation = null

function getRecaptchaContainer() {
  let el = document.getElementById('recaptcha-container')
  if (!el) {
    el = document.createElement('div')
    el.id = 'recaptcha-container'
    el.style.position = 'fixed'
    el.style.top = '-9999px'
    el.style.left = '-9999px'
    document.body.appendChild(el)
  }
  return el
}

function ensureRecaptchaVerifier(auth) {
  if (recaptchaVerifier) {
    recaptchaVerifier.clear()
    recaptchaVerifier = null
  }
  recaptchaVerifier = new RecaptchaVerifier(auth, getRecaptchaContainer(), {
    size: 'invisible',
  })
  return recaptchaVerifier
}

export function clearRecaptchaVerifier() {
  if (recaptchaVerifier) {
    recaptchaVerifier.clear()
    recaptchaVerifier = null
  }
  pendingConfirmation = null
}

export async function sendPhoneCode(phoneNumber) {
  const a = init()
  if (!a)
    throw new Error(
      'Firebase not configured. Set VITE_FIREBASE_API_KEY, VITE_FIREBASE_AUTH_DOMAIN, VITE_FIREBASE_PROJECT_ID in .env',
    )

  const verifier = ensureRecaptchaVerifier(a)
  pendingConfirmation = await signInWithPhoneNumber(a, phoneNumber, verifier)
  return { verificationId: pendingConfirmation.verificationId }
}

export async function linkPhoneCredential(verificationId, code) {
  if (pendingConfirmation) {
    const result = await pendingConfirmation.confirm(code)
    pendingConfirmation = null
    return result
  }
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPhoneNumber?key=${config.firebase.apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionInfo: verificationId, code }),
    },
  )
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = new Error(data?.error?.message || 'Failed to verify code')
    err.code = data?.error?.message
    throw err
  }
  return data
}

// reCAPTCHA verifier removed (2026-06-30): with the server-side
// phoneEnforcementState set to OFF, the client no longer needs to
// instantiate a reCAPTCHA verifier. Sending one triggered an
// Enterprise-init attempt that failed with the v2 site key,
// returning 400 and intermittently crashing the auth modal.
