# Academy App — New UI Migration Plan

## Context

The student-app UI migration (`docs/student-app-ui-migration-plan.md`) is complete and
approved. We now do the same for the **academy-app** (`academy-app/`, package
`@findemy/admin`, Expo Router / RN 0.81) — migrate every screen to the design in
`ai-usage/prototypes/Findemy Academy App.html` (25 screens + 5 sheets), keeping the exact
same flows, data, and states.

**Why this is mostly a re-skin (not a rebuild):** unlike the student effort, nearly every
prototype concept here is already backed by real endpoints and already matches the locked
product model — QR check-in (`checkin-token` + 5s poll), Findemy-hosted live room
(`live/start`, 100ms), trial OTP attendance, workshops, coaches, earnings-with-commission,
cancel-only schedule, and computed read-only `trial_spots` (capacity − active enrollments,
`@findemy/types`). Confirmed: `schedule.tsx` already notes "trial-availability publishing +
class reschedule removed (Schedule is cancel-only)". So there are **no product-model
divergences to reconcile** — the gap is purely component-level chrome (academy still
hand-rolls headers, menu rows, dark hero, category chips, and uses the OLD shared `NavBar` +
old font pattern) versus the refreshed `@findemy/ui` the student app now uses.

## Guardrails (agreed this session)

1. **Prototype = visuals; existing code = data / flows / states.** Never invent data the API
   doesn't return — flag it at slice start and decide per-case whether to extend the backend
   (needs explicit OK) or drop the element. All loading / empty / error states preserved.
2. **Tab bar:** build an **academy-local floating `TabBar`** (persimmon active-fill pill,
   Home/Schedule/Students/Studio, hidden on pushed screens) mirroring the student-local
   `TabBar` pattern. **Leave the shared `NavBar` untouched.**
3. **Screen chrome:** adopt shared `@findemy/ui` components where they fit — swap academy's
   local `ScreenHeader` → shared `ScreenHeader`; use shared `Summary`/`SummaryRow`/`ActionBar`/
   `MenuRow` (already in the barrel, currently unused by academy). Keep the academy-local
   `Screen` wrapper (it reserves `NAV_BAR_HEIGHT`).
4. **Shared-UI safety (reverse of student rule):** prefer additive / academy-local changes.
   When a shared component the **student-app** renders must change, typecheck student-app too
   and preserve its look; flag any unavoidable drift.
5. **Font fix everywhere:** replace raw `fontFamily: theme.font.serif` + `fontStyle:'italic'`
   and `fontWeight` with `theme.font.serifItalic` / `theme.font.sansFor(weight)` (RN can't
   synthesize italic/bold for named custom fonts). Current offenders: `(tabs)/studio.tsx`,
   `(tabs)/_layout.tsx` (`AcaIcon`), `(auth)/index.tsx`, and more.
6. **Sizing** runs ~15–20% smaller than raw prototype px (carried from student — raw sizes
   read too big on device).
7. **Cadence:** one slice → `pnpm typecheck` (academy-app **and** student-app) + boot Metro →
   user eyeballs on device → user OK → next slice. No new routes / flows.

## Design tokens (already shared, confirmed consistent)

persimmon `#EC5A2B` (primary), jade `#1E6F66`, gold `#C8862A`, rose `#C0392B`, ink `#1A1611`;
serif = Libre Caslon Display, serif-italic = Libre Caslon Text, sans = Plus Jakarta Sans.
Palette is **persimmon-primary** (jade is a secondary accent only).

## Slices

Each slice: re-skin listed screens to the prototype, preserve all data hooks / flows / states,
apply the font fix, flag any data gap. Prototype screen ids in `()`.

- **Slice 0 — Foundation.** Academy-local floating `TabBar` → wire into `app/(tabs)/_layout.tsx`
  (replaces shared `NavBar` usage there; Studio tab = house icon per prototype, drop/keep-decision
  on `AcaIcon`). Reconcile in `@findemy/ui` (additive, student-safe): dark dashboard-card,
  attendance-tier badges (`.tier` Active/Irregular/Inactive), seg/segmented-choice, chip/pill
  groups, QR/live-room primitives as needed. Confirm shared `ScreenHeader`/`Summary`/`ActionBar`/
  `MenuRow` render correctly in academy context.
- **Slice 1 — Auth/onboarding** (welcome, login, signup, otp, onboarding): `(auth)/index.tsx`,
  `login.tsx`, `signup.tsx`, `verify-otp.tsx`, `onboarding.tsx`.
- **Slice 2 — Home/Inbox** (inbox): `(tabs)/inbox.tsx` — dark summary card, new-trial list, recent
  activity, earnings mini-card. Preserve 30s poll + skeletons + inbox badge.
- **Slice 3 — Schedule** (schedule, sheet-cancel-class): `(tabs)/schedule.tsx` — week strip, day
  classes (Now/Upcoming/Cancelled), trials-today, cancel-class sheet (unbilled + make-good copy).
  Remove dead `publishBtn` style.
