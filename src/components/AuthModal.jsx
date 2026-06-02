import { useState, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSignIn } from '@clerk/react'
import { useAuth } from '../context/useAuth'

const roleLabels = {
  bride: 'Bride',
  groom: 'Groom',
  close_family: 'Close Family',
  invited_guest: 'Invited Guest',
  vendor: 'Vendor',
}

function formatConfirmation(g, sideName) {
  if (g.role === 'bride') return `Are you ${g.firstName}?`
  if (g.role === 'groom') return `Are you ${g.firstName}?`
  return `Are you ${g.firstName} ${g.lastName}, ${sideName[g.side]}'s ${g.relationship || roleLabels[g.role]?.toLowerCase()}?`
}

const providers = [
  { id: 'google', label: 'Google', icon: <svg className="w-4 h-4" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg> },
  { id: 'apple', label: 'Apple', icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/></svg> },
  { id: 'facebook', label: 'Facebook', icon: <svg className="w-4 h-4" viewBox="0 0 24 24" fill="#1877F2"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg> },
]

export default function AuthModal() {
  const { showAuthModal, setShowAuthModal, searchGuests, signIn, updateContact, config } = useAuth()
  const clerkSignIn = useSignIn()
  const clerkLoaded = !!clerkSignIn
  const [searchTerm, setSearchTerm] = useState('')
  const [results, setResults] = useState([])
  const [selected, setSelected] = useState(null)
  const [isPlusOne, setIsPlusOne] = useState(false)
  const [remember, setRemember] = useState(true)
  const [searched, setSearched] = useState(false)
  const [step, setStep] = useState('search')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [contactSaved, setContactSaved] = useState(false)
  const [oauthLoading, setOauthLoading] = useState(null)
  const [oauthError, setOauthError] = useState(null)
  const inputRef = useRef(null)

  const sideName = config.site.coupleNames

  const resetState = () => {
    setSearchTerm('')
    setResults([])
    setSelected(null)
    setIsPlusOne(false)
    setSearched(false)
    setStep('search')
    setPhone('')
    setEmail('')
    setContactSaved(false)
    setOauthLoading(null)
    setOauthError(null)
  }

  const handleSearch = useCallback((e) => {
    e.preventDefault()
    const matches = searchGuests(searchTerm)
    setResults(matches.slice(0, 8))
    setSearched(true)
    setSelected(null)
    setStep('search')

    if (matches.length <= 3 && matches.length > 0) {
      setStep('confirm')
      setSelected(matches[0])
    }
  }, [searchTerm, searchGuests])

  const handleTermChange = useCallback((e) => {
    const val = e.target.value
    setSearchTerm(val)
    if (val.length >= 3) {
      const matches = searchGuests(val)
      setResults(matches.slice(0, 5))
      setSearched(true)
    } else {
      setResults([])
      setSearched(false)
    }
  }, [searchGuests])

  const handleOAuth = useCallback(async (provider) => {
    let si = clerkSignIn
    if (!si) {
      // Clerk sign-in might not be ready yet — wait up to 5s polling via a ref
      for (let i = 0; i < 20; i++) {
        await new Promise((r) => setTimeout(r, 250))
        // Re-read from a fresh snapshot by checking a mounted flag
        // The component re-renders when clerkSignIn changes, but the closure
        // might have a stale value — poll until it's available
        try {
          const fresh = window.Clerk?.client?.signIn
          if (fresh) { si = fresh; break }
        } catch {}
      }
    }
    if (!si) {
      setOauthError('Clerk failed to initialize. Check browser console (F12) for errors.')
      return
    }
    setOauthLoading(provider)
    setOauthError(null)
    try {
      await si.authenticateWithRedirect({
        strategy: `oauth_${provider}`,
        redirectUrl: '/',
        redirectUrlComplete: '/',
      })
    } catch (err) {
      const msg = err?.errors?.[0]?.message || err?.message || 'unknown error'
      setOauthError(`${provider} sign-in failed: ${msg}`)
      setOauthLoading(null)
    }
  }, [clerkSignIn])

  const handleConfirm = useCallback(() => {
    if (selected) {
      signIn({ ...selected, plusOne: isPlusOne }, remember)
      setStep('contact')
    }
  }, [selected, isPlusOne, remember, signIn])

  const handleSkipContact = useCallback(() => {
    setShowAuthModal(false)
    resetState()
  }, [setShowAuthModal])

  const handleSaveContact = useCallback(async () => {
    await updateContact(phone, email)
    setContactSaved(true)
    setTimeout(() => {
      setShowAuthModal(false)
      resetState()
    }, 1200)
  }, [phone, email, updateContact, setShowAuthModal])

  const handleCancel = useCallback(() => {
    setShowAuthModal(false)
    resetState()
  }, [setShowAuthModal])

  const guestLabel = (g) => {
    if (g.role === 'bride') return 'The Bride'
    if (g.role === 'groom') return 'The Groom'
    return `${sideName[g.side]}'s ${g.relationship || roleLabels[g.role]?.toLowerCase()}`
  }

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
            <div className="p-8 md:p-10">
              <div className="flex items-center justify-between mb-8">
                <h2 className="font-heading text-3xl text-charcoal">
                  {step === 'contact' ? 'Almost Done' : 'Sign In'}
                </h2>
                <button
                  onClick={handleCancel}
                  className="text-charcoal-light/40 hover:text-charcoal transition-colors"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                    <path d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {step !== 'contact' && (
                <>
                  {/* Clerk OAuth Buttons — above search */}
                  <div className="flex gap-3 mb-5">
                    {providers.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => handleOAuth(p.id)}
                        disabled={oauthLoading !== null}
                        className="flex-1 flex items-center justify-center gap-2 py-3 border border-gold/20 rounded-sm text-xs tracking-widest uppercase text-charcoal-light hover:bg-cream-dark hover:border-gold/40 transition-colors disabled:opacity-50"
                      >
                        {oauthLoading === p.id ? (
                          <div className="w-4 h-4 border-2 border-gold border-t-transparent rounded-full animate-spin" />
                        ) : (
                          p.icon
                        )}
                        {p.label}
                      </button>
                    ))}
                  </div>

                  {oauthError && (
                    <div className="mb-4 p-3 bg-gold/10 border border-gold/20 rounded-sm text-xs text-charcoal-light/70">
                      {oauthError}
                    </div>
                  )}

                  <div className="relative border-t border-gold/10 mb-5">
                    <span className="absolute left-1/2 -translate-x-1/2 -top-2.5 bg-cream px-3 text-xs text-charcoal-light/40">
                      or search your name
                    </span>
                  </div>

                  {/* Search */}
                  <form onSubmit={handleSearch} className="mb-2">
                    <div className="relative">
                      <input
                        ref={inputRef}
                        type="text"
                        value={searchTerm}
                        onChange={handleTermChange}
                        className="w-full bg-cream-dark border border-gold/20 rounded-sm px-5 py-3.5 text-base text-charcoal placeholder:text-charcoal-light/40 focus:outline-none focus:border-gold/50 transition-colors"
                        placeholder="Search your name (3+ letters)..."
                      />
                      <button
                        type="submit"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-charcoal-light/40 hover:text-gold transition-colors"
                      >
                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                          <path d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                        </svg>
                      </button>
                    </div>

                    {/* Autocomplete suggestions — opens above */}
                    {searched && results.length > 0 && (
                      <div className="border border-gold/10 rounded-sm bg-cream-dark max-h-48 overflow-y-auto mb-2">
                        {results.map((g) => (
                          <button
                            key={g.id}
                            type="button"
                            onClick={() => {
                              setSelected(g)
                              setSearchTerm(`${g.firstName} ${g.lastName}`)
                              setResults([])
                              setStep('confirm')
                            }}
                            className="w-full text-left px-4 py-3 hover:bg-cream transition-colors border-b border-gold/5 last:border-b-0"
                          >
                            <p className="font-heading text-base text-charcoal">{g.firstName} {g.lastName}</p>
                            <p className="text-xs text-charcoal-light/50 capitalize">{guestLabel(g)}</p>
                          </button>
                        ))}
                      </div>
                    )}

                    {searched && results.length === 0 && searchTerm.length >= 3 && (
                      <p className="mb-2 text-xs text-charcoal-light/40 text-center">No matches found</p>
                    )}
                  </form>
                  {/* Confirmation */}
                  {step === 'confirm' && selected && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-6 p-5 bg-cream-dark border border-gold/10 rounded-sm"
                    >
                      <p className="text-sm text-charcoal-light/70 mb-3">
                        {formatConfirmation(selected, sideName)}
                      </p>

                      <label className="flex items-center gap-2.5 text-sm text-charcoal-light/50 cursor-not-allowed mb-3">
                        <input
                          type="checkbox"
                          checked={isPlusOne}
                          onChange={() => setIsPlusOne(!isPlusOne)}
                          className="accent-sage w-4 h-4 rounded border-gold/30 cursor-not-allowed opacity-50"
                          disabled
                        />
                        <span className="text-charcoal-light/30">I am the plus one</span>
                      </label>

                      <div className="flex gap-3 mb-3">
                        <button
                          onClick={() => { setSelected(null); setStep('search'); setSearchTerm(''); setResults([]) }}
                          className="flex-1 py-2.5 border border-gold/20 rounded-sm text-xs text-charcoal-light hover:bg-cream transition-colors"
                        >
                          Not me
                        </button>
                        <button
                          onClick={handleConfirm}
                          className="flex-1 py-2.5 bg-sage hover:bg-sage-dark text-cream text-xs tracking-widest uppercase rounded-sm transition-colors font-medium"
                        >
                          Yes, that's me
                        </button>
                      </div>

                      <label className="flex items-center gap-2.5 text-sm text-charcoal-light/50">
                        <input
                          type="checkbox"
                          checked={remember}
                          onChange={() => setRemember(!remember)}
                          className="accent-sage w-4 h-4 rounded border-gold/30"
                        />
                        Remember this device
                      </label>
                    </motion.div>
                  )}
                </>
              )}

              {step === 'contact' && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-5"
                >
                  <p className="text-sm text-charcoal-light/70 leading-relaxed">
                    Want to add your contact info? Optional — we'll only use it for wedding updates.
                  </p>

                  <div>
                    <label className="block text-xs tracking-widest uppercase text-charcoal-light/50 mb-1.5">
                      Phone Number <span className="text-charcoal-light/30 normal-case">(optional)</span>
                    </label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full bg-cream-dark border border-gold/20 rounded-sm px-4 py-3 text-sm text-charcoal placeholder:text-charcoal-light/30 focus:outline-none focus:border-gold/50 transition-colors"
                      placeholder="+1 (555) 123-4567"
                    />
                  </div>

                  <div>
                    <label className="block text-xs tracking-widest uppercase text-charcoal-light/50 mb-1.5">
                      Email Address <span className="text-charcoal-light/30 normal-case">(optional)</span>
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-cream-dark border border-gold/20 rounded-sm px-4 py-3 text-sm text-charcoal placeholder:text-charcoal-light/30 focus:outline-none focus:border-gold/50 transition-colors"
                      placeholder="you@email.com"
                    />
                  </div>

                  {contactSaved && (
                    <div className="text-center py-2 text-sage text-sm font-medium">
                      Contact info saved!
                    </div>
                  )}

                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={handleSkipContact}
                      className="flex-1 py-2.5 border border-gold/20 rounded-sm text-xs text-charcoal-light hover:bg-cream-dark transition-colors"
                    >
                      Skip
                    </button>
                    <button
                      onClick={handleSaveContact}
                      disabled={contactSaved}
                      className="flex-1 py-2.5 bg-sage hover:bg-sage-dark disabled:bg-sage/50 text-cream text-xs tracking-widest uppercase rounded-sm transition-colors font-medium"
                    >
                      {contactSaved ? 'Saved!' : 'Save'}
                    </button>
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}