# Rebecca & Abhay — Wedding Website

Wedding website for Rebecca and Abhay, featuring events for their US and India weddings with role-based visibility, RSVPs, travel info, and more.

---

## 📋 Google Sheets Configuration

Guest data, RSVP status, and FAQs are stored in a [Google Sheets](https://sheets.google.com) workbook with two worksheets:

| Worksheet | Contents |
|---|---|
| **GUESTS** | Per-guest row: name, contact info, role assignment, RSVP status for both weddings, login history |
| **FAQ** | Questions and answers displayed on the website |

### Data flow

1. A [Google Cloud](https://cloud.google.com) service account (read-only) authenticates the server-side API
2. The API reads from the sheet via the [Sheets API](https://developers.google.com/sheets/api) and serves the data to the frontend
3. Updates to the sheet appear on the website within minutes
4. The contact form bypasses the sheet entirely — submissions are sent via [Nodemailer](https://nodemailer.com) (SMTP)

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
| **API keys hidden** | All keys ([Firebase](https://firebase.google.com), [EmailJS](https://www.emailjs.com), Google APIs) are stored as environment variables, never in the code. The [`.env`](https://github.com/abhaysampath/wedding-website/blob/main/.env.example) file is git-ignored. |
| **CI/CD secrets** | Deploy pipeline reads keys from [GitHub encrypted secrets](https://github.com/abhaysampath/wedding-website/settings/secrets/actions), not from files. |
| **Public keys only in browser** | Only safe-to-expose public keys (e.g. EmailJS public key, Firebase API key) are sent to the browser. Private keys stay server-side. |
| **Service account locked** | The Google service account can only read the one sheet, nothing else. |
| **[reCAPTCHA v3](https://www.google.com/recaptcha/about/)** | Contact form is protected by invisible reCAPTCHA. No CAPTCHA challenge needed — just a score check. |
| **Dependencies pinned** | [`package-lock.json`](https://github.com/abhaysampath/wedding-website/blob/main/package-lock.json) locks every dependency version. CI uses `npm ci` for reproducible installs. |
| **CORS restricted** | The API serverless functions only respond to requests from the wedding domain, enforced by [Vercel](https://vercel.com) configuration. |

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
cp [.env.example](https://github.com/abhaysampath/wedding-website/blob/main/.env.example) .env    # then fill in the values (see Services table above)
npm run dev
```

---

## 📦 Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start dev server (Vite + local API) on port 5173 |
| `npm run build` | Verify env vars, validate images, build for production |
| `npm test` | Run all unit tests ([Vitest](https://vitest.dev)) |
| `npm run test:local` | Same as `npm test` — all local-run-safe tests |
| `npm run test:full` | Unit tests + production build (matches CI) |
| `npm run deploy` | Build + deploy to Vercel production |
| `npm run preview` | Serve the production build locally (port 4173) |
| `npm run preview:check` | Start preview server on 3002, takes 2 mobile screenshots, emails them |
| `npm run e2e:local` | Run E2E browser tests against `http://localhost:3000` |
| `npm run e2e:prod` | Run E2E browser tests against production |
| `npm run sync` | Sync guest data from Google Sheet to local fallback |
| `npm run lint` | Run [ESLint](https://eslint.org) |

---

## 🏗 Architecture

```
├── api/                  # Vercel serverless functions
│   ├── [contact.mjs](https://github.com/abhaysampath/wedding-website/blob/main/api/contact.mjs)       #   Contact form handler (Nodemailer)
│   ├── [faq.mjs](https://github.com/abhaysampath/wedding-website/blob/main/api/faq.mjs)           #   FAQ from Google Sheets
│   └── [guests.mjs](https://github.com/abhaysampath/wedding-website/blob/main/api/guests.mjs)        #   Guest list from Google Sheets
├── [scripts/](https://github.com/abhaysampath/wedding-website/tree/main/scripts)              # Build, deploy, test, utility scripts
│   ├── [deploy-e2e.mjs](https://github.com/abhaysampath/wedding-website/blob/main/scripts/deploy-e2e.mjs)    #   Browser-based E2E smoke tests (Puppeteer)
│   ├── [preview-check.mjs](https://github.com/abhaysampath/wedding-website/blob/main/scripts/preview-check.mjs) #   Pre-deploy mobile screenshots via email
│   ├── [daily-report.mjs](https://github.com/abhaysampath/wedding-website/blob/main/scripts/daily-report.mjs)  #   Scheduled guest activity report
│   ├── [verify-build.mjs](https://github.com/abhaysampath/wedding-website/blob/main/scripts/verify-build.mjs)  #   Env check → image validation → vite build
│   └── [sync-guests.mjs](https://github.com/abhaysampath/wedding-website/blob/main/scripts/sync-guests.mjs)   #   Pull guest data from Sheet to local file
├── public/
│   └── [pics/](https://github.com/abhaysampath/wedding-website/tree/main/public/pics)             # Site images (served via [jsDelivr CDN](https://www.jsdelivr.com/github))
├── [src/](https://github.com/abhaysampath/wedding-website/tree/main/src)
│   ├── [components/](https://github.com/abhaysampath/wedding-website/tree/main/src/components)       # React components
│   ├── [context/](https://github.com/abhaysampath/wedding-website/tree/main/src/context)          # Auth context & provider
│   ├── [data/](https://github.com/abhaysampath/wedding-website/tree/main/src/data)             # weddings.json (events), guests.js (fallback)
│   ├── [utils/](https://github.com/abhaysampath/wedding-website/tree/main/src/utils)            # Helper functions
│   ├── [config.js](https://github.com/abhaysampath/wedding-website/blob/main/src/config.js)         # App-wide configuration
│   └── [main.jsx](https://github.com/abhaysampath/wedding-website/blob/main/src/main.jsx)          # Entry point
└── [.github/workflows/](https://github.com/abhaysampath/wedding-website/tree/main/.github/workflows)    # CI/CD pipelines
    ├── [test.yml](https://github.com/abhaysampath/wedding-website/blob/main/.github/workflows/test.yml)          #   Test, build, visual check, deploy
    ├── [daily-report.yml](https://github.com/abhaysampath/wedding-website/blob/main/.github/workflows/daily-report.yml)  #   Daily guest activity report
    └── [status-check.yml](https://github.com/abhaysampath/wedding-website/blob/main/.github/workflows/status-check.yml)  #   Hourly production health check
```

---

## 📄 Environment Variables

See [`.env.example`](https://github.com/abhaysampath/wedding-website/blob/main/.env.example) for all required variables. Each key is sourced from one of the services in the table above.

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
5. Runs E2E browser smoke tests ([Puppeteer](https://pptr.dev)) against the preview
6. Takes 2 mobile screenshots and emails them for visual review
7. Deploys to [Vercel](https://vercel.com) production
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

