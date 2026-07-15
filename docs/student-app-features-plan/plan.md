# Student App — New Features: Plan

## 1. Purpose & how to read this doc

This is a feature-by-feature spec for a batch of student-app features requested by the product owner: Class Management (Pending Classes, Missed Classes, Class Notes), Personalized Learning (1:1 tutor booking), Payments & Fees (Fees Renewal), plus a set of suggested additions (Dashboard, Attendance Tracker, Notifications, Profile, Resources, Chat/Support).

Three docs cover this initiative, each with a different job:
- **`plan.md`** (this doc) — what each feature does, user-facing behavior, and the scope decisions already locked in.
- **`feature-dependency.md`** — for each feature, what already exists in the codebase to reuse vs what's net-new, per side (backend / student-app / academy-app / shared-ui), plus which features block which.
- **`slice.md`** — the ordered, checkbox-able implementation task list derived from the above two docs.

Start here for *what* and *why*; go to `feature-dependency.md` for *what to reuse*; go to `slice.md` to actually start building.

## 2. Locked scope decisions

These were decided with the product owner during scoping — don't relitigate them without going back to that conversation.

| Decision | Rationale |
|---|---|
| **Recording = link-only** | No recording/VOD infrastructure exists today (live classes only issue a join token, nothing is captured or stored). Building real recording capture + storage + playback is a multi-week infra project on its own. Instead, the academy pastes an external URL (YouTube/Drive) per missed session. |
| **Chat/Support = WhatsApp deep link, not in-app chat** | No chat/message model, no realtime transport (websocket/polling) exists anywhere in this codebase. `wa.me` deep-linking via `Linking.openURL` gets a real "message the academy" capability with zero new backend infrastructure, and the `@findemy/ui` icon set already ships a `Wa` icon. |
| **1:1 tutor booking = async request → accept/reject**, not a published-slots marketplace | Student proposes a time; the academy/coach accepts or rejects it via a real academy-app screen. This is a cross-app feature — academy-app work is explicitly in scope for this one. |
| **1:1 payment collected only after acceptance** | A rejected request costs the student nothing and needs no refund path. Payment (Razorpay) triggers only once the academy accepts. |
| **Missed-class "reschedule" is not a separate feature** | No reschedule endpoint or UI anywhere in the app. A student wanting a different 1:1 time simply closes+refunds the existing request and submits a new one — the same request/accept/reject/refund machinery handles it. Missed *group/batch* classes have no reschedule action at all: view + reason + recording link only. |
| **classes.tsx / enrollments.tsx cleanup happens first** | `student-app/app/(tabs)/classes.tsx` and `student-app/app/enrollments.tsx` are near-duplicate screens today. An earlier plan (`ai-usage/final-app/plan/P3-classes-and-attendance/S3.1-classes-tab.md`) already decided `classes.tsx` should be canonical and `enrollments.tsx` repurposed away — that follow-through never happened. Finishing it is a prerequisite for Pending Classes, so it doesn't get built on the wrong/duplicate base. |
| **Docs live in `docs/student-app-features-plan/`** | A new, self-contained location — not the existing `ai-usage/final-app/plan/` phase-folder convention, not the repo root. |

## 3. Feature specs

### 3.0 Foundation Cleanup — Classes/Enrollments Consolidation `[prerequisite, not user-facing]`

**What it does**: Nothing new for users. Finishes an already-decided but incomplete cleanup: `(tabs)/classes.tsx` becomes the single canonical "my enrolled classes" surface; `enrollments.tsx` is retired/repurposed. `enrollment/[id].tsx` stays as the detail screen either way.

**Scope decisions specific to this feature**: Follow `S3.1-classes-tab.md`'s original decision rather than re-deciding from scratch.

**Explicitly out of scope**: Any new UI — this is pure consolidation of two existing screens into one.

---

### 3.1 Pending Classes

