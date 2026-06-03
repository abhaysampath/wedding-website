import { initializeApp } from 'firebase/app'
import {
  getAuth,
  GoogleAuthProvider,
  FacebookAuthProvider,
  signInWithPopup,
  sendEmailVerification,
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
  const result = await signInWithPopup(a, provider)
  const user = result.user
  return {
    name: user.displayName || '',
    email: user.email || '',
    photo: user.photoURL || '',
    uid: user.uid,
  }
}

export async function signInWithFacebook() {
  const a = init()
  if (!a) throw new Error('Firebase not configured')
  const provider = new FacebookAuthProvider()
  provider.setCustomParameters({ prompt: 'select_account' })
  const result = await signInWithPopup(a, provider)
  const user = result.user
  return {
    name: user.displayName || '',
    email: user.email || '',
    photo: user.photoURL || '',
    uid: user.uid,
  }
}

export async function verifyCurrentUserEmail() {
  const user = getAuthUser()
  if (!user) return null
  try {
    await sendEmailVerification(user)
    return true
  } catch {
    return false
  }
}
