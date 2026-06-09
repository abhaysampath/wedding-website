import { useState, useCallback, useMemo, useEffect } from 'react'
import { useAuth } from '../context/useAuth'
import { stripPhone, guestLabel } from '../utils/guest'

export default function ContactForm({ user, authMode, updateContact, sideName }) {
  const { setShowAuthModal, content } = useAuth()

  const guestFromContent = useMemo(() => {
    if (!user?.id || !content?.guests?.length) return null
    return content.guests.find(g => g.id === user.id) || null
  }, [user?.id, content?.guests])

  const [phone, setPhone] = useState(() => {
    return stripPhone(user?.phone || guestFromContent?.phone || '')
  })
  const [email, setEmail] = useState(() => {
    return user?.email || guestFromContent?.email || ''
  })
  const [address, setAddress] = useState(user?.address || '')
  const [dietaryPreferences, setDietaryPreferences] = useState(user?.dietaryPreferences || '')

  useEffect(() => {
    if (!phone && guestFromContent?.phone) {
      setPhone(stripPhone(guestFromContent.phone))
    }
    if (!email && guestFromContent?.email) {
      setEmail(guestFromContent.email)
    }
  }, [guestFromContent?.phone, guestFromContent?.email])

  const originalPhone = stripPhone(user?.phone || guestFromContent?.phone || '')
  const originalEmail = user?.email || guestFromContent?.email || ''
  const originalAddress = user?.address || guestFromContent?.address || ''
  const originalDietaryPreferences = user?.dietaryPreferences || guestFromContent?.dietaryPreferences || ''
  const [phoneFocused, setPhoneFocused] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [saveStatus, setSaveStatus] = useState(null)

  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  const validEmail = EMAIL_RE.test(email.trim())
  const validPhone = stripPhone(phone).length >= 10
  const hasChanges = phone !== originalPhone || email !== originalEmail || address !== originalAddress || dietaryPreferences !== originalDietaryPreferences

  const handlePhoneChange = useCallback((raw) => {
    setPhone(raw.replace(/\D/g, ''))
  }, [])

  const handleConfirmField = useCallback(async () => {
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
      await updateContact({ phone: stripPhone(phone), email: email.trim(), address: address || '', dietaryPreferences: dietaryPreferences || '' })
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus(null), 2500)
    } catch {
      setSaveStatus('error')
      setTimeout(() => setSaveStatus(null), 3000)
    }
  }, [phone, email, address, dietaryPreferences, updateContact, saveStatus])

  const handleMessageClick = useCallback(async () => {
    setSaveStatus('saving')
    try {
      await updateContact({ phone: stripPhone(phone), email: email.trim(), address, dietaryPreferences })
      const msg = `Hi Abhay and Rebecca, FYI, here is my updated RSVP info:\n\nPostal Address:\n${address || '(not provided)'}\n\nDietary Preferences:\n${dietaryPreferences || '(not provided)'}`
      window.dispatchEvent(new CustomEvent('pending-contact-msg', { detail: { message: msg, reason: 'rsvp' } }))
      setShowAuthModal(false)
      setTimeout(() => {
        const el = document.getElementById('contact')
        if (el) el.scrollIntoView({ behavior: 'smooth' })
      }, 300)
    } catch {
      setSaveStatus('error')
      setTimeout(() => setSaveStatus(null), 3000)
    }
  }, [phone, email, address, dietaryPreferences, updateContact, setShowAuthModal])

  const handleClose = useCallback(() => {
    setShowAuthModal(false)
  }, [setShowAuthModal])

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
              value={!phoneFocused && phone === originalPhone ? `(${phone.slice(0,3)}) ${phone.slice(3,6)}-${phone.slice(6,10)}` : phone}
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
              value={email}
              onChange={(e) => setEmail(e.target.value)}
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
          <div className="p-3 bg-sage/10 border border-sage/20 rounded-sm text-xs text-sage text-center transition-all" aria-live="polite">
            Saved successfully!
          </div>
        )}
        {saveStatus === 'error' && (
          <div className="p-3 bg-red/10 border border-red/20 rounded-sm text-xs text-red text-center transition-all" aria-live="polite">
            Failed to save. Please try again.
          </div>
        )}

        {authMode === 'settings' && (
          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={handleClose}
              className="flex-1 py-2.5 border border-gold/20 rounded-sm text-xs tracking-widest uppercase text-charcoal-light/50 hover:text-charcoal-light hover:bg-cream-dark transition-colors"
            >
              Close
            </button>
            <button
              onClick={handleSave}
              disabled={!hasChanges || saveStatus === 'saving'}
              className="flex-1 py-2.5 border border-gold/20 rounded-sm text-xs tracking-widest uppercase text-charcoal-light hover:bg-cream-dark hover:border-gold/40 transition-colors disabled:opacity-30"
            >
              {saveStatus === 'saving' ? 'Saving...' : 'Save'}
            </button>
            <button
              onClick={handleMessageClick}
              disabled={!hasChanges || saveStatus === 'saving'}
              className="flex-1 py-2.5 border border-gold/20 rounded-sm text-xs tracking-widest uppercase text-charcoal-light hover:bg-cream-dark hover:border-gold/40 transition-colors disabled:opacity-30"
            >
              {saveStatus === 'saving' ? 'Saving...' : 'Message'}
            </button>
          </div>
        )}
      </div>
  )
}
