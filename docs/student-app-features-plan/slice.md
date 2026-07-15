# Implementation Slices — Ordered Task List

Companion to `plan.md` (what/why) and `feature-dependency.md` (reuse/build map). This is the doc to actually work from.

## 1. How to use this doc

- Slices are grouped into milestones, ordered so independent/cheap work comes first and genuinely-blocked work comes last.
- Each slice lists its **Deps** (hard blockers, by slice ID), **Effort** (S/M/L/XL, relative), and **Sides** touched.
- Work through the **Tasks** checklist, then confirm the **Acceptance criteria** checklist before calling a slice done.
- Slice IDs (`M<milestone>.<n>`) match the ones used in `feature-dependency.md`'s tables.

## 2. Milestone overview

| Milestone | Slices | Why this order |
|---|---|---|
| 1 — Quick Wins & Foundation | M1.1–M1.4 | Nothing blocks these; cheapest, highest-ratio-of-value wins first, and M1.1 clears the ground Pending Classes needs |
| 2 — Class Visibility Core | M2.1, M2.2 | Establishes the session-occurrence identity (M2.1) that Milestone 3 and 6 depend on; Class Notes (M2.2) is independent, run in parallel |
| 3 — Missed Classes | M3.1 | Needs M2.1's session identity |
| 4 — One-on-One Booking | M4.1a, M4.1b, M4.2, M4.3 | Independent of everything else; large enough to be its own milestone; split into 4 slices because of size |
| 5 — Notifications & Resources | M5.1, M5.2 | M5.1 has no dependencies (grouped here for narrative reasons only); M5.2 needs M2.2's attachment picker |
| 6 — Rollups | M6.1, M6.2 | Genuinely blocked on earlier milestones — build last |

## 3. Dependency graph

```
M1.1 (cleanup) ──┐
M1.2 (whatsapp)  │
M1.3 (history)   │
M1.4 (dues) ─────┼──────────────────────────────┐
                 │                               │
                 ▼                               │
              M2.1 (pending classes) ──┬──────┐  │
                                        │      │  │
              M2.2 (notes) ──┐          ▼      ▼  │
                              │       M3.1    M6.1 │
                              │      (missed)(attend)
                              ▼                     │
                           M5.2                     │
                          (resources)                │
                                                      │
M5.1 (notif inbox) ───────────────────────────────┐  │
                                                    ▼  ▼
                                                  M6.2 (dashboard)

M4.1a (1:1 request/accept) ──► M4.1b (check-in/out + refunds)
       │                              │
       ▼                              ▼
     M4.2 (student UI)          M4.3 (academy inbox)
```

## 4. Milestones & slices

### Milestone 1 — Quick Wins & Foundation Cleanup

#### M1.1 — Classes/Enrollments consolidation
Deps: — · Effort: M · Sides: student-app

Tasks
- [ ] Confirm `(tabs)/classes.tsx` (backed by `useClasses`/`api.me.getClasses()`) is the surface to keep, per `ai-usage/final-app/plan/P3-classes-and-attendance/S3.1-classes-tab.md`
- [ ] Move any UI/functionality unique to `enrollments.tsx` into `classes.tsx` if not already covered
- [ ] Repoint any remaining navigation/links from `enrollments.tsx` to `classes.tsx`
- [ ] Retire `student-app/app/enrollments.tsx` (delete or reduce to a redirect)
- [ ] Log the removal in `ai-usage/final-app/plan/dead-code-registry.md` per that doc's existing convention

Acceptance criteria
- [ ] Only one enrolled-classes screen remains in the app
- [ ] No broken navigation references to the retired screen
- [ ] Typecheck + existing test suite green

---

#### M1.2 — Chat/Support via WhatsApp deep link
Deps: — · Effort: S · Sides: student-app

Tasks
- [ ] Build a small helper: `openWhatsApp(phone: string, message?: string)` using `Linking.openURL('https://wa.me/...')`
- [ ] Source the phone number from `Coach.phone` (session/enrollment context) or academy contact info
- [ ] Replace the stub `Alert.alert` calls in `student-app/app/enrollment/[id].tsx` ("Chat with support" / "Need help") with this helper
- [ ] Use the existing `Wa` icon from `@findemy/ui`'s icon set on the button

