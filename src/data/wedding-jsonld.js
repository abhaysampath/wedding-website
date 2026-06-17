import config from '../config'
import weddings from './weddings.json'

const siteUrl = config.site.url
const defaultImage = `${siteUrl}/ar-logo.png`

const usWedding = weddings.us
const indiaWedding = weddings.india

const usDate = '2027-05-30'
const indiaDate = '2027-02-25'

const weddingJSONLD = {
  '@context': 'https://schema.org',
  '@type': 'Event',
  name: 'Rebecca & Abhay Wedding',
  description: "We're getting married! Join us for our wedding celebration.",
  startDate: `${usDate}T16:00:00`,
  endDate: `${usDate}T23:00:00`,
  eventStatus: 'https://schema.org/EventScheduled',
  eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
  location: {
    '@type': 'Place',
    name: usWedding?.venue || 'Wedding Venue',
    address: {
      '@type': 'PostalAddress',
      streetAddress: usWedding?.address || '',
      addressCountry: 'US',
    },
  },
  image: defaultImage,
  organizer: {
    '@type': 'Person',
    name: 'Rebecca & Abhay',
    url: siteUrl,
  },
  subEvent: indiaWedding
    ? {
        '@type': 'Event',
        name: 'India Wedding Ceremony',
        startDate: `${indiaDate}T10:00:00`,
        eventStatus: 'https://schema.org/EventScheduled',
        eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
        location: {
          '@type': 'Place',
          name: indiaWedding?.venue || 'Wedding Venue',
          address: {
            '@type': 'PostalAddress',
            streetAddress: indiaWedding?.address || '',
            addressCountry: 'IN',
          },
        },
      }
    : undefined,
  offers: {
    '@type': 'Offer',
    url: siteUrl,
    price: '0',
    priceCurrency: 'USD',
    availability: 'https://schema.org/InStock',
  },
}

export default weddingJSONLD