**What it does**: Shows a student's upcoming, concretely-dated class sessions (not just "Tuesdays at 5pm" but "Tue 22 Jul, 5:00–6:00pm") for each active batch enrollment, with subject/instructor. This is the first feature that needs a real "which specific dated session" concept — later features (Missed Classes, Attendance Tracker) build on the same identity.

**Scope decisions specific to this feature**: Sourced entirely from existing enrolled-batch data — no new "class" concept, just a projection of `Batch`/`BatchTiming` into concrete upcoming dates, excluding academy-cancelled sessions.

**Explicitly out of scope**: 1:1 tutor sessions (those live under their own feature, §3.4) — this is group/batch classes only.

---

### 3.2 Missed Classes

**What it does**: A student can see which of their enrolled-class sessions they missed, with a reason if the academy provided one, and a recording link if the academy attached one. No reschedule action — see the locked decision above.

**Scope decisions specific to this feature**: Recording = link-only (academy-pasted URL). Absence must actually be recorded by the backend going forward — today the system only ever records "present," never "absent."

**Explicitly out of scope**: Reschedule requests for group classes. Any video capture/storage/playback pipeline.

---

### 3.3 Class Notes

**What it does**: A student can upload, view, edit, and organize their own notes per class/subject, with file/image attachments.

**Scope decisions specific to this feature**: Notes are batch/subject-scoped, not tied to an individual dated session — keeps this feature fully independent of Pending Classes' session-identity work.

**Explicitly out of scope**: Teacher-authored content — that's a separate feature (§3.8, Resources), even though it shares the same attachment-upload building block.

---

### 3.4 One-on-One Tutor Booking

**What it does**: A student picks a mode (online/offline), requests a specific tutor for a proposed date/time, and either gets accepted (and pays) or rejected (and pays nothing). The student can view past 1:1 session history and notes.

**Scope decisions specific to this feature** — the full locked session lifecycle:

1. Student submits a request (mode, proposed date/time) → **no payment yet**.
2. Academy/coach **accepts** (payment is collected now, via Razorpay) or **rejects** (nothing further happens — no payment ever existed to refund).
3. **Check-in**: the student shows a short code to the coach at the start of the session (the same pattern already used for trial attendance — student holds the code, the other party enters/verifies it); entering it starts the session clock. The coach is expected to arrive no more than 15 minutes before the scheduled time.
4. **Session end** = check-in time + the paid session duration — not a fixed clock time. A late start shifts the end time so the student always gets the full duration they paid for.
5. **Early-exit outcomes**:
   - Student leaves mid-session, by their own choice → **no refund** (they forfeit the remaining time).
   - Coach leaves mid-session → **100% refund**.
6. **No-show / couldn't connect**: for an offline session, if the coach travels to meet the student but they can't find or reach each other for any reason → **partial refund**: a small visit charge (roughly 10–20% of the fee) is withheld, the rest is refunded.
7. **Academy fails to fulfill** an accepted request entirely (coach never shows or delivers at all) → **full refund**. This is the umbrella principle; points 5–6 are the specific worked-out percentages for how a failure actually gets settled depending on what happened.

Rescheduling a 1:1 session is not a distinct action: the student closes the existing request (triggering whatever refund outcome applies) and submits a new one.

**Explicitly out of scope**: A published-availability marketplace where coaches list open slots for students to book directly (this may be a future direction, but v1 is request→accept/reject).

---

### 3.5 Fees Renewal

**What it does**: A student sees fee due date, amount, and status per enrollment; can renew/pay via the existing Razorpay integration; can view payment history with downloadable receipts; gets reminders before the due date.

**Scope decisions specific to this feature**: Almost all of this already exists in the backend (renewal endpoints, payment records, and a reminder worker that already fires push notifications at 7/3/1 days before due). The only real gaps are: a single view that rolls up dues across *all* of a student's enrollments (today it's per-enrollment), and a payment-history/receipts list.

