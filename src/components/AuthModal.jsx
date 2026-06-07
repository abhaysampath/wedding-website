import { useState, useCallback, useEffect, useMemo, useRef, Suspense, lazy } from 'react'
import { useAuth } from '../context/useAuth'

const ContactForm = lazy(() => import('./ContactForm'))
import {
  createAnonymousSession,
  sendPhoneCode,
  linkPhoneCredential,
  getRecaptchaVerifier,
  clearRecaptchaVerifier,
} from '../firebase'
import { sendVerificationCode, verifyCode } from '../utils/verifyEmail'
import { maskEmail, maskPhone } from '../utils/mask'
import { stripPhone, guestLabel } from '../utils/guest'

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

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

export default function AuthModal() {
  const {
    showAuthModal, setShowAuthModal,
    authMode, setAuthMode,
    user, config, firebaseLoading, firebaseError, setFirebaseError,
    handleFirebaseSignIn, signInAsGuest, updateContact, recordLogin,
    content,
  } = useAuth()

   const [nameInput, setNameInput] = useState('')
   const [selectedMatch, setSelectedMatch] = useState(null)
   const [saving, setSaving] = useState(false)
   const [showDropdown, setShowDropdown] = useState(false)
    const [awaitingSmsCode, setAwaitingSmsCode] = useState(() => !!sessionStorage.getItem('awaiting_sms'))
    const [awaitingEmailLink, setAwaitingEmailLink] = useState(() => !!sessionStorage.getItem('awaiting_email'))
    const [emailCode, setEmailCode] = useState(Array(6).fill(''))
    const emailCodeRefs = useRef([])
    const [smsCode, setSmsCode] = useState(Array(6).fill(''))
    const smsCodeRefs = useRef([])
    const [verificationId, setVerificationId] = useState('')
    const [sendingSms, setSendingSms] = useState(false)
    const [verifyingCode, setVerifyingCode] = useState(false)
    const [guestPhone, setGuestPhone] = useState('')
    const [guestEmail, setGuestEmail] = useState('')
    const [smsResendable, setSmsResendable] = useState(true)
    const [emailResendable, setEmailResendable] = useState(true)
    const inputRef = useRef(null)
    const recaptchaContainerRef = useRef(null)
    const urlCodeRef = useRef(null)
    const urlSlugRef = useRef(null)
    const modalRef = useRef(null)
   const [highlightedIndex, setHighlightedIndex] = useState(-1)
   const [signedIn, setSignedIn] = useState(null)
   const welcomeShownRef = useRef(null)

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
      setNameInput('')
      setSelectedMatch(null)
      setSaving(false)
       setShowDropdown(false)
       setFirebaseError(null)
      setAwaitingSmsCode(false)
      setAwaitingEmailLink(false)
       setEmailCode(Array(6).fill(''))
       emailCodeRefs.current = []
       setSmsCode(Array(6).fill(''))
       smsCodeRefs.current = []
       setVerificationId('')
      setSendingSms(false)
      setVerifyingCode(false)
       setGuestPhone('')
       setGuestEmail('')
       setSignedIn(null)
       sessionStorage.removeItem('awaiting_sms')
       sessionStorage.removeItem('awaiting_email')
       sessionStorage.removeItem('sms_sent_at')
       sessionStorage.removeItem('email_sent_at')
       sessionStorage.removeItem('pending_guest_id')
       sessionStorage.removeItem('pending_guest_phone')
       sessionStorage.removeItem('pending_guest_email')
       clearRecaptchaVerifier()
    }, [setFirebaseError])



   const handleEmailConfirm = useCallback(async () => {
      if (saving || !guestEmail || !selectedMatch) return
      setSaving(true)
      setFirebaseError(null)
      try {
        await sendVerificationCode(guestEmail, selectedMatch.firstName.trim())
        setAwaitingEmailLink(true)
        sessionStorage.setItem('awaiting_email', '1')
        sessionStorage.setItem('email_sent_at', String(Date.now()))
      } catch (err) {
        setFirebaseError(err.message || 'Failed to send verification code')
      } finally {
        setSaving(false)
      }
    }, [guestEmail, selectedMatch, saving, setFirebaseError])

  const handleEmailCodeComplete = useCallback(async (code) => {
    if (!verifyCode(code)) {
      setFirebaseError('Invalid code. Check your email and try again.')
      return
    }
    setSaving(true)
    setFirebaseError(null)
    try {
      if (selectedMatch) {
        await updateContact({ phone: guestPhone, email: guestEmail })
        signInAsGuest(selectedMatch, { phone: guestPhone, email: guestEmail })
        setSignedIn(selectedMatch)
      } else {
        setShowAuthModal(false)
      }
    } catch (err) {
      setFirebaseError(err.message || 'Failed to complete sign in')
    } finally {
      setSaving(false)
    }
  }, [guestPhone, guestEmail, selectedMatch, updateContact, signInAsGuest, setShowAuthModal, setFirebaseError])

   const handlePhoneConfirm = useCallback(async () => {
      if (saving || sendingSms || !isUsNumber(guestPhone)) return
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
        const result = await sendPhoneCode(formatE164(guestPhone), verifier)
        setVerificationId(result.verificationId)
        setAwaitingSmsCode(true)
        sessionStorage.setItem('awaiting_sms', '1')
        sessionStorage.setItem('sms_sent_at', String(Date.now()))
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
     }, [guestPhone, saving, sendingSms, user, setFirebaseError, recaptchaContainerRef])

  const handleVerifySmsCode = useCallback(async (code) => {
    const codeStr = code || smsCode.join('')
    if (verifyingCode || codeStr.length < 6) return
    setVerifyingCode(true)
    setFirebaseError(null)
    try {
      await linkPhoneCredential(verificationId, codeStr)
      clearRecaptchaVerifier()
      if (selectedMatch) {
        await updateContact({ phone: guestPhone, email: guestEmail })
        signInAsGuest(selectedMatch, { phone: guestPhone, email: guestEmail })
        setSignedIn(selectedMatch)
      } else {
        await updateContact({ phone: guestPhone, email: guestEmail })
      }
    } catch (err) {
      setFirebaseError(err.message || 'Failed to verify code')
    } finally {
      setVerifyingCode(false)
    }
  }, [verificationId, smsCode, guestPhone, guestEmail, selectedMatch, signInAsGuest, updateContact, verifyingCode, setFirebaseError])

  const handleCancel = useCallback(() => {
    if (user) {
      recordLogin()
      setShowAuthModal(false)
      setAuthMode('signin')
      resetState()
      clearRecaptchaVerifier()
    } else {
      resetState()
      clearRecaptchaVerifier()
      setShowAuthModal(false)
      setTimeout(() => {
        const el = document.getElementById('hero')
        if (el) el.scrollIntoView({ behavior: 'smooth' })
      }, 100)
    }
  }, [user, recordLogin, setShowAuthModal, setAuthMode, resetState])

  const handleNeedHelp = useCallback(() => {
    const msg = `I'm having trouble signing in to the wedding website. I tried signing in but couldn't complete the process. Please help me get access.`
    window.dispatchEvent(new CustomEvent('pending-contact-msg', { detail: { message: msg, reason: 'login' } }))
    setShowAuthModal(false)
    setTimeout(() => {
      const el = document.getElementById('contact')
      if (el) el.scrollIntoView({ behavior: 'smooth' })
    }, 300)
  }, [setShowAuthModal])

  useEffect(() => {
    const storedGuestId = sessionStorage.getItem('pending_guest_id')
    const storedPhone = sessionStorage.getItem('pending_guest_phone')
    const storedEmail = sessionStorage.getItem('pending_guest_email')
    if (storedGuestId && content.guests?.length) {
      const guest = content.guests.find(g => g.id === storedGuestId)
      if (guest) {
        setTimeout(() => {
          setSelectedMatch(guest)
          setGuestPhone(storedPhone || '')
          setGuestEmail(storedEmail || '')
        }, 0)
      }
    }
  }, [content.guests])

  const handleSelectMatch = useCallback((guest) => {
    setSelectedMatch(guest)
    setShowDropdown(false)
    setGuestPhone(stripPhone(guest.phone))
    setGuestEmail(guest.email || '')
    sessionStorage.setItem('pending_guest_id', guest.id)
    sessionStorage.setItem('pending_guest_phone', stripPhone(guest.phone))
    sessionStorage.setItem('pending_guest_email', guest.email || '')
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
    if (e.key === 'ArrowDown' && showDropdown && matches.length > 0) {
      e.preventDefault()
      setHighlightedIndex(prev => (prev < matches.length - 1 ? prev + 1 : 0))
    } else if (e.key === 'ArrowUp' && showDropdown && matches.length > 0) {
      e.preventDefault()
      setHighlightedIndex(prev => (prev > 0 ? prev - 1 : matches.length - 1))
    } else if (e.key === 'Enter') {
      if (showDropdown && highlightedIndex >= 0) {
        e.preventDefault()
        handleSelectMatch(matches[highlightedIndex])
      } else if (matches.length === 1) {
        handleSelectMatch(matches[0])
      }
    } else if (e.key === 'Escape') {
      setShowDropdown(false)
    }
  }, [matches, handleSelectMatch, showDropdown, highlightedIndex])

  const handleEmailCodeCompleteRef = useRef(handleEmailCodeComplete)
  useEffect(() => {
    handleEmailCodeCompleteRef.current = handleEmailCodeComplete
  })

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const urlCode = params.get('code')
    if (urlCode && urlCode.length === 6) {
      window.history.replaceState({}, '', window.location.pathname)
      sessionStorage.setItem('awaiting_email', '1')
      sessionStorage.setItem('pending_email_code', urlCode)
      urlCodeRef.current = urlCode
      const slug = window.location.pathname.match(/\/g\/(.+)/)?.[1] || params.get('g')
      urlSlugRef.current = slug ? decodeURIComponent(slug) : null
      setTimeout(() => {
        setAwaitingEmailLink(true)
        setShowAuthModal(true)
      }, 0)
    }
  }, [setShowAuthModal])

  useEffect(() => {
    const code = urlCodeRef.current
    if (!code || !content.guests?.length || !content.loaded) return
    urlCodeRef.current = null
    const slug = urlSlugRef.current
    urlSlugRef.current = null
    setTimeout(() => {
      if (slug) {
        const guest = content.guests.find(g => {
          const gs = `${g.firstName} ${g.lastName}`.trim().toLowerCase().replace(/\s+/g, '-')
          return gs === slug
        })
        if (guest) {
          setSelectedMatch(guest)
          setGuestPhone(stripPhone(guest.phone))
          setGuestEmail(guest.email || '')
        }
      }
      setEmailCode(code.split('').concat(Array(6 - code.length).fill('')))
      setTimeout(() => handleEmailCodeCompleteRef.current(code), 200)
    }, 0)
  }, [content.guests, content.loaded])

  useEffect(() => {
    if (user && user !== welcomeShownRef.current) {
      welcomeShownRef.current = user
      setSignedIn(user)
    }
  }, [user])

  useEffect(() => {
    if (!awaitingSmsCode) return
    const sentAt = sessionStorage.getItem('sms_sent_at')
    if (!sentAt) { setTimeout(() => setSmsResendable(true), 0); return }
    const elapsed = Date.now() - parseInt(sentAt, 10)
    if (elapsed > 15 * 60 * 1000) {
      setTimeout(() => setSmsResendable(true), 0)
    } else {
      setTimeout(() => setSmsResendable(false), 0)
      const timer = setTimeout(() => setSmsResendable(true), 15 * 60 * 1000 - elapsed)
      return () => clearTimeout(timer)
    }
  }, [awaitingSmsCode])

  useEffect(() => {
    if (!awaitingEmailLink) return
    const sentAt = sessionStorage.getItem('email_sent_at')
    if (!sentAt) { setTimeout(() => setEmailResendable(true), 0); return }
    const elapsed = Date.now() - parseInt(sentAt, 10)
    if (elapsed > 15 * 60 * 1000) {
      setTimeout(() => setEmailResendable(true), 0)
    } else {
      setTimeout(() => setEmailResendable(false), 0)
      const timer = setTimeout(() => setEmailResendable(true), 15 * 60 * 1000 - elapsed)
      return () => clearTimeout(timer)
    }
  }, [awaitingEmailLink])

  useEffect(() => {
    if (!showAuthModal) return
    const timer = setTimeout(() => inputRef.current?.focus(), 50)
    return () => clearTimeout(timer)
  }, [showAuthModal])

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      setHighlightedIndex(showDropdown && matches.length > 0 ? 0 : -1)
    })
    return () => cancelAnimationFrame(id)
  }, [showDropdown, matches.length])

  useEffect(() => {
    if (highlightedIndex < 0 || !showDropdown) return
    const el = modalRef.current?.querySelector(`[data-index="${highlightedIndex}"]`)
    if (el) el.scrollIntoView({ block: 'nearest' })
  }, [highlightedIndex, showDropdown])

  useEffect(() => {
    if (!showAuthModal) return
    const el = modalRef.current
    if (!el) return
    const focusables = () => Array.from(el.querySelectorAll(FOCUSABLE)).filter(el => el.offsetParent !== null)
    const handler = (e) => {
      if (e.key !== 'Tab') return
      const els = focusables()
      if (els.length === 0) return
      const first = els[0]
      const last = els[els.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [showAuthModal])

  return (
    <>
      {showAuthModal && (
        <div
          ref={modalRef}
          className="fixed inset-0 z-50 bg-charcoal/60 backdrop-blur-sm overflow-y-auto md:flex md:items-start md:justify-center md:pt-[10vh] overscroll-contain"
          onClick={handleCancel}
          style={{ overscrollBehavior: 'contain' }}
        >
          <div
            className="min-h-screen md:min-h-0 w-full md:max-w-lg bg-cream md:rounded-sm md:shadow-2xl md:mb-8 overflow-y-auto pb-16 md:pb-0"
            onClick={(e) => e.stopPropagation()}
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
            <div className="p-4 pb-6 md:p-10 relative">
              <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
                {authMode === 'signin' ? 'Sign in' : authMode === 'contact' ? 'Contact information' : authMode === 'settings' ? 'Settings' : ''}
                {selectedMatch ? ` — signed in as ${selectedMatch.firstName} ${selectedMatch.lastName}` : ''}
                {firebaseError ? ` — error: ${firebaseError}` : ''}
              </div>
              <div ref={recaptchaContainerRef} />
              <button
                onClick={handleCancel}
                className="absolute top-4 md:top-10 right-4 md:right-6 w-9 h-9 md:w-[42px] md:h-[42px] flex items-center justify-center rounded-sm text-charcoal-light/30 hover:text-charcoal hover:bg-cream-dark transition-colors border border-transparent hover:border-gold/20"
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
                       role="combobox"
                       aria-expanded={showDropdown && matches.length > 0}
                       aria-controls="name-dropdown"
                       aria-activedescendant={highlightedIndex >= 0 ? `name-option-${highlightedIndex}` : undefined}
                       className="w-full bg-cream-dark border border-gold/20 rounded-sm px-4 py-3 text-sm text-charcoal placeholder:text-charcoal-light/30 focus:outline-none focus:border-gold/50 transition-colors"
                       placeholder="Start typing your name"
                       autoComplete="off"
                     />
                     {showDropdown && matches.length > 0 && (
                       <div id="name-dropdown" role="listbox" className="absolute top-full left-0 right-0 mt-1 bg-cream border border-gold/20 rounded-sm shadow-lg max-h-48 overflow-y-auto z-10">
                         {matches.map((g, i) => (
                           <button
                             key={g.id}
                             role="option"
                             aria-selected={i === highlightedIndex}
                             data-index={i}
                             onMouseEnter={() => setHighlightedIndex(i)}
                             onClick={() => handleSelectMatch(g)}
                             className={`w-full text-left px-4 py-2.5 text-sm transition-colors border-b border-gold/5 last:border-b-0 ${
                               i === highlightedIndex ? 'bg-gold/10 text-charcoal' : 'text-charcoal hover:bg-cream-dark'
                             }`}
                           >
                             <span className="font-medium">{g.firstName} {g.lastName}</span>
                             <span className="text-charcoal-light/50 ml-2">{guestLabel(g, sideName)}</span>
                           </button>
                         ))}
                       </div>
                     )}
                   </div>

                  {firebaseError && (
                    <div role="alert" className="p-3 bg-gold/10 border border-gold/20 rounded-sm text-xs text-charcoal-light/70">
                      {firebaseError}
                    </div>
                  )}

                  <div className="text-center pt-2">
                    <button
                      onClick={handleNeedHelp}
                      className="text-[10px] tracking-widest uppercase text-charcoal-light/30 hover:text-charcoal-light transition-colors"
                    >
                      Having trouble? Contact us
                    </button>
                  </div>
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

                     {/* Phone — input visible but empty, Send uses stored value */}
                     {guestPhone && isUsNumber(guestPhone) && !awaitingSmsCode && (
                       <div>
                         <label className="block text-xs tracking-widest uppercase text-charcoal-light/50 mb-1.5">
                           Phone Number
                         </label>
                         <div className="relative">
                            <input
                              type="tel"
                              value={maskPhone(guestPhone)}
                              readOnly
                              className="w-full bg-cream-dark border border-gold/20 rounded-sm px-4 py-3 pr-20 text-sm font-mono text-charcoal/70 focus:outline-none focus:border-gold/50 transition-colors cursor-default"
                            />
                           <button
                             onClick={handlePhoneConfirm}
                              disabled={sendingSms}
                             className="absolute right-1.5 top-1/2 -translate-y-1/2 h-6 px-1.5 text-[9px] tracking-widest uppercase font-medium rounded-sm border border-current transition-colors disabled:opacity-30 disabled:cursor-not-allowed hover:text-sage"
                           >
                             {sendingSms ? 'Sending...' : 'Send Log-In Code'}
                           </button>
                         </div>
                       </div>
                     )}

                     {/* SMS code input + resend */}
                     {awaitingSmsCode && (
                       <div>
                         <p className="text-[10px] text-charcoal-light/50 mb-2 text-center">
                           A verification code was sent to your phone
                         </p>
                         <div className="flex items-center gap-2 bg-cream-dark border border-gold/20 rounded-sm px-3 py-2.5">
                           <span className="text-sm text-charcoal-light/50 font-mono select-none">code:</span>
                           <div className="flex gap-1.5">
                             {[0, 1, 2, 3, 4, 5].map((i) => (
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
                                   if (i < 5) smsCodeRefs.current[i + 1]?.focus()
                                   if (i === 5 || (val && i < 3 && !next[i + 1])) {
                                     const full = next.join('')
                                     if (full.length === 6) handleVerifySmsCode(full)
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
                                   const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
                                   const next = pasted.split('')
                                   while (next.length < 6) next.push('')
                                   setSmsCode(next)
                                   if (pasted.length === 6) handleVerifySmsCode(pasted)
                                   else smsCodeRefs.current[pasted.length]?.focus()
                                 }}
                                 className="w-8 h-8 text-center text-sm font-mono bg-cream border border-gold/10 rounded-sm text-charcoal focus:outline-none focus:border-gold/50 transition-colors"
                                 autoComplete="off"
                               />
                             ))}
                           </div>
                         </div>
                           <div className="mt-2 flex items-center justify-center gap-3">
                             {smsResendable ? (
                                <button
                                  onClick={handlePhoneConfirm}
                                  disabled={sendingSms}
                                  className="py-2 px-3 text-[10px] tracking-widest uppercase text-charcoal-light/40 hover:text-charcoal-light transition-colors disabled:opacity-30"
                                >
                                  {sendingSms ? 'Sending...' : 'Resend Code'}
                                </button>
                              ) : null}
                         </div>
                       </div>
                     )}

                     {/* Email — input visible but empty, Send uses stored value */}
                     {guestEmail && !awaitingEmailLink && (
                       <div>
                         <label className="block text-xs tracking-widest uppercase text-charcoal-light/50 mb-1.5">
                           Email Address
                         </label>
                         <div className="relative">
                            <input
                              type="email"
                              value={maskEmail(guestEmail)}
                              readOnly
                              className="w-full bg-cream-dark border border-gold/20 rounded-sm px-4 py-3 pr-20 text-sm font-mono text-charcoal/70 focus:outline-none focus:border-gold/50 transition-colors cursor-default"
                            />
                           <button
                             onClick={handleEmailConfirm}
                              disabled={saving}
                             className="absolute right-1.5 top-1/2 -translate-y-1/2 h-6 px-1.5 text-[9px] tracking-widest uppercase font-medium rounded-sm border border-current transition-colors disabled:opacity-30 disabled:cursor-not-allowed hover:text-sage"
                           >
                             {saving ? 'Sending...' : 'Send Log-In Code'}
                           </button>
                         </div>
                       </div>
                     )}

                     {/* Email code input + resend */}
                     {awaitingEmailLink && (
                       <div>
                         <p className="text-[10px] text-charcoal-light/50 mb-2 text-center">
                           A verification code was sent to your email
                         </p>
                         <div className="flex items-center gap-2 bg-cream-dark border border-gold/20 rounded-sm px-3 py-2.5">
                           <span className="text-sm text-charcoal-light/50 font-mono select-none">code:</span>
                           <div className="flex gap-1.5">
                             {[0, 1, 2, 3, 4, 5].map((i) => (
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
                                   if (i < 5) emailCodeRefs.current[i + 1]?.focus()
                                   if (i === 5 || (val && i < 3 && !next[i + 1])) {
                                     const full = next.join('')
                                     if (full.length === 6) handleEmailCodeComplete(full)
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
                                   const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
                                   const next = pasted.split('')
                                   while (next.length < 6) next.push('')
                                   setEmailCode(next)
                                   if (pasted.length === 6) handleEmailCodeComplete(pasted)
                                   else emailCodeRefs.current[pasted.length]?.focus()
                                 }}
                                 className="w-8 h-8 text-center text-sm font-mono bg-cream border border-gold/10 rounded-sm text-charcoal focus:outline-none focus:border-gold/50 transition-colors"
                                 autoComplete="off"
                               />
                             ))}
                           </div>
                         </div>
                           <div className="mt-2 flex items-center justify-center gap-3">
                             {emailResendable ? (
                                <button
                                  onClick={handleEmailConfirm}
                                  disabled={saving}
                                  className="py-2 px-3 text-[10px] tracking-widest uppercase text-charcoal-light/40 hover:text-charcoal-light transition-colors disabled:opacity-30"
                                >
                                  {saving ? 'Sending...' : 'Resend Code'}
                                </button>
                              ) : null}
                         </div>
                       </div>
                     )}

                    {firebaseError && (
                      <div role="alert" className="p-3 bg-gold/10 border border-gold/20 rounded-sm text-xs text-charcoal-light/70">
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

              {/* Welcome message after sign-in */}
              {signedIn && (
                <div className="text-center py-8 space-y-4">
                  <div className="w-16 h-16 rounded-full bg-gold/10 flex items-center justify-center mx-auto">
                    <svg className="w-7 h-7 text-gold-dark" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                      <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                      <polyline points="22 4 12 14.01 9 11.01" />
                    </svg>
                  </div>
                  <p className="font-heading text-2xl text-charcoal">
                    Welcome, {signedIn.firstName}!
                  </p>
                  <p className="text-charcoal-light/60 text-sm">
                    {guestLabel(signedIn, sideName)}
                  </p>
                  <button
                    onClick={() => { setSignedIn(null); setShowAuthModal(false) }}
                    className="inline-flex items-center gap-2 bg-sage hover:bg-sage-dark text-cream text-xs tracking-widest uppercase px-6 py-3 rounded-sm transition-colors font-medium mt-2"
                  >
                    Continue to Site
                  </button>
                </div>
              )}

              {/* Contact / Settings — phone + email */}
              {(authMode === 'contact' || authMode === 'settings') && user && (
                <Suspense fallback={
                  <div className="space-y-5 animate-pulse">
                    <div className="p-4 bg-cream-dark border border-gold/10 rounded-sm">
                      <div className="h-6 bg-cream border border-gold/10 rounded-sm w-1/2" />
                      <div className="h-4 bg-cream border border-gold/10 rounded-sm w-1/3 mt-2" />
                    </div>
                    <div className="h-12 bg-cream-dark border border-gold/20 rounded-sm" />
                    <div className="h-12 bg-cream-dark border border-gold/20 rounded-sm" />
                    <div className="h-24 bg-cream-dark border border-gold/20 rounded-sm" />
                    <div className="h-24 bg-cream-dark border border-gold/20 rounded-sm" />
                    <div className="flex gap-3">
                      <div className="flex-1 h-10 bg-cream-dark border border-gold/20 rounded-sm" />
                      <div className="flex-1 h-10 bg-cream-dark border border-gold/20 rounded-sm" />
                    </div>
                  </div>
                }>
                  <ContactForm
                    key={`contact-${user.id}`}
                    user={user}
                    authMode={authMode}
                    updateContact={updateContact}
                    sideName={config.site.coupleNames}
                  />
                </Suspense>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
