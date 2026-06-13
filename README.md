# Rebecca & Abhay — Wedding Website

Wedding website for Rebecca and Abhay, featuring events for their US and India weddings with role-based visibility, RSVPs, travel info, and more.

---

## 📋 Google Sheets Configuration

Guest data, RSVP status, and FAQs are stored in a Google Sheets workbook with two worksheets:

| Worksheet | Contents |
|---|---|
| **GUESTS** | Per-guest row: name, contact info, role assignment, RSVP status for both weddings, login history |
| **FAQ** | Questions and answers displayed on the website |

### Data flow

1. A Google Cloud service account (read-only) authenticates the server-side API
2. The API reads from the sheet via the Sheets API and serves the data to the frontend
3. Updates to the sheet appear on the website within minutes
4. The contact form bypasses the sheet entirely — submissions are sent via Nodemailer (SMTP)

### Comment rows

Any row whose first cell begins with `#` is treated as a comment and ignored at read time — useful for notes or disabled entries.

### Role-based visibility

Each guest's **Role** column controls which events they can see after signing in:

| Role | Visible events |
|---|---|
| `bride` / `groom` | All events |
| `close_family` | Events tagged `close_family` or `public` |
| `invited_guest` | Events tagged `public` |
| `vendor` | Events tagged `vendor` |

Unauthenticated visitors see `public` events only. Guest roles are assigned per-row in the sheet; built-in test accounts are also available for previewing each role.

---

## 🔐 Security Practices

| Practice | How it works |
|---|---|
| **API keys hidden** | All keys (Firebase, EmailJS, Google APIs) are stored as environment variables, never in the code. The `.env` file is git-ignored. |
| **CI/CD secrets** | Deploy pipeline reads keys from GitHub encrypted secrets, not from files. |
| **Public keys only in browser** | Only safe-to-expose public keys (e.g. EmailJS public key, Firebase API key) are sent to the browser. Private keys stay server-side. |
| **Service account locked** | The Google service account can only read the one sheet, nothing else. |
| **reCAPTCHA v3** | Contact form is protected by invisible reCAPTCHA. No CAPTCHA challenge needed — just a score check. |
| **Dependencies pinned** | `package-lock.json` locks every dependency version. CI uses `npm ci` for reproducible installs. |
| **CORS restricted** | The API serverless functions only respond to requests from the wedding domain. |

---

## 🛠 Services, APIs & Tools

