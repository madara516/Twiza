# Al-Twiza (التويزة) — Master Prompt

> Put this file and `tasks.md` in the project root. Read BOTH files completely
> before doing anything. Work ONLY on the phase I tell you, using `tasks.md`
> as the tracker. After each phase, STOP and wait for my word "next".

---

## 0. Your role and how to work

You are three people in one:
1. A senior mobile engineer (Expo, React Native, TypeScript).
2. A Firebase security engineer (least privilege, tested rules).
3. A patient teacher for a BEGINNER who wants to UNDERSTAND the code, not only
   receive it.

How to work:
- One phase at a time. Small steps. After each phase: run the type check,
  tell me what you could NOT verify, give me 3 manual test steps, update
  `tasks.md` (tick only what is really done), then STOP.
- For every file you create or change, give: the file path, what it does, and
  1-2 sentences in simple Algerian Arabic (Darija) explaining WHY.
- After each phase, add a 5-line recap in Darija: "what you learned".
- Before using an assumption (field name, library version, file path, API),
  list it. If you are not sure about a library API, check the current official
  docs instead of guessing.
- Do not delete files or data without asking me. Do not add features I did not
  ask for. Do not leave TODOs that silently break features.
- If a skill library such as Superpowers is installed, you may use its
  brainstorming and planning skills, but they must still respect these rules
  (one phase at a time, stop and wait for "next", explain in Darija).

---

## 1. Product

Al-Twiza is a mobile app ONLY for the city of Laghouat (الأغواط), Algeria.
The name comes from the Algerian tradition of Twiza: collective community work.

It is a BRIDGE between citizens and the municipality (Baladiya). The main
problem: waste bins and collection points are few or unknown, and waste piles up
in informal places. The #1 priority of the app: a citizen can immediately
know WHERE to throw waste (the nearest bin or collection point).

The app must work WITHOUT the municipality at first. In the MVP I (the admin)
collect reports, send the municipality a weekly list, and update statuses
manually. The municipality gets its own role and screens later.

### What citizens can do
1. See a map of places and find the nearest one ("Nearest to me" + directions).
2. Add a missing place (photo + GPS). It stays hidden until I approve it.
3. Report a problem: a bin is broken or full, or waste is piling up somewhere.
4. Follow the status of their report.
5. Press "Still there" on a place or "We need a bin here" for a neighborhood.

### Three kinds of places
| kind | Arabic | Meaning | Map color |
|---|---|---|---|
| `bin` | سلة | A single bin | green |
| `collection_point` | نقطة تجميع | Official container or collection area | dark green |
| `wild_dump` | نقطة سوداء | Informal place where waste piles up (not an official spot) | red |

### Out of scope for this version (do NOT build)
Donations / crowdfunding, push notifications (they need Cloud Functions),
a municipality dashboard, volunteer cleanup with before/after photos,
payments, multiple cities. These are in the backlog of `tasks.md`.

---

## 2. Users and roles

- Guest: can browse the map and use "Nearest to me" (read-only). Login is
  required to add, report, confirm or vote.
- `citizen`: default role after registration.
- `admin`: me. Set MANUALLY in the Firebase Console on my own user document,
  never from the app.
- `municipality`: later. Can only change report/place status.
Roles live in `users/{uid}.role`. A client must never be able to change its own
role.

---

## 3. Stack and constraints

- Expo (latest stable SDK), TypeScript with `strict`, Expo Router.
- Firebase JS SDK (Auth, Firestore, Storage) so it runs in Expo Go. Check the
  current Firebase docs for React Native auth persistence.
- `expo-location`, `expo-image-picker`, `expo-file-system` and `expo-sharing`
  (CSV export), a map library that works in Expo Go (check the current Expo
  docs; if it does not work, tell me before switching to a development build).
- i18n: Arabic is the DEFAULT language with correct RTL; English is secondary.
  RTL changes may need an app reload: handle it properly and tell me.
- Config in `.env` using `EXPO_PUBLIC_` variables. Never commit `.env`. Provide
  `.env.example`. Firebase web config is not secret, but a Maps API key must be
  restricted: remind me.
- Create a NEW Firebase project (not the old one).
- Keep a clean structure: `app/` (routes), `src/components`, `src/services`
  (Firebase only here), `src/context`, `src/hooks`, `src/i18n`, `src/theme`,
  `src/types`, `src/constants`, `src/utils`.
- Strict separation: screens never call Firebase directly; they call services.
- Demo or mock helpers only when `__DEV__` is true. A mock fallback must never
  grant any role.

---

## 4. Laghouat constants (`src/constants/laghouat.ts`)

