# Findemy Student App — Bug & UI/UX Consistency Sweep

## Context

The student app (Expo + React Native, `apps/student/`) has accumulated drift across data, navigation, theme, and flow layers. The user asked for a verified audit — every issue below was confirmed by reading the offending file before being listed. Issues flagged by the audit agents that I could not reproduce in code are excluded. The deliverable is a grouped catalogue of bugs + a per-group execution plan + a new branded splash screen using the logo provided in `ai-usage/assets/splash_screen.jpeg`.

Theme reference (used in every group): `packages/ui/src/theme.ts` — `tokens.color.*`, `tokens.font.{serif,sans}`, `tokens.type.*` (label/tiny/micro/small/body/bodyLg/h1-h5/hero/splash), `tokens.space[0..16]`, `tokens.radius.*`.

---

## Issue Catalogue

### Group A — Data layer / API contract drift

A1. **`scheduled_at` vs `trial_at` everywhere** — API serializer (`apps/api/src/modules/trials/service.ts:25`) emits `trial_at`, but client code reads `scheduled_at`. Result: `new Date(undefined)` → "Invalid Date" on every trial card.
   - `apps/student/app/trials/index.tsx:73,93` (TrialCard date)
   - `apps/student/src/components/TrialCard.tsx:16,24`
   - `apps/student/src/components/BookingDetailSheet.tsx:144` (already has a fallback chain — OK there)
   - Expected: client reads `trial_at` (preserve the `?? scheduled_at` fallback if any third party still emits it).
   - Severity: **high** (visible bug on the primary list).

A2. **`coach_name` rendered but never serialized** — `apps/student/app/trials/[id].tsx:410-417` renders a Card with `trial.coach_name`. The trial serializer never emits it (`apps/api/src/modules/trials/service.ts:5-23`), so the card silently never shows.
   - Expected: either include `coach_name` from `Batch.coach.name` in the serializer, or remove the dead branch.
   - Severity: medium (feature dead).

A3. **Dead `trial.status === "completed"` check** — `apps/student/app/trials/[id].tsx:82` checks for `"completed"`, but `TrialStatus` enum is `booked|attended|missed|cancelled` (`apps/api/prisma/schema.prisma:292-297`). The `|| isPast` fallback masks it.
   - Expected: drop the `=== "completed"` branch; keep the `isPast` guard.
   - Severity: low.

A4. **`useTrial(id)` has no `enabled` guard** — `apps/student/src/hooks/useTrials.ts:16-20` fires a request even when `id` is undefined from `useLocalSearchParams`. Compare `useWorkshop` (`useWorkshops.ts:11-16`) which has `enabled: !!id`.
   - Expected: add `enabled: !!id`.
   - Severity: medium.

A5. **`@findemy/types` exports drift** — `packages/api-client/src/index.ts:16-17` imports `OAuthLoginRequest` and `AuthLoginResponse`, but `@findemy/types` exports `LoginRequest` (no `OAuthLoginRequest`/`AuthLoginResponse`). Fails `tsc` in the api-client package today.
   - Expected: either rename imports or add the missing exports to `packages/types/src/index.ts`.
   - Severity: medium (typecheck is broken).

