# Student App — New UI Migration Plan

Migrate all student-app screens to the design in
`ai-usage/prototypes/Findemy Student App.html` (38 named prototype screens),
keeping the exact same flows.

## Guardrails (agreed)

1. **Prototype = visuals; existing code = data / flows / states.** Where the
   prototype shows data the API doesn't return, flag it — never invent it. All
   loading / empty / error states in the current code are preserved.
2. **`@findemy/ui` (backend/shared/ui) is freely editable.** Keep `academy-app`
   compiling; flag any visual drift it causes there.
3. **6 uncovered routes** (`refer`, `review`, `program/[id]/review`,
   `program/[id]/trial`, `enrollments` list, `live/[batch_id]`) get re-skinned to
   the new tokens/components with layout kept; each is enumerated when touched.
4. **Cadence:** one slice → `pnpm typecheck` + boot Metro (+ academy-app
   typecheck) → user eyeballs on device → user OK → next slice.
5. **No new routes / flows.** Prototype-only screens (`event-confirm`,
   `past-classes`, `post-trial-done`) become sub-states of existing routes.
6. Medium-confidence mappings resolved from code at the start of their slice.

## Slices

- **Slice 0 — Foundation:** app chrome + shared components (topbar/back button,
  bottom tab bar, card/row-card variants, block/summary section, sheets,
  buttons, chips, pills) reconciled in `@findemy/ui` against the prototype.
- **Slice 1 — Auth/onboarding:** welcome, signup, phone/login, otp (login +
  signup), onboarding, interests.
- **Slice 2 — Discover tab** + saved.
- **Slice 3 — Academy + offerings.**
- **Slice 4 — Program + trial booking** (program, booking-slot/pay/confirm).
- **Slice 5 — Enrollment** (enroll-select/pay/confirm/manage).
- **Slice 6 — Workshop** (workshop/pay/confirm).
- **Slice 7 — Event** (events tab, event detail/pay/confirm).
- **Slice 8 — Classes/bookings** (classes tab, bookings, booking-detail, trials,
  class-detail, past-classes, checkin-scan, post-trial).
- **Slice 9 — Profile** (profile tab, edit, general-info).
- **Slice 10 — Uncovered routes** (re-skin only).

## Screen → Route mapping

High confidence unless marked. Med-confidence rows resolved from code at slice start.

| Prototype screen | Route |
|---|---|
| welcome / signup / phone / otp-login / otp / onboarding / interests | `(auth)/index, signup, login, login, signup-otp, onboarding, interests` |
| discover / events / profile | `(tabs)/index, events, profile` |
| academy / offerings | `academy/[id]`, `academy/[id]/offerings` |
| program | `program/[id]` |
| booking-slot / booking-pay / booking-confirm | `booking/slot, pay, confirmation` |
| enroll-select / enroll-pay / enroll-confirm / enroll-manage | `program/[id]/enroll` (med), `enrollment/pay, confirmation, [id]` |
| workshop / workshop-pay / workshop-confirm | `workshop/[id], pay, confirmation` |
| event / event-pay / event-confirm | `events/[id], pay`, sub-state of pay |
| bookings / booking-detail / trials | `bookings.tsx`, `trials/[id]` (med), filter of bookings (med) |
| classes / past-classes / class-detail | `(tabs)/classes`, sub-state, `live/[batch_id]`? (med) |
| checkin-scan | `checkin-scan.tsx` |
| post-trial / post-trial-done | `post-trial/index`, sub-state |
| saved / edit-profile / general-info | `saved, profile/edit, profile/general-info` |

## PROGRESS / HANDOFF (as of last session)

### Done & approved
- **Slice 0 — Foundation.** `@findemy/ui` refreshed: `Button` (pill), `IconButton`
  (`.icon-btn`), `Chip`, new `Summary`/`SummaryRow` + `ActionBar`. New student-local
  floating dark pill `TabBar` (wired into `(tabs)/_layout`), `ScreenHeader` (topbar),
  `BottomSheet` (30px radius). Shared `NavBar` left untouched (academy-app uses it).
- **Font fix (theme-wide).** RN can't synthesize italic/bold for a named custom font,
  so `theme.font` now exposes `serifItalic` + `sansMedium/sansSemibold/sansBold` and a
  `sansFor(weight)` helper. Use these instead of `fontWeight` on the base family in all
  future slices.
- **Slice 1 — Auth/onboarding.** welcome, signup, login(phone), signup-otp (shared by
  login+signup), onboarding, interests. New `AuthScaffold` (+ `AuthHeading`/`Em`/
  `AuthSub`/`AuthKicker`). Signup age now `>0 && <120` (was 5–25), placeholder `18`.
