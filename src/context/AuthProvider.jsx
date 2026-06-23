import { useState, useEffect, useCallback } from 'react'
import { track } from '@vercel/analytics'
import { AuthContext } from './AuthContext'
import config from '../config'
import { signInWithGoogle, signOutFirebase } from '../firebase'
import sampleGuests from '../data/guests'
import { eastTime } from '../utils/time'
import { writeToSheet, mintServerSession, clearServerSession } from '../utils/sheet-write'

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
  } catch (err) {
    console.error('Failed to load stored user:', err)
    return null
  }
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
  const tParts = t.split(' ').filter(Boolean)
  if (tParts.length < 2) return null
  for (const g of guests) {
    const first = normalize(g.firstName)
    const last = normalize(g.lastName)
    if (!first || !last) continue
    const full = `${first} ${last}`
    if (normalize(full) === t) return g
    if (first === tParts[0] && last === tParts[tParts.length - 1]) return g
  }
  return null
}

function findGuestByEmail(guests, email) {
  if (!email) return null
  const t = email.trim().toLowerCase()
  return guests.find(g => g.email.toLowerCase() === t) || null
}

function findClosestByName(guests, name) {
  const t = normalize(name)
  if (!t) return null
  let best = null
  let bestScore = 0
  for (const g of guests) {
    const full = normalize(`${g.firstName} ${g.lastName}`)
    if (!full) continue
    const score = similarity(full, t)
    if (score > bestScore) {
      bestScore = score
      best = g
    }
  }
  return best
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
  const [nameMismatch, setNameMismatch] = useState(null)

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
      } catch (err) {
        console.error('Failed to load content:', err)
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
      return
    }
    if (!hasSlug) return
    const code = new URLSearchParams(window.location.search).get('code')
    const pathSlug = window.location.pathname.match(/^\/g\/(.+)/)?.[1]
    if (code && pathSlug) {
      window.history.replaceState({}, '', `/g/${pathSlug}?code=${code}`)
    } else if (code) {
      window.history.replaceState({}, '', `/?code=${code}`)
    } else {
      updateUrlSlug('')
    }
  }, [])

  const processSignIn = useCallback(async (guest, fbUser) => {
    setFirebaseError(null)
    const now = eastTime()
    const payload = {
      id: guest.id,
      title: guest.title || '',
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
      rsvpUs: guest.rsvpUs || '',
      rsvpIndia: guest.rsvpIndia || '',
      lastLogin: now,
      uid: fbUser.uid,
    }
    setUser(payload)
    setActiveWedding(getDefaultWedding(guest.weddings))
    localStorage.setItem('wedding_user', JSON.stringify(payload))
    const sessionResult = await mintServerSession(guest.id)
    if (!sessionResult.ok) {
      console.warn('Cookie session mint failed for Firebase user:', sessionResult)
    }
    try {
      await writeToSheet(guest.id, { lastLogin: now, loginFailed: 'SUCCESS' })
    } catch (err) {
      console.warn('Audit write failed (non-fatal):', err)
    }
    updateUrlSlug(getGuestSlug(guest))

    setAuthMode('settings')
    setShowAuthModal(true)
    setTimeout(() => {
      const el = document.getElementById('details')
      if (el) el.scrollIntoView({ behavior: 'smooth' })
    }, 300)
  }, [])

  const signInAsGuest = useCallback(async (guest, overrides = {}) => {
    setFirebaseError(null)
    const now = eastTime()
    const payload = {
      id: guest.id,
      title: guest.title || '',
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
      rsvpUs: overrides.rsvpUs ?? guest.rsvpUs ?? '',
      rsvpIndia: overrides.rsvpIndia ?? guest.rsvpIndia ?? '',
      lastLogin: now,
      uid: null,
    }
    setUser(payload)
    setActiveWedding(getDefaultWedding(guest.weddings))
    localStorage.setItem('wedding_user', JSON.stringify(payload))
    const sessionResult = await mintServerSession(guest.id)
    if (!sessionResult.ok) {
      console.error('Cookie session mint failed:', sessionResult)
      setFirebaseError(
        'Sign-in succeeded but server session failed. Your RSVP changes may not save. Please try again.',
      )
    }
    try {
      await writeToSheet(guest.id, { lastLogin: now, loginFailed: 'SUCCESS' })
    } catch (err) {
      console.warn('Audit write failed (non-fatal):', err)
    }
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

  const handleFirebaseSignIn = useCallback(
    async provider => {
      setFirebaseLoading(true)
      setFirebaseError(null)
      setNameMismatch(null)
      try {
        const result = await signInWithGoogle()
        if (result?.user) {
          const authUser = {
            name: result.user.displayName || '',
            email: result.user.email || '',
            photo: result.user.photoURL || '',
            uid: result.user.uid,
          }

          if (!content.guests?.length) return

          const emailMatch = findGuestByEmail(content.guests, authUser.email)
          if (emailMatch) {
            await processSignIn(emailMatch, authUser)
            return
          }

          if (!authUser.name) {
            setFirebaseError(
              'Your Google account has no name. Please use the name search below or contact the couple.',
            )
            track('guest_not_found', { name: '', email: authUser.email })
            return
          }

          const nameMatch = findGuestByName(content.guests, authUser.name)
          if (nameMatch) {
            await processSignIn(nameMatch, authUser)
            return
          }

          const closest = findClosestByName(content.guests, authUser.name)
          setNameMismatch({
            googleName: authUser.name,
            googleEmail: authUser.email,
            googleUid: authUser.uid,
            closestName: closest ? `${closest.firstName} ${closest.lastName}`.trim() : null,
            closestId: closest?.id || null,
          })
          track('name_mismatch', { name: authUser.name, email: authUser.email })
        }
      } catch (err) {
        setFirebaseError(err.message || 'Sign in failed')
        track('signin_failed', { method: provider, reason: err.message })
      } finally {
        setFirebaseLoading(false)
      }
    },
    [content.guests, processSignIn],
  )

  const updateContact = useCallback(
    async data => {
      if (!user) return
      const now = eastTime()
      const cleanedPhone = (data.phone || '').replace(/\D/g, '')
      const sheetData = {}
      if (data.phone !== undefined) sheetData.phone = cleanedPhone
      if (data.email !== undefined) sheetData.email = data.email
      if (data.address !== undefined) sheetData.address = data.address
      if (data.dietaryPreferences !== undefined)
        sheetData.dietaryPreferences = data.dietaryPreferences
      if (data.rsvpUs !== undefined) sheetData.rsvpUs = data.rsvpUs
      if (data.rsvpIndia !== undefined) sheetData.rsvpIndia = data.rsvpIndia
      const hasDataChanges = Object.keys(sheetData).length > 0
      if (hasDataChanges) sheetData.lastUpdated = now
      const updated = { ...user, ...sheetData, phone: cleanedPhone || user.phone, lastLogin: now }
      setUser(updated)
      localStorage.setItem('wedding_user', JSON.stringify(updated))
      if (!hasDataChanges) return
      const ok = await writeToSheet(user.id, sheetData)
      if (!ok) throw new Error('Failed to save to sheet')
    },
    [user],
  )

  const recordLoginAttempt = useCallback(async guestId => {
    if (!guestId) return
    const now = eastTime()
    try {
      await writeToSheet(guestId, { loginFailed: now })
    } catch (err) {
      console.warn('recordLoginAttempt failed:', err)
    }
  }, [])

  const recordLogin = useCallback(async () => {
    if (!user) return
    const now = eastTime()
    const updated = { ...user, lastLogin: now }
    setUser(updated)
    localStorage.setItem('wedding_user', JSON.stringify(updated))
    try {
      await writeToSheet(user.id, { lastLogin: now })
    } catch (err) {
      console.warn('recordLogin write failed:', err)
    }
  }, [user])

  const signOut = useCallback(async () => {
    setUser(null)
    setActiveWedding('us')
    localStorage.removeItem('wedding_user')
    await clearServerSession()
    await signOutFirebase()
    updateUrlSlug('')
  }, [])

  const switchWedding = useCallback(
    w => {
      if (user?.weddings?.includes(w)) setActiveWedding(w)
    },
    [user],
  )

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
    nameMismatch,
    config,
    content,
    setShowAuthModal,
    setAuthMode,
    setFirebaseError,
    setNameMismatch,
    handleFirebaseSignIn,
    signInAsGuest,
    signOut,
    switchWedding,
    updateContact,
    recordLogin,
    recordLoginAttempt,
    openSettings,
    canSwitch,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
