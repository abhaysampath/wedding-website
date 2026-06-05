import { useState, useCallback, useEffect, useMemo, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../context/useAuth'
import {
  createAnonymousSession,
  sendPhoneCode,
  linkPhoneCredential,
  getRecaptchaVerifier,
  clearRecaptchaVerifier,
} from '../firebase'
import { sendVerificationCode, verifyCode } from '../utils/verifyEmail'

const roleLabels = {
  bride: 'Bride',
  groom: 'Groom',
  close_family: 'Close Family',
  invited_guest: 'Invited Guest',
  vendor: 'Vendor',
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function stripPhone(raw) {
  return (raw || '').replace(/\D/g, '')
}

function isUsNumber(raw) {
  const digits = stripPhone(raw)
  return digits.length === 10 || (digits.length === 11 && digits.startsWith('1'))
}

function formatE164(raw) {
  const digits = stripPhone(raw)
  if (digits.length === 10) return '+1' + digits
  if (digits.length === 11 && digits.startsWith('1')) return '+' + digits
  return '+' + digits
}

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

function ContactForm({ user, authMode, updateContact, sideName }) {
  const [phone, setPhone] = useState(stripPhone(user?.phone))
  const [email, setEmail] = useState(user?.email || '')
  const [phoneFocused, setPhoneFocused] = useState(false)
  const [emailFocused, setEmailFocused] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showConfirmation, setShowConfirmation] = useState(false)

  const validEmail = EMAIL_RE.test(email.trim())
  const validPhone = stripPhone(phone).length >= 10

  const handlePhoneChange = useCallback((raw) => {
    setPhone(raw.replace(/\D/g, ''))
  }, [])

  const handleConfirmField = useCallback(async () => {
    if (saving) return
    setSaving(true)
    await updateContact(stripPhone(phone), email.trim())
    setSaving(false)
    setShowConfirmation(true)
    setTimeout(() => setShowConfirmation(false), 2000)
  }, [phone, email, updateContact, saving])

  return (
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
              value={!phoneFocused && phone === stripPhone(user?.phone) ? maskPhone(phone) : phone}
              onChange={(e) => handlePhoneChange(e.target.value)}
              onFocus={() => setPhoneFocused(true)}
              onBlur={() => setPhoneFocused(false)}
              disabled={saving}
              className="w-full bg-cream-dark border border-gold/20 rounded-sm px-4 py-3 pr-20 text-sm text-charcoal placeholder:text-charcoal-light/30 focus:outline-none focus:border-gold/50 transition-colors disabled:opacity-30"
              placeholder="5551234567"
            />
            <button
              onClick={handleConfirmField}
              disabled={!validPhone || saving}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 h-6 px-1.5 text-[9px] tracking-widest uppercase font-medium rounded-sm border border-current transition-colors disabled:opacity-30 disabled:cursor-not-allowed hover:text-sage"
            >
              {saving ? 'Saving...' : 'Save'}
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
              value={!emailFocused && email === (user?.email || '') ? maskEmail(email) : email}
              onChange={(e) => setEmail(e.target.value)}
              onFocus={() => setEmailFocused(true)}
              onBlur={() => setEmailFocused(false)}
              className="w-full bg-cream-dark border border-gold/20 rounded-sm px-4 py-3 pr-20 text-sm text-charcoal placeholder:text-charcoal-light/30 focus:outline-none focus:border-gold/50 transition-colors"
              placeholder="you@email.com"
            />
            <button
              onClick={handleConfirmField}
              disabled={!validEmail || saving}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 h-6 px-1.5 text-[9px] tracking-widest uppercase font-medium rounded-sm border border-current transition-colors disabled:opacity-30 disabled:cursor-not-allowed hover:text-sage"
            >
              {showConfirmation && saving ? 'Confirming...' : saving ? 'Saving...' : 'Confirm'}
            </button>
          </div>
        </div>
      </div>
  )
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
   const [showConfirmation, setShowConfirmation] = useState(false)
   const [awaitingSmsCode, setAwaitingSmsCode] = useState(false)
    const [awaitingEmailLink, setAwaitingEmailLink] = useState(false)
    const [emailCode, setEmailCode] = useState(Array(4).fill(''))
    const emailCodeRefs = useRef([])
    const [smsCode, setSmsCode] = useState(Array(4).fill(''))
    const smsCodeRefs = useRef([])
    const [verificationId, setVerificationId] = useState('')
    const [sendingSms, setSendingSms] = useState(false)
    const [verifyingCode, setVerifyingCode] = useState(false)
    const [origPhone, setOrigPhone] = useState('')
    const [origEmail, setOrigEmail] = useState('')
    const inputRef = useRef(null)
    const recaptchaContainerRef = useRef(null)

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

   const resetState = useCallback(() => {
     setPhone('')
     setEmail('')
     setNameInput('')
     setSelectedMatch(null)
     setSaving(false)
     setShowDropdown(false)
     setShowConfirmation(false)
     setFirebaseError(null)
     setAwaitingSmsCode(false)
     setAwaitingEmailLink(false)
      setEmailCode(Array(4).fill(''))
      emailCodeRefs.current = []
      setSmsCode(Array(4).fill(''))
      smsCodeRefs.current = []
      setVerificationId('')
     setSendingSms(false)
     setVerifyingCode(false)
     setOrigPhone('')
     setOrigEmail('')
     clearRecaptchaVerifier()
   }, [setFirebaseError])

  const validEmail = EMAIL_RE.test(email.trim())
  const validPhone = stripPhone(phone).length >= 10
  const isUs = isUsNumber(phone)

  const handlePhoneChange = useCallback((raw) => {
    setPhone(raw.replace(/\D/g, ''))
  }, [])

   const handleEmailConfirm = useCallback(async () => {
     if (saving || !validEmail || !selectedMatch) return
     setSaving(true)
     setFirebaseError(null)
     try {
       await sendVerificationCode(email.trim(), `${selectedMatch.firstName} ${selectedMatch.lastName}`.trim())
       setAwaitingEmailLink(true)
     } catch (err) {
       setFirebaseError(err.message || 'Failed to send verification code')
     } finally {
       setSaving(false)
     }
   }, [email, selectedMatch, saving, validEmail, setFirebaseError])

  const handleEmailCodeComplete = useCallback(async (code) => {
    if (!verifyCode(code)) {
      setFirebaseError('Invalid code. Check your email and try again.')
      return
    }
    setSaving(true)
    setFirebaseError(null)
    try {
      if (selectedMatch) {
        await updateContact(phone.trim(), email.trim())
        signInAsGuest(selectedMatch, { phone: phone.trim(), email: email.trim() })
      }
      setShowAuthModal(false)
    } catch (err) {
      setFirebaseError(err.message || 'Failed to complete sign in')
    } finally {
      setSaving(false)
    }
  }, [phone, email, selectedMatch, updateContact, signInAsGuest, setShowAuthModal])

   const handlePhoneConfirm = useCallback(async () => {
     if (saving || sendingSms || !isUs) return
     setSendingSms(true)
     setFirebaseError(null)
     try {
       if (!user?.uid) {
         const fbUser = await createAnonymousSession()
         if (!fbUser) throw new Error('Failed to create session. Check Firebase Anonymous provider is enabled.')
       }
       if (!recaptchaContainerRef.current) {
         throw new Error('reCAPTCHA container not ready')
       }
       const verifier = getRecaptchaVerifier(recaptchaContainerRef.current)
       if (!verifier) {
         throw new Error('Failed to initialize reCAPTCHA')
       }
       const result = await sendPhoneCode(formatE164(phone), verifier)
       setVerificationId(result.verificationId)
       setAwaitingSmsCode(true)
     } catch (err) {
       console.error('Phone auth error:', err)
       if (err.code === 'auth/captcha-check-failed') {
         setFirebaseError('reCAPTCHA verification failed. Please check your internet connection and try again. In development, you can use test phone numbers from Firebase Console.')
       } else {
         setFirebaseError(err.message || 'Failed to send verification code')
       }
     } finally {
       clearRecaptchaVerifier()
       setSendingSms(false)
     }
    }, [phone, isUs, saving, sendingSms, user, setFirebaseError, recaptchaContainerRef])

  const handleVerifySmsCode = useCallback(async (code) => {
    const codeStr = code || smsCode.join('')
    if (verifyingCode || codeStr.length < 4) return
    setVerifyingCode(true)
    setFirebaseError(null)
    try {
      await linkPhoneCredential(verificationId, codeStr)
      clearRecaptchaVerifier()
      if (selectedMatch) {
        await updateContact(phone.trim(), email.trim())
        signInAsGuest(selectedMatch, { phone: phone.trim(), email: email.trim() })
      } else {
        await updateContact(phone.trim(), email.trim())
        setShowConfirmation(true)
        setTimeout(() => setShowConfirmation(false), 2000)
      }
    } catch (err) {
      setFirebaseError(err.message || 'Failed to verify code')
    } finally {
      setVerifyingCode(false)
    }
  }, [verificationId, smsCode, phone, email, selectedMatch, signInAsGuest, updateContact, verifyingCode, setFirebaseError])

  const handleCancel = useCallback(() => {
    if (user) recordLogin()
    setShowAuthModal(false)
    setAuthMode('signin')
    resetState()
    clearRecaptchaVerifier()
  }, [user, recordLogin, setShowAuthModal, setAuthMode, resetState])

  const handleSelectMatch = useCallback((guest) => {
    setSelectedMatch(guest)
    setShowDropdown(false)
    const gPhone = stripPhone(guest.phone)
    const gEmail = guest.email || ''
    setPhone(gPhone)
    setEmail(gEmail)
    setOrigPhone(gPhone)
    setOrigEmail(gEmail)
  }, [])

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

  const handleEmailCodeCompleteRef = useRef(handleEmailCodeComplete)
  handleEmailCodeCompleteRef.current = handleEmailCodeComplete

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const urlCode = params.get('code')
    if (urlCode && urlCode.length === 4) {
      window.history.replaceState({}, '', window.location.pathname)
      setEmailCode(urlCode.split('').concat(Array(4 - urlCode.length).fill('')))
      setAwaitingEmailLink(true)
      if (!showAuthModal) setShowAuthModal(true)

      const slug = window.location.pathname.match(/\/g\/(.+)/)?.[1]
      if (slug && content.guests?.length) {
        const target = decodeURIComponent(slug)
        const guest = content.guests.find(g => {
          const gs = `${g.firstName} ${g.lastName}`.trim().toLowerCase().replace(/\s+/g, '-')
          return gs === target
        })
        if (guest) {
          const gPhone = stripPhone(guest.phone)
          const gEmail = guest.email || ''
          setSelectedMatch(guest)
          setShowDropdown(false)
          setPhone(gPhone)
          setEmail(gEmail)
          setOrigPhone(gPhone)
          setOrigEmail(gEmail)
        }
      }

      setTimeout(() => handleEmailCodeCompleteRef.current(urlCode), 200)
    }
  }, [])

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
          className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-[10vh] bg-charcoal/60 backdrop-blur-sm"
          onClick={handleCancel}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="bg-cream rounded-sm w-full max-w-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
             <div className="p-8 md:p-10 relative">
               <div ref={recaptchaContainerRef} />
              <button
                onClick={handleCancel}
                className="absolute top-8 md:top-10 right-8 md:right-6 w-[42px] h-[42px] flex items-center justify-center rounded-sm text-charcoal-light/30 hover:text-charcoal hover:bg-cream-dark transition-colors border border-transparent hover:border-gold/20"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                  <path d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              {/* Sign In — OAuth first, then name entry */}
              {authMode === 'signin' && !selectedMatch && (
                <div className="space-y-4">
                  <div className="flex gap-3">
                    <button
                      onClick={() => handleFirebaseSignIn('google')}
                      disabled={firebaseLoading}
                      className="flex-1 flex items-center justify-center gap-2 py-3 border border-gold/20 rounded-sm text-sm text-charcoal-light hover:bg-cream-dark hover:border-gold/40 transition-colors disabled:opacity-50"
                    >
                      {firebaseLoading ? (
                        <div className="w-4 h-4 border-2 border-gold border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <svg className="w-4 h-4" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                      )}
                      Google
                    </button>

                    <button
                      onClick={() => handleFirebaseSignIn('facebook')}
                      disabled={firebaseLoading}
                      className="flex-1 flex items-center justify-center gap-2 py-3 border border-gold/20 rounded-sm text-sm text-charcoal-light hover:bg-cream-dark hover:border-gold/40 transition-colors disabled:opacity-50"
                    >
                      {firebaseLoading ? (
                        <div className="w-4 h-4 border-2 border-gold border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                        </svg>
                      )}
                      Facebook
                    </button>
                  </div>

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

               {/* Name confirmation step with inline confirm buttons */}
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

                    <div className="flex gap-3">
                      <button
                        onClick={() => handleFirebaseSignIn('google')}
                        disabled={firebaseLoading}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 border border-gold/20 rounded-sm text-sm text-charcoal-light hover:bg-cream-dark hover:border-gold/40 transition-colors disabled:opacity-50"
                      >
                        {firebaseLoading ? (
                          <div className="w-4 h-4 border-2 border-gold border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <svg className="w-4 h-4" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                        )}
                        Google
                      </button>
                      <button
                        onClick={() => handleFirebaseSignIn('facebook')}
                        disabled={firebaseLoading}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 border border-gold/20 rounded-sm text-sm text-charcoal-light hover:bg-cream-dark hover:border-gold/40 transition-colors disabled:opacity-50"
                      >
                        {firebaseLoading ? (
                          <div className="w-4 h-4 border-2 border-gold border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                          </svg>
                        )}
                        Facebook
                      </button>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-px bg-gold/10" />
                      <span className="text-charcoal-light/30 text-[10px] tracking-widest uppercase">or verify by</span>
                      <div className="flex-1 h-px bg-gold/10" />
                    </div>

                     <div>
                        <label className="block text-xs tracking-widest uppercase text-charcoal-light/50 mb-1.5">
                          Phone Number
                       </label>
                       {!awaitingSmsCode ? (
                         <div className="relative">
                             <input
                               type="tel"
                               value={origPhone && phone ? maskPhone(phone) : phone}
                               onChange={(e) => handlePhoneChange(e.target.value)}
                               readOnly={!!origPhone && !!phone}
                              className="w-full bg-cream-dark border border-gold/20 rounded-sm px-4 py-3 pr-20 text-sm text-charcoal placeholder:text-charcoal-light/30 focus:outline-none focus:border-gold/50 transition-colors"
                               placeholder="5551234567"
                             />
                            <button
                             onClick={handlePhoneConfirm}
                              disabled={!isUs || sendingSms || awaitingEmailLink}
                             className="absolute right-1.5 top-1/2 -translate-y-1/2 h-6 px-1.5 text-[9px] tracking-widest uppercase font-medium rounded-sm border border-current transition-colors disabled:opacity-30 disabled:cursor-not-allowed hover:text-sage"
                           >
                             {sendingSms ? 'Sending...' : 'Send Log-In Code'}
                           </button>
                        </div>
                      ) : (
                        <div>
                          <div className="flex items-center gap-2 bg-cream-dark border border-gold/20 rounded-sm px-3 py-2.5">
                            <span className="text-sm text-charcoal-light/50 font-mono select-none">code:</span>
                             <div className="flex gap-1.5">
                               {[0, 1, 2, 3].map((i) => (
                                 <input
                                   key={i}
                                   ref={(el) => { if (el) smsCodeRefs.current[i] = el }}
                                   type="text"
                                   inputMode="numeric"
                                   maxLength={1}
                                   value={smsCode[i] || ''}
                                   onChange={(e) => {
                                     const val = e.target.value.replace(/\D/g, '')
                                     if (!val) return
                                     const next = [...smsCode]
                                     next[i] = val
                                     setSmsCode(next)
                                     if (i < 3) smsCodeRefs.current[i + 1]?.focus()
                                     if (i === 3 || (val && i < 3 && !next[i + 1])) {
                                       const full = next.join('')
                                       if (full.length === 4) handleVerifySmsCode(full)
                                     }
                                   }}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Backspace') {
                                      const next = [...smsCode]
                                      if (next[i]) {
                                        next[i] = ''
                                        setSmsCode(next)
                                      } else if (i > 0) {
                                        next[i - 1] = ''
                                        setSmsCode(next)
                                        smsCodeRefs.current[i - 1]?.focus()
                                      }
                                    }
                                  }}
                                  onPaste={(e) => {
                                     e.preventDefault()
                                     const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4)
                                     const next = pasted.split('')
                                     while (next.length < 4) next.push('')
                                     setSmsCode(next)
                                     if (pasted.length === 4) handleVerifySmsCode(pasted)
                                     else smsCodeRefs.current[pasted.length]?.focus()
                                   }}
                                  className="w-8 h-8 text-center text-sm font-mono bg-cream border border-gold/10 rounded-sm text-charcoal focus:outline-none focus:border-gold/50 transition-colors"
                                  autoComplete="off"
                                />
                              ))}
                            </div>
                          </div>
                          <div className="mt-2 text-center">
                            <button
                              onClick={handleVerifySmsCode}
                              disabled={smsCode.join('').length < 4 || verifyingCode}
                              className="w-full py-2 border border-gold/20 rounded-sm text-xs tracking-widest uppercase text-charcoal-light hover:bg-cream-dark transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                              {verifyingCode ? 'Verifying...' : 'Verify'}
                            </button>
                          </div>
                        </div>)}
                    </div>

                      <div>
                        <label className="block text-xs tracking-widest uppercase text-charcoal-light/50 mb-1.5">
                          Email Address
                        </label>
                        <div className="relative">
                             <input
                               type="email"
                               value={origEmail && email ? maskEmail(email) : email}
                               onChange={(e) => setEmail(e.target.value)}
                               readOnly={!!origEmail && !!email}
                                disabled={awaitingSmsCode || awaitingEmailLink}
                             className="w-full bg-cream-dark border border-gold/20 rounded-sm px-4 py-3 pr-20 text-sm text-charcoal placeholder:text-charcoal-light/30 focus:outline-none focus:border-gold/50 transition-colors disabled:opacity-30"
                             placeholder="you@email.com"
                           />
                          <button
                             onClick={handleEmailConfirm}
                             disabled={!validEmail || saving || awaitingSmsCode || awaitingEmailLink}
                             className="absolute right-1.5 top-1/2 -translate-y-1/2 h-6 px-1.5 text-[9px] tracking-widest uppercase font-medium rounded-sm border border-current transition-colors disabled:opacity-30 disabled:cursor-not-allowed hover:text-sage"
                           >
                             {awaitingEmailLink ? 'Code Sent' : saving ? 'Sending...' : 'Send Log-In Code'}
                        </button>
                       </div>
                       {awaitingEmailLink && (
                         <div className="mt-3">
                           <div className="flex items-center gap-2 bg-cream-dark border border-gold/20 rounded-sm px-3 py-2.5">
                             <span className="text-sm text-charcoal-light/50 font-mono select-none">code:</span>
                             <div className="flex gap-1.5">
                               {[0, 1, 2, 3].map((i) => (
                                 <input
                                   key={i}
                                   ref={(el) => { if (el) emailCodeRefs.current[i] = el }}
                                   type="text"
                                   inputMode="numeric"
                                   maxLength={1}
                                   value={emailCode[i] || ''}
                                   onChange={(e) => {
                                     const val = e.target.value.replace(/\D/g, '')
                                     if (!val) return
                                     const next = [...emailCode]
                                     next[i] = val
                                     setEmailCode(next)
                                     if (i < 3) emailCodeRefs.current[i + 1]?.focus()
                                     if (i === 3 || (val && i < 3 && !next[i + 1])) {
                                       const full = next.join('')
                                       if (full.length === 4) handleEmailCodeComplete(full)
                                     }
                                   }}
                                   onKeyDown={(e) => {
                                     if (e.key === 'Backspace') {
                                       const next = [...emailCode]
                                       if (next[i]) {
                                         next[i] = ''
                                         setEmailCode(next)
                                       } else if (i > 0) {
                                         next[i - 1] = ''
                                         setEmailCode(next)
                                         emailCodeRefs.current[i - 1]?.focus()
                                       }
                                     }
                                   }}
                                   onPaste={(e) => {
                                     e.preventDefault()
                                     const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4)
                                     const next = pasted.split('')
                                     while (next.length < 4) next.push('')
                                     setEmailCode(next)
                                     if (pasted.length === 4) handleEmailCodeComplete(pasted)
                                     else emailCodeRefs.current[pasted.length]?.focus()
                                   }}
                                   className="w-8 h-8 text-center text-sm font-mono bg-cream border border-gold/10 rounded-sm text-charcoal focus:outline-none focus:border-gold/50 transition-colors"
                                   autoComplete="off"
                                 />
                               ))}
                             </div>
                           </div>
                         </div>
                       )}
                     </div> {/* end email section */}

                   {firebaseError && (
                     <div className="p-3 bg-gold/10 border border-gold/20 rounded-sm text-xs text-charcoal-light/70">
                       {firebaseError}
                     </div>
                   )}

                   <div className="flex pt-2">
                    <button
                      onClick={handleRejectName}
                      className="w-full py-2.5 border border-gold/20 rounded-sm text-xs text-charcoal-light hover:bg-cream-dark transition-colors"
                    >
                      No, that's not me
                    </button>
                  </div>
                </div>
              )}

              {/* Contact / Settings — phone + email */}
              {(authMode === 'contact' || authMode === 'settings') && user && (
                <ContactForm
                  key={`contact-${user.id}`}
                  user={user}
                  authMode={authMode}
                  updateContact={updateContact}
                  sideName={config.site.coupleNames}
                />
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
