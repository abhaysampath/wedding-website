import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../context/useAuth'
import { writeToSheet } from '../utils/sheet-write'
import { fullName, stripPhone } from '../utils/guest'

const WEDDING_LABELS = {
  us: { short: 'US Wedding — Bronx' },
  india: { short: 'India Wedding — Chennai' },
}

function normalizeRsvpValue(value) {
  if (value === 'YES') return 'Yes'
  if (value === 'NO') return 'No'
  return value || ''
}

function RsvpStatusBadge({ weddingKey, value }) {
  const label = WEDDING_LABELS[weddingKey]?.short || weddingKey
  const isYes = value === 'Yes'
  const isNo = value === 'No'
  return (
    <span
      aria-label={`${label}: ${value || 'not set'}`}
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-sm text-[10px] tracking-widest uppercase font-medium ${
        isYes
          ? 'bg-gold/20 text-gold-dark border border-gold/30'
          : isNo
            ? 'bg-charcoal-light/10 text-charcoal-light/70 border border-charcoal-light/20'
            : 'bg-cream-dark/30 text-charcoal-light/40 border border-charcoal-light/10'
      }`}
    >
      <span
        className={`w-2.5 h-2.5 rounded-sm border flex items-center justify-center ${
          isYes ? 'bg-gold border-gold text-cream' : 'border-charcoal-light/30'
        }`}
      >
        {isYes && (
          <svg
            viewBox="0 0 24 24"
            className="w-2 h-2"
            fill="none"
            stroke="currentColor"
            strokeWidth={4}
          >
            <path d="M5 13l4 4L19 7" />
          </svg>
        )}
      </span>
      {value || '—'}
    </span>
  )
}

function RsvpToggle({ weddingKey, value, onChange }) {
  const label = WEDDING_LABELS[weddingKey]?.short || weddingKey
  const isYes = value === 'Yes'
  const isNo = value === 'No'
  const handleToggle = useCallback(() => {
    if (!value) onChange('Yes')
    else if (isYes) onChange('No')
    else onChange('Yes')
  }, [value, isYes, onChange])

  return (
    <button
      type="button"
      onClick={handleToggle}
      aria-label={`${label}: ${value || 'not set'}`}
      className={`flex items-center gap-2 px-3 py-2 rounded-sm border text-xs tracking-wide transition-colors w-full ${
        isYes
          ? 'bg-gold/15 border-gold/30 text-charcoal'
          : isNo
            ? 'bg-cream-dark/50 border-gold/10 text-charcoal-light/70'
            : 'bg-cream border-gold/15 text-charcoal-light/50 hover:border-gold/25'
      }`}
    >
      <span
        className={`w-4 h-4 rounded-sm border flex items-center justify-center text-[10px] shrink-0 ${
          isYes ? 'bg-gold border-gold text-cream' : 'border-charcoal-light/30 text-transparent'
        }`}
      >
        {isYes && '✓'}
      </span>
      <span className="font-medium">{weddingKey === 'us' ? 'US Wedding' : 'India Wedding'}</span>
      <span
        className={`ml-auto text-[10px] tracking-widest uppercase font-medium ${
          isYes ? 'text-gold-dark' : isNo ? 'text-charcoal-light/70' : 'text-charcoal-light/40'
        }`}
      >
        {value || '—'}
      </span>
    </button>
  )
}

function buildPayload(state) {
  return {
    firstName: state.firstName,
    lastName: state.lastName,
    phone: state.phone,
    email: state.email,
    address: state.address,
    rsvpUs: state.rsvpUs,
    rsvpIndia: state.rsvpIndia,
    dietaryPreferences: state.dietary,
  }
}

function fieldsEqual(a, b) {
  return (
    a.firstName === b.firstName &&
    a.lastName === b.lastName &&
    a.phone === b.phone &&
    a.email === b.email &&
    a.address === b.address &&
    a.rsvpUs === b.rsvpUs &&
    a.rsvpIndia === b.rsvpIndia &&
    a.dietary === b.dietary
  )
}

function PlusOneExpandedEditor({ guest, state, onStateChange, saving, status, error, onSave }) {
  const update = useCallback(patch => onStateChange({ ...state, ...patch }), [state, onStateChange])

  return (
    <div className="bg-charcoal-light/10 border-t border-gold/15 p-4 space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[10px] tracking-widest uppercase text-charcoal-light/60 mb-1">
            First Name
          </label>
          <input
            type="text"
            value={state.firstName}
            onChange={e => update({ firstName: e.target.value })}
            placeholder="First name"
            className="w-full text-sm border border-gold/20 rounded-sm px-3 py-2 bg-cream text-charcoal focus:outline-none focus:border-gold/50"
          />
        </div>
        <div>
          <label className="block text-[10px] tracking-widest uppercase text-charcoal-light/60 mb-1">
            Last Name
          </label>
          <input
            type="text"
            value={state.lastName}
            onChange={e => update({ lastName: e.target.value })}
            placeholder="Last name"
            className="w-full text-sm border border-gold/20 rounded-sm px-3 py-2 bg-cream text-charcoal focus:outline-none focus:border-gold/50"
          />
        </div>
      </div>
      <div>
        <label className="block text-[10px] tracking-widest uppercase text-charcoal-light/60 mb-1">
          Phone Number
        </label>
        <input
          type="tel"
          value={state.phone}
          onChange={e => update({ phone: e.target.value.replace(/\D/g, '') })}
          placeholder="5551234567"
          className="w-full text-sm border border-gold/20 rounded-sm px-3 py-2 bg-cream text-charcoal focus:outline-none focus:border-gold/50"
        />
      </div>
      <div>
        <label className="block text-[10px] tracking-widest uppercase text-charcoal-light/60 mb-1">
          Email Address
        </label>
        <input
          type="email"
          value={state.email}
          onChange={e => update({ email: e.target.value })}
          placeholder="email@example.com"
          className="w-full text-sm border border-gold/20 rounded-sm px-3 py-2 bg-cream text-charcoal focus:outline-none focus:border-gold/50"
        />
      </div>
      <div>
        <label className="block text-[10px] tracking-widest uppercase text-charcoal-light/60 mb-1">
          Mailing Address
        </label>
        <textarea
          value={state.address}
          onChange={e => update({ address: e.target.value })}
          rows={2}
          maxLength={500}
          className="w-full text-sm border border-gold/20 rounded-sm px-3 py-2 bg-cream text-charcoal placeholder:text-charcoal-light/30 focus:outline-none focus:border-gold/50 resize-none"
          placeholder="123 Main St, City, State ZIP"
        />
      </div>
      <div className="space-y-2">
        {guest.weddings?.includes('us') && (
          <RsvpToggle weddingKey="us" value={state.rsvpUs} onChange={v => update({ rsvpUs: v })} />
        )}
        {guest.weddings?.includes('india') && (
          <RsvpToggle
            weddingKey="india"
            value={state.rsvpIndia}
            onChange={v => update({ rsvpIndia: v })}
          />
        )}
      </div>
      <div>
        <label className="block text-[10px] tracking-widest uppercase text-charcoal-light/60 mb-1">
          Dietary Preferences
        </label>
        <input
          type="text"
          value={state.dietary}
          onChange={e => update({ dietary: e.target.value })}
          placeholder="e.g. vegetarian, nut allergy"
          className="w-full text-sm border border-gold/20 rounded-sm px-3 py-2 bg-cream text-charcoal focus:outline-none focus:border-gold/50"
        />
      </div>
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="text-[11px] tracking-widest uppercase bg-gold/15 text-gold-dark px-4 py-2 rounded-sm hover:bg-gold/25 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
        <AnimatePresence>
          {status === 'saved' && (
            <motion.span
              initial={{ opacity: 0, x: 4 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              className="text-[11px] text-sage"
            >
              Saved
            </motion.span>
          )}
          {status === 'error' && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-[11px] text-red"
            >
              {error || 'Save failed'}
            </motion.span>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

function PlusOneRow({ guest, registerSave }) {
  const { content } = useAuth()
  const guestFromContent = useMemo(
    () => content?.guests?.find(g => g.id === guest.id) || null,
    [content?.guests, guest.id],
  )
  const initialOriginal = useMemo(
    () => ({
      firstName: guestFromContent?.firstName || '',
      lastName: guestFromContent?.lastName || '',
      phone: stripPhone(guestFromContent?.phone || ''),
      email: guestFromContent?.email || '',
      address: guestFromContent?.address || '',
      rsvpUs: normalizeRsvpValue(guestFromContent?.rsvpUs || ''),
      rsvpIndia: normalizeRsvpValue(guestFromContent?.rsvpIndia || ''),
      dietary: guestFromContent?.dietaryPreferences || '',
    }),
    [guestFromContent],
  )

  const [open, setOpen] = useState(false)
  const [state, setState] = useState(initialOriginal)
  const [original, setOriginal] = useState(initialOriginal)
  const [saving, setSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState(null)
  const [saveError, setSaveError] = useState(null)

  const hasChanges = !fieldsEqual(state, original)

  const doSave = useCallback(async () => {
    if (saving) return false
    setSaving(true)
    setSaveStatus(null)
    setSaveError(null)
    const ok = await writeToSheet(guest.id, buildPayload(state))
    setSaving(false)
    if (ok) {
      setOriginal(state)
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus(null), 2500)
      return true
    }
    setSaveStatus('error')
    setSaveError('Save failed. Please try again.')
    return false
  }, [guest.id, state, saving])

  useEffect(() => {
    if (!registerSave) return
    registerSave(guest.id, async () => {
      if (!hasChanges) return true
      return doSave()
    })
    return () => registerSave(guest.id, null)
  }, [registerSave, guest.id, doSave, hasChanges])

  return (
    <div className="border-b border-gold/10 last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        aria-label={open ? `Collapse ${fullName(guest)}` : `Expand ${fullName(guest)}`}
        className="w-full flex items-center gap-3 p-3 text-left bg-charcoal-light/5 hover:bg-charcoal-light/10 transition-colors"
      >
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-charcoal truncate">{fullName(guest)}</p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {guest.weddings?.includes('us') && (
            <RsvpStatusBadge weddingKey="us" value={state.rsvpUs} />
          )}
          {guest.weddings?.includes('india') && (
            <RsvpStatusBadge weddingKey="india" value={state.rsvpIndia} />
          )}
        </div>
        <span
          className="shrink-0 w-7 h-7 flex items-center justify-center text-charcoal-light/50"
          aria-hidden="true"
        >
          <motion.svg
            animate={{ rotate: open ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            className="w-4 h-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path d="M6 9l6 6 6-6" />
          </motion.svg>
        </span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <PlusOneExpandedEditor
              guest={guest}
              state={state}
              onStateChange={setState}
              saving={saving}
              status={saveStatus}
              error={saveError}
              onSave={doSave}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function PlusOneEditor({ user, guests, onSaveAll }) {
  const groupMembers = useMemo(() => {
    if (!user || !guests || user.plusOne !== 'Allowed+1') return []
    const rowOf = g => parseInt(String(g.id).replace(/[^\d]/g, ''), 10)
    const userRowIndex = rowOf(user)
    if (isNaN(userRowIndex) || userRowIndex < 1) return []
    const sorted = [...guests].sort((a, b) => rowOf(a) - rowOf(b))
    const members = []
    for (const g of sorted) {
      const r = rowOf(g)
      if (r <= userRowIndex) continue
      if (g.plusOne === 'Is+1') {
        members.push(g)
      } else {
        break
      }
    }
    return members
  }, [user, guests])

  const saveHandlersRef = useRef(new Map())
  const registerSave = useCallback((id, handler) => {
    if (handler) saveHandlersRef.current.set(id, handler)
    else saveHandlersRef.current.delete(id)
  }, [])

  const saveAll = useCallback(async () => {
    const results = await Promise.all(
      Array.from(saveHandlersRef.current.values()).map(fn => fn().catch(() => false)),
    )
    return results.every(Boolean)
  }, [])

  useEffect(() => {
    if (!onSaveAll) return
    onSaveAll(saveAll)
    return () => onSaveAll(null)
  }, [onSaveAll, saveAll])

  if (groupMembers.length === 0) return null

  return (
    <div className="pt-5 border-t border-gold/15">
      <h3 className="text-sm tracking-widest uppercase text-charcoal-light/70 mb-3">
        RSVP on behalf of
      </h3>
      <div className="border border-gold/15 rounded-sm overflow-hidden">
        {groupMembers.map(g => (
          <PlusOneRow key={g.id} guest={g} registerSave={registerSave} />
        ))}
      </div>
    </div>
  )
}
