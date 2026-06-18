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

1. A [Google Cloud](https://cloud.google.com) service account authenticates the server-side API
2. The API reads from the sheet via the [Sheets API](https://developers.google.com/sheets/api) and serves the data to the frontend
3. Guest RSVP/contact updates are written back to the sheet via authenticated PATCH requests
4. The contact form bypasses the sheet entirely — submissions are sent via [Nodemailer](https://nodemailer.com) (SMTP)

---

### GUESTS tab — column reference

Columns are detected dynamically by header name (case-insensitive), so column order in the sheet is flexible. The read range is `A:R` (18 columns).

#### A — Title

Controls row classification. Affects visibility, search, and reports.

| Value | Behavior |
|---|---|
| _(empty)_ | Normal guest row. Visible in search, reports, and sitemap. |
| `KIDS` | Row is **never sent** to the client — filtered server-side by `api/content.js`. Use for children to keep nav and sitemap clean. |
| `TEST` | Appears in search **only** if the search term contains "TEST" (case-sensitive). Excluded from daily-report totals and sitemap. |
| `#...` | Any value starting with `#` is treated as a comment — blanked out at read time. Useful for notes or temporarily disabled rows. |

#### B — First Name / D — Last Name

Used for: guest search (name dropdown), URL slug (`/g/jane-doe`), welcome message, and name-based auth bootstrap. Two guests can share the same name — search returns all matches.

#### C — Middle Initial

Optional. Not consumed by any logic — present for reference.

#### E — Relationship

Free-text descriptor displayed alongside the guest name in search results. Also used to infer `side` (bride/groom) — if the text contains "abhay" the guest is tagged as groom's side; "rebecca" as bride's side.

#### F — Role

Controls event visibility. Raw sheet values are mapped to internal roles:

| Sheet value | Internal role | Sees |
|---|---|---|
| `Bride` | `bride` | All events |
| `Groom` | `groom` | All events |
| `CloseFamily` | `close_family` | Pre-ceremony + public events |
| `Br-Family`, `Br-Friends` | `invited_guest` | Public events only |
| `Gr-Family`, `Gr-Friends` | `invited_guest` | Public events only |
| _(anything else)_ | `invited_guest` | Public events only (safe default) |

Unauthenticated visitors see `public` events only.

#### G — Invited To

Controls which wedding tab(s) the guest sees and which RSVP fields are editable.

| Value | Guest sees | Editable RSVP |
|---|---|---|
| `both` | US + India tabs | rsvpUs + rsvpIndia |
| `us` | US tab only | rsvpUs |
| `india` | India tab only | rsvpIndia |

Parsing is case-insensitive substring match: `BOTH`, `Both`, `both` all work.

#### H — Plus One

Authorizes one guest to edit RSVPs for others in their group.

| Value | Meaning |
|---|---|
| `N/A` | No plus-one group. Guest edits only their own RSVP. |
| `+1NOTALLOWED` | Reserved. Currently behaves identically to `N/A`. |
| `Allowed+1` | This guest can RSVP for themselves AND for every consecutive guest below them whose Plus One is `Is+1`. |
| `Is+1` | This guest is a plus one. Cannot sign in independently — the `Allowed+1` guest above edits their RSVP. |

**Plus One group formation rules** (server-side, `api/guest/[id].js`):

Scan downward from the `Allowed+1` row, collecting consecutive `Is+1` rows. Stop at the first row whose Plus One is **not** `Is+1`.

| Scenario | Group | Who can edit |
|---|---|---|
| Row 3: `Allowed+1` → Row 4: `Is+1` → Row 5: `Is+1` → Row 6: `N/A` | {3, 4, 5} | Row 3 edits RSVPs for rows 4 and 5 |
| Row 3: `Allowed+1` → Row 4: `N/A` | {3} | Row 3 has no one to edit |
| Row 3: `N/A` → Row 4: `Is+1` | {} | Row 3 cannot see the `Is+1` below them |

Only `rsvpUs`, `rsvpIndia`, and `dietaryPreferences` are synced for group members. Phone/email/address are **not** editable by the `Allowed+1` guest.

#### I — Email Address / J — Phone Number / K — Mailing Address

Used for sign-in verification:

- **Google OAuth** — no column needed. Firebase matches by name or email.
- **Email link** — a 6-digit code is sent to the guest's email. Column I is required.
- **SMS code** — a 6-digit code is sent to the guest's phone (US numbers only). Column J is required.
- **Name-only** — if a guest has no email or phone, they can simply search their name and sign in without verification. Works for any row.

Email and phone are partially masked in the UI (e.g. `j***@example.com`, `***-***-1234`).

#### L — Dietary Preferences

Free text. Editable by the guest and by their `Allowed+1` group manager.

#### M — LastLogin / N — LastUpdated / P — LoginFailed

Auto-written timestamps for monitoring:

| Column | When written | Value |
|---|---|---|
| LastLogin | Every successful sign-in | ISO timestamp (Eastern Time) |
| LastUpdated | Every successful PATCH | ISO timestamp (Eastern Time) |
| LoginFailed | On failed attempt | ISO timestamp; on success, literal `SUCCESS` |

#### O — FirebaseUID

Links a Firebase Auth account to this guest row. Auto-written on the first successful PATCH from an authenticated Firebase user.

- **Before write:** auth is checked by email match → name similarity (≥0.4) → admin override
- **After write:** auth checks `uid` matches the stored value (stricter)

#### Q — US-RSVP / R — India-RSVP

| Value | Meaning |
|---|---|
| _(empty)_ | Not yet responded |
| `YES` | Attending |
| `NO` | Not attending |

Guests see only the RSVP field(s) for wedding(s) they are invited to. Editable by the guest themselves and by their `Allowed+1` group manager.

---

### FAQ tab — column reference

Read range is `A:C` (3 columns).

#### A — Question

Displayed as the FAQ heading on the website. Plain text (HTML is not rendered).

#### B — Answer

Displayed as the FAQ body. Plain text.

#### C — WhichWedding

Controls which wedding page shows this FAQ item.

| Value | Shown on |
|---|---|
| `both` | Both US and India pages (default if column is missing) |
| `us` | US page only |
| `india` | India page only |
| `hide` | Not shown on any public page (useful for drafts) |

If the `WhichWedding` column header is missing from the sheet entirely, **all** FAQ items are shown (no filtering). The site logs a console warning but works fine.

---

### How reads work

1. `GET /api/content` reads both GUESTS and FAQ tabs
2. Column headers are matched case-insensitively — order in the sheet does not matter
3. KIDS rows are filtered out (never sent to the client)
4. Comment rows (`#` prefix) are blanked to empty strings
5. Responses are cached in-memory for 60 seconds
6. Cache is invalidated on every successful PATCH to the GUESTS tab
7. Column-name-to-index mapping is cached per Lambda instance

### How writes work

`PATCH /api/guest/:id` accepts a JSON body with any of these writable fields:

`phone`, `email`, `address`, `dietaryPreferences`, `lastLogin`, `lastUpdated`, `loginFailed`, `rsvpUs`, `rsvpIndia`

**Auth chain** (checked in order):

1. **Email match** — the authenticated Firebase user's email matches the sheet row's email
2. **UID match** — the authenticated user's `uid` matches the stored `FirebaseUID`
3. **Name bootstrap** — if `FirebaseUID` is empty and no strict match, name similarity ≥0.4 is checked; on success, the uid is auto-written to the sheet
4. **Admin override** — internal `X-Admin-Key` header bypasses all checks

**Rate limits** (per client IP, in-memory token bucket):

| Endpoint | Limit |
|---|---|
| `GET /api/content` | 60/minute |
| `PATCH /api/guest/:id` | 10/minute |
| `POST /api/contact` | 5/minute |
| `POST /api/alert-error` | 30/minute |
| `POST /api/auth/session` | 20/minute |

### Sitemap

`scripts/build-sitemap.mjs` reads the GUESTS tab at build time and generates `public/sitemap.xml` with one entry per guest (`/g/firstname-lastname`). KIDS rows are excluded. Falls back to `src/data/guests.js` if the sheet is unavailable.

### Daily report

`scripts/daily-report.mjs` (scheduled via GitHub Actions) reads the sheet, computes RSVP totals and login activity, and emails a summary. TEST rows are excluded from all totals.

---

### Role-based visibility

Each guest's **Role** column controls which events they can see after signing in:

| Role | Visible events |
|---|---|
| `bride` / `groom` | All events |
| `close_family` | Events tagged `close_family` or `public` |
| `invited_guest` | Events tagged `public` |
| `vendor` | Events tagged `vendor` |

Unauthenticated visitors see `public` events only.

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
| **Resend** | Error-alert emails (server-side) | [Resend Dashboard](https://resend.com) |

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

## 📚 Additional documentation

- [`AGENTS.md`](./AGENTS.md) — Instructions for AI coding agents and humans working on the repo.
- [`CONFIG.md`](./CONFIG.md) — `src/config.js` reference.
- [`CHANGELOG.md`](./CHANGELOG.md) — Release history.
- [`SECURITY.md`](./SECURITY.md) — Vulnerability disclosure policy.
- [`docs/ci-cd-setup.md`](./docs/ci-cd-setup.md) — Pipeline details.
- [`docs/test-account.md`](./docs/test-account.md) — Test credentials.
- [`docs/v1-suggestions.md`](./docs/v1-suggestions.md) — Queued v1.x improvements ranked by criticality.

---

## 🌐 Environment-Specific Test Matrix

| Environment | Unit Tests | E2E Tests | Screenshots | Deploy |
|---|---|---|---|---|
| Local (`npm run dev`) | ✓ (`npm test`) | ✓ (`npm run e2e:local`) | ✓ (`npm run preview:check`) | — |
| CI — PR to `main` | ✓ | ✓ (preview) | — | — |
| CI — Push to `main` | ✓ | ✓ (preview + prod) | ✓ | ✓ Vercel prod |