- **Slice 2 — Discover + Saved.** `AcademyCard` rebuilt (compact `studio-card` +
  default `near-card` with white heart + "Trial from ₹X" + "View →"). Discover: hero,
  pill search, category pills, top-rated carousel, near-you list, filter sheet,
  `LocationSheet` (Delhi-NCR presets → sets real coords). Backend: `searchAcademies`
  now includes batches; list serializer returns `trial_from_paise`/`monthly_from_paise`.
  Seed: academies get category Unsplash covers (the prototype photos).
- **Slice 3 — Academy + Offerings.** Academy: hero + 3 stat cards + About + `SegTabs`
  (Programs/Workshops, first 2 inline) + "See all N offerings" → offerings route +
  reviews (top 5 as white cards + "See all reviews") + coaches. New `SegTabs`;
  `ProgramRowCard` rebuilt to `.row-card`. Offerings screen rebuilt.
- **Slice 4 — Program + Trial Booking.** Program screen (Summary card, batch
  `OptionRow`s, About, policy, dual CTA). Trial flow slot→pay→confirm rebuilt with new
  `Stepper` + `OptionRow`; Razorpay/dev-simulate + polling/reminder preserved.
  "Book a Trial" now uses the 3-step route (was `TrialBookingSheet`, now unused).

### Done & approved (cont.)
- **Slice 5 — Enrollment.** Resolved the open ambiguity from code: the live enroll path is
  `program/[id]` → **`program/[id]/review`** → `enrollment/pay` → `enrollment/confirmation` →
  `enrollments`; **`program/[id]/enroll.tsx` + `CohortCard` were dead code (deleted)**.
  - `review.tsx` → **enroll-select**: `ScreenHeader`, read-only "Your batch" `Summary` + "Change"
    (→ `router.back()`), and a **Monthly/Quarterly/Annual plan picker** (`OptionRow`). Pricing is
    **computed client-side** mirroring the server `getRenewalOptions` formula (`PLAN_MONTHS` +
    batch `*_discount_bps`, capped at `DISCOUNT_BPS_CAP`) — `useRenewalOptions` can't be used
    pre-enroll (it 404s without an existing enrollment). Stops hard-coding `"monthly"`; forwards
    the server's authoritative `amount_paise` to pay.
  - `enrollment/pay.tsx` → **enroll-pay**: `Summary` (Enrolment/Plan) + single Razorpay `OptionRow`
    + trust notice + `ActionBar` "Pay & enrol". Dev-simulate webhook + Razorpay SDK + `flow=enroll|renewal` preserved.
  - `enrollment/confirmation.tsx` → **enroll-confirm**: checkmark hero + "You're enrolled!" +
    `Summary` (Class / Starts / Plan) + "View my classes" (→ `(tabs)/classes`) / "Back to discover".
    30s polling + timeout state preserved. (No next-class subhead — the detail endpoint returns no
    schedule/next-class, so not invented.)
  - `enrollment/[id].tsx` → **enroll-manage**: kept hero + paused/discontinue banners + join-live +
    next-class + schedule + attendance + batch-details (all real data preserved). Replaced the
    header "Manage" modal grid with **4 stacked action rows** on-screen (Renew / Pause / Transfer /
    Discontinue-rose) opening sub-sheets. **Transfer now lists sibling batches** (same academy +
    category via `useAcademy(academy_id)`, seats-aware) instead of paste-batch-ID. **Preferred-package
    folded into the Renew sheet** as a "set as default" checkbox.
  - Flags: discontinue keeps the code's real behavior (access-until-period-end, **no refund** — the
    prototype's refund copy was not adopted). `paused_until`/`discontinue_requested_at`/`current_period`
    aren't in the `/me/enrollments` list serializer, so those banners/plan-renews line stay dormant
    (pre-existing; not fabricated).
  - Verified: `pnpm typecheck` clean in **student-app** and **academy-app**. Device eyeball pending.

