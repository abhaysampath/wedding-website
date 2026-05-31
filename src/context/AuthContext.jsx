import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import guests from '../data/guests.json'

const AuthContext = createContext(null)

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

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [activeWedding, setActiveWedding] = useState('us')
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)

  useEffect(() => {
    const stored = localStorage.getItem('wedding_user')
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        setUser(parsed)
        const weddings = parsed.weddings || []
        if (weddings.length === 1) {
          setActiveWedding(weddings[0])
        }
      } catch { /* ignore corrupt data */ }
    }
    setInitialLoading(false)
  }, [])

  const searchGuests = useCallback((firstName, lastName) => {
    const fn = normalize(firstName || '')
    const ln = normalize(lastName || '')

    return guests
      .map((g) => {
        const gf = normalize(g.firstName)
        const gl = normalize(g.lastName)
        const score = (similarity(gf, fn) + similarity(gl, ln)) / 2
        return { ...g, score }
      })
      .filter((g) => g.score > 0.3)
      .sort((a, b) => b.score - a.score)
  }, [])

  const signIn = useCallback((guest, remember) => {
    const payload = {
      id: guest.id,
      firstName: guest.firstName,
      lastName: guest.lastName,
      side: guest.side,
      role: guest.role,
      relationship: guest.relationship,
      weddings: guest.weddings,
      plusOne: guest.plusOne,
    }
    setUser(payload)
    setShowAuthModal(false)
    const weddings = guest.weddings || []
    if (weddings.length === 1) {
      setActiveWedding(weddings[0])
    } else {
      setActiveWedding('us')
    }
    if (remember) {
      localStorage.setItem('wedding_user', JSON.stringify(payload))
    }
  }, [])

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
    setShowAuthModal,
    searchGuests,
    signIn,
    signOut,
    switchWedding,
    canSwitch,
    weddingList: user?.weddings || ['us'],
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
