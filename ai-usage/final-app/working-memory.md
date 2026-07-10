# Working memory — Findemy final-app execution

> **What this file is.** The single context-handoff for the **execution** of the Findemy product from the phased plan. It records what was built, how, in what order, the decisions made, the bugs caught, and exactly where things stand — so a fresh Claude Code session (or a person) can resume without re-deriving anything. This captures the *chat/session context* of the build, not just the final state.
>
> **Last updated:** 2026-06-29. **Build state:** all 6 phases (P0–P5) implemented; every slice backend round-trip-verified; **5 packages typecheck, 58 tests green**. Remaining work is environment/credential/device-gated (see [`plan/pre-production-checklist.md`](./plan/pre-production-checklist.md)), not features.

---

## 1. The product & the workspace

**Findemy** — "Discover your Art." Delhi-NCR discovery + booking platform for **skill academies** (music, dance, art, yoga, fitness). Core loop: **discover → try → enrol**. Two apps (student + academy) on one backend. Business model: **commission** on trials + enrolments.

This folder (`ai-usage/final-app/`) is the **planning + execution-tracking workspace**:
- `master-execution-plan.md` — the phase/slice master plan (P0–P5, the source of scope).
- `master-feature-document.md`, `implementation-gap-analysis.md`, `backend.md`, `student-app.md`, `academy-app.md` — reference docs the plan was built from.
- `plan/` — the detailed per-phase plans (README + slice docs), plus the three living registries:
  - `plan/deviations-and-deferrals.md` — where implemented code departs from plan (D#) + what was deferred (DF#).
  - `plan/dead-code-registry.md` — dead/dormant code to remove in one cleanup pass.
  - `plan/pre-production-checklist.md` — the launch gates.
- **This file** — the execution working memory.

**The actual code** lives in the repo root: `/home/mp2sslrl/jelly/code/` — a **pnpm + turbo monorepo**:
- `backend/api` — Fastify + Prisma + Postgres. Modules: `academies attendance auth batches bookings coaches enrollments events me payments push reviews rooms sessions settings slots students studio trials workshops`.
- `backend/shared/{types, api-client, config, ui}` — `@findemy/types` (zod schemas + types + shared constants = the contract), `@findemy/api-client` (typed client), `@findemy/config` (tooling config only, NOT runtime), `@findemy/ui` (shared RN theme/atoms).
- `student-app`, `academy-app` — Expo / React Native (Expo Router, react-query, react-hook-form + zod).

---

## 2. Methodology & house rules (how this was built)

- **Plan → review → implement → verify, per phase.** Each phase: write the detailed slice docs first; run an **adversarial review pass** (independent reviewers + verify their claims before acting); implement **backend-first**; verify with **real-DB round-trips** + typecheck + the test suite.
- **Backend-first, contract-first.** `@findemy/types` is the single contract (zod). Backend builds schema + API + types + api-client + seed, then the apps wire to it.
- **The review pass earns its keep.** Every phase's review caught at least one *real* bug (see §6). Reviewer claims are **verified in code before acting** — several reviewer claims were wrong (e.g., a reviewer said enrolment didn't refund; it did).
- **Verification is non-negotiable + honest.** "Done" means typecheck-clean + tests green + a round-trip that exercises the real path. **Claiming "fixed" without proof is distrusted** — this bit us once (the review-count bug, §6) and the standard tightened after.
- **Env constraints (carried all phases):**
  - `prisma db push` only — `migrate dev` shadow-DB perms denied (**DF5**); `db push --accept-data-loss` for column shrinks/drops.
  - Tests are run with `pnpm exec vitest run`; round-trips with `node --env-file=.env --import tsx <script>` (the app doesn't auto-load `.env`; the `--env-file` flag loads the matched JWT pair etc.).
  - `MOCK=1` mock mode; **gotcha:** `env.MOCK` is parsed once at import, so the mock plugin checks `process.env.MOCK` **live per-request** (this was the P0 bug).
  - Money = integer **paise**; discounts in **bps** capped 3000 (30%); IST helpers in `lib/ist.ts`.
- **User working style:** values **honesty over false completion**; rewards finding real bugs; wants **clarifying questions one-by-one**; corrects course actively. Keep plan docs in sync with executed code.

---

## 3. Execution trajectory (chronological — the session arc)

1. **P0 re-verification.** User: "make sure P0 was *concrete*, I can't afford lingering issues." Found **8 failing tests**. Misdiagnosed twice as "pre-existing/random-OTP" (wrong) → real root cause: **MOCK mode never activating** (`env.MOCK` captured at import; `getTestApp()` set `process.env.MOCK` too late). Fixed `mock.ts` to check `process.env.MOCK` **live per-request**. Also fixed a real P0 regression (mock-fixtures Raaga→Rhythm House). **Result: 58/58 green.** P0 verified concrete.

2. **P1 implemented** — S1.1 (academy gallery + video), S1.2 (discovery/search), S1.3 (**batch fee/discount/mode**, Option A: DB `BatchMode online|offline` ↔ wire `Mode 'in-studio'|'online'` via `lib/mode.ts`; quarterly/annual discount bps on Batch).

3. **P2 planned → reviewed → implemented.** Slices: **S2.4** payments + commission, **S2.3** enrol pricing (PLAN_MONTHS + per-batch discount), **S2.1** trial booking (**Option B**: slots retired; booking off `capacity − enrolled`; `Booking.trialAt`; `Slot` dormant), **S2.2** OTP split (login 6-digit + attendance 4-digit). Config: `backend/api/src/config.ts` (`COMMISSION_BPS=1500`, refund hours, etc.) + `@findemy/types` constants. `CommissionLedger` (idempotent `@@unique([itemType,itemId])`, proportional reversal). Deviations D1–D4, deferrals DF1–DF6 recorded.

4. **P3 planned → reviewed → 3 owner decisions → implemented.** Decisions: (1) add **`Batch.sessionsPerMonth`** (explicit entitled count); (2) **build 100ms now** (un-defers DF6); (3) DF6 dissolves into S3.3. Slices: **S3.1** student Classes tab (`GET /me/classes`, attended = `BatchAttendance`), **S3.2** in-studio **QR** check-in (token + `recordPresent`, null marker, `sessionDateIST`), **S3.3** online live + **real 100ms** (room-per-batch `Batch.liveRoomId`, `peer.join` **webhook** → attendance, host token), **S3.4** schedule off `BatchTiming` + **cancel + make-good** (`SessionCredit` + extend period to **next occurrence**). `HMS_*` added to env schema. Native A/V + camera = **scaffolds** (dev-build gated).

5. **P4 planned → reviewed → implemented → 6 owner decisions → 2 UI reorgs.** Review caught the **tier 100%-for-everyone** bug (huge). Slices: **S4.4** workshops (enum 4→2, non-refundable, **workshop commission**), **S4.5** events (REUSE; **no commission** — `Event` has no `academyId`), **S4.6** earnings **net of commission**, **S4.3** reviews from **trial OR enrolment**, **S4.1** roster tiers (**fixed denominator** = present/expected), **S4.2** coaches (batch-count + assign + ownership check). Owner decisions locked (§5). UI reorgs: **Filters sheet** (S4.1) + **coach-assign** (S4.2).

6. **Review-count bug incident.** I claimed the "84-vs-32" review count was "handled"; the **user pushed back**; verification showed it was **NOT fixed** (seed hardcoded `ratingCount=72` but 1 real review). Fixed properly: seeded **82 real reviews** + set `rating`/`ratingCount` from actual rows. Verified canonical across all 8 academies. (This is the cautionary tale that tightened the "prove it" standard.)

7. **P5 planned → reviewed → implemented.** Review caught **academy push broken at two levels**. Slices: **S5.1** (removed orphaned `trials/index.tsx`, kept live `trials/[id]`, repointed 4 refs → `/bookings`), **S5.2** (review-reply + new-review pushes; **`SessionReminderSent` table** + class/attendance **reminder worker**; fixed academy push), **S5.3** (a11y labels on net-new screens), **S5.4 partial** (rewrote live `include: slot` reads → `trialAt`; **model drop deferred**, perms-gated).

8. **Bug fixes + checklist.** Fixed the **academy-push bug** (FK drop + resolution, verified at DB level — *not* hollow this time) and a **trial-reminder idempotency** bug (dedicated `reminder1hSent` flag). Built `pre-production-checklist.md`.

---

## 4. Per-phase state (detailed)

| Phase | Slices | State |
|---|---|---|
| **P0 Rails** | S0.1 contract · S0.2 discards · S0.3 auth/onboarding · S0.4 seed | ✅ implemented & **verified concrete** (the 8-test fix) |
| **P1 Discover** | S1.1 gallery/video · S1.2 discovery · S1.3 batch fee/discount/mode | ✅ implemented & verified |
| **P2 Conversion** | S2.1 trial(Option B) · S2.2 OTP 4-digit · S2.3 enrol plans · S2.4 payments+commission | ✅ implemented & verified |
| **P3 Classes** | S3.1 Classes tab · S3.2 QR · S3.3 online 100ms · S3.4 schedule+make-good | ✅ **backends verified**; native A/V + camera **scaffolded** (dev-build) |
| **P4 Manage** | S4.1 tiers · S4.2 coaches · S4.3 reviews · S4.4 workshops · S4.5 events · S4.6 earnings | ✅ implemented & verified (incl. the 2 UI reorgs) |
| **P5 Polish** | S5.1 profile · S5.2 notifications · S5.3 a11y · S5.4 cleanup | ✅ S5.1–S5.3 verified; **S5.4 partial** (slot reads rewritten; model-drop deferred) |

**Key schema/model facts (post-P5):**
- `Batch`: `quarterlyDiscountBps`/`annualDiscountBps`, **`sessionsPerMonth`** (S3.4), **`liveRoomId`** (S3.3 100ms), `mode BatchMode`.
- `Booking.trialAt` + `Booking.slotId?`/`Trial.slotId?` nullable (Slot dormant, D1).
- `CommissionLedger` (S2.4); `CancelledSession` + `SessionCredit` (S3.4); `SessionReminderSent` (S5.2); `BatchAttendance` (`@@unique([batchId,userId,date])`, `markedByAccountId` **nullable**).
- `Review`: `trialId?`/`enrollmentId?` (nullable-unique), `source ReviewSource`, **`@@unique([userId, academyId])`** (one review per academy).
- `Trial`: `reminderSent` (23–25h) + **`reminder1hSent`** (1h) — separate durable guards.
- `ExpoPushToken.subjectId` — **no FK** (polymorphic: User.id OR AcademyAccount.id); the old `User` FK was the academy-push bug.
- `User.attendanceOtp @db.VarChar(4)`; `WorkshopType = online|offline`.

---

## 5. Owner-locked decisions (don't re-litigate)

- **Commission:** 15% default (`COMMISSION_BPS`, env-tunable). Taken from academy payout, never added to learner price.
- **Trial booking = Option B** (D1): off `capacity − enrolled`, no slots; a booked trial does **not** consume a permanent spot (trial spots = headroom, D3).
- **Mode = Option A:** DB `online|offline` ↔ wire `in-studio|online`.
- **Make-good** (S3.4): cancel a class → `SessionCredit` (+1, the count) **and** extend the period to the **next real `BatchTiming` occurrence** (the delivery). Recipients = active, **not paused**, with a current active period.
- **`Batch.sessionsPerMonth`** = academy-set; entitled = `sessionsPerMonth × months + Σ credits`; also the **attendance denominator** (P4/S4.1).
- **Online attendance = real `peer.join` webhook** (server-authoritative), not screen-open.
- **Reviews (S4.3):** one per `(user, academy)` from trial **or** enrolment; trial eligibility = **`attended` only**.
- **Events** = Findemy-curated, **platform keeps 100%** (no `academyId` → no commission).
- **Attendance reminder (S5.2):** ~2h before an **in-studio** class → push **both** students ("check in with QR") **and** academy ("open the QR"). Online excluded.
- **Student activity feed:** **deferred** (post-MVP; pushes already deliver). The dead Profile "Notifications" button was removed.
- **Payouts:** display-only; processing deferred out of P4.

---

## 6. Bugs caught + fixed (the review pattern paid off)

| Phase | Bug | Fix |
|---|---|---|
| P0 | 8 tests failing — **MOCK never activated** (env captured at import) | `mock.ts` checks `process.env.MOCK` live per-request |
| P3 review | **Make-good was inert** (ledger row nothing reads) | `SessionCredit` + `extendPeriodEndDate` (real delivery) |
| P3 review | "auto-on-join" was really "auto-on-screen-open" | Moved attendance to the real 100ms `peer.join` webhook |
| P4 review | **Tier = 100% for everyone** — only `present` rows exist, so `present/present` | Denominator = **expected** sessions (`sessionsPerMonth × months`) |
| P4 review | "84-vs-32" review count visible **student-side** (search/detail + ranking sort) | Keep `Academy.ratingCount` canonical (recompute on create) |
| P4 review | **Cross-academy coach assignment** hole in reused `updateBatch` | Validate coach belongs to the academy |
| P4 review | Seed had masterclass/demo workshops → enum narrow would lose data | Clean seed before the enum drop |
| **(incident)** | **I claimed review-count "fixed" — it wasn't** (seed fiction) | User caught it; seeded 82 real reviews + reconciled `ratingCount` |
| P5 review | **Academy push broken at two levels** — send used Academy id (tokens under AccountAccount id) **and** a `User` FK blocked storing academy tokens | Dropped the FK + centralized `academyId→accountId` resolution; **verified at DB level** (not hollow) |
| P5 review | `trials/[id]` wrongly flagged as dead (live via BookingDetailSheet) | Keep `[id]`, remove only `index` |
| P5 | **Trial 1h-reminder idempotency** — shared one flag with the 24h reminder | Dedicated `reminder1hSent` + window wider than cron |

---

## 7. What's left (none of it is feature work)

All gated on environment/credentials/device — see [`plan/pre-production-checklist.md`](./plan/pre-production-checklist.md). Summary:
1. **Native dev-build (P3):** wire `@100ms/react-native-sdk` (video), `expo-camera` (QR scan), `react-native-qrcode-svg` (QR render) into the scaffolds; needs a custom Expo build + real 100ms creds + camera/mic permissions.
2. **Migrations + Slot deletion (DF5 + DF1 / S5.4):** generate the Prisma migration baseline in a `migrate`-perms env, switch to `migrate deploy`, then drop the **Slot system** in one reviewed migration (live reads already severed). Plus referral (A4) + legacy aliases (A5) per product call.
3. **Secrets:** esp. **`EXPO_ACCESS_TOKEN`** (all push no-ops without it), Razorpay + webhook, 100ms template/webhook, MSG91, fresh production JWT key (dev one exposed this session).
4. **Optional deferrals:** DF2 (Trials-today), DF4 (review.tsx monthly-only), DF7 (review-count recompute on delete — only if moderation built), payouts, student activity feed.

---

## 8. How to resume (quick start for a fresh session)

1. Read **this file**, then `plan/README.md`, then `plan/deviations-and-deferrals.md` + `plan/dead-code-registry.md` + `plan/pre-production-checklist.md`.
2. Working dir for code: `/home/mp2sslrl/jelly/code`. Run checks from `backend/api`:
   - Typecheck a package: `pnpm exec tsc --noEmit`.
   - Tests: `pnpm exec vitest run` (expect **58 passing**).
   - A real-DB round-trip: `node --env-file=.env --import tsx <script>` (the app needs `--env-file` for the JWT pair etc.).
   - Schema change: edit `prisma/schema.prisma` → `pnpm exec prisma db push` (`--accept-data-loss` for shrinks) → reseed `node --env-file=.env --import tsx prisma/seed.ts`.
3. **Discipline to keep:** plan → adversarial review (verify reviewer claims) → backend-first implement → round-trip verify. Update the plan docs + the three registries **in the same change**. Never claim "fixed" without a round-trip that proves it.
4. **The most impactful single launch action** is setting `EXPO_ACCESS_TOKEN` (unblocks every notification built across P3–P5).
