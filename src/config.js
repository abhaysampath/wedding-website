const IMAGE_CDN = 'https://cdn.jsdelivr.net/gh/abhaysampath/wedding-website@main/public'

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
      dir: `${IMAGE_CDN}/pics/vert/`,
      slides: [
        { file: 'ar-w-akshay.jpeg', alt: 'Ar W Akshay' },
        { file: 'belize-engagement.jpeg', alt: 'Belize Engagement' },
        { file: 'belize-sunset-l.jpeg', alt: 'Belize Sunset' },
        { file: 'gala4.JPG', alt: 'Gala 4' },
        { file: 'nyc.JPG', alt: 'NYC' },
        { file: 'save-the-date.JPEG', alt: 'Save the Date' },
        { file: 'scooby-doo2.jpeg', alt: 'Scooby Doo 2' },
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
      dir: `${IMAGE_CDN}/pics/vert/`,
      slides: [
        { file: 'BNE-l.jpeg', alt: 'BNE' },
        { file: 'botgrdn-w-geordi.jpeg', alt: 'Botanical Garden with Geordi' },
        { file: 'diwali.jpeg', alt: 'Diwali' },
        { file: 'gala-l.jpeg', alt: 'Gala' },
        { file: 'IMG_1197.jpeg', alt: '1197' },
        { file: 'IMG_3031.jpeg', alt: '3031' },
        { file: 'IMG_3982.JPG', alt: '3982' },
        { file: 'IMG_4340.jpeg', alt: '4340' },
        { file: 'IMG_4388.JPG', alt: '4388' },
        { file: 'IMG_6034.JPG', alt: '6034' },
        { file: 'PNG-image.jpeg', alt: 'PNG Image' },
        { file: 'scooby-doo-l.jpeg', alt: 'Scooby Doo' },
      ],
    },
    gallery: {
      home: [
        { file: 'ar-w-akshay.jpeg', alt: 'Ar W Akshay', tier: 2, dir: 'vert' },
        { file: 'belize-engagement.jpeg', alt: 'Belize Engagement', tier: 1 },
        { file: 'belize-sunset-l.jpeg', alt: 'Belize Sunset', tier: 1 },
        { file: 'gala4.JPG', alt: 'Gala 4', tier: 2 },
        { file: 'nyc.JPG', alt: 'NYC', tier: 2 },
        { file: 'save-the-date.JPEG', alt: 'Save the Date', tier: 2 },
        { file: 'scooby-doo2.jpeg', alt: 'Scooby Doo 2', tier: 3 },
      ],
      gallery: [
        { file: 'belize3.jpeg', alt: 'Belize 3', tier: 2 },
        { file: 'bk-w-geordi.jpeg', alt: 'BK with Geordi', tier: 2 },
        { file: 'botanical-garden.jpeg', alt: 'Botanical Garden', tier: 2 },
        { file: 'eng-smiles.jpeg', alt: 'Engagement Smiles', tier: 2 },
        { file: 'family.JPG', alt: 'Family', tier: 2 },
        { file: 'gala2.jpeg', alt: 'Gala 2', tier: 2 },
        { file: 'mural-selfie.jpeg', alt: 'Mural Selfie', tier: 2 },
        { file: 'nich.jpeg', alt: 'Nich', tier: 2 },
        { file: 'ra-and-steve.jpeg', alt: 'Ra & Steve', tier: 2 },
      ],
      vert: [
        { file: 'BNE-l.jpeg', alt: 'BNE', tier: 3 },
        { file: 'botgrdn-w-geordi.jpeg', alt: 'Botanical Garden with Geordi', tier: 2 },
        { file: 'diwali.jpeg', alt: 'Diwali', tier: 3 },
        { file: 'gala-l.jpeg', alt: 'Gala', tier: 2 },
        { file: 'IMG_1197.jpeg', alt: '1197', tier: 1 },
        { file: 'IMG_3031.jpeg', alt: '3031', tier: 1 },
        { file: 'IMG_3982.JPG', alt: '3982', tier: 1 },
        { file: 'IMG_4340.jpeg', alt: '4340', tier: 1 },
        { file: 'IMG_4388.JPG', alt: '4388', tier: 1 },
        { file: 'IMG_6034.JPG', alt: '6034', tier: 1 },
        { file: 'PNG-image.jpeg', alt: 'PNG Image', tier: 3 },
        { file: 'scooby-doo-l.jpeg', alt: 'Scooby Doo', tier: 3 },
      ],
    },
  },
}

export default config
