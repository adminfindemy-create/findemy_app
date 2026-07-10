# Findemy — Backend Component Breakdown

> **What this is.** Every feature from [`master-feature-document.md`](./master-feature-document.md) decomposed into its **backend / API / platform** component. Each feature is broken into three components across three files — this is the backend slice. The companion files are [`student-app.md`](./student-app.md) and [`academy-app.md`](./academy-app.md).
>
> **Feature numbers (F1…F23) are shared across all three files**, so a feature's backend, student, and academy components line up. Where a side has no role, it says *n/a* there — the backend almost always has a role.
>
> **Scope:** high-level responsibilities — data owned, key endpoints, business rules/jobs, and external integrations. Not an API spec.
>
> **Reference stack** (from repo signals): API service with **Prisma** (Postgres), **Razorpay** (payments), **MSG91** (OTP/SMS), **Cloudflare R2** (media), a **Findemy-hosted video room** for online classes, push notifications, Sentry. Two clients (student + academy) share one API.

---

## Cross-cutting backend principles
- **One shared data world.** Both apps read/write the same entities (academies, coaches, batches, enrolments, trials, attendance). The two apps are different *views* of one backend.
- **Money is server-authoritative.** Prices, plan discounts, trial fees, commission and payout figures are computed and verified server-side; clients never set amounts.
- **Computed, not stored where derivable.** Trial spots, attendance %, tiers, and "today's earnings" are derived from source records.
- **Idempotency on payment & attendance writes** (payment webhooks, check-ins) to survive retries/double-scans.
- **AuthZ by role + ownership.** A student touches only their own bookings; an academy touches only its own academy, batches, students.

---

## F1 — Authentication (phone + OTP)
- **Data:** `User` (role: student | academy_member), `Phone`, `OtpChallenge` (code hash, expiry, attempts), `Session`/token.
- **APIs:** request-OTP, verify-OTP → issue session token; refresh; sign-out.
- **Rules:** OTP via MSG91; short expiry + rate-limit + attempt cap; **one login per academy** (academy phone maps to a single academy account; team access is post-MVP). Social sign-in is a future provider hook.
- **Integrations:** MSG91.

## F2 — Onboarding & profile setup
- **Data:** `StudentProfile` (name, email, city, **interests[]**), `Academy` (name, area/location, tagline, **modes offered**: in-studio/online/home-visit, KYC/verification status).
- **APIs:** create/update student profile + interests; create/update academy profile; geocode area → coordinates.
- **Rules:** interests personalise discovery ranking (F3); academy `modesOffered` constrains batch/trial modes (F10, F14); verification flag drives the **Verified** badge.

## F3 — Discovery & search
- **Data:** searchable index over `Academy` + `Program`/`Batch` (category, geo, rating, trial price, distance).
- **APIs:** search (query + filters: category, **min rating**, **distance**); "top rated this week"; "near you" (geo radius). Returns cards with "trial from ₹X".
- **Rules:** ranking blends rating, distance, and student interests; only **verified/published** academies surface. Location resolved from selected area or device GPS (client-supplied coords).
- **Note:** the academy side has no discovery *screen* — academies feed this index by being published + verified (F2, F4).

## F4 — Academy profile & programs/offerings
- **Data:** `Academy` (cover, about, rating, review count, location, **media gallery — up to 10 photos/videos**), `Coach`, `Program`/`Batch` (coach, schedule, **mode**, trial fee, monthly fee, capacity, enrolled). Media in R2.
- **APIs:** get public academy detail (programs + workshops, coaches, reviews preview, **gallery**); list offerings; get program detail (coach · schedule · mode · fees · batches/seats-left); academy-side CRUD for profile, programs, batches, coaches; **media upload (enforce ≤10 items, photo/video)**.
- **Rules:** "seats left" / trial spots = capacity − enrolled (F10); program **mode** (in-studio/online) flows to trials and attendance; **gallery hard-capped at 10 media** (server rejects the 11th).

## F5 — Reviews & ratings
- **Data:** `Review` (rating, chips/tags, note, author, target academy/program, reply, status: needs-reply/replied).
- **APIs:** submit review (from a trial **or** an enrolment); list reviews + rating breakdown; academy **respond**; "needs-reply" filter.
- **Rules:** rating aggregate + breakdown computed from reviews; **eligibility enforced server-side — a user may review an academy only if they have, or have had, a trial or enrolment there (active or past)**; reviews come from both trial-takers and enrolled students; **aggregate review count must be a single source of truth** (see Known-gap: prototype shows 84 on identity vs 32 on the reviews screen — backend should expose one canonical count).

