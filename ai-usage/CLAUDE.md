# CLAUDE.md — Findemy working context (ai-usage)

> **Purpose of this file:** a context handoff so a fresh Claude session (e.g. on another laptop) can resume the product/documentation/prototype work in this `ai-usage/` folder without re-deriving everything. It captures what Findemy is, the decisions made, the current folder state, and what's left to do.
>
> **Last updated:** 2026-06-17.

---

## 1. What we're working on

**Findemy** — "Discover your Art." India's discovery + booking platform for **skill academies** (music, dance, art, yoga, fitness, etc.). Learners find local academies, see transparent info, **book a trial**, and **enrol**; academies get discovered and manage intake via a companion app.

This folder (`ai-usage/`) is the non-code workspace: product documentation, UI references, audits, specs, and HTML prototypes. The actual apps live in the repo (see §6).

The work this session has been **non-technical / product**: organising the folder, writing canonical product docs, and building an HTML UI prototype. We are **not** editing app code here.

---

## 2. Locked product decisions (source of truth)

These were decided with the user this session. The canonical write-up is in `app-ideation/` — this is the quick reference.

| Topic | Decision |
|---|---|
| **Docs audience** | Internal team alignment (founders, devs, designers). Pragmatic, detailed, honest about scope. |
| **Tagline / positioning** | "Discover your Art." — discovery + trial-first booking for skill academies. |
| **Core loop** | **discover → try → enrol** (the trial is the conversion hinge). |
| **Launch market** | **Delhi-NCR only**, single city first, expand to other metros later. (⚠️ code seed/mock data still uses Bengaluru — eng to reconcile.) |
| **MVP — IN scope** | Discovery & search, academy profiles, **paid trials + payments**, **enrollment** (recurring batches, renew/pause), **workshops**, **events**, reviews, profile; academy/admin app for intake & management. |
| **MVP — OUT (future)** | Reels & creator ecosystem, leaderboards, large brand-run national competitions/championships, multi-city. |
| **❗ Compare** | **Removed entirely from the MVP.** No side-by-side comparison window/tool. "Transparency" (standardised, upfront info on each academy profile) is the value instead. (⚠️ code has a `compare` screen to remove/repurpose.) |
| **Events nuance** | The Events *module* (browse/register) is MVP; large Findemy-*organised* national championships are a future ambition, not an MVP commitment. |
| **Business model — now** | **Commission** on trial bookings and enrolments (transaction-based; payment rails already exist). |
| **Business model — later** | Academy listing fees, premium/featured (boosted-visibility) listings, **student discount passes** (membership). |
| **Open $$ questions (TBD by team)** | Commission %, who bears gateway fees, free vs paid trials, refund/cancellation treatment, payout terms. |
| **Target learners** | All segments / all ages: adult hobby/passion learners, parents booking for kids, serious/aspiring performers, self-driven teens. |
| **Academy personas** | Independent guru / small studio; established academy / institute. |

---

## 3. Current `ai-usage/` folder structure

```
ai-usage/
  README.md              index of this whole folder
  CLAUDE.md              ← this file (context handoff)
  prompt.md              the user's original ideation instructions (kept as a note)

  app-ideation/          ★ CANONICAL product docs (the source of truth)
    README.md            index + elevator pitch + reading order
    01-overview.md       what Findemy is, tagline, current stage
    02-problem.md        student + academy pains, why now
    03-solution.md       value to each side, how it works, trial-first wedge
    04-users.md          4 learner personas + 2 academy personas + cold-start note
    05-mvp-scope.md      in/out scope, student & academy journeys, known gaps
    06-business-model.md commission now; listings/premium/passes later; open questions
    07-differentiation.md vs Google/JustDial/UrbanPro/IG; moat; honest risks
    08-roadmap.md        Phase 0 MVP → Phase 1 monetise/expand → Phase 2 community
    glossary.md          shared vocabulary

  prototypes/
    Findemy Student App.html   ★ student-app prototype (flattened single-file export; see §5)
    Findemy Academy App.html   ★ academy/admin prototype (built 2026-06-21; see §7) — in sync w/ student
    assets/img/                bundled Unsplash photos shared by both prototypes

  ui-refs/               13 WhatsApp screenshots = the refined UI redesign references
                         (student: Discover/Explore/Events; admin: Dashboard/Batches/sheets)

  audits/                point-in-time app reviews (all 2026-05-17)
    audit-student.md, audit-admin.md, student_enhancement.md, ui-deep-comparison.md

  specs/                 forward-looking / operational
    improvements_Stu.md, pre-launch-checklist.md

  assets/                mockups + design references
    student.html, admin.html (old full HTML mockups),
    academy-cta-prototype.html, program-cards-prototype.html,
    app-banner.jpeg (ideation infographic), findemy-app-idea.png, splash_screen.jpeg,
    current_Stu_app/ (img1–img7 screenshots of the current student app)

  _archive/
    vision.md            original product vision — SUPERSEDED by app-ideation/, kept for reference
```

