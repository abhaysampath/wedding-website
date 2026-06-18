# Google Sheets Reference

> For sheet editors — explains how every column in the wedding website's Google Sheet is used by the code.

## Sheet structure

The workbook has two worksheets (tabs):

| Tab | Purpose |
|---|---|
| **GUESTS** | Per-guest row: name, contact info, role assignment, RSVP status for both weddings, login history |
| **FAQ** | Questions and answers displayed on the website |

---

## GUESTS tab — column reference

Columns are detected dynamically by header name (case-insensitive), so column order in the sheet is flexible. The read range is `A:R` (18 columns). You can reorder columns freely — just keep all 18 within the range if you add extras.

### A — Title

Controls row classification and optional name prefix. Affects visibility, search, and reports.

| Value | Behavior |
|---|---|
| _(empty)_ | Normal guest row. Visible in search, reports, and sitemap. |
| `Dr` | Prepended to the guest's full name in the UI (e.g. "Dr. Jane Doe"). Both `Dr` and `Dr.` in the sheet produce `Dr.` prefix in the UI. Currently the only title value that acts as a name prefix. |
| `KIDS` | Row is **never sent** to the client — filtered server-side. Use for children to keep nav and sitemap clean. |
| `TEST` | Appears in search **only** if the search term contains "TEST" (case-sensitive). Excluded from daily-report totals and sitemap. |
| `#...` | Any value starting with `#` is treated as a comment — blanked at read time. Useful for notes or temporarily disabled rows. |

In practice the column currently contains `Dr` or is empty. The KIDS/TEST values exist as future-use row classifiers read from this same column. Only `Dr` is prepended to displayed names.

### B — First Name / D — Last Name

Used for: guest search (name dropdown), URL slug (`/g/jane-doe`), welcome message, and name-based auth bootstrap. Two guests can share the same name — search returns all matches.

### C — Middle Initial

Optional. Not consumed by any logic — present for reference.

### E — Relationship

Free-text descriptor displayed alongside the guest name in search results. Also used to infer `side` (bride/groom):
- Text containing "abhay" → tagged as groom's side
- Text containing "rebecca" → tagged as bride's side

### F — Role

Controls event visibility. Raw sheet values are mapped to internal roles:

| Sheet value | Internal role | Sees |
|---|---|---|
| `Bride` | `bride` | All events |
| `Groom` | `groom` | All events |
| `CloseFamily` | `close_family` | Pre-ceremony + public events |
| `Br-Family`, `Br-Friends` | `invited_guest` | Public events only |
| `Gr-Family`, `Gr-Friends` | `invited_guest` | Public events only |
| `Vendor` | `vendor` | Events tagged `vendor` only |
| _(anything else)_ | `invited_guest` | Public events only (safe default) |

Unauthenticated visitors see `public` events only.

### G — Invited To

Controls which wedding tab(s) the guest sees and which RSVP fields are editable.

| Value | Guest sees | Editable RSVP |
|---|---|---|
| `both` | US + India tabs | rsvpUs + rsvpIndia |
| `us` | US tab only | rsvpUs |
| `india` | India tab only | rsvpIndia |

Parsing is case-insensitive substring match: `BOTH`, `Both`, `both` all work.

### H — Plus One

Authorizes one guest to edit RSVPs for others in their group.

| Value | Meaning |
|---|---|
| `N/A` | No plus-one group. Guest edits only their own RSVP. |
| `+1NOTALLOWED` | Reserved. Currently behaves identically to `N/A`. |
| `Allowed+1` | This guest can RSVP for themselves AND for every consecutive guest below them whose Plus One is `Is+1`. |
| `Is+1` | This guest is a plus one. Cannot sign in independently — the `Allowed+1` guest above edits their RSVP. |

**Plus One group formation rules:**

The server scans downward from the `Allowed+1` row, collecting consecutive `Is+1` rows. It stops at the first row whose Plus One is **not** `Is+1`.

| Scenario | Group | Who can edit |
|---|---|---|
| Row 3: `Allowed+1` → Row 4: `Is+1` → Row 5: `Is+1` → Row 6: `N/A` | {3, 4, 5} | Row 3 edits RSVPs for rows 4 and 5 |
| Row 3: `Allowed+1` → Row 4: `N/A` | {3} | Row 3 has no one to edit |
| Row 3: `N/A` → Row 4: `Is+1` | {} | Row 3 cannot see the `Is+1` below them |

Only `rsvpUs`, `rsvpIndia`, and `dietaryPreferences` are synced for group members. Phone/email/address are **not** editable by the `Allowed+1` guest.

### I — Email Address / J — Phone Number / K — Mailing Address

Used for sign-in verification:

- **Google OAuth** — no column needed. Firebase matches by name or email.
- **Email link** — a 6-digit code is sent to the guest's email. Column I is required.
- **SMS code** — a 6-digit code is sent to the guest's phone (US numbers only). Column J is required.
- **Name-only** — if a guest has no email or phone, they can simply search their name and sign in without verification. Works for any row.

Email and phone are partially masked in the UI (e.g. `j***@example.com`, `***-***-1234`).

### L — Dietary Preferences

Free text. Editable by the guest and by their `Allowed+1` group manager.

### M — LastLogin / N — LastUpdated / P — LoginFailed

Auto-written timestamps for monitoring:

| Column | When written | Value |
|---|---|---|
| LastLogin | Every successful sign-in | ISO timestamp (Eastern Time) |
| LastUpdated | Every successful PATCH | ISO timestamp (Eastern Time) |
| LoginFailed | On failed attempt | ISO timestamp; on success, literal `SUCCESS` |

### O — FirebaseUID

Links a Firebase Auth account to this guest row. Auto-written on the first successful PATCH from an authenticated Firebase user.

- **Before write:** auth is checked by email match → name similarity (≥0.4) → admin override
- **After write:** auth checks `uid` matches the stored value (stricter)

### Q — US-RSVP / R — India-RSVP

| Value | Meaning |
|---|---|
| _(empty)_ | Not yet responded |
| `YES` | Attending |
| `NO` | Not attending |

Guests see only the RSVP field(s) for wedding(s) they are invited to. Editable by the guest themselves and by their `Allowed+1` group manager.

---

## FAQ tab — column reference

Read range is `A:C` (3 columns).

### A — Question

Displayed as the FAQ heading on the website. Plain text (HTML is not rendered).

### B — Answer

Displayed as the FAQ body. Plain text.

### C — WhichWedding

Controls which wedding page shows this FAQ item.

| Value | Shown on |
|---|---|
| `both` | Both US and India pages (default if column is missing) |
| `us` | US page only |
| `india` | India page only |
| `hide` | Not shown on any public page (useful for drafts) |

If the `WhichWedding` column header is missing from the sheet entirely, **all** FAQ items are shown (no filtering). The site logs a console warning but works fine.

---

## System behavior

### How reads work

1. `GET /api/content` reads both GUESTS and FAQ tabs via the Google Sheets API
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
4. **Admin override** — if the authenticated user's role resolves to `bride`, `groom`, or `close_family`, they are authorized to update any row

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
