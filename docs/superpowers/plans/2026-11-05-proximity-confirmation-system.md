# Google Maps-Style Proximity Confirmation & Recognition Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a 15-meter proximity community verification engine (browser push + in-app Google Maps prompt) for bins, black spots, and active reports, with admin-configurable confirmation threshold (default: 4), dedicated field staff resolution phase (`in_repair`), and an entrance celebration modal for citizens whose reports are verified.

**Architecture:** 
- A specialized proximity verification service calculates distance ($\le 15\text{m}$) against nearby places and reports, triggering browser notifications and a floating action card with tailored questions per item type.
- System settings in Firestore (`system_settings/config`) manage dynamic thresholds with fallback to 4.
- App entrance tracking detects newly confirmed/resolved reports submitted by the citizen and displays a celebratory recognition modal.

**Tech Stack:** React Native (Expo), TypeScript, Firebase Firestore, Web Notifications API, Expo Location, Haversine geometry.

**Spec:** Brainstorming Design Doc agreed with user on 2026-11-05.

---

## Global Constraints

- Distance cap: strictly 15 meters (`<= 15m`).
- Default confirmation threshold: `4`, editable by admins in Admin Panel.
- Proximity prompt categories: Bins (`bin`), Black Spots (`wild_dump`), Active Reports (`PlaceReport`).
- Provide quick "Report a problem" fallback button for all 3 categories if something is wrong.
- Browser notification permissions handled gracefully on Web (`Notification.requestPermission()`).
- Cooldown: 30 minutes per item ID to avoid repetitive notifications.
- Entrance recognition modal must trigger when the citizen enters/opens the app and has confirmed/resolved reports.

---

## Tasks

### Task 1: Type Definitions & System Settings Service

**Files:**
- Modify: `src/types/index.ts`
- Create: `src/services/systemSettingsService.ts`
- Modify: `scripts/run-app-tests.cjs`

- [ ] Add `SystemConfig` interface in `src/types/index.ts` (`verificationThreshold: number`, `proximityDistanceMeters: number`).
- [ ] Add confirmation tracking fields to `PlaceReport` and `Place` (`confirmationsStillThere: number`, `confirmationsResolved: number`, `verifiedByCitizens?: string[]`).
- [ ] Implement `SystemSettingsService` with `getVerificationThreshold()` (defaults to 4) and `updateVerificationThreshold(newThreshold)`.
- [ ] Write unit tests in `scripts/run-app-tests.cjs` testing threshold retrieval and fallback.
- [ ] Run `npm test` to verify.

---

### Task 2: Proximity Verification Engine & Web Notifications

**Files:**
- Create: `src/services/proximityVerificationService.ts`
- Modify: `scripts/run-app-tests.cjs`

- [ ] Implement distance evaluation ($\le 15\text{m}$) using `calculateDistance` from `haversine.ts`.
- [ ] Implement 30-minute cooldown cache to prevent notification spamming for the same item.
- [ ] Build item classifier generating question text and options:
  - **Bin**: "هل الحاوية موجودة في مكانها؟" ([نعم، موجودة] / [غير موجودة]) + [أبلغ عن مشكلة بالحاوية].
  - **Black Spot**: "هل ما زالت النفايات متراكمة؟" ([ما زالت متراكمة] / [تم تنظيفها]) + [أبلغ عن تفاقمها].
  - **Report**: "هل المشكلة ما زالت قائمة؟" ([ما زالت] / [تم حلها]) + [أبلغ عن تفاصيل إضافية].
- [ ] Implement web browser notification dispatcher with `Notification.permission` check and fallback.
- [ ] Implement `submitVerification(itemId, itemType, vote: 'still_there' | 'resolved', userId)` updating Firestore counts and auto-transitioning to `fixed` when reaching threshold (4).
- [ ] Add unit tests in `scripts/run-app-tests.cjs` verifying 15m threshold filtering and confirmation increments.
- [ ] Run `npm test` to verify.

---

### Task 3: In-App Google Maps Proximity Prompt UI

**Files:**
- Create: `src/components/ProximityVerificationPrompt.tsx`
- Modify: `app/_layout.tsx`

- [ ] Create floating animated bottom card matching Google Maps styling:
  - Icon according to category (Bin, Danger/Black Spot, Report).
  - Clear heading: "أنت قريب من: {العنوان}".
  - Contextual question.
  - Action buttons: Primary [نعم / ما زالت] and Secondary [تم حلها / نظيفة].
  - Subtle link: "⚠️ كاين مشكل آخر؟ أبلغ من هنا" navigating to `/add` with pre-filled coordinates.
  - Dismiss button (X).
- [ ] Hook into `expo-location` in `app/_layout.tsx` or map listener to feed current GPS coordinates.

---

### Task 4: Explicit Field Staff In-Resolution Phase (`in_repair`)

**Files:**
- Modify: `app/(tabs)/reports.tsx`
- Modify: `app/(tabs)/admin.tsx`
- Modify: `src/services/reportService.ts`

- [ ] Update status labels and badges in `reports.tsx`:
  - `received`: "قيد المعالجة الإدارية" (تم الاستلام والتدقيق).
  - `in_repair`: "فريق التدخل في الميدان" (أعوان النظافة في الموقع لمعالجة المشكلة).
  - `fixed`: "تم الحل بنجاح" (المكان نظيف ومعالج).
- [ ] In `admin.tsx`, provide explicit admin action buttons:
  - "إرسال فريق التدخل" (Set status to `in_repair`).
  - "تأكيد الحل والنظافة" (Set status to `fixed`).

---

### Task 5: Admin Panel Threshold Configuration

**Files:**
- Modify: `app/(tabs)/admin.tsx`

- [ ] Add a clean settings card in `admin.tsx`:
  - "إعدادات تأكيد البلاغات الذكية (Google Maps Mode)".
  - Numeric stepper / input for `verificationThreshold` (Default 4).
  - Save button with immediate Firestore synchronization and toast confirmation.

---

### Task 6: App Launch Recognition Splash / Modal

**Files:**
- Create: `src/components/ReportResolvedRecognitionModal.tsx`
- Modify: `app/_layout.tsx` or `app/(tabs)/index.tsx`

- [ ] On app launch, query reports created by the current user where status transitioned to `fixed` or received confirmations since `lastViewedReportsTimestamp` stored in `AsyncStorage`.
- [ ] Display celebratory modal with green shield, confetti visuals:
  - Title: "عمل رائع يا بطل! 🌟"
  - Subtitle: "تم تأكيد صحة بلاغك بنجاح وحل المشكلة بفضل مساهمتك ومشاركة جيرانك."
  - Button: "اضغط هنا لمتابعة حالة البلاغ 📋" (routes to `/reports`).
  - Secondary button: "متابعة إلى التطبيق".
- [ ] Mark report as acknowledged so it doesn't show repeatedly.

---

### Task 7: Comprehensive Verification & End-to-End Testing

- [ ] Run `npm run typecheck` to guarantee 0 TypeScript errors.
- [ ] Run `npm test` to verify all existing and new test suites pass.
- [ ] Build verification (`npx expo export --platform web`).
