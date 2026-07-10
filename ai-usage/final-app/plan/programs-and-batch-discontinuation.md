# Programs as a real entity + Batch discontinuation

> **Status:** design locked (via grill-me, 2026-07-04). Not yet implemented.
> **Origin:** the student app derives "programs" client-side by grouping an academy's
> batches on `(category, level)`, while the academy app creates **batches directly** with
> no parent program. The two apps disagree about what a batch is. This spec makes
> `Program` a real entity and defines the academy-initiated batch-discontinuation lifecycle
> (with refunds + settlement recovery).

## 0. Problem being fixed

- **No `Program` entity anywhere.** Backend is `Academy → Batch`; a `Batch` carries all
  "program-level" fields itself (`title`, `description`, `category`, `level`, fees, sessions…).
- **Student app fakes programs** in `student-app/src/lib/programs.ts` (`buildPrograms`):
  groups batches by `(category, level)`. The program **title comes from canned copy**
  (`getProgramCopy(category, level)`), so the academy-authored batch title is **discarded**;
  the description is just the *first* batch's.
- **Academy app** creates a `Batch` directly — program-stuff and batch-stuff jammed into one form.

## 1. Program becomes a real entity

- New `Program` model: `academyId`, `title`, `category`, `description` (**required**),
  `thingsToKnow[]`, `createdAt`. **Image derived from category** (no upload in MVP).
- **Program = one named offering** ("Guitar Lessons"). `level` is **per-batch**, so one
  program holds batches across Beginner / Intermediate / Advanced.
- `Batch` gains a required `programId` FK and **loses** its identity/marketing fields
  (`title`, `category`, `description`, `thingsToKnow` move up to Program).

## 2. Field ownership

| Program | Batch |
|---|---|
| title, category, description, things_to_know, image (derived) | level, coach, timings, capacity, mode, **trial_fee, monthly_fee, sessions_per_month, discounts** |

All economics stay on the batch (fees follow schedule frequency); trial/enrol pricing code untouched.

## 3. Migration

Seed-only (pre-launch) → **clean schema + reseed**. Seed creates Programs first, then Batches
under them. `programId NOT NULL` from the start. No backfill.

## 4. Academy app

- Top-level catalog becomes **Programs** (Studio "Batches" row/stat → "Programs";
  `/batches` list → `/programs`).
- **Program detail** (`/programs/[id]`): program copy + its batches + "Add batch".
- **No standalone batch creation** — `/batches/new` always requires a `programId`
  (batch form keeps only batch fields).
- Batch detail / schedule / roster / attendance stay batch-centric (+ "part of *Program*" breadcrumb).

## 5. Student app

- Server returns **programs with nested batches**; add **`GET /programs/:id`**.
  Program id = **real server id** (was a client slug).
- **Delete `buildPrograms`** (client grouping). Keep **image fallback** by category;
  **drop canned text** (academy description is now the source).
- No persisted program refs to migrate (`saved` is academy-level; trials/enrollments key off `batchId`).

## 6. Program lifecycle

- **No archiving.** A program is **deletable only when it has zero batches**. To retire a
  live offering, discontinue its batches first.
- A program is **visible to students only if it has ≥1 active batch** (empty program =
  academy-only, "Add a batch" prompt).

## 7. Batch discontinuation state machine

`active → closing → ended`

- **Discontinue** (academy) → `closing`, **immediately**: removed from discovery,
  **no new trials / enrollments / renewals**. **Enrolled students still see it** in
  My Classes and keep attending (join-live/QR, make-good credits).
- **`closing → ended`** requires **both** gates + manual **"Finish discontinuation"**:
  1. **≥30 days** since the request (lead-time floor; **skipped if the batch has zero active enrollments**).
  2. Every enrolled student **served out to their paid `endDate`** or **refunded**.
- **Program delete** unlocks once all batches are `ended`/removed.

## 8. Refunds (the accelerator to `ended`)

- **Per student**, **serve-out by default** (lapses at paid `endDate`; renewals already blocked).
  **Refund** removes a student's future `endDate` from the blocking set.
- Amount = **pro-rated by remaining entitled sessions**:
  `amountPaise × sessions_remaining / sessions_in_period` (calendar-day fallback).
- **Automated Razorpay refund** from the app (`refundStatus`, `razorpayRefundId`,
  `refundAmountPaise`, `refundedAt`).