- **Slice 4 — Students** (students, student, sheet-filters): `(tabs)/students.tsx`,
  `students/[id].tsx` — search, attendance pill filters, tier badges, filters sheet (Batch +
  Attendance, single-select).
- **Slice 5 — Studio hub** (studio, edit-profile, settings): `(tabs)/studio.tsx` cover-banner hero
  + 3-up quick-stats + Manage/Account `MenuRow` sections; `profile/edit.tsx`; `(tabs)/settings.tsx`.
- **Slice 6 — Batches + attendance + live** (batches, batch, new-batch sheet, attendance-qr,
  live-class): `batches/index.tsx`, `new.tsx`, `[id]/index.tsx`, `[id]/edit.tsx`, `[id]/students.tsx`,
  `[id]/attendance.tsx` (QR + 5s roster poll), `[id]/live-class.tsx` (Findemy room). Batch detail
  shows "X/Y enrolled · N trial spots open" from real `trial_spots`.
- **Slice 7 — Trials** (trial, attendance-otp): `trial/[id].tsx` (auto-confirmed, studio/online
  mode, Mark attendance), `attendance-otp.tsx` (verify code → present / no-show).
- **Slice 8 — Coaches** (coaches, coach, add-coach + assign-coach sheets): `coaches/index.tsx`,
  `new.tsx`, `[id].tsx`.
- **Slice 9 — Reviews** (reviews, respond): `reviews.tsx` (summary bars, filter chips),
  `reviews/[id]/respond.tsx` (tone chips + composer).
- **Slice 10 — Workshops** (workshops, workshop-edit): `(tabs)/workshops.tsx`, `workshops/new.tsx`,
  `workshops/[id].tsx`. Flag whether workshop `mode` (studio/online) is API-backed at slice start.
- **Slice 11 — Earnings** (earnings): `earnings.tsx` — Week/Month/Year seg, split dashboard,
  transactions incl. Findemy-commission line, next-payout card.

## Screen → Route mapping (1:1, high confidence)

| Prototype screen | Route |
|---|---|
| welcome / login / signup / otp / onboarding | `(auth)/index, login, signup, verify-otp, onboarding` |
| inbox / schedule / students / studio | `(tabs)/inbox, schedule, students, studio` |
| student | `students/[id]` |
| trial / attendance-otp | `trial/[id]`, `attendance-otp` |
| attendance-qr / live-class | `batches/[id]/attendance`, `batches/[id]/live-class` |
| batches / batch | `batches/index`, `batches/[id]/index` (+ `edit`, `students`, `new`) |
| coaches / coach | `coaches/index`, `coaches/[id]` (+ `new`) |
| reviews / respond | `reviews`, `reviews/[id]/respond` |
| workshops / workshop-edit | `(tabs)/workshops`, `workshops/[id]` (+ `new`) |
| earnings / edit-profile / settings | `earnings`, `profile/edit`, `(tabs)/settings` |

## Critical files

- `academy-app/app/(tabs)/_layout.tsx` — swap shared `NavBar` → academy-local `TabBar` (Slice 0).
- New `academy-app/src/components/TabBar.tsx` — floating pill nav (model on student-app's local TabBar).
- `academy-app/src/components/Screen.tsx` (keep, reserves `NAV_BAR_HEIGHT`),
  `ScreenHeader.tsx` (retire in favor of shared `@findemy/ui` `ScreenHeader`).
- `backend/shared/ui/src/` — additive components + `theme.ts` font helpers already present
  (`serifItalic`, `sansFor`); reconcile dashboard-card/tier/QR/live primitives here.
- Data hooks (unchanged, reused): `academy-app/src/hooks/useStudioQueries.ts`,
  `useStudioAcademy.ts` → `api.studio.*` in `backend/shared/api-client/src/index.ts`.

## Reuse (do not rebuild)

Shared `@findemy/ui`: `ScreenHeader`, `Summary`/`SummaryRow`, `ActionBar`, `MenuRow`,
`SectionLabel`, `StatusBanner`, `AttendanceCodeCard`, `BlockPrint(Cover)`, `CategoryArt`,
`Button` (pill), `IconButton`, `Chip`, `Tag`/`Spill`, `StarRating`, `OTPInput`, `SegTabs`/`Tabs`,
`Avatar`, `Divider`, `SectionHeader`. Theme helpers `theme.font.serifItalic` / `sansFor(weight)`.

## Verification (per slice)

1. `pnpm typecheck` — must be clean in **both** `academy-app` and `student-app`.
2. Boot Metro for academy-app; user eyeballs the migrated screen(s) on device.
3. Drive the real flow for that slice (e.g. Slice 7: open a trial → Mark attendance → enter OTP →
   present/no-show) to confirm data/flow/states preserved, not just visuals.
4. User approves → next slice.

### Environment reminders (carried from student migration)
- Restart the API / re-seed if prices, photos, or new fields aren't served.
- Node 22, port 5433, `prisma db push`, dev OTP/webhook (see memory `findemy-local-run-setup`).
- Tab screens need ~110px bottom scroll padding for the floating tab bar.