---

## 4. What was done this session (chronological)

1. **Organised the folder** — grouped loose files into `product/` (later `app-ideation/`), `audits/`, `specs/`, `assets/`. Fixed asset path references in docs.
2. **Wrote the canonical product docs** in `app-ideation/` via a brainstorming Q&A (decisions in §2). Archived the old `vision.md` to `_archive/`.
3. **Removed "Compare"** from all docs after the user clarified there's no side-by-side comparison feature; reframed around "transparency."
4. **Built the student HTML prototype** (`prototypes/student-app.html`) from the `ui-refs/` redesign screenshots — student app only, separate-file structure.
5. **Wrote this `CLAUDE.md`** as a cross-machine context handoff.

### 4.1 How the work started (the user's brief)

The user dropped an ideation brief (`prompt.md`) and the `assets/app-banner.jpeg` infographic, asking me to: understand the app's purpose, target audience, and how it solves the problem; treat **reels & leaderboard as future, not MVP**; and produce **non-technical, business/user-focused documentation** (ideation + problem-solving + business/user context). Explicit instruction: **"ask me questions if you have them instead of making assumptions."**

### 4.2 Clarifying-question trail (the questions asked → the user's answers)

The docs came from a one-question-at-a-time brainstorm:

- **Who is the docs' audience?** → Internal team alignment.
- **Relationship to the existing `vision.md`?** → Fresh canonical doc set; supersede `vision.md` (archive it).
- **Which modules are IN the MVP (reels/leaderboard already out)?** → All four offered: **Workshops, Events/competitions, Enrollment, Paid trials + payments.**
- **Revenue streams (MVP / near-term)?** → *(verbatim)* "for now we ar thinking of comission based on the trial or enrollment, but in future we might also charge for academy listing, academy listing (special listing) and passes for student which can help them get discounts."
- **Launch market?** → Single city first (answered via the Bengaluru option, then **corrected to Delhi-NCR** — see §4.3).
- **Core learner segment?** → *(verbatim)* all of them + "all age groups/ user group."

Folder & prototype scoping:
- **Folder consolidation approach?** → **Organize into subfolders.**  **Delete originals?** → **Yes** (we moved files; `vision.md` was archived rather than deleted).
- **Prototype scope?** → **Student app only.**  **Structure?** → **Separate file per app in `prototypes/`.**

### 4.3 Mid-stream corrections (these OVERRODE earlier answers — keep them)

1. **Launch market → Delhi-NCR.** *(verbatim)* "we are going to launch the app in Delhi-NCR region not banglore … for now it is just delhi ncr." All docs + the prototype use Delhi-NCR. (Code seed data still says Bengaluru — flagged for eng.)
2. **Compare removed entirely.** *(verbatim)* "we are not going to give a side by side comparison window." → Compare was stripped from every doc; **transparency** (standardised, upfront info per academy) replaces it. The `compare` screen in the code is flagged to remove/repurpose.

### 4.4 User working style (observed — apply going forward)

- Strong preference: **ask clarifying questions, don't assume** — especially on scope.
- Iterative/corrective: gives a directive, reviews the output, then corrects specific points (city, compare). Expect and invite corrections.
- Supplies intent visually: app concept via `assets/app-banner.jpeg`; UI redesign via `ui-refs/` screenshots.
- Reels & leaderboard are future, not MVP (do not pull them forward).

---

## 5. The prototype (`prototypes/student-app.html`)