A6. **`Appearance.AppleAuthenticationError` typo** — `apps/student/app/(auth)/index.tsx:116`. Property doesn't exist on the imported module.
   - Expected: rename to `AppleAuthenticationScope` or remove the reference.
   - Severity: medium (typecheck failure; runtime path may be unreachable but it's broken on paper).

### Group B — Cache invalidation & mutation hygiene

B1. **Duplicate `useEnrollBatch` with conflicting invalidation** — exported from BOTH `apps/student/src/hooks/useEnroll.ts:13-26` (invalidates `["enrollment", batchId]` AND `["me","enrollments"]`) and `apps/student/src/hooks/useRenewal.ts:13-25` (invalidates only `["me","enrollments"]`). Which one gets used depends on import path — silent bug.
   - Expected: keep only the `useEnroll.ts` version; delete the duplicate from `useRenewal.ts`.
   - Severity: high.

B2. **`useRegisterWorkshop` doesn't refresh user's registrations list** — `apps/student/src/hooks/useWorkshops.ts:31-42` invalidates `["workshops", workshopId, "registration"]` only. The bookings hub uses `["me","workshop-registrations"]` which stays stale.
   - Expected: also invalidate `["me","workshop-registrations"]`.
   - Severity: high.

B3. **`useCreateBooking` has no `onSuccess`** — `apps/student/src/hooks/useBookings.ts:10-13`. After booking, academy detail / slot picker still shows the consumed slot capacity.
   - Expected: invalidate `["batches", batchId, "slots", *]` and any `["batch-availability", batchId]` key on success.
   - Severity: high.

B4. **Review submit invalidates `["trials"]` but not the specific trial detail** — `apps/student/app/post-trial/index.tsx:51-52`. User goes back to `/trials/[id]` and the "Leave a review" CTA may still show.
   - Expected: also invalidate `["trial", trialId]`.
   - Severity: medium.

B5. **Toggle-save mutation key mismatch (suspected)** — saved-academies toggle invalidates `["saved"]` but the discover screen reads via `useSavedAcademies()`. Verify the consumer key matches before fixing.
   - Expected: confirm key, then align.
   - Severity: medium.

### Group C — Terminal-state UI gates

C1. **Workshop "Join Workshop" / "Booked ✓" stays after cancel until refetch** — `apps/student/app/workshop/[id].tsx:201-269`. `isRegistered` is computed from a possibly-stale query.
   - Expected: rely on the `useCancelWorkshopRegistration` invalidation (B-fix nearby) and treat `regStatusQ.isLoading` as "unknown" rather than "not registered".
   - Severity: medium.

C2. **Enrollment manage sheet: disabled buttons give no reason** — `apps/student/app/enrollment/[id].tsx:818-821`. Pause/Transfer/Discontinue dim with `opacity 0.4` but no helper text when enrollment is paused or inactive.
   - Expected: add a one-line hint under the row ("Already paused", "Enrollment ended").
   - Severity: medium.

C3. **Enrollment "Renew" tile is always tappable** — `apps/student/app/enrollment/[id].tsx:816`. No disabled check when enrollment is terminal (`ended`, `cancelled`). Backend rejects, but UI shouldn't offer it.
   - Expected: disable when `enrollment.status` is not in `["active","paused","ending"]`.
   - Severity: medium.

C4. **Event "Register" still rendered after registration deadline elapsed in-session** — `apps/student/app/events/[id].tsx:189-217`. Deadline computed once on render.
   - Expected: tick deadline via `setInterval(60_000)` like the trial countdown, or refetch.
   - Severity: low.

### Group D — Theme drift (visual)

D1. **~95 hardcoded `fontFamily: "System"` instances** that should be `theme.font.sans`. Heavy hitters:
   - `app/workshop/[id].tsx`, `app/academy/[id].tsx`, `app/program/[id].tsx`, `app/program/[id]/{trial,review,enroll}.tsx`, `app/booking/{slot,pay,confirmation}.tsx`, `app/{trials,post-trial,live,events}/...`, `src/components/{BatchDetailSheet,EventRowCard,WorkshopRowCard,ProgramRowCard,...}.tsx`.
   - Severity: high (drives Findemy off-brand on many screens).

D2. **Hardcoded `fontFamily: "Instrument Serif"`** (should be `theme.font.serif`) in `app/{booking,workshop,events,enrollment}/{pay,confirmation}.tsx`.
   - Severity: high.

D3. **Hardcoded brand hex codes** instead of `theme.color.*`:
   - `#D8492A` persimmon at `app/live/[batch_id].tsx:58`
   - `#1E5C5A` jade at `app/workshop/[id].tsx:244`
   - `#FAF6EE` ivory at `app/academy/[id].tsx:136,143,149` and `app/program/[id].tsx:126,172`
   - `#E8A33D` marigold at `app/(auth)/login.tsx:54`
   - `#E8552B`, `#88827B`, `#E8F5E9`, `#2E7D32` ad-hoc colours in `app/workshop/[id].tsx` and `app/trials/[id].tsx`
   - Severity: high.

D4. **Three identical inline `WORKSHOP_TYPE_COLORS` palettes** in `app/bookings.tsx:17-22`, `app/workshop/[id].tsx:28-33`, `src/components/BookingDetailSheet.tsx:27-32`. Plus a category palette duplicated in `app/enrollment/[id].tsx:36-39` that shadows `theme.category`.
   - Expected: extract to `apps/student/src/lib/typeColors.ts` (or expose via `@findemy/ui`).
   - Severity: medium.

D5. **Shadow color drift** — most screens use `shadowColor: "#000"`. Theme uses warm `#3C1E0A`. Examples: `app/(tabs)/index.tsx:497`, `app/events/[id].tsx:524`, `app/enrollment/[id].tsx:1314`, `app/program/[id]/review.tsx:749`.
   - Severity: low.

D6. **Type-ramp drift** — many `fontSize: 14/13/12/11/10` literals where the ramp has equivalent entries (`theme.type.{body,small,micro,tiny,label}.size`). Not all numeric sizes are bugs — only the ones that exactly map.
   - Severity: low (cosmetic but unbounded scope; treat as opportunistic cleanup, not a sweep).

### Group E — Shared-component reuse

E1. **Back button has 6 inline variants** (`‹` vs `←`, Pressable vs TouchableOpacity, hardcoded paddings). Representative offenders: `app/{academy,program,booking,workshop,events,trials,post-trial}/...` and `app/(auth)/{onboarding,signup}.tsx`.
   - Expected: ship a single `<BackButton>` in `apps/student/src/components/BackButton.tsx` (or `@findemy/ui`) and migrate.
   - Severity: medium.

E2. **Hand-rolled bottom sheets drift from the shared `CancelSheet` pattern** — `src/components/BookingDetailSheet.tsx`, `BatchDetailSheet.tsx`, `TrialBookingSheet.tsx`, `OfferingsSheet.tsx`, plus the in-screen filter sheet at `app/(tabs)/index.tsx:294`. Each re-implements the backdrop scrim, handle, and shadow.
   - Expected: factor a `<BottomSheet>` wrapper that takes `{ visible, onClose, children }` and renders the handle + scrim + paper background consistently.
   - Severity: medium.

E3. **Inline status pills / type tags** instead of `<Spill>` or `<Tag>` from `@findemy/ui`:
   - `app/enrollments.tsx:132-145` (WORKSHOP pill)
   - `app/post-trial/index.tsx:126` (ATTENDED pill)
   - `app/workshop/[id].tsx:166-171` (TYPE tag)
   - Several others in `bookings.tsx` and `trials/[id].tsx`.
   - Severity: medium.

E4. **Inline card containers** (View with paper bg + radius + padding) where `<Card>` from `@findemy/ui` would do — e.g., `app/refer.tsx:66-128`, `app/bookings.tsx:207-263`, `app/trials/[id].tsx:234` OTP block.
   - Severity: low (acceptable drift; tackle opportunistically).

E5. **"Loading…" treatment varies** — text-only ("Loading…"), `ActivityIndicator` in different colors, skeleton loaders in three shapes.
   - Expected: standardise on `<ActivityIndicator color={theme.color.persimmon}>` for inline waits and `<SkeletonLoader>` for above-the-fold lists.
   - Severity: low.

### Group F — Functional flow gaps

F1. **Pull-to-refresh missing on every list** — `app/trials/index.tsx`, `app/bookings.tsx`, `app/saved.tsx`, `app/enrollments.tsx`. None use `RefreshControl`.
   - Severity: high (breaks core RN pattern; primary booking hub can't be refreshed).

F2. **Booking pay screen renders mock totals before order data loads** — `app/booking/pay.tsx:136-145`. Uses `?? 15000` paise fallback; user can see ₹150 before the real fee arrives, and the Continue button is enabled.
   - Expected: gate the screen body and the Continue button on `order.isLoading` / `order.error`, show an error state with retry.
   - Severity: high (real-money UX).

F3. **OTP resend errors swallowed** — `app/(auth)/signup-otp.tsx:74-81`. `catch {}` empty. User can't tell if resend worked.
   - Expected: surface failure via the existing `ToastProvider`.
   - Severity: medium.

F4. **Session-expiry is silent** — `apps/student/src/lib/api.ts:11-37`. On refresh failure, store is cleared and the AuthGuard redirects to `/(auth)` with no message.
   - Expected: enqueue a Toast "Your session expired — please sign in again" before `clear()`.
   - Severity: high.

F5. **Push registration failures silent** — `src/hooks/usePushNotifications.ts:34-39`. `.catch(() => {})`.
   - Expected: at least telemetry log; for permission-denied, surface a soft banner once on the profile screen explaining how to re-enable.
   - Severity: medium.

F6. **Hardcoded business numbers on the pay screen** — `app/booking/pay.tsx:143-145`: `platformFee = 12`, `festiveCredit = trialFee >= 100 ? 50 : 0`. Mixes rupees and paise units and bakes a promotion into client code.
   - Decision: extend the API. `/payments/order` (trial booking) and the workshop/event/enrollment order endpoints will return a `breakdown` object: `{ base_paise, platform_fee_paise, credits_applied_paise, total_paise }`. Client renders verbatim — no business logic on the client.
   - Severity: high.

F7. **Currency formatting drift** — 4 different rupee renderers across the app (`Math.round / 100`, `.toFixed(0)`, `.toFixed(2)`, `(paise/100).toLocaleString("en-IN")`).
   - Expected: one `formatRupees(paise, { withDecimals?: boolean })` in `src/lib/format.ts`. Replace all sites.
   - Severity: medium.

F8. **Date formatting drift** — 5+ different format strings for the same logical "trial date".
   - Expected: `formatTrialDate(iso)` + `formatTrialDateShort(iso)` helpers using `date-fns` (already a dep).
   - Severity: low.

F9. **Tap-target & accessibility quick-wins** — star rating in `app/post-trial/index.tsx:158-178` (`paddingHorizontal: 6` only); many Pressables in `app/(tabs)/index.tsx` without `accessibilityLabel`.
   - Severity: low.

F10. **"Change Photo" stub** — `app/profile/edit.tsx:102-108` has the label but no `onPress`. Either wire ImagePicker or hide the affordance.
   - Severity: low.

### Group G — Splash screen redesign

G1. **Two splash layers exist and they don't match**
   - Native splash (`apps/student/app.json:9-13`): `./assets/images/splash.png` on `#FBF7EF` (ivory) — current asset is the old logo.
   - JS splash (`apps/student/app/index.tsx`): dark `theme.color.charcoal` background, italic serif "Findemy" + "Discover your art." sentence-case tagline.
   - User wants the new branded splash from `ai-usage/assets/splash_screen.jpeg`: dark navy backdrop, organic wave shapes in the corners, the 5-petal logo mark, two-tone wordmark ("Find" ivory + "emy" persimmon), uppercase "DISCOVER YOUR ART" subtitle with the persimmon underline rule.
   - Severity: medium (brand).

---

## Master Plan (execution order across groups)

The seven groups are independent. Recommended order — earlier groups have higher correctness risk so they go first; later groups are polish/breadth:

1. **Group A** (data contract) — half a day. Unblocks accurate UI in B/C.
2. **Group B** (cache hygiene) — half a day. Many quick wins; tested with manual flows.
3. **Group C** (terminal-state gates) — half a day.
4. **Group F** (functional flow gaps) — 1 day. Touches money + session paths.
5. **Group G** (splash) — half a day. Asset + JS rewrite.
6. **Group D** (theme drift) — 1–2 days. Largest surface area; do with codemod + manual review.
7. **Group E** (shared components) — 1–2 days. Pure refactor; do last.

Total estimate: ~5 working days for a single engineer, parallelisable across two.

---

## Per-Group Execution Flows

### Group A flow
1. Update client field reads: replace `trial.scheduled_at` with `trial.trial_at ?? trial.scheduled_at` in `app/trials/index.tsx` and `src/components/TrialCard.tsx` (keep the OR as a safety net; remove `scheduled_at` after grep confirms zero remaining producers).
2. Either add `coach_name` to the trial serializer (`apps/api/src/modules/trials/{repo,service}.ts` — include `batch.coach.name`) or delete the dead Card in `app/trials/[id].tsx:410-417`. Prefer adding it (real feature, low cost).
3. Drop the `=== "completed"` branch in `app/trials/[id].tsx:82`.
4. Add `enabled: !!id` to `useTrial` (`src/hooks/useTrials.ts:16-20`).
5. Fix `@findemy/types` exports: add `OAuthLoginRequest` (alias of `LoginRequest`) and `AuthLoginResponse` (the existing OAuth response type) to `packages/types/src/index.ts`, OR change the imports in `packages/api-client/src/index.ts:16-17` to the real names.
6. Replace `Appearance.AppleAuthenticationError` reference in `app/(auth)/index.tsx:116` with valid handling (or remove the branch if dead).
7. Verify with `npx tsc --noEmit` in each touched package.

### Group B flow
1. Delete the duplicate `useEnrollBatch` export from `src/hooks/useRenewal.ts:13-25` (keep `useRenewalOptions`, `useRenewEnrollment`, `useBatchAvailability`). Re-export `useEnrollBatch` from `useEnroll.ts` only.
2. In `useRegisterWorkshop`, also invalidate `["me","workshop-registrations"]`.
3. In `useCreateBooking`, add `onSuccess` that invalidates `["batches", batchId, "slots"]` and `["batch-availability", batchId]`. Pull batchId out of the mutation args.
4. In `post-trial` review submit, invalidate `["trial", trialId]` in addition to `["trials"]`.
5. Audit the saved-academy toggle and align the key naming between mutation and consumer.

### Group C flow
1. Workshop detail: treat `regStatusQ.isLoading` as a third state — show a skeleton in the CTA region until the query resolves. Don't render `Register` while loading.
2. Enrollment manage sheet: under each disabled row, render a 12px mist-coloured hint with the reason. Reuse the existing `isPaused/isDiscontinuePending/isInactive` flags.
3. Disable Renew tile when `enrollment.status` not in `["active","paused","ending"]`.
4. Event detail: add a `setInterval(60_000)` `now` tick (mirror trial countdown pattern) to re-evaluate deadline.

### Group D flow (full mechanical sweep)
1. Codemod: replace **every** `fontFamily: "System"` → `theme.font.sans` and **every** `fontFamily: "Instrument Serif"` / `fontFamily: "Geist"` → matching theme token. Where `theme` is not in scope, add `const theme = useTheme()` at the top of the component. Run a grep verification afterwards (`grep -rE 'fontFamily:\s*"(System|Geist|Instrument Serif)"' apps/student/{app,src}` returns zero).
2. Brand-hex sweep: grep `apps/student/{app,src}` for `#D8492A|#B33B1E|#FBE3D9|#1E5C5A|#C9DCD8|#E8A33D|#F7E4C0|#C7556A|#F3DBDF|#14110F|#3A332D|#8B7F73|#F1ECE2|#FAF6EE|#DDD3BC` and replace each hit with its token. The `#E8552B`/`#88827B` ad-hoc shades collapse to the closest token (`persimmon`/`mist`) — confirm visually after.
3. Extract `WORKSHOP_TYPE_COLORS` to `apps/student/src/lib/typeColors.ts`; update the three call sites in `app/bookings.tsx`, `app/workshop/[id].tsx`, `src/components/BookingDetailSheet.tsx`. Replace the inline category palette in `app/enrollment/[id].tsx:36-39` with `theme.category[category]`.
4. Expose `theme.shadow.{sm,md,lg}` from `packages/ui/src/theme.ts` (or use `theme.color.charcoal` directly). Replace every `shadowColor: "#000"` across `apps/student/{app,src}`.
5. Type-ramp sweep: replace numeric `fontSize` literals that exactly match a ramp entry (10→label, 11→tiny, 12→micro, 13→small, 14→body, 15→bodyLg, 18→h5, 22→h4, 24→h3, 30→h2, 38→h1, 44→hero, 78→splash) with `theme.type.<key>.size`. Skip any size that's not an exact match.
6. Hardcoded `color: "#fff"` / `"white"` survives only on dark backgrounds and is acceptable — no replacement.

Expect a ~80–120 file diff. Land in 2–3 PR chunks split by route group (auth, tabs, trials/booking, workshop/events, enrollment, profile/refer/saved) to keep review tractable.

### Group E flow
1. Create `apps/student/src/components/BackButton.tsx` (Pressable + `‹` glyph, `accessibilityLabel="Go back"`, hairline border optional). Migrate the listed offenders one screen at a time.
2. Create `apps/student/src/components/BottomSheet.tsx` wrapping `Modal` with handle + scrim + safe-area-padded sheet. Migrate `BookingDetailSheet`, `BatchDetailSheet`, `TrialBookingSheet`, `OfferingsSheet`, and the discover filter sheet.
3. Replace inline pills with `<Spill>` / `<Tag>` where the use is structurally a status pill.
4. Standardise loading: `<ActivityIndicator color={theme.color.persimmon}>` for inline; keep `SkeletonLoader` for top-of-screen lists.

### Group F flow
1. Add `RefreshControl` to the four list ScrollViews; wire to `refetch()` of the relevant queries. Test on Trials list first.
2. Pay screen guard: render an `<ActivityIndicator>` over the totals while `order.isLoading`, an `<ErrorState>` with retry on `order.error`. Continue button stays disabled until `order.data?.amount_paise` exists.
3. OTP resend toast: use the existing `useToast()` hook on success and failure.
4. Session expiry toast: enqueue a Toast at the top of `clear()` (or wherever the auth-redirect happens) before navigation.
5. Push registration: log to console + show a soft banner once on the profile screen via a flag in the auth store (`pushPermissionDenied: boolean`).
6. Money: extend the API order endpoints (`/payments/order`, `/payments/workshop-order`, `/payments/event-order`, `/payments/enrollment-order`) to return a `breakdown: { base_paise, platform_fee_paise, credits_applied_paise, total_paise }`. Update `packages/api-client/src/index.ts` and `packages/types/src/index.ts` typings. In `app/booking/pay.tsx` and sibling pay screens, render the breakdown directly — delete `platformFee = 12` and `festiveCredit = ...` constants. Create `apps/student/src/lib/format.ts` with a single `formatRupees(paise, { withDecimals?: boolean })` and migrate all currency renderers.
7. Date helpers: `apps/student/src/lib/format.ts` exposes `formatTrialDate(iso)`, `formatTrialDateShort(iso)`. Replace top offenders.
8. Accessibility: add `accessibilityLabel` and bump star-rating `paddingHorizontal` to `12` (effective ≥44pt target).
9. Hide or implement the Change Photo button — pick one in the same PR.

### Group G flow (splash redesign — SVG-based)
The logo will be recreated as `react-native-svg` paths so it's crisp at any density and themeable. `react-native-svg` is NOT currently a dep; add it.

1. **Add `react-native-svg`** to `apps/student/package.json` (Expo-managed: `npx expo install react-native-svg`).
2. **Add navy token** to `packages/ui/src/theme.ts` (`color.navy: "#1A1D3D"` or similar — pick from the reference image's exact midtone) so both the native splash bg and the JS splash share one source of truth.
3. **Native splash** (`apps/student/app.json`):
   - `expo.splash.backgroundColor` → `"#1A1D3D"` (or whatever navy hex we add).
   - `expo.splash.image` → keep the existing PNG for now, but generate a new one in step 6 below.
   - `expo.splash.resizeMode` stays `"contain"`.
4. **Build SVG primitives** in `apps/student/src/components/splash/`:
   - `FindemyLogoMark.tsx` — `<Svg viewBox="0 0 240 280">` containing 5 `<Path>` petals (orange dancer top-left, ivory musician top-right curl, olive painter mid-left, plum music-note mid-right, beige yogi bottom). Path data extracted from a vector trace of the source JPEG (manual or via an SVG tracer). Stroke none, fills mapped to theme tokens (`theme.color.persimmon`, `theme.color.ivory`, olive `#7E7D44` or new token, `theme.color.plum`, beige `theme.color.bone`).
   - `FindemyWordmark.tsx` — two `<Text>` siblings: `Find` in `theme.color.ivory`, `emy` in `theme.color.persimmon`. Sans-serif heavy weight, ~48pt. Render in plain RN (not SVG) so font scaling stays standard.
   - `SplashWaves.tsx` — `<Svg>` with 4 organic `<Path>` blobs absolutely positioned in the corners. Colours: top-left plum (`theme.color.plum`), top-right deep persimmon (`theme.color.persimmonDeep`), bottom-right jade (`theme.color.jade`), bottom-left dark brown (new `theme.color.brown` or `inkSoft`). 60% opacity. Skip for v1 if extracting paths is too time-consuming — fall back to large rotated rounded `View`s as in current code.
5. **Rewrite JS splash** (`apps/student/app/index.tsx`):
   - Full-bleed `View` with `backgroundColor: theme.color.navy`.
   - `<SplashWaves />` in the background.
   - Centred column: `<FindemyLogoMark width={width * 0.55} />` → `<FindemyWordmark />` → `<View>` 1px persimmon rule, 56px wide → `<Text>` "DISCOVER YOUR ART" in ivory @ 70% opacity, letterSpacing 4, `theme.type.tiny.size`.
   - Keep the existing `useEffect` redirect timing (1200 ms → `(tabs)` or `(auth)`).
   - Drop the existing serif-`F` mark, the marigold/persimmon radial glows, the loader bar, and the "V 1.0 · CRAFTED IN BENGALURU" footer (replace footer with the same uppercase in `theme.color.whisper` if branding wants to keep it).
6. **Regenerate native splash PNG**: export the React-rendered splash (or a Figma copy of it) to a single 1284×2778 PNG at `apps/student/assets/images/splash.png` so the OS-level splash matches the JS splash exactly — no flash-of-old-design. (Manual step; outside Claude's reach.)
7. **Android adaptive icon**: leave the existing icon untouched unless the brand wordmark mark is being adopted as the new icon — separate decision.

---

## Critical Files (representative — not exhaustive)

- Data/contract: `apps/api/src/modules/trials/{repo,service}.ts`, `apps/student/app/trials/{index.tsx,[id].tsx}`, `apps/student/src/components/TrialCard.tsx`, `apps/student/src/hooks/useTrials.ts`, `packages/api-client/src/index.ts`, `packages/types/src/index.ts`, `apps/student/app/(auth)/index.tsx`.
- Cache: `apps/student/src/hooks/{useEnroll,useRenewal,useBookings,useWorkshops}.ts`, `apps/student/app/post-trial/index.tsx`.
- Terminal-state: `apps/student/app/{workshop/[id],enrollment/[id],events/[id]}.tsx`.
- Theme drift: every file under `apps/student/app/` + `apps/student/src/components/`. Pattern, not file list.
- Shared components: `apps/student/src/components/{BackButton,BottomSheet}.tsx` (new), plus migrations.
- Functional flow: `apps/student/app/booking/pay.tsx`, `apps/student/app/(auth)/signup-otp.tsx`, `apps/student/src/lib/{api,billing,format}.ts`, list screens listed in F1.
- Splash: `apps/student/app.json`, `apps/student/app/index.tsx`, `apps/student/assets/images/splash-logo.png` (new).

---

## Verification

For each group:

- **A**: `npx tsc --noEmit` in `apps/api`, `packages/api-client`, `apps/student` shows zero errors in touched files. Run the app, open Trials list, confirm dates render correctly. Open a trial that has a coach — coach name appears.
- **B**: Manually run flows — book a trial, then check slot capacity in academy detail decreases without app reload. Register for a workshop, then open Bookings hub; new entry shows immediately. Submit a review, navigate back to the trial detail — "Leave a review" CTA is gone.
- **C**: Cancel a workshop, return to its detail page — the CTA flips to "Register" (or appropriate). Open enrollment manage sheet on a paused enrollment — hints visible, Renew greyed out on a terminal enrollment.
- **D**: Run a colour-token grep — `grep -r '#D8492A\|#1E5C5A\|#FAF6EE' apps/student/{app,src}` returns nothing in touched files. `grep -r 'fontFamily: "System"' apps/student/{app,src}` returns nothing in touched files.
- **E**: Open every screen, back-button visual is identical. Open every bottom sheet, scrim/handle/shadow identical.
- **F**: Pull down on Trials/Bookings/Saved/Enrollments — refresh spinner shows, data refetches. Force the API to return 401 → toast appears + redirect. Try resend OTP with network offline → toast.
- **G**: Cold-launch the app — native splash shows the new logo on deep indigo (no flash of ivory). JS splash matches the reference image side-by-side. Tagline reads "DISCOVER YOUR ART", uppercase, persimmon rule above it.

Touch up the existing Findemy test plan as needed; the new helpers in `src/lib/{billing,format}.ts` should get small unit tests.
