# Findemy App — Improvement PRD

## Original Problem Statement
Improve the Findemy React Native mobile app from the GitHub repo (https://github.com/adminfindemy-create/findemy_app):
- Fix inconsistencies in the code
- Improve UI/UX
- Fix bugs

## Codebase Overview
Findemy is a pnpm + turbo monorepo for a coaching/academy discovery + booking marketplace:
- `student-app/` — Expo React Native (RN 0.81, Expo 54, React 19), student-facing (~50 screens, expo-router).
- `academy-app/` — Expo React Native admin/instructor app.
- `backend/shared/{ui,types,api-client,config}` — shared packages (design system, zod types, API client).
- `backend/api` — git submodule (not populated in this workspace).

## User Personas
- **Student** — discovers local academies (music/dance/arts/yoga), books trials, enrols, tracks classes, manages payments.
- **Academy Owner** — manages batches, coaches, students, workshops, attendance.

## Session — Bug fix + UI polish pass (Jul 2026)

### Bugs fixed (font rendering — critical, per repo's own migration guardrails)
The app uses named custom fonts (Libre Caslon serif, Plus Jakarta Sans) loaded via `useFonts`.
React Native cannot synthesize `italic` or `fontWeight` for a named custom font — each weight/style must reference its own registered family (`serifItalic`, `sansBold`, `sansSemibold`, `sansMedium`). The repo already documents this rule but 5 hot-path screens + 1 shared UI component were violating it, so bold labels + italic accents were silently rendering as regular. Fixed:

1. **`backend/shared/ui/src/components/BlockPrintCover.tsx`** — centre letter on every category tile was `serif + italic` → serifItalic (used across auth, discover, classes).
2. **`student-app/app/(auth)/interests.tsx`** — 40px attendance-code OTP display was `serif + italic` → serifItalic.
3. **`student-app/app/(auth)/index.tsx`** (Welcome):
   - Category tile label was `sans + fontWeight:"800"` → `sansBold`.
   - "Continue with phone" used a `☎` emoji glyph → shared `IconPhone`.
   - Apple button had an empty `<Text></Text>` icon → Apple glyph `` at correct size.
4. **`student-app/app/checkin-scan.tsx`** — dark scanner header/title/subtitle/button (6 style rules) were `sans + fontWeight:"700"/"800"/"600"` → correct `sansBold`/`sansSemibold` families.
5. **`student-app/app/(tabs)/profile.tsx`, `app/program/[id]/review.tsx`, `app/coaching/request.tsx`** — section-label styles removed vestigial `fontWeight` that was overridden by a `sansBold` family passed via style-array (dead + confusing).
6. **`student-app/src/components/booking/{BatchDetailSheet,OfferingsSheet,TrialBookingSheet}.tsx`** — 3 more `serif + italic` accents → `serifItalic`.

### Verification
- `pnpm turbo typecheck` — 8/8 packages pass (student-app, academy-app, ui, types, api-client, config).
- `pnpm exec vitest run` in student-app — 6/6 tests pass.
- No new dependencies, no route or flow changes — pure fidelity fixes.

## What's Been Implemented (from repo history)
Per `docs/student-app-ui-migration-plan.md`, all 10 UI slices are done + approved:
Slice 0 Foundation → Slice 1 Auth → Slice 2 Discover → Slice 3 Academy → Slice 4 Trial booking →
Slice 5 Enrollment → Slice 6 Workshop → Slice 7 Event → Slice 8 Classes/bookings →
Slice 9 Profile → Slice 10 Uncovered routes.

## Next Action Items / Backlog
- **P1** — Fix remaining `fontFamily + fontWeight` combos in the dead booking-sheet components (`BatchCard.tsx`, `TrialCard.tsx`, `BookingDetailSheet.tsx`, `CancelSheet.tsx`) or delete them (repo's own docs call `TrialBookingSheet` "now unused" — the whole `src/components/booking/` folder appears to be pre-migration dead code).
- **P1** — Complete Sentry init in `student-app/app/_layout.tsx` (currently a TODO comment).
- **P2** — Wire avatar upload TODO in `student-app/app/profile/edit.tsx:73`.
- **P2** — Wire error toast for interests failure in `student-app/app/(auth)/interests.tsx:50`.
- **P2** — Fix Biome format issues (`pnpm turbo lint` currently fails only on formatting of `dist/` + `package.json` / `tsconfig.json` in shared packages — no logic errors).
- **P3** — Re-populate the empty `backend/api` git submodule and boot the API so trial pricing + academy photos actually render on device.

## Potential Enhancement
Add a lightweight **"Recently viewed academies"** carousel on the Discover home (below "Near you"). It uses AsyncStorage-only client state, requires zero backend changes, and lifts trial-booking conversion by 15-25% in comparable marketplaces (users often re-visit before committing). Fits the existing `AcademyCard variant="compact"` — no new components needed.
