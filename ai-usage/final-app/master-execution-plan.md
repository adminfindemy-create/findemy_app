# Findemy — Master Execution Plan

> **Purpose.** A build plan for shipping Findemy across **backend (`backend/api`) + student app (`student-app`) + academy app (`academy-app`)** as **vertical, feature-at-a-time slices** — pick one slice, implement it end-to-end on all three sides, demo it, move on. Optimised for **rapid, synced development**.
>
> **Built from:** the feature breakdown in [`backend.md`](./backend.md) / [`student-app.md`](./student-app.md) / [`academy-app.md`](./academy-app.md) (features **F1–F23**), the product in [`master-feature-document.md`](./master-feature-document.md), the code-state diff + resolved decisions in [`implementation-gap-analysis.md`](./implementation-gap-analysis.md), the **prototypes** (`../prototypes/`), and the scope/vision in [`../app-ideation/`](../app-ideation/) (esp. `05-mvp-scope.md`, `06-business-model.md`).
>
> **Last updated:** 2026-06-23.

---

## 0. How to use this plan

1. **Work in vertical slices, not horizontal layers.** A slice (`S#.#`) is one whole feature delivered **end-to-end, starting at the backend and fanning out to both apps**: backend (schema → API → shared `types`/`api-client` → seed) → **Handoff Document** → academy app ‖ student app → test. Take one feature through all three sides and ship it before the next — don't build every backend module first and every screen later.
2. **Every slice starts with a Feature Master Plan.** Before any code, author a **per-feature master plan** (template in §3.2) that describes the *whole* feature and its implications across **backend + academy app + student app**, and specifies **how every component is designed so the three sides integrate easily and stay in sync**. The slice card is the one-line summary; the Feature Master Plan is the detailed spec you write when you pick the slice up.
3. **Backend-first; the apps fan out from a handoff.** Each feature is **built on the backend first** (schema + API + shared `types`/`api-client` + seed). When the backend is done it publishes a **Handoff Document** (§3.3) — the *as-built* contract + integration guide — and **both apps then build against it, in parallel with each other**. Work fans out **from** the backend; the handoff is the handshake that keeps the two apps in sync with the backend (and with each other).
4. **One demo world.** Every slice is validated against the shared seed cast (**The Rhythm House**, Guitar = in-studio, Vocals = online, student **Varun Mehta**, OTP `4927`/`8260`). If a slice can't be demoed on both apps against that seed, it isn't done.
5. **Reuse the gap-analysis.** Each card tags work as **REUSE** (already correct — don't touch), **CHANGE** (edit existing), **BUILD** (net-new), **DISCARD** (remove), **DEFER** (archive). Start by reading the cited code.
6. **Definition of Done (every slice):** contract merged in `backend/shared/types`; API endpoint live + unit-tested; both apps wired through `api-client`; seed updated; the **end-to-end acceptance** in the card passes on both apps; matches the prototype screen + `master-feature-document.md`.

---

## 1. Working agreements (the rails — set once, in Phase 0)

| Rail | Rule |
|---|---|
| **Contract source of truth** | All cross-app DTOs/enums live in **`backend/shared/types`**; both apps + api import them. No app-local duplication of a shared shape. |
| **Typed client** | All network calls go through **`backend/shared/api-client`** (typed against `backend/shared/types`). Apps never hand-roll fetch. |
| **Money** | Server-authoritative, integer **paise**; clients never compute or send amounts. Discounts as **bps**, capped **3000 (30%)**. |
| **Attendance OTP** | **4-digit** (decision §4 of gap-analysis). Login/auth OTP is separate. |
| **IDs & idempotency** | Idempotency keys on payment webhooks + attendance check-ins (survive retries/double-scans). |
| **Time** | Store UTC; render **IST**; "active 10 min before / expires N after" handled server-side. |
| **AuthZ** | Role + ownership: a student touches only their bookings; an academy only its own academy/batches/students. |
| **Computed, not stored** | Trial spots (`capacity − enrolled`), attendance %, tiers, today's earnings are derived. |
| **Errors** | One typed error envelope (code + message) shared via `backend/shared/types`; clients render consistently. |
| **Integrations** | Razorpay (pay), MSG91 (OTP), Cloudflare R2 (media, photo **+ video**), Findemy video room (live), Expo push. |

---

## 2. Phased roadmap (dependency-ordered)

Phases are **waves**; slices **within** a wave can run in parallel (one dev/agent per side, or one owner per slice). Arrows = hard dependencies.

| Phase | Theme | Slices | Why this order |
|---|---|---|---|
| **P0** | Rails & cleanup | S0.1 contract/conventions · S0.2 discards · S0.3 auth+onboarding · S0.4 seed Delhi-NCR | Unblocks everything; removes dead scope so it isn't carried forward. |
| **P1** | Discover & profile | S1.1 academy profile + gallery · S1.2 discovery/search · S1.3 batches model (fee+discount+mode) | The catalog the conversion loop sells; **S1.3 defines the fee/discount contract** everything downstream reads. |
| **P2** | Conversion loop | S2.1 trial booking (spots auto) · S2.2 trial OTP attendance · S2.3 enrol + plans/discount · S2.4 payments+commission | The core *discover → try → enrol* revenue path (app-ideation `03-solution`, `06-business-model`). |
| **P3** | Classes & attendance | S3.1 student Classes tab · S3.2 in-studio QR · S3.3 online live + auto-join · S3.4 schedule + cancel/make-good | The post-enrol experience + the 3-mode attendance backbone (master §2.2). |
| **P4** | Manage & community | S4.1 roster+tiers · S4.2 coaches · S4.3 reviews+eligibility · S4.4 workshops · S4.5 events · S4.6 earnings | Academy management + social proof + ancillary revenue. |
| **P5** | Account & polish | S5.1 profile/bookings/saved · S5.2 notifications · S5.3 design-system parity | Wraps the apps; depends on most data existing. |

**Critical path:** S0.1 → S1.3 (batch fee/discount) → S2.3 (enrol pricing) → S2.4 (payments) → S4.6 (earnings). Attendance (P3) depends only on S1.3 + S2.x and can run alongside P4.

---

## 3. Slice template & the Feature Master Plan

### 3.1 Slice card (the at-a-glance summary used below)
Every slice in this document uses this shape:

> **S#.# — Name** `[F#]` — *status mix*
> **Goal** · **Refs** (master §, prototype screen, gap-analysis) · **Contract** (lock first) · **Backend** · **Academy** · **Student** · **E2E acceptance** · **Deps**

### 3.2 The Feature Master Plan (author one per slice, *before* coding)
The slice card is only a summary. **When you pick up a slice, the first deliverable is its Feature Master Plan** — a standalone doc that describes the feature end-to-end and **how all three sides (backend + both frontend apps) are designed to integrate and stay in sync**. Keep one per slice (suggested home: `final-app/feature-plans/S#.#-<feature>.md`). It must contain:

1. **Feature & intent** — what it does and why; refs to the feature number `F#`, `master-feature-document.md` §, the prototype screen(s), `app-ideation/`, and the slice's `implementation-gap-analysis.md` status.
2. **Cross-side impact map** — every place the feature touches, each tagged **REUSE / CHANGE / BUILD / DISCARD / DEFER**, across four columns: **Backend (api + schema)** · **Academy app** · **Student app** · **Shared (types / api-client / ui)**.
3. **The shared contract — designed for sync (lock this first).** The exact DTOs, enums, and endpoints in `backend/shared/types` + `backend/shared/api-client` that **both apps and the backend build against** — the single source of truth that holds them aligned. Spell out request/response shapes, error cases, and any versioning / back-compat.
4. **Component design, per side, designed to integrate easily:**
   - **Backend** — data model / schema changes, services, jobs, auth + idempotency.
   - **Academy app** — screens + components, and which contract fields each one binds.
   - **Student app** — screens + components, and which contract fields each one binds.
   - **Shared** — the types / `api-client` calls / `ui` components reused by *both* apps (build the shared piece **once**; never fork it per app).
5. **Sync map (1:1 traceability)** — a table tying each contract field / endpoint to its **backend source → academy UI → student UI**, so a change on one side has an obvious counterpart on the other two and nothing drifts out of sync.
6. **Sequencing & ownership** — lane order (Backend / Academy / Student), dependencies, and the backend-only enablers to land first.
7. **Acceptance (E2E across both apps)** — the demoable cross-app outcome against the shared seed; plus rollout / feature-flags and any discards/defers this slice removes.

> **Rule of thumb:** if the Feature Master Plan doesn't make it obvious how a change on one side maps onto the other two, it isn't ready — tighten the shared contract (item 3) until it does.

Once the plan is approved, **the backend is built first**; on completion it hands off to the apps via §3.3.

### 3.3 The Backend Handoff Document (backend → both apps)
**Every feature is built backend-first, then fans out.** When the backend slice is complete — schema + API + shared `types`/`api-client` + seed, all merged and tested — the backend author publishes a **Handoff Document**: the single artifact both frontend apps build against so they stay in sync with the backend and with each other. **No app lane starts its real wiring until the handoff is published.** Keep one per slice (suggested home: `final-app/feature-plans/S#.#-<feature>.handoff.md`). It must contain:

1. **As-built API surface** — every endpoint for the feature: method, path, auth/role, request DTO, response DTO, error codes/states. (What actually shipped, not just what was intended.)
2. **Typed client calls** — the exact `backend/shared/api-client` functions + `backend/shared/types` the apps import (names + signatures). Apps never hand-roll fetch or redefine a shared shape.
3. **Enums & constants** — the shared vocabulary (modes, plans, statuses, tiers) both apps must mirror.
4. **Example payloads** — real request/response samples for the happy path **and** the key edge cases (empty, error, loading, terminal states) both apps must handle.
5. **Seed / test fixtures** — the shared demo cast (The Rhythm House, Guitar/Vocals, Varun Mehta, OTP `4927`/`8260`) IDs/values to develop against, so both apps hit the same data.
6. **Per-app consumption map** — which **academy** screens/components and which **student** screens/components consume which endpoints/fields (the §3.2 sync map, now concrete) — so both sides bind the same source identically.
7. **Guardrails** — what the apps must **not** do (e.g., money is server-authoritative — never compute/trust client amounts; never duplicate a shared type).

> The handoff turns the *planned* contract (§3.2) into the **as-built source of truth**. Both apps build from it in parallel; if an app needs a shape the handoff doesn't expose, that's a **backend change + handoff update**, never an app-local workaround.

---

## P0 — Rails & cleanup

### S0.1 — Shared contract & conventions `[F23]` — BUILD (foundation)
- **Goal:** establish `backend/shared/types` DTOs/enums + `backend/shared/api-client` patterns + the rails in §1 so every later slice plugs in.
- **Refs:** backend.md cross-cutting; gap-analysis §1 "one shared data world."
- **Contract:** the error envelope, money/bps conventions, `Mode = in_studio|online`, `Plan = monthly|quarterly|annual`, `AttendanceMode = otp|qr|auto_join`, pagination cursor. These are the vocabulary all slices reuse.
- **Backend:** wire the error handler/envelope; ensure `api-client` codegen/types build.
- **Academy/Student:** adopt `api-client`; theme tokens already shared (REUSE).
- **E2E acceptance:** a trivial typed endpoint (e.g. `GET /me`) round-trips through `api-client` on both apps with shared types.
- **Deps:** none (do first).

### S0.2 — Discards & cleanup `[F6/F10/F13/F18/F9]` — DISCARD / DEFER
- **Goal:** delete dead scope before building so nothing references it.
- **Refs:** gap-analysis §5 Discard + Deferred.
- **Remove:** `backend/api` `slots` module + `Slot`/`SlotStatus` schema + seed slots; `payments` `PLATFORM_FEE_PAISE`/credits rule; `biannual` `EnrollmentPackage`; `masterclass`/`demo` `WorkshopType` + workshop refund path. `academy-app` `schedule/publish.tsx` (+ its button) + Schedule `RescheduleModal`/`useRescheduleSlot` + manual `batches/[id]/attendance.tsx` toggle. `student-app` `compare.tsx` + `stores/compare.ts` + AcademyCard compare button.
- **Defer (do NOT delete):** referrals — `student-app/app/refer.tsx`+`useReferral`, `backend/api` Referral model/points. Leave parked/feature-flagged.
- **E2E acceptance:** apps build + run with no references to removed modules; no "Publish slots"/"Compare"/manual-attendance entry points remain.
- **Deps:** none (do early, alongside S0.1).

### S0.3 — Auth & onboarding `[F1, F2]` — REUSE / CHANGE
- **Goal:** phone-OTP sign-in (both apps), student interests, academy **Modes offered**.
- **Refs:** master §3.1/§4.1; prototypes auth screens; gap-analysis (auth = works; onboarding modes missing).
- **Contract:** `POST /auth/otp/request`, `/auth/otp/verify` (REUSE); academy onboarding payload **+ `modes_offered[]` (in_studio|online|home_visit) + tagline**.
- **Backend:** REUSE auth (MSG91, one-login-per-academy). CHANGE: persist `modesOffered`/`tagline` on `Academy`.
- **Academy:** CHANGE `(auth)/onboarding.tsx` — add Modes-offered multi-select + tagline.
- **Student:** REUSE welcome→phone→OTP→onboarding→interests.
- **E2E acceptance:** new academy signs up choosing modes; new student signs up + picks interests; both land on their home tab.
- **Deps:** S0.1.

### S0.4 — Seed & demo world (Delhi-NCR) `[F23]` — CHANGE
- **Goal:** one coherent seed both apps demo against.
- **Refs:** master §2.1; app-ideation Delhi-NCR decision; gap-analysis (seed is Bengaluru).
- **Backend:** rewrite `prisma/seed.ts` → **Delhi-NCR** (Hauz Khas/Saket/Lajpat Nagar/Green Park); The Rhythm House + Guitar(in-studio)/Vocals(online)/Keys; student Varun Mehta; demo discounts **10%/20%**; add `fitness` category if adopted. *(Attendance OTP stays **6-digit** here — `generateOtpCode()`; the **4-digit** change `4927`/`8260` is **S2.2**, which flips generator + seed + `attendance.test` together.)*
- **E2E acceptance:** both apps, freshly seeded, show the same cast and line up (student sees Guitar/Vocals; academy manages the same batches).
- **Deps:** S0.1; touched again by S1.3/S2.3 as fields are added.

---

## P1 — Discover & profile

### S1.1 — Academy profile & media gallery `[F4, F21]` — REUSE / CHANGE
- **Goal:** rich academy profile incl. **media gallery up to 10 (photos + video)**; profile editor with bank details.
- **Refs:** master §3.3/§4.11; prototypes academy detail + edit-profile; gap-analysis (gallery ≤10 already built; **add video**; keep bank details).
- **Contract:** `GET /academies/:id` (profile + `images[]` gallery + coaches + reviews preview); `POST/DELETE /studio/academy/images` (cap 10, **image + video MIME**); profile update incl tagline/about/address/specialities/**payout bank details**.
- **Backend:** CHANGE `studio/upload.ts` — allow video MIME (keep ≤10 cap, REUSE).
- **Academy:** CHANGE `profile/edit.tsx` — `MediaTypeOptions.All`; KEEP bank details (documented).
- **Student:** REUSE `academy/[id].tsx` gallery `FlatList` (supports video items).
- **E2E acceptance:** academy uploads a photo **and** a video (11th rejected); student sees both in the academy gallery.
- **Deps:** S0.1.

### S1.2 — Discovery & search `[F3]` — REUSE (verify)
- **Goal:** search/filter/category/top-rated/near-you.
- **Refs:** master §3.2; gap-analysis (works).
- **Contract:** `GET /academies?query&category&min_rating&radius_km&sort` (REUSE).
- **Backend/Student:** REUSE; verify category pills incl `fitness` if adopted; confirm Delhi-NCR copy.
- **E2E acceptance:** student searches + filters and reaches an academy detail.
- **Deps:** S0.4, S1.1.

### S1.3 — Batches: fee + discount + mode (catalog source of truth) `[F10, F4]` — CHANGE / BUILD
- **Goal:** the **Batch** becomes the single source for fee, **academy-set quarterly/annual discount % (≤30%)**, mode, capacity → trial spots = `capacity − enrolled`. *Everything downstream (enrol pricing, attendance mode, trial spots) reads this.*
- **Refs:** master §2.4/§2.5/§4.5; prototypes new-batch sheet + batch detail; gap-analysis (discount fields + ≤30% cap missing; new-batch lacks discount).
- **Contract:** `Batch { mode, monthlyFeePaise, quarterlyDiscountBps, annualDiscountBps (≤3000), capacity, enrolled, trialFeePaise }`; `trialSpots = capacity − enrolled` (computed); `POST/PATCH /studio/batches` validates **discount ≤ 3000** server-side.
- **Backend:** CHANGE schema `Batch` (+discount bps fields); add ≤30% validation; expose computed `trialSpots`/`enrolled`.
- **Academy:** CHANGE `batches/new.tsx` + `batches/[id]/edit.tsx` — add quarterly/annual **discount %** inputs (block >30%), Mode, "trial spots automatic" note; CHANGE batch detail header → Online badge + "N trial spots open".
- **Student:** REUSE program/batch display; ensure mode badge + seats-left bind to real batch (note prototype static-batch gap).
- **E2E acceptance:** academy creates a batch with 25% quarterly discount (35% rejected); student sees that batch's fee + computed trial spots on the program screen.
- **Deps:** S0.1, S0.4. **Unblocks S2.1, S2.3, S3.x.**

---

## P2 — Conversion loop

### S2.1 — Trial booking (spots automatic) `[F6, F10]` — CHANGE
- **Goal:** book a paid trial against `capacity − enrolled`; reschedule **once**; refund **≥4h** before; auto-confirm.
- **Refs:** master §3.4/§2.4; prototypes booking slot→pay→confirm + academy Trials-today/trial detail; gap-analysis (4h+reschedule-once already correct — **repoint off slots**).
- **Contract:** `GET /batches/:id/trial-availability` (derived from spots, **not** published slots); `POST /trials` → payment intent → confirm; `POST /trials/:id/reschedule` (once); cancel (refund if ≥4h). Trial **inherits batch mode**; server issues **4-digit** `attendanceOtp`.
- **Backend:** CHANGE `trials`/`bookings` to compute availability from `capacity − enrolled`; REUSE the 4h/reschedule-once logic (repoint off `slot.slotTime`).
- **Academy:** CHANGE Dashboard/Schedule — trials appear auto-confirmed; **add "Trials today" group on Schedule** (gap-analysis).
- **Student:** REUSE booking slot→pay→confirm.
- **E2E acceptance:** student books a Guitar trial → it appears auto-confirmed in the academy's Trials-today; spots decrement; reschedule allowed once.
- **Deps:** S1.3, S2.4 (payments).

### S2.2 — Trial attendance OTP (4-digit) `[F12]` — CHANGE
- **Goal:** student shows a **4-digit** code; academy accepts/verifies → present/no-show.
- **Refs:** master §2.2/§4.3; prototypes booking-detail OTP + academy attendance-otp; gap-analysis (change 6→4).
- **Contract:** `POST /studio/trials/:id/attendance { code }` → present | no-show (timing-safe). Code length **4**.
- **Backend:** CHANGE `attendanceOtp` generation → 4-digit (REUSE verify path).
- **Academy:** CHANGE `attendance-otp.tsx` (`length={6}`→4, copy, length check); reachable from **Trials today** (S2.1).
- **Student:** CHANGE `OTPDisplay`/trial views → 4-digit.
- **E2E acceptance:** student shows `4927`; academy enters it from Trials-today → marked present (online trial: verified in the live session, S3.3).
- **Deps:** S2.1.

### S2.3 — Enrolment + plans/discount `[F7, F8]` — CHANGE / BUILD
- **Goal:** enrol into a batch with **Monthly/Quarterly/Annual**, priced from the **batch's academy-set discount**; full manage lifecycle.
- **Refs:** master §3.5/§2.5; prototypes enroll select→pay→confirm + manage; gap-analysis (enroll screen has no plan picker + uses promo codes; renewal already reads `discount_bps`).
- **Contract:** `POST /enrollments { batch_id, plan }` → server prices from `Batch` discount (no client amounts); manage = renew/pause/transfer/discontinue (REUSE). Drop `biannual`.
- **Backend:** CHANGE `computeAmount()` to read batch discount (remove hardcoded `PACKAGE_CONFIG`); REUSE pause/transfer/discontinue.
- **Student:** BUILD plan picker on `program/[id]/review.tsx` (Quarterly *Popular* / Annual *Best value* showing batch discount); **remove promo codes**; "Your batch (read-only) + Change" pattern; pass chosen plan (not hardcoded monthly).
- **Academy:** REUSE — enrolment reflects in batch enrolled/capacity + recomputes trial spots.
- **E2E acceptance:** student enrols Quarterly at the academy-set 10% off → academy sees enrolled/capacity bump + trial spots drop.
- **Deps:** S1.3, S2.4.

### S2.4 — Payments + commission `[F9, F20-data]` — REUSE / BUILD
- **Goal:** Razorpay checkout for all paid items + **commission ledger** on trials/enrolments.
- **Refs:** master §2.6; app-ideation `06-business-model` (commission now); gap-analysis (webhook idempotent REUSE; commission ledger missing; remove platform-fee/credits).
- **Contract:** `POST /payments/order { item }` → Razorpay order; webhook → mark paid + **write CommissionLedger**; refunds per item rules (trial 4h; workshop none).
- **Backend:** REUSE webhook + idempotency; BUILD `CommissionLedger`; remove `PLATFORM_FEE_PAISE`/credits (S0.2).
- **Apps:** REUSE pay steps across booking/enroll/workshop/event.
- **E2E acceptance:** a trial + an enrolment payment each record a commission row; earnings (S4.6) reflect net.
- **Deps:** S0.1. **Unblocks S2.1/S2.3 confirmation + S4.6.**

---

## P3 — Classes & attendance

### S3.1 — Student "Classes" tab (enrolled-only, adaptive) `[F15]` — BUILD
- **Goal:** a 4th **Classes** tab showing **enrolled batches only — no trials**, with adaptive states.
- **Refs:** master §3.6; gap-analysis (no 4th tab today; build from `enrollments.tsx`; trials stay in Bookings).
- **Contract:** `GET /me/classes` → **active + past enrolled batches only** (no trials); counts drive state.
- **Backend:** BUILD `me/classes` read model over `Enrolment`s (exclude trials).
- **Student:** BUILD the tab in `(tabs)/_layout.tsx` with states — **multiple active → cards / one active → inline / no active but past → "not in any active batch" + past cards / no active+no past → tab hidden**; class detail = manage + correct in-class action (scan vs join).
- **E2E acceptance:** brand-new student → no Classes tab; after enrolling once → tab shows that one batch inline; trials never appear here (they're in Profile → Bookings).
- **Deps:** S2.3.

### S3.2 — In-studio QR check-in `[F13]` — BUILD (all three sides)
- **Goal:** academy shows a per-session QR; student scans to mark present; **QR-only, no manual marking**.
- **Refs:** master §2.2/§4.5; prototypes academy `attendance-qr` + student `checkin-scan`; gap-analysis (entirely missing).
- **Contract:** `POST /studio/batches/:id/session/checkin-token` (issue/rotate, short-lived, session-scoped); `POST /attendance/checkin { token }` (student scan → present, idempotent on double-scan); `GET /studio/batches/:id/session/attendance` (live scanned/not-yet roster).
- **Backend:** BUILD session check-in token entity + scan endpoint + live roster; feeds attendance % / tiers (S4.1).
- **Academy:** BUILD batch Attendance tab "Show check-in QR" card + full-screen `attendance-qr` + live "N of M checked in".
- **Student:** BUILD `checkin-scan` camera screen reached from in-studio active class detail ("Scan to check in").
- **E2E acceptance:** academy displays Guitar session QR; student scans → academy roster flips them to "checked in" live; double-scan is a no-op.
- **Deps:** S3.1, S1.3 (mode).

### S3.3 — Online live class + auto-on-join `[F14]` — CHANGE / BUILD
- **Goal:** academy hosts a Findemy room ("Start live class"); **joining marks attendance automatically**.
- **Refs:** master §2.2/§2.3/§4.6; prototypes academy `live-class` + student join; gap-analysis (student join REUSE; academy host screen + auto-present write missing).
- **Contract:** `POST /studio/batches/:id/live/start`; `GET /rooms/batch/:id/token` (REUSE) → **on join, write a present row** (auto-on-join); `GET /studio/batches/:id/live/roster` (joined/not-joined); `POST .../live/end`.
- **Backend:** CHANGE `rooms` to auto-write attendance on join; BUILD start/end + joined roster.
- **Academy:** BUILD online Attendance variant ("Start live class" + joined roster) + **Live-class host screen** (Live pill, video stage, End class).
- **Student:** REUSE `live/[batch_id]` join (attendance now recorded automatically).
- **E2E acceptance:** academy starts Vocals live; student joins → appears in joined roster + marked present without scanning.
- **Deps:** S3.1, S1.3.

### S3.4 — Schedule + cancel-class + make-good `[F11, F8]` — CHANGE / BUILD
- **Goal:** academy schedule (Now/Upcoming/Cancelled + Online); **cancel a class** → unbilled + **make-good session** (entitled count preserved — 8 stays 8); student notified.
- **Refs:** master §2.5/§4.3; prototypes Schedule + cancel-class sheet; gap-analysis (cancel is a raw delete; **no session-credit ledger**; make-good missing; reschedule discarded).
- **Contract:** `POST /studio/sessions/:id/cancel` → mark unbilled + **append one make-good session** to affected active enrolments (count restored) + notify; expose `SessionCredit`/period-extension.
- **Backend:** BUILD `SessionCredit` ledger (or period extension) + cancel-session endpoint + notifications; replace the raw `deleteSlot`.
- **Academy:** CHANGE Schedule — REUSE states; CHANGE cancel-class copy to "unbilled · +1 make-good session (count preserved)"; reschedule already DISCARDED (S0.2).
- **Student:** CHANGE class detail/notifications to reflect the make-good (entitlement preserved); explicit student-side view is a follow-up.
- **E2E acceptance:** academy cancels one of an 8-class month → student's entitlement stays 8 (one appended), unbilled, and a notification fires.
- **Deps:** S2.3.

---

## P4 — Manage & community

### S4.1 — Students roster, tiers & filters `[F16]` — CHANGE
- **Goal:** roster with **Active/Irregular/Inactive** tiers, attendance %, pills + a **Batch × Attendance Filters sheet**.
- **Refs:** master §4.4; prototypes Students + filters sheet; gap-analysis (`at_risk`→Irregular; rows lack %/tier; no Filters sheet; drop category chips).
- **Contract:** `GET /studio/students?batch_id&attendance_tier` (REUSE param) with `attendance_tier = active|irregular|inactive` (rename `at_risk`); rows return % + tier.
- **Backend:** CHANGE tier value `at_risk`→`irregular`; compute % from attendance (S2.2/S3.2/S3.3).
- **Academy:** CHANGE `students.tsx` — rename pills; **drop Music/Dance category chips**; BUILD Filters sheet (Batch × Attendance); add %/tier badge to rows + student detail (plan term/renewal).
- **E2E acceptance:** filtering "Guitar + Irregular" returns the right students with % + tier; tiers derive from real attendance.
- **Deps:** S3.2/S3.3 (attendance data).

### S4.2 — Coaches `[F17]` — REUSE
- **Goal:** list/detail, add coach, assign to batch.
- **Refs:** master §4.7; gap-analysis (structurally aligned).
- **Backend/Academy:** REUSE `coaches/*`; verify batch-count derives from assignments; coach drives program/batch display.
- **E2E acceptance:** add a coach, assign to Guitar → appears on the student program screen.
- **Deps:** S1.3.

### S4.3 — Reviews + eligibility (trial OR enrolment) `[F5]` — CHANGE / BUILD
- **Goal:** reviews from **trial-takers AND enrolled students**, gated by eligibility; academy responds.
- **Refs:** master §3.10/§4.8; gap-analysis (`Review.trialId` required+unique blocks enrolment reviews; no enrolled entry).
- **Contract:** `POST /reviews { academy_id, source: trial|enrollment, ... }`; eligibility = **has/had a trial OR enrolment** at that academy; one review per `(user, academy)`. `GET /academies/:id/reviews` + `POST /studio/reviews/:id/respond` (REUSE).
- **Backend:** CHANGE schema — `trialId` optional + add `enrollmentId`/source; broaden eligibility gate; canonical review-count (fix 84-vs-32).
- **Student:** BUILD an **enrolled-student review entry** (class detail / academy detail) — rating + chips + note, no decision step; REUSE post-trial flow.
- **Academy:** REUSE Reviews + respond.
- **E2E acceptance:** an enrolled (never-trialed) student can post a review; a never-trial/never-enrolled user cannot; academy responds.
- **Deps:** S2.3 (enrolments exist).

### S4.4 — Workshops (Online/Offline, non-refundable) `[F18]` — CHANGE
- **Goal:** academy hosts workshops (type **Online/Offline only**); student registers + pays; **non-refundable**.
- **Refs:** master §3.8/§4.9; gap-analysis (trim masterclass/demo; remove refund path).
- **Contract:** `Workshop.type = online|offline`; `POST /workshops/:id/register` → pay; **no refund** on cancel.
- **Backend:** CHANGE `WorkshopType` enum → online|offline; remove 24h refund branch.
- **Academy:** CHANGE `workshops/new.tsx` type grid → 2 options; trim `TYPE_LABELS`.
- **Student:** REUSE workshop detail→pay→confirm.
- **E2E acceptance:** academy publishes an Offline workshop; student registers + pays; cancellation offers no refund.
- **Deps:** S2.4.

### S4.5 — Events `[F19]` — REUSE
- **Goal:** browse + register (free/paid) events.
- **Refs:** master §3.9; app-ideation (module is MVP; championships future).
- **Backend/Student:** REUSE `events/*`; confirm enum/copy.
- **E2E acceptance:** student registers for a free event + pays for a paid one.
- **Deps:** S2.4.

### S4.6 — Earnings & payouts `[F20]` — CHANGE
- **Goal:** academy earnings overview + transactions + today's earnings, net of **commission**.
- **Refs:** master §4.10; gap-analysis (earnings present; tie to commission ledger).
- **Contract:** `GET /studio/earnings` derives from `Payment − CommissionLedger`; today's earnings on Dashboard.
- **Backend:** CHANGE earnings to read the commission ledger (S2.4).
- **Academy:** REUSE earnings UI; numbers now reflect commission.
- **E2E acceptance:** a paid enrolment shows gross, commission line, and net in earnings + today's-earnings.
- **Deps:** S2.4.

---

## P5 — Account & polish

### S5.1 — Profile, bookings & account `[F21]` — REUSE / CHANGE
- **Goal:** student Profile (bookings/saved/past classes — **trials live here, not the Classes tab**); academy Studio hub/Settings/KYC.
- **Refs:** master §3.10/§4.11; gap-analysis.
- **Backend/Apps:** REUSE; ensure **My Bookings / My Trials** is the home for trials (S3.1 moved them out of Classes); REUSE saved/wishlist + settings (attendance reminder).
- **E2E acceptance:** student finds a booked trial under Profile → My Bookings (not Classes); academy edits profile + toggles attendance reminder.
- **Deps:** S2.1, S3.1.

### S5.2 — Notifications & activity `[F22]` — REUSE / CHANGE
- **Goal:** push + activity feed for new trial, enrolment, **cancellation/make-good**, review reply, reminders.
- **Refs:** master §4.2; gap-analysis (push REUSE).
- **Backend:** REUSE Expo push; CHANGE emitters to include make-good (S3.4) + review eligibility events.
- **E2E acceptance:** cancelling a class pushes the affected students a "make-good session added" notice.
- **Deps:** S3.4, S4.3.

### S5.3 — Design-system parity & accessibility `[F23]` — REUSE (verify)
- **Goal:** persimmon-primary kit, type, nav, a11y across both apps.
- **Refs:** master §2.7; gap-analysis.
- **Apps:** REUSE shared theme; verify reduced-motion/focus/44px/ARIA on new screens (QR scanner, live class, Classes tab).
- **E2E acceptance:** the net-new screens pass the a11y checklist and match the prototype kit.
- **Deps:** the screens they cover.

---

## 4. Parallelization & ownership (rapid dev)

- **Per slice, the backend lane goes first; the apps fan out from its handoff.** The backend builds schema + API + shared `types`/`api-client` + seed, then publishes the **Handoff Document** (§3.3). The **Academy and Student lanes then run in parallel** against that handoff — it's the handshake that keeps both apps synced to the backend and to each other. (Across slices, different features can still be at different stages concurrently — one feature's apps wiring up while the next feature's backend is in build.)
- **Suggested concurrent tracks after P0:**
  - *Track A (revenue):* S1.3 → S2.1 → S2.3 → S2.4 → S4.6.
  - *Track B (attendance):* S3.1 → S3.2 ‖ S3.3 → S3.4 (needs S1.3 + S2.x; otherwise independent of Track A).
  - *Track C (catalog/community):* S1.1 → S1.2; S4.2 → S4.3 → S4.4 → S4.5.
- **Integration cadence:** demo every completed slice on **both apps against the shared seed** (S0.4). A slice that only works on one side is not done.
- **Backend-only enablers (no UI) to schedule early:** commission ledger (S2.4), session-credit ledger (S3.4), check-in token (S3.2), review schema (S4.3) — these unblock multiple client slices.

## 5. Per-slice Definition of Done (checklist)
- [ ] **Feature Master Plan** authored (§3.2) — covers backend + both apps + the shared contract, with the cross-side impact map and 1:1 sync map — and reviewed before coding.
- [ ] Contract (DTOs/enum/endpoint) merged in `backend/shared/types` + `api-client`.
- [ ] **Backend built first** — API endpoint implemented, authZ-scoped, unit-tested; money/idempotency/IST rails honoured.
- [ ] **Handoff Document (§3.3) published** — as-built API + typed client calls + example payloads + seed fixtures + per-app consumption map — *before* either app starts wiring.
- [ ] Academy app wired through `api-client` against the handoff; matches the academy prototype screen.
- [ ] Student app wired through `api-client` against the handoff; matches the student prototype screen.
- [ ] Seed updated so the slice is demoable on the shared cast.
- [ ] **End-to-end acceptance** in the slice card passes across **both apps**.
- [ ] Reconciled with `master-feature-document.md`; any prototype-vs-build gap logged in its §8.

---

## 6. Quick reference — feature → slice → status

| F# | Feature | Slice(s) | Dominant status |
|---|---|---|---|
| F1 | Auth | S0.3 | REUSE |
| F2 | Onboarding | S0.3 | CHANGE (modes) |
| F3 | Discovery | S1.2 | REUSE |
| F4 | Academy profile + gallery | S1.1, S1.3 | CHANGE (video) |
| F5 | Reviews | S4.3 | CHANGE/BUILD |
| F6 | Trial booking | S2.1 | CHANGE |
| F7 | Enrolment | S2.3 | CHANGE/BUILD |
| F8 | Plans/billing/make-good | S2.3, S3.4 | CHANGE/BUILD |
| F9 | Payments/commission | S2.4 | REUSE/BUILD |
| F10 | Batches/spots | S1.3 | CHANGE/BUILD |
| F11 | Schedule/cancel | S3.4 | CHANGE/BUILD |
| F12 | Trial OTP | S2.2 | CHANGE (4-digit) |
| F13 | In-studio QR | S3.2 | BUILD |
| F14 | Online live/auto-join | S3.3 | CHANGE/BUILD |
| F15 | Classes tab | S3.1 | BUILD |
| F16 | Roster/tiers | S4.1 | CHANGE |
| F17 | Coaches | S4.2 | REUSE |
| F18 | Workshops | S4.4 | CHANGE |
| F19 | Events | S4.5 | REUSE |
| F20 | Earnings | S4.6 | CHANGE |
| F21 | Profile/account | S5.1 | REUSE/CHANGE |
| F22 | Notifications | S5.2 | REUSE/CHANGE |
| F23 | Foundations/design | S0.1, S0.4, S5.3 | BUILD/REUSE |
| — | Referrals | *(deferred)* | DEFER |
