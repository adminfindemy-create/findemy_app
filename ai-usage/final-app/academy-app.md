# Findemy — Academy App Component Breakdown

> **What this is.** Every feature from [`master-feature-document.md`](./master-feature-document.md) decomposed into its **Academy / Admin app** component. Companion files: [`backend.md`](./backend.md) and [`student-app.md`](./student-app.md).
>
> **Feature numbers (F1…F23) are shared across all three files**, so a feature's academy, student, and backend components line up. Where the academy app has no role, it says *n/a*.
>
> **Surface:** mobile app (Expo / React Native), **4 tabs — Dashboard · Schedule · Students · Studio**. 25 screens + 5 sheets (see master doc §7.2). **Persimmon-primary** kit (jade is a secondary accent only), shared with the student app.
>
> **Audience:** academies — independent gurus, small studios, established institutes. **Job:** get discovered → manage trials, batches, attendance, enrolments.

---

## F1 — Authentication (phone + OTP)
- **Screens:** Welcome ("Get discovered… manage trials, batches, attendance & enrolments"), Login, Sign up, OTP.
- **Does:** **OTP-only sign in**, **one login per academy** (team access is v2).

## F2 — Onboarding & profile setup
- **Screens:** Onboarding.
- **Does:** set **academy name, location/area, tagline**, and **Modes offered** (In-studio / Online / Home visit). Verification/KYC drives the **Verified** badge (F21).

## F3 — Discovery & search
- *No discovery screen.* The academy's job is to **be discoverable** — a complete, **verified, published** profile + programs feeds the student-side index (F4). Reviews/rating (F5) and trial price affect ranking.

## F4 — Academy profile & programs/offerings
- **Screens:** Studio (hub), Edit profile; Batches list, Batch detail (program/batch source of truth); Coaches.
- **Does:** edit **profile hero** (cover, name, verified badge, rating, location) + a **media gallery of up to 10 photos/videos**; maintain **programs/batches** (coach · schedule · **mode** · trial + monthly fee · capacity) that render as the student-facing academy/program pages.

## F5 — Reviews & ratings
- **Screens:** Reviews, Respond.
- **Does:** **rating summary** (4.9 · breakdown), **review list**, **Needs-reply** filter, and **respond** to reviews (with a "calm, specific reply" nudge). Reviews come from **both** trial-takers and **enrolled students** (current or past); only users with a past/active trial or enrolment are eligible to post.

## F6 — Trial booking (paid, OTP attendance)
- **Screens:** Dashboard (new trials), Schedule (Trials today), Trial detail.
- **Does:** trials arrive **auto-confirmed** as "new trial bookings" on the Dashboard and under **Trials today** on the Schedule; open a trial → **accept the OTP the student shows** to verify & mark present (Trial detail → **Mark attendance**, F12). **Trial spots are automatic** — *no availability-publishing screen* (F10).

## F7 — Enrollment (recurring batch)
- **Screens:** Batch detail (Roster), Students.
- **Does:** enrolments appear in the batch **enrolled/capacity** and the roster; capacity drop recomputes **trial spots**. (The student performs the enrol + payment; the academy sees the result.)

## F8 — Plans, billing & subscription lifecycle
- **Screens:** Student detail, Batch detail.
- **Does (read/impact):** sets the **monthly fee + quarterly/annual discount %** when creating a batch (**≤30%**, F10); sees each student's **plan** + renewal on the student detail; the **cancel-a-class** action (F11) makes a session unbilled and **appends one make-good session** to affected plans (entitled count preserved — 8 stays 8). (Renew/pause/transfer/discontinue are student-initiated.)

## F9 — Payments & commission
- **Screens:** Earnings (F20).
- **Does:** doesn't run checkout; **receives net payouts** (collected − commission) surfaced in Earnings and "today's earnings" on the Dashboard.

## F10 — Batches & capacity (trial-spot automation)
- **Screens:** Batches list, Batch detail (Edit tab). **Sheet:** New batch.
- **Does:** **create/edit batches** — name, category, coach, **capacity (stepper)**, schedule days, start/end time, **mode (In-studio / Online)** + Findemy-room note for online, **monthly fee**, and **quarterly / annual discount %** (**capped at 30%** — higher is blocked); **Pause batch**. Header shows **enrolled/capacity + "N trial spots open"** with the **auto-spots** explainer (capacity − enrolled). Online badge on online batches.

## F11 — Scheduling & cancel-a-class
- **Screens:** Schedule (tab). **Sheet:** Cancel class.
- **Does:** **week strip** + today's classes with states **Now / Upcoming / Cancelled** and an **Online** indicator; tap → Batch detail. **Cancel a class** → session **unbilled + one make-good session appended** to plans (entitled count preserved, 8 stays 8; students notified).

