# Phase 4 — Reports, Status, and Confirmations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build citizen reporting system (`placeReports`) with 14-day overdue indicator, status lifecycle tracker (`sent -> received -> in_repair -> fixed | rejected`), reporter fix confirmation ("Is it fixed? Yes / No"), and "Still there" (`confirmations/{uid}`) verification for places.

**Architecture:**
- `reportService.ts`: CRUD for reports, state transitions for admin, citizen response to fix (`reporterConfirmed`), and overdue detection logic (14 days).
- `placeService.ts`: Add `confirmPlace(placeId, uid)`, `hasUserConfirmedPlace(placeId, uid)`, and `getPlaceConfirmationsCount(placeId)`.
- `reports.tsx`: Full "My Reports" screen with status chips, progress step tracker, 14-day notice, fix confirmation card, and a new report modal.
- `index.tsx` (Map screen place card): Add "ما زالت هنا 👍" confirmation button with live count and user state.

**Tech Stack:** React Native, Expo 58, Expo Router, Firebase Firestore & Storage.

---

## Global Constraints
- Target platform: Android via Expo Go.
- Overdue computation: Client-side derived (`Date.now() - createdAt > 14 * 86400000 && (status === 'sent' || status === 'received')`).
- Confirmation uniqueness: Document ID MUST equal `uid` (`places/{placeId}/confirmations/{uid}`).
- Rules compliance: Citizens only update `reporterConfirmed` and `updatedAt` when `status == 'fixed'`.

---

## Tasks

### Task 1: Report Service (`src/services/reportService.ts`)
- [ ] Create `src/services/reportService.ts`
- [ ] Implement `createReport`: enforces initial `status = 'sent'`, `history = [{ status: 'sent', by: uid, at: now }]`, `reporterConfirmed = null`
- [ ] Implement `getMyReports(uid)`: queries `placeReports` where `reporterId == uid`
- [ ] Implement `confirmFix(reportId, uid, isFixed: boolean)`: updates `reporterConfirmed` and `updatedAt`
- [ ] Implement `updateReportStatusByAdmin(reportId, adminUid, newStatus, note?)`: for testing lifecycle transitions
- [ ] Helper `isReportOverdue(report)`: returns true if > 14 days in `sent` or `received`

### Task 2: Place Confirmations Extension (`src/services/placeService.ts`)
- [ ] Add `confirmPlace(placeId, uid)`: writes to `places/${placeId}/confirmations/${uid}`
- [ ] Add `hasUserConfirmedPlace(placeId, uid)`: checks if document exists
- [ ] Add `getPlaceConfirmationsStats(placeId)`: returns count and last confirmed date

### Task 3: "Still There" Button in Map Place Card (`app/(tabs)/index.tsx`)
- [ ] Add "ما زالت هنا 👍" button to the place card modal
- [ ] Show count of confirmations and last confirmation date
- [ ] Prevent duplicate clicks if user already confirmed

### Task 4: Reports Screen (`app/(tabs)/reports.tsx`)
- [ ] Guest check: prompt to login/register if not authenticated
- [ ] Filter chips: الكل (`all`), جارية (`active`), تم الإصلاح (`fixed`), مرفوضة (`rejected`)
- [ ] Report Card:
  - Type & neighborhood title
  - Date & photo
  - Progress bar/steps: `أُرسل ➔ استُلم ➔ قيد الإصلاح ➔ تم الإصلاح`
  - 14-day honest notice: `"⚠️ وصل تقريرك ولم يتم الرد بعد"`
  - "هل تم الإصلاح؟" interactive card with [نعم ✅] and [لا ❌] if status is `fixed` and `reporterConfirmed === null`
  - Rejection note if `rejected`
- [ ] "إرسال تقرير جديد ➕" button and Report Form Modal (type, description, location/place, photo)

### Task 5: Verification & Type Check
- [ ] Run `npx tsc --noEmit` and confirm 0 errors
- [ ] Update `tasks.md` and commit