## F6 — Trial booking (paid, OTP attendance)
- **Data:** `Trial` (student, batch, slot, mode, amount, payment, **attendance OTP code**, status: booked/attended/no-show/cancelled).
- **APIs:** list open slots for a batch; create trial → payment intent (F9) → confirm; **reschedule (allowed once)** (re-pick a slot) / cancel — **refund if cancelled ≥4h before the slot, else non-refundable** (no-show = non-refundable); academy lists today's/auto-confirmed trials.
- **Rules:** trials **auto-confirm** on payment; a **4-digit OTP** is generated and shown to the student (e.g., `4927` Guitar, `8260`/`8 2 6 0` Vocals-online); trial **inherits its batch mode**; consuming a seat recomputes trial spots.

## F7 — Enrollment (recurring batch)
- **Data:** `Enrolment` (student, batch, **plan**, status: active/on-hold/discontinued, start, renewal date), links to `Subscription` (F8).
- **APIs:** create enrolment (batch chosen on program screen, plan chosen on enrol screen) → payment → confirm; reflect new enrolment in batch enrolled/capacity.
- **Rules:** enrolling increments `enrolled` → **recomputes trial spots**; one active enrolment per student per batch.

## F8 — Plans, billing & subscription lifecycle
- **Data:** `Plan` (Monthly | **Quarterly** *Popular* | **Annual** *Best value*), per-batch **monthly fee + quarterly/annual discount %** (set by the academy, **≤30%**; demo 10/20), `Subscription` (cycle, auto-renew, next-renewal), `SessionCredit` ledger.
- **APIs:** renew/change plan; **pause** (1–4 wks); **transfer batch**; **discontinue** (+ refund where due); read billing summary.
- **Rules:** **auto-renew each cycle**; **discount % is academy-set per batch and capped at 30%** (server rejects higher); quarterly/annual price derived from monthly fee − discount; **cancel-a-class** (F11) marks the session unbilled and **appends +1 make-good session** to affected plans (restores the entitled count — 8 stays 8, not a bonus); pause shifts renewal.

## F9 — Payments & commission
- **Data:** `Payment`/`Order` (item type: trial/enrolment/workshop/event, amount, method, gateway ref, status), `CommissionLedger`, `Refund`.
- **APIs:** create payment intent; **Razorpay webhook** (verify signature → mark paid → unlock booking); refunds; payout accounting.
- **Rules:** **commission** taken on trials + enrolments (rate TBD by team); gateway = Razorpay (UPI/cards/netbanking); amounts server-authoritative; webhook idempotent.
- **Integrations:** Razorpay.

## F10 — Batches & capacity (trial-spot automation)
- **Data:** `Batch` (name, category, coach, **capacity**, enrolled, schedule days/times, **mode**, **monthly fee**, **quarterly/annual discount %**).
- **APIs:** create/edit batch (capacity stepper, days, mode, **fee + quarterly/annual discount %**); pause batch; list batches with enrolled/capacity.
- **Rules:** **trial spots = capacity − enrolled, automatic** — *no availability-publishing endpoint*; **discount % validated ≤30%** (F8); mode (in-studio/online) selects the attendance mechanism (F13/F14); trials inherit batch mode.

## F11 — Scheduling & cancel-a-class
- **Data:** `ClassSession` (batch, date/time, status: scheduled/now/cancelled), occurrences from batch schedule.
- **APIs:** today's/weekly schedule (per academy); **cancel a class**.
- **Rules:** session states **Now / Upcoming / Cancelled**; cancelling a session → **unbilled + appends one make-good session** to enrolled plans (entitled count preserved — 8 stays 8) (F8) and notifies students (F22).

## F12 — Attendance · Trial (OTP)
- **Data:** `Attendance` row on `Trial` (present/no-show, verified-by, timestamp).
- **APIs:** academy verifies student's 4-digit code → mark present; mark no-show.
- **Rules:** OTP belongs to the student, entered by the academy; works for in-studio **and** online trials (online code verified inside the live session). Successful verify completes the trial → unlocks post-trial review (F5).

## F13 — Attendance · In-studio regular (QR check-in)
- **Data:** per-session **check-in token/QR**, `Attendance` rows (student, session, scanned-at).
- **APIs:** issue/rotate a session QR token (academy display); **student scan → check-in** (validate token + enrolment + time window → mark present); live "N of M checked in" roster.
- **Rules:** **QR-only, no manual marking** (locked decision); token scoped to session + short-lived; double-scan idempotent; feeds attendance % / tiers (F16).

