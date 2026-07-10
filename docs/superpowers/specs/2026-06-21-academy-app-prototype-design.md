# Findemy academy-app prototype — design (flow-faithful, in sync with student app)

**Date:** 2026-06-21
**File (to build):** `ai-usage/prototypes/Findemy Academy App.html` (single, self-contained)
**Companion to:** `ai-usage/prototypes/Findemy Student App.html`
**Supersedes planning note in:** `ai-usage/CLAUDE.md` §7 ("build the admin/studio prototype")

## Goal

Build the **academy (admin) app prototype** so it is the other half of the same marketplace as the
existing student prototype — **flow-faithful to `apps/admin`** (Expo Router), with **identical
component styling**, **shared mock cast/academies**, and **mirrored flows**. A demo should let you
hop between the two files and see the same trial, the same OTP, the same student, the same fees on
both sides.

## Decisions (from the user, this session)

- **Source of truth:** flow-faithful to `apps/admin` (mirror the real screens/flows), styled to the
  ui-refs + student prototype. (Not a ui-ref-only showcase; not a free reimagining.)
- **"In sync" means three things:** (1) **identical component styling** — reuse the student file's
  exact tokens/components/router verbatim; (2) **shared mock cast & academies** — same names, fees,
  locations, OTP across both files; (3) **mirror every student flow** — each student action has its
  academy-side counterpart. **No** cross-launch/role-switch link (declined).
- **Schedule — cancel, not reschedule:** the reschedule option is **removed**. The only action is
  **Cancel class**. A cancelled class is **not counted as a paid session**; instead the
  batch/enrolment **auto-extends by one session** (one extra class appended) so the learner is made
  whole. This **overrides** the current `apps/admin` code (which still has `useRescheduleSlot` + a
  RescheduleModal) — the product update wins.
- **Attendance tiers wording:** **Active ≥75% / Irregular 50–74% / Inactive <50%** (no "at-risk").
- **Events have no academy side, by design:** MVP events are Findemy-curated; academies host
  **workshops**, not events. The admin shows a small *"Events are curated by Findemy"* info row in
  the Studio hub rather than an events module.
- Output: single self-contained `Findemy Academy App.html`, reusing `prototypes/assets/img/`.

## Shared design system (lifted verbatim from the student source)

Extracted from the student file's `__bundler/template` block (clean authored source):

- **Fonts:** `--serif: 'Libre Caslon Display'` (display), `--serif-i: 'Libre Caslon Text'` italic,
  `--sans: 'Plus Jakarta Sans'` (body). *(Docs previously said Instrument Serif / Inter — outdated.)*
- **Palette:** `--paper #FFFFFF`, `--ink #1A1611`, `--muted #6E655A`, `--hairline #E8E1D2`,
  `--persimmon #EC5A2B` (primary), `--persimmon-deep #D24A20`, `--jade #1E6F66`, `--gold #C8862A`,
  `--rose #C0392B` (+ their `-soft` tints). Identical to `apps/admin` `theme.ts`.
- **Category colors** (from admin code): music plum `#5C2A4A`, dance teal `#1E5C5A`,
  yoga olive `#8A8A33`, arts persimmon `#D8492A`.
- **Engine reused verbatim:** stack-router (`go`/`back`/`tab`/`reset`, slide/fade transitions),
  4-tab floating pill nav that hides on pushed screens, `data-set`→`data-bind` templating, shared
  bottom-sheet host, toast (`aria-live`), accessibility (`:focus-visible`, reduced-motion, 44px
  targets, ARIA, tabular figures).

## Navigation model

Same minimal JS stack-router as the student app. Bottom nav has **4 tabs: Home / Schedule /
Students / Studio** (the Studio tab also stays highlighted on its push-only sub-pages: workshops,
settings, earnings, reviews, profile, coaches — matching `apps/admin/app/(tabs)/_layout.tsx`).

## Screen inventory (~30 screens + ~7 sheets) and the student flow each mirrors

| Group | Admin screens | Mirrors |
|---|---|---|
| **Auth (5)** | welcome · login · signup · verify-otp · onboarding | student auth |
| **Home / Inbox** | dashboard: today's classes · **new-trial cards** · recent-activity feed · earnings-mini · bell | ← student **books trial** |
| **Schedule** | week strip · day's batches/trials · **cancel-class sheet** · publish availability | ← student trial slots / classes |
| **Students** | roster (search · attendance-tier + category filters) · **student detail** | ← student **enrolls** |
| **Studio (hub)** | dark menu → profile · earnings · reviews · workshops · settings · coaches · *"Events curated by Findemy"* info row | ← student views academy |
| **Trials** | trial detail (note · mode · distance · CONFIRMED) → **attendance-OTP verify** | ← student **booking + OTP** |
| **Batches** | list · new (sheet) · detail (Today / Roster / attendance, 3-state) · edit · students | ← student classes/enrolment |
| **Coaches** | list · add (sheet) · assign (sheet) · detail | academy-only |
| **Reviews** | list (summary · needs-reply) · **respond** (tone chips) | ← student **post-trial review** |
| **Workshops** | list (Upcoming / Live / Past) · create/edit (draft + publish) | ← student **workshop** register |
| **Earnings · Profile edit · Settings** | period earnings · cover/specialities edit · granular notif toggles | ← academy info students see |

