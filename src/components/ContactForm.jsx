import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../context/useAuth'
import { stripPhone, guestLabel, fullName } from '../utils/guest'
import { sendRsvpConfirmation } from '../utils/rsvp-confirmation'
import weddings from '../data/weddings.json'
import PlusOneEditor from './PlusOneEditor'

function getDraftKey(userId) {
  return `contact_draft_${userId}`
}

function loadDraft(userId) {
  try {
    const raw = sessionStorage.getItem(getDraftKey(userId))
    return raw ? JSON.parse(raw) : null
  } catch (err) {
    console.error('Failed to load draft from sessionStorage:', err)
    return null
  }
}

function saveDraft(userId, data) {
  try {
    sessionStorage.setItem(getDraftKey(userId), JSON.stringify(data))
  } catch (err) {
    console.error('Failed to save draft to sessionStorage:', err)
  }
}

function clearDraft(userId) {
  try {
    sessionStorage.removeItem(getDraftKey(userId))
  } catch (err) {
    console.error('Failed to clear draft from sessionStorage:', err)
  }
}

const WEDDING_LABELS = {
  us: {
    short: 'US Wedding — Bronx',
    date: weddings.us.date,
    venue: weddings.us.venue,
    address: weddings.us.address,
  },
  india: {
    short: 'India Wedding — Chennai',
    date: weddings.india.date,
    venue: weddings.india.venue,
    address: weddings.india.address,
  },
}