Acceptance criteria
- [ ] Tapping "Chat with support" opens WhatsApp (or the web fallback) with the correct number pre-filled
- [ ] Graceful handling if no phone number is available (button hidden or disabled, not a silent no-op)

---

#### M1.3 — Fees: payment history & downloadable receipts
Deps: — · Effort: M · Sides: backend, student-app

Tasks
- [ ] Backend: new endpoint listing a student's `EnrollmentPayment` rows across all enrollments (date, amount, status)
- [ ] Backend: receipt generation/download (PDF or simple formatted view) per payment
- [ ] Student app: payment history screen, reusing `Summary`/`SummaryRow` list patterns
- [ ] Add `payments.history`/`payments.receipt` (or similar) to `@findemy/api-client`

Acceptance criteria
- [ ] A student with payments across 2+ enrollments sees all of them in one list, correctly dated
- [ ] Receipt is downloadable/viewable per payment

---

#### M1.4 — Fees: cross-enrollment dues rollup endpoint
Deps: — · Effort: S · Sides: backend

Tasks
- [ ] Backend: new aggregation endpoint over `EnrollmentPeriod` (due date, amount, status) across all of a student's active enrollments
- [ ] Add to `@findemy/api-client`

Acceptance criteria
- [ ] A student with 2+ active enrollments gets a single rolled-up list of dues, correctly reflecting each period's status
- [ ] Typecheck + tests green

---

### Milestone 2 — Class Visibility Core

#### M2.1 — Pending Classes (upcoming sessions feed)
Deps: M1.1 · Effort: L · Sides: backend, student-app

Tasks
- [ ] Backend: expose `nextTimingOccurrenceAfter` (`backend/api/src/modules/batches/service.ts`) as a reusable session-projection helper
- [ ] Backend: new endpoint returning the next N concrete sessions per enrolled batch, excluding dates covered by `CancelledSession`
- [ ] Backend: assign each projected session a **stable id** — this is the session-occurrence identity M3.1 and M6.1 will build on
- [ ] Student app: Pending Classes list UI (date/time/subject/instructor) on the consolidated classes surface from M1.1
- [ ] Add new session types to `@findemy/types` + `@findemy/api-client`

Acceptance criteria
- [ ] A student with 2 active batches sees upcoming sessions for both, correctly dated
- [ ] A session covered by an active `CancelledSession` does not appear
- [ ] Each returned session has a stable id, verified reusable by re-fetching and confirming ids match across calls
- [ ] Typecheck + existing test suite green

---

#### M2.2 — Class Notes
Deps: — · Effort: L · Sides: backend, student-app, shared-ui

Tasks
- [ ] Backend: new `Note` model (batch/subject-scoped, not session-scoped) + CRUD endpoints
- [ ] Backend: file/image attachment handling, reusing the pattern from `backend/api/src/modules/studio/upload.ts`
- [ ] Shared-ui: build a file/image attachment picker component (net-new — nothing in `@findemy/ui` covers this today)
- [ ] Student app: notes list/create/edit screen per class/subject, using `Summary`/`SummaryRow`/`MenuRow` for scaffolding
- [ ] Add `notes.*` to `@findemy/api-client`

Acceptance criteria
- [ ] Student can create, view, edit, and delete a note with an attached file/image
- [ ] Notes are organized/filterable by class/subject
- [ ] Typecheck + tests green

---

### Milestone 3 — Missed Classes

#### M3.1 — Missed Classes (absence + recording link)
Deps: M2.1 · Effort: M · Sides: backend, academy-app, student-app

Tasks
- [ ] Backend: add an explicit absence-write path (`BatchAttendance.present: false`) — today `recordPresent` only ever writes `true`
- [ ] Backend: add `reason` and `recording_url` fields to the absence record
- [ ] Backend: basic URL validation on `recording_url` (only `http`/`https` schemes accepted)
- [ ] Backend: missed-list endpoint filtering the M2.1 session feed to absent sessions
- [ ] Academy app: minimal input surface for a coach/academy to add a reason and/or recording link to a session
- [ ] Student app: Missed Classes screen (reason, recording link — opens externally, no in-app player)