> **Rebuilt 2026-06-19** into a **flow-faithful** prototype that replicates the **real student
> app's flows** (mapped from `apps/student`, Expo Router), replacing the earlier 4-screen invented
> version (now in `_archive/student-app-standalone.html`). Design doc:
> `docs/superpowers/specs/2026-06-19-student-app-prototype-design.md`.

- **Self-contained** single HTML file (no build/deps). Open directly in a browser, or `python3 -m http.server` from `prototypes/`.
- **Scope:** full MVP student app — **38 screens + 8 bottom sheets** (32+7 at the 2026-06-19 rebuild; grown since — online classes, Past classes, etc. — see §7 & `final-app/master-feature-document.md` for the current inventory), all real flows except the removed `compare`:
  - Auth: welcome → phone → OTP → onboarding → interests
  - Tabs (3): **Discover** (search, filter sheet, category pills, top-rated carousel, near-you list), **Events** (spotlight + event/workshop rows), **Profile**
  - Academy detail → offerings → program detail; **trial booking** (slot→pay→confirm, with attendance OTP); **enrollment** (select→pay→confirm→manage: renew/pause/transfer/discontinue); **workshop** & **event** (detail→pay→confirm)
  - My Bookings / My Trials (reschedule, cancel, review) / My Classes (Join-live) / post-trial review; Saved, Edit profile, General info
- **Navigation:** tiny JS **stack-router** (`go`/`back`/`tab`), slide transitions, 3-tab floating nav that hides on pushed screens; light `data-set`→`data-bind` templating; shared bottom-sheet host.
- **Design system:** Instrument Serif (italic display) + **Inter**, persimmon/jade/gold/rose accents, warm paper, rounded cards, floating pill nav — matched to `ui-refs/`. **Imagery = real Unsplash photos downloaded to `prototypes/assets/img/`** (offline-safe; credits in `assets/CREDITS.txt`). Accessibility carried over: focus rings, reduced-motion, 44px targets, ARIA, tabular figures.
- **Content:** **Delhi-NCR** place names (Hauz Khas, Saket, Lajpat Nagar). Payments simulated; social sign-in are demo toasts.
- **Verification:** static only (no browser in env) — 0 broken nav refs, all images present, balanced tags, JS `node --check` passes.

---

## 6. The code repo (for reference — we are NOT editing it from here)

