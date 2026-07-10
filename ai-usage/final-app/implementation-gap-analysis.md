# Findemy — Implementation vs. New Product (Gap Analysis)

> **Purpose.** Compares the **existing app code** (`student-app`, `academy-app`, `backend/api`) against the **new prototypes** (`../prototypes/`) and the **final-app docs** (`backend.md`, `student-app.md`, `academy-app.md`, `master-feature-document.md`). For each app it answers: what already **works**, what **needs changes** (UI/UX + functionality), and what to **discard**.
>
> **Canonical code:** `/home/mp2sslrl/jelly/code/{backend, student-app, academy-app}` — reorganised from the old `apps/`+`packages/` layout (backend = `backend/api` + `backend/shared/*`; the stale `code/` duplicate has been removed). Within each app, file refs below are relative to its folder (`src/…`, `app/…`).
> **Method:** each app's routes/services were read directly and diffed against the F1–F23 feature breakdown in the final-app docs. File paths are cited so each finding is checkable.
> **Last updated:** 2026-06-23.

**Legend:** ✅ works · 🔧 change existing · 🆕 net-new (missing) · 🗑️ discard · ⚠️ conflict needing a product decision.

---

## 0. Executive summary

The code is **substantially ahead of where the docs assumed** in several places (the 4h cancel policy, the ≤10 media gallery, the live-room token, the full enrolment lifecycle are all already built), and **behind** in others (no Classes tab, no QR check-in, no enrolled-student reviews, slot-based trial availability still present).

**Biggest net-new builds (🆕):**
1. **In-studio QR attendance** — student "Scan to check in" + scanner screen; academy "Show check-in QR" + per-session QR + live roster; backend session check-in token + scan endpoint. *(Both clients + API — entirely missing.)*
2. **Online live-class hosting (academy)** — "Start live class" + host screen + auto-on-join attendance write. *(Student join exists; academy host screen + auto-present write missing.)*
3. **Student "Classes" tab** with adaptive states (multi / single / past-only / hidden).
4. **Per-batch academy-set discounts** (monthly fee + quarterly/annual %, **≤30% cap**) replacing hardcoded package discounts + promo codes.
5. **Enrolled-student reviews** + eligibility gate (trial **or** enrolment).
6. **+1 session-credit ledger** on cancel-a-class; **commission ledger**.

**Biggest discards (🗑️):** the entire **`slots` / availability-publishing** system (trial spots are now `capacity − enrolled`), **manual present/absent marking**, **Compare**, **schedule reschedule** (cancel-only), `biannual` package, `masterclass`/`demo` workshop types, workshop refund path, hardcoded platform-fee/credits rule. **Referrals are deferred (archived, not deleted).**

**✅ Decisions resolved (2026-06-23, see §4):** attendance OTP = **4-digit** (change code 6→4); **referrals deferred** (keep/archive, revisit later); **academy bank details stay** on the profile editor; **add gallery video** support; **discounts are academy-set** per batch.

---

## 1. Backend — `backend/api`

### ✅ Works correctly
- **Auth (phone + OTP, one-login-per-academy)** — `src/modules/auth/service.ts` — MSG91 OTP (5-min TTL, 5-attempt cap); `AcademyAccount.phone` is `@unique` → one login per academy. *(F1)*
- **Discovery / search** — `src/modules/academies/service.ts` `listAcademies()` — category, `min_rating`, `radius_km` (Haversine distance), `top_rated` ranking, interests, cursor pagination. *(F3)*
- **Trial cancel = 4h + reschedule-once** — `src/modules/bookings/service.ts` — refund window `hoursUntilSlot >= 4` (`:107`), `rescheduleCount >= 1` blocks a 2nd reschedule (`:169`). **Already matches the new policy** — the "12h" only ever lived in prototype copy. *(F6 — only repoint the 4h check off `slot.slotTime` once slots are removed.)*
- **Media gallery cap (≤10)** — `src/modules/studio/upload.ts` `addAcademyImage()` rejects the 11th (`images.length >= 10`); `Academy.images String[]`. **Already built** (the §8 "to build" note was about the prototype, not the API). *(F4)*
- **Razorpay webhook + idempotency** — `src/modules/payments/service.ts` `handleWebhook()` — HMAC verify, idempotency keys, all four item types. *(F9 core)*
- **Enrolment lifecycle (pause/transfer/discontinue)** — `src/modules/enrollments/service.ts` + `EnrollmentPause`/`BatchTransferRequest`/`EnrollmentPeriod`. *(F8, minus session-credit)*
- **Events, Push, Me/saved/settings** — `src/modules/{events,push,me,settings}/service.ts` — register+pay, Expo push, wishlist + prefs. *(F19/F22/F21)*
- **No `compare` module** — confirmed absent from `src/routes.ts` (17 modules). Already clean.

