import { useState, useEffect, useCallback } from 'react'
import { AuthContext } from './AuthContext'
import config from '../config'
import sampleGuests from '../data/guests'
import sampleFaq from '../data/faq'
import sampleImages from '../data/images'

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
  } catch { /* ignore corrupt data */ }
  return null
}

function loadStoredWedding(storedUser) {
  const weddings = storedUser?.weddings || []
  return weddings.length === 1 ? weddings[0] : 'us'
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(loadStoredUser)
  const [activeWedding, setActiveWedding] = useState(() => loadStoredWedding(user))
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [initialLoading] = useState(false)
  const [content, setContent] = useState({
    guests: sampleGuests,
    faq: sampleFaq,
    images: sampleImages,
    loaded: false,
  })

  useEffect(() => {
    async function loadContent() {
      try {
        const res = await fetch('/api/content')
        if (!res.ok) throw new Error('API not available')
        const data = await res.json()
        setContent({
          guests: data.guests || sampleGuests,
          faq: data.faq || sampleFaq,
          images: data.images || sampleImages,
          loaded: true,
        })
      } catch {
        setContent({
          guests: sampleGuests,
          faq: sampleFaq,
          images: sampleImages,
          loaded: true,
        })
      }
    }
    loadContent()
  }, [])

  const searchGuests = useCallback((term) => {
    const t = normalize(term || '')
    if (!t) return []
    const list = content.guests

    return list
      .map((g) => {
        const gf = normalize(g.firstName)
        const gl = normalize(g.lastName)
        const full = `${gf} ${gl}`
        const score = Math.max(
          similarity(gf, t),
          similarity(gl, t),
          similarity(full, t)
        )
        return { ...g, score }
      })
      .filter((g) => g.score > 0.3)
      .sort((a, b) => b.score - a.score)
  }, [content.guests])

  const signIn = useCallback((guest, remember, phone, email) => {
    const payload = {
      id: guest.id,
      firstName: guest.firstName,
      lastName: guest.lastName,
      side: guest.side,
      role: guest.role,
      relationship: guest.relationship,
      weddings: guest.weddings,
      plusOne: guest.plusOne,
      phone: phone || '',
      email: email || '',
    }
    setUser(payload)
    const weddings = guest.weddings || []
    if (weddings.length === 1) {
      setActiveWedding(weddings[0])
    } else {
      setActiveWedding('us')
    }
    if (remember) {
      localStorage.setItem('wedding_user', JSON.stringify(payload))
    }
    return payload
  }, [])

  const updateContact = useCallback(async (phone, email) => {
    if (!user) return
    const updated = { ...user, phone, email }
    setUser(updated)
    const stored = localStorage.getItem('wedding_user')
    if (stored) {
      localStorage.setItem('wedding_user', JSON.stringify(updated))
    }
    try {
      const id = user.id
      await fetch(`/api/guests/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, email }),
      })
    } catch { /* api not available — local only */ }
  }, [user])

  const signOut = useCallback(() => {
    setUser(null)
    setActiveWedding('us')
    localStorage.removeItem('wedding_user')
  }, [])

  const switchWedding = useCallback((w) => {
    if (user && user.weddings.includes(w)) {
      setActiveWedding(w)
    }
  }, [user])

  const canSwitch = user && user.weddings && user.weddings.length > 1

  const value = {
    user,
    activeWedding,
    showAuthModal,
    initialLoading,
    config,
    content,
    setShowAuthModal,
    searchGuests,
    signIn,
    signOut,
    switchWedding,
    updateContact,
    canSwitch,
    weddingList: user?.weddings || ['us'],
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
