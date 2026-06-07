import { useState, useEffect, useCallback } from 'react'
import { AuthContext } from './AuthContext'
import config from '../config'
import { signInWithGoogle, signInWithFacebook } from '../firebase'
import sampleGuests from '../data/guests'
import { eastTime } from '../utils/time'

const { sheets } = config

function normalize(str) {
  return str.trim().toLowerCase().replace(/\s+/g, ' ')
}

function similarity(a, b) {
  const aa = normalize(a)
  const bb = normalize(b)
  if (aa === bb) return 1
  if (aa.includes(bb) || bb.includes(aa)) return 0.8
  const aParts = aa.split(' ')
  const bParts = bb.split(' ')
  const matches = aParts.filter(p => bParts.includes(p)).length
  return matches / Math.max(aParts.length, bParts.length)
}

function loadStoredUser() {
  try {
    const stored = localStorage.getItem('wedding_user')
    if (stored) return JSON.parse(stored)
  } catch { return null }
  return null
}

function getDefaultWedding(weddings) {
  if (weddings.length === 1) return weddings[0]
  const indiaEnd = new Date('2027-02-27T00:00:00')
  return new Date() < indiaEnd ? 'india' : 'us'
}

function findGuestByName(guests, name) {
  const t = normalize(name)
  if (!t) return null
  let best = null
  let bestScore = 0
  for (const g of guests) {
    const full = normalize(`${g.firstName} ${g.lastName}`)
    const score = similarity(full, t)
    if (score > bestScore && score > 0.4) { bestScore = score; best = g }
  }
  return best
}

function findGuestByEmail(guests, email) {
  if (!email) return null
  const t = email.trim().toLowerCase()
  return guests.find(g => g.email.toLowerCase() === t) || null
}

function getGuestSlug(guest) {
  if (!guest) return ''
  return `${guest.firstName} ${guest.lastName}`.trim().toLowerCase().replace(/\s+/g, '-')
}

function updateUrlSlug(slug) {
  if (!slug) {
    window.history.replaceState({}, '', '/')
  } else {
    window.history.replaceState({}, '', `/g/${encodeURIComponent(slug)}`)
  }
}