### 🔧 / 🆕 Needs changes
- **🗑️→ Trial spots = capacity − enrolled** — `src/modules/slots/*`, schema `Slot`/`SlotStatus`, `bookings/service.ts`
  - *Data/schema:* the whole **`Slot`** model (`capacity`, `reservedCount`, `status`) + `SlotStatus` enum + `Slot` relations on `Batch`/`Booking`/`Trial` should be removed; trial booking picks a **session occurrence**, not a published slot.
  - *Logic/API:* replace slot-reservation availability (`reservedCount >= capacity`) with computed **`batch.capacity − enrolled`**.
- **Per-batch discount + ≤30% cap** — `src/modules/{enrollments,batches}/service.ts`, schema `Batch`/`EnrollmentPackage`
  - *Data/schema:* `Batch` has `monthlyFeePaise` but **no `quarterlyDiscountBps`/`annualDiscountBps`** — add them. Drop the **`biannual`** `EnrollmentPackage` value.
  - *Logic/API:* `computeAmount()` uses a hardcoded `PACKAGE_CONFIG` (quarterly 5% / annual 15%) — read discount **from the batch** instead; **add a server-side ≤30% validation** on batch create/edit (none exists today). *(F8/F10)*
- **🆕 Attendance — QR (in-studio) + auto-on-join (online)** — `src/modules/attendance/*`, `src/modules/rooms/*`, schema `BatchAttendance`
  - *Data/schema:* no per-session **check-in token** model; no `LiveSession`/join-attendance source. `BatchAttendance` is keyed `(batchId,userId,date)` and only written by manual mark.
  - *Logic/API:* add a **QR token issue/rotate** endpoint + **student scan→check-in** endpoint; make `rooms/service.ts getBatchToken` (100ms video token) **auto-write a present row on join**. Trial-OTP path is already correct (`trials/service.ts:118`, timing-safe). *(F13/F14)*
- **Reviews eligibility (trial OR enrolment)** — `src/modules/reviews/service.ts`, schema `Review`
  - *Data/schema:* `Review.trialId` is **required + `@unique`** → structurally blocks enrolment reviews. Make `trialId` optional, add `enrollmentId`/source; unique should be one review per `(user, academy)` from either path.
  - *Logic/API:* `createReview()` gate is trial-only (`:9-13`) — broaden to "has/had a trial **or** enrolment at this academy." *(F5)*