**Intended gap:** student **Events** → no academy module (only the Studio info row).

## Shared mock cast & academies (the bridge — lifted from the student file)

**Admin user = "The Rhythm House"** · Music · Hauz Khas · ★4.9 · 84 reviews ·
*"A warm, gear-rich space for guitar, keys & vocals — beginners welcome."*

- **Coaches:** Arjun Sharma (Guitar) · Meera Nair (Vocals) · Rohan Das (Keys & Piano)
- **Batches (fees match student side):**
  - Guitar — Beginner · Arjun · trial ₹150 · ₹3,200/mo · Mon·Wed·Fri 5:00–6:30 PM
  - Vocals — All Levels · Meera · trial ₹200 · ₹3,800/mo
  - Keys & Piano · Rohan · trial ₹250 · ₹4,200/mo
- **Learners carried across both apps:**
  - Student-app user → **Guitar Trial (OTP 4927)** + Keys & Piano Trial → Inbox new-trial cards,
    Schedule, **Attendance-OTP (4927 matches both files)**.
  - **Ananya R.** → enrolled Guitar w/ Arjun, ★★★★★ *"Arjun is incredibly patient…"* → roster + Reviews.
  - **Karan M.** → trial → ★★★★★ *"the trial sold me instantly"* → Reviews.
  - + 3–4 more roster names for density; **one 3★ needs-reply review** to demo Respond.
- **Earnings** derive from those same captures (₹150/₹200/₹250 trials, ₹3,200/mo enrolment…) so the
  numbers tie out with student payments.
- **Two additions (no student-side source, flagged):** 1–2 Rhythm-House-owned **music workshops**
  ("Songwriting 101", "Open-Mic Masterclass") for owned Workshops content; one **cancelled Guitar
  session → "+1 session added"** to demo the cancel rule (reflected in Ananya's plan end date).

## Admin-specific components (new CSS on top of the reused kit)

All compose the shared tokens/cards/pills/sticky-bar/sheet-host/toast; the genuinely new pieces
(all visible in the ui-refs):

1. **Dark summary card** — Studio Dashboard "3 Active Today" + earnings-mini (dark `--ink` bg, serif
   numeral, persimmon calendar chip).
2. **Schedule week-strip + day rows** — category color-dots, time-rail, status pills
   (Now / Done / **Cancelled**).
3. **3-state attendance** — present / absent / pending + summary pills + "Save attendance · N of N
   marked" sticky bar.
4. **Roster rows** — avatar + attendance-tier badge (**Active ≥75% / Irregular 50–74% / Inactive <50%**).
5. **Reviews summary card** — big rating + 5-star + breakdown bars + "Needs reply · N" tab; flagged
   card → "Respond now" CTA + tone chips on respond.
6. **Cancel-class sheet** — confirm + *"Not billed · 1 session added to the plan."*
7. **Sheets** — New Batch (day-toggle row, capacity stepper, category select), Add Coach (specialties
   chips, Register Coach), Assign Coach (jade picker rows).
8. **Earnings** — period selector (Week/Month/Year), delta, category breakdown, signed transactions,
   payout card.

## Build approach

Lift the shared layer (`:root` tokens, `@font-face`, component CSS, router JS, sheet host) out of
the student source verbatim into the new file, then build the academy screens on top. Single
self-contained HTML, no build/deps; open directly or via `python3 -m http.server` from `prototypes/`.
Reuse existing `prototypes/assets/img/` (coach/academy/cover photos already present).

## Cross-app consistency to keep true

- OTP **4927**, all fees, coach names, locality (Hauz Khas), and academy name **identical** in both files.
- The **cancel → +1 session** rule should later be reflected in the student file's "My Classes"
  (cancelled session + "+1 session added") so the two stay in sync. *(Student-file follow-up, noted.)*

## Verification (done — 2026-06-21)

Built as `ai-usage/prototypes/Findemy Academy App.html` (129 KB, self-contained). Static validation
(no live browser in env, same constraint as the student prototype):
- **24 screens + 5 sheets**; **0 broken** `data-go` / `data-tab` / `data-sheet` refs.
- All **8 referenced images present** in `prototypes/assets/img/`.
- Balanced tags (section/main/nav/button/div all matched); both `<script>` blocks pass `node --check`.
- All `data-set` JSON blocks parse.

Shared kit (CSS `:root` tokens, components, stack-router) lifted verbatim from the student file's
`__bundler/template`; fonts loaded via Google Fonts (Libre Caslon Display / Libre Caslon Text /
Plus Jakarta Sans); 4-tab nav (Home / Schedule / Students / Studio). Render not screenshot-verified
(no browser available), consistent with the student prototype's verification.

### Built screen inventory (24 + 5)
Auth: welcome · login · signup · otp · onboarding. Tabs: inbox · schedule · students · studio.
Sub: publish · student · trial · attendance-otp · batches · batch · coaches · coach · reviews ·
respond · workshops · workshop-edit · earnings · edit-profile · settings.
Sheets: cancel-class · new-batch · add-coach · assign-coach · filters.

## Out of scope / explicitly not built

- Events management module (curated by Findemy; only the Studio info row).
- Reschedule (replaced by cancel + extend).
- Real payments / real OTP / real backend (all simulated, as in the student prototype).
- Trial accept/decline lifecycle (trials stay auto-confirmed, per the 2026-06-06 admin spec).