### Done & approved (cont. 2)
- **Slice 6 — Workshop.**
  - `workshop/[id].tsx`: hero image (existing `getWorkshopImage(type)` placeholder — workshops have
    no cover field) + overlaid back, `Tag` (Workshop / Online), serif title, academy subtitle,
    `Summary` key-facts (When / Where / Spots left), About, and a **cancellation policy that reflects
    the real non-refundable behavior (S4.4)** — the prototype's "full refund" copy was NOT adopted.
    All CTA states preserved (loading / join-live / booked+cancel / complete-payment / register /
    full) + `CancelSheet`.
  - `workshop/pay.tsx`: `ScreenHeader` + `Summary` + single Razorpay `OptionRow` + trust notice +
    `ActionBar` "Pay & register". Order query + dev-simulate webhook + Razorpay preserved.
  - `workshop/confirmation.tsx`: checkmark hero + "You're registered!" + `Summary` + "View my
    bookings" (→ `bookings`) / "Back to events" (→ `(tabs)/events`). 30s polling + timeout kept.
  - `WorkshopRowCard`: restyled to the `.row-card` pattern (matches `ProgramRowCard`) — thumb +
    title + Workshop/Online badge + date + fee/seats + chevron; **now navigational only**.
  - Flag: the row card's inline **quick-book/Pay-now button + seats pill were dropped** (not in the
    prototype `.row-card`); registration still happens on the detail screen. Confirm if you want the
    quick-book kept.
  - Verified: `pnpm typecheck` clean in **student-app** and **academy-app**. Device eyeball pending.
  - **✅ Slice 6 fidelity fixes applied (from real decoded prototype):** detail badge now **gold
    `.b-workshop`** (`Tag tone="marigold"`) + jade "Online" badge for online; hero now **250px with
    scrim-top + back + save/heart** (heart is visual-only local toggle — no save-workshop API yet,
    flagged); title 32px; **pay & confirm now show a thumbnail + "When" row** (fetched via
    `useWorkshop(workshop_id)`), total box + inline Pay button. `WorkshopRowCard` already on
    `.row-card`. **Policy copy kept truthful (non-refundable, S4.4)** — NOT the prototype's "full
    refund up to 48h"; flip only if workshops are actually meant to be refundable.

### Pending slices
  Also restyle `WorkshopRowCard` to the prototype `.row-card` (still old-styled).
- **Slice 7 — Event.** ✅ DONE. User asked to **extend the backend** rather than fake data.
  - **Backend:** added `prizePaise`/`isSpotlight`/`divisions` to `Event`; serializer emits
    `prize_paise`/`is_spotlight`/`spots_left`/`divisions`; seed sets a spotlight competition
    (₹50,000 + divisions). `prisma generate` run; **⚠️ user must `pnpm prisma db push` + re-seed.**
  - **Fixed pre-existing bug:** event screens read camelCase but API is snake_case → detail showed
    no date, spotlight never rendered. Now read real snake_case fields.
  - `(tabs)/events.tsx` prototype hero + ink pills + real spotlight (Prize pool) + section-head;
    `EventRowCard` → `.row-card`; `events/[id].tsx` prototype hero/summary/Categories chips;
    `events/pay.tsx` prototype pay **+ event-confirm sub-state** ("You're in!").
  - Imagery = placeholder photos (`getEventImage`, events have no cover field). Register/cancel/CTA
    states + `CancelSheet` preserved. Typecheck clean: backend/api, student-app, academy-app.
