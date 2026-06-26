import { useState, useCallback, useEffect, useMemo, useRef, Suspense, lazy } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'

import { track } from '@vercel/analytics'
import { useAuth } from '../context/useAuth'

const ContactForm = lazy(() => import('./ContactForm'))
import {
  createAnonymousSession,
  sendPhoneCode,
  linkPhoneCredential,
  getRecaptchaVerifier,
  clearRecaptchaVerifier,
} from '../firebase'
import { sendVerificationCode, verifyCodeServer } from '../utils/verifyEmail'
import { maskEmail, maskPhone } from '../utils/mask'
import { stripPhone, guestLabel, fullName } from '../utils/guest'

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

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

export default function AuthModal() {
  const {
    showAuthModal,
    setShowAuthModal,
    authMode,
    setAuthMode,
    user,
    config,
    firebaseLoading,
    firebaseError,
    nameMismatch,
    setNameMismatch,
    setFirebaseError,
    handleFirebaseSignIn,
    signInAsGuest,
    updateContact,
    recordLogin,
    recordLoginAttempt,
    content,
  } = useAuth()

  const [nameInput, setNameInput] = useState('')
  const [selectedMatch, setSelectedMatch] = useState(null)
  const [saving, setSaving] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const [awaitingSmsCode, setAwaitingSmsCode] = useState(
    () => !!sessionStorage.getItem('awaiting_sms'),
  )
  const [awaitingEmailLink, setAwaitingEmailLink] = useState(
    () => !!sessionStorage.getItem('awaiting_email'),
  )
  const [smsCode, setSmsCode] = useState(Array(6).fill(''))
  const smsCodeRefs = useRef([])
  const [emailCode, setEmailCode] = useState(Array(6).fill(''))
  const emailCodeRefs = useRef([])
  const [verificationId, setVerificationId] = useState(() => {
    try {
      const stored = sessionStorage.getItem('pending_verification_id')
      const phone = sessionStorage.getItem('pending_verification_phone')
      const sentAt = sessionStorage.getItem('pending_verification_sent_at')
      if (stored && phone && sentAt) {
        const elapsed = Date.now() - parseInt(sentAt, 10)
        if (elapsed < 5 * 60 * 1000) return stored
      }
    } catch {
      // sessionStorage unavailable
    }
    return ''
  })
  const [sendingSms, setSendingSms] = useState(false)
  const [verifyingCode, setVerifyingCode] = useState(false)
  const [guestPhone, setGuestPhone] = useState('')
  const [guestEmail, setGuestEmail] = useState('')
  const [smsResendable, setSmsResendable] = useState(true)
  const [smsResendCountdown, setSmsResendCountdown] = useState(0)
  const [emailResendable, setEmailResendable] = useState(true)
  const [emailResendCountdown, setEmailResendCountdown] = useState(0)
  const inputRef = useRef(null)
  const recaptchaContainerRef = useRef(null)
  const urlCodeRef = useRef(null)
  const urlSlugRef = useRef(null)
  const modalRef = useRef(null)
  const inputContainerRef = useRef(null)
  const prevFocusRef = useRef(null)
  const backdropPointerDownRef = useRef(null)
  const [dropdownPos, setDropdownPos] = useState(null)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const [signedIn, setSignedIn] = useState(null)
  const welcomeShownRef = useRef(null)

  const sideName = config.site.coupleNames

  const matches = useMemo(() => {
    const t = normalize(nameInput)
    if (t.length < 3) return []
    const includeTest = nameInput.includes('TEST')
    return content.guests
      .filter(g => {
        if (g.title === 'TEST' && !includeTest) return false
        if (g.isKids || g.title === 'KIDS') return false
        const full = normalize(`${g.firstName} ${g.lastName}`)
        const first = normalize(g.firstName)
        const last = normalize(g.lastName)
        return full.includes(t) || first.includes(t) || last.includes(t)
      })
      .slice(0, 8)
  }, [nameInput, content.guests])

  useEffect(() => {
    if (showAuthModal) {
      prevFocusRef.current = document.activeElement
    } else if (prevFocusRef.current && typeof prevFocusRef.current.focus === 'function') {
      prevFocusRef.current.focus()
      prevFocusRef.current = null
    }
  }, [showAuthModal])

  const resetState = useCallback(() => {
    setNameInput('')
    setSelectedMatch(null)
    setSaving(false)
    setShowDropdown(false)
    setFirebaseError(null)
    setAwaitingSmsCode(false)
    setSmsCode(Array(6).fill(''))
    smsCodeRefs.current = []
    setEmailCode(Array(6).fill(''))
    emailCodeRefs.current = []
    setVerificationId('')
    setSendingSms(false)
    setVerifyingCode(false)
    setGuestPhone('')
    setGuestEmail('')
    setSignedIn(null)
    setHighlightedIndex(-1)
    setSmsResendable(true)
    setEmailResendable(true)
    sessionStorage.removeItem('awaiting_sms')
    sessionStorage.removeItem('sms_sent_at')
    sessionStorage.removeItem('pending_email_code')
    sessionStorage.removeItem('pending_email_addr')
    sessionStorage.removeItem('pending_email_name')
    sessionStorage.removeItem('pending_guest_id')
    sessionStorage.removeItem('pending_guest_phone')
    sessionStorage.removeItem('pending_guest_email')
    sessionStorage.removeItem('pending_verification_id')
    sessionStorage.removeItem('pending_verification_phone')
    sessionStorage.removeItem('pending_verification_sent_at')
    clearRecaptchaVerifier()
  }, [setFirebaseError])

  const handleOAuthSignIn = useCallback(
    async provider => {
      if (selectedMatch) recordLoginAttempt(selectedMatch.id)
      return handleFirebaseSignIn(provider)
    },
    [selectedMatch, recordLoginAttempt, handleFirebaseSignIn],
  )

  const handleEmailConfirm = useCallback(async () => {
    if (saving || !guestEmail || !selectedMatch) return

    const sentAt = sessionStorage.getItem('email_sent_at')
    const lastAddr = sessionStorage.getItem('pending_email_addr')
    const COOLDOWN_MS = 5 * 60 * 1000
    if (sentAt && lastAddr === guestEmail && Date.now() - parseInt(sentAt, 10) < COOLDOWN_MS) {
      setAwaitingEmailLink(true)
      sessionStorage.setItem('awaiting_email', '1')
      return
    }

    if (selectedMatch) recordLoginAttempt(selectedMatch.id)
    setSaving(true)
    setFirebaseError(null)
    try {
      const result = await sendVerificationCode(
        guestEmail,
        `${selectedMatch.firstName} ${selectedMatch.lastName}`.trim(),
      )
      if (result?.cooldown) {
        sessionStorage.setItem('email_sent_at', String(Date.now()))
        sessionStorage.setItem('pending_email_addr', guestEmail)
      } else {
        sessionStorage.setItem('email_sent_at', String(Date.now()))
        sessionStorage.setItem('pending_email_addr', guestEmail)
      }
      setAwaitingEmailLink(true)
      sessionStorage.setItem('awaiting_email', '1')
    } catch (err) {
      setFirebaseError(err.message || 'Failed to send verification code')
      track('signin_failed', {
        method: 'email',
        reason: err.message,
        guest: selectedMatch?.firstName,
        guestId: selectedMatch?.id,
      })
    } finally {
      setSaving(false)
    }
  }, [guestEmail, selectedMatch, saving, setFirebaseError, recordLoginAttempt])

  const handleEmailCodeComplete = useCallback(
    async code => {
      setSaving(true)
      setFirebaseError(null)
      try {
        if (!guestEmail) {
          setFirebaseError('Session lost. Please close and sign in again.')
          setSaving(false)
          return
        }
        const result = await verifyCodeServer(code, guestEmail)
        if (!result.valid) {
          const msg =
            result.reason === 'No code sent or expired'
              ? 'Your code expired. Click Resend to get a new one.'
              : result.reason === 'Code already used'
                ? 'This code was already used. Click Resend to get a new one.'
                : 'Invalid code. Check your email and try again.'
          setFirebaseError(msg)
          if (
            result.reason === 'No code sent or expired' ||
            result.reason === 'Code already used'
          ) {
            setEmailResendable(true)
            setEmailResendCountdown(0)
            sessionStorage.removeItem('email_sent_at')
          }
          track('signin_failed', {
            method: 'email_code',
            reason: result.reason,
            guest: selectedMatch?.firstName,
            guestId: selectedMatch?.id,
          })
          return
        }
        sessionStorage.removeItem('pending_email_code')
        if (selectedMatch) {
          signInAsGuest(selectedMatch, { phone: guestPhone, email: guestEmail })
          setSignedIn(selectedMatch)
          try {
            await updateContact({ phone: guestPhone, email: guestEmail })
          } catch (err) {
            console.warn('Contact update after email sign-in failed:', err)
          }
        } else {
          setFirebaseError('We could not match this code to a guest. Please sign in by name below.')
        }
      } catch (err) {
        setFirebaseError(err.message || 'Failed to complete sign in')
        track('signin_failed', {
          method: 'email_code',
          reason: err.message,
          guest: selectedMatch?.firstName,
          guestId: selectedMatch?.id,
        })
      } finally {
        setSaving(false)
      }
    },
    [guestPhone, guestEmail, selectedMatch, updateContact, signInAsGuest, setFirebaseError],
  )

  const handleEmailCodeCompleteRef = useRef(handleEmailCodeComplete)
  useEffect(() => {
    handleEmailCodeCompleteRef.current = handleEmailCodeComplete
  }, [handleEmailCodeComplete])

  const handlePhoneConfirm = useCallback(async () => {
    if (saving || sendingSms || !isUsNumber(guestPhone)) return
    setSendingSms(true)
    if (selectedMatch) recordLoginAttempt(selectedMatch.id)

    const e164Phone = formatE164(guestPhone)
    const storedVid = sessionStorage.getItem('pending_verification_id')
    const storedPhone = sessionStorage.getItem('pending_verification_phone')
    const sentAt = sessionStorage.getItem('pending_verification_sent_at')
    if (storedVid && storedPhone === e164Phone && sentAt) {
      const elapsed = Date.now() - parseInt(sentAt, 10)
      if (elapsed < 5 * 60 * 1000) {
        setVerificationId(storedVid)
        setAwaitingSmsCode(true)
        sessionStorage.setItem('awaiting_sms', '1')
        setSendingSms(false)
        return
      }
    }

    setFirebaseError(null)
    try {
      if (!user?.uid) {
        const fbUser = await createAnonymousSession()
        if (!fbUser)
          throw new Error('Failed to create session. Check Firebase Anonymous provider is enabled.')
      }
      if (!recaptchaContainerRef.current) {
        throw new Error('reCAPTCHA container not ready')
      }
      const verifier = getRecaptchaVerifier(recaptchaContainerRef.current)
      if (!verifier) {
        throw new Error('Failed to initialize reCAPTCHA')
      }
      const result = await sendPhoneCode(e164Phone, verifier)
      setVerificationId(result.verificationId)
      setAwaitingSmsCode(true)
      sessionStorage.setItem('awaiting_sms', '1')
      sessionStorage.setItem('sms_sent_at', String(Date.now()))
      sessionStorage.setItem('pending_verification_id', result.verificationId)
      sessionStorage.setItem('pending_verification_phone', e164Phone)
      sessionStorage.setItem('pending_verification_sent_at', String(Date.now()))
    } catch (err) {
      console.error('Phone auth error:', err)
      track('signin_failed', {
        method: 'phone',
        reason: err.code || err.message,
        guest: selectedMatch?.firstName,
        guestId: selectedMatch?.id,
      })
      const code = err?.code || ''
      if (
        code === 'auth/captcha-check-failed' ||
        code === 'auth/invalid-app-credential' ||
        /recaptcha/i.test(err?.message || '')
      ) {
        setFirebaseError(
          'Phone sign-in is temporarily unavailable due to a reCAPTCHA configuration issue. Please sign in with email instead, or try again later.',
        )
      } else if (code === 'auth/too-many-requests') {
        setFirebaseError('Too many attempts. Please wait a few minutes and try again.')
      } else {
        setFirebaseError(err.message || 'Failed to send verification code')
      }
    } finally {
      clearRecaptchaVerifier()
      setSendingSms(false)
    }
  }, [
    guestPhone,
    saving,
    sendingSms,
    user,
    selectedMatch,
    recordLoginAttempt,
    setFirebaseError,
    recaptchaContainerRef,
  ])

  const handleVerifySmsCode = useCallback(
    async code => {
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
        track('signin_failed', {
          method: 'sms_code',
          reason: err.message,
          guest: selectedMatch?.firstName,
          guestId: selectedMatch?.id,
        })
      } finally {
        setVerifyingCode(false)
      }
    },
    [
      verificationId,
      smsCode,
      guestPhone,
      guestEmail,
      selectedMatch,
      signInAsGuest,
      updateContact,
      verifyingCode,
      setFirebaseError,
    ],
  )

  const handleCancel = useCallback(
    async e => {
      if (e && e.target !== e.currentTarget) return
      if (backdropPointerDownRef.current !== e.currentTarget) return
      if (user && (authMode === 'settings' || authMode === 'contact')) {
        setShowAuthModal(false)
      } else if (user) {
        try {
          await recordLogin()
        } catch (err) {
          console.warn('recordLogin failed on cancel:', err)
        }
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
    },
    [user, recordLogin, setShowAuthModal, setAuthMode, resetState, authMode],
  )

  const handleDiscardAndClose = useCallback(async () => {
    try {
      sessionStorage.removeItem('contact_draft_' + user?.id)
    } catch (err) {
      console.error('Failed to remove contact draft:', err)
    }
    if (user) {
      try {
        await recordLogin()
      } catch (err) {
        console.warn('recordLogin failed on discard:', err)
      }
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
    window.dispatchEvent(
      new CustomEvent('pending-contact-msg', { detail: { message: msg, reason: 'login' } }),
    )
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

  const handleSelectMatch = useCallback(guest => {
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

  const handleNameChange = useCallback(e => {
    setNameInput(e.target.value)
    setShowDropdown(e.target.value.trim().length >= 3)
  }, [])

  const handleNameFocus = useCallback(() => {
    if (nameInput.trim().length >= 3) setShowDropdown(true)
  }, [nameInput])

  const handleKeyDown = useCallback(
    e => {
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
    },
    [matches, handleSelectMatch, showDropdown, highlightedIndex],
  )

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const urlCode = params.get('code')
    const pathSlug = window.location.pathname.match(/^\/g\/(.+)/)?.[1]
    const queryG = params.get('g')
    const slug = pathSlug
      ? decodeURIComponent(pathSlug)
      : queryG
        ? decodeURIComponent(queryG)
        : null

    if (user) {
      if (urlCode || slug) {
        window.history.replaceState({}, '', '/')
      }
      return
    }

    if (urlCode && urlCode.length === 6) {
      window.history.replaceState({}, '', window.location.pathname)
      sessionStorage.setItem('awaiting_email', '1')
      sessionStorage.setItem('pending_email_code', urlCode)
      if (!sessionStorage.getItem('email_sent_at')) {
        sessionStorage.setItem('email_sent_at', String(Date.now()))
      }
      urlCodeRef.current = urlCode
      urlSlugRef.current = slug
      setTimeout(() => {
        setAwaitingEmailLink(true)
        setShowAuthModal(true)
      }, 0)
    } else if (slug) {
      window.history.replaceState({}, '', window.location.pathname)
      urlSlugRef.current = slug
      setShowAuthModal(true)
    }
  }, [setShowAuthModal, user])

  useEffect(() => {
    const code = urlCodeRef.current
    const slug = urlSlugRef.current
    if (!slug || !content.guests?.length || !content.loaded) return
    urlSlugRef.current = null
    urlCodeRef.current = null
    setTimeout(() => {
      const guest = content.guests.find(g => {
        const gs = `${g.firstName} ${g.lastName}`.trim().toLowerCase().replace(/\s+/g, '-')
        return gs === slug
      })
      if (guest) {
        setSelectedMatch(guest)
        setGuestPhone(stripPhone(guest.phone))
        setGuestEmail(guest.email || '')
        if (guest.email) sessionStorage.setItem('pending_email_addr', guest.email)
        if (guest.id) recordLoginAttempt(guest.id)
      }
      if (code) {
        setEmailCode(code.split('').concat(Array(6 - code.length).fill('')))
        setTimeout(() => {
          try {
            handleEmailCodeCompleteRef.current?.(code)
          } catch (err) {
            console.error('Auto sign-in failed:', err)
            setFirebaseError('Auto sign-in failed. Enter the 6-digit code from your email.')
          }
        }, 500)
      }
    }, 0)
  }, [content.guests, content.loaded, recordLoginAttempt, setFirebaseError])

  useEffect(() => {
    if (showAuthModal) {
      const id = setTimeout(resetState, 0)
      return () => clearTimeout(id)
    }
  }, [showAuthModal, resetState])

  useEffect(() => {
    const id = setTimeout(() => {
      if (user && user !== welcomeShownRef.current) {
        welcomeShownRef.current = user
        setSignedIn(user)
      } else if (!user) {
        setSignedIn(null)
        welcomeShownRef.current = null
      }
    }, 0)
    return () => clearTimeout(id)
  }, [user])

  useEffect(() => {
    if (!awaitingSmsCode) return
    const sentAt = sessionStorage.getItem('sms_sent_at')
    if (!sentAt) {
      setTimeout(() => setSmsResendable(true), 0)
      return
    }
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
    if (!awaitingEmailLink) {
      setTimeout(() => setEmailResendCountdown(0), 0)
      return
    }
    const sentAt = sessionStorage.getItem('email_sent_at')
    if (!sentAt) {
      setTimeout(() => {
        setEmailResendable(true)
        setEmailResendCountdown(0)
      }, 0)
      return
    }
    const COOLDOWN_MS = 5 * 60 * 1000
    const elapsed = Date.now() - parseInt(sentAt, 10)
    if (elapsed >= COOLDOWN_MS) {
      setTimeout(() => {
        setEmailResendable(true)
        setEmailResendCountdown(0)
      }, 0)
    } else {
      setTimeout(() => setEmailResendable(false), 0)
      const update = () => {
        const left = Math.max(0, COOLDOWN_MS - (Date.now() - parseInt(sentAt, 10)))
        setEmailResendCountdown(Math.ceil(left / 1000))
        if (left <= 0) {
          setTimeout(() => {
            setEmailResendable(true)
            setEmailResendCountdown(0)
          }, 0)
        }
      }
      setTimeout(update, 0)
      const interval = setInterval(update, 1000)
      const timeout = setTimeout(() => {
        setTimeout(() => {
          setEmailResendable(true)
          setEmailResendCountdown(0)
        }, 0)
      }, COOLDOWN_MS - elapsed)
      return () => {
        clearInterval(interval)
        clearTimeout(timeout)
      }
    }
  }, [awaitingEmailLink])

  useEffect(() => {
    if (!awaitingSmsCode || smsResendable) {
      setTimeout(() => setSmsResendCountdown(0), 0)
      return
    }
    const sentAt = sessionStorage.getItem('pending_verification_sent_at')
    if (!sentAt) return
    const COOLDOWN_MS = 15 * 60 * 1000
    const update = () => {
      const elapsed = Date.now() - parseInt(sentAt, 10)
      const left = Math.max(0, COOLDOWN_MS - elapsed)
      setSmsResendCountdown(Math.ceil(left / 1000))
      if (left <= 0) {
        setTimeout(() => {
          setSmsResendable(true)
          setSmsResendCountdown(0)
        }, 0)
        return false
      }
      return true
    }
    if (!update()) return
    const id = setInterval(() => {
      if (!update()) clearInterval(id)
    }, 1000)
    return () => clearInterval(id)
  }, [awaitingSmsCode, smsResendable])

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
    const focusables = () =>
      Array.from(el.querySelectorAll(FOCUSABLE)).filter(el => el.offsetParent !== null)
    const handler = e => {
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

  useEffect(() => {
    if (!showDropdown || !inputContainerRef.current) {
      setDropdownPos(null)
      return
    }
    const updatePos = () => {
      if (inputContainerRef.current) {
        const rect = inputContainerRef.current.getBoundingClientRect()
        setDropdownPos({ top: rect.bottom + 4, left: rect.left, width: rect.width })
      }
    }
    updatePos()
    const scrollEl = modalRef.current
    window.addEventListener('scroll', updatePos, { passive: true })
    window.addEventListener('resize', updatePos, { passive: true })
    if (scrollEl) scrollEl.addEventListener('scroll', updatePos, { passive: true })
    return () => {
      window.removeEventListener('scroll', updatePos)
      window.removeEventListener('resize', updatePos)
      if (scrollEl) scrollEl.removeEventListener('scroll', updatePos)
    }
  }, [showDropdown])

  const [logoOffset, setLogoOffset] = useState({ x: 0, y: 0 })

  useEffect(() => {
    const id = setTimeout(() => {
      if (showAuthModal && typeof window !== 'undefined' && window.__logoRect) {
        const r = window.__logoRect
        const cx = window.innerWidth / 2
        const cy = window.innerHeight / 2
        setLogoOffset({ x: r.x + r.width / 2 - cx, y: r.y + r.height / 2 - cy })
        window.__logoRect = null
      } else if (!showAuthModal) {
        setLogoOffset({ x: 0, y: 0 })
      }
    }, 0)
    return () => clearTimeout(id)
  }, [showAuthModal])

  const logoAnimStyle = useMemo(() => {
    if (!showAuthModal) return {}
    return {
      '--logo-ox': `${logoOffset.x * 0.5}px`,
      '--logo-oy': `${logoOffset.y * 0.5}px`,
    }
  }, [showAuthModal, logoOffset])

  return (
    <>
      {showAuthModal && (
        <div
          className="fixed inset-0 z-50 bg-charcoal/60 backdrop-blur-sm overflow-y-auto md:flex md:items-start md:justify-center md:pt-[10vh] overscroll-contain animate-modal-fade-in"
          ref={modalRef}
          onClick={handleCancel}
          onPointerDown={e => {
            backdropPointerDownRef.current = e.target === e.currentTarget ? e.currentTarget : null
          }}
          style={{ overscrollBehavior: 'contain' }}
        >
          <div
            className="min-h-screen md:min-h-0 w-full md:max-w-lg bg-cream md:rounded-sm md:shadow-2xl md:mb-8 overflow-y-auto pb-16 md:pb-0 animate-modal-pop-in"
            onClick={e => e.stopPropagation()}
            style={{ ...logoAnimStyle, WebkitOverflowScrolling: 'touch' }}
          >
            <div className="p-4 pb-6 md:p-10 relative">
              <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
                {authMode === 'signin'
                  ? 'Sign in'
                  : authMode === 'contact'
                    ? 'Contact information'
                    : authMode === 'settings'
                      ? 'Settings'
                      : ''}
                {selectedMatch ? ` — signed in as ${fullName(selectedMatch)}` : ''}
                {firebaseError ? ` — error: ${firebaseError}` : ''}
              </div>
              <div ref={recaptchaContainerRef} />
              <button
                type="button"
                onClick={handleDiscardAndClose}
                aria-label="Close"
                className="absolute top-4 md:top-10 right-4 md:right-6 w-9 h-9 md:w-[42px] md:h-[42px] flex items-center justify-center rounded-sm text-charcoal-light/30 hover:text-charcoal hover:bg-cream-dark transition-colors border border-transparent hover:border-gold/20"
              >
                <svg
                  className="w-4 h-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              {/* Sign In — OAuth first, then name entry */}
              {authMode === 'signin' && !selectedMatch && (
                <div className="space-y-4">
                  <motion.button
                    type="button"
                    onClick={() => handleOAuthSignIn('google')}
                    disabled={firebaseLoading}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{
                      scale: 0.93,
                      transition: { type: 'spring', stiffness: 500, damping: 12 },
                    }}
                    className="mx-auto w-full flex items-center justify-center gap-3 py-3.5 px-5 border-2 border-gold/40 bg-white rounded-sm text-sm font-medium text-charcoal hover:bg-cream hover:border-gold/60 shadow-sm hover:shadow-md transition-all disabled:opacity-50 max-w-[280px]"
                  >
                    {firebaseLoading ? (
                      <div className="w-4 h-4 border-2 border-gold border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <svg className="w-4 h-4" viewBox="0 0 24 24">
                        <path
                          fill="#4285F4"
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        />
                        <path
                          fill="#EA4335"
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        />
                      </svg>
                    )}
                    Sign in with Google
                  </motion.button>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gold/10" />
                    </div>
                    <div className="relative flex justify-center">
                      <span className="bg-cream px-3 text-xs text-charcoal-light/30">or</span>
                    </div>
                  </div>

                  <p className="text-sm text-charcoal-light/70">Find your invite by name</p>

                  <div ref={inputContainerRef}>
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
                      aria-activedescendant={
                        highlightedIndex >= 0 ? `name-option-${highlightedIndex}` : undefined
                      }
                      className="w-full bg-cream-dark border border-gold/20 rounded-sm px-4 py-3 text-sm text-charcoal placeholder:text-charcoal-light/30 focus:outline-none focus:border-gold/50 transition-colors"
                      placeholder="Start typing your name"
                      autoComplete="off"
                    />
                    {showDropdown &&
                      matches.length > 0 &&
                      dropdownPos &&
                      createPortal(
                        <div
                          id="name-dropdown"
                          role="listbox"
                          style={{
                            position: 'fixed',
                            top: dropdownPos.top,
                            left: dropdownPos.left,
                            width: dropdownPos.width,
                          }}
                          className="mt-1 bg-cream border border-gold/20 rounded-sm shadow-lg max-h-48 overflow-y-auto z-[60]"
                          onClick={e => e.stopPropagation()}
                        >
                          {matches.map((g, i) => (
                            <button
                              type="button"
                              key={g.id}
                              role="option"
                              aria-selected={i === highlightedIndex}
                              data-index={i}
                              onMouseEnter={() => setHighlightedIndex(i)}
                              onClick={() => handleSelectMatch(g)}
                              className={`w-full text-left px-4 py-2.5 text-sm transition-colors border-b border-gold/5 last:border-b-0 ${
                                i === highlightedIndex
                                  ? 'bg-gold/10 text-charcoal'
                                  : 'text-charcoal hover:bg-cream-dark'
                              }`}
                            >
                              <span className="font-medium">{fullName(g)}</span>
                              <span className="text-charcoal-light/50 ml-2">
                                {guestLabel(g, sideName)}
                              </span>
                            </button>
                          ))}
                        </div>,
                        document.body,
                      )}
                  </div>

                  {firebaseError && (
                    <div
                      role="alert"
                      className="p-3 bg-gold/10 border border-gold/20 rounded-sm text-xs text-charcoal-light/70"
                    >
                      {firebaseError}
                    </div>
                  )}

                  {nameMismatch && (
                    <div className="p-4 bg-red/10 border border-red/20 rounded-sm space-y-3">
                      <div>
                        <p className="text-xs font-medium text-red mb-2">
                          We couldn't match your Google account to a guest.
                        </p>
                        <div className="text-xs text-charcoal-light/70 space-y-1">
                          <p>
                            <span className="text-charcoal-light/40">Google name:</span>{' '}
                            <span className="font-medium">{nameMismatch.googleName}</span>
                          </p>
                          {nameMismatch.closestName && (
                            <p>
                              <span className="text-charcoal-light/40">Closest in guest list:</span>{' '}
                              <span className="font-medium">{nameMismatch.closestName}</span>
                            </p>
                          )}
                          {nameMismatch.googleEmail && (
                            <p>
                              <span className="text-charcoal-light/40">Email:</span>{' '}
                              <span className="font-medium">{nameMismatch.googleEmail}</span>
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            window.dispatchEvent(
                              new CustomEvent('pending-contact-msg', {
                                detail: {
                                  reason: 'rsvp',
                                  message: `Name mismatch report:\nGoogle name: ${nameMismatch.googleName}\nGoogle email: ${nameMismatch.googleEmail}\nClosest in guest list: ${nameMismatch.closestName || '(none)'}\nGuest ID (if known): ${nameMismatch.closestId || '(none)'}`,
                                },
                              }),
                            )
                            setNameMismatch(null)
                            setAuthMode('contact')
                          }}
                          className="w-full py-2 border border-gold/30 bg-cream rounded-sm text-xs tracking-widest uppercase text-charcoal hover:bg-gold/10 transition-colors"
                        >
                          Report Name Mismatch
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setNameMismatch(null)
                            setFirebaseError(null)
                          }}
                          className="w-full py-2 text-[10px] tracking-widest uppercase text-charcoal-light/40 hover:text-charcoal-light transition-colors"
                        >
                          Try a different account
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="text-center pt-2">
                    <button
                      type="button"
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
                    <p className="font-heading text-2xl text-charcoal">{fullName(selectedMatch)}</p>
                    <p className="text-sm text-charcoal-light/50 mt-1">
                      {guestLabel(selectedMatch, sideName)}?
                    </p>
                  </div>

                  <div className="flex justify-center">
                    <button
                      type="button"
                      onClick={() => handleOAuthSignIn('google')}
                      disabled={firebaseLoading}
                      className="flex items-center justify-center gap-3 py-3 px-6 border-2 border-gold/40 bg-white rounded-sm text-sm font-medium text-charcoal hover:bg-cream hover:border-gold/60 shadow-sm hover:shadow-md transition-all disabled:opacity-50"
                    >
                      {firebaseLoading ? (
                        <div className="w-4 h-4 border-2 border-gold border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <svg className="w-4 h-4" viewBox="0 0 24 24">
                          <path
                            fill="#4285F4"
                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                          />
                          <path
                            fill="#34A853"
                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                          />
                          <path
                            fill="#FBBC05"
                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                          />
                          <path
                            fill="#EA4335"
                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                          />
                        </svg>
                      )}
                      Sign in with Google
                    </button>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-px bg-gold/10" />
                    <span className="text-charcoal-light/30 text-[10px] tracking-widest uppercase">
                      or verify by
                    </span>
                    <div className="flex-1 h-px bg-gold/10" />
                  </div>

                  <div className="flex flex-col gap-4">
                    {/* Phone — always visible when guest has phone */}
                    {guestPhone && isUsNumber(guestPhone) && (
                      <div>
                        <label
                          htmlFor="am-phone"
                          className="block text-xs tracking-widest uppercase text-charcoal-light/50 mb-1.5"
                        >
                          Phone Number
                        </label>
                        <div className="relative">
                          <input
                            id="am-phone"
                            type="tel"
                            value={maskPhone(guestPhone)}
                            readOnly
                            className="w-full bg-cream-dark border border-gold/20 rounded-sm px-4 py-3 pr-20 text-sm font-mono text-charcoal/70 focus:outline-none focus:border-gold/50 transition-colors cursor-default"
                          />
                          <button
                            type="button"
                            onClick={handlePhoneConfirm}
                            disabled={sendingSms}
                            className="absolute right-1.5 top-1/2 -translate-y-1/2 h-6 px-1.5 text-[9px] tracking-widest uppercase font-medium rounded-sm border border-current transition-colors disabled:opacity-30 disabled:cursor-not-allowed hover:text-sage"
                          >
                            {sendingSms ? 'Sending...' : 'Confirm'}
                          </button>
                        </div>
                        {awaitingSmsCode && (
                          <div className="mt-3 space-y-2">
                            <p className="text-[10px] text-charcoal-light/50">
                              Enter the 6-digit code sent to your phone:
                            </p>
                            <div className="flex items-center gap-2 bg-cream-dark border border-gold/20 rounded-sm px-3 py-2.5">
                              <span className="text-sm text-charcoal-light/50 font-mono select-none">
                                code:
                              </span>
                              <div className="flex gap-1.5">
                                {[0, 1, 2, 3, 4, 5].map(i => (
                                  <input
                                    key={i}
                                    ref={el => {
                                      if (el) smsCodeRefs.current[i] = el
                                    }}
                                    type="text"
                                    inputMode="numeric"
                                    maxLength={i === 0 ? 6 : 1}
                                    value={smsCode[i] || ''}
                                    onChange={e => {
                                      const raw = e.target.value.replace(/\D/g, '')
                                      if (!raw) return
                                      if (raw.length > 1) {
                                        const next = raw.split('')
                                        while (next.length < 6) next.push('')
                                        setSmsCode(next)
                                        if (raw.length === 6) handleVerifySmsCode(raw)
                                        else smsCodeRefs.current[raw.length]?.focus()
                                        return
                                      }
                                      const next = [...smsCode]
                                      next[i] = raw
                                      setSmsCode(next)
                                      if (i < 5) smsCodeRefs.current[i + 1]?.focus()
                                      if (i === 5 || (raw && i < 3 && !next[i + 1])) {
                                        const full = next.join('')
                                        if (full.length === 6) handleVerifySmsCode(full)
                                      }
                                    }}
                                    onKeyDown={e => {
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
                                    onPaste={e => {
                                      e.preventDefault()
                                      const pasted = e.clipboardData
                                        .getData('text')
                                        .replace(/\D/g, '')
                                        .slice(0, 6)
                                      const next = pasted.split('')
                                      while (next.length < 6) next.push('')
                                      setSmsCode(next)
                                      if (pasted.length === 6) handleVerifySmsCode(pasted)
                                      else smsCodeRefs.current[pasted.length]?.focus()
                                    }}
                                    className="w-8 h-8 text-center text-sm font-mono bg-cream border border-gold/10 rounded-sm text-charcoal focus:outline-none focus:border-gold/50 transition-colors"
                                    autoComplete={i === 0 ? 'one-time-code' : 'off'}
                                  />
                                ))}
                              </div>
                            </div>
                            <div className="flex items-center justify-between gap-2">
                              {smsResendable ? (
                                <button
                                  type="button"
                                  onClick={handlePhoneConfirm}
                                  disabled={sendingSms}
                                  className="text-[10px] tracking-widest uppercase text-charcoal-light/40 hover:text-charcoal-light transition-colors disabled:opacity-30"
                                >
                                  {sendingSms ? 'Sending...' : 'Resend Code'}
                                </button>
                              ) : (
                                <p className="text-[10px] text-charcoal-light/40">
                                  A code was already sent. Resend in{' '}
                                  {Math.floor(smsResendCountdown / 60)}:
                                  {String(smsResendCountdown % 60).padStart(2, '0')}
                                </p>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Email — always visible when guest has email */}
                    {guestEmail && (
                      <div>
                        <label
                          htmlFor="cf-email"
                          className="block text-xs tracking-widest uppercase text-charcoal-light/50 mb-1.5"
                        >
                          Email Address
                        </label>
                        <div className="relative">
                          <input
                            id="cf-email"
                            type="email"
                            value={maskEmail(guestEmail)}
                            readOnly
                            className="w-full bg-cream-dark border border-gold/20 rounded-sm px-4 py-3 pr-20 text-sm font-mono text-charcoal/70 focus:outline-none focus:border-gold/50 transition-colors cursor-default"
                          />
                          <button
                            type="button"
                            onClick={handleEmailConfirm}
                            disabled={saving}
                            className="absolute right-1.5 top-1/2 -translate-y-1/2 h-6 px-1.5 text-[9px] tracking-widest uppercase font-medium rounded-sm border border-current transition-colors disabled:opacity-30 disabled:cursor-not-allowed hover:text-sage"
                          >
                            {saving ? 'Sending...' : 'Confirm'}
                          </button>
                        </div>
                        {awaitingEmailLink && (
                          <div className="mt-3 space-y-2">
                            <p className="text-[10px] text-charcoal-light/50">
                              Enter the 6-digit code sent to your email:
                            </p>
                            <div className="flex items-center gap-2 bg-cream-dark border border-gold/20 rounded-sm px-3 py-2.5">
                              <span className="text-sm text-charcoal-light/50 font-mono select-none">
                                code:
                              </span>
                              <div className="flex gap-1.5">
                                {[0, 1, 2, 3, 4, 5].map(i => (
                                  <input
                                    key={i}
                                    ref={el => {
                                      if (el) emailCodeRefs.current[i] = el
                                    }}
                                    type="text"
                                    inputMode="numeric"
                                    maxLength={i === 0 ? 6 : 1}
                                    value={emailCode[i] || ''}
                                    onChange={e => {
                                      const raw = e.target.value.replace(/\D/g, '')
                                      if (!raw) return
                                      if (raw.length > 1) {
                                        const next = raw.split('')
                                        while (next.length < 6) next.push('')
                                        setEmailCode(next)
                                        if (raw.length === 6) handleEmailCodeComplete(raw)
                                        else emailCodeRefs.current[raw.length]?.focus()
                                        return
                                      }
                                      const next = [...emailCode]
                                      next[i] = raw
                                      setEmailCode(next)
                                      if (i < 5) emailCodeRefs.current[i + 1]?.focus()
                                      if (i === 5 || (raw && i < 3 && !next[i + 1])) {
                                        const full = next.join('')
                                        if (full.length === 6) handleEmailCodeComplete(full)
                                      }
                                    }}
                                    onKeyDown={e => {
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
                                    onPaste={e => {
                                      e.preventDefault()
                                      const pasted = e.clipboardData
                                        .getData('text')
                                        .replace(/\D/g, '')
                                        .slice(0, 6)
                                      const next = pasted.split('')
                                      while (next.length < 6) next.push('')
                                      setEmailCode(next)
                                      if (pasted.length === 6) handleEmailCodeComplete(pasted)
                                      else emailCodeRefs.current[pasted.length]?.focus()
                                    }}
                                    className="w-8 h-8 text-center text-sm font-mono bg-cream border border-gold/10 rounded-sm text-charcoal focus:outline-none focus:border-gold/50 transition-colors"
                                    autoComplete={i === 0 ? 'one-time-code' : 'off'}
                                  />
                                ))}
                              </div>
                            </div>
                            <div className="flex items-center justify-between gap-2">
                              {emailResendable ? (
                                <button
                                  type="button"
                                  onClick={handleEmailConfirm}
                                  disabled={saving}
                                  className="text-[10px] tracking-widest uppercase text-charcoal-light/40 hover:text-charcoal-light transition-colors disabled:opacity-30"
                                >
                                  {saving ? 'Sending...' : 'Resend Code'}
                                </button>
                              ) : (
                                <p className="text-[10px] text-charcoal-light/40">
                                  A code was already sent. Resend in{' '}
                                  {Math.floor(emailResendCountdown / 60)}:
                                  {String(emailResendCountdown % 60).padStart(2, '0')}
                                </p>
                              )}
                              <details className="text-[10px] text-charcoal-light/50">
                                <summary className="cursor-pointer hover:text-charcoal-light/70 list-none">
                                  Didn't get it?
                                </summary>
                                <p className="mt-1 text-charcoal-light/60 leading-relaxed">
                                  Codes are sent from noreply via EmailJS. If you don't see it,
                                  check your Spam, Junk, or Promotions folder. Mark as &quot;Not
                                  spam&quot; so future codes arrive in your inbox.
                                </p>
                              </details>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {firebaseError && (
                    <div
                      role="alert"
                      className="p-3 bg-gold/10 border border-gold/20 rounded-sm text-xs text-charcoal-light/70"
                    >
                      {firebaseError}
                    </div>
                  )}

                  <div className="flex pt-2">
                    <button
                      type="button"
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
                  <div className="w-16 h-16 bg-gold/10 flex items-center justify-center mx-auto">
                    <img
                      src="/ar-logo.png"
                      alt="Welcome"
                      width={64}
                      height={64}
                      loading="lazy"
                      className="w-full h-full object-contain scale-150"
                    />
                  </div>
                  <p className="font-heading text-2xl text-charcoal">
                    Welcome, {signedIn.firstName}!
                  </p>
                </div>
              )}

              {/* Contact / Settings — phone + email */}
              {(authMode === 'contact' || authMode === 'settings') && user && (
                <Suspense
                  fallback={
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
                  }
                >
                  <ContactForm
                    key={`contact-${user.id}-${content.loaded}`}
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
