# Dead-code registry

> **Purpose.** A single running list of **dead / dormant / superseded code** introduced (or left behind) while executing the phased plan, so it can be **removed in one deliberate cleanup pass** rather than ad-hoc. Each entry says *what*, *where* (file:symbol), *why it's dead*, *which phase made it dead*, and the *blast radius / safe-to-remove-when*.
>
> **Rule of thumb:** "dead" here = compiles and may even be wired, but **no live flow reaches it** (or it's kept only to avoid a large deletion). This is distinct from **deferred features** (planned-but-not-built — see [`deviations-and-deferrals.md`](./deviations-and-deferrals.md)) and from **incomplete placeholders** (built-but-stubbed — listed in §B below, NOT for deletion).
>
> **Last updated:** 2026-06-28 (after P3).

---

## A. Dead code to REMOVE

### A1. The Slot system (the big one) — DF1
**Why dead:** S2.1 (Option B) retired published slots; trial booking now runs off `capacity − enrolled` headroom (`Booking.trialAt`), and P3/S3.4 rewrote the academy schedule off `BatchTiming`. Nothing in a live flow creates or reads a `Slot` anymore. Kept only to avoid a large deletion blast radius. **Made dead by:** P2/S2.1, finalized by P3/S3.4.

| Where | Symbol | Note |
|---|---|---|
| `backend/api/prisma/schema.prisma` | `model Slot`, `enum SlotStatus`, `Batch.slots`, `Booking.slotId` + `Booking.slot`, `Trial.slotId` + `Trial.slot` | The nullable `slotId` FKs are the only thing keeping legacy rows linkable. Drop the model + enum + relations; drop the `slotId` columns. Needs a real migration (DF5). |
| `backend/api/src/modules/slots/` | `service.ts` (`publishSlots`, `deleteSlot`, `rescheduleSlot`), `repo.ts`, `routes.ts`, `service.test.ts` | **Whole module.** Routes: `POST /studio/slots/publish`, `DELETE /studio/slots/:id`, `PUT /studio/slots/:id`, and `GET /studio/batches/:id/slots` (repurposed to trial-availability — move that one line into `batches` if still needed by the academy app). |
| `backend/api/src/routes.ts` | `slotRoutes` import + `app.register(slotRoutes…)` | Remove with the module. |
| `backend/shared/api-client/src/index.ts` | `studio.slots.{publish,delete,reschedule}`, `studio.batches.slots(...)` | Unused once the module is gone. `studio.slots.delete` already superseded by `studio.sessions.cancel` (S3.4). |
| `backend/api/src/workers/slot-ttl.ts` | whole worker | Only cancels expired **legacy slot** reservations; new bookings have no slot, so it's a no-op going forward. Remove (or repurpose for trial-headroom TTL if needed). |
| `backend/api/src/workers/webhook-retry.ts` | the `if (p.booking.slotId)` slot-release branch | Dead branch (new bookings have no slot). |
| `backend/api/src/modules/bookings/service.ts` | `:103` legacy fallback `booking.trialAt ?? slot.slotTime` | Once legacy slot rows are gone, the fallback is dead. |
| `backend/api/src/modules/trials/{service,repo}.ts`, `studio/repo.ts`, `payments/repo.ts`, `batches/repo.ts` | residual `slot` includes/reads | Audit each `slot`/`slotId`/`slotTime` reference and strip after the model is dropped. |
| **⚠️ LIVE `include: slot` reads — rewrite FIRST (review-caught)** | `trials/repo.ts:16,40,60` (student trial lists/detail), `studio/repo.ts:140` (academy trial detail), `payments/service.ts:239,259` (trial create + push) | **NOT dead fallbacks** — these return data to users today. Move them to `trialAt` (drop the `slot` include) in a **separate commit BEFORE** the model drop, else the Slot removal breaks live reads. (See S5.4 §3 step 1.) |
| `backend/api/prisma/seed.ts` | `:40 prisma.slot.deleteMany()`, `:250-258` future-slot creation, `:296` past-slot creation, `CreatedBatch.slotIds` | Seed stops creating slots. |
| `backend/api/src/mock/fixtures.ts` | slot fixtures | Remove slot mock data. |
| `student-app/src/hooks/useSlots.ts` | — | **NOT dead** — rewritten to trial-availability; keeps the `MergedSlot` shape as an adapter. The *name* is legacy but the code is live. Optional rename only. |

### A2. Reschedule (removed in S0.2)
**Why dead:** trial reschedule was removed from the product (S0.2). **Made dead by:** P0/S0.2.
- `backend/api/src/modules/slots/service.ts` → `rescheduleSlot` (folds into A1).
- `backend/shared/api-client/src/index.ts` → `studio.slots.reschedule` (folds into A1).
- Note: `bookings.reschedule` (`new_trial_at`) is **live** (trial reschedule off `trialAt`) — do not remove that one.

### A3. Manual attendance marking (replaced by QR/auto-join) — done, listed for record
**Status:** ALREADY REMOVED in P3/S3.2 (manual `markAttendance` service + `POST /studio/batches/:id/attendance` route + academy manual toggle UI + `useMarkBatchAttendance`/`useBatchAttendance` hooks). No action — recorded so we don't re-add it.

### A3b. Orphaned student `/trials` **index** screen (P5/S5.1 finding — scoped by review)
**Why dead:** post-S3.1 the canonical trials home is **Profile → Your Bookings** (`/bookings`, combining trials+workshops+enrolments). `student-app/app/trials/index.tsx` ("My Trials") duplicates it. **Made dead by:** P3/S3.1.
- Remove **`app/trials/index.tsx` ONLY**. **⚠️ KEEP `app/trials/[id].tsx`** — review verified it's **live**, reached from `BookingDetailSheet.tsx:388` ("Manage trial").
- Repoint the **three** refs that pointed at the index → `/bookings`: `booking/slot.tsx:86` (reschedule), `booking/confirmation.tsx:51` (`screen:'trials'→'bookings'`), `usePushNotifications.ts:65` (`router.push('/trials')`).
- **Resolved in P5/S5.1** (routing), confirmed deleted in **S5.4**.

### A4. Referral system (DEFERRED, not MVP)
**Why dead:** referrals are out of MVP scope (gap-analysis §4); the routes are orphaned/archived.
- `backend/api/src/modules/me/routes.ts:15` — the orphaned referral route block.
- `backend/api/prisma/schema.prisma` — `model Referral`, `User.referralPoints`, `User.referralsSent`/`referralsReceived`.
- **Decision needed:** remove, or keep dormant as an explicit post-MVP feature. If keeping, move to deviations-and-deferrals, not here.

### A5. Legacy aliases / back-compat shims
| Where | Symbol | Note |
|---|---|---|
| `backend/shared/types/src/index.ts:54` | "Legacy alias" | Confirm no importer, then drop. |
| `backend/shared/ui/src/theme.ts:71` | legacy colour aliases | Kept so existing screens don't break — **remove only after** migrating screens to the new token names. Lower priority. |
| `backend/api/src/modules/studio/service.ts:433` | "keep legacy boolean columns in sync for back-compat" | Tied to the settings model; verify the boolean columns have no readers, then drop the sync + columns. |

---

## B. Incomplete placeholders — DO NOT delete (finish these)
These are **stubs to complete**, not dead code. Listed so they aren't mistaken for either.
- **Native A/V + camera UIs (P3/S3.2, S3.3):** `student-app/app/checkin-scan.tsx` (camera placeholder), `student-app/app/live/[batch_id].tsx` (100ms join placeholder), `academy-app/app/batches/[id]/live-class.tsx` + `…/attendance.tsx` QR box (100ms host + QR-image placeholders). Data flow is wired; the native render needs a dev build + (for 100ms) real credentials. See [`deviations-and-deferrals.md`](./deviations-and-deferrals.md) (DF6 resolved → in-scope) and the P3 README status table.
- **`live/end` endpoint (S3.3):** "End class" is client-side back-nav; no server record. Add if a live-session record is wanted.
- Assorted `TODO`s that are genuine follow-ups, not dead code: Sentry config (`student-app/app/_layout.tsx:70`), avatar upload (`profile/edit.tsx:67`), earnings unpaid/lifetime balance (`academy-app/app/earnings.tsx:109`).

---

## C. Removal sequencing (when we do the cleanup pass)
1. **Generate a proper Prisma migration baseline first (DF5)** — the Slot/referral column drops must go through `migrate`, not `db push`.
2. **A1 Slot system** in one PR: drop the module + routes + workers + api-client methods + seed/mock + schema model/enum/columns together (they're interdependent — partial removal won't compile).
3. **A4 referral** — only after the product decision.
4. **A5 legacy aliases** — last, after screen/token migrations, lowest risk/again lowest value.
5. After each: `tsc` across all 5 packages + full test suite must stay green; round-trip the trial-booking + schedule flows (the two that touched slots most).

> **Keep this file current:** when a later phase makes something dead, add it here in the same commit — don't rely on memory at cleanup time.
