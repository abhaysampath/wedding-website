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
    sheetUrl: 'https://docs.google.com/spreadsheets/d/17A-I1oIBfbG9c4oAiUqCr11RhOWFCXvkZM_IyzgKgqc/edit?usp=sharing',
  },
  sheets: {
    mode: 'api', // 'api' → /api/content (Google Sheets API, needs billing)
                  // 'csv' → published CSV URL (no billing needed)
    guestsCsv: null,
    columns: {
      firstName: 'First Name',
      lastName: 'Last Name',
      relationship: 'Relationship',
      role: 'Role',
      weddings: 'Invited To',
      plusOne: 'Plus One',
      email: 'Email Address',
      phone: 'Phone Number',
      lastLogin: 'LastLogin',
    },
    roleMap: {
      'Bride': 'bride',
      'Groom': 'groom',
      'CloseFamily': 'close_family',
      'Br-Family': 'family',
    },
    plusOneMap: {
      'N/A': false,
      'Allowed+1': true,
      '+1NOTALLOWED': false,
    },
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
}

export default config
