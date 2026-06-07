import config from '../config'

export default function Footer() {
  const { bride, groom } = config.site.coupleNames
  return (
    <footer className="bg-charcoal text-cream/60 py-16 px-6">
      <div className="max-w-3xl mx-auto text-center">
        <div className="w-12 h-[1px] bg-gold/40 mx-auto mb-6" />
        <p className="font-heading text-3xl md:text-4xl text-cream/90 font-light mb-2">
          {bride} <span className="text-gold">&</span> {groom}
        </p>
        <p className="text-sm text-cream/40 mb-6 tracking-wide">
          May 30, 2027 &middot; New York Botanical Garden
        </p>
        <div className="w-12 h-[1px] bg-gold/40 mx-auto mb-6" />
        <p className="text-xs text-cream/30">
          Made with love &mdash; thank you for being part of our story
        </p>
        <div className="flex justify-center gap-4 mt-6 text-[10px] text-cream/20">
          <a href="/privacy" target="_blank" rel="noopener noreferrer" className="hover:text-cream/50 transition-colors">Privacy</a>
          <a href="/terms" target="_blank" rel="noopener noreferrer" className="hover:text-cream/50 transition-colors">Terms</a>
          <a href="/data-deletion" target="_blank" rel="noopener noreferrer" className="hover:text-cream/50 transition-colors">Data Deletion</a>
        </div>
      </div>
    </footer>
  )
}
