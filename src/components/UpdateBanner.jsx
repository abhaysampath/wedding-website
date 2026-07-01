import { useEffect, useState } from 'react'

export default function UpdateBanner() {
  const [updateAvailable, setUpdateAvailable] = useState(false)

  useEffect(() => {
    const onUpdate = () => setUpdateAvailable(true)
    window.addEventListener('app-update-available', onUpdate)
    return () => window.removeEventListener('app-update-available', onUpdate)
  }, [])

  if (!updateAvailable) return null

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed top-0 inset-x-0 z-[60] bg-sage text-cream shadow-md"
    >
      <div className="max-w-6xl mx-auto px-4 py-2 flex items-center justify-between gap-3 text-sm">
        <span>A new version is ready.</span>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="min-h-[44px] px-4 bg-cream text-sage-dark font-medium rounded-sm hover:bg-cream-dark transition-colors"
        >
          Reload
        </button>
      </div>
    </div>
  )
}
