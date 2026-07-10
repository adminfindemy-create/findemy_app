# Findemy — Master Feature Document

> **Purpose.** A single, exhaustive reference of **every feature across both Findemy apps** — the **Student app** (learners) and the **Academy/Admin app** (academies) — as realised in the flow-faithful HTML prototypes, cross-checked against the canonical product scope in [`../app-ideation/`](../app-ideation/).
>
> **Use this as the source of truth** for "what does the product do." It captures every screen, every sub-feature, the shared platform model, and how the two apps mirror each other.
>
> **Sources:** `prototypes/Findemy Student App.html` (38 screens + 8 sheets), `prototypes/Findemy Academy App.html` (25 screens + 5 sheets), and `app-ideation/` (01–09).
> **Tagline:** *Discover your Art.* · **Core loop:** discover → try → enrol · **Launch market:** Delhi-NCR.
> **Last updated:** 2026-06-23.

---

## Table of contents

1. [Platform overview](#1-platform-overview)
2. [Shared platform model](#2-shared-platform-model-both-apps)
3. [Student app — full feature catalog](#3-student-app--full-feature-catalog)
4. [Academy app — full feature catalog](#4-academy-app--full-feature-catalog)
5. [Cross-app mirrored flows](#5-cross-app-mirrored-flows)
6. [MVP scope & business model](#6-mvp-scope--business-model)
7. [Appendix — complete screen & sheet inventory](#7-appendix--complete-screen--sheet-inventory)
8. [Known gaps & notes](#8-known-gaps--notes)

---

## 1. Platform overview

**Findemy** is a discovery + booking platform for **skill academies** (music, dance, art, yoga, fitness, and other creative/performing skills). Learners find local academies, see transparent info, **book a trial**, and **enrol**; academies get discovered and manage their intake from a companion app.

| | Student app | Academy / Admin app |
|---|---|---|
| **For** | Learners (all ages — adults, parents-for-kids, teens, aspiring performers) | Academies (independent gurus, small studios, established institutes) |
| **Job** | Discover → try → enrol; manage classes | Get discovered → manage trials, batches, attendance, enrolments |
| **Surface** | Mobile app (4 tabs: Discover, Events, Classes, Profile) | Mobile app (4 tabs: Dashboard, Schedule, Students, Studio) |
| **Backed by** | Shared API (Razorpay payments, OTP auth, etc.) | Same shared API |

**The conversion hinge is the trial.** Everything is built around: *find a place → book a paid trial → attend → decide → enrol into a recurring batch.* Findemy earns **commission** on trials and enrolments.

Both prototypes share one cast and one data world (see §2), so the two sides of every interaction line up.

---

## 2. Shared platform model (both apps)

These concepts are common to both apps and define how the system behaves.

### 2.1 The shared cast & demo world
> ⚠️ **Everything in this section is illustrative *dummy / demo data*** baked into the prototypes — the academy, coaches, batches, fees, ratings, capacities, the student, and the OTPs are all fabricated to make the flows concrete and keep the two apps consistent. None of it is real or production seed data.
- **Featured academy:** **The Rhythm House** — a music academy in **Hauz Khas, Delhi-NCR** · ★ 4.9 · 84 reviews · Verified.
- **Coaches:** Arjun Sharma (Guitar · Ukulele), Meera Nair (Vocals · Theory), Rohan Das (Keys · Piano).
- **Batches / programs:**

  | Program | Coach | Schedule | Mode | Trial | Monthly | Capacity |
  |---|---|---|---|---|---|---|
  | Guitar — Beginner | Arjun Sharma | Mon·Wed·Fri 5:00–6:30 PM | **In-studio** | ₹150 | ₹3,200/mo | 12/15 → 3 trial spots |
  | Vocals — All Levels | Meera Nair | Tue·Thu 6:30–8:00 PM | **Online** | ₹200 | ₹3,800/mo | 8/12 → 4 trial spots |
  | Keys & Piano | Rohan Das | Mon·Fri 7:00–8:00 PM | **In-studio** | ₹250 | ₹4,200/mo | 6/10 → 4 trial spots |

- **Other academies (marketplace, student app only):** Step Up Dance Studio (Saket), Clay & Kiln Pottery (Lajpat Nagar), Prana Yoga (Green Park).
- **Student user:** Varun Mehta · Delhi-NCR. **Sample trial OTPs:** `4 9 2 7` (Guitar — in-studio trial) · `8 2 6 0` (Vocals — online trial).

### 2.2 Attendance model — three modes, by booking type
This is the backbone shared by both apps:

| Booking type | Mode | How attendance is taken | Student side | Academy side |
|---|---|---|---|---|
| **Trial** | any | **OTP** — student shows a 4-digit code; academy verifies | "Attendance code" on booking detail | *Verify attendance* (enter code) |
| **Regular class** | In-studio | **QR** — academy displays a per-session QR; student scans on arrival | *Scan to check in* (camera) | *Show check-in QR* (live scanned roster) |
| **Regular class** | Online | **Auto-on-join** — joining the live room marks present | *Join live class* | *Start live class* (live joined roster) |

### 2.3 Online vs in-studio
- **Set per batch** (In-studio / Online toggle in batch edit). **Trials inherit their batch's mode** (online batch → online trial).
- **Online = Findemy-hosted video room** ("link active 10 min before"). No external Zoom/Meet link to share. Student taps **Join live class**; academy taps **Start live class**.

### 2.4 Trial spots = capacity − enrolled (automatic)
- Trial seats open **automatically** as capacity frees up — e.g., 15 cap − 12 enrolled = **3 trial spots**. **No separate "availability publishing"** UI; the academy just sets capacity.

### 2.5 Plans, billing & lifecycle
- **Plans:** Monthly · **Quarterly** (*Popular*) · **Annual** (*Best value*). **Auto-renews each cycle.**
- **Academy-set fees & discounts:** the academy enters the **monthly fee** and the **quarterly / annual discount %** when it creates a batch (§4.5). **Discount is capped at 30%** — the app rejects any value above that. *(Demo academy uses 10% quarterly / 20% annual.)*
- **Manage anytime:** Renew / change plan · Pause · Transfer batch · Discontinue.
- **Cancel-a-class rule:** an academy-cancelled session is **unbilled** and **made good** — the plan gets **+1 session appended** so the cycle still delivers its **full entitled count** (e.g., an 8-class month stays **8**, not 9). It restores the count; it is **not a bonus class**.
- **Attendance tiers:** **Active / Irregular / Inactive** (drive the roster filters & student health).

### 2.6 Payments & money
- **Razorpay** checkout (UPI / Cards / Netbanking) for trials, enrolments, workshops, events.
- **Business model:** commission on trial bookings & enrolments now; academy listing / premium listing / student discount passes later.

### 2.7 Design system (shared kit)
- **Type:** Instrument Serif (display) + Inter. **Palette:** persimmon (primary) + jade / gold / rose accents on warm paper.
- Rounded cards, floating pill nav, real Unsplash imagery (bundled offline), Delhi-NCR place names. Accessibility: focus rings, reduced-motion, 44px targets, ARIA, tabular figures.

---

## 3. Student app — full feature catalog

**Bottom nav (4 tabs):** Discover · Events · **Classes** · Profile.

### 3.1 Onboarding & auth
*Screens: Welcome, Sign up, Phone login, OTP (login), OTP (signup), Onboarding, Interests.*
- Splash/welcome ("Discover your Art"); **phone + OTP** sign up / log in; social sign-in (demo).
- **Onboarding** (basic learner profile) → **pick interests** (category chips) to personalise discovery.

### 3.2 Discover (tab)
*Screen: Discover.*
- **Search** ("Find a mentor or studio…").
- **Location selector** (sheet) — set area / "Use my current location · GPS".
- **Filters** (sheet) — minimum rating, distance.
- **Category pills:** All · Music · Dance · Arts · Yoga. *(Fitness is in the platform's category scope but is not a pill in the prototype.)*
- **Top rated** carousel ("Highest rated this week") → studio cards.
- **Near you** list — academy cards with "Trial from ₹X".
- Tap a card → **Academy detail**.

### 3.3 Academy & programs
*Screens: Academy detail, Offerings, Program detail.*
- **Academy detail:** cover, category, name, location + distance, rating, review count, batch count; **Save** (heart) & **Share**; **About**; **Programs / Workshops** segmented tabs; program rows (coach · schedule · trial + monthly fee, **Online** tag where applicable); **reviews preview**; **coaches**; *Explore our offerings*.
- **Offerings:** the academy's full list — Programs + Workshops tabs.
- **Program detail:** cover, academy, program name; **Coach · Schedule · Mode (in-studio/online) · Fees (trial + monthly)**; **batch selector** (Evening / Morning, with "seats left"); about + cancellation policy; **Book a Trial** / **Enroll Now**.

### 3.4 Trial booking (paid, OTP attendance)
*Screens: Booking slot (1/3) → Booking pay (2/3) → Booking confirm (3/3).*
- Pick a **slot** → **pay** (Razorpay, price breakdown) → **confirmation** with a 4-digit **attendance OTP** code; *Go to My Classes*.
- **Reschedule / cancellation policy:** a trial can be **rescheduled only once**. Cancelling **4h or more before** the slot is **refundable**; cancelling **within 4h** of the slot (or a no-show) is **non-refundable**.

### 3.5 Enrollment (recurring batch)
*Screens: Enroll select → Enroll pay → Enroll confirm.*
- **Batch is chosen once on the program screen.** The **Enrol screen shows the selected batch read-only** ("Your batch" summary + a **Change** link back) — then **choose a plan** (Monthly/Quarterly/Annual with save % and Popular/Best-value flags) → **Proceed to payment** → **confirmation**; *View my classes*.
- **Auto-renew**, with the full manage lifecycle (§3.7).

### 3.6 My Classes (tab) — your enrolled batches
*Screen: Classes (the 4th tab).*
This tab shows **enrolled batches only — no trials.** (Trials live under **Profile → My Bookings / My Trials**, §3.10.) Its content **adapts to how many batches the learner has**:
1. **Multiple active batches →** each batch shows as a **batch card** (tap → class detail), as in the prototype.
2. **Exactly one active batch →** that single batch's information is shown **directly on the screen** (no card list).
3. **No active batch, but past batches exist →** show "**You are not in any active batch**", then a **Past batches** section with cards of the ended / discontinued batches.
4. **Brand-new user (no active *and* no past batches) →** the **Classes tab is hidden entirely**. It only appears once the learner has **at least one active or past batch**.
- The full enrolment history also remains in **Profile → Past classes** (§3.10).

### 3.7 Class detail & in-class actions
*Screens: Class detail, Check-in scanner.*
- **Class detail:** status (active / on-hold), mode (online / in-studio); plan & billing; **Manage class** — Renew/change plan, Pause, Transfer batch, Discontinue; support; T&Cs.
  - **Online + active →** *Join live class* (Findemy room).
  - **In-studio + active →** *Scan to check in* + *Get directions*.
- **Check-in scanner:** camera viewfinder to **scan the academy's session QR** → "marked present" (in-studio regular classes).

### 3.8 Workshops
*Screens: Workshop detail → Workshop pay → Workshop confirm.*
- Discover (via academy/offerings/events) and **register + pay** for academy-hosted workshops. A workshop is either **Online** or **Offline**.
- **Workshops are non-refundable** — once registered, the fee is not returned (no cancellation refund).

### 3.9 Events (tab)
*Screens: Events tab, Event detail → Event pay → Event confirm.*
- **Events tab:** filter pills (All · Competitions · Workshops · Meetups); **spotlight** card + event rows; free & paid events.
- **Event detail → pay → confirm** (register for an event).
- *Scope note:* the Events **module** is MVP; large Findemy-organised championships are a future ambition.

### 3.10 Profile, bookings & account
*Screens: Profile (tab), My Bookings, Booking detail, Past classes, Saved/Wishlist, Edit profile, General info, Post-trial review, Post-trial decision. (Legacy: My Trials.)*
- **Profile (tab):** user card (name, email, phone, city); notifications nudge; **quick grid** — Past classes · Your Bookings · Wishlist; **Your information** menu — Past classes, Your Bookings, Wishlist, Profile details, General info, Refunds; **Log out**.
- **My Bookings:** Upcoming / Past — trials, online classes, workshops, events.
- **Booking detail:** trial/online; **attendance OTP code**; manage (reschedule, **cancel trial**); order details; support; (online → *Join now*).
- **Past classes:** ended / discontinued enrolments (history; read-only).
- **Saved / Wishlist:** saved academies.
- **Post-trial review:** after a trial, star rating + quick-pick chips + note → **decision** (enrol / try more / pass).
- **Enrolled-student review:** students who are (or were) enrolled in a batch can also **rate & review the academy** — same star rating + chips + note (no trial "decision" step).
- **Review eligibility:** a person can post a review of an academy **only if they have, or have had, a trial or an enrolment there** (active or past). Someone who has never had a trial or enrolment cannot review it.
- **Edit profile / General info.**

**Student sheets:** Filters, Location, Renew, Pause, Transfer, Discontinue, Cancel trial, Terms.

---

## 4. Academy app — full feature catalog

**Bottom nav (4 tabs):** Dashboard (Home/Inbox) · Schedule · Students · **Studio** (hub/profile). Palette is **persimmon-primary** (jade is a secondary accent only).

### 4.1 Onboarding & auth
*Screens: Welcome, Login, Sign up, OTP, Onboarding.*
- Welcome ("Get discovered by learners nearby. Manage trials, batches, attendance & enrolments — all in one place.").
- **OTP-only sign in** ("one login per academy").
- **Onboarding:** academy name, location/area, tagline, **Modes offered** (In-studio / Online / Home visit).

### 4.2 Dashboard (Home / Inbox)
*Screen: Inbox.*
- **Today summary** (dark card): classes active today, **new trials**, total students, **today's earnings (₹)**.
- **New trial bookings** — auto-confirmed, tap → trial detail.
- **Recent activity** feed.

### 4.3 Schedule (tab)
*Screen: Schedule.*
- **Week strip**; **today's classes** with states — **Now / Upcoming / Cancelled** and an **Online** indicator on online batches; tap → batch detail.
- **Trials today** — tap a trial → an option to **accept the OTP the student shows**, verifying & marking them present (or mark no-show). See §4.6.
- **Cancel a class** (sheet) — a cancelled class is **unbilled** and **made good**: **+1 session is appended** so the entitled count is preserved (8 stays 8, not a bonus).
- *(Trial-availability publishing was removed — trial spots are automatic, see §2.4.)*

### 4.4 Students / roster
*Screens: Students, Student detail.*
- **Search**; **attendance filter pills** (All · Active · Irregular · Inactive — attendance-only, the quick filter).
- **Filters sheet** — combinable **Batch** (Guitar — Beginner / Vocals — All Levels / Keys & Piano) **+ Attendance** (Active ≥75% / Irregular 50–74% / Inactive <50%).
- **Student rows:** avatar, batch, **attendance %**, **tier badge**.
- **Student detail:** name, since, batch, coach, plan, attendance %, tier; message (demo); view batch.

### 4.5 Batches
*Screens: Batches list, Batch detail. Sheet: New batch.*
- **Batches list:** each row shows coach · days · **enrolled/capacity**, with an **Online** badge for online batches.
- **New batch (sheet):** name, category, coach, **capacity (stepper)**, schedule days, **mode**, **monthly fee**, and the **quarterly / annual discount %** (**capped at 30%** — higher values are blocked) — with a note that **trial spots open automatically (capacity − enrolled)**.
- **Batch detail** (mode-aware):
  - **Header:** active badge, **Online** badge (online batches), coach · days · time · mode; **enrolled/capacity + "N trial spots open"** + auto-spots explainer.
  - **Attendance tab** — **In-studio →** *Show check-in QR* card + "9 of 12 checked in" + **scanned/not-yet roster**. **Online →** *Start live class* card + "7 of 8 joined" + **joined/not-joined roster** (auto-on-join).
  - **Roster tab** — students in the batch.
  - **Edit tab** — days, start/end time, **mode (In-studio / Online)** + Findemy-room note for online; **Pause batch**.

### 4.6 Attendance & live class
*Screens: Trial detail, Attendance OTP, Attendance QR, Live class.*
- **Trial detail:** student, coach, **mode**, payment; notice differs by mode; **Mark attendance →** (OTP). Online trials add **Start live class** (verify OTP in the session).
- **Attendance OTP:** enter the student's 4-digit code → *Verify & mark present* / *Couldn't verify · mark no-show*.
- **Attendance QR:** full-screen **per-session QR** + live "checked in" count + instructions (in-studio regular classes).
- **Live class (host room):** red ● **Live** pill, Findemy room, faux video stage, **joined roster** (auto-present), **End class** (online regular classes & online trials).

### 4.7 Coaches
*Screens: Coaches list, Coach detail. Sheets: Add coach, Assign coach.*
- List of coaches (specialty · batch count); **coach detail** (assigned batch); **add coach**; **assign coach to batch**.

### 4.8 Reviews
*Screens: Reviews, Respond.*
- **Rating summary** (4.9 · breakdown), **review list**, **Needs-reply** filter; **respond** to reviews (with a "calm, specific reply" nudge).
- Reviews come from **both** trial-takers and **enrolled students** (current or past) — see §3.10 eligibility.

### 4.9 Workshops (hosted by the academy)
*Screens: Workshops, Workshop create/edit.*
- **Workshops** — Upcoming / Live / Past tabs; cards with fee, spots/registered.
- **Create / edit workshop** — title, **type (Online / Offline)**, date, time, fee, capacity, about; Save draft / Publish.
- **Non-refundable** for the learner once registered (§3.8).

### 4.10 Earnings
*Screen: Earnings.*
- **Payouts & transactions** — earnings overview and transaction history (₹).

### 4.11 Studio (hub / profile tab)
*Screens: Studio, Edit profile, Settings.*
- **Profile hero** — cover banner, **Verified** badge, academy name, rating, location, **Edit**.
- **Quick stats** — Students · Batches · Earned (₹62.4k).
- **Manage** menu — Academy profile, Earnings & payouts, Reviews, Workshops, Coaches, Batches.
- **Account** menu — Notifications & settings, **Verification / KYC** (Verified), Login phone, **Team access** (Coming in v2).
- **Sign out**; version.
- **Edit profile** — cover (Change cover) + a **media gallery of up to 10 photos/videos** (max enforced), academy name, tagline, about, address, specialities, **payout/bank details (account · IFSC · holder)**.
- **Settings** — notifications (incl. attendance reminder) & preferences.

**Academy sheets:** New batch, Add coach, Assign coach, Cancel class, Filters.

---

## 5. Cross-app mirrored flows

The two apps are kept **in sync** — each shared interaction has a student side and an academy side:

| Interaction | Student app | Academy app |
|---|---|---|
| **Book a trial** | Program → Book a Trial → slot → pay → OTP code | Trial appears as a **new (auto-confirmed) trial** on Dashboard/Schedule |
| **Trial attendance** | Show **OTP code** (booking detail) | **Verify OTP** → mark present / no-show |
| **Enrol** | Program → Enroll → batch (read-only) + plan → pay | Enrolment reflected in batch **enrolled/capacity** + trial-spots recompute |
| **In-studio class attendance** | **Scan to check in** (camera) | **Show check-in QR** + live scanned roster |
| **Online class attendance** | **Join live class** (Findemy room) | **Start live class** + live joined roster (auto-present) |
| **Cancel a class** | Notified; the session is **made good** — +1 appended so the entitled count is preserved (8 stays 8) *(applied backend-side, shown in the academy app; explicit student-side display planned, not yet in the prototype)* | **Cancel a class** → unbilled + one make-good session (count preserved) |
| **Reviews** | Review after a **trial** *or* as an **enrolled student** (rating + chips + note); eligible only with a past/active trial or enrolment | **Reviews** + **respond** |
| **Workshops** | Register + pay | Create / edit / publish; track registrations |

**Consistency anchors:** identity (★4.9 · 84 · Hauz Khas), Guitar — Beginner (₹3,200/mo · Mon·Wed·Fri 5–6:30 · in-studio · trial ₹150 · OTP 4927), Vocals — All Levels (online · ₹3,800/mo · trial ₹200), Keys & Piano (Mon·Fri 7–8 PM · ₹4,200/mo · trial ₹250). Guitar = in-studio (QR ↔ scan) and Vocals = online (start ↔ join live) on **both** sides.

---

## 6. MVP scope & business model

### 6.1 In scope (MVP)
Onboarding & auth · discovery & search · academy profiles (courses, batches, fees, timings, mode, a **media gallery of up to 10 photos/videos**, mentor info, reviews) · **paid trials + payments** · **enrollment** (recurring batches, renew/pause/transfer/discontinue) · **workshops** · **events module** · reviews · profile & bookings · the full **academy/admin app** (profile/batch setup, trials, attendance, enrolment management, reviews).

### 6.2 Out of scope (future phases)
Reels & creator ecosystem · leaderboards · Findemy-led competitions/championships · recognition/rewards programs · multi-city. (Single city — **Delhi-NCR** — first.)

### 6.3 Removed from MVP
**Compare** (no side-by-side comparison) — replaced by **transparency** (standardised, upfront info on each academy profile).

### 6.4 Business model
- **Now:** commission on trial bookings & enrolments.
- **Later:** academy listing fees, premium/featured listings, student discount passes (membership).
- **Open (team TBD):** commission %, who bears gateway fees, enrolment refund terms, payout terms. *(Now decided: trials = refundable ≥4h before / reschedule once — §3.4; workshops = non-refundable — §3.8.)*

---

## 7. Appendix — complete screen & sheet inventory

### 7.1 Student app — 38 screens

| Area | Screens |
|---|---|
| Auth & onboarding | Welcome, Sign up, Phone login, OTP (login), OTP (signup), Onboarding, Interests |
| Tabs | Discover, Events, **Classes (My Classes)**, Profile |
| Discovery | Academy detail, Offerings, Program detail |
| Trial booking | Booking slot (1/3), Booking pay (2/3), Booking confirm (3/3) |
| Enrollment | Enroll select, Enroll pay, Enroll confirm, Enrollment manage |
| Classes | Class detail, Check-in scanner, Past classes |
| Workshops | Workshop detail, Workshop pay, Workshop confirm |
| Events | Event detail, Event pay, Event confirm |
| Bookings & reviews | My Bookings, Booking detail, My Trials *(legacy)*, Post-trial review, Post-trial decision |
| Profile & account | Saved/Wishlist, Edit profile, General info |

**Student sheets (8):** Filters, Location, Renew, Pause, Transfer, Discontinue, Cancel trial, Terms.

### 7.2 Academy app — 25 screens

| Area | Screens |
|---|---|
| Auth & onboarding | Welcome, Login, Sign up, OTP, Onboarding |
| Tabs | Dashboard (Home/Inbox), Schedule, Students, **Studio (hub)** |
| Students | Student detail |
| Trials & attendance | Trial detail, Attendance OTP, Attendance QR, Live class |
| Batches | Batches list, Batch detail |
| Coaches | Coaches list, Coach detail |
| Reviews | Reviews, Respond |
| Workshops | Workshops, Workshop create/edit |
| Money & profile | Earnings, Edit profile, Settings |

**Academy sheets (5):** New batch, Add coach, Assign coach, Cancel class, Filters.

---

## 8. Known gaps & notes

- **Workshops not fully mirrored** — the academy hosts *Songwriting 101* + *Open-Mic Masterclass*, but the student app doesn't yet surface The Rhythm House's workshops in discovery (student workshops are currently from other academies). *(Follow-up.)*
- **Program-detail "Batch" options** in the student app (Evening/Morning + "seats left") are static, not data-bound per program — so they don't yet reflect the actual batch for non-Guitar programs or the capacity−enrolled trial-spots. *(Structural follow-up.)*
- **Academy media gallery** — product allows **up to 10 media (photos/videos)** on the academy profile (§6.1/§4.11), but the prototype's Academy-profile editor only has a single **cover** image; the multi-media gallery isn't built yet. *(To build.)*
- **New-batch sheet missing fee & discount fields** — per §2.5/§4.5 the academy should enter **monthly fee** + **quarterly/annual discount % (≤30%)** (and mode) when creating a batch, but the prototype's New batch sheet only has name/category/coach/start-time/capacity/days. *(To build.)*
- **Workshop type wording** — the prototype's Workshop create/edit lists type as *Masterclass / Demo / In-studio / Online*; per product (§3.8/§4.9) the only types are **Online / Offline** (Masterclass/Demo are not types). *(Copy/field fix.)*
- **Trial cancel copy** — the prototype's Cancel-trial sheet still says "Free cancellation up to 12h before"; the actual policy is **refundable ≥4h before / non-refundable within 4h / reschedule once** (§3.4). *(Copy fix.)*
- **Enrolled-student review entry** — the prototype only lets a learner review **after a completed trial** (via the post-trial flow / booking detail). The **enrolled-student** review entry point and the **eligibility gate** (must have a past/active trial or enrolment — §3.10) aren't built yet. *(To build.)*
- **My Classes adaptive states** — the prototype still shows the old two-section (Trials + Enrolled) layout with a static "No classes yet" empty state; the new tab is **enrolled batches only (trials moved out to Profile → Bookings)** with the **single / multiple / past-only / hidden-for-new-user** behavior (§3.6) — not yet implemented. *(Behavioral follow-up.)*
- **Review count not canonical** — the academy identity shows **84 reviews** but the academy **Reviews screen shows 32**; the backend should expose one canonical count (see [`backend.md`](./backend.md) F5). *(Data follow-up.)*
- **`screen-trials` (student)** — trials live under **My Bookings / My Trials** (Profile), **not** the Classes tab; the standalone `screen-trials` is left in place but unreferenced.
- **Seed/mock data → Delhi-NCR:** product copy is Delhi-NCR; engineering seed data may still reference Bengaluru — reconcile before launch.
- **`compare` screen** in `student-app` (code) — to be removed/repurposed (Compare is out of the MVP).
- Deeper UI-fidelity/bug audits: [`../audits/`](../audits/); launch prerequisites: [`../specs/pre-launch-checklist.md`](../specs/pre-launch-checklist.md); canonical product docs: [`../app-ideation/`](../app-ideation/).