## F12 — Attendance · Trial (OTP)
- **Screens:** Trial detail, **Attendance OTP**, (online trials → Live class).
- **Does:** **Verify attendance** — enter the student's **4-digit code** → *Verify & mark present* / *Couldn't verify · mark no-show*. **Online trials** verify the OTP inside the live session (adds *Start live class*).

## F13 — Attendance · In-studio regular (QR check-in)
- **Screens:** Batch detail (Attendance tab), **Attendance QR**.
- **Does:** Attendance tab shows a **Show check-in QR** card + live "9 of 12 checked in" + **scanned / not-yet roster**. **Attendance QR** displays the full-screen **per-session QR** students scan. **QR-only — no manual present/absent marking** (locked decision).

## F14 — Attendance & hosting · Online regular (live class, auto-on-join)
- **Screens:** Batch detail (Attendance tab, online variant), **Live class**.
- **Does:** online Attendance tab shows **Start live class** + "7 of 8 joined" + **joined / not-joined roster** (auto-on-join). **Live class** = host room (red ● **Live** pill, Findemy-hosted video stage, joined roster, **End class**). No external Zoom/Meet link.

## F15 — Student classes & class management
- **Screens:** Batch detail (Roster tab), Student detail.
- **Does (academy mirror):** the per-class roster and each student's class/plan/attendance — the academy-side view of what the student manages in their Classes tab.

## F16 — Students roster, tiers & health
- **Screens:** Students (tab), Student detail. **Sheet:** Filters.
- **Does:** **search** + **attendance pills** (All · Active · Irregular · Inactive); **Filters sheet** = combinable **Batch** (Guitar — Beginner / Vocals — All Levels / Keys & Piano) **× Attendance** (Active ≥75% / Irregular 50–74% / Inactive <50%); rows show avatar · batch · **attendance %** · **tier badge**. **Student detail:** since, batch, coach, plan, attendance %, tier, message (demo), view batch.

## F17 — Coaches
- **Screens:** Coaches list, Coach detail. **Sheets:** Add coach, Assign coach.
- **Does:** list coaches (specialty · batch count); coach detail (assigned batch); **add coach**; **assign coach to batch**.

## F18 — Workshops (hosted by the academy)
- **Screens:** Workshops, Workshop create/edit.
- **Does:** **Workshops** — Upcoming / Live / Past tabs; cards with fee + spots/registered. **Create / edit** — title, **type (Online / Offline)**, date, time, fee, capacity, about; **Save draft / Publish**; track registrations. Workshops are **non-refundable** for the learner.

## F19 — Events
- *Largely student-facing in MVP.* The academy can be an event **organiser** (e.g., "Indie Rock Night by The Rhythm House"), but there's **no event-management screen** in the academy app yet — data only. *(Future.)*

## F20 — Earnings & payouts
- **Screens:** Earnings; Dashboard "today's earnings"; Studio quick-stat "Earned (₹62.4k)".
- **Does:** **payouts & transaction history** (₹), earnings overview, and a Dashboard summary of the day's takings.

## F21 — Account, profile & settings
- **Screens:** Studio (hub), Edit profile, Settings.
- **Does:** **Studio hub** — profile hero (cover, **Verified** badge, rating, location, Edit); **quick stats** (Students · Batches · Earned); **Manage** menu (Academy profile, Earnings, Reviews, Workshops, Coaches, Batches); **Account** menu (Notifications & settings, **Verification / KYC**, Login phone, **Team access — v2**); Sign out; version. **Edit profile** (Change cover + **media gallery up to 10 photos/videos**, name, tagline, about, address, specialities, **payout/bank details — account · IFSC · holder**). **Settings** (notifications incl. **attendance reminder** + preferences).

## F22 — Notifications & activity
- **Screens:** Dashboard (Inbox), Settings.
- **Does:** **Today summary** (classes active, **new trials**, total students, **today's earnings**); **new trial bookings**; **recent activity** feed; notification preferences incl. **attendance reminder**.

## F23 — Platform foundations (cross-cutting)
- **Does (client):** the **shared design system** rendered **persimmon-primary** (jade secondary) — same type, cards, floating pill nav, transitions, bundled imagery, and accessibility (focus rings, reduced-motion, 44px targets, ARIA, tabular figures) as the student app, so the two sides feel like one product.

---

### Academy-app emphases
- The academy app is the **management mirror** of every student action: trial booked → appears here; enrol → roster/capacity update; attendance → verify OTP / show QR / start live; review → respond; cancel class → make-good session (count preserved).
- Two demo classes anchor attendance: **Guitar = in-studio (Show check-in QR)**, **Vocals = online (Start live class)** — mirrored 1:1 with the student app.
