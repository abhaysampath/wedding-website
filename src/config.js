const IMAGE_CDN = 'https://cdn.jsdelivr.net/gh/abhaysampath/wedding-website@main/public'

const config = {
  debug: false,
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
    sheetUrl: `https://docs.google.com/spreadsheets/d/${import.meta.env.GOOGLE_SHEET_ID || ''}/edit?usp=sharing`,
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
    publicKey: import.meta.env.VITE_EMAILJS_PUBLIC_KEY || '',
  },
  recaptcha: {
    siteKey: import.meta.env.VITE_RECAPTCHA_SITE_KEY || '',
  },
  images: {
    baseUrl: IMAGE_CDN,
    hero: {
      dir: `${IMAGE_CDN}/jpg/home/`,
      slides: [
        { file: 'hero.jpeg', alt: 'Hero' },
        { file: 'home1.jpeg', alt: 'Home 1' },
        { file: 'home2.JPG', alt: 'Home 2' },
        { file: 'home3.JPG', alt: 'Home 3' },
      ],
      interval: 10000,
      personalized: {
        groom: { file: 'ra-and-ak.JPG', alt: 'Ra & Ak' },
        bride: { file: 'kiss.jpg', alt: 'Kiss' },
      },
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
      dir: `${IMAGE_CDN}/jpg/vert/`,
      slides: [
        { file: 'diwali.jpeg', alt: 'Diwali' },
        { file: 'hero1.JPG', alt: 'Hero 1' },
        { file: 'IMG_1197.jpeg', alt: '1197' },
        { file: 'IMG_1781.jpeg', alt: '1781' },
        { file: 'IMG_3031.jpeg', alt: '3031' },
        { file: 'IMG_3982.JPG', alt: '3982' },
        { file: 'IMG_4340.jpeg', alt: '4340' },
        { file: 'IMG_4388.JPG', alt: '4388' },
        { file: 'IMG_6034.JPG', alt: '6034' },
      ],
    },
    gallery: {
      home: [
        { file: 'hero.jpeg', alt: 'Hero', tier: 1 },
        { file: 'home1.jpeg', alt: 'Home 1', tier: 1 },
        { file: 'home2.JPG', alt: 'Home 2', tier: 2 },
        { file: 'home3.JPG', alt: 'Home 3', tier: 2 },
        { file: 'kiss.jpg', alt: 'Kiss', tier: 1 },
        { file: 'ra-and-ak.JPG', alt: 'Ra & Ak', tier: 1 },
      ],
      gallery: [
        { file: 'eng-smiles.jpeg', alt: 'Eng Smiles', tier: 2 },
        { file: 'IMG_0623.jpeg', alt: '0623', tier: 2 },
        { file: 'IMG_1732.jpeg', alt: '1732', tier: 2 },
        { file: 'IMG_4705.jpeg', alt: '4705', tier: 2 },
        { file: 'IMG_4816.jpeg', alt: '4816', tier: 2 },
        { file: 'IMG_6747.jpeg', alt: '6747', tier: 3 },
        { file: 'nich.jpeg', alt: 'Nich', tier: 2 },
        { file: 'ra-and-steve.jpeg', alt: 'Ra & Steve', tier: 2 },
      ],
      vert: [
        { file: 'diwali.jpeg', alt: 'Diwali', tier: 3 },
        { file: 'hero1.JPG', alt: 'Hero 1', tier: 2 },
        { file: 'IMG_1197.jpeg', alt: '1197', tier: 1 },
        { file: 'IMG_1781.jpeg', alt: '1781', tier: 1 },
        { file: 'IMG_3031.jpeg', alt: '3031', tier: 1 },
        { file: 'IMG_3982.JPG', alt: '3982', tier: 1 },
        { file: 'IMG_4340.jpeg', alt: '4340', tier: 1 },
        { file: 'IMG_4388.JPG', alt: '4388', tier: 1 },
        { file: 'IMG_6034.JPG', alt: '6034', tier: 1 },
      ],
    },
  },
}

export default config
