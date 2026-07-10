# Findemy student-app prototype — design (flow-faithful rebuild)

**Date:** 2026-06-19
**File:** `ai-usage/prototypes/student-app.html` (single, self-contained)
**Supersedes:** the earlier 4-screen invented prototype (archived to `ai-usage/_archive/student-app-standalone.html`)

## Goal
Replace the invented standalone prototype with one that **replicates the real student app's
flows** (mapped from `apps/student`, Expo Router), keeping the UI/theme matched to
`ai-usage/ui-refs/`.

## Decisions (from the user)
- **Scope:** full MVP app — all real flows except the removed `compare` screen.
- **Structure:** single self-contained `student-app.html` with a tiny JS stack-router.
- **Imagery:** real photos **downloaded locally** to `prototypes/assets/img/` (offline-safe). Credits in `assets/CREDITS.txt`.
- **City copy:** Delhi-NCR (locked launch market), not the refs' Bangalore.
- User delegated execution ("bana de … bs accha hona chahiye").

## Navigation model
A minimal JS router with a **screen stack**: `go(id)` pushes (slide-in-right), `back()` pops
(slide-in-left), `tab(id)`/`reset(id)` set a tab root (fade). Bottom nav (3 tabs: Discover /
Events / Profile) shows only on tab roots and hides on pushed screens. Light data-binding:
a card's `data-set` JSON fills `[data-bind=...]` slots on the target screen (academy name/cover,
program, price, chosen slot, plan amount). Bottom sheets via a shared host + `data-sheet`/`data-close-sheet`.

## Screen inventory (32 screens + 7 sheets)
- **Auth (5):** welcome · phone · otp · onboarding · interests
- **Tabs (3):** discover (search, filter sheet, category pills, top-rated carousel, near-you list) ·
  events (pills, spotlight, event rows, workshop rows) · profile (info, quick grid, menu, logout)
- **Academy/Program (3):** academy detail (cover, stats, about, Programs/Workshops seg, reviews, coaches) ·
  offerings · program detail (coach/schedule/fees, batch select, sticky Enrol/Book-trial bar)
- **Trial booking (3):** slot (calendar+times, 1/3) · pay (Razorpay-style, 2/3) · confirm (+attendance OTP, 3/3)
- **Enrollment (4):** select (batch + plan) · pay · confirm · manage (renew/pause/transfer/discontinue)
- **Workshop (3):** detail · pay · confirm
- **Event (3):** detail · pay · confirm
- **My stuff (5):** bookings (unified) · trials (today+OTP / upcoming reschedule+cancel / past→review) ·
  classes (enrolments, Join-live) · post-trial review (stars+chips+note) · post-trial decision (enrol/skip)
- **Profile sub (3):** saved/wishlist · edit profile · general info
- **Sheets (7):** filters · renew · pause · transfer · discontinue · cancel-trial · booking-detail

## Visual system (from ui-refs, carried over)
Warm paper bg, white rounded cards, Instrument Serif italic display headlines with persimmon-soft
highlight, Inter body, persimmon primary + jade/gold/rose accents, dark floating pill nav.
Accessibility carried from the prior pass: `:focus-visible` rings, `prefers-reduced-motion`,
44px tap targets, ARIA (labels, `aria-pressed`, `aria-current`, dialog roles), tabular figures,
toast as `aria-live`.

## Verification done
- Static validation: 32 screen ids, 7 sheet ids, **0 broken nav refs**, all 17 referenced images
  present, balanced tags (section/div/button/main/nav), JS `node --check` passes.
- No live browser available in env, so render not screenshot-verified; structure verified statically.

## Known prototype simplifications
- Workshop/event pay+confirm show representative defaults (state not threaded from list item);
  booking slot/plan ARE threaded via global state. Acceptable for a clickable prototype.
- Payments are simulated (no real Razorpay). Social sign-in buttons are demo toasts.
- A few bundled photos are unused (kept for future screens).
