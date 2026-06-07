import ContactSlide from './ContactSlide'

export default function ContactSection() {
  return (
    <section id="contact" className="relative bg-charcoal">
      <div className="absolute inset-0 bg-gradient-to-b from-charcoal/40 to-charcoal pointer-events-none" />
      <ContactSlide />
    </section>
  )
}
