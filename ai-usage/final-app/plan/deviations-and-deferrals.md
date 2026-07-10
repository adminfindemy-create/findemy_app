# Deviations & deferrals log

> **Read this when planning any later phase.** It records where the *implemented* code intentionally departs from the slice plans, and what was deferred (with the downstream owner). Each phase's own README carries the same facts; this is the single cross-phase index so a future planner doesn't re-derive or trip over them.
>
> Last updated: 2026-06-27 (after P2 implementation).

## Deviations (implemented ≠ as-planned)

### D1 — S2.1 trial booking = **Option B** (functional decouple; `Slot` left dormant)
- **Planned:** full `Slot` teardown — delete the model, the `slots` module, both slot workers, and every serializer ref.
- **Implemented (owner-approved):** `Booking.slotId`/`Trial.slotId` made **nullable** + `Booking.trialAt` added; trial booking runs off `capacity − enrolled` at the batch's class sessions (`GET /batches/:id/trial-availability`); reschedule/4h-refund off `trialAt`; rooms re-keyed off `batch.id`; both slot workers (`slot-ttl`, `webhook-retry`) **guarded** to skip null `slotId`. The **`Slot` model + `slots` module + `prisma/seed.ts` slot rows remain (dormant)**.
- **Impact on later phases:** none functional — the goal (book off capacity, no published slots) is met.
- **Deferred → see DF1.**

### D2 — Central config lives in `@findemy/types` + `backend/api/src/config.ts` (NOT `@findemy/config`)
- **Planned:** put shared tunables in `@findemy/config`.
- **Implemented:** `@findemy/config` is a **tooling-config** package (ships `biome.json`/`tsconfig.base.json` only) — not a runtime source. So:
  - **Shared contract constants** (`PLAN_MONTHS`, `DISCOUNT_BPS_CAP`, `OTP_LOGIN_LENGTH`, `OTP_ATTENDANCE_LENGTH`) → **`@findemy/types`** (the existing contract source, imported by backend + both apps).
  - **Backend-only policy** (`COMMISSION_BPS` env-overridable = 1500/15%, `TRIAL_REFUND_MIN_HOURS=4`, `WORKSHOP_REFUND_MIN_HOURS=24`, `TRIAL_AVAILABILITY_WEEKS=2`) → **`backend/api/src/config.ts`**.
- **Rule for future phases:** new shared constants → `@findemy/types`; new backend policy/tunables → `backend/api/src/config.ts`. Do **not** use `@findemy/config` for runtime values.

### D3 — Trial-spots semantics (locked with owner)
- A **booked trial does NOT consume a spot.** `trial_spots = capacity − enrolled` is pure headroom; only **enrolments** consume it. `getBatchAvailability` is unchanged. (Supersedes the master-plan "spots decrement" wording.)

### D4 — Rooms keyed off `batch.id` (was `slot.id`)
- The online live-class HMS room id is now **`batch.id`** (`rooms/service.ts`), and "is live now?" is derived from the batch's **timings** (`rooms/repo.ts findLiveBatch`), not a `Slot`.
- **⚠️ Owner for P3/S3.3 (online live):** build per-session live on top of `batch.id`. Caveat: this assumes **one live session per batch at a time**; if concurrent cohorts per batch ever exist, the room key needs `batch.id + sessionStart`.

## Deferrals (not built yet — with owner)

| # | Deferred work | Why | Owner / when |
|---|---|---|---|
| **DF1** | Delete the dormant `Slot` model + `slots` module + slot-worker code + seed slot rows | Option B (D1) met the goal; deletion is pure cleanup with a large blast radius | A dedicated **"delete dead Slot code" cleanup pass** (run before or alongside P3, since P3 finalizes live sessions). Tracked here. |
| **DF2** | Academy **"Trials today"** grouping on the Schedule screen | Deferred with owner; trials are auto-confirmed and reachable via the existing inbox/trials views | **P3** (Classes & attendance) or the cleanup pass |
| ~~**DF3**~~ | ~~Workshop / event commission rows~~ — **RESOLVED in P4.** **Workshop** commission now recorded on capture (S4.4, `payments/service.ts`). **Events carry NO commission** (S4.5): `Event` has no `academyId` → Findemy-organised, platform keeps 100% (verified). | — | **In P4/S4.4–S4.5** ✅ |
| **DF4** | `student-app/app/program/[id]/review.tsx` enrols **Monthly only** | The dynamic plan picker is `BatchDetailSheet` (quarterly/annual at the batch's %); review.tsx is a monthly-specific path | Cosmetic; fix in P5 polish or the cleanup pass (thread a `package_type` param) |
| **DF5** | Proper Prisma **migration files** (we use `prisma db push` in this env — `migrate dev` shadow-DB perms denied) | Env limitation since P0 | Generate migrations where DB perms allow (pre-launch) |
| ~~**DF6**~~ | ~~Real-time video SDK deferred~~ — **RESOLVED (owner decision 2026-06-27): build 100ms now.** Folded into **P3/S3.3** (no longer deferred): real 100ms room per batch (`Batch.liveRoomId`), `@100ms/react-native-sdk` in both apps, and **attendance on the real `peer.join` webhook** (not screen-open). Live A/V verified once real `HMS_*` credentials are set (mock fallback without them, like Razorpay). | — | **In P3/S3.3** ✅ |
| **DF7** | **Review-count cache (`Academy.ratingCount`) is kept canonical only on review *create*** (recomputed from the full review set; the seed now sets it from real rows — S4.3). There is **no review-delete/moderation path** today, so the cache can't drift backward. **If a delete/hide/moderation path is ever added, it MUST recompute `rating` + `ratingCount` from the remaining rows** (else the student-facing reads — `academies/service` search/detail + the ranking sort + `me/saved` — go stale again, reviving the "84-vs-32" bug). | Student-facing reads use the cached `Academy.ratingCount` (avoids N+1 on list reads); create-time recompute is the only writer | **P5** (account & polish) or whenever review moderation/delete is built — add the recompute to that path. Alternatively, derive count live from `getReviewsSummary` if list-read N+1 becomes acceptable. |

## Cross-references to fix when those phases are planned
- **P3/S3.3** — rooms = `batch.id` (D4); finalize per-session live there.
- **P3/S3.2** — in-studio QR attendance keys off `Batch.mode`; the 4-digit OTP (S2.2) is **trials only**.
- **P4/S4.x** — DF3 (workshop/event commission) + DF2 (Trials-today) if not already done.
- **Earnings (S4.6)** — academy net = Σ captured gross − Σ (`accrued` − `reversed`) commission from `CommissionLedger`.
