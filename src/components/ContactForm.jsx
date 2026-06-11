import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../context/useAuth'
import { stripPhone, guestLabel, fullName } from '../utils/guest'
import weddings from '../data/weddings.json'

function getDraftKey(userId) {
  return `contact_draft_${userId}`
}

function loadDraft(userId) {
  try {
    const raw = sessionStorage.getItem(getDraftKey(userId))
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

function saveDraft(userId, data) {
  try {
    sessionStorage.setItem(getDraftKey(userId), JSON.stringify(data))
  } catch { /* noop */ }
}

function clearDraft(userId) {
  try {
    sessionStorage.removeItem(getDraftKey(userId))
  } catch { /* noop */ }
}

const WEDDING_LABELS = {
  us: { short: 'US Wedding — Bronx', date: weddings.us.date, venue: weddings.us.venue, address: weddings.us.address },
  india: { short: 'India Wedding — Chennai', date: weddings.india.date, venue: weddings.india.venue, address: weddings.india.address },
}

function RsvpCheckbox({ weddingKey, checked, onChange, onOpenDetails }) {
  const info = WEDDING_LABELS[weddingKey]
  const isActive = checked === 'Yes'

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
        isActive ? 'border-gold/20' : 'border-gold/10'
      }`}
      style={{ opacity: isActive ? 1 : 0.55 }}
    >
      <button
        type="button"
        onClick={handleToggle}
        className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
          isActive ? 'bg-gold/10' : 'bg-cream-dark/50 hover:bg-cream-dark'
        }`}
      >
        <div className={`w-5 h-5 rounded-sm border-2 flex items-center justify-center shrink-0 transition-colors ${
          isActive ? 'bg-gold border-gold' : 'border-gold/30 bg-cream'
        }`}>
          {isActive && (
            <motion.svg
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 500, damping: 15 }}
              className="w-3 h-3 text-cream" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}
            >
              <path d="M5 13l4 4L19 7" />
            </motion.svg>
          )}
        </div>
        <span className={`text-sm font-medium transition-colors ${
          isActive ? 'text-charcoal' : 'text-charcoal-light/50'
        }`}>
          {info.short}
        </span>
        {checked && (
          <span className={`text-[10px] tracking-widest uppercase ml-auto ${
            isActive ? 'text-gold-dark' : 'text-charcoal-light/40'
          }`}>
            {checked}
          </span>
        )}
      </button>

      <div className="px-4 pb-4 pt-3 border-t border-gold/10">
        <div className="space-y-1.5" style={{ opacity: isActive ? 1 : 0.5 }}>
          <p className="text-xs text-charcoal-light/70">{info.date}</p>
          <p className="text-xs text-charcoal-light/70">{info.venue}</p>
          <p className="text-xs text-charcoal-light/50">{info.address}</p>
          <button
            type="button"
            onClick={() => onOpenDetails(weddingKey)}
            className="text-[10px] tracking-widest uppercase text-gold-dark hover:text-gold transition-colors pt-1"
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

  const guestFromContent = useMemo(() => {
    if (!user?.id || !content?.guests?.length) return null
    return content.guests.find(g => g.id === user.id) || null
  }, [user?.id, content?.guests])

  const draft = useMemo(() => loadDraft(user?.id), [user?.id])

  const originalPhone = stripPhone(user?.phone || guestFromContent?.phone || '')
  const originalEmail = user?.email || guestFromContent?.email || ''
  const originalAddress = user?.address || guestFromContent?.address || ''
  const originalDietaryPreferences = user?.dietaryPreferences || guestFromContent?.dietaryPreferences || ''
  const origRsvpUs = user?.rsvpUs || guestFromContent?.rsvpUs || ''
  const origRsvpIndia = user?.rsvpIndia || guestFromContent?.rsvpIndia || ''
  const originalRsvpUsRef = useRef(origRsvpUs)
  const originalRsvpIndiaRef = useRef(origRsvpIndia)

  const [phone, setPhone] = useState(() => draft?.phone ?? originalPhone)
  const [email, setEmail] = useState(() => draft?.email ?? originalEmail)
  const [address, setAddress] = useState(() => draft?.address ?? originalAddress)
  const [dietaryPreferences, setDietaryPreferences] = useState(() => draft?.dietaryPreferences ?? originalDietaryPreferences)
  const [rsvpUs, setRsvpUs] = useState(() => draft?.rsvpUs ?? origRsvpUs)
  const [rsvpIndia, setRsvpIndia] = useState(() => draft?.rsvpIndia ?? origRsvpIndia)

  useEffect(() => {
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
  }, [guestFromContent?.phone, guestFromContent?.email, guestFromContent?.rsvpUs, guestFromContent?.rsvpIndia])

  const [phoneFocused, setPhoneFocused] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [saveStatus, setSaveStatus] = useState(null)
  const inactivityRef = useRef(null)

  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  const validEmail = EMAIL_RE.test(email.trim())
  const validPhone = stripPhone(phone).length >= 10

  const phoneChanged = phone !== originalPhone
  const emailChanged = email !== originalEmail
  const contactChanged = phoneChanged || emailChanged || address !== originalAddress || dietaryPreferences !== originalDietaryPreferences
  const rsvpChanged = rsvpUs !== originalRsvpUsRef.current || rsvpIndia !== originalRsvpIndiaRef.current
  const hasChanges = contactChanged || rsvpChanged

  const weddingsList = useMemo(() => user?.weddings || [], [user?.weddings])

  useEffect(() => {
    if (!user?.id) return
    saveDraft(user.id, { phone, email, address, dietaryPreferences, rsvpUs, rsvpIndia })
  }, [user?.id, phone, email, address, dietaryPreferences, rsvpUs, rsvpIndia])

  const autoSave = useCallback(async () => {
    if (!hasChanges || saving) return
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
      originalRsvpUsRef.current = rsvpUs
      originalRsvpIndiaRef.current = rsvpIndia
      setSaveStatus('saved')
      clearDraft(user?.id)
      setTimeout(() => setSaveStatus(null), 2500)
    } catch {
      setSaveStatus('error')
      setTimeout(() => setSaveStatus(null), 3000)
    }
  }, [phone, email, address, dietaryPreferences, rsvpUs, rsvpIndia, hasChanges, saving, updateContact, user])

  useEffect(() => {
    if (!hasChanges) {
      if (inactivityRef.current) clearTimeout(inactivityRef.current)
      return
    }
    if (inactivityRef.current) clearTimeout(inactivityRef.current)
    inactivityRef.current = setTimeout(autoSave, 60000)
    return () => { if (inactivityRef.current) clearTimeout(inactivityRef.current) }
  }, [phone, email, address, dietaryPreferences, rsvpUs, rsvpIndia, hasChanges, autoSave])

  useEffect(() => {
    const handler = () => {
      if (document.visibilityState === 'hidden' && hasChanges) autoSave()
    }
    document.addEventListener('visibilitychange', handler)
    return () => document.removeEventListener('visibilitychange', handler)
  }, [hasChanges, autoSave])

  const handlePhoneChange = useCallback((raw) => {
    setPhone(raw.replace(/\D/g, ''))
  }, [])

  const handleSaveField = useCallback(async () => {
    if (saving) return
    setSaving(true)
    await updateContact({ phone: stripPhone(phone), email: email.trim(), address, dietaryPreferences })
    setSaving(false)
    setShowConfirmation(true)
    setTimeout(() => setShowConfirmation(false), 2000)
  }, [phone, email, address, dietaryPreferences, updateContact, saving])

  const handleSave = useCallback(async () => {
    if (saveStatus === 'saving') return
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
      originalRsvpUsRef.current = rsvpUs
      originalRsvpIndiaRef.current = rsvpIndia
      setSaveStatus('saved')
      clearDraft(user?.id)
      setTimeout(() => setSaveStatus(null), 2500)
    } catch {
      setSaveStatus('error')
      setTimeout(() => setSaveStatus(null), 3000)
    }
  }, [phone, email, address, dietaryPreferences, rsvpUs, rsvpIndia, updateContact, saveStatus, user])

  const handleMessageClick = useCallback(async () => {
    setSaveStatus('saving')
    try {
      await updateContact({ phone: stripPhone(phone), email: email.trim(), address, dietaryPreferences })
      const msg = `Hi Abhay and Rebecca, FYI, here is my updated RSVP info:\n\nPostal Address:\n${address || '(not provided)'}\n\nDietary Preferences:\n${dietaryPreferences || '(not provided)'}`
      window.dispatchEvent(new CustomEvent('pending-contact-msg', { detail: { message: msg, reason: 'rsvp' } }))
    } catch {
      setSaveStatus('error')
      setTimeout(() => setSaveStatus(null), 3000)
    }
  }, [phone, email, address, dietaryPreferences, updateContact, setShowAuthModal])

  const handleClose = useCallback(() => {
    clearDraft(user?.id)
    setShowAuthModal(false)
  }, [user?.id, setShowAuthModal])

  const handleOpenDetails = useCallback((w) => {
    if (switchWedding) switchWedding(w)
    setShowAuthModal(false)
    setTimeout(() => {
      const el = document.getElementById('details')
      if (el) el.scrollIntoView({ behavior: 'smooth' })
    }, 300)
  }, [switchWedding, setShowAuthModal])



  return (
    <div className="space-y-5">
      <div className="p-4 bg-cream-dark border border-gold/10 rounded-sm">
        <p className="font-heading text-lg text-charcoal">{fullName(user)}</p>
        <p className="text-xs text-charcoal-light/50 mt-1">{guestLabel(user, sideName)}</p>
      </div>

      {weddingsList.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs tracking-widest uppercase text-charcoal-light/50">RSVP</p>
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
              value={!phoneFocused && phone === originalPhone ? `(${phone.slice(0,3)}) ${phone.slice(3,6)}-${phone.slice(6,10)}` : phone}
              onChange={(e) => handlePhoneChange(e.target.value)}
              onFocus={() => setPhoneFocused(true)}
              onBlur={() => setPhoneFocused(false)}
              disabled={saving}
              className="w-full bg-cream-dark border border-gold/20 rounded-sm px-4 py-3 pr-20 text-sm text-charcoal placeholder:text-charcoal-light/30 focus:outline-none focus:border-gold/50 transition-colors disabled:opacity-30"
              placeholder="5551234567"
            />
            <AnimatePresence>
              <motion.button
                key="phone-save"
                onClick={handleSaveField}
                disabled={!phoneChanged || !validPhone || saving}
                initial={{ opacity: 0.3 }}
                animate={{ opacity: phoneChanged && validPhone && !saving ? 1 : 0.3 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 h-6 px-1.5 text-[9px] tracking-widest uppercase font-medium rounded-sm border border-current transition-colors disabled:cursor-not-allowed hover:text-sage"
              >
                {saving ? 'Saving...' : 'Save'}
              </motion.button>
            </AnimatePresence>
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
              className="w-full bg-cream-dark border border-gold/20 rounded-sm px-4 py-3 pr-20 text-sm text-charcoal placeholder:text-charcoal-light/30 focus:outline-none focus:border-gold/50 transition-colors"
              placeholder="you@email.com"
            />
            <AnimatePresence>
              <motion.button
                key="email-save"
                onClick={handleSaveField}
                disabled={!emailChanged || !validEmail || saving}
                initial={{ opacity: 0.3 }}
                animate={{ opacity: emailChanged && validEmail && !saving ? 1 : 0.3 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 h-6 px-1.5 text-[9px] tracking-widest uppercase font-medium rounded-sm border border-current transition-colors disabled:cursor-not-allowed hover:text-sage"
              >
                {showConfirmation && saving ? 'Saving...' : saving ? 'Saving...' : 'Save'}
              </motion.button>
            </AnimatePresence>
          </div>
        </div>

        <div>
          <label className="block text-xs tracking-widest uppercase text-charcoal-light/50 mb-1.5">
            Mailing Address
          </label>
          <div className="relative">
            <textarea
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              rows={2}
              maxLength={500}
              className="w-full bg-cream-dark border border-gold/20 rounded-sm px-4 py-3 text-sm text-charcoal placeholder:text-charcoal-light/30 focus:outline-none focus:border-gold/50 transition-colors resize-none"
              placeholder="123 Main St, City, State ZIP"
            />
            <span className="absolute bottom-2 right-3 text-[10px] text-charcoal-light/30">
              {address.length}/500
            </span>
          </div>
        </div>

        <div>
          <label className="block text-xs tracking-widest uppercase text-charcoal-light/50 mb-1.5">
            Dietary Preferences
          </label>
          <div className="relative">
            <textarea
              value={dietaryPreferences}
              onChange={(e) => setDietaryPreferences(e.target.value)}
              rows={2}
              maxLength={500}
              className="w-full bg-cream-dark border border-gold/20 rounded-sm px-4 py-3 text-sm text-charcoal placeholder:text-charcoal-light/30 focus:outline-none focus:border-gold/50 transition-colors resize-none"
              placeholder="Any dietary restrictions or preferences"
            />
            <span className="absolute bottom-2 right-3 text-[10px] text-charcoal-light/30">
              {dietaryPreferences.length}/500
            </span>
          </div>
        </div>

        {saveStatus === 'saved' && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="p-3 bg-sage/10 border border-sage/20 rounded-sm text-xs text-sage text-center" aria-live="polite"
          >
            Saved successfully!
          </motion.div>
        )}
        {saveStatus === 'error' && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="p-3 bg-red/10 border border-red/20 rounded-sm text-xs text-red text-center" aria-live="polite"
          >
            Failed to save. Please try again.
          </motion.div>
        )}

        {authMode === 'settings' && (
          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={handleClose}
              className="flex-1 py-2.5 border border-gold/20 rounded-sm text-xs tracking-widest uppercase text-charcoal hover:text-charcoal-light hover:bg-cream-dark transition-colors"
            >
              Close
            </button>
            <button
              onClick={handleSave}
              disabled={!hasChanges || saveStatus === 'saving'}
              className="flex-1 py-2.5 border border-gold/20 rounded-sm text-xs tracking-widest uppercase transition-colors disabled:opacity-30"
              style={{
                color: hasChanges ? 'var(--color-charcoal)' : undefined,
                borderColor: hasChanges ? 'var(--color-gold)' : undefined,
                backgroundColor: hasChanges ? 'var(--color-cream-dark)' : undefined,
              }}
            >
              {saveStatus === 'saving' ? 'Saving...' : 'Save'}
            </button>
            <button
              onClick={handleMessageClick}
              className="flex-1 py-2.5 border border-gold/20 rounded-sm text-xs tracking-widest uppercase transition-colors"
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
