# Al-Twiza (التويزة) — Tasks

> Tracker for `prompt.md`. The AI ticks `[x]` only when something is really
> done and tested. One phase at a time: after each phase, STOP and wait for
> the owner's "next".

Status legend: `[ ]` todo, `[x]` done, `[~]` partly done / blocked (add a note).

---

## Before Phase 0 (owner does this, not the AI)

- [ ] Node.js LTS installed (`node --version`)
- [ ] Git installed and a NEW GitHub repo created for the rebuild (keep the
      old repo untouched as a reference)
- [ ] VS Code (or Antigravity) opened on an empty project folder
- [ ] Expo Go installed on my phone
- [ ] A NEW Firebase project created (Auth with email/password, Firestore,
      Storage)
- [ ] List of Laghouat neighborhoods for the first version (3 to 5 names)
- [ ] Laghouat center and bounding box verified in Google Maps
- [ ] `prompt.md` and `tasks.md` copied to the project root
- [ ] (Optional) Superpowers skills installed in Antigravity

---

## Phase 0 — Setup and "hello" on the phone

- [x] Ask the owner: neighborhood names + Android or iPhone (one message)
- [x] Create the Expo project (TypeScript strict, Expo Router)
- [x] Folder structure (`app`, `src/components`, `services`, `context`, `hooks`,
      `i18n`, `theme`, `types`, `constants`, `utils`)
- [x] `src/constants/laghouat.ts` (center, bounding box, `NEIGHBORHOODS`)
- [x] i18n: `ar.json` (default) and `en.json`, RTL handled and tested
- [x] Theme (colors, spacing, typography) with the color code per kind
- [x] Firebase config via `EXPO_PUBLIC_` variables, `.env.example`, `.env` ignored
- [x] `.gitignore` checked (no `.env`, no `node_modules`)
- [x] A "hello" screen in Arabic running on my phone through Expo Go
- [x] Type check passes; first commit

**Done when:** I see the Arabic RTL screen on my phone and the repo is clean.

---

## Phase 1 — Auth, user document, navigation, rules v1

- [x] `AuthContext` (`loading` starts true, set false after the first callback)
- [x] `authService`: register, login, logout, reset password (all with try/catch)
- [x] Create `users/{uid}` on registration with `role='citizen'`, `isBanned=false`
- [x] Screens: Login, Register, Forgot password (validation and error messages)
- [x] Navigation: tabs Map, Add, My reports, Profile; guest can browse the map
- [x] Profile screen: name, language toggle (AR/EN), logout
- [x] Firestore rules v1 for `users` (+ helpers `isOwner`, `isNotBanned`,
      `isAdmin`)
- [x] Storage rules (own folder, images only, under 5 MB)
- [x] Emulator test checklist for `users` (12 ALLOWED + 12 DENIED planned across
      all phases; write the first cases now)
- [ ] Set my own user as `admin` MANUALLY in the Firebase Console
- [x] Type check passes; commit

**Done when:** I can register, login, logout, and the rules deny a user who tries
to set `role: 'admin'`.

---

## Phase 2 — Map, filters, "Nearest to me"

- [x] Types: `Place`, `PlaceKind`, `PlaceStatus`, `Severity`
- [x] `placeService`: list verified places (query filters `verified==true`)
- [x] Rules: `places` read (verified only), `confirmations` read
- [x] Map screen with markers by kind and color
- [x] Filter chips (bins / collection points / wild dumps)
- [x] Location permission flow (denied: clear message + choose a neighborhood)
- [x] "Nearest to me" with Haversine, sorted list with m/km
- [x] Place card (photo, kind, neighborhood, notes, schedule, last confirmation)
- [x] "Directions" button opens the maps app
- [x] Loading, error and empty states (empty map message)
- [x] Admin-only quick add of verified places (for seeding) is allowed by rules
- [x] Type check passes; commit

**Done when:** I see seeded places on the map and "Nearest to me" works on
my phone.

---

## Phase 3 — Add a place

- [x] Form: kind, photo (camera/gallery), GPS with draggable pin, neighborhood,
      notes, severity (wild dump), schedule/accepts (collection point)