- **🆕 Cancel-a-class → make-good session (entitlement preserved)** — `src/modules/{enrollments,attendance}/*`
  - *Meaning:* a cancelled session is **made good, not lost** — the plan is extended by one session so the student still receives their **full entitled count for the cycle** (e.g., an 8-class month stays **8**, not 9). The cancelled slot is **unbilled** (doesn't consume one of the 8); the **+1** simply restores the count — it is **not a bonus extra class**.
  - *Data/schema:* **no `SessionCredit` ledger** anywhere — add one (or extend the enrolment period by one occurrence; either way the net delivered count is unchanged).
  - *Logic/API:* add a **cancel-session** endpoint → mark the session unbilled + append one make-good session to affected active enrolments (count restored to the entitlement) + notify. *(F8/F11)*
- **Workshops — type + refund** — `src/modules/workshops/service.ts`, schema `WorkshopType`
  - *Data/schema:* `WorkshopType` = `online|offline|masterclass|demo` → narrow to **online|offline**.
  - *Logic/API:* `cancelWorkshopRegistration()` refunds when `>24h` before (`:206`) — new rule is **non-refundable, full stop**; remove the refund branch. *(F18)*
- **🆕 Commission ledger** — `src/modules/payments/*`
  - *Data/schema:* **no `CommissionLedger`** (a `Payout` model exists but no commission split). Add it.
  - *Logic/API:* remove the hardcoded `PLATFORM_FEE_PAISE = 1200` + credits rule (`:44-50`); apply **commission on trials + enrolments**. *(F9)*
- **Media gallery video support** — `src/modules/studio/upload.ts` — cap is right; MIME is image-only (`:31`). Add video MIME types for "photos/videos." *(F4 — minor)*
- **Seed → Delhi-NCR** — `prisma/seed.ts` — seed is **Bengaluru** (Koramangala/Indiranagar/HSR…, user location `'Bengaluru'` `:272`). Rewrite to **Delhi-NCR** (Hauz Khas/Saket/Lajpat Nagar/Green Park). `Category` enum also lacks **fitness** — confirm/add. *(minor)*

### 🗑️ Discard
- **`slots` module + `Slot`/`SlotStatus` schema** (+ seed slot creation `seed.ts:246-252`) — availability-publishing is gone.
- **Manual batch-attendance** — `attendance/service.ts markAttendance` (`POST /studio/batches/:id/attendance`) — superseded by QR / auto-on-join ("QR-only" is locked).
- **`biannual` package** — schema `EnrollmentPackage` + `PACKAGE_CONFIG.biannual`.
- **`masterclass` / `demo` workshop types** — schema `WorkshopType`.
- **Workshop refund path** — `workshops/service.ts cancelWorkshopRegistration` 24h branch.
- **Hardcoded platform fee + credits rule** — `payments/service.ts:44-50`.
- *(not discarded)* **🗄️ Referral system** — schema `Referral`, `me/service.ts` claim/points (50/100 pts) — **deferred/archived**, revisit later; keep in place, do not delete (decided §4).

---

## 2. Student app — `student-app`

### ✅ Works correctly
- **Trial cancel / reschedule policy** — `src/components/CancelSheet.tsx` + `CancellationPolicyCard.tsx` — already uses **4h cutoff**, refundable ≥4h, blocks cancel once rescheduled; `booking/slot.tsx:140` "reschedule once for free." **Matches new F6.**
- **Trial attendance OTP** — `app/trials/[id].tsx` ("SHOW TO INSTRUCTOR" + `attendanceOtp`), `app/booking/confirmation.tsx`, `src/components/OTPDisplay.tsx` — student surfaces the code to show the academy. *(F12 — mechanism correct; change digit length 6→4 per §4)*
- **Online "Join live class" + auto-on-join** — `app/enrollment/[id].tsx` `JoinClassButton` → `app/live/[batch_id].tsx` + `src/hooks/useLiveRoom.ts` ("Join up to 10 min before"). *(F14)*
- **Enrolment manage (renew/pause/transfer/discontinue)** — `app/enrollment/[id].tsx` ManageSheet; **renewal plan picker already reads academy-set `discount_bps` dynamically** (not fixed 10/20). *(F8)*
- **Academy media gallery** — `app/academy/[id].tsx:107-122` paged `FlatList` over `academy.images`. *(F4 — gallery exists)*
- **Program detail batch selector** — `app/program/[id].tsx` — batch radio cards, seats-left/FULL, trial+monthly fee, Online/In-studio badge, dual CTA. *(F4)*
- **Workshops / Events** — `app/workshop/*`, `app/events/*`, `app/(tabs)/events.tsx` — detail→pay→confirm present. *(F18/F19)*

### 🔧 / 🆕 Needs changes
- **🆕 "Classes" tab + adaptive states** — `app/(tabs)/_layout.tsx`, `app/enrollments.tsx`, `app/trials/index.tsx`
  - *UI/UX:* there is **no 4th Classes tab** — bottom nav is only **Discover / Events / Profile**; active classes live at `app/enrollments.tsx` reached via a Profile quick-action. Add the **Classes** tab built from **enrolled batches only** (`enrollments.tsx`). **Trials do NOT go in this tab** — they stay under Profile → My Bookings / My Trials (`app/trials/index.tsx` / `app/bookings.tsx`).
  - *Functionality:* none of the §3.6/F15 adaptive states exist (`enrollments.tsx` only has a single empty state). Build (enrolments only): **multiple active → cards / one active → inline / no active but past → "not in any active batch" + past cards / no active+no past → tab hidden** (gate visibility in `_layout.tsx`).
- **🆕 In-studio QR check-in** — `app/enrollment/[id].tsx` (no scanner anywhere)
  - *UI/UX:* in-studio + active classes have **no "Scan to check in"** action and **no camera scanner screen** (grep for qr/scan/checkin = nothing).
  - *Functionality:* in-studio attendance has **no student-side mechanism today** (only online auto-join + trial OTP exist). Build a scanner route that scans the session QR → "marked present." *(F13)*
- **Plan selection at enroll** — `app/program/[id]/review.tsx`, `src/hooks/useEnroll.ts`
  - *UI/UX:* the Review & Pay screen has **no Monthly/Quarterly/Annual picker** (single "Monthly fee" line) and no "Your batch (read-only) + Change" summary. Add plan cards (Quarterly *Popular* / Annual *Best value*) showing the **academy-set discount %**.
  - *Functionality:* `handlePay` hardcodes `package_type:"monthly"`; pass the chosen plan. Replace the **hardcoded promo system (FIRST50/SAVE200)** with `discount_bps`-driven pricing (mirror the renewal sheet, which already does it right). *(F7)*
- **🆕 Enrolled-student reviews** — read path `app/academy/[id].tsx` + `useReviews.ts`; write only `app/post-trial/index.tsx`
  - *UI/UX:* academy "What students say" is read-only; **no "Rate & review" entry** for enrolled students (neither academy detail nor class detail).
  - *Functionality:* review is gated to a **post-trial** path (`api.reviews.create` keyed by `trial_id`). Add an enrolment-based review entry + eligibility (has/had trial **or** enrolment), no decision step. *(F5)*
- **Bengaluru → Delhi-NCR copy** — `app/booking/confirmation.tsx:119` (`"Indiranagar · 1.2 km"`), `app/booking/pay.tsx:247` (`"In studio · Indiranagar"`) — replace hardcoded Bengaluru fallbacks. *(low-risk strings)*

### 🗑️ Discard
- **Compare** — `app/compare.tsx`, `src/stores/compare.ts`, and the trigger in `src/components/AcademyCard.tsx` (`useCompare`, "+ Compare" button → `/compare`). Removed from MVP.
- *(not discarded)* **🗄️ Referral** — `app/refer.tsx`, `src/hooks/useReferral.ts` — **orphaned** (no nav entry); **deferred/archived**, keep for later (decided §4) — do not delete.

---

## 3. Academy / Admin app — `academy-app`

### ✅ Works correctly
- **4-tab structure (Home · Schedule · Students · Studio)** — `app/(tabs)/_layout.tsx`. *(§4)*
- **Dashboard / Inbox** — `app/(tabs)/inbox.tsx` — today-summary stats, new trial bookings, today's schedule, activity feed, earnings mini. *(F22/§4.2)*
- **Trial OTP attendance** — `app/attendance-otp.tsx` — enter code → confirm / no-show. *(F12 — flow correct; change `length={6}`→4 + copy per §4)*
- **Trial detail** — `app/trial/[id].tsx` — student/mode/pay, "auto-confirmed", Mark attendance. *(F6)*
- **Studio hub + Settings** — `app/(tabs)/studio.tsx`, `app/(tabs)/settings.tsx` — Manage/Account menus, KYC, team-access "v2", **attendance reminder** toggle. *(F21)*
- **Academy media gallery (≤10)** — `app/profile/edit.tsx` — multi-image gallery with `MAX_IMAGES = 10`, pick/upload/remove/counter. **Already built** (photos only — video is the only gap). *(F4)*
- **Workshops list, Coaches, Reviews(+respond), Earnings** — `app/(tabs)/workshops.tsx`, `app/coaches/*`, `app/reviews.tsx` + `reviews/[id]/respond.tsx`, `app/earnings.tsx` — structurally aligned. *(F18/F17/F5/F20)*

### 🔧 / 🆕 Needs changes
- **🆕 In-studio attendance (QR)** — `app/batches/[id]/attendance.tsx`
  - *UI/UX:* today it's a **manual present/absent roster** (tappable rows, "Save attendance · N of M marked"). Replace with **"Show check-in QR"** card + full-screen **`attendance-qr`** screen + live "9 of 12 checked in" scanned/not-yet roster.
  - *Functionality:* **QR-only, no manual marking** (locked) — remove the `useMarkBatchAttendance` toggle path; re-point the batch hub "Take attendance" button (`batches/[id]/index.tsx:106`) to the QR screen. *(F13)*
- **🆕 Online live hosting** — *no route exists*
  - *UI/UX:* online batches need **"Start live class"** + joined roster, and a **Live-class host screen** (red ● Live, video stage, End class). *(F14)*
  - *Functionality:* no `live-class` route under `app/` (grep = nothing); `batches/[id]/index.tsx` is **mode-agnostic** (no online branch/badge). Online-trial "Start live class" also missing in `trial/[id].tsx`.
- **Batch detail — mode awareness + trial-spots** — `app/batches/[id]/index.tsx`
  - *UI/UX:* no **Online badge**, no **"N trial spots open"** line; single hub (no Attendance/Roster/Edit tabs).
  - *Functionality:* doesn't branch on `batch.mode` to switch Attendance between QR vs Start-live. *(F10/§4.5)*
- **New batch — discount % (+ mode/spots note)** — `app/batches/new.tsx`, `app/batches/[id]/edit.tsx`
  - *UI/UX:* `new.tsx` has Category/Title/Level/Capacity/**Trial fee**/**Monthly fee**/Coach/Online toggle but **no quarterly/annual discount % fields**; no "trial spots automatic" note. (`edit.tsx` already has a Mode card + Pause — correct.)
  - *Functionality:* add **discount %** capture + **≤30% cap** validation; `useCreateBatch` payload has no discount fields. *(F8/F10)*
- **Workshop type** — `app/workshops/new.tsx`
  - *UI/UX:* type grid has **four** options incl. `masterclass`/`demo` (`:31-36`) — reduce to **Online / Offline**; trim stale `TYPE_LABELS` in `(tabs)/workshops.tsx:19-24`.
  - *Functionality:* narrow `WorkshopType` to `online|offline`; workshops non-refundable (learner-side, no academy refund affordance). *(F18)*
- **Trials-today accept-OTP on Schedule** — `app/(tabs)/schedule.tsx`
  - *UI/UX:* Schedule shows **batch classes only**; trials surface only on **Inbox**. Add a **"Trials today"** group on Schedule with a direct "accept the OTP the student shows" route into `attendance-otp`. *(§4.3)*
- **Students roster — tiers / pills / filters** — `app/(tabs)/students.tsx`, `app/students/[id].tsx`, `src/components/StudentCard.tsx`
  - *UI/UX:* (1) pill/tier label **"At risk"** → **Irregular**; (2) drop the **Music/Dance/Arts/Yoga category chip bar** (art-form isn't an academy-roster concept) and move **Batch × Attendance into a Filters sheet** (none exists today); (3) rows show **no attendance % / tier badge** — add avatar · batch · % · tier. Batch hub (`batches/[id]/index.tsx:45-47`) also uses `at_risk` — align to Irregular 50–74 / Inactive <50.
  - *Functionality:* server hook `useStudioStudents` already accepts `attendance_tier` (good) — rename `at_risk`→`irregular` and drive `batch_id`+`attendance_tier` from the new Filters sheet. Student detail lacks an explicit **tier badge** and **plan term/renewal date**. *(F16)*
- **Cancel-a-class (+1 session)** — `app/(tabs)/schedule.tsx`
  - *UI/UX:* a Cancel-class action exists (⋯ sheet `:393`) but copy is just "Booked students will be notified" — add **unbilled / +1 session added** messaging. *(F11/§2.5)*
  - *Functionality:* implemented as `deleteSlot.mutateAsync(slot_id)` (a delete) — needs a real **cancel-class** endpoint that grants +1 session credit (backend §1).
- **Onboarding — Modes offered** — `app/(auth)/onboarding.tsx`
  - *UI/UX:* collects owner/academy/city/category/phone but **no "Modes offered" (In-studio / Online / Home visit)** or tagline. Add modes multi-select. *(F2/§4.1)*
- **Gallery video + profile bank details** — `app/profile/edit.tsx` — gallery is **photos-only** → **add video** (`MediaTypeOptions.All`, decided §4); editor also collects **bank account/IFSC/holder** → **keep on the profile editor** (decided §4; now documented in the edit-profile spec). *(minor)*

### 🗑️ Discard
- **Trial-availability publishing** — `app/schedule/publish.tsx` (whole screen) + the **"+ Publish slots"** button in `(tabs)/schedule.tsx:188-195`. Trial spots are automatic now.
- **Schedule reschedule** — `(tabs)/schedule.tsx` `RescheduleModal` + ⋯ "Reschedule" + `useRescheduleSlot`. New Schedule is **Cancel-class only** (CLAUDE.md §7).
- **Manual present/absent marking** — `app/batches/[id]/attendance.tsx` toggle/save path (covered above; explicitly out of scope).

---

## 4. ✅ Resolved decisions (2026-06-23)

These five points (code vs. new docs) are now **decided** — actions folded into §1–§3 / §5:

| # | Item | Code today | **Decision** | Action |
|---|---|---|---|---|
| 1 | **Attendance OTP length** | **6-digit** (`academy-app/app/attendance-otp.tsx` `length={6}`; `backend/api` `attendanceOtp`) | **Keep 4-digit** (matches docs/prototypes `4927`/`8260`) | 🔧 Change code 6→4: `backend/api` attendance-OTP generation, `academy-app/app/attendance-otp.tsx` (`length`, copy, `code.length` check), `student-app` `OTPDisplay`/trial views. *(Login/auth OTP is separate — unchanged.)* |
| 2 | **Referrals** | Built — `student-app/app/refer.tsx` (orphaned), `backend/api` Referral model + points | **Defer / archive** (revisit later, do **not** delete) | 🗄️ Leave in place (or move behind a feature flag / archive folder); not part of MVP build. **Not a discard.** |
| 3 | **Academy bank details on profile editor** | `academy-app/app/profile/edit.tsx` collects account/IFSC/holder | **Keep on the academy profile editor** | ✅ No change — keep as-is; add to the edit-profile spec so it's documented. |
| 4 | **Gallery video** | Photos only (`backend/api` upload.ts image MIME; `academy-app` `MediaTypeOptions.Images`) | **Add video support** | 🔧 Add video MIME types in `backend/api` upload.ts + `MediaTypeOptions.All` (photos **and** videos) on `academy-app`/`student-app`, keeping the ≤10 cap. |
| 5 | **Discount values** | hardcoded quarterly 5% / annual 15% (+ `biannual` 10%) | **Academy-set** per batch (≤30%) | 🔧 Remove hardcoded `PACKAGE_CONFIG` + promo codes; read discount from the batch (already in §1/§2). Seed/demo academy uses 10% / 20%. |

---

## 5. Consolidated build/discard checklist

**🆕 Net-new to build (highest effort):**
- In-studio **QR check-in** end-to-end (student scanner · academy QR display + live roster · API token+scan). *(F13)*
- **Online live hosting** on academy + **auto-on-join attendance write** in API rooms. *(F14)*
- Student **Classes tab** + adaptive states + visibility gating. *(F15/§3.6)*
- **Per-batch discount fields + ≤30% cap** (schema + batch create/edit + enroll pricing), replacing `PACKAGE_CONFIG`/promo codes. *(F8/F10)*
- **Enrolled-student reviews** + eligibility gate (schema `Review.trialId` optional + `enrollmentId`). *(F5)*
- **Make-good session** ledger/period-extension + cancel-class endpoint — cancelled session is replaced so the entitled count is preserved (8 stays 8). *(F8/F11)*
- **Commission ledger**. *(F9)*
- Plan picker on **enroll** screen; **Trials-today** group on academy Schedule; **Modes offered** in academy onboarding; **Filters sheet** + tier rename on students roster.

**🔧 Smaller decided changes (§4):**
- **Attendance OTP 6→4 digits** — `backend/api` generation + `academy-app/app/attendance-otp.tsx` + `student-app` OTP display. *(login OTP untouched)*
- **Add gallery video support** — `backend/api` upload.ts MIME + `academy-app`/`student-app` pickers (`MediaTypeOptions.All`), keep ≤10 cap.
- **Keep academy bank details** on the profile editor — no change (now documented in the edit-profile spec).

**🗑️ Discard:**
- `slots` module + `Slot`/`SlotStatus` schema + admin `schedule/publish.tsx` + seed slots (availability publishing).
- Manual present/absent attendance (both `backend/api` and `academy-app`).
- `Compare` (student route + store + AcademyCard button).
- Schedule **reschedule** (admin) — cancel-only.
- `biannual` package; `masterclass`/`demo` workshop types; workshop refund path; payments platform-fee/credits rule.

**🗄️ Deferred (keep / archive — NOT deleted, revisit later):**
- **Referrals** — `student-app/app/refer.tsx` + `useReferral`, `backend/api` Referral model + points (decided §4).

**🔁 Already correct — do NOT "fix" to match stale prototype copy:**
- Trial **4h** cancel + reschedule-once (code is right; prototype copy says 12h — update the *prototype*, not the code).
- Media gallery **≤10** cap (already enforced in API + admin).
- Academy-set discount on the **renewal** path (student already reads `discount_bps`).

---

## 6. Notes / unverified
- `academy-app` has **no hardcoded Bengaluru** copy (free-text City field); Bengaluru lives in `backend/api/prisma/seed.ts` + two student string fallbacks.
- `api/rooms` issues a **100ms** video token but does not write attendance on join — that auto-present write is the missing piece for F14, not the token plumbing.
- Reviews/respond, coaches, earnings (admin) read as structurally aligned but were not line-audited; no spec deltas flagged.
- Prototype-only gaps already tracked in `master-feature-document.md` §8 (workshops not mirrored in student discovery, static program-batch options) are **product/prototype** gaps, not code regressions.
