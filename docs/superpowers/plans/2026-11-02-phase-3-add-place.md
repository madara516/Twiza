# Phase 3 — Add a Place (إضافة مكان جديد) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow citizens to submit new waste bins, collection points, and wild dumps with photo, GPS pin, neighborhood, and kind-specific fields, saving them to Firestore as unverified (`verified=false`, `owner='informal'`), uploading images to Storage, and providing a "Waiting for approval" feedback screen and a "My Places" view.

**Architecture:** 
- `storageService`: handles image picking validation (< 5MB) and Firebase Storage uploads to `places/{uid}/{filename}`.
- `placeService`: extended with `createPlace` (strictly setting `verified=false`, `owner='informal'`) and `getMyPlaces` (querying `addedBy == uid`).
- `add.tsx`: full form with Kind selector, Camera/Gallery image picker, interactive map pin picker bounded to `ACTIVE_REGION`, dynamic fields (severity for wild dump, schedule for collection point), submission state, success screen, and guest login guard.

**Tech Stack:** React Native, Expo 58, Expo Router, `expo-image-picker`, `expo-location`, Firebase JS SDK 13 (Firestore, Storage, Auth), Leaflet WebView map.

---

## Global Constraints
- Target platform: Android via Expo Go.
- Region architecture: strictly enforce `ACTIVE_REGION` bounds (`bounds: [33.70, 33.90] x [2.75, 3.00]`). If location outside, show `OUT_OF_SERVICE_MESSAGE`.
- Security: Citizen submissions MUST NEVER set `verified=true` or `owner='municipality'`.
- Storage: Images only, maximum 5 MB.
- i18n / Persona: Arabic (RTL) first, friendly Algerian Darija explanations.

---

## Tasks

### Task 1: Storage Service (`src/services/storageService.ts`)
- [ ] Create `src/services/storageService.ts`
- [ ] Implement `pickImageFromCamera()` and `pickImageFromGallery()` with aspect ratio, quality compression, and size checks (< 5MB)
- [ ] Implement `uploadPlacePhoto(uri, uid)` uploading to `places/${uid}/${timestamp}_${random}.jpg` and returning download URL
- [ ] Add safe fallback if Storage is not configured / offline

### Task 2: Place Service Extensions (`src/services/placeService.ts`)
- [ ] Add `createPlace(placeData, uid)` to `PlaceService`
- [ ] Validate `isLocationInRegion`
- [ ] Enforce `verified: false`, `owner: 'informal'`, `addedBy: uid`, `createdAt: Date.now()`, `updatedAt: Date.now()`
- [ ] Add `getMyPlaces(uid)` to `PlaceService` querying `places` where `addedBy == uid` sorted by `createdAt desc`

### Task 3: Interactive Location Pin Picker
- [ ] Add pin drag / tap support to `FreeMap` or mini interactive map mode for picking exact location
- [ ] Display visual feedback when selected location is inside vs outside `ACTIVE_REGION`

### Task 4: Add Place Screen UI (`app/(tabs)/add.tsx`)
- [ ] Guest check: If user not logged in, display polite card explaining why registration is needed, with a button to go to Login/Register
- [ ] Form layout:
  - Place Kind picker: سلة نفايات 🟢 | نقطة تجميع 🌲 | نقطة سوداء 🔴
  - Photo section: Camera / Gallery buttons, thumbnail preview with remove button
  - Location section: "موقعي الحالي" (GPS button), mini map pin selector, latitude/longitude display, and neighborhood dropdown/selector
  - Dynamic fields:
    - If `wild_dump`: Severity selector (منخفضة 🟡 | متوسطة 🟠 | حرجة 🔴)
    - If `collection_point`: Schedule (مواعيد الرفع) & accepted items (المواد المقبولة)
  - Notes field: text input for additional context
- [ ] Submit button with loading spinner and disabled state
- [ ] "Waiting for approval" modal/screen: "في انتظار المراجعة والتوثيق ⏳" with explanation that it will appear on the public map once verified by the municipality
- [ ] "My Places" modal / tab: view all places submitted by the logged-in citizen with status badges

### Task 5: Verification & Rules Checklist
- [ ] Run `npx tsc --noEmit` and ensure 0 errors
- [ ] Verify `firestore.rules` and `storage.rules` accommodate citizen create and private read
- [ ] Update `tasks.md` and commit
