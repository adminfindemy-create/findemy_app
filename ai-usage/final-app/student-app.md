# Findemy — Student App Component Breakdown

> **What this is.** Every feature from [`master-feature-document.md`](./master-feature-document.md) decomposed into its **Student app** component. Companion files: [`backend.md`](./backend.md) and [`academy-app.md`](./academy-app.md).
>
> **Feature numbers (F1…F23) are shared across all three files**, so a feature's student, academy, and backend components line up. Where the student app has no role, it says *n/a*.
>
> **Surface:** mobile app (Expo / React Native), **4 tabs — Discover · Events · Classes · Profile**. 38 screens + 8 sheets (see master doc §7.1). Persimmon-primary kit, Instrument Serif + Inter, real Unsplash imagery, Delhi-NCR copy.
>
> **Audience:** learners of all ages. **Job:** discover → try → enrol → manage classes. The **trial is the conversion hinge**.

---

## F1 — Authentication (phone + OTP)
- **Screens:** Welcome ("Discover your Art"), Sign up, Phone login, OTP (login), OTP (signup).
- **Does:** phone-number entry → 4-digit OTP verify → into onboarding (signup) or Discover (login). Social sign-in shown as demo.

## F2 — Onboarding & profile setup
- **Screens:** Onboarding, Interests.
- **Does:** capture a basic learner profile, then **pick category interests** (chips) to personalise discovery.

## F3 — Discovery & search
- **Screens:** Discover (tab). **Sheets:** Location, Filters.
- **Does:** **search** ("Find a mentor or studio…"); set **location** (area or "use my current location · GPS"); **filters** (min rating, distance); **category pills** (All · Music · Dance · Arts · Yoga); **Top rated** carousel; **Near you** list with "Trial from ₹X"; tap a card → Academy detail.

## F4 — Academy profile & programs/offerings
- **Screens:** Academy detail, Offerings, Program detail.
- **Does:** view cover + **media gallery (up to 10 photos/videos)**/category/name/location+distance/rating/reviews/batch-count; **Save** (heart) + **Share**; About; **Programs / Workshops** tabs; program rows (coach · schedule · trial + monthly fee, **Online** tag); reviews preview + coaches. Program detail shows **Coach · Schedule · Mode · Fees** + **batch selector** (Evening/Morning, seats-left) + cancellation policy → **Book a Trial** / **Enroll Now**.

## F5 — Reviews & ratings
- **Screens:** Post-trial review, Post-trial decision.
- **Does:** after attending a trial, leave **star rating + quick-pick chips + note**, then a **decision** (enrol / try more / pass). **Enrolled students** (current or past batch) can also **rate & review the academy** (same rating + chips + note, no decision step). **Eligibility:** can only review an academy if they have, or have had, a **trial or enrolment** there. Reads academy ratings throughout discovery.

## F6 — Trial booking (paid, OTP attendance)
- **Screens:** Booking slot (1/3) → Booking pay (2/3) → Booking confirm (3/3).
- **Does:** pick a **slot** → **pay** (Razorpay, price breakdown) → **confirmation** showing the **4-digit attendance OTP** (e.g., `4 9 2 7`). **Reschedule once**; cancel is **refundable ≥4h before**, **non-refundable within 4h / no-show**. *Show this OTP to the academy at class* (F12).

## F7 — Enrollment (recurring batch)
- **Screens:** Enroll select, Enroll pay, Enroll confirm, Enrollment manage.
- **Does:** batch is chosen on the program screen; the Enrol screen shows the **selected batch read-only** ("Your batch" + **Change**), then **choose a plan** (Monthly / Quarterly *Popular* / Annual *Best value*, showing the academy-set quarterly/annual **discount %**) → **pay** → confirmation → *View my classes*.

## F8 — Plans, billing & subscription lifecycle
- **Screens:** Class detail → Manage class. **Sheets:** Renew, Pause, Transfer, Discontinue.
- **Does:** **Renew / change plan**, **Pause** (1–4 wks), **Transfer batch**, **Discontinue**. Sees auto-renew + next-renewal date. When the academy cancels a session, it's **made good** — one session is appended so the plan still delivers its **full entitled count** (8 stays 8, not a bonus) (F11). *Applied backend-side and shown in the academy app today; surfacing it in the student app is planned, not yet in the prototype.*

## F9 — Payments & commission
- **Screens:** the pay step inside each flow (Booking pay, Enroll pay, Workshop pay, Event pay).
- **Does:** **Razorpay** checkout (UPI / cards / netbanking) with a price breakdown; success/receipt. Commission is invisible to the learner.

