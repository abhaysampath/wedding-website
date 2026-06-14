const IMAGE_CDN = 'https://cdn.jsdelivr.net/gh/abhaysampath/wedding-website@main/public'

function imgUrl(path) {
  return `${IMAGE_CDN}/${path}`
}

function imgSrcSet(path) {
  const base = imgUrl(path)
  return `${base}?w=400&auto=format 400w, ${base}?w=800&auto=format 800w, ${base}?w=1200&auto=format 1200w, ${base}?w=1920&auto=format 1920w`
}

const config = {
  site: {
    siteTitle: 'Rebecca & Abhay',
    coupleNames: {
      bride: 'Rebecca',
      groom: 'Abhay',
    },
    theme: {
      primary: '#8A9A5B',
      background: '#FEFCF3',
      accent: '#C9A96E',
      text: '#2C2C2C',
    },
  },
  google: {
    sheetUrl: `https://docs.google.com/spreadsheets/d/${import.meta.env.VITE_GOOGLE_SHEET_ID || ''}/edit?usp=sharing`,
  },
  sheets: {
    mode: 'api',
  },
  firebase: {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  },
  emailjs: {
    serviceId: import.meta.env.VITE_EMAILJS_SERVICE_ID || '',
    templateId: import.meta.env.VITE_EMAILJS_TEMPLATE_ID || '',
    contactTemplateId: import.meta.env.VITE_EMAILJS_CONTACT_TEMPLATE_ID || '',
    publicKey: import.meta.env.VITE_EMAILJS_PUBLIC_KEY || '',
  },
  recaptcha: {
    siteKey: import.meta.env.VITE_RECAPTCHA_SITE_KEY || '',
  },
  images: {
    baseUrl: IMAGE_CDN,
    hero: {
      slides: [
        { path: 'pics/vert/ar-w-akshay.jpeg', alt: 'Ar W Akshay' },
        { path: 'pics/home/belize-engagement.jpeg', alt: 'Belize Engagement' },
        { path: 'pics/home/belize-sunset-l.jpeg', alt: 'Belize Sunset' },
        { path: 'pics/home/gala4.JPG', alt: 'Gala 4' },
        { path: 'pics/home/nyc.JPG', alt: 'NYC' },
        { path: 'pics/home/save-the-date.JPEG', alt: 'Save the Date' },
        { path: 'pics/home/scooby-doo2.jpeg', alt: 'Scooby Doo 2' },
      ],
      interval: 10000,
      contact: {
        reasons: [
          { value: 'wishes', label: 'Wishes to the Couple' },
          { value: 'travel', label: 'Questions about Travel/Visa' },
          { value: 'login', label: 'Login Trouble' },
          { value: 'rsvp', label: 'RSVP Issue' },
          { value: 'other', label: 'Other' },
        ],
      },
    },
    ourStory: {
      slides: [
        { path: 'pics/vert/BNE-l.jpeg', alt: 'BNE' },
        { path: 'pics/vert/botgrdn-w-geordi.jpeg', alt: 'Botanical Garden with Geordi' },
        { path: 'pics/vert/diwali.jpeg', alt: 'Diwali' },
        { path: 'pics/vert/gala-l.jpeg', alt: 'Gala' },
        { path: 'pics/vert/IMG_1197.jpeg', alt: '1197' },
        { path: 'pics/vert/IMG_3031.jpeg', alt: '3031' },
        { path: 'pics/vert/IMG_3982.JPG', alt: '3982' },
        { path: 'pics/vert/IMG_4340.jpeg', alt: '4340' },
        { path: 'pics/vert/IMG_4388.JPG', alt: '4388' },
        { path: 'pics/vert/IMG_6034.JPG', alt: '6034' },
        { path: 'pics/vert/PNG-image.jpeg', alt: 'PNG Image' },
        { path: 'pics/vert/scooby-doo-l.jpeg', alt: 'Scooby Doo' },
      ],
    },
    gallery: {
      home: [
        { path: 'pics/vert/ar-w-akshay.jpeg', alt: 'Ar W Akshay', tier: 2 },
        { path: 'pics/home/belize-engagement.jpeg', alt: 'Belize Engagement', tier: 1 },
        { path: 'pics/home/belize-sunset-l.jpeg', alt: 'Belize Sunset', tier: 1 },
        { path: 'pics/home/gala4.JPG', alt: 'Gala 4', tier: 2 },
        { path: 'pics/home/nyc.JPG', alt: 'NYC', tier: 2 },
        { path: 'pics/home/save-the-date.JPEG', alt: 'Save the Date', tier: 2 },
        { path: 'pics/home/scooby-doo2.jpeg', alt: 'Scooby Doo 2', tier: 3 },
      ],
      gallery: [
        { path: 'pics/gallery/belize3.jpeg', alt: 'Belize 3', tier: 2 },
        { path: 'pics/gallery/bk-w-geordi.jpeg', alt: 'BK with Geordi', tier: 2 },
        { path: 'pics/gallery/botanical-garden.jpeg', alt: 'Botanical Garden', tier: 2 },
        { path: 'pics/gallery/eng-smiles.jpeg', alt: 'Engagement Smiles', tier: 2 },
        { path: 'pics/gallery/family.JPG', alt: 'Family', tier: 2 },
        { path: 'pics/gallery/gala2.jpeg', alt: 'Gala 2', tier: 2 },
        { path: 'pics/gallery/mural-selfie.jpeg', alt: 'Mural Selfie', tier: 2 },
        { path: 'pics/gallery/nich.jpeg', alt: 'Nich', tier: 2 },
        { path: 'pics/gallery/ra-and-steve.jpeg', alt: 'Ra & Steve', tier: 2 },
      ],
      vert: [
        { path: 'pics/vert/ar-w-akshay.jpeg', alt: 'Ar W Akshay', tier: 2 },
        { path: 'pics/vert/BNE-l.jpeg', alt: 'BNE', tier: 3 },
        { path: 'pics/vert/botgrdn-w-geordi.jpeg', alt: 'Botanical Garden with Geordi', tier: 2 },
        { path: 'pics/vert/diwali.jpeg', alt: 'Diwali', tier: 3 },
        { path: 'pics/vert/gala-l.jpeg', alt: 'Gala', tier: 2 },
        { path: 'pics/vert/IMG_1197.jpeg', alt: '1197', tier: 1 },
        { path: 'pics/vert/IMG_3031.jpeg', alt: '3031', tier: 1 },
        { path: 'pics/vert/IMG_3982.JPG', alt: '3982', tier: 1 },
        { path: 'pics/vert/IMG_4340.jpeg', alt: '4340', tier: 1 },
        { path: 'pics/vert/IMG_4388.JPG', alt: '4388', tier: 1 },
        { path: 'pics/vert/IMG_6034.JPG', alt: '6034', tier: 1 },
        { path: 'pics/vert/PNG-image.jpeg', alt: 'PNG Image', tier: 3 },
        { path: 'pics/vert/scooby-doo-l.jpeg', alt: 'Scooby Doo', tier: 3 },
      ],
    },
  },
}

export { imgUrl, imgSrcSet }
export default config
