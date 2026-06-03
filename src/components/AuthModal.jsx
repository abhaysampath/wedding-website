import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../context/useAuth'

const roleLabels = {
  bride: 'Bride',
  groom: 'Groom',
  close_family: 'Close Family',
  invited_guest: 'Invited Guest',
  vendor: 'Vendor',
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function normalize(str) {
  return str.trim().toLowerCase().replace(/\s+/g, ' ')
}

function guestLabel(guest, sideName) {
  if (!guest) return ''
  if (guest.role === 'bride') return 'The Bride'
  if (guest.role === 'groom') return 'The Groom'
  if (guest.relationship) return guest.relationship
  return `${sideName[guest.side]}'s ${(roleLabels[guest.role] || '').toLowerCase()}`
}

function maskEmail(email) {
  if (!email) return ''
  const at = email.indexOf('@')
  if (at <= 3) return email
  const local = email.substring(0, at)
  const domain = email.substring(at)
  return `${local.substring(0, 3)}***${local[local.length - 1]}${domain}`
}

function maskPhone(phone) {
  if (!phone) return ''
  const digits = phone.replace(/\D/g, '')
  if (digits.length < 4) return phone
  return `${digits.substring(0, 3)}***${digits[digits.length - 1]}`
}

export default function AuthModal() {
  const {
    showAuthModal, setShowAuthModal,
    authMode, setAuthMode,
    user, config, firebaseLoading, firebaseError, setFirebaseError,
    handleFirebaseSignIn, signInAsGuest, updateContact, recordLogin,
    content,
  } = useAuth()

  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [nameInput, setNameInput] = useState('')
  const [selectedMatch, setSelectedMatch] = useState(null)
  const [saving, setSaving] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const [savedField, setSavedField] = useState(null)
  const inputRef = useRef(null)

  const sideName = config.site.coupleNames

  const matches = useMemo(() => {
    const t = normalize(nameInput)
    if (t.length < 3) return []
    return content.guests.filter((g) => {
      const full = normalize(`${g.firstName} ${g.lastName}`)
      const first = normalize(g.firstName)
      const last = normalize(g.lastName)
      return full.includes(t) || first.includes(t) || last.includes(t)
    }).slice(0, 8)
  }, [nameInput, content.guests])

  useEffect(() => {
    if (!showAuthModal) return
    if ((authMode === 'contact' || authMode === 'settings') && user) {
      setPhone(user.phone || '')
      setEmail(user.email || '')
    }
  }, [showAuthModal, authMode, user])

  const resetState = () => {
    setPhone('')
    setEmail('')
    setNameInput('')
    setSelectedMatch(null)
    setSaving(false)
    setShowDropdown(false)
    setSavedField(null)
    setFirebaseError(null)
  }

  const validEmail = EMAIL_RE.test(email.trim())
  const validPhone = phone.replace(/\D/g, '').length >= 7

  const handlePhoneChange = useCallback((raw) => {
    setPhone(raw.replace(/[^\d\s\+\-\(\)]/g, ''))
  }, [])

  const handleConfirmField = useCallback(async (field) => {
    if (saving) return
    setSaving(true)
    await updateContact(phone.trim(), email.trim())
    setSaving(false)
    setSavedField(field)
    setTimeout(() => setSavedField(null), 2000)
  }, [phone, email, updateContact, saving])

  const handleCancel = useCallback(() => {
    if (user) recordLogin()
    setShowAuthModal(false)
    setAuthMode('signin')
    resetState()
  }, [user, recordLogin, setShowAuthModal, setAuthMode])

  const handleSelectMatch = useCallback((guest) => {
    setSelectedMatch(guest)
    setShowDropdown(false)
  }, [])

  const handleConfirmName = useCallback(() => {
    if (!selectedMatch) return
    signInAsGuest(selectedMatch)
  }, [selectedMatch, signInAsGuest])

  const handleRejectName = useCallback(() => {
    setSelectedMatch(null)
    setNameInput('')
    if (inputRef.current) inputRef.current.focus()
  }, [])

  const handleNameChange = useCallback((e) => {
    setNameInput(e.target.value)
    setShowDropdown(e.target.value.trim().length >= 3)
  }, [])

  const handleNameFocus = useCallback(() => {
    if (nameInput.trim().length >= 3) setShowDropdown(true)
  }, [nameInput])

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && matches.length === 1) {
      handleSelectMatch(matches[0])
    }
  }, [matches, handleSelectMatch])

  useEffect(() => {
    if (!showAuthModal) return
    if (inputRef.current) inputRef.current.focus()
  }, [showAuthModal])

  return (
    <AnimatePresence>
      {showAuthModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal/60 backdrop-blur-sm"
          onClick={handleCancel}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="bg-cream rounded-sm w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-8 md:p-10 relative">
              <button
                onClick={handleCancel}
                className="absolute top-8 md:top-10 right-8 md:right-10 w-[42px] h-[42px] flex items-center justify-center rounded-sm text-charcoal-light/30 hover:text-charcoal hover:bg-cream-dark transition-colors border border-transparent hover:border-gold/20"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                  <path d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              {/* Sign In — OAuth first, then name entry */}
              {authMode === 'signin' && !selectedMatch && (
                <div className="space-y-4">
                  <button
                    onClick={() => handleFirebaseSignIn('google')}
                    disabled={firebaseLoading}
                    className="w-full flex items-center justify-center gap-3 py-3 border border-gold/20 rounded-sm text-sm text-charcoal-light hover:bg-cream-dark hover:border-gold/40 transition-colors disabled:opacity-50"
                  >
                    {firebaseLoading ? (
                      <div className="w-4 h-4 border-2 border-gold border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <svg className="w-4 h-4" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                    )}
                    Continue with Google
                  </button>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gold/10" />
                    </div>
                    <div className="relative flex justify-center">
                      <span className="bg-cream px-3 text-xs text-charcoal-light/30">or</span>
                    </div>
                  </div>

                  <p className="text-sm text-charcoal-light/70">Find your invite by name</p>

                  <div className="relative">
                    <input
                      ref={inputRef}
                      type="text"
                      value={nameInput}
                      onChange={handleNameChange}
                      onFocus={handleNameFocus}
                      onKeyDown={handleKeyDown}
                      className="w-full bg-cream-dark border border-gold/20 rounded-sm px-4 py-3 text-sm text-charcoal placeholder:text-charcoal-light/30 focus:outline-none focus:border-gold/50 transition-colors"
                      placeholder="Start typing your name"
                      autoComplete="off"
                    />
                    {showDropdown && matches.length > 0 && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-cream border border-gold/20 rounded-sm shadow-lg max-h-48 overflow-y-auto z-10">
                        {matches.map((g) => (
                          <button
                            key={g.id}
                            onClick={() => handleSelectMatch(g)}
                            className="w-full text-left px-4 py-2.5 text-sm text-charcoal hover:bg-cream-dark transition-colors border-b border-gold/5 last:border-b-0"
                          >
                            <span className="font-medium">{g.firstName} {g.lastName}</span>
                            <span className="text-charcoal-light/50 ml-2">{guestLabel(g, sideName)}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {firebaseError && (
                    <div className="p-3 bg-gold/10 border border-gold/20 rounded-sm text-xs text-charcoal-light/70">
                      {firebaseError}
                    </div>
                  )}
                </div>
              )}

              {/* Name confirmation step with masked contact info */}
              {authMode === 'signin' && selectedMatch && (
                <div className="space-y-6">
                  <div className="text-center">
                    <p className="text-sm text-charcoal-light/50 mb-2">Are you</p>
                    <p className="font-heading text-2xl text-charcoal">
                      {selectedMatch.firstName} {selectedMatch.lastName}
                    </p>
                    <p className="text-sm text-charcoal-light/50 mt-1">
                      {guestLabel(selectedMatch, sideName)}
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs tracking-widest uppercase text-charcoal-light/50 mb-1.5">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      value={maskPhone(selectedMatch.phone)}
                      readOnly
                      className="w-full bg-cream-dark/50 border border-gold/20 rounded-sm px-4 py-3 text-sm text-charcoal/60 cursor-default"
                    />
                  </div>

                  <div>
                    <label className="block text-xs tracking-widest uppercase text-charcoal-light/50 mb-1.5">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={maskEmail(selectedMatch.email)}
                      readOnly
                      className="w-full bg-cream-dark/50 border border-gold/20 rounded-sm px-4 py-3 text-sm text-charcoal/60 cursor-default"
                    />
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={handleRejectName}
                      className="flex-1 py-2.5 border border-gold/20 rounded-sm text-xs text-charcoal-light hover:bg-cream-dark transition-colors"
                    >
                      No, that's not me
                    </button>
                    <button
                      onClick={handleConfirmName}
                      className="flex-1 py-2.5 bg-sage hover:bg-sage-dark text-cream text-xs tracking-widest uppercase rounded-sm transition-colors font-medium"
                    >
                      Yes, that's me
                    </button>
                  </div>
                </div>
              )}

              {/* Contact / Settings — phone + email */}
              {(authMode === 'contact' || authMode === 'settings') && user && (
                <div className="space-y-5">
                  <div className="p-4 bg-cream-dark border border-gold/10 rounded-sm">
                    <p className="font-heading text-lg text-charcoal">{user.firstName} {user.lastName}</p>
                    <p className="text-xs text-charcoal-light/50 mt-1">{guestLabel(user, sideName)}</p>
                  </div>

                  <p className="text-sm text-charcoal-light/70 leading-relaxed">
                    {authMode === 'contact'
                      ? 'Add your contact info so we can send you wedding updates.'
                      : 'Update your contact info below.'}
                  </p>

                  <div>
                    <label className="block text-xs tracking-widest uppercase text-charcoal-light/50 mb-1.5">
                      Phone Number
                    </label>
                    <div className="relative">
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => handlePhoneChange(e.target.value)}
                        className="w-full bg-cream-dark border border-gold/20 rounded-sm px-4 py-3 pr-12 text-sm text-charcoal placeholder:text-charcoal-light/30 focus:outline-none focus:border-gold/50 transition-colors"
                        placeholder="+1 (555) 123-4567"
                      />
                      <button
                        onClick={() => handleConfirmField('phone')}
                        disabled={!validPhone || saving}
                        className="absolute right-1.5 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-sm text-charcoal-light/30 hover:text-sage disabled:hover:text-charcoal-light/30 transition-colors disabled:cursor-not-allowed"
                      >
                        {savedField === 'phone' ? (
                          <svg className="w-4 h-4 text-sage" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M20 6L9 17l-5-5" /></svg>
                        ) : (
                          <svg className={`w-4 h-4 ${validPhone ? 'text-sage' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                            <path d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs tracking-widest uppercase text-charcoal-light/50 mb-1.5">
                      Email Address
                    </label>
                    <div className="relative">
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full bg-cream-dark border border-gold/20 rounded-sm px-4 py-3 pr-12 text-sm text-charcoal placeholder:text-charcoal-light/30 focus:outline-none focus:border-gold/50 transition-colors"
                        placeholder="you@email.com"
                      />
                      <button
                        onClick={() => handleConfirmField('email')}
                        disabled={!validEmail || saving}
                        className="absolute right-1.5 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-sm text-charcoal-light/30 hover:text-sage disabled:hover:text-charcoal-light/30 transition-colors disabled:cursor-not-allowed"
                      >
                        {savedField === 'email' ? (
                          <svg className="w-4 h-4 text-sage" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M20 6L9 17l-5-5" /></svg>
                        ) : (
                          <svg className={`w-4 h-4 ${validEmail ? 'text-sage' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                            <path d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