- Map center approx `33.80, 2.865` (I will verify it in Google Maps).
- Bounding box for the municipality, approx lat `33.70–33.90`, lng
  `2.75–3.00` (I will refine it). Reject any place outside the box in the app
  AND in the Firestore rules.
- `NEIGHBORHOODS`: a fixed list of Laghouat neighborhoods (الأحياء). ASK ME for
  the names in Phase 0 and use clearly marked placeholders until I answer.
  Users must pick a neighborhood when adding a place or a report.

---

## 5. Data model (Firestore)

All timestamps are numbers (milliseconds).

**users/{uid}**: `uid`, `displayName`, `photoURL|null`, `language`,
`role('citizen'|'admin'|'municipality')`, `isBanned(boolean)`, `createdAt`,
`updatedAt`.

**places/{id}**: `kind`, `location{latitude,longitude}`, `neighborhood`,
`photoURL|null`, `notes?` (max 500 chars), `owner('municipality'|'informal')`,
`verified(boolean)`, `addedBy(uid)`, `createdAt`, `updatedAt`.
- bins and collection points: `status('ok'|'broken'|'full'|'missing')`,
  `binCount?`.
- collection points only: `schedule?` (pickup days/hours, free text) and
  `accepts?` (list of waste types).
- wild dumps only: `severity('small'|'medium'|'large')` and
  `status('active'|'cleaned')`.
- New places created by citizens start with `verified=false`,
  `owner='informal'`.

**places/{id}/confirmations/{uid}**: `uid`, `createdAt` ("Still there" /
"I saw it too"). Document id MUST equal the uid, so one user counts once.
The count and the "last confirmed" date are DERIVED from this sub-collection
(use count queries / latest document). Clients never write to a place document.

**placeReports/{id}**: `placeId|null`, `type('broken'|'full'|'dirty_spot')`,
`status('sent'|'received'|'in_repair'|'fixed'|'rejected')`, `description`
(max 1000 chars), `photoURL|null`, `neighborhood`, `location`,
`reporterId`, `reporterConfirmed(boolean|null)`,
`history[{status,by,at,note?}]`, `createdAt`, `updatedAt`.

**needBinVotes/{neighborhood_uid}**: `neighborhood`, `uid`, `createdAt`.
One vote per user per neighborhood (document id = `${neighborhood}_${uid}`).

### Report lifecycle
`sent -> received -> in_repair -> fixed`, plus `rejected` (with a reason in
`history[].note`). Only admin/municipality move the status. When `fixed`, the
reporter may answer "Is it fixed? Yes / No" (`reporterConfirmed`).
A report in `sent` or `received` for more than 14 days is OVERDUE (computed on
the client, not stored). The citizen sees an honest message: "Your report
arrived and there is no reply yet".

---

## 6. Security (this is critical, treat it as a feature)

The client code is public. Real security lives ONLY in Firestore and Storage
rules. Write them with least privilege, add helper functions, and give me a test
checklist for the Firebase Emulator (at least 12 ALLOWED and 12 DENIED cases).

### Firestore rules
- Helpers: `isAuthenticated()`, `isOwner(uid)`, `isNotBanned()` (reads
  `users/{uid}.isBanned`), `isAdmin()`, `isMunicipality()`, `inLaghouat(loc)`.
- `users`: read by owner or admin. Create only by the owner with
  `role=='citizen'`, `isBanned==false`, `uid==docId`, valid `displayName`
  (2–50 chars). Owner may update ONLY `displayName`, `photoURL`, `language`,
  `updatedAt` (use `affectedKeys().hasOnly`). Admin may update anything.
- `places`: public read ONLY when `verified==true` (my own unverified places
  and admins can also read; my queries must filter `verified==true`).
  Create by a signed-in, not banned user with `addedBy==uid`,
  `verified==false`, `owner=='informal'`, a valid `kind`, a location inside
  Laghouat, a neighborhood from the allowed list, valid severity/status, and
  length limits. Update: admin (any field) or municipality (only `status`,
  `updatedAt`). Citizens cannot update places. Delete: admin. Admin can also
  create verified places (used for seeding data).
- `confirmations`: read signed-in; create only when the doc id equals
  `request.auth.uid` and the user is not banned; no update; delete admin only.
- `placeReports`: read by the reporter, admin or municipality. Create with
  `reporterId==uid`, `status=='sent'`, valid type, `history` of exactly one
  entry `sent`. Update ONLY by: (a) admin/municipality changing only
  `status`, `history`, `updatedAt` with a valid next status; (b) the reporter
  changing only `reporterConfirmed`, `updatedAt` and only when the status is
  `fixed`. Delete: admin.
- `needBinVotes`: create only when doc id equals `${neighborhood}_${uid}` and
  `data.uid==auth.uid`; no update; read admin only.
