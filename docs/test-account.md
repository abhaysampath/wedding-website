# Test Account Setup

## Seeded test guests (GUESTS tab)

Three TEST rows exist in the config sheet for exercising the dual-wedding access
matrix. Seed/refresh them with:

```bash
node --env-file=.env scripts/seed-test-guests.mjs            # dry-run
node --env-file=.env scripts/seed-test-guests.mjs --apply    # write
```

The script only ever writes to rows whose `Title` is `TEST` **and** whose
`First Name`/`Last Name` match one of these; it never touches other rows.

| Title | First Name | Last Name | Relationship     | Role       | Invited To    | Plus One | Phone Number     | Email Address                  |
|-------|------------|-----------|------------------|------------|---------------|----------|------------------|--------------------------------|
| TEST  | Both       | Weddings  | Rebecca's Friend | CloseFamily| Both Weddings | N/A      | +1 555 555 0100  | test-both@abhayandrebecca.com  |
| TEST  | US         | Only      | Rebecca's Guest  | Br-Family  | US Wedding    | N/A      | +1 555 555 0101  | test-us@abhayandrebecca.com    |
| TEST  | India      | Only      | Abhay's Guest    | Gr-Friends | India Wedding | N/A      | +1 555 555 0102  | test-india@abhayandrebecca.com |

Notes:
- `Invited To` values `Both Weddings` / `US Wedding` / `India Wedding` are parsed
  to `['us','india']` / `['us']` / `['india']`.
- Sheets coerces a leading `+`, so the phone may store as `15555550100`; the app
  normalizes it back to `+15555550100`.
- **TEST rows are intentionally hidden from the name autocomplete** (the modal
  excludes `Title = TEST` unless you type the word "TEST", and these rows' names
  aren't "Test"). Access them via a direct magic link (`/g/<first>-<last>?code=...`)
  or Google/phone sign-in. To exercise the *email-code* path through the name
  search, use a non-TEST row (e.g., firstName `Email`, lastName `Tester`).

## Firebase test phone numbers

Register these in **Firebase Console → Authentication → Sign-in method → Phone →
Test phone numbers**, each with the fixed code:

| Phone            | Verification code |
|------------------|-------------------|
| +1 555 555 0100  | 123456            |
| +1 555 555 0101  | 123456            |
| +1 555 555 0102  | 123456            |

Any 6-digit code is accepted for these numbers in Firebase test mode; `123456`
is what the automated checks assume.

## Email OTP

Email OTP is generated server-side by `/api/otp` (the code is also returned in the
JSON response, which the automated browser test uses) and delivered via EmailJS
from the browser. The three `test-*@abhayandrebecca.com` addresses must be allowed
by your EmailJS service/template if you want real inbox delivery; automated tests
mock EmailJS and `/api/otp`, so no email is actually sent during CI.

## Testing the auth flows

1. `npm run dev` (or use production).
2. Sign in via one of:
   - **Google** — account whose name/email matches a guest row.
   - **Phone OTP** — the test numbers above, code `123456`.
   - **Email OTP** — 6-digit code from the email, or the magic link.
3. Verify the invited wedding(s) are visible (see the access matrix below).

## Automated tests

Two layers, both cheap and fast (no real Firebase/Sheets/EmailJS):

- **Unit / component (`npm test`, ~5s):** `src/components/access-matrix.test.jsx`
  (RSVP options per invited wedding), plus AuthModal / API auth coverage.
- **Browser (`npm run test:browser` → `npx playwright test`, ~40s):**
  `scripts/access-playwright.test.ts` runs in **mobile (390×844)** and
  **desktop (1280×800)** projects and asserts:
  - signed-out: story/details/travel/registry/faq are **hidden**; gallery/contact shown.
  - Both Weddings: all sections shown **and** the US/India switcher is present.
  - US Only: details/travel shown, **no switcher**, US venue present, India absent.
  - India Only: details shown, **no switcher**, India present, US absent.
  - Email OTP (code): full sign-in reveals gated content.
  (Email magic-link auto sign-in is covered deterministically by the Vitest
  regression tests in `AuthModal.test.jsx`.)

> Local credential note: if `scripts/seed-test-guests.mjs` fails with
> `DECODER routines::unsupported`, your local `GOOGLE_PRIVATE_KEY` in `.env` is
> malformed (e.g., a stray character). Replace it with the valid service-account
> key. (Production/CI are unaffected — they use Vercel/GitHub secrets.)