## F14 — Attendance & hosting · Online regular (live class, auto-on-join)
- **Data:** `LiveSession` (Findemy room id, joined participants), `Attendance` via join.
- **APIs:** academy **Start live class** (open room) → host stream; student **Join live class**; **auto-mark present on join**; **End class**; live "N of M joined" roster.
- **Rules:** **Findemy-hosted room** (no external Zoom/Meet link); attendance = auto-on-join; online batches/trials only.
- **Integrations:** video/streaming service + TURN; "link active 10 min before".

## F15 — Student classes & class management
- **Data:** read models over a student's `Enrolment`s (**enrolled batches only — trials excluded**); counts of **active** vs **past** batches drive the tab's state. Trials are served under bookings (F21).
- **APIs:** my-classes (active enrolled batches; past batches when there's no active one) — **no trials in this payload**; class detail; in-class action availability (scan vs join) by mode/status; manage actions (proxy to F8).
- **Rules (adaptive tab — F15 student):** expose counts so the client can render **multiple active → cards / one active → single batch / no active but past → past-batch list / none at all → tab hidden**; tab is available only when the student has **≥1 active or past batch**; full history also under account (F21).

## F16 — Students roster, tiers & health (academy)
- **Data:** `Enrolment` + computed **attendance %** per student; **tier**: Active ≥75% / Irregular 50–74% / Inactive <50%.
- **APIs:** roster (search, **attendance pills**: All/Active/Irregular/Inactive); **filters sheet** combinable **Batch + Attendance**; student detail (plan, attendance, tier, batch, coach).
- **Rules:** tier derived from rolling attendance (F12–F14); pills = quick attendance filter, sheet = Batch × Attendance.

## F17 — Coaches (academy)
- **Data:** `Coach` (name, specialty, assigned batches, batch count).
- **APIs:** list/detail; **add coach**; **assign coach to batch**.
- **Rules:** batch-count derived from assignments; coach drives program/batch display (F4).

## F18 — Workshops
- **Data:** `Workshop` (title, **type: online | offline**, date, time, fee, capacity, registered, status: upcoming/live/past, draft/published).
- **APIs:** academy create/edit/publish + track registrations; student discover + **register → pay** (F9).
- **Rules:** registration consumes a spot; standalone purchase (not a subscription); **non-refundable** — no cancellation refund on workshop registrations.

## F19 — Events
- **Data:** `Event` (name, organiser, type: competition/workshop/meetup, date, venue, fee (free/paid), prize, spotlight flag).
- **APIs:** list events (filter pills + spotlight); event detail → **register → pay** (F9, paid) or free register.
- **Rules:** **module is MVP**; large Findemy-organised championships are future. Mostly student-facing; academies can be organisers (data only in MVP).

## F20 — Earnings & payouts (academy)
- **Data:** `PayoutAccount`, transactions (derived from `Payment` − commission), balances.
- **APIs:** earnings overview, transaction history, **today's earnings** (dashboard), payout status.
- **Rules:** earnings = collected − commission − gateway fees (split TBD); figures derived, not stored as truth.
- **Note:** no student component.

## F21 — Account, profile & settings
- **Data:** student account (profile, **bookings** history, **saved/wishlist**, refunds); academy account (Studio hub stats, **KYC/verification**, login phone, **team access** v2, notification prefs).
- **APIs:** read/update profile; bookings (upcoming/past: trials/online/workshops/events); saved academies CRUD; settings/prefs; KYC submission/status.
- **Rules:** Studio quick-stats (students/batches/earned) are derived; team-access is gated to v2.

## F22 — Notifications & activity
- **Data:** `Notification`/`ActivityEvent` (new trial, enrolment, cancellation, review reply, reminders), device tokens, prefs (e.g., **attendance reminder**).
- **APIs:** register device token; deliver push; dashboard **recent activity** feed; nudges.
- **Rules:** events emitted by F6/F7/F8/F11/F5; respect per-user prefs.
- **Integrations:** push (FCM/APNs/Expo).

## F23 — Platform foundations (cross-cutting)
- **Media:** image **and video** upload/serve (covers, avatars, **academy gallery ≤10 items** — F4) via **Cloudflare R2**.
- **Geo:** area → coordinates; distance computation for discovery.
- **Observability:** Sentry, audit trail on money/attendance writes.
- **Config:** **discount cap (30%)**, commission %, **trial refund window (4h) + reschedule-once**, **workshop non-refundable**, gallery cap (10) — server config/rules (team-TBD values where noted).
- **Note:** the **design system** itself is a client concern (F23 in the app files); backend only stores/serves assets.

---

### Backend-only items not visible in the apps
- Razorpay **webhooks** & reconciliation; **auto-renew** scheduler; **trial-spot** & **attendance-tier** recomputation jobs; **make-good session** ledger on cancellations (preserves the entitled count, not a bonus); OTP issuance/rate-limiting; search indexing; payout accounting; canonical review-count aggregation.