- **Slice 8 — Classes/bookings.** ✅ DONE (built from real decoded prototype).
  - `(tabs)/classes.tsx`: "My Classes." hero + **Trials** (from `useTrialsMy("upcoming")`) +
    **Enrolled** + **Past** sections as `.row-card`s (BlockPrintCover thumb, status badges);
    trials→`/trials/[id]`, enrolled/past→`/enrollment/[id]`.
  - `bookings.tsx`: **Upcoming/Past `.seg`** + `.row-card`s across trials/workshops/enrollments,
    each navigating to its real detail route (dropped the old `BookingDetailSheet`).
  - `trials/[id].tsx` (booking-detail): re-skinned to prototype (read-only card → confirmed/
    completed/cancelled banner → **attendance-code** box → Session details `Summary` →
    Get directions[maps]/Join → **Order details**). Preserved cancel/reschedule/review/
    join-batch/OTP. Replaced the old two-branch countdown layout (fixed its broken italic).
  - `post-trial/index.tsx`: prototype review (serif "How was it?", Attended card, star-rate,
    chips, note → Submit) + **post-trial-done** sub-state ("Thanks for the review!" → Enrol now /
    Maybe later). Review submit via `api.reviews.create` preserved; now passes real `academyName`.
  - `checkin-scan.tsx`: prototype dark scanner (X close, corner-bracket viewfinder + scan line,
    class name via params); **real scan flow preserved** (no fake "mark present" button).
  - `enrollment/[id].tsx`: added **"Scan to check in"** for in-studio active classes → `/checkin-scan`
    (so the scanner is reachable; class-detail's scan/join maps onto the existing enrollment screen).
  - Typecheck clean: student-app + academy-app. Flag: `class-detail` isn't a separate screen —
    join-live/scan live on `enrollment/[id]` (merged in Slice 5); past classes stay inline on the
    Classes tab (kept the existing flow rather than a new past-classes route).
- **Slice 9 — Profile.** ✅ DONE (from real decoded prototype).
  - `(tabs)/profile.tsx`: "Profile." hero + Edit pill, gold **notifications-off notice** (when
    `pushPermissionDenied`), avatar row (name/email/phone·location), **quick-grid** (Past classes /
    Your Bookings / Wishlist), `.pmenu` "Your information" (Past classes, Bookings, Wishlist,
    Profile details, General info, Refunds), and an Account `.pmenu` with **Log out** (rose). Logout
    flow preserved.
  - `profile/edit.tsx`: prototype `.field` form — Full name*, Email, Phone (read-only + helper),
    **Location** (was missing — its absence could fail the required-field save); Change photo
    (ImagePicker) + Save (`api.me.updateOnboarding`) + Delete account preserved.
  - `profile/general-info.tsx`: prototype `.pmenu` (Terms / Privacy / About / Help & Support) +
    "Findemy · vX · Delhi-NCR" footer.
  - Fixed broken `fontStyle:"italic"` on the profile/edit avatars → `theme.font.serifItalic`.
  - Typecheck clean: student-app + academy-app. Flags: **Past classes** links to the Classes tab
    (past shown there; no separate past-classes route per "no new routes"); **Age** field from the
    prototype omitted (the profile update API doesn't accept it).
- **Slice 10 — Uncovered routes (re-skin only)**. ✅ DONE (device eyeball pending).
  - **Scope correction:** `program/[id]/review.tsx` is *already* the migrated enroll-select
    screen from Slice 5 (misnamed file; renaming = a route change, left alone) → **no work**.
    So Slice 10 = re-skin **5** screens, keeping every layout/flow/data path.
  - `app/refer.tsx`: hero head → **`ScreenHeader "Refer & earn"`**; Share/Copy →
    `Button` (`ink`/`ghost`, `sm`); Claim → `Button sm` (loading/disabled preserved);
    points/code/history layout kept; all `fontWeight`/`fontStyle` → font families.
  - `app/review.tsx`: added missing **`ScreenHeader`** (was no back affordance); submit
    moved into a sticky **`ActionBar`**; kept the hand-rolled interactive stars (shared
    `StarRating` is **display-only** — `editable`/`onChange` declared but ignored); dropped
    the empty `StyleSheet`. ALREADY_REVIEWED / NOT_ELIGIBLE copy preserved.
  - `app/program/[id]/trial.tsx`: `topBar`/`BackButton` → **`ScreenHeader "Book a trial"`**
    (serif hero dropped per user choice; the "title · 45-min trial · fee" line kept as a
    subtitle); absolute footer → sticky **`ActionBar`** (safe-area inset); date-strip + slots
    grid layout kept; `tokens.font`/`fontWeight` → `theme.font.*`. Booking flow untouched.
  - `app/enrollments.tsx` (light polish): ad-hoc category + status pills → shared **`Tag`**
    (`persimmon`/`marigold`/`rose`/`jade`/`bone`, same conditional logic/labels); rich card
    (progress dots, day chips, next-class) + pull-to-refresh kept; `fontWeight` → `sansSemibold`.
  - `app/live/[batch_id].tsx` (dark): added translucent **close button** (mirrors
    `checkin-scan`); emoji → `IconCamera` badge (in-session); Leave/Go-back → `Button primary`
    (shared `IconButton` unsuitable on dark ink bg → used the checkin-scan translucent-circle
    pattern for close); `fontWeight` → font families. 100ms stub + error branches preserved.
  - Verified: `pnpm typecheck` clean in **student-app** and **academy-app**; **no** `@findemy/ui`
    edits needed. Device eyeball pending → then Slice 10 (and the migration) complete.

### Open reminders (to actually SEE some things)
- **Restart the API** so `trial_from_paise` (Slice 2/4 prices) is served.
- **Re-seed the DB** (destructive to local data) so academy photos appear; otherwise
  block-print art shows as the fallback.
- Tab screens need ~110px bottom scroll padding for the floating tab bar — handled per
  tab-screen slice (2 done; events/classes/profile still to do in 7/8/9).

### Working agreement (recap)
Prototype = visuals; existing code = data/flows/states (flag gaps, never invent). Freely
edit `@findemy/ui` but keep `academy-app` compiling. Cadence: one slice → typecheck +
boot Metro → user eyeballs on device → approve → next. Sizing runs ~15–20% smaller than
the raw prototype px (user consistently found raw sizes too big) — carry this tighter
scale into remaining slices.

## Environment facts

- Expo Router file-based routing; RN 0.81, Expo 54, React 19.
- Design tokens already migrated in `backend/shared/ui/src/theme.ts` (persimmon
  `#EC5A2B`, jade `#1E6F66`, gold `#C8862A`, ink `#1A1611`).
- Fonts bundled + registered in `app/_layout.tsx`: Libre Caslon Display/Text +
  Plus Jakarta Sans.
- Native-only bits (maps, camera check-in, Razorpay) verified by code, noted.
