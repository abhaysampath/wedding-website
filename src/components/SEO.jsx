import { Helmet } from 'react-helmet-async'
import config from '../config'

const siteUrl = config.site.url || 'https://abhayandrebecca.com'
const defaultImage = `${siteUrl}/ar-logo.png`

export function SEO({
  title = 'Rebecca & Abhay | Wedding',
  description = "We're getting married! Join us for our wedding celebration. Find event details, travel info, gallery, and RSVP.",
  image = defaultImage,
  url = siteUrl,
  type = 'website',
  noIndex = false,
} = {}) {
  const fullTitle = title.includes('|') ? title : `${title} | Rebecca & Abhay`
  const canonicalUrl = url.startsWith('http') ? url : `${siteUrl}${url.startsWith('/') ? '' : '/'}${url}`

  return (
    <Helmet>
      <html lang="en" />
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <meta name="theme-color" content="#C9A96E" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <link rel="canonical" href={canonicalUrl} />

      {noIndex && <meta name="robots" content="noindex, nofollow" />}

      <meta property="og:type" content={type} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:site_name" content="Rebecca & Abhay Wedding" />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={canonicalUrl} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />

      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
    </Helmet>
  )
}

export function JSONLD({ data }) {
  return (
    <Helmet>
      <script type="application/ld+json">{JSON.stringify(data)}</script>
    </Helmet>
  )
}

export const weddingJSONLD = {
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