**Explicitly out of scope**: Changing the renewal pricing/discount logic, or the payment gateway itself — this feature is purely about surfacing what already exists plus the two small rollup gaps.

---

### 3.6 Dashboard / Home

**What it does**: A quick-summary view: next upcoming class, any pending fees, unread notices.

**Scope decisions specific to this feature**: This is a rollup on top of Pending Classes (§3.1), the Fees dues rollup (§3.5), and the Notification inbox (§3.9) — it's built last, once those exist, rather than duplicating their logic.

**Explicitly out of scope**: New data sources beyond what those three features already expose.

---

### 3.7 Attendance Tracker

**What it does**: Shows a student's overall attendance percentage, per subject.

**Scope decisions specific to this feature**: Blocked on Missed Classes (§3.2) actually recording absence — today there is no denominator to compute a percentage from, since only "present" is ever written. Pre-launch historical sessions (before absence-recording ships) are excluded from the percentage rather than counted as absent, so existing students don't see an artificially tanked number on ship day.

**Explicitly out of scope**: Retroactive backfill of historical attendance data.

---

### 3.8 Resources / Study Material

**What it does**: Teacher-shared PDFs, recordings, and assignments, visible to students per batch.

**Scope decisions specific to this feature**: Structurally identical to Class Notes (§3.3) — a file/image attachment tied to a batch — but academy/teacher-authored instead of student-authored. Shares the same attachment-picker component built for Class Notes rather than building a second one.

**Explicitly out of scope**: Any content-authoring workflow beyond simple file upload (no rich text editor, no versioning).

---

### 3.9 Chat / Support

**What it does**: A "Message on WhatsApp" action that opens a `wa.me` deep link pre-filled with context, using the coach's or academy's contact phone number. Replaces the current stub `Alert.alert` placeholders ("Chat with support" / "Need help") in `student-app/app/enrollment/[id].tsx`.

**Scope decisions specific to this feature**: No in-app chat, no message history, no realtime transport. This is also the fallback safety net for any other feature's async request (1:1 booking, in particular) that stalls without a timely response — if the academy doesn't act on a request quickly, the student can always fall back to WhatsApp.

**Explicitly out of scope**: In-app messaging, chat history, read receipts, any realtime infrastructure.

## 4. Cross-feature shared infrastructure

Named here; reuse/build details are in `feature-dependency.md`:
- **Session-occurrence identity** — a stable, dated identifier for "this specific class session," built in Pending Classes and reused by Missed Classes and Attendance Tracker.
- **Attachment/file picker** (shared-ui component) — built once for Class Notes, reused by Resources.
- **Date/time picker** (shared-ui component) — built for the 1:1 booking request form.
- **Trial-OTP check-in pattern** — reused as-is for 1:1 booking check-in.
- **Razorpay checkout + poll-until-confirmed pattern** (`enrollment/pay.tsx`, `enrollment/confirmation.tsx`) — reused for 1:1 booking payment.
- **WhatsApp deep-link helper** — built for Chat/Support, reusable as a fallback affordance anywhere an async request might stall.

## 5. Open questions / risks remaining

- **1:1 booking is the single largest feature in this batch** — a full request/accept/reject/payment/check-in/check-out/4-outcome-refund state machine, plus a new academy-app coach inbox. It's split across four slices in `slice.md` (M4.1a, M4.1b, M4.2, M4.3) specifically because of this size; expect it to be the long pole.
- **Coach arrival SLA (≤15 min before scheduled time)** is a stated expectation, not (yet) specified as a hard block — i.e. nothing currently described prevents a coach from checking in later than that. Flagged for a decision when M4.1b is implemented: track-only (for dispute resolution) vs. hard enforcement.
- **Recording-link trust boundary**: since recordings are academy-pasted external URLs, basic validation (only `http`/`https`, no arbitrary scheme) should be applied before the student-app renders/opens them.
- **Notification inbox starts empty** at launch — no backfill of previously fire-and-forget pushes.