- [x] Reject locations outside Laghouat (app AND rules `inLaghouat`)
- [x] Upload photo to `places/{uid}/...`, then create the place
      (`verified=false`, `owner='informal'`)
- [x] "Waiting for approval" screen/message
- [x] "My places" list (my own unverified places visible to me)
- [x] Rules: `places` create with all validations
- [x] Emulator cases: outside box, wrong owner, verified=true by a citizen, etc.
- [x] Type check passes; commit

**Done when:** a citizen adds a place, it is hidden from others, and the admin
(me) sees it as pending.

---

## Phase 4 — Reports, status, confirmations

- [x] Types and `reportService` (create, list mine, update status via admin)
- [x] Report form (place or free location, type, description, photo,
      neighborhood)
- [x] "My reports" with status chips and the 14-day honest message
- [x] Reporter answers "Is it fixed? Yes / No" when status is `fixed`
- [x] "Still there" confirmations (doc id = uid; count/last date derived)
- [x] Rules: `placeReports` (create, admin/municipality transitions, reporter
      confirmation) and `confirmations` create
- [x] Emulator cases: invalid transition, citizen changing status, reading
      another user's report, double confirmation
- [x] Type check passes; commit

**Done when:** the full cycle works: report -> admin changes status -> citizen
sees it -> reporter confirms.

---

## Phase 5 — "We need a bin here" and the admin screen

- [x] "We need a bin here" (one vote per user per neighborhood)
- [x] Rules for `needBinVotes` (id = `${neighborhood}_${uid}`, admin read)
- [x] Admin tab visible only for `role=='admin'` (rules still enforce it)
- [x] Approve or reject pending places
- [x] Change report status (writes `history` with `by`, `at`, `note`)
- [x] Demand per neighborhood (votes) and report counts
- [x] Ban / unban a user (admin only)
- [x] Type check passes; commit

**Done when:** I can approve places, change statuses and see demand per
neighborhood.

---

## Phase 6 — Weekly CSV and APK

- [ ] Weekly CSV export (grouped by neighborhood, overdue first, UTF-8 BOM)
- [ ] Share the file with `expo-sharing`
- [ ] App name, icon, splash (Arabic), package name
- [ ] Restrict the Maps API key (Android package + API)
- [ ] EAS Build: an APK I can install on my phone
- [ ] Production check: no demo helpers, no credentials, `__DEV__` features off
- [ ] Type check passes; tag a release

**Done when:** I install the APK and use the app without Expo Go.

---

## Phase 7 — Polish and a small pilot

- [ ] Seed 20-30 REAL places in 1-2 neighborhoods (photo + GPS, verified)
- [ ] Test with 10 real people and write down what confused them
- [ ] Fix the top 5 problems
- [ ] Count: how many people pressed "We need a bin here"? How many reports?
- [ ] Prepare the first weekly list for the municipality (CSV or PDF)
- [ ] Write what I need from the municipality ON PAPER (official data,
      repair of reported bins, official support)

**Done when:** I have real numbers to show the municipality.

---

## Final security checklist (before any public release)

- [ ] Rules tested in the Emulator: at least 12 ALLOWED and 12 DENIED cases pass
- [ ] A user cannot change `role` or `isBanned`
- [ ] A user cannot read other users' data or reports
- [ ] No client can edit a place, only create one (unverified)
- [ ] Banned users cannot write
- [ ] Storage: images only, under 5 MB, own folder
- [ ] No secrets in the repo history (`git log -- .env` is empty)
- [ ] Maps key restricted
- [ ] Demo helpers disabled in production

---

## Backlog (NOT in the MVP)

- [ ] Municipality role and its own screens
- [ ] Push notifications (needs Cloud Functions)
- [ ] Custom claims for roles (instead of the user document)
- [ ] Volunteer cleanup with before/after photos
- [ ] Donations / crowdfunding for new bins (only after demand numbers)
- [ ] Firebase App Check
- [ ] French language
- [ ] Privacy policy screen (required for Google Play)
- [ ] Google Play release (one-time developer fee)
- [ ] More neighborhoods, then the whole city

---

## Notes and decisions

- Only Laghouat. Arabic first (RTL).
- The app works without the municipality; the manual weekly list is the first
  "bridge".
- Wild dumps are the evidence of where bins are needed.
