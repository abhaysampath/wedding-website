import { initializeApp } from 'firebase/app'
import {
  getAuth,
  GoogleAuthProvider,
  FacebookAuthProvider,
  signInWithPopup,
  signInAnonymously,
  PhoneAuthProvider,
  linkWithCredential,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  onAuthStateChanged,
  browserLocalPersistence,
  setPersistence,
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
} from 'firebase/auth'
import config from './config'

const { apiKey, authDomain, projectId } = config.firebase

let app = null
let auth = null

// Initialize Firebase app and auth instance
// Sets persistence to localStorage and disables app verification in dev
function init() {
  if (!apiKey || !authDomain || !projectId) return null
  if (!auth) {
    app = initializeApp({ apiKey, authDomain, projectId })
    auth = getAuth(app)
    setPersistence(auth, browserLocalPersistence)
    if (import.meta.env.DEV || config.debug) {
      auth.settings.appVerificationDisabledForTesting = true
    }
  }
  return auth
}

// Export auth utilities
export { onAuthStateChanged }

// Get initialized Firebase auth instance
export function getFirebaseAuth() {
  return init()
}

// Get current auth user
export function getAuthUser() {
  const a = init()
  return a?.currentUser || null
}

export async function signInWithGoogle() {
  const a = init()
  if (!a) throw new Error('Firebase not configured. Set VITE_FIREBASE_API_KEY, VITE_FIREBASE_AUTH_DOMAIN, VITE_FIREBASE_PROJECT_ID in .env')
  const provider = new GoogleAuthProvider()
  provider.setCustomParameters({ prompt: 'select_account' })
  const result = await signInWithPopup(a, provider)
  return result
}

export async function signInWithFacebook() {
  const a = init()
  if (!a) throw new Error('Firebase not configured')
  const provider = new FacebookAuthProvider()
  provider.setCustomParameters({ prompt: 'select_account' })
  const result = await signInWithPopup(a, provider)
  return result
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

export async function sendPhoneCode(phoneNumber, recaptchaVerifier) {
  const a = init()
  if (!a) throw new Error('Firebase not initialized')
  try {
    const confirmationResult = await signInWithPhoneNumber(a, phoneNumber, recaptchaVerifier)
    return confirmationResult
  } catch (err) {
    console.error('signInWithPhoneNumber failed:', err.code, err.message)
    throw err
  }
}

export async function linkPhoneCredential(verificationId, code) {
  const a = init()
  if (!a) throw new Error('Firebase not initialized')
  const user = a.currentUser
  if (!user) throw new Error('No user signed in')
  try {
    const credential = PhoneAuthProvider.credential(verificationId, code)
    await linkWithCredential(user, credential)
    return true
  } catch (err) {
    console.error('linkPhoneCredential failed:', err.code, err.message)
    throw err
  }
}

let _recaptchaVerifier = null

export function getRecaptchaVerifier(containerElement) {
  if (_recaptchaVerifier) {
    try { _recaptchaVerifier.clear() } catch { /* verifier may not be rendered */ }
    _recaptchaVerifier = null
  }
  const a = init()
  if (!a) return null
  _recaptchaVerifier = new RecaptchaVerifier(a, containerElement, {
    size: 'normal',
    callback: () => {},
    'expired-callback': () => {
      console.log('reCAPTCHA expired')
    }
  })
  return _recaptchaVerifier
}

export function clearRecaptchaVerifier() {
  if (_recaptchaVerifier) {
    try { _recaptchaVerifier.clear() } catch { /* verifier may not be rendered */ }
    _recaptchaVerifier = null
  }
}

export function checkIsEmailLink(url) {
  const a = init()
  if (!a) return false
  return isSignInWithEmailLink(a, url)
}

export async function completeEmailSignIn(email, url) {
  const a = init()
  if (!a) throw new Error('Firebase not initialized')
  const result = await signInWithEmailLink(a, email, url)
  return result.user
}

export async function sendEmailLink(email) {
  const a = init()
  if (!a) throw new Error('Firebase not initialized')
  const actionCodeSettings = {
    url: window.location.origin + '/',
    handleCodeInApp: true,
  }
  localStorage.setItem('emailForSignIn', email)
  await sendSignInLinkToEmail(a, email, actionCodeSettings)
}