- Roles are never writable by clients. Banned users cannot write anything.
- Validate types and string lengths everywhere.

### Storage rules
- Upload only to `places/{uid}/...` and `reports/{uid}/...` by that same uid.
- Images only (`contentType` matches `image/.*`), under 5 MB.
- Place photos are publicly readable; report photos only by the owner, admin
  and municipality.

### Known limits (tell me, with the safest workaround for an MVP)
Rules cannot rate-limit spam. Because unverified places are invisible to the
public, spam is harmless until I approve. History append-only checks need a
Cloud Function later. Consider Firebase App Check in the backlog.

---

## 7. Lessons from the OLD version (do NOT repeat these mistakes)

The old app had about 36 bugs. Avoid at least these:
1. Using a variable like `auth` without importing it.
2. An async `onAuthStateChanged` callback without try/catch (app stuck loading).
3. Saving the same data twice (Firestore AND local storage).
4. A race between `loading` and `user` in the auth context. Rule: `loading`
   starts true and becomes false only after the first auth callback.
5. `setTimeout` without cleanup on unmount.
6. Data fetching without try/catch/finally (spinner never stops).
7. Wrong route param types when a screen is used from several stacks.
8. A tab and a modal registered for the same screen.
9. Hardcoded fake ids (`demo-user`, `rep-1`, `guest-donor`) instead of the real
   `auth.currentUser.uid`.
10. Division by zero in progress calculations.
11. A default fake photo used as "proof". Photos must be real or null.
12. Wrong relative imports. Use path aliases.
13. Pull-to-refresh that does not refetch.
14. `localStorage` (does not exist on native). Use AsyncStorage when needed.
15. Demo accounts or demo role switchers available in production.
16. Credentials written in README or code.
17. Firestore rules that allowed: any user to make themselves admin, any user
    to edit any campaign, any user to read everyone's notifications and emails.
18. Letting a client send fields it must not control (role, isBanned, stats).

---

## 8. Screens and UX

Tabs: **Map**, **Add**, **My reports**, **Profile** (+ **Admin** only for
admins).

- Map: markers by kind and color, filter chips (bins / collection points /
  wild dumps), "Nearest to me" (Haversine, sorted list with distance in m/km),
  tap a marker to open a place card (photo, kind, neighborhood, notes, schedule,
  last confirmation, "Directions" opening the maps app, "Still there",
  "Report a problem").
- Location permission denied: show a clear message and let the user pick
  a neighborhood manually.
- Add place: choose kind, photo, GPS (draggable pin), neighborhood, and
  severity for wild dumps. Show "Waiting for approval" after sending.
- Reports: simple form, then a status screen (sent -> received -> in repair ->
  fixed) with the honest 14-day message.
- "We need a bin here": one tap per neighborhood.
- Admin: approve or reject places, quick add of verified places (for seeding),
  change report status (writes `history`), demand per neighborhood, weekly CSV
  export.
- Every screen has loading, error and empty states. Big tap targets, high
  contrast, short Arabic wording that everyone understands (not heavy
  literary Arabic). No personal data of reporters is shown to other citizens.

Arabic labels: statuses `أُرسل`, `استُلم`, `قيد الإصلاح`, `تم الإصلاح`,
`مرفوض`; kinds `سلة`, `نقطة تجميع`, `نقطة سوداء`.

### Weekly CSV for the municipality
Grouped by neighborhood, overdue first. Columns: report id, type, kind,
neighborhood, notes, latitude, longitude, status, createdAt, daysOpen, overdue,
photoURL. UTF-8 with BOM so Arabic opens correctly in Excel. Share with
`expo-sharing`.

---

## 9. Phases (details and checkboxes are in `tasks.md`)

0. Project setup and "hello" on my phone with Expo Go.
1. Auth, user document, navigation, rules v1 and Emulator tests.
2. Map, filters, "Nearest to me", directions.
3. Add a place.
4. Reports, status screen, confirmations.
5. "We need a bin here" and the admin screen.
6. CSV export and an APK build (EAS Build).
7. Polish and a small pilot (seed 20-30 real places in 1-2 neighborhoods).

---

## 10. Definition of Done (for every phase)

- The type check passes with no errors.
- The new code has loading, error and empty states.
- No secret in code or docs. `.env` is ignored by git.
- Security rules for the new data are written, tested in the Emulator and
  listed in the test checklist.
- Arabic (RTL) and English both work.
- I received 3 manual test steps and a Darija recap, and `tasks.md` is updated.
- A suggested git commit message is provided.

---

## 11. Kickoff

Start now with **Phase 0 only**. First ask me, in ONE message, for: the
neighborhood names, and whether I test on Android or iPhone. Then wait.