| Service | What it's used for | Console URL |
|---|---|---|
| **Firebase Auth** | Guest sign-in (Google OAuth + phone) | [Firebase Console](https://console.firebase.google.com) |
| **Google Sheets API** | Guest data and FAQ storage | [Google Cloud Console](https://console.cloud.google.com/apis/credentials) |
| **EmailJS** | Sends verification codes and daily guest report | [EmailJS Dashboard](https://dashboard.emailjs.com) |
| **Vercel** | Hosting and deployment | [Vercel Dashboard](https://vercel.com/abhaysampath/wedding-website) |
| **reCAPTCHA v3** | Contact form spam protection | [reCAPTCHA Admin](https://www.google.com/recaptcha/admin) |
| **jsDelivr CDN** | Image hosting (serves pics from GitHub repo) | [jsDelivr](https://www.jsdelivr.com/github) |
| **GitHub Actions** | Automated testing and deployment | [GitHub Actions](https://github.com/abhaysampath/wedding-website/actions) |
| **GitHub Secrets** | Encrypted storage for all API keys | [Repo Secrets](https://github.com/abhaysampath/wedding-website/settings/secrets/actions) |
| **Nodemailer (Gmail SMTP)** | Emails screenshots and contact form submissions | [Gmail App Passwords](https://myaccount.google.com/apppasswords) |

---

## 👥 User Roles & Visibility

| Role | Code | Can See |
|---|---|---|
| **Bride** | `bride` | All events + family hotel options |
| **Groom** | `groom` | All events |
| **Close Family** | `close_family` | Events tagged `close_family` or `public` |
| **Invited Guest** | `invited_guest` | Events tagged `public` only |
| **Vendor** | `vendor` | Events tagged `vendor` only |

Each guest's `role` is assigned in the Google Sheet. Unauthenticated visitors see only `public` events.

---

## 🚀 Quick Start

```bash
git clone https://github.com/abhaysampath/wedding-website.git
cd wedding-website
npm install
cp .env.example .env    # then fill in the values (see Services table above)
npm run dev
```

---

## 📦 Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start dev server (Vite + local API) on port 5173 |
| `npm run build` | Verify env vars, validate images, build for production |
| `npm test` | Run all unit tests (Vitest) |
| `npm run test:local` | Same as `npm test` — all local-run-safe tests |
| `npm run test:full` | Unit tests + production build (matches CI) |
| `npm run deploy` | Build + deploy to Vercel production |
| `npm run preview` | Serve the production build locally (port 4173) |
| `npm run preview:check` | Start preview server on 3002, takes 2 mobile screenshots, emails them |
| `npm run e2e:local` | Run E2E browser tests against `http://localhost:3000` |
| `npm run e2e:prod` | Run E2E browser tests against production |
| `npm run sync` | Sync guest data from Google Sheet to local fallback |
| `npm run lint` | Run ESLint |

---

## 🏗 Architecture

```
├── api/                  # Vercel serverless functions
│   ├── contact.mjs       #   Contact form handler (Nodemailer)
│   ├── faq.mjs           #   FAQ from Google Sheets
│   └── guests.mjs        #   Guest list from Google Sheets
├── scripts/              # Build, deploy, test, utility scripts
│   ├── deploy-e2e.mjs    #   Browser-based E2E smoke tests (Puppeteer)
│   ├── preview-check.mjs #   Pre-deploy mobile screenshots via email
│   ├── daily-report.mjs  #   Scheduled guest activity report
│   ├── verify-build.mjs  #   Env check → image validation → vite build
│   └── sync-guests.mjs   #   Pull guest data from Sheet to local file
├── public/
│   └── pics/             # Site images (served via jsDelivr CDN)
├── src/
│   ├── components/       # React components
│   ├── context/          # Auth context & provider
│   ├── data/             # weddings.json (events), guests.js (fallback)
│   ├── utils/            # Helper functions
│   ├── config.js         # App-wide configuration
│   └── main.jsx          # Entry point
└── .github/workflows/    # CI/CD pipelines
    ├── test.yml          #   Test, build, visual check, deploy
    ├── daily-report.yml  #   Daily guest activity report
    └── status-check.yml  #   Hourly production health check
```

---

## 📄 Environment Variables

See `.env.example` for all required variables. Each key is sourced from one of the services in the table above.

| Variable | Source |
|---|---|
| `GOOGLE_SHEET_ID`, `GOOGLE_SERVICE_EMAIL`, `GOOGLE_PRIVATE_KEY` | Google Cloud Console → Service Account |
| `VITE_FIREBASE_*` | Firebase Console → Project Settings → Web apps |
| `VITE_EMAILJS_*` | EmailJS Dashboard → Services / Templates / API Keys |
| `VITE_RECAPTCHA_SITE_KEY`, `RECAPTCHA_SECRET_KEY` | reCAPTCHA Admin Console |
| `SMTP_USER`, `SMTP_PASS` | Gmail → App Passwords |
| `VERCEL_TOKEN` | Vercel Dashboard → Settings → Tokens |

---

## 🔄 CI/CD Pipeline

Every push to `main` automatically:

1. Runs unit tests (`vitest`)
2. Validates all image assets are present on the CDN
3. Builds the production bundle
4. Spins up a preview server
5. Runs E2E browser smoke tests (Puppeteer) against the preview
6. Takes 2 mobile screenshots and emails them for visual review
7. Deploys to Vercel production
8. Runs E2E smoke tests against the live production URL
9. If anything fails, the deploy is blocked and an error is logged

Additionally, a daily report of guest activity is emailed each morning, and an hourly health check monitors the production URL.

---

## 🌐 Environment-Specific Test Matrix

| Environment | Unit Tests | E2E Tests | Screenshots | Deploy |
|---|---|---|---|---|
| Local (`npm run dev`) | ✓ (`npm test`) | ✓ (`npm run e2e:local`) | ✓ (`npm run preview:check`) | — |
| CI — PR to `main` | ✓ | ✓ (preview) | — | — |
| CI — Push to `main` | ✓ | ✓ (preview + prod) | ✓ | ✓ Vercel prod |