Acceptance criteria
- [ ] A session with no check-in by its end time is recorded as absent (not just silently missing)
- [ ] Academy can attach a reason/recording link, and the student sees it
- [ ] An invalid recording URL scheme is rejected server-side
- [ ] No reschedule action anywhere on this screen (by design — see `plan.md` §2)

---

### Milestone 4 — One-on-One Tutor Booking

#### M4.1a — 1:1 booking: request/accept/reject + payment-on-accept
Deps: — · Effort: L · Sides: backend

Tasks
- [ ] New booking entity, `coachId`-keyed (distinct from `Booking`/`Trial`, which are `batchId`-keyed)
- [ ] State machine: `requested → accepted | rejected`
- [ ] On accept: create a `Payment`-shaped record (reuse the existing `Payment` model's Razorpay order/payment id + `idempotencyKey` pattern) and trigger checkout
- [ ] On reject: terminal state, no payment ever created
- [ ] Endpoints: create request, accept, reject, get

Acceptance criteria
- [ ] A rejected request has no associated payment record
- [ ] An accepted request transitions to a payable state and a Razorpay order is created
- [ ] Idempotency: double-accepting or double-paying doesn't create duplicate payment records

---

#### M4.1b — 1:1 booking: check-in/check-out + refund settlement
Deps: M4.1a · Effort: L · Sides: backend

Tasks
- [ ] Check-in: reuse the trial-OTP verification pattern (`backend/api/src/modules/trials/service.ts:119` style — student-held code, coach enters/verifies it) to start the session clock
- [ ] Check-out: compute session end = check-in time + paid duration; record actual check-out time/reason (student-left / coach-left / completed)
- [ ] Refund outcome #1: student leaves mid-session → no refund
- [ ] Refund outcome #2: coach leaves mid-session → 100% refund (`refundAmountPaise = amountPaise`)
- [ ] Refund outcome #3: no-show/couldn't-connect → partial refund, visit charge withheld (~10–20%, make the percentage configurable)
- [ ] Refund outcome #4: academy fails to fulfill entirely → 100% refund
- [ ] Wire refund processing through the existing Razorpay refund fields (`refundStatus`, `razorpayRefundId`, `refundedAt`, `refundAmountPaise`)

Acceptance criteria
- [ ] Each of the 4 outcomes produces the correct `refundAmountPaise` relative to `amountPaise`
- [ ] Session end time correctly reflects check-in time + duration, not the originally scheduled clock time
- [ ] Coach-arrival timing (≤15 min before scheduled time) is at minimum logged for later dispute resolution (hard enforcement is an open question — see `plan.md` §5)

---

#### M4.2 — 1:1 booking: student UI
Deps: M4.1a · Effort: L · Sides: student-app, shared-ui

Tasks
- [ ] Shared-ui: build a date/time picker component (net-new — no existing picker in `@findemy/ui`; `enrollment/[id].tsx`'s PauseSheet preset pills are not reusable here)
- [ ] Student app: mode selector (online/offline) + request form using the new date/time picker
- [ ] Student app: reuse `enrollment/pay.tsx` for the post-acceptance payment step
- [ ] Student app: reuse `enrollment/confirmation.tsx`'s poll-until-confirmed pattern for payment confirmation
- [ ] Student app: past-session history list (`Summary`/`SummaryRow`) including outcome/refund status per session
- [ ] Student app: "still waiting?" WhatsApp fallback prompt (reuses M1.2's helper) if a request is pending beyond a short window

Acceptance criteria
- [ ] Student can submit a request, see it pending, get notified on accept/reject, and pay only after acceptance
- [ ] Session history correctly shows past outcomes including refund amounts where applicable

---

#### M4.3 — 1:1 booking: academy coach inbox
Deps: M4.1a, M4.1b · Effort: L · Sides: academy-app

Tasks
- [ ] Coach-facing request inbox: list of pending requests
- [ ] Accept/reject actions
- [ ] Check-in action (enter the student's code)
- [ ] Check-out action (mark completed / mark self-left / mark no-show)

Acceptance criteria
- [ ] Coach can see, accept, and reject a request
- [ ] Coach can check in and check out a session, correctly triggering the corresponding backend state transition from M4.1b

---

### Milestone 5 — Notifications & Resources

#### M5.1 — Notification history/inbox
Deps: — · Effort: M · Sides: backend, student-app

Tasks
- [ ] Backend: persist a record each time a push notification is sent (currently fire-and-forget only — class reminders, renewal reminders, etc.)
- [ ] Backend: read/unread state per notification, per user
- [ ] Backend: inbox-list endpoint
- [ ] Student app: notification inbox screen

Acceptance criteria
- [ ] Starts empty at launch — no backfill of historical pushes
- [ ] A newly sent push (class reminder, renewal reminder) appears in the inbox
- [ ] Read/unread state persists correctly

---

#### M5.2 — Resources / Study Material
Deps: M2.2 · Effort: L · Sides: backend, student-app, academy-app

Tasks
- [ ] Backend: new resource/material model, batch-scoped, distinct from `ProgramMedia` (which is academy marketing media, not teacher study material)
- [ ] Backend: upload endpoint reusing the attachment-picker infrastructure from M2.2
- [ ] Academy app: upload UI for teachers
- [ ] Student app: view/download list per batch

Acceptance criteria
- [ ] Teacher-uploaded resource appears in the student's view for that batch
- [ ] Reuses the same attachment picker component built in M2.2 (no second implementation)

---

### Milestone 6 — Rollups

#### M6.1 — Attendance Tracker
Deps: M3.1, M2.1 · Effort: M · Sides: backend, student-app

Tasks
- [ ] Backend: percentage calculation per subject, using M3.1's absence data and M2.1's session identity as the denominator source
- [ ] Backend: exclude pre-M3.1 historical sessions from the calculation (no retroactive "absent" backfill)
- [ ] Student app: attendance % display, reusing the existing dot-progress pattern from `enrollment/[id].tsx`/`enrollments.tsx`

Acceptance criteria
- [ ] A student's attendance % only reflects sessions recorded after M3.1 shipped
- [ ] Percentage math is correct against a hand-checked sample (e.g. 8 attended / 10 total = 80%)

---

#### M6.2 — Dashboard/Home rollup
Deps: M2.1, M1.4, M5.1 · Effort: M/L · Sides: backend, student-app

Tasks
- [ ] Backend: extend `GET /me/stats` (`backend/api/src/modules/auth/service.ts:467`) with next-class (from M2.1), pending-fees (from M1.4), unread-notice count (from M5.1)
- [ ] Student app: add a summary section to `(tabs)/index.tsx` — currently pure discovery (hero/search/category carousels), so this is additive, not a replacement

Acceptance criteria
- [ ] Dashboard summary correctly reflects a student's actual next class, dues, and unread count
- [ ] Existing discovery functionality on the home tab is unaffected

## 5. Global definition of done

For every slice:
- [ ] `pnpm typecheck` clean in every touched workspace
- [ ] `pnpm lint` clean
- [ ] Existing test suite still green (no regressions)
- [ ] Manual smoke test of the specific acceptance criteria above, run in Expo Go or a dev build

Additional per-milestone smoke checks:
- **Milestone 1**: confirm no dead navigation links after the classes/enrollments cleanup; confirm the WhatsApp deep link opens correctly on both iOS and Android
- **Milestone 4**: run through all 4 refund outcomes manually against a test Razorpay account before considering M4.1b done — this is the highest-risk slice in the whole plan

## 6. Parallelization notes

- **M1.1–M1.4** are mutually independent — assignable to different engineers/agents concurrently.
- **M2.1** and **M2.2** are independent of each other — run in parallel.
- **M4.2** and **M4.3** both depend only on **M4.1a** (M4.3 additionally on M4.1b) — once M4.1a/b land, the student-app and academy-app halves of 1:1 booking can proceed in parallel.
- **M5.1** has no dependencies and can run any time after Milestone 1 — it's grouped into Milestone 5 for narrative/thematic reasons only, not because it's blocked.
- **M6.1** and **M6.2** are the only genuinely blocked slices in this plan — don't start either until their listed dependencies are done.
