# 5. MVP Scope

The MVP exists to prove one thing: **the discover → try → enrol loop works in one city.** Everything in scope serves that loop; everything that doesn't is deferred.

**Launch market:** Delhi-NCR. **Surfaces:** a student app (learners) and an admin/academy app (academies), on a shared backend.

## 5.1 In scope (MVP)

| Area | What it includes |
|------|------------------|
| **Onboarding & auth** | Sign up / log in, pick interests, build a basic learner profile |
| **Discovery & search** | Browse and search academies by skill, location, category; filters |
| **Academy profiles** | Courses, batches, fees, timings, mode (online/offline), photos, mentor info, reviews |
| **Trial booking + payments** | Pick a slot, pay (commission applies), get a booking + OTP for the class |
| **Enrollment** | Enrol into a recurring batch after a trial; manage renew/pause |
| **Workshops** | Discover and register for academy-hosted workshops, masterclasses, demos |
| **Events** | Discover and register for events *(see scope note below)* |
| **Reviews** | Leave and read post-trial / academy reviews |
| **Profile & bookings** | Manage trials, enrolments, saved academies, basic profile |
| **Academy (admin) app** | Profile/batch setup, trial & attendance management, enrolment management, reviews |

### Scope note — Events vs. competitions
The **Events module** (browse + register for events) is in the MVP. However, **large-scale, Findemy-organised talent hunts, competitions, and national championships are a future ambition**, not an MVP commitment. In the MVP, "events" means a place to surface and register for relevant happenings — not Findemy running marquee competitions itself. (To be confirmed as event supply takes shape.)

## 5.2 Out of scope (deferred to future phases)

Explicitly **not** in the MVP — see [`08-roadmap.md`](08-roadmap.md):

- **Reels & creator ecosystem** — learners uploading short-form content of their progress.
- **Leaderboards** — academy/city/national gamified rankings.
- **Findemy-led competitions & championships** — brand-run marquee events, talent hunts.
- **Recognition & rewards programs** — "Top performer of the month," featured creators, etc.
- **Multi-city** — other metros come after Delhi-NCR is proven.

These are central to the long-term vision but would dilute focus and slow the core loop if pulled forward. Building them now would also demand community scale Findemy won't have at launch.

## 5.3 Core user journeys

### Student journey (the core loop)
1. **Onboard** — sign up, choose interests.
2. **Discover** — browse/search academies in Delhi-NCR by skill and area.
3. **Shortlist** — save and weigh options using each academy's transparent info (fees, timings, reviews).
4. **Book a trial** — pick a slot, pay, receive confirmation + OTP.
5. **Attend** — show up (OTP verifies attendance at the academy).
6. **Review & decide** — rate the trial; choose to enrol, try more, or pass.
7. **Enrol** — join a recurring batch; manage it (renew/pause). Optionally register for workshops/events.

### Academy journey
1. **Onboard** (admin app) — set up the academy profile.
2. **Set up offerings** — add coaches, batches, timings, fees, workshops.
3. **Publish availability** — open trial slots.
4. **Manage inbound** — see trial requests, confirm, verify attendance via OTP.
5. **Convert & manage** — turn trial-takers into enrolments; manage ongoing students.
6. **Reputation** — receive and respond to reviews.

## 5.4 Known gaps / notes for the team

- **Mock/seed data uses Bengaluru (e.g., Indiranagar); launch market is Delhi-NCR.** Seed and demo data should be reconciled to Delhi-NCR locations before launch. *(Engineering follow-up.)*
- **No side-by-side comparison feature.** Per product decision, the MVP has no compare tool/screen; learners evaluate via transparent, standardised info on each academy profile. The code currently contains a `compare` screen — to be removed or repurposed. *(Engineering follow-up.)*
- Detailed UI-fidelity and bug audits for the apps live in [`../audits/`](../audits/); operational launch prerequisites live in [`../specs/pre-launch-checklist.md`](../specs/pre-launch-checklist.md).
