import config from '../config'

const siteUrl = config.site.url
const defaultImage = `${siteUrl}/ar-logo.png`

const weddingJSONLD = {
  '@context': 'https://schema.org',
  '@type': 'Event',
  name: 'Rebecca & Abhay Wedding',
  description: "We're getting married! Join us for our wedding celebration.",
  startDate: '2025-09-20T16:00:00',
  endDate: '2025-09-20T23:00:00',
  eventStatus: 'https://schema.org/EventScheduled',
  eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
  location: {
    '@type': 'Place',
    name: 'Wedding Venue',
    address: {
      '@type': 'PostalAddress',
      streetAddress: '123 Wedding Lane',
      addressLocality: 'San Francisco',
      addressRegion: 'CA',
      postalCode: '94102',
      addressCountry: 'US',
    },
  },
  image: defaultImage,
  organizer: {
    '@type': 'Person',
    name: 'Rebecca & Abhay',
    url: siteUrl,
  },
  offers: {
    '@type': 'Offer',
    url: siteUrl,
    price: '0',
    priceCurrency: 'USD',
    availability: 'https://schema.org/InStock',
  },
}

export default weddingJSONLD