## 9. Settlement — money recovery (academy bears it)

- **Academy bears the full gross R** of the refund (**including Findemy's margin**).
  Commission is **NOT** reversed (`reversedPaise` stays 0); Findemy stays whole and keeps commission.
  - Tally for undelivered portion worth ₹R: student paid R, kept-by-Findemy c, academy got (R−c) upfront.
    Refund R to student; recover **full R** from academy. Student whole; Findemy whole (keeps c);
    academy eats the entire R (the (R−c) received *plus* c).
- **Rolling reserve: 10%** of every payout held per-academy; **released after 60 days**.
- Refund draws **reserve first**, remainder → **negative balance**.
- **Payout netting:** `payout = earnings − commission − outstanding recovery`. Negative balance
  auto-recovers from future payouts.
- **Invoice / legal** only if an academy leaves with a negative balance (rare).

## 10. Student experience

- **Notified** on `closing` (push + in-app): "*<Batch>* is being discontinued — covered until
  *<endDate>*." My Classes shows "Closing — active until *<date>*"; **renewal disabled**.
- **Academy decides** serve-out vs refund per student; student is a protected recipient
  (no self-service refund/exit in MVP).

## 11. Edge cases

- **Booked future trials** on a closing batch → **auto-cancel + refund** the trial fee
  (via existing `Payment` refund fields), notify. Trial refunds are Findemy-neutral
  (reserve/negative-balance mechanics only apply to enrollment money).
- **Paused enrollments** → count as blockers by their paid `endDate` (served out or refunded
  like anyone else); **pending pause *requests* auto-cancelled**.

## 12. Schema changes (net)

- **New:** `Program`; an `AcademyRecovery` / `PayoutAdjustment` ledger; per-academy **reserve
  balance** + reserve tranches (60-day release); reserve-rate field (default **10%**).
- **Batch:** `+programId`; extend status for `closing` / `ended` (+ `discontinueRequestedAt`);
  remove `title` / `category` / `description` / `thingsToKnow`.
- **Reused as-is:** `EnrollmentPeriod.endDate`, `EnrollmentPayment` refund fields,
  `CommissionLedger.reversedPaise`, `Payout`.

## 13. Deferred (flagged, not in MVP)

Program image upload; per-batch fee overrides pulled to program level; security-deposit backing
for the reserve; student self-service refund/exit; the generous "guaranteed 30 days of free
service past paid term" option.

## Implementation log

- **Slice 1 (schema + seed) — done.** Added `Program` model, `Batch.programId` (required FK) +
  `program` relation, `Academy.programs`, and a `@@index([programId])`. Chose
  **expand→migrate→contract**: the Batch identity fields (`title`, `category`, `description`,
  `thingsToKnow`) are **kept, denormalized from the parent program**, so the ~25 backend consumers
  keep compiling; a later cleanup slice drops them. `Program.description` is a **nullable column**
  (the create-program form will enforce required in Slice 4). Seed rewritten: each academy now has
  `programs[]`, each with `batches[]`; the flattened `academy.batches` order + coach assignment are
  preserved so downstream seed code is unchanged. `studio/repo.ts createBatch` got an **interim
  find-or-create-program shim** (removed in Slice 4 when the form passes a real `programId`).
  Verified: `prisma validate` ✓, backend `tsc` ✓, `db push --force-reset` + reseed ✓ (11 programs,
  11 batches), batch→program linkage confirmed.

- **Slice 2 (backend programs API) — done.** New shared mapper `modules/programs/wire.ts`
  (`toBatchWire` + `toProgramWire`). Academy detail (`getAcademyById`) now returns `programs[]`
  (each with nested batches; a program is surfaced only if it has ≥1 active batch; sorted by title)
  **alongside** the flat `batches[]` (kept for back-compat until Slice 3 migrates the student app).
  Batch wire gained `program_id` + `coach_name` (batches include now selects `coach.name`). New
  `programs` module (`repo`/`service`/`routes`) exposes **`GET /programs/:id`** → `{ program, academy }`.
  Program wire aggregates across batches: `coach_names` (union), `trial_fee_paise`/
  `monthly_fee_paise_from` (min), `total_seats_left` (sum of `trial_spots`). Image is **not** sent —
  the student app derives it from category (Slice 3). Mock (`mock/fixtures.ts`) updated: `programs`
  on both academy-detail branches + a `GET-programs-_id` handler. Verified: `tsc` ✓, mock test ✓,
  live service calls against the seeded DB return correct programs + program detail.

- **Slice 3 (student app → server programs) — done.** Deleted client grouping: `buildPrograms`
  and `getProgramFromAcademy` are gone; `src/lib/programs.ts` now just exports the `Program`/
  `ProgramBatch` types + `enrichProgram(serverProgram)` (adds a category-derived `image_url`
  fallback and a display `level` derived from the program's batches). **Dropped canned text**:
  `programCopy.ts` deleted (image fallback `programImages.ts` kept). api-client gained
  `programs.getById` + `programs[]` on `academies.getById`. New `useProgram(id)` hook →
  `GET /programs/:id`. Screens migrated: `academy/[id]` + `academy/[id]/offerings` now map
  `data.programs` through `enrichProgram` (no more grouping); `program/[id]`, `.../trial`,
  `.../review` now fetch by real program id via `useProgram` (academy is returned by the endpoint,
  so `academy_id` params are optional/deep-link-safe). `seatsFor` prefers server `trial_spots`.
  Verified: student-app `tsc` clean; authenticated HTTP smoke test — `/academies/:id` returns
  Guitar/Piano programs, `/programs/:id` returns program + batches + academy summary with correct
  from-pricing and trial_spots. (Pre-existing, unrelated: the api-client package's standalone
  `tsc` flags a stale-`dist` `@findemy/types` export; the app graph resolves it fine.)

- **Slice 4 (academy app → Programs nav) — done.** Backend: new studio program endpoints
  (`GET/POST /studio/programs`, `GET/PUT/DELETE /studio/programs/:id`) — list (with `batch_count`),
  detail (program + its batches), create, edit, delete (**409 unless the program has zero batches**).
  `POST /studio/batches` now **requires `program_id`** and derives title (`"<program> · <level>"`),
  category, description, things_to_know from the program; the Slice-1 find-or-create shim in
  `repo.createBatch` is **retired** (programId required). api-client gained `studio.programs.*`.
  Academy app: new hooks (`useStudioPrograms`, `useStudioProgram`, `useCreateProgram`,
  `useDeleteProgram`; `useCreateBatch` now sends `program_id`, no title/category/description). New
  screens `app/programs/index.tsx` (list), `app/programs/[id].tsx` (identity + batches + "Add batch"
  + delete-when-empty), `app/programs/new.tsx` (create-program form; **description required**). Batch
  form `app/batches/new.tsx` now takes a `program_id` param, shows a read-only Program header, and
  dropped the category/title/description/things-to-know fields. Studio tab stat + Manage row and the
  Schedule header button repointed **Batches → Programs → `/programs`**. Standalone list
  `app/batches/index.tsx` **deleted** (no standalone batch creation). Verified: academy-app `tsc`,
  backend `tsc` clean; live service flow (create → empty-detail → delete-ok → add-batch →
  derived-title/category → delete-blocked-409) ✓.
  - *Deferred:* the batch-detail "part of Program" breadcrumb (the batch title already reads
    "Program · Level"); studio MOCK-mode program handlers (academy dev uses the real backend).

- **Slice 5 (batch discontinuation state machine) — done.** *(Refund money movement stays in
  Slice 6.)* Schema: `BatchStatus += closing, ended`; `Batch.discontinueRequestedAt` (nullable);
  `db push` (additive, no reset). New `discontinuation` backend module (`repo`/`service`/`routes`):
  `POST /studio/batches/:id/discontinue` (active→closing, cancels booked-future trials + pending
  pause requests, notifies enrolled + trial students best-effort), `GET .../discontinuation`
  (notice countdown + blocking roster + `can_finish` gate), `POST .../finish-discontinuation`
  (closing→ended, **409** unless gates clear). **Gates:** `can_finish = closing && (≥30 days since
  request OR 0 active enrolments) && no active enrolment with a future paid-through period`.
  **Blocking new trials/enrol/renew is automatic** — the existing `status === 'active'` guards in
  bookings/enroll/renew already reject `closing`/`ended` (no new guards needed). Student wire:
  `batch_status` added to `/me/classes` items and `/enrollments/:id`. `@findemy/types`: `Batch.status`
  widened + `ClassItem.batch_status`. Academy app: hooks (`useBatchDiscontinuation`,
  `useDiscontinueBatch`, `useFinishDiscontinuation`); batch-detail hero pill shows Closing/Ended +
  a Discontinue/"in progress" link; new `app/batches/[id]/discontinue.tsx` (start-discontinue →
  closing view with serving-out roster + gated "Finish discontinuation"; per-student **Refund**
  action is Slice 6). Student app: My Classes shows a "Closing — active until <date>" badge; the
  enrollment-detail **Renew** row is disabled when the batch is closing. Verified: all three
  `tsc` clean; full authenticated HTTP flow — discontinue→closing, student sees closing in both
  endpoints, renew→400 blocked, finish→409 gated, empty-batch path finishes to `ended`.

- **Slice 6 (discontinuation refunds) — done.** *(Settlement recovery = Slice 7.)* Reused the
  existing Razorpay helpers (`issueRazorpayRefund`, `updateEnrollmentPaymentRefunded`,
  `updatePaymentRefunded`). **Enrollment refund accelerator:** `POST
  /studio/batches/:id/discontinuation/refund` `{ enrollment_id }` → `refundBlockerEnrollment`
  computes the **pro-rated unused amount by remaining sessions** (`amountPaise × sessions_remaining
  / sessions_in_period` from the batch timings; calendar-day fallback), issues the Razorpay refund
  on the period's captured payment, then **cancels the period + deactivates the enrolment** so it
  drops out of the blocking set (refunding the last blocker → 0 active enrolments → notice floor
  skipped → `can_finish` flips true). Per plan §9 **commission is NOT reversed** (academy bears the
  full gross; Slice 7 books the recoverable — left as a marked NOTE at the refund site). **Trial-fee
  refunds** wired into `discontinueBatch`: cancelled booked-future trials with a captured payment are
  **fully refunded** + standard commission reversal (Findemy-neutral, §11). api-client
  `studio.batches.refundDiscontinuation`; academy hook `useRefundBlocker`; the closing-roster
  "Serving out" pill is now a **Refund** button (confirm → toast with refunded amount → roster
  refetches). Verified: backend + academy `tsc` clean; enrollment refund = 526,153 of 570,000
  (session-pro-rated), payment `refundStatus=requested`, enrolment→inactive, blocker cleared,
  `can_finish`→true, finish→ended; trial discontinue cancels + refunds ₹15,000 in full.

- **Slice 7 (settlement — reserve + netting) — done.** *(Whole plan now implemented.)* Schema:
  `Academy.reserveRateBps` (default 1000 = 10%); new `ReserveHold` (amount, consumedPaise, heldAt,
  releaseAt, status held|released|consumed) and `AcademyRecovery` (grossPaise, reserveAppliedPaise,
  negativePaise) models; `db push` (additive). New `settlement` module (`repo`/`service`):
  `accrueReserveOnCapture` (10% tranche, 60-day release) hooked into **all three academy-revenue
  capture branches** of the payment webhook (enrollment/workshop/trial; events excluded — Findemy-
  owned); `applyRefundRecovery` (draws held reserve oldest-first, remainder → negative balance)
  hooked into `refundBlockerEnrollment` so the academy bears the **full gross R** (commission stays
  un-reversed per §9); `getSettlement` (reserve held/released + outstanding recovery);
  `releaseMaturedReserve` wired as a daily `reserve-release` BullMQ worker. Earnings endpoint now
  returns `settlement` + `net_payable_paise = net − outstanding_recovery`. Academy earnings screen
  shows a **Settlement** card (reserve held + "Owed to Findemy" when negative). Verified: backend +
  academy `tsc` clean; settlement math end-to-end — ₹10k capture→₹1k reserve; ₹1.5k refund→₹1k
  reserve-applied + ₹500 negative; maturity release; and the integration refund books the full
  ₹5,261 as outstanding recovery (reserve-first, academy bears full gross).

## 14. Notes for whoever implements

- **§9 (settlement) is the heaviest lift** — new ledger + reserve + payout-netting machinery
  that does not exist today. Earnings are currently recognized **in full at capture**
  (`backend/api/src/modules/studio/repo.ts`), with `Payout` a flat record (no held/available balance).
- **Reserve rate 10%** was the recommended default, not an override — reconfirm 10% vs 5% before building.
- Suggested phasing: **schema+reseed → backend (programs API, discontinuation, refunds, settlement) →
  academy app (programs nav, discontinue flow) → student app (server programs, closing UX)**.
