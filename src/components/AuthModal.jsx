import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../context/AuthContext'

const roleLabels = {
  bride: 'Bride',
  groom: 'Groom',
  close_family: 'Close Family',
  invited_guest: 'Invited Guest',
  vendor: 'Vendor',
}

const sideName = { bride: 'Rebecca', groom: 'Abhay' }

export default function AuthModal() {
  const { showAuthModal, setShowAuthModal, searchGuests, signIn } = useAuth()
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [results, setResults] = useState([])
  const [selected, setSelected] = useState(null)
  const [isPlusOne, setIsPlusOne] = useState(false)
  const [remember, setRemember] = useState(true)
  const [searched, setSearched] = useState(false)
  const [step, setStep] = useState('search')

  const handleSearch = useCallback((e) => {
    e.preventDefault()
    const matches = searchGuests(firstName, lastName)
    setResults(matches.slice(0, 8))
    setSearched(true)
    setSelected(null)
    setStep('search')
  }, [firstName, lastName, searchGuests])

  const handleConfirm = useCallback(() => {
    if (selected) {
      signIn({ ...selected, plusOne: isPlusOne }, remember)
      setFirstName('')
      setLastName('')
      setResults([])
      setSelected(null)
      setIsPlusOne(false)
      setSearched(false)
      setStep('search')
    }
  }, [selected, isPlusOne, remember, signIn])

  const handleCancel = useCallback(() => {
    setShowAuthModal(false)
    setFirstName('')
    setLastName('')
    setResults([])
    setSelected(null)
    setIsPlusOne(false)
    setSearched(false)
    setStep('search')
  }, [setShowAuthModal])

  const handleOAuth = useCallback((provider) => {
    const fakeEmail = `${provider.toLowerCase()}@placeholder.com`
    const matches = searchGuests('', '').filter(
      (g) => g.email && g.email.toLowerCase() === fakeEmail
    )
    setResults(matches)
    setSearched(true)
    setStep('search')
  }, [searchGuests])

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
            className="bg-cream rounded-sm w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 md:p-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-heading text-2xl text-charcoal">Sign In</h2>
                <button
                  onClick={handleCancel}
                  className="text-charcoal-light/40 hover:text-charcoal transition-colors"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                    <path d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* OAuth Buttons */}
              <div className="flex gap-3 mb-6">
                <button
                  onClick={() => handleOAuth('Google')}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 border border-gold/20 rounded-sm text-xs tracking-widest uppercase text-charcoal-light hover:bg-cream-dark hover:border-gold/40 transition-colors"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                  Google
                </button>
                <button
                  onClick={() => handleOAuth('Apple')}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 border border-gold/20 rounded-sm text-xs tracking-widest uppercase text-charcoal-light hover:bg-cream-dark hover:border-gold/40 transition-colors"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="#333"><path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/></svg>
                  Apple
                </button>
                <button
                  onClick={() => handleOAuth('Facebook')}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 border border-gold/20 rounded-sm text-xs tracking-widest uppercase text-charcoal-light hover:bg-cream-dark hover:border-gold/40 transition-colors"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="#1877F2"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                  Facebook
                </button>
              </div>

              <div className="relative mb-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gold/10" />
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-cream px-3 text-xs text-charcoal-light/40">or search by name</span>
                </div>
              </div>

              <form onSubmit={handleSearch} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs tracking-widest uppercase text-charcoal-light/50 mb-1.5">
                      First Name
                    </label>
                    <input
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="w-full bg-cream-dark border border-gold/20 rounded-sm px-4 py-2.5 text-sm text-charcoal placeholder:text-charcoal-light/30 focus:outline-none focus:border-gold/50 transition-colors"
                      placeholder="First name"
                    />
                  </div>
                  <div>
                    <label className="block text-xs tracking-widest uppercase text-charcoal-light/50 mb-1.5">
                      Last Name
                    </label>
                    <input
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="w-full bg-cream-dark border border-gold/20 rounded-sm px-4 py-2.5 text-sm text-charcoal placeholder:text-charcoal-light/30 focus:outline-none focus:border-gold/50 transition-colors"
                      placeholder="Last name"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-sage hover:bg-sage-dark text-cream text-xs tracking-widest uppercase py-3 rounded-sm transition-colors font-medium"
                >
                  Find My Name
                </button>
              </form>

              {/* Results */}
              {searched && results.length === 0 && (
                <div className="mt-6 text-center py-6 border border-dashed border-gold/20 rounded-sm">
                  <p className="text-charcoal-light/50 text-sm mb-1">No guests found</p>
                  <p className="text-charcoal-light/30 text-xs">Try a different spelling or use Google/Apple/Facebook to sign in</p>
                </div>
              )}

              {searched && results.length > 0 && (
                <div className="mt-6 space-y-2">
                  <p className="text-xs text-charcoal-light/50 tracking-widest uppercase mb-3">
                    {results.length > 1 ? 'Multiple matches — select yours' : 'We found you!'}
                  </p>
                  {results.map((g) => (
                    <div key={g.id}>
                      <button
                        onClick={() => {
                          setSelected(g)
                          setIsPlusOne(false)
                          setStep('confirm')
                        }}
                        className={`w-full text-left p-4 rounded-sm border transition-all duration-200 ${
                          selected?.id === g.id && step === 'confirm'
                            ? 'border-gold bg-cream-dark'
                            : 'border-gold/10 hover:border-gold/30 hover:bg-cream-dark/50'
                        }`}
                      >
                        <p className="font-heading text-lg text-charcoal">
                          {g.firstName} {g.lastName}
                        </p>
                        <p className="text-xs text-charcoal-light/50 mt-0.5">
                          {sideName[g.side]}'s {g.relationship || roleLabels[g.role]?.toLowerCase()}
                        </p>
                      </button>

                      {/* Confirmation */}
                      {selected?.id === g.id && step === 'confirm' && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          className="overflow-hidden"
                        >
                          <div className="pt-3 pb-1 px-1 space-y-3">
                            <p className="text-sm text-charcoal-light/70">
                              Are you <span className="font-medium text-charcoal">{g.firstName} {g.lastName}</span>, {sideName[g.side]}'s {g.relationship || roleLabels[g.role]?.toLowerCase()}?
                            </p>

                            <label className="flex items-center gap-2.5 text-sm text-charcoal-light/50 cursor-not-allowed">
                              <input
                                type="checkbox"
                                checked={isPlusOne}
                                onChange={() => setIsPlusOne(!isPlusOne)}
                                className="accent-sage w-4 h-4 rounded border-gold/30 cursor-not-allowed opacity-50"
                                disabled
                              />
                              <span className="text-charcoal-light/30">I am the plus one</span>
                            </label>

                            <div className="flex gap-3 pt-1">
                              <button
                                onClick={() => { setSelected(null); setStep('search') }}
                                className="flex-1 py-2.5 border border-gold/20 rounded-sm text-xs text-charcoal-light hover:bg-cream-dark transition-colors"
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

                            <label className="flex items-center gap-2.5 text-sm text-charcoal-light/50 pt-1">
                              <input
                                type="checkbox"
                                checked={remember}
                                onChange={() => setRemember(!remember)}
                                className="accent-sage w-4 h-4 rounded border-gold/30"
                              />
                              Remember this device
                            </label>
                          </div>
                        </motion.div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Default state when no search done */}
              {!searched && (
                <div className="mt-6 text-center py-6 border border-dashed border-gold/10 rounded-sm">
                  <p className="text-charcoal-light/30 text-xs">
                    Your name will appear here once you search
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
