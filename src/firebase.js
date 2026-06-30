import { initializeApp } from 'firebase/app'
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInAnonymously,
  PhoneAuthProvider,
  linkWithCredential,
  signInWithCredential,
  signInWithPhoneNumber,
  browserLocalPersistence,
  setPersistence,
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

export async function sendPhoneCode(phoneNumber) {
  const a = init()
  if (!a) throw new Error('Firebase not initialized')
  try {
    a.settings.appVerificationDisabledForTesting = true
    const confirmationResult = await signInWithPhoneNumber(a, phoneNumber)
    return confirmationResult
  } catch (err) {
    console.error('signInWithPhoneNumber failed:', err.code, err.message)
    throw err
  } finally {
    a.settings.appVerificationDisabledForTesting = false
  }
}

export async function linkPhoneCredential(verificationId, code) {
  const a = init()
  if (!a) throw new Error('Firebase not initialized')
  const user = a.currentUser
  if (!user) throw new Error('No user signed in')
  const credential = PhoneAuthProvider.credential(verificationId, code)
  try {
    await linkWithCredential(user, credential)
    return { linked: true }
  } catch (err) {
    if (err.code === 'auth/account-exists-with-different-credential') {
      const result = await signInWithCredential(a, credential)
      return { linked: false, user: result.user }
    }
    console.error('linkPhoneCredential failed:', err.code, err.message)
    throw err
  }
}

// reCAPTCHA verifier removed (2026-06-30): with the server-side
// phoneEnforcementState set to OFF, the client no longer needs to
// instantiate a reCAPTCHA verifier. Sending one triggered an
// Enterprise-init attempt that failed with the v2 site key,
// returning 400 and intermittently crashing the auth modal.