- Working dir this session: `/home/mp2sslrl/jelly/code (1)/code` (note: there's also a nested `code/` subdir — odd layout; confirm which is canonical before touching code).
- **Monorepo** (pnpm + turbo): `apps/student` (Expo / React Native, Expo Router), `apps/admin`, `apps/api` (Prisma); shared `packages/ui`, `packages/types`, `packages/api-client`, `packages/config`.
- Stack signals: Expo, React Query, Prisma, Razorpay (payments), MSG91 (OTP), Cloudflare R2, Sentry, EAS. Tokens (from `packages/ui` / mockups): `--persimmon #D8492A`, `--paper #F1ECE2`, `--ink #14110F`, fonts Geist + Instrument Serif.
- Operational launch prep: `specs/pre-launch-checklist.md`. App-vs-mockup gaps: `audits/`.

---

## 7. Open items / next steps

- **(DONE 2026-06-21)** Built the **academy/admin** prototype → `prototypes/Findemy Academy App.html` (**now 25 screens + 5 sheets** — 24 at this initial build; `live-class` added 2026-06-22, see below), flow-faithful to `apps/admin` and **in sync with the student app** (identical kit lifted verbatim, shared cast = "The Rhythm House" + same fees/OTP, mirrored flows). Design + decisions: `docs/superpowers/specs/2026-06-21-academy-app-prototype-design.md`. **Note the palette is persimmon-primary like the student app — NOT "jade-green" (jade is only a secondary accent).** Two product updates captured during the build: **Schedule has Cancel-class (not reschedule); a cancelled class is unbilled and made good (+1 session appended; entitled count preserved — e.g. 8 stays 8, not a bonus)**; attendance tiers are **Active / Irregular / Inactive**.
- **(DONE 2026-06-22) Attendance model split by booking type** — locked with the user and reflected in both prototypes:
  - **Trials → OTP** (unchanged): student's app shows a 4-digit *Attendance code*; the academy enters/verifies it at class. Academy: `trial → attendance-otp`. Student: booking-detail *Attendance code* box.
  - **Regular classes → QR** (new): the **academy app displays a per-session check-in QR** (`batch → Attendance tab → attendance-qr`, live "9 of 12 checked in" + scanned/not-yet roster). **Students scan it from the student app** (`class-detail → checkin-scan` camera/viewfinder → "marked present"). Shown only for **active, in-studio** classes (online classes still use *Join live*).
  - Decided **QR-only** (no manual present/absent override) — the old manual toggle UI + its JS/CSS were removed from the academy batch screen. Both apps kept in sync this change.
- **(DONE 2026-06-22) Online classes added to the academy app** (parity with the student app, which already supports online). Mechanism mirrors the student app's `_online`→`data-online`+`.when-*` pattern: academy uses **`_mode` (`studio`/`online`) → `data-mode` on `#screen-batch` / `#screen-trial`**, toggling `.when-studio` / `.when-online` via CSS. Sample online batch = **"Vocals — All Levels"** (Meera Nair); an online **"Vocals — Trial"** demonstrates online trials.
  - **Online attendance = auto-on-join** (locked with user): online batch Attendance tab shows *Start live class* + "7 of 8 joined" + joined/not-joined roster (no QR). QR stays in-studio only.
  - **Hosting = Findemy-hosted room** (locked): new `screen-live-class` host screen (red ● Live pill, faux video stage, joined roster, *End class*). No external Zoom/Meet link. Reached from batch (online) + online trial.
  - **Trials inherit batch mode** (user rule: "online batch → online trial, offline → offline"). Online trial keeps **OTP** verification but delivered in the live session (notice copy differs); adds a *Start live class* button.
  - **(DONE 2026-06-22) Student data synced to match.** Student "My Classes" now: **Guitar — Beginner = in-studio active** (so *Scan to check in* is reachable, matching academy's Guitar QR batch) + new **Vocals — All Levels = online active** (*Join live class*, matching academy's online Vocals batch). Both apps now line up on the same two demo classes: Guitar = in-studio (QR/scan), Vocals = online (start/join live). Reused bundled image `usplash0`/uuid `9f55dfed` (music cover) for the new Vocals row.
- **(DONE 2026-06-22) Removed the Trial-availability flow from the academy app.** Deleted the Schedule tab's "Availability" button and the whole `screen-publish` ("Trial availability / Publish slots") screen. **New model: trial spots are automatic = batch capacity − enrolled** (no slot-publishing UI). Reflected by adding `bCap`/`bTrials` to batch data-sets and a read-only **"X/Y enrolled · N trial spots open"** badge + explainer on **batch detail**, plus a note under Capacity in the **New batch** sheet. Sample: Guitar 12/15→3, Vocals 8/12→4, Keys 6/10→4.
- **(DONE 2026-06-22) Students-roster filters made coherent.** The roster pill chips are now **attendance-only** (`All · 38 / Active / Irregular / Inactive`) — dropped the stray "Music" chip (art-form category is a *discovery* concept for the student app, not an academy's own roster). The **batch/program axis** moved into the **filters sheet**: relabeled "Category" → **Batch** with real batch names (Guitar — Beginner / Vocals — All Levels / Keys & Piano), and both sheet chip groups (Batch + Attendance) are now single-select via `groupSelect('[data-chipgroup]','sel')`. Model: pills = quick attendance filter; sheet = combinable Batch + Attendance.
- **(DONE 2026-06-22) Redesigned the academy "Studio" (profile) tab.** Replaced the tiny 56px thumbnail card with a **cover-banner profile hero** (gradient + Verified badge, name, rating, location, Edit), added a **3-up quick-stats strip** (38 Students · 3 Batches · ₹62.4k Earned) and **Manage / Account section labels**. **Removed** the "Events are curated by Findemy / your academy hosts workshops, not events" info banner (and its now-dead `.inforow` CSS). New CSS: `.pstats`/`.pstat`/`.psec`.
- **(DONE 2026-06-22) Cross-app sync audit (student ↔ academy).** Verified The Rhythm House is portrayed consistently. **In sync already:** identity (4.9·84·Hauz Khas), Guitar (₹3,200/mo, Mon·Wed·Fri 5–6:30, in-studio, trial ₹150 / OTP 4927), Vocals schedule + trial ₹200, and all attendance/online/live flows (trial OTP ↔ verify; in-studio scan ↔ QR; online join ↔ start-live). **Fixed mismatches:** (1) Vocals enrolled fee ₹2,800→**₹3,800/mo** to match the program; (2) Keys & Piano schedule student **Sat·Sun 10–11:30 AM → Mon·Fri 7–8 PM** to match academy; (3) student now shows **Vocals = Online** (badge on program rows + new bound **Mode** row on program-detail via `pgMode`); (4) academy coach Arjun **"2 batches"→"1 batch"** (only coaches Guitar — Beginner).
  - **Known remaining gaps (not yet fixed, flagged to user):** (a) **Workshops not mirrored** — academy hosts *Songwriting 101* + *Open-Mic Masterclass*, but the student app's discovery/academy-detail Workshops tab doesn't list them (student workshops are currently only Pottery/Oil-Painting from other academies). (b) student **program-detail "Batch" options** (Evening/Morning + "seats left") are static, not data-bound per program, so they don't reflect the actual batch for non-Guitar programs or the academy's capacity−enrolled trial-spots. Both pre-existing/structural.
- **(DONE 2026-06-22) Added a 4th student tab — "My Classes".** Bottom nav now **Discover · Events · Classes · Profile** (`TAB_ROOTS` += `classes`; grad-cap icon). The repurposed `screen-classes` is the tab: **Trials** section (current/upcoming trials) + **Enrolled** section (active + on-hold classes) + a built-in **empty state** ("No classes yet" → Explore) that's `display:none` by default (populated shown, per user). **Past enrollments moved to Profile:** new `screen-past-classes` (ended/discontinued, e.g. Keys & Piano "Ended", Contemporary "Discontinued"); Profile's old **"Your Classes"** quick + **"My Trials"** row were replaced with **"Past classes"** (repurpose, not duplicate). Post-booking confirmations now `data-tab="classes"`. `screen-trials` is now unreferenced/dead (left in place, harmless).
- **(DONE 2026-06-22) Fixed duplicate batch selection in the enrol flow (student).** Batch was chosen twice — on `screen-program` ("Batch") AND again on `screen-enroll-select` ("Choose batch"). Now: batch is picked once on the program screen; the enrol/payment screen shows it **read-only** ("Your batch" summary + a "Change" link back to the program). A small click handler copies the program's selected `.opt` (name + timing) into `[data-bind=enBatch/enBatchSub]` so it reflects the actual choice (Evening/Morning). Plan selection + Proceed to payment unchanged.
- **(DONE 2026-06-23) Master feature document** → `final-app/master-feature-document.md`. Exhaustive cross-app reference built from both prototypes (student 38 screens + 8 sheets; academy 25 screens + 5 sheets) + `app-ideation/`: platform overview, shared model (attendance OTP/QR/auto-join, online vs in-studio, trial-spots, plans, cancel-class, tiers, payments), full per-app feature catalogs, cross-app mirrored flows, MVP scope, and complete screen/sheet inventory tables. **Keep it updated when prototype features change.** (Note: `final-app/` previously empty; this is its first artifact.)
- Prototype tweaks the user may want: swap Inter → real **Geist** webfont; revert Delhi-NCR copy → Bangalore (literal ref match). *(Real photos: done — bundled in `prototypes/assets/img/`.)*
- Possible prototype follow-ups: thread workshop/event detail data into their pay/confirm screens (currently representative defaults); add an admin/studio prototype using the same router pattern.
- **Eng follow-ups flagged in docs** (not for this folder, but track them): reconcile seed/mock data from Bengaluru → Delhi-NCR; remove/repurpose the `compare` screen in `apps/student`.
- Optional doc additions if the team wants: success metrics / KPIs, deeper competitive landscape.

---

## 8. How to work in this folder (notes for the assistant)

- `app-ideation/` is the **canonical** product source of truth. If product facts change, update there first, then reflect here in §2.
- This is **not a git repo** (no version control / undo) — be careful with deletes/moves; prefer archiving over deleting.
- Keep the **Compare-removed** and **Delhi-NCR** decisions consistent everywhere — they were explicit user corrections.
- The user prefers being **asked clarifying questions rather than having assumptions made**, especially on scope.
