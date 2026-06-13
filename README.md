# Rebecca & Abhay — Wedding Website

Wedding website for Rebecca and Abhay, featuring events for their US and India weddings with role-based visibility, RSVPs, travel info, and more.

## Quick Start

```bash
git clone https://github.com/abhaysampath/wedding-website.git
cd wedding-website
npm install
cp .env.example .env    # then fill in the values
npm run dev
```

## User Roles & Visibility

The site uses role-based visibility to control what each guest can see. Every timeline event in `src/data/weddings.json` has a `visibility` field that determines who can view it.

| Role | Code Value | Can See |
|---|---|---|
| **Bride** | `bride` | All events + bride's family hotel options |
| **Groom** | `groom` | All events |
| **Close Family** | `close_family` | Events tagged `close_family` or `public` |
| **Invited Guest** | `invited_guest` | Events tagged `public` only |
| **Vendor** | `vendor` | Events tagged `vendor` only |

**How it works:** Each guest is assigned a `role` in the Google Sheet (or the `src/data/guests.js` fallback). When a guest signs in, the site compares their role against each event's `visibility` field and only renders events they're allowed to see. Unauthenticated visitors see only `public` events.

## Tech Stack

- **React 19** — UI framework
- **Vite 8** — Build tool and dev server
- **Tailwind CSS v4** — Utility-first styling
- **Firebase Auth** — Google OAuth and email/phone sign-in
- **Google Sheets API** — Guest data, RSVPs, FAQs
- **EmailJS** — Verification code emails
- **Nodemailer** — Contact form backend (server-side)
- **Framer Motion** — Animations and transitions
- **Vercel** — Hosting and deployment

## Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start the dev server (Vite + local API server) |
| `npm run build` | Verify and build for production |
| `npm test` | Run unit tests (Vitest) |
| `npm run deploy` | Build + deploy to Vercel production |
| `npm run e2e` | Deploy a preview environment and run Playwright e2e tests |
| `npm run e2e:local` | Run e2e tests against `http://localhost:3000` |
| `npm run e2e:prod` | Run e2e tests against the production site |

## Architecture

```
├── api/            # Vercel serverless functions (Google Sheets proxy, contact form)
├── scripts/        # Build, deploy, e2e, and utility scripts
├── public/
│   ├── pics/       # Images served via CDN
│   └── fonts/      # Custom typefaces
├── src/
│   ├── components/ # React components
│   ├── context/    # Auth context & provider
│   ├── data/       # weddings.json (event data), guests.js (fallback guest list)
│   ├── utils/      # Helpers (guest, time, etc.)
│   ├── config.js   # App-wide configuration
│   ├── firebase.js # Firebase initialization
│   └── main.jsx    # Entry point
└── data/           # Guest list backup files
```

## Environment Variables

See `.env.example` for all required variables. At a minimum you need:

- **Google Sheets API** — Sheet ID, service account email, and private key
- **Firebase** — API key, auth domain, and project ID (from Firebase Console)
- **EmailJS** — Service ID, template IDs, and public key
- **reCAPTCHA v3** — Site key and secret key (for contact form spam protection)