async function writeToSheet(guestId, data) {
  if (!guestId) return true
  try {
    const res = await fetch(`/api/guest/${guestId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) return false
    const body = await res.json()
    return body.updated > 0
  } catch { return false }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(loadStoredUser)
  const [activeWedding, setActiveWedding] = useState(() => getDefaultWedding(user?.weddings || []))
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [authMode, setAuthMode] = useState('signin') // 'signin' | 'contact' | 'settings'

  const [content, setContent] = useState({
    guests: sampleGuests,
    faq: [],
    loaded: false,
  })
  const [firebaseLoading, setFirebaseLoading] = useState(false)
  const [firebaseError, setFirebaseError] = useState(null)

  useEffect(() => {
    async function loadContent() {
      try {
        if (sheets.mode === 'api') {
          const res = await fetch('/api/content')
          if (res.ok) {
            const data = await res.json()
            setContent({
              guests: data.guests?.length ? data.guests : sampleGuests,
              faq: data.faq?.length ? data.faq : [],
              faqWeddingColFound: data.faqWeddingColFound,
              loaded: true,
            })
            return
          }
        }
        setContent({ guests: sampleGuests, faq: [], loaded: true })
      } catch {
        setContent({ guests: sampleGuests, faq: [], loaded: true })
      }
    }
    loadContent()
  }, [])

  useEffect(() => {
    const stored = loadStoredUser()
    const hasSlug = window.location.pathname.startsWith('/g/')
    if (stored) {
      updateUrlSlug(getGuestSlug(stored))
    } else if (hasSlug) {
      updateUrlSlug('')
    }
  }, [])

  const [pendingFbUser, setPendingFbUser] = useState(null)

  const processSignIn = useCallback((guest, fbUser) => {
    setFirebaseError(null)
    const now = eastTime()
    const payload = {
      id: guest.id,
      firstName: guest.firstName,
      lastName: guest.lastName,
      side: guest.side,
      role: guest.role,
      relationship: guest.relationship,
      weddings: guest.weddings,
      plusOne: guest.plusOne,
      phone: guest.phone || '',
      email: guest.email || '',
      address: guest.address || '',
      dietaryPreferences: guest.dietaryPreferences || '',
      lastLogin: now,
      uid: fbUser.uid,
    }
    setUser(payload)
    setActiveWedding(getDefaultWedding(guest.weddings))
    localStorage.setItem('wedding_user', JSON.stringify(payload))
    writeToSheet(guest.id, { lastLogin: now, lastUpdated: now })
    updateUrlSlug(getGuestSlug(guest))

    setAuthMode('settings')
    setShowAuthModal(true)
    setTimeout(() => {
      const el = document.getElementById('details')
      if (el) el.scrollIntoView({ behavior: 'smooth' })
    }, 300)
  }, [])

  useEffect(() => {
    if (!pendingFbUser || !content.guests?.length) return
    const guest = findGuestByName(content.guests, pendingFbUser.name) || findGuestByEmail(content.guests, pendingFbUser.email)
    if (!guest) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFirebaseError(`Could not find "${pendingFbUser.name}" on the guest list. Try a different account or contact the couple.`)
      setPendingFbUser(null)
      return
    }
    setPendingFbUser(null)
    processSignIn(guest, pendingFbUser)
  }, [pendingFbUser, content.guests, processSignIn])

  const signInAsGuest = useCallback((guest, overrides = {}) => {
    setFirebaseError(null)
    const now = eastTime()
    const payload = {
      id: guest.id,
      firstName: guest.firstName,
      lastName: guest.lastName,
      side: guest.side,
      role: guest.role,
      relationship: guest.relationship,
      weddings: guest.weddings,
      plusOne: guest.plusOne,
      phone: overrides.phone ?? guest.phone ?? '',
      email: overrides.email ?? guest.email ?? '',
      address: overrides.address ?? guest.address ?? '',
      dietaryPreferences: overrides.dietaryPreferences ?? guest.dietaryPreferences ?? '',
      lastLogin: now,
      uid: null,
    }
    setUser(payload)
    setActiveWedding(getDefaultWedding(guest.weddings))
    localStorage.setItem('wedding_user', JSON.stringify(payload))
    writeToSheet(guest.id, { lastLogin: now, lastUpdated: now })
    updateUrlSlug(getGuestSlug(guest))

    const hasContact = payload.phone || payload.email
    if (!hasContact) {
      setAuthMode('contact')
    } else {
      setAuthMode('settings')
    }
    setTimeout(() => {
      const el = document.getElementById('details')
      if (el) el.scrollIntoView({ behavior: 'smooth' })
    }, 300)
  }, [])

  const handleFirebaseSignIn = useCallback(async (provider) => {
    setFirebaseLoading(true)
    setFirebaseError(null)
    try {
      let result
      if (provider === 'google') {
        result = await signInWithGoogle()
      } else {
        result = await signInWithFacebook()
      }
      if (result?.user) {
        const fbUser = {
          name: result.user.displayName || '',
          email: result.user.email || '',
          photo: result.user.photoURL || '',
          uid: result.user.uid,
        }

        const guest = content.guests?.length
          ? (findGuestByName(content.guests, fbUser.name) || findGuestByEmail(content.guests, fbUser.email))
          : null
        if (guest) {
          processSignIn(guest, fbUser)
        } else {
          setPendingFbUser(fbUser)
        }
      }
    } catch (err) {
      setFirebaseError(err.message || 'Sign in failed')
    } finally {
      setFirebaseLoading(false)
    }
  }, [content.guests, processSignIn])

  const updateContact = useCallback(async (data) => {
    if (!user) return
    const now = eastTime()
    const cleanedPhone = (data.phone || '').replace(/\D/g, '')
    const sheetData = { lastLogin: now, lastUpdated: now }
    if (data.phone !== undefined) sheetData.phone = cleanedPhone
    if (data.email !== undefined) sheetData.email = data.email
    if (data.address !== undefined) sheetData.address = data.address
    if (data.dietaryPreferences !== undefined) sheetData.dietaryPreferences = data.dietaryPreferences
    const updated = { ...user, ...sheetData, phone: cleanedPhone || user.phone, lastLogin: now }
    setUser(updated)
    localStorage.setItem('wedding_user', JSON.stringify(updated))
    const ok = await writeToSheet(user.id, sheetData)
    if (!ok) throw new Error('Failed to save to sheet')
  }, [user])

  const recordLogin = useCallback(() => {
    if (!user) return
    const now = eastTime()
    const updated = { ...user, lastLogin: now }
    setUser(updated)
    localStorage.setItem('wedding_user', JSON.stringify(updated))
    writeToSheet(user.id, { lastLogin: now, lastUpdated: now })
  }, [user])

  const signOut = useCallback(() => {
    setUser(null)
    setActiveWedding('us')
    localStorage.removeItem('wedding_user')
    updateUrlSlug('')
  }, [])

  const switchWedding = useCallback((w) => {
    if (user?.weddings?.includes(w)) setActiveWedding(w)
  }, [user])

  const openSettings = useCallback(() => {
    setAuthMode('settings')
    setShowAuthModal(true)
  }, [])

  const canSwitch = user?.weddings?.length > 1

  const value = {
    user,
    activeWedding,
    showAuthModal,
    authMode,
    firebaseLoading,
    firebaseError,
    config,
    content,
    setShowAuthModal,
    setAuthMode,
    setFirebaseError,
    handleFirebaseSignIn,
    signInAsGuest,
    signOut,
    switchWedding,
    updateContact,
    recordLogin,
    openSettings,
    canSwitch,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
