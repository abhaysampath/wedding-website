import { useState, useEffect, useCallback } from 'react'
import { AuthContext } from './AuthContext'
import config from '../config'
import { parseCSV } from '../utils/csv'
import { signInWithGoogle, signInWithFacebook, verifyCurrentUserEmail, verifyEmailByNameUser } from '../firebase'
import sampleGuests from '../data/guests'
import sampleFaq from '../data/faq'
import sampleImages from '../data/images'

const { sheets } = config
const { columns, roleMap, plusOneMap } = sheets

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

function inferSide(firstName, lastName, relationship, role) {
  const full = `${firstName} ${lastName}`.toLowerCase()
  if (full === 'abhay sampath' || full.startsWith('abhay')) return 'groom'
  if (full === 'rebecca erde' || full.startsWith('rebecca')) return 'bride'
  const rel = (relationship || '').toLowerCase()
  if (rel.includes('abhay')) return 'groom'
  if (rel.includes('rebecca')) return 'bride'
  if (role === 'Br-Family') return 'bride'
  return 'bride'
}

function parseWeddings(val) {
  const v = (val || '').toLowerCase()
  if (v.includes('both')) return ['us', 'india']
  if (v.includes('us')) return ['us']
  if (v.includes('india')) return ['india']
  return ['us']
}

function csvToGuests(rows) {
  if (!rows || rows.length < 2) return []
  const headers = rows[0]
  const idx = {}
  for (const [field, label] of Object.entries(columns)) {
    const i = headers.findIndex(h => h.trim().toLowerCase() === label.toLowerCase())
    if (i !== -1) idx[field] = i
  }
  return rows.slice(1).map((row, i) => {
    const get = (key) => idx[key] !== undefined ? (row[idx[key]] || '').trim() : ''
    const firstName = get('firstName')
    const lastName = get('lastName')
    const relationship = get('relationship')
    const roleRaw = get('role')
    const plusOneRaw = get('plusOne')
    return {
      id: `g${String(i + 1).padStart(3, '0')}`,
      firstName,
      lastName,
      side: inferSide(firstName, lastName, relationship, roleRaw),
      relationship,
      role: roleMap[roleRaw] || 'invited_guest',
      weddings: parseWeddings(get('weddings')),
      plusOne: plusOneMap[plusOneRaw] ?? false,
      email: get('email') || '',
      phone: get('phone') || '',
    }
  })
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

async function writeToSheet(guestId, data) {
  if (!guestId) return
  try {
    await fetch(`/api/guest/${guestId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
  } catch { /* api not available */ }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(loadStoredUser)
  const [activeWedding, setActiveWedding] = useState(() => getDefaultWedding(user?.weddings || []))
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [authMode, setAuthMode] = useState('signin') // 'signin' | 'contact' | 'settings'
  const [initialLoading] = useState(false)
  const [content, setContent] = useState({
    guests: sampleGuests,
    faq: sampleFaq,
    images: sampleImages,
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
              faq: data.faq?.length ? data.faq : sampleFaq,
              images: data.images?.length ? data.images : sampleImages,
              loaded: true,
            })
            return
          }
        }
        if (sheets.guestsCsv) {
          const res = await fetch(sheets.guestsCsv)
          if (res.ok) {
            const text = await res.text()
            const rows = parseCSV(text)
            const guests = csvToGuests(rows)
            if (guests.length > 0) {
              setContent({ guests, faq: sampleFaq, images: sampleImages, loaded: true })
              return
            }
          }
        }
        setContent({ guests: sampleGuests, faq: sampleFaq, images: sampleImages, loaded: true })
      } catch {
        setContent({ guests: sampleGuests, faq: sampleFaq, images: sampleImages, loaded: true })
      }
    }
    loadContent()
  }, [])

  const signInAsGuest = useCallback((guest) => {
    setFirebaseError(null)
    const now = new Date().toISOString()
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
      lastLogin: now,
      uid: null,
    }
    setUser(payload)
    setActiveWedding(getDefaultWedding(guest.weddings))
    localStorage.setItem('wedding_user', JSON.stringify(payload))
    writeToSheet(guest.id, { lastLogin: now })

    const hasContact = guest.phone || guest.email
    if (!hasContact) {
      setAuthMode('contact')
    } else {
      setShowAuthModal(false)
    }
  }, [])

  const handleFirebaseSignIn = useCallback(async (provider) => {
    setFirebaseLoading(true)
    setFirebaseError(null)
    try {
      const fbUser = provider === 'google' ? await signInWithGoogle() : await signInWithFacebook()
      const guest = findGuestByName(content.guests, fbUser.name)
      if (!guest) {
        setFirebaseError(`Could not find "${fbUser.name}" on the guest list. Try a different account or contact the couple.`)
        setFirebaseLoading(false)
        return
      }
      const now = new Date().toISOString()
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
        lastLogin: now,
        uid: fbUser.uid,
      }
      setUser(payload)
      setActiveWedding(getDefaultWedding(guest.weddings))
      localStorage.setItem('wedding_user', JSON.stringify(payload))
      writeToSheet(guest.id, { lastLogin: now })

      const hasContact = guest.phone || guest.email
      if (!hasContact) {
        setAuthMode('contact')
      } else {
        setShowAuthModal(false)
      }
      setFirebaseLoading(false)
    } catch (err) {
      setFirebaseError(err.message || 'Sign in failed')
      setFirebaseLoading(false)
    }
  }, [content.guests])

  const updateContact = useCallback(async (phone, email) => {
    if (!user) return
    const now = new Date().toISOString()
    const updated = { ...user, phone, email, lastLogin: now }
    setUser(updated)
    localStorage.setItem('wedding_user', JSON.stringify(updated))
    writeToSheet(user.id, { phone, email, lastLogin: now })
    if (user.uid) {
      await verifyCurrentUserEmail()
    } else if (email) {
      await verifyEmailByNameUser(email)
    }
  }, [user])

  const recordLogin = useCallback(() => {
    if (!user) return
    const now = new Date().toISOString()
    const updated = { ...user, lastLogin: now }
    setUser(updated)
    localStorage.setItem('wedding_user', JSON.stringify(updated))
    writeToSheet(user.id, { lastLogin: now })
  }, [user])

  const signOut = useCallback(() => {
    setUser(null)
    setActiveWedding('us')
    localStorage.removeItem('wedding_user')
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
    initialLoading,
    firebaseLoading,
    firebaseError,
    config,
    content,
    setShowAuthModal,
    setAuthMode,
    setFirebaseError,
    handleFirebaseSignIn,
    signInAsGuest,
    searchGuests: () => [],
    signIn: () => {},
    signOut,
    switchWedding,
    updateContact,
    recordLogin,
    openSettings,
    canSwitch,
    weddingList: user?.weddings || ['us'],
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
