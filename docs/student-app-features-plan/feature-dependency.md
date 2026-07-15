# Feature Dependency & Reuse Map

Companion to `plan.md` (what each feature does) and `slice.md` (ordered task list). This doc answers: *what already exists to reuse, what's net-new, and what blocks what.*

## 0. Legend

- **REUSE** — existing code/model/component, used as-is.
- **CHANGE** — existing code/model, needs modification.
- **BUILD** — net-new.
- **DEFER** — explicitly out of scope for this initiative.

(Same tagging convention already used in `ai-usage/final-app/plan/*/S*.md`.)

## 1. At-a-glance dependency table

| Feature | Depends on | Blocks | Sides touched | Effort |
|---|---|---|---|---|
| 0. Classes/Enrollments cleanup | — | Pending Classes | student-app | M |
| 1. Pending Classes | Cleanup | Missed Classes, Attendance Tracker, Dashboard | backend, student-app | L |
| 2. Missed Classes | Pending Classes | Attendance Tracker | backend, academy-app, student-app | M |
| 3. Class Notes | — | Resources (shares attachment picker) | backend, student-app, shared-ui | L |
| 4. One-on-One Booking | — | — | backend, student-app, academy-app, shared-ui | XL (split into 4 slices) |
| 5. Fees Renewal | — | Dashboard (dues rollup) | backend, student-app | S–M |
| 6. Dashboard/Home | Pending Classes, Fees rollup, Notification inbox | — | backend, student-app | M–L |
| 7. Attendance Tracker | Missed Classes, Pending Classes | — | backend, student-app | M |
| 8. Resources/Study Material | Class Notes (attachment picker) | — | backend, student-app, academy-app | L |
| 9. Chat/Support | — | — | student-app | S |

## 2. Per-feature reuse/build breakdown

### 0. Classes/Enrollments Consolidation

| Concern | Backend | Student App | Academy App | Shared UI |
|---|---|---|---|---|
| Canonical enrolled-classes screen | — | **CHANGE** retire/repurpose `student-app/app/enrollments.tsx`; `(tabs)/classes.tsx` (backed by `useClasses` → `api.me.getClasses()`) becomes sole source | — | — |
| Detail screen | — | **REUSE** `student-app/app/enrollment/[id].tsx` unchanged | — | — |

