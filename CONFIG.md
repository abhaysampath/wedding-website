# Configuration Reference

All site configuration lives in `src/config.js`. Environment variables (prefixed with
`VITE_`) are set in `.env` or the Vercel dashboard.

---

## `site`

| Key | Type | Purpose |
|-----|------|---------|
| `siteTitle` | string | Browser tab title |
| `coupleNames.bride` | string | Bride's first name |
| `coupleNames.groom` | string | Groom's first name |
| `theme.primary` | hex | Sage green used throughout the UI |
| `theme.background` | hex | Cream page background |
| `theme.accent` | hex | Gold accent color |
| `theme.text` | hex | Charcoal body text |

**How to populate:** Edit the object directly in `src/config.js`.

---

## `google`

| Key | Type | Purpose |
|-----|------|---------|
| `sheetUrl` | string | Link to the Google Sheet (displayed to admin) |

**How to populate:** Set the URL of your guest/FAQ spreadsheet.

---

## `sheets`

Controls how guest and FAQ data is loaded.

| Key | Type | Default | Purpose |
|-----|------|---------|---------|
| `mode` | `"api"` | `"api"` | Data source. `"api"` reads from `/api/content` server function. |
| `guestsCsv` | string\|null | `null` | Alternative CSV URL (not currently used — reserved) |

### `columns`

Maps sheet column headers to internal fields. Update these if your Google Sheet
uses different header names:

| Key | Expected Header |
|-----|-----------------|
| `firstName` | `First Name` |
| `lastName` | `Last Name` |
| `relationship` | `Relationship` |
| `role` | `Role` |
| `weddings` | `Invited To` |
| `plusOne` | `Plus One` |
| `email` | `Email Address` |
| `phone` | `Phone Number` |
| `lastLogin` | `LastLogin` |

### `roleMap`

Maps raw sheet role values to internal role keys:
- `"Bride"` → `"bride"`
- `"Groom"` → `"groom"`
- `"CloseFamily"` → `"close_family"`
- `"Br-Family"` → `"family"`

### `plusOneMap`

Maps raw plus-one values to booleans:
- `"N/A"` → `false`
- `"Allowed+1"` → `true`
- `"+1NOTALLOWED"` → `false`

**How to populate:** If your sheet uses different column headers, update the
matching string in `columns`. If your sheet uses different role/plus-one labels,
update `roleMap` / `plusOneMap`.

---

## `firebase`

| Key | Environment Variable | Purpose |
|-----|---------------------|---------|
| `apiKey` | `VITE_FIREBASE_API_KEY` | Firebase project API key |
| `authDomain` | `VITE_FIREBASE_AUTH_DOMAIN` | Firebase auth domain (project.firebaseapp.com) |
| `projectId` | `VITE_FIREBASE_PROJECT_ID` | Firebase project ID |

**How to populate:** Set these in `.env` (local) or in the Vercel dashboard under
Project Settings → Environment Variables. Values come from your Firebase project's
Project Settings → General → Your apps → Web app.

---

## `emailjs`

| Key | Environment Variable | Purpose |
|-----|---------------------|---------|
| `serviceId` | `VITE_EMAILJS_SERVICE_ID` | EmailJS service ID |
| `templateId` | `VITE_EMAILJS_TEMPLATE_ID` | EmailJS template ID |
| `publicKey` | `VITE_EMAILJS_PUBLIC_KEY` | EmailJS public API key |

**How to populate:** Set these in `.env` or Vercel dashboard. Create a free
EmailJS account, add an Email Service, and create a Transactional template.
The template should accept these variables:
- `{{email}}` — recipient address
- `{{name}}` — recipient name
- `{{code}}` — 6-digit verification code
- `{{verify_link}}` — full URL including `?code=XXXX`

---

## `images`

All image paths are relative to the `public/` directory. Images live in
subdirectories of `public/jpg/`.

### `images.hero`

Controls the full-screen hero slideshow on the home page.

| Key | Type | Default | Purpose |
|-----|------|---------|---------|
| `dir` | string | `/jpg/home/` | Directory containing hero slides |
| `slides` | array | 4 slides | Images to cycle through (10s interval) |
| `interval` | number | `10000` | Milliseconds between auto-advance |
| `personalized.groom` | object | `ra-and-ak.JPG` | First image shown to Abhay's family |
| `personalized.bride` | object | — | Removed — no personalized image for Rebecca's family |
| `contact.reasons` | array | 5 reasons | Dropdown options for the contact form on the last slide |

Each `slide` / personalized entry needs `{ file, alt }`:

```js
{ file: 'hero.jpeg', alt: 'Hero' }
```

Each contact reason needs `{ value, label }` — the label appears in the dropdown
and is prepended to the email subject when a message is sent:

```js
{ value: 'login', label: 'Login Trouble' }
```

**How to populate:** Place JPG files in `public/jpg/home/`. List them in
`slides[]` with a descriptive `alt`. Set `personalized` if you want different
first images per family side. Edit `contact.reasons` to change the dropdown
options — the `label` is used as `[Label]` prefix in the email subject.

---

### `images.ourStory`

Controls the photo slideshow on the "Our Story" section.

| Key | Type | Purpose |
|-----|------|---------|
| `dir` | string | Directory containing story photos (`/jpg/vert/`) |
| `slides` | array | Images to cycle through (5s interval) |

**How to populate:** Place vertical/portrait images in `public/jpg/vert/`. List
each as `{ file, alt }` in `slides[]`.

---

### `images.gallery`

Controls the horizontal scrolling gallery section.

Each sub-key is a gallery source directory mapped to `DIR_MAP`:
- `home/` → `public/jpg/home/`
- `gallery/` → `public/jpg/gallery/`
- `vert/` → `public/jpg/vert/`

Each image entry:

```js
{ file: 'hero.jpeg', alt: 'Hero', tier: 1 }
```

The `tier` field controls card size (1 = closest/largest, 3 = farthest/smallest).

**How to populate:** Add image files to `public/jpg/home/`, `public/jpg/gallery/`,
or `public/jpg/vert/`. Add corresponding entries to the appropriate sub-array in
`config.images.gallery`. The `tier` field is optional (defaults to 2).

---

## `debug`

| Key | Type | Default | Purpose |
|-----|------|---------|---------|
| `debug` | boolean | `false` | Toggles the debug overlay showing raw guest data |

**How to populate:** Set to `true` to see raw guest JSON in the bottom-right
corner during development.