function RsvpCheckbox({ weddingKey, checked, onChange, onOpenDetails }) {
  const info = WEDDING_LABELS[weddingKey]
  const isActive = checked === 'Yes'
  const hasRsvp = checked && checked !== ''

  const handleToggle = useCallback(() => {
    let next
    if (!checked) {
      next = 'Yes'
    } else if (checked === 'Yes') {
      next = 'No'
    } else {
      next = 'Yes'
    }
    onChange(next)
  }, [checked, onChange])

  return (
    <motion.div
      layout
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      className={`rounded-sm overflow-hidden border transition-all ${
        isActive ? 'border-sage/25' : 'border-gold/10'
      }`}
    >
      <button
        type="button"
        onClick={handleToggle}
        aria-pressed={isActive}
        className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors focus:outline-none focus:ring-2 focus:ring-sage/25 ${
          isActive
            ? 'bg-gold/10'
            : hasRsvp
              ? 'bg-cream-dark/50'
              : 'bg-cream-dark/50 hover:bg-cream-dark'
        }`}
      >
        <div
          className={`w-5 h-5 rounded-sm border-2 flex items-center justify-center shrink-0 transition-colors ${
            isActive
              ? 'bg-gold border-gold text-cream'
              : 'border-charcoal-light/30 text-transparent'
          }`}
        >
          {isActive && (
            <motion.svg
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 500, damping: 15 }}
              className="w-3 h-3 text-cream"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={3}
            >
              <path d="M5 13l4 4L19 7" />
            </motion.svg>
          )}
        </div>
        <span
          className={`text-sm font-medium transition-colors ${
            isActive ? 'text-charcoal' : 'text-charcoal-light/70'
          }`}
        >
          {info.short}
        </span>
        {checked && (
          <span
            className={`text-[10px] tracking-widest uppercase ml-auto ${
              isActive ? 'text-gold-dark' : 'text-charcoal-light/65'
            }`}
          >
            {checked}
          </span>
        )}
      </button>

      <div className="px-4 pb-4 pt-3 border-t border-gold/10">
        <div className="space-y-1.5">
          <p className="text-xs text-charcoal-light">{info.date}</p>
          <p className="text-xs text-charcoal-light">{info.venue}</p>
          <p className="text-xs text-charcoal-light/70">{info.address}</p>
          <button
            type="button"
            onClick={() => onOpenDetails(weddingKey)}
            className="text-[10px] tracking-widest uppercase text-gold-dark hover:text-gold transition-colors pt-1 focus:outline-none focus:ring-2 focus:ring-sage/25 rounded-sm"
          >
            View Event Details
          </button>
        </div>
      </div>
    </motion.div>
  )
}

export default function ContactForm({ user, authMode, updateContact, sideName }) {
  const { setShowAuthModal, content, switchWedding } = useAuth()

  // eslint-disable-next-line react-hooks/preserve-manual-memoization
  const guestFromContent = useMemo(() => {
    if (!user?.id || !content?.guests?.length) return null
    return content.guests.find(g => g.id === user.id) || null
  }, [user?.id, content?.guests])

  const draft = useMemo(() => loadDraft(user?.id), [user?.id])

  const originalPhone = stripPhone(user?.phone || guestFromContent?.phone || '')
  const originalEmail = user?.email || guestFromContent?.email || ''
  const originalAddress = user?.address || guestFromContent?.address || ''
  const originalDietaryPreferences =
    user?.dietaryPreferences || guestFromContent?.dietaryPreferences || ''
  const origRsvpUs = user?.rsvpUs || guestFromContent?.rsvpUs || ''
  const origRsvpIndia = user?.rsvpIndia || guestFromContent?.rsvpIndia || ''
  const [originalRsvpUs, setOriginalRsvpUs] = useState(origRsvpUs)
  const [originalRsvpIndia, setOriginalRsvpIndia] = useState(origRsvpIndia)

  const [phone, setPhone] = useState(() => draft?.phone ?? originalPhone)
  const [email, setEmail] = useState(() => draft?.email ?? originalEmail)
  const [address, setAddress] = useState(() => draft?.address ?? originalAddress)
  const [dietaryPreferences, setDietaryPreferences] = useState(
    () => draft?.dietaryPreferences ?? originalDietaryPreferences,
  )
  const [rsvpUs, setRsvpUs] = useState(() => draft?.rsvpUs ?? origRsvpUs)
  const [rsvpIndia, setRsvpIndia] = useState(() => draft?.rsvpIndia ?? origRsvpIndia)

  useEffect(() => {
    const id = setTimeout(() => {
      if (!phone && guestFromContent?.phone) {
        setPhone(stripPhone(guestFromContent.phone))
      }
      if (!email && guestFromContent?.email) {
        setEmail(guestFromContent.email)
      }
      if (guestFromContent?.rsvpUs && !draft?.rsvpUs) {
        setRsvpUs(guestFromContent.rsvpUs)
      }
      if (guestFromContent?.rsvpIndia && !draft?.rsvpIndia) {
        setRsvpIndia(guestFromContent.rsvpIndia)
      }
    }, 0)
    return () => clearTimeout(id)
  }, [
    phone,
    email,
    draft?.rsvpUs,
    draft?.rsvpIndia,
    guestFromContent?.phone,
    guestFromContent?.email,
    guestFromContent?.rsvpUs,
    guestFromContent?.rsvpIndia,
  ])

  const [phoneFocused, setPhoneFocused] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [saveStatus, setSaveStatus] = useState(null)
  const [saveError, setSaveError] = useState(null)
  const [plusOneAnyChanges, setPlusOneAnyChanges] = useState(false)
  const inactivityRef = useRef(null)
  const plusOneSaveAllRef = useRef(null)

  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  const validEmail = EMAIL_RE.test(email.trim())
  const validPhone = stripPhone(phone).length >= 10

  const phoneChanged = phone !== originalPhone
  const emailChanged = email !== originalEmail
  const contactChanged =
    phoneChanged ||
    emailChanged ||
    address !== originalAddress ||
    dietaryPreferences !== originalDietaryPreferences
  const rsvpChanged = rsvpUs !== originalRsvpUs || rsvpIndia !== originalRsvpIndia
  const hasChanges = contactChanged || rsvpChanged || plusOneAnyChanges

  const weddingsList = useMemo(() => user?.weddings || [], [user?.weddings])

  useEffect(() => {
    if (!user?.id) return
    saveDraft(user.id, { phone, email, address, dietaryPreferences, rsvpUs, rsvpIndia })
  }, [user?.id, phone, email, address, dietaryPreferences, rsvpUs, rsvpIndia])

  const autoSave = useCallback(async () => {
    if (!hasChanges || saving) return
    const rsvpChanged = rsvpUs !== originalRsvpUs || rsvpIndia !== originalRsvpIndia
    setSaveStatus('saving')
    try {
      await updateContact({
        phone: stripPhone(phone),
        email: email.trim(),
        address: address || '',
        dietaryPreferences: dietaryPreferences || '',
        rsvpUs,
        rsvpIndia,
      })
      setOriginalRsvpUs(rsvpUs)
      setOriginalRsvpIndia(rsvpIndia)
      setSaveStatus('saved')
      clearDraft(user?.id)
      setTimeout(() => setSaveStatus(null), 2500)
      if (rsvpChanged && user?.email) {
        sendRsvpConfirmation()
      }
    } catch (err) {
      console.error('Auto-save failed:', err)
      setSaveStatus('error')
      setTimeout(() => setSaveStatus(null), 3000)
    } finally {
      setSaveStatus(prev => (prev === 'saving' ? null : prev))
    }
  }, [
    phone,
    email,
    address,
    dietaryPreferences,
    rsvpUs,
    rsvpIndia,
    originalRsvpUs,
    originalRsvpIndia,
    hasChanges,
    saving,
    updateContact,
    user,
  ])

  useEffect(() => {
    if (!hasChanges) {
      if (inactivityRef.current) clearTimeout(inactivityRef.current)
      return
    }
    if (inactivityRef.current) clearTimeout(inactivityRef.current)
    inactivityRef.current = setTimeout(autoSave, 60000)
    return () => {
      if (inactivityRef.current) clearTimeout(inactivityRef.current)
    }
  }, [phone, email, address, dietaryPreferences, rsvpUs, rsvpIndia, hasChanges, autoSave])

  useEffect(() => {
    const handler = () => {
      if (document.visibilityState === 'hidden' && hasChanges) autoSave()
    }
    document.addEventListener('visibilitychange', handler)
    return () => document.removeEventListener('visibilitychange', handler)
  }, [hasChanges, autoSave])

  const handlePhoneChange = useCallback(raw => {
    setPhone(raw.replace(/\D/g, ''))
  }, [])

  const handleSaveField = useCallback(async () => {
    if (saving) return
    setSaving(true)
    await updateContact({
      phone: stripPhone(phone),
      email: email.trim(),
      address,
      dietaryPreferences,
    })
    setSaving(false)
    setShowConfirmation(true)
    setTimeout(() => setShowConfirmation(false), 2000)
  }, [phone, email, address, dietaryPreferences, updateContact, saving])

  const handleSave = useCallback(async () => {
    if (saveStatus === 'saving') return
    const hadRsvpChange = rsvpUs !== originalRsvpUs || rsvpIndia !== originalRsvpIndia
    setSaveError(null)
    setSaveStatus('saving')
    try {
      await updateContact({
        phone: stripPhone(phone),
        email: email.trim(),
        address: address || '',
        dietaryPreferences: dietaryPreferences || '',
        rsvpUs,
        rsvpIndia,
      })
      if (plusOneSaveAllRef.current) {
        await plusOneSaveAllRef.current()
      }
      setOriginalRsvpUs(rsvpUs)
      setOriginalRsvpIndia(rsvpIndia)
      setSaveStatus(hadRsvpChange ? 'rsvp-saved' : 'saved')
      clearDraft(user?.id)
      setTimeout(() => setSaveStatus(null), 4000)
      if (hadRsvpChange && user?.email) {
        sendRsvpConfirmation()
      }
    } catch (err) {
      console.error('Save failed:', err)
      const msg =
        err.status === 401
          ? 'Your session expired. Please close this and sign in again.'
          : err.message || 'Save failed. Please try again.'
      setSaveError(msg)
      setSaveStatus('error')
      setTimeout(() => setSaveStatus(null), 5000)
    } finally {
      setSaveStatus(prev => (prev === 'saving' ? null : prev))
    }
  }, [
    phone,
    email,
    address,
    dietaryPreferences,
    rsvpUs,
    rsvpIndia,
    originalRsvpUs,
    originalRsvpIndia,
    updateContact,
    saveStatus,
    user,
  ])

  const handleMessageClick = useCallback(() => {
    const msg = `Hi Abhay and Rebecca, FYI, here is my updated RSVP info:\n\nPostal Address:\n${address || '(not provided)'}\n\nDietary Preferences:\n${dietaryPreferences || '(not provided)'}`
    window.dispatchEvent(
      new CustomEvent('pending-contact-msg', { detail: { message: msg, reason: 'rsvp' } }),
    )
  }, [address, dietaryPreferences])

  const handleClose = useCallback(() => {
    clearDraft(user?.id)
    setShowAuthModal(false)
  }, [user?.id, setShowAuthModal])

  const handleOpenDetails = useCallback(
    w => {
      if (switchWedding) switchWedding(w)
      setShowAuthModal(false)
      requestAnimationFrame(() => {
        const el = document.getElementById('details')
        if (el) el.scrollIntoView({ behavior: 'smooth' })
      })
    },
    [switchWedding, setShowAuthModal],
  )

  return (
    <div className="space-y-5">
      <div className="p-4 bg-cream-dark border border-gold/10 rounded-sm">
        <p className="font-heading text-lg text-charcoal">{fullName(user)}</p>
        <p className="text-xs text-charcoal-light/70 mt-1">{guestLabel(user, sideName)}</p>
      </div>

      {weddingsList.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs tracking-widest uppercase text-charcoal-light font-medium">RSVP</p>
          {weddingsList.includes('us') && (
            <RsvpCheckbox
              weddingKey="us"
              checked={rsvpUs}
              onChange={setRsvpUs}
              onOpenDetails={handleOpenDetails}
            />
          )}
          {weddingsList.includes('india') && (
            <RsvpCheckbox
              weddingKey="india"
              checked={rsvpIndia}
              onChange={setRsvpIndia}
              onOpenDetails={handleOpenDetails}
            />
          )}
        </div>
      )}

      {authMode === 'settings' && user?.plusOne === 'Allowed+1' && (
        <PlusOneEditor
          user={user}
          guests={content?.guests || []}
          onSaveAll={fn => {
            plusOneSaveAllRef.current = fn
          }}
          onAnyChangesChange={setPlusOneAnyChanges}
        />
      )}

      <p className="text-sm text-charcoal-light leading-relaxed">
        {authMode === 'contact'
          ? 'Add your contact info so we can send you wedding updates.'
          : 'Update your contact info below.'}
      </p>

      <div>
        <label
          htmlFor="cf-phone"
          className="block text-xs tracking-widest uppercase text-charcoal-light font-medium mb-1.5"
        >
          Phone Number
        </label>
        <div className="relative">
          <input
            id="cf-phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            value={
              !phoneFocused && phone === originalPhone
                ? `(${phone.slice(0, 3)}) ${phone.slice(3, 6)}-${phone.slice(6, 10)}`
                : phone
            }
            onChange={e => handlePhoneChange(e.target.value)}
            onFocus={() => setPhoneFocused(true)}
            onBlur={() => setPhoneFocused(false)}
            disabled={saving}
            aria-invalid={phone.length > 0 && !validPhone}
            aria-describedby="cf-phone-hint"
            className="w-full bg-cream-dark border border-sage/25 rounded-sm px-4 py-3 pr-20 text-base text-charcoal placeholder:text-charcoal-light/50 focus:outline-none focus:border-sage focus:ring-2 focus:ring-sage/25 transition-colors disabled:opacity-30 aria-[invalid=true]:border-red/50"
            placeholder="5551234567"
          />
          <span id="cf-phone-hint" className="sr-only">
            10-digit US phone number
          </span>
          <AnimatePresence>
            <motion.button
              type="button"
              key="phone-save"
              onClick={handleSaveField}
              disabled={!phoneChanged || !validPhone || saving}
              aria-label="Save phone number"
              initial={{ opacity: 0.5 }}
              animate={{ opacity: phoneChanged && validPhone && !saving ? 1 : 0.5 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 h-6 px-1.5 text-[9px] tracking-widest uppercase font-medium rounded-sm border border-current transition-colors disabled:cursor-not-allowed hover:text-sage"
            >
              {saving ? 'Saving...' : 'Save'}
            </motion.button>
          </AnimatePresence>
        </div>
      </div>

      <div>
        <label
          htmlFor="cf-email"
          className="block text-xs tracking-widest uppercase text-charcoal-light font-medium mb-1.5"
        >
          Email Address
        </label>
        <div className="relative">
          <input
            id="cf-email"
            type="email"
            inputMode="email"
            autoComplete="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            aria-invalid={email.length > 0 && !validEmail}
            aria-describedby="cf-email-hint"
            className="w-full bg-cream-dark border border-sage/25 rounded-sm px-4 py-3 pr-20 text-base text-charcoal placeholder:text-charcoal-light/50 focus:outline-none focus:border-sage focus:ring-2 focus:ring-sage/25 transition-colors aria-[invalid=true]:border-red/50"
            placeholder="you@email.com"
          />
          <span id="cf-email-hint" className="sr-only">
            Your email address
          </span>
          <AnimatePresence>
            <motion.button
              type="button"
              key="email-save"
              onClick={handleSaveField}
              disabled={!emailChanged || !validEmail || saving}
              aria-label="Save email address"
              initial={{ opacity: 0.5 }}
              animate={{ opacity: emailChanged && validEmail && !saving ? 1 : 0.5 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 h-6 px-1.5 text-[9px] tracking-widest uppercase font-medium rounded-sm border border-current transition-colors disabled:cursor-not-allowed hover:text-sage"
            >
              {showConfirmation && saving ? 'Saving...' : saving ? 'Saving...' : 'Save'}
            </motion.button>
          </AnimatePresence>
        </div>
      </div>

      <div>
        <label
          htmlFor="cf-address"
          className="block text-xs tracking-widest uppercase text-charcoal-light font-medium mb-1.5"
        >
          Mailing Address
        </label>
        <div className="relative">
          <textarea
            id="cf-address"
            value={address}
            onChange={e => setAddress(e.target.value)}
            rows={2}
            maxLength={500}
            aria-describedby="cf-address-counter"
            className="w-full bg-cream-dark border border-sage/25 rounded-sm px-4 py-3 text-sm text-charcoal placeholder:text-charcoal-light/50 focus:outline-none focus:border-sage focus:ring-2 focus:ring-sage/25 transition-colors resize-none"
            placeholder="123 Main St, City, State ZIP"
          />
          <span
            id="cf-address-counter"
            aria-live="polite"
            className="absolute bottom-2 right-3 text-[10px] text-charcoal-light/60 font-medium"
          >
            {address.length}/500
          </span>
        </div>
      </div>

      <div>
        <label
          htmlFor="cf-diet"
          className="block text-xs tracking-widest uppercase text-charcoal-light font-medium mb-1.5"
        >
          Dietary Preferences
        </label>
        <div className="relative">
          <textarea
            id="cf-diet"
            value={dietaryPreferences}
            onChange={e => setDietaryPreferences(e.target.value)}
            rows={2}
            maxLength={500}
            aria-describedby="cf-diet-counter"
            className="w-full bg-cream-dark border border-sage/25 rounded-sm px-4 py-3 text-sm text-charcoal placeholder:text-charcoal-light/50 focus:outline-none focus:border-sage focus:ring-2 focus:ring-sage/25 transition-colors resize-none"
            placeholder="Any dietary restrictions or preferences"
          />
          <span
            id="cf-diet-counter"
            aria-live="polite"
            className="absolute bottom-2 right-3 text-[10px] text-charcoal-light/60 font-medium"
          >
            {dietaryPreferences.length}/500
          </span>
        </div>
      </div>

      {(saveStatus === 'saved' || saveStatus === 'rsvp-saved') && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          className="p-3 bg-sage/10 border border-sage/20 rounded-sm text-xs text-sage text-center"
          aria-live="polite"
        >
          {saveStatus === 'rsvp-saved'
            ? 'Thank you! Your RSVP has been saved.'
            : 'Saved successfully!'}
          {saveStatus === 'rsvp-saved' && (
            <div className="mt-3">
              <a
                href="/api/calendar-ics"
                download
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-gold/10 border border-gold/30 rounded-sm text-[10px] tracking-widest uppercase text-gold-dark hover:bg-gold/20 transition-colors"
              >
                <svg
                  className="w-3.5 h-3.5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
                Download All Events to Calendar
              </a>
            </div>
          )}
        </motion.div>
      )}
      {saveStatus === 'error' && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          role="alert"
          className="p-3 bg-red/10 border border-red/30 rounded-sm text-xs text-red text-center"
          aria-live="assertive"
        >
          <p className="font-semibold">Failed to save.</p>
          {saveError && <p className="mt-1 text-red">{saveError}</p>}
          <button
            type="button"
            onClick={() => handleSave()}
            className="mt-2 text-[10px] tracking-widest uppercase underline underline-offset-2 hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-red/40 rounded-sm"
          >
            Retry
          </button>
        </motion.div>
      )}

      {authMode === 'settings' && (
        <div className="flex items-center gap-3 pt-2">
          <button
            type="button"
            onClick={handleClose}
            className="flex-1 py-2.5 border border-sage/25 rounded-sm text-xs tracking-widest uppercase text-charcoal hover:text-charcoal-light hover:bg-cream-dark transition-colors"
          >
            Close
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!hasChanges || saveStatus === 'saving'}
            className="flex-1 py-2.5 border border-sage/25 rounded-sm text-xs tracking-widest uppercase transition-colors disabled:opacity-30"
            style={{
              color: hasChanges ? 'var(--color-charcoal)' : undefined,
              borderColor: hasChanges ? 'var(--color-gold)' : undefined,
              backgroundColor: hasChanges ? 'var(--color-cream-dark)' : undefined,
            }}
          >
            {saveStatus === 'saving' ? 'Saving...' : 'Save'}
          </button>
          <button
            type="button"
            onClick={handleMessageClick}
            className="flex-1 py-2.5 border border-sage/25 rounded-sm text-xs tracking-widest uppercase transition-colors"
            style={{
              color: hasChanges ? 'var(--color-charcoal)' : undefined,
              borderColor: hasChanges ? 'var(--color-gold)' : undefined,
              backgroundColor: hasChanges ? 'var(--color-cream-dark)' : undefined,
            }}
          >
            {saveStatus === 'saving' ? 'Saving...' : 'Message'}
          </button>
        </div>
      )}
    </div>
  )
}