Requires: nothing. Blocks: Pending Classes (don't build on top of a screen about to be retired).

---

### 1. Pending Classes

| Concern | Backend | Student App | Academy App | Shared UI |
|---|---|---|---|---|
| Weekly recurring pattern | **REUSE** `GET /me/classes` (`backend/api/src/modules/auth/service.ts:667` `getMyClasses`) — returns `timings[]`, mode, coach_name, attended_count | — | — | — |
| Concrete date projection | **REUSE** `nextTimingOccurrenceAfter` (`backend/api/src/modules/batches/service.ts`) — already computes concrete session dates internally for cancellation make-goods, currently not exposed as a feed | — | — | — |
| Cancellation exclusion | **REUSE** `CancelledSession` model (`schema.prisma:320`) — exclude these dates from the projected feed | — | — | — |
| "Next N sessions" endpoint | **BUILD** new route + service function combining the two REUSE items above, assigning each projected session a stable id (the "session-occurrence identity") | — | — | — |
| List UI | — | **BUILD** Pending Classes screen (date/time/subject/instructor), on the consolidated classes surface from Slice 0 | — | — |
| Types | **BUILD** new session types in `@findemy/types` + `@findemy/api-client` | — | — | — |

Requires: Slice 0. Blocks: Missed Classes, Attendance Tracker, Dashboard (all need the session-occurrence identity this produces).

---

### 2. Missed Classes

| Concern | Backend | Student App | Academy App | Shared UI |
|---|---|---|---|---|
| Absence recording | **CHANGE** `backend/api/src/modules/attendance/repo.ts` `recordPresent` — today only ever writes `present: true`; needs an explicit absent-write path (`BatchAttendance.present: false`, `schema.prisma:855`) | — | — | — |
| Group attendance mechanism | **REUSE** existing QR check-in flow (`backend/api/src/modules/attendance/service.ts`) as the source of "did they check in" — absence = no check-in by session end, made explicit rather than left implicit | — | — | — |
| Reason + recording link | **BUILD** new fields on the absence record (`reason`, `recording_url`) | — | **BUILD** minimal input surface for academy to add a reason/recording link to a session | — |
| Missed-list endpoint | **BUILD** new route filtering the Pending Classes session-occurrence feed to absent sessions | — | — | — |
| List UI | — | **BUILD** Missed Classes screen (reason, recording link) | — | — |
| NOT reused | `CancelledSession`/`SessionCredit` (`schema.prisma:320,336`) is **academy-initiated cancellation** with an automatic make-good credit — explicitly **DISCARD** as a base for this, it's a different concept (academy cancelling vs. student missing) | | | |

Requires: Pending Classes (session-occurrence identity). Blocks: Attendance Tracker (needs real absence data to compute a percentage).

---

### 3. Class Notes

| Concern | Backend | Student App | Academy App | Shared UI |
|---|---|---|---|---|
| Note model | **BUILD** fully net-new — no existing model anywhere | — | — | — |
| Upload pattern | **REUSE** existing pattern from `backend/api/src/modules/media` / `backend/api/src/modules/studio/upload.ts` | — | — | — |
| Attachment picker | — | — | — | **BUILD** file/image picker component (nothing in `@findemy/ui` covers this today — only `expo-image` exists for *display*) |
| CRUD UI | — | **BUILD** notes list/create/edit screen per class/subject | — | — |
| Detail/card scaffolding | — | **REUSE** `Summary`/`SummaryRow`, `MenuRow` from `@findemy/ui` | — | — |

Requires: nothing. Blocks: Resources (shares the attachment picker).

---

### 4. One-on-One Tutor Booking

| Concern | Backend | Student App | Academy App | Shared UI |
|---|---|---|---|---|
| Bookable coach concept | **BUILD** — `Coach` (`schema.prisma:196`) has no bookable-slot concept today; `Booking`/`Trial` key off `batchId`, not `coachId` | — | — | — |
| Request/accept/reject state machine | **BUILD** new booking entity with state machine (requested → accepted/rejected) | — | — | — |
| Payment-on-accept | **REUSE** the `Payment` model shape (`schema.prisma:443`) — Razorpay order/payment id fields, `idempotencyKey` pattern | **REUSE** `enrollment/pay.tsx` (Razorpay checkout) as the payment screen | — | — |
| Check-in | **REUSE** the trial-OTP verification pattern (`backend/api/src/modules/trials/service.ts:119`, compares a student-held code against `User.attendanceOtp`) | **REUSE** `AttendanceCodeCard` (`@findemy/ui`) to display the code | — | — |
| Check-out / duration tracking | **BUILD** — no existing concept of "session end = check-in + duration" anywhere; live class rooms (`app/live/[batch_id].tsx`) are placeholder-only | — | — | — |
| Refund settlement (4 outcomes) | **REUSE** the `Payment` schema's `refundStatus`/`razorpayRefundId`/`refundedAt`/**`refundAmountPaise`** fields — `refundAmountPaise` is already distinct from `amountPaise`, i.e. **partial refunds are already supported by the schema**; only the percentage-calculation logic per outcome (100% / 10–20% withheld / 0%) is net-new | — | — | — |
| Request form | — | **BUILD** mode selector (online/offline) + date/time request form | — | **BUILD** date/time picker (nothing in `@findemy/ui` covers this — `enrollment/[id].tsx`'s PauseSheet uses fixed preset pills, not a real picker) |
| Payment confirmation | — | **REUSE** `enrollment/confirmation.tsx`'s poll-until-confirmed pattern | — | — |
| Session history | — | **BUILD** past-1:1-sessions list, reusing `Summary`/`SummaryRow` | — | — |
| Coach request inbox | — | — | **BUILD** accept/reject/check-in/check-out UI, net-new (existing `coaches` module is academy CRUD only, no booking-facing surface) | — |

Requires: nothing (independent of the other features). Blocks: nothing, but is the largest single feature — split into 4 slices in `slice.md` (M4.1a request/accept/reject, M4.1b check-in/out + refunds, M4.2 student UI, M4.3 academy inbox).

---

### 5. Fees Renewal

| Concern | Backend | Student App | Academy App | Shared UI |
|---|---|---|---|---|
| Enrollment/period/payment lifecycle | **REUSE** `Enrollment → EnrollmentPeriod → EnrollmentPayment → EnrollmentPause` (`schema.prisma:694,729,768,789`) — fully built | — | — | — |
| Renewal endpoints | **REUSE** `POST /batches/:id/renew`, `GET /batches/:id/renewal-options` (`backend/api/src/modules/batches/routes.ts`, logic in `backend/api/src/modules/enrollments/service.ts`) | — | — | — |
| Due-date reminders | **REUSE** `backend/api/src/workers/renewal-reminder.ts` `sendRenewalReminders()` — already pushes at 7/3/1 days before due, idempotency via `remindersSentCount`/`lastReminderSentAt` | — | — | — |
| Renewal payment UI | — | **REUSE** `enrollment/[id].tsx`'s RenewSheet + `useRenewalOptions`/`useRenewEnrollment`, and `enrollment/pay.tsx` | — | — |
| Cross-enrollment dues rollup | **BUILD** small aggregation endpoint over `EnrollmentPeriod` across all of a student's enrollments (today it's per-enrollment only) | **BUILD** "my dues" summary screen/section | — | — |
| Payment history & receipts | **BUILD** endpoint listing `EnrollmentPayment` rows across enrollments + receipt generation | **BUILD** history screen | — | — |
| Renewal-due nudge (in-app) | **REUSE** `current_period_end` already returned per item by `GET /me/classes` (`getMyClasses`) — no new endpoint | **BUILD** dismissible "Renewal due" card on `(tabs)/classes.tsx` (Pay now / Not now); **CHANGE** (small) `enrollment/[id].tsx` to read an `openRenew` query param and auto-open the existing `RenewSheet` unchanged | — | — |

Requires: nothing. Blocks: Dashboard (needs the dues rollup).

---

### 6. Dashboard / Home

| Concern | Backend | Student App | Academy App | Shared UI |
|---|---|---|---|---|
| Base stats | **CHANGE** `GET /me/stats` (`backend/api/src/modules/auth/service.ts:467`) — currently only `trials_count`/`enrolled_count`/`reviews_count`; extend with next-class, dues, unread-notice counts | — | — | — |
| Home screen | — | **CHANGE** `(tabs)/index.tsx` (currently pure discovery — hero/search/category carousels, no summary widgets) — add a summary section | — | — |
| Data sources | **REUSE** Pending Classes feed, Fees dues rollup, Notification inbox unread count — no new logic beyond combining these | — | — | — |

Requires: Pending Classes, Fees dues rollup, Notification inbox. Blocks: nothing — this is a terminal rollup feature.

---

### 7. Attendance Tracker

| Concern | Backend | Student App | Academy App | Shared UI |
|---|---|---|---|---|
| Percentage calculation | **BUILD** — no endpoint computes this today; `attended_count` exists (`/me/classes`) but has no denominator/percentage calc | — | — | — |
| Data source | **REUSE** absence-recording from Missed Classes + session-occurrence identity from Pending Classes | — | — | — |
| Display | — | **BUILD** attendance % UI, per subject; **REUSE** dot-progress pattern already used in `enrollment/[id].tsx` and `enrollments.tsx` | — | — |

Requires: Missed Classes (real absence data), Pending Classes (session identity). Blocks: nothing.

---

### 8. Resources / Study Material

| Concern | Backend | Student App | Academy App | Shared UI |
|---|---|---|---|---|
| Model | **BUILD** — no "resource"/"material" model exists; `ProgramMedia` (`schema.prisma:236`) is academy marketing media (max 10 photos/videos on the program screen), not per-class study material — **DISCARD** as a base, different purpose | — | — | — |
| Attachment upload | **REUSE** the attachment picker built for Class Notes | — | **REUSE** same picker for teacher-side upload | **REUSE** (built in Class Notes) |
| Upload UI | — | — | **BUILD** teacher upload screen | — |
| View/download UI | — | **BUILD** student-facing view/download list, per batch | — | — |

Requires: Class Notes (attachment picker). Blocks: nothing.

---

### 9. Chat / Support

| Concern | Backend | Student App | Academy App | Shared UI |
|---|---|---|---|---|
| Transport | **DEFER** — no chat model, no realtime infra; explicitly not building this | — | — | — |
| WhatsApp deep link | — | **BUILD** `Linking.openURL('https://wa.me/...')` helper, sourced from `Coach.phone`/academy contact | — | **REUSE** existing `Wa` icon in `@findemy/ui`'s icon set |
| Replaces | — | **CHANGE** `student-app/app/enrollment/[id].tsx`'s stub `Alert.alert` placeholders ("Chat with support"/"Need help") | — | — |

Requires: nothing. Blocks: nothing — but is the fallback affordance referenced by 1:1 Booking (§3.4 in `plan.md`) for stalled requests.

## 3. Cross-feature shared building blocks (build once, reuse everywhere)

| Building block | Built in | Reused by |
|---|---|---|
| Session-occurrence identity | Pending Classes | Missed Classes, Attendance Tracker |
| Attachment/file picker (shared-ui) | Class Notes | Resources |
| Date/time picker (shared-ui) | 1:1 Booking (student request form) | — (no other current consumer) |
| Trial-OTP check-in pattern | (already exists — Trials) | 1:1 Booking check-in |
| Razorpay checkout + poll-until-confirmed | (already exists — Enrollment renewal) | 1:1 Booking payment |
| WhatsApp deep-link helper | Chat/Support | Fallback affordance for any stalled async request (1:1 Booking) |

**New `@findemy/api-client` namespaces required** (none of these exist today — confirmed against the current client's namespace list: `auth, me, academies, programs, batches, enrollments, bookings, payments, trials, attendance, reviews, events, workshops, push, studio.*, rooms`):
- `notes` (Class Notes)
- `coaching` or `oneOnOne` (1:1 Booking)
- `resources` (Resources/Study Material)
- `dashboard` (or extend `me.getStats`)
- `notifications` (Notification inbox)
- `sessions` (Pending/Missed Classes session-occurrence feed)

## 4. Known pre-existing debt flagged by this initiative

- **`classes.tsx` / `enrollments.tsx` duplication** — see Slice 0 above. Worth a line in `ai-usage/final-app/plan/dead-code-registry.md` once resolved, following that doc's existing convention for tracking this kind of cleanup.
- **Missed-1:1 "reschedule" is deliberately not built on `useRescheduleBooking`** — that hook (`student-app/src/hooks/useBookings.ts`, backing `api.bookings.reschedule`) exists for *trial* bookings, a different model (`Booking`/`Trial`, keyed off `batchId`). The 1:1 booking "reschedule" (close+refund old, submit new) is intentionally a distinct, simpler mechanism built on the new 1:1 booking entity — don't attempt to unify these two.