## F10 — Batches & capacity
- *n/a (academy-managed).* The student only sees its outputs: program **mode**, "seats left", and "Trial from ₹X".

## F11 — Scheduling & cancel-a-class
- **Screens:** My Bookings / Class detail (passive).
- **Does:** sees upcoming session times; when an academy cancels a session, the student is notified and the session is **made good** — one session appended so the entitled count is preserved (8 stays 8). *(Applied backend-side and shown in the academy app; an explicit student-side view is planned but not yet in the prototype.)*

## F12 — Attendance · Trial (OTP)
- **Screens:** Booking detail.
- **Does:** displays the **"Attendance code"** (4-digit OTP) for the upcoming trial; the student **shows it to the academy**, who verifies. For an **online trial**, the code is verified inside the live session.

## F13 — Attendance · In-studio regular (QR check-in)
- **Screens:** Class detail, **Check-in scanner**.
- **Does:** for an **in-studio + active** class, **Scan to check in** opens a camera viewfinder to **scan the academy's session QR** → "marked present". (Also offers *Get directions*.)

## F14 — Attendance & hosting · Online regular (auto-on-join)
- **Screens:** Class detail.
- **Does:** for an **online + active** class, **Join live class** opens the Findemy room; **joining marks attendance automatically** (no scan). Link active 10 min before.

## F15 — Student classes & class management
- **Screens:** Classes (tab), Class detail.
- **Does — adaptive Classes tab (enrolled batches only — no trials):** **multiple active batches →** batch cards; **one active batch →** that batch shown directly; **no active but past batches →** "You are not in any active batch" + **Past batches** cards; **brand-new user (no active *and* no past batch) →** the **tab is hidden** (it appears only once there's ≥1 active or past batch). **Trials are not shown here** — they live under **Profile → My Bookings / My Trials** (F21).
- **Class detail:** status, mode, plan & billing, **Manage class** (F8), support, T&Cs, and the right in-class action (scan vs join).

## F16 — Students roster, tiers & health
- *n/a (academy-facing).* The learner never sees rosters or tiers.

## F17 — Coaches
- **Does (read-only):** sees coach name + specialty on academy/program screens (F4). No coach management.

## F18 — Workshops
- **Screens:** Workshop detail → Workshop pay → Workshop confirm.
- **Does:** discover (via academy / offerings / events) and **register + pay** for academy-hosted workshops (each is **Online** or **Offline**). **Non-refundable** once registered.

## F19 — Events
- **Screens:** Events (tab), Event detail → Event pay → Event confirm.
- **Does:** **Events tab** with filter pills (All · Competitions · Workshops · Meetups), **spotlight** + event rows, free & paid; register via detail → pay → confirm. *(Module is MVP; big championships are future.)*

## F20 — Earnings & payouts
- *n/a (academy-only).*

## F21 — Account, profile & settings
- **Screens:** Profile (tab), My Bookings, Booking detail, Past classes, Saved/Wishlist, Edit profile, General info. *(Legacy: My Trials.)*
- **Does:** **Profile tab** (user card, notifications nudge, quick grid: Past classes · Bookings · Wishlist; "Your information" menu; Log out). **My Bookings** (Upcoming/Past: trials, online classes, workshops, events). **Booking detail** (attendance OTP, reschedule/cancel trial, order details, support). **Past classes** (ended/discontinued, read-only). **Saved/Wishlist**. **Edit profile / General info**.

## F22 — Notifications & activity
- **Does:** receives push for booking confirmations, reminders, class cancellations, reschedules; in-app notification nudge on Profile. *(Settings live academy-side; student gets a notifications nudge.)*

## F23 — Platform foundations (cross-cutting)
- **Does (client):** the **shared design system** — Instrument Serif + Inter, persimmon/jade/gold/rose on warm paper, rounded cards, **floating pill nav** (hides on pushed screens), slide transitions, light `data-set`→`data-bind` templating, real bundled imagery. **Accessibility:** focus rings, reduced-motion, 44px targets, ARIA, tabular figures.

---

### Student-app emphases
- The whole app funnels toward **book a trial → attend → decide → enrol**, then **manage the enrolment**.
- Two demo classes anchor the in-class flows: **Guitar = in-studio (Scan to check in)**, **Vocals = online (Join live class)** — mirrored 1:1 with the academy app.
