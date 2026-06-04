import { initializeApp } from 'firebase/app'
import {
  getAuth,
  GoogleAuthProvider,
  FacebookAuthProvider,
  signInWithPopup,
  signInAnonymously,
  sendEmailVerification,
  EmailAuthProvider,
  PhoneAuthProvider,
  linkWithCredential,
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
  }
  return auth
}

export function getAuthUser() {
  const a = init()
  return a?.currentUser || null
}

export async function signInWithGoogle() {
  const a = init()
  if (!a) throw new Error('Firebase not configured. Set VITE_FIREBASE_API_KEY, VITE_FIREBASE_AUTH_DOMAIN, VITE_FIREBASE_PROJECT_ID in .env')
  const provider = new GoogleAuthProvider()
  provider.setCustomParameters({ prompt: 'select_account' })
  try {
    const result = await signInWithPopup(a, provider)
    const user = result.user
    return {
      name: user.displayName || '',
      email: user.email || '',
      photo: user.photoURL || '',
      uid: user.uid,
    }
  } catch (err) {
    console.error('signInWithGoogle failed:', err.code, err.message)
    throw err
  }
}

export async function signInWithFacebook() {
  const a = init()
  if (!a) throw new Error('Firebase not configured')
  const provider = new FacebookAuthProvider()
  provider.setCustomParameters({ prompt: 'select_account' })
  try {
    const result = await signInWithPopup(a, provider)
    const user = result.user
    return {
      name: user.displayName || '',
      email: user.email || '',
      photo: user.photoURL || '',
      uid: user.uid,
    }
  } catch (err) {
    console.error('signInWithFacebook failed:', err.code, err.message)
    throw err
  }
}

export async function verifyCurrentUserEmail() {
  const user = getAuthUser()
  if (!user) return null
  try {
    await sendEmailVerification(user)
    return true
  } catch (err) {
    console.error('sendEmailVerification failed:', err.code, err.message)
    return false
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

export async function verifyEmailByNameUser(email) {
  const fbUser = await createAnonymousSession()
  if (!fbUser) return false
  try {
    const password = Array.from({ length: 24 }, () =>
      'abcdefghijklmnopqrstuvwxyz0123456789'[Math.floor(Math.random() * 36)]
    ).join('')
    const credential = EmailAuthProvider.credential(email, password)
    await linkWithCredential(fbUser, credential)
    await sendEmailVerification(fbUser)
    return true
  } catch (err) {
    console.error('verifyEmailByNameUser failed:', err.code, err.message)
    return false
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

export function getRecaptchaVerifier(containerId) {
  clearRecaptchaVerifier()
  const auth = getAuth()
  if (!auth) return null
  _recaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
    size: 'invisible',
    'expired-callback': () => {
      console.log('reCAPTCHA expired')
    }
  })
  return _recaptchaVerifier
}

export function clearRecaptchaVerifier() {
  if (_recaptchaVerifier) {
    _recaptchaVerifier.clear()
    _recaptchaVerifier = null
  }
}
