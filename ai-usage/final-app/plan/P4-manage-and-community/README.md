# P4 — Manage & community

> **Goal.** The academy's management surface + social proof + ancillary revenue: a **students roster** with real attendance tiers/filters, **coaches**, **reviews from trial *or* enrolment**, **workshops** (online/offline, non-refundable), **events** (browse/register), and **earnings net of commission**.
>
> **Source:** [`../../master-execution-plan.md`](../../master-execution-plan.md) §P4. Code state **re-grounded against the post-P3 code (2026-06-28)** via four read-only maps. **Read [`../deviations-and-deferrals.md`](../deviations-and-deferrals.md) + [`../dead-code-registry.md`](../dead-code-registry.md) first** — P4 builds on P2 commission (S2.4) + P3 attendance (S3.2/S3.3).

## ✅ Implementation status (2026-06-28)
**All six slice backends implemented; every change round-trip-verified. 5 packages typecheck, 58 tests green.**

| Slice | Backend | Apps | Verified |
|---|---|---|---|
| **S4.4** Workshops | ✅ enum 4→2 (seed cleaned), refund branch removed (non-refundable), **workshop commission recorded** | ✅ academy type grids 4→2 | round-trip ✓ (commission 39900→5985@15%) |
| **S4.5** Events | ✅ documented platform-owned (no `academyId` → no commission) | — (Findemy-curated) | n/a (REUSE) |
| **S4.6** Earnings | ✅ net = gross − ledger (trial/enrol/workshop); `gross/commission/net` per headline/category/batch/txn; dashboard net | ✅ earnings.tsx shows net, dropped `×0.85` | round-trip ✓ (9900→1485→8415) |
| **S4.3** Reviews | ✅ schema (trialId/enrollmentId nullable-unique, `source`, `@@unique([userId,academyId])`); trial(attended)/enrol gate; 409 dup; canonical count | ✅ student review screen + Classes-tab entry; post-trial updated | round-trip ✓ (trial/dup-409/enrol/403) |
| **S4.1** Roster tiers | ✅ **`present/expected` denominator** (sessionsPerMonth×months), `at_risk`→`irregular`, %/tier in reads, renewal date, batch-filter scoping | ✅ pill rename + row tier/% badges + batch-hub 3-band fix; ⚠️ **Filters sheet (category-chip reorg) pending** | round-trip ✓ (2/16→13%=Inactive) |
| **S4.2** Coaches | ✅ `batch_count`, `GET /coaches/:id` (+batches), assign coach-ownership check | ✅ list batch-count; ⚠️ **coach-detail assigned-batches + assign affordance pending** | round-trip ✓ (count/detail/cross-academy-block) |

> **✅ The two UI follow-ups are now DONE (2026-06-29):** S4.1's **Batch×Attendance Filters sheet** (category chips dropped; sheet drives `batch_id`+`attendance_tier`) and S4.2's **coach-detail assigned-batches + assign-to-batch picker** (via `GET /coaches/:id` + the ownership-checked batch update). Both typecheck-clean.

## Slices
| Slice | What | Status mix | Deps |
|---|---|---|---|
| [**S4.1**](./S4.1-roster-tiers-filters.md) | Students **roster** — Active/Irregular/Inactive tiers, %, Batch×Attendance **Filters sheet** | CHANGE (rename + UI build) | S3.2/S3.3 |
| [**S4.2**](./S4.2-coaches.md) | **Coaches** — list/detail/add, assign-to-batch, batch-count | REUSE + small CHANGE | S1.3 |
| [**S4.3**](./S4.3-reviews-eligibility.md) | **Reviews** from trial **OR** enrolment; academy responds | CHANGE (schema) / BUILD (student entry) | S2.3 |
| [**S4.4**](./S4.4-workshops.md) | **Workshops** online/offline, **non-refundable**, commission recorded | CHANGE | S2.4 |
| [**S4.5**](./S4.5-events.md) | **Events** browse/register (free/paid), commission recorded | REUSE + commission fix | S2.4 |
| [**S4.6**](./S4.6-earnings.md) | **Earnings** net of commission (gross / commission / net) + today's | CHANGE | S2.4, **S4.4, S4.5** |

## Order (solo dev)
```
S4.4  workshops: enum 4→2 (clean seed first), drop refund branch, RECORD workshop commission   # unblocks complete earnings
S4.5  events: REUSE/confirm — NO commission (platform-owned, no academyId)
S4.6  earnings: net = Payment − CommissionLedger (trial/enrol/workshop; events gross-only)       # depends on S4.4
S4.3  reviews: schema (trialId optional + enrollmentId/source + (user,academy) unique), gate, student entry
S4.1  roster: fix the % denominator (expected sessions), rename at_risk→irregular, %/tier, Filters sheet
S4.2  coaches: batch-count + detail route + assign-to-batch w/ ownership check (mostly REUSE)
```
> **Why this order:** S4.6 ("earnings net of commission") is only correct once every *commissionable* revenue type writes to `CommissionLedger`. Today only **trials + enrolments** do (S2.4); **workshops do NOT** (verified gap) — so **S4.4 must add the workshop commission before S4.6**. **Events are excluded** (no `academyId` → platform-owned, no commission — §8). S4.1/S4.2/S4.3 are independent and can run anytime.

## 🔗 Sync with executed code (read before starting) — verified 2026-06-28
1. **Roster tier is server-side but the value is `at_risk`** (`studio/repo.ts:322-344`, thresholds ≥75 / 50-74 / <50). `GET /studio/students` does **not** return %/tier in rows (`repo.ts:266-281`); only `GET /studio/batches/:id/students` returns `attendance_pct` (no tier). The academy roster (`students.tsx`) has a **frontend-only** Music/Dance/Arts/Yoga chip bar (to drop) and **no Filters sheet**. `batches/[id]/index.tsx:99` also renders `at_risk`. Tiers already derive from **`BatchAttendance`** (real P3 data) ✓.
2. **Coaches are structurally aligned** (`coaches/*` CRUD; `Batch.coachId` FK; coach name shown on student program/batch). No coach **batch-count** is derived, and assignment happens only at **batch create/edit** (no separate assign endpoint) — mostly REUSE.
3. **`Review.trialId` is required + `@unique`** (`schema.prisma:397-415`) → structurally blocks enrolment reviews. **No** `enrollmentId`/`source`; **no** `@@unique([userId, academyId])`. The student app has **no review-creation UI at all** (neither post-trial nor enrolled — both must be built). The **canonical count already exists** via `getReviewsSummary` groupBy (`studio/repo.ts:437-462`); the "84-vs-32" bug is the **stale `Academy.ratingCount`** cache (written in `reviews/service.ts:41`) — fix by reading the groupBy everywhere (or recomputing the cache correctly). Academy reviews list + respond REUSE.
4. **`WorkshopType` = online|offline|masterclass|demo** (`schema.prisma:450-458`); narrow to **online|offline**. The **24h refund branch** is `workshops/service.ts:206-232` (remove → non-refundable). Academy type grid `workshops/new.tsx:31-36` + `TYPE_LABELS` `(tabs)/workshops.tsx:19-24` (4→2). Student cancel UI auto-corrects once the backend stops returning `refund_eligible`.
5. **⚠️ Commission gap (cross-slice):** `payments/service.ts` records commission on **trial** (`:233`) + **enrolment** (`:129`) capture, but **NOT on workshop** (`:188-211`). **S4.4 must add the workshop call; S4.6 depends on it.** *(Events are the exception — see §8.)*
8. **✅ Events carry NO commission (review-resolved).** `Event` has only `organizerName`, **no `academyId`** (`schema.prisma:419-442`), and `recordCommission` requires a non-null `academyId` — so Findemy-curated events are **platform-owned, 100% to the platform**. S4.5 is therefore near-pure REUSE (no commission write, no meetup reversal); S4.6 nets only trial/enrolment/workshop.
9. **🔴 Roster % is structurally broken today (review-caught, CRITICAL for S4.1).** Only `present:true` rows are written to `BatchAttendance` (S3.2 removed manual marking; no `recordAbsent`), so the current `present/total` calc returns **100% for every student**. S4.1 must compute the denominator from **expected** sessions — `Batch.sessionsPerMonth` (added S3.4) × months-enrolled — not from attendance rows.
6. **Earnings is GROSS** (`studio/repo.ts:508-628 getEarnings` sums captured `Payment`/`EnrollmentPayment`/`WorkshopPayment`, no ledger join); dashboard shows **this-month gross** (`repo.ts:6-74`); the academy UI **hardcodes `×0.85`** as a client-side payout guess (`earnings.tsx:117`). S4.6 nets via `CommissionLedger` (join on `(itemType,itemId)`, sum `commissionPaise − reversedPaise` where `status='accrued'`).
7. **Events are complete + Findemy-curated** (no academy surface — correct per product). Cancellation is already **type-scoped** (no flat-24h refund branch to remove). Only the commission-recording gap (§5) applies.

## P4 exit criteria (phase Definition of Done)
- [ ] Roster filters "Guitar + Irregular" → right students with **% + tier** (derived from real attendance); `at_risk` gone everywhere; Filters sheet works; student detail shows tier + renewal date.
- [ ] Add a coach → assign to a batch → appears on the student program screen; coach shows its batch-count.
- [ ] An **enrolled (never-trialed)** student can post a review; a never-trial/never-enrolled user cannot; academy responds; the academy's review count is canonical (no 84-vs-32).
- [ ] Academy publishes an **Offline** workshop; student registers + pays; cancel offers **no refund**; the workshop payment **records commission**.
- [ ] Student registers for a **free** event + pays for a **paid** one (events keep 100% — **no** commission, by design).
- [ ] A paid enrolment **and** a paid workshop each show **gross, commission, net** in earnings + today's-earnings (net, not gross); event lines show gross == net.
- [ ] An **under-attender** (e.g. 2 of ~8 expected) reads **Inactive**, not Active — the % denominator is expected sessions, not present-rows.
- [ ] All 5 packages typecheck; backend boots; **full suite stays green**; every backend change round-trip-verified.

## Decisions (✅ owner-locked 2026-06-28)
1. **`Review` uniqueness = one per `(user, academy)`** from either path (drop `trialId @unique`; add `@@unique([userId, academyId])`; `trialId` optional + `enrollmentId` + `source @default(trial)`). A trial-then-enrol student keeps their single review. ✅
2. **Trial review eligibility = `attended` only** (not booked/missed/cancelled). ✅
3. **Attendance-tier denominator = `sessionsPerMonth × months-enrolled`** (the cheap estimate; ignores cancellations) — uses the S3.4 field. ✅
4. **Events = platform keeps 100%** (no `Event.academyId`, no commission, no academy authoring) — Findemy-curated. ✅
5. **Rating count stays in `Academy.ratingCount`, recomputed from the full set on every create** (keeps the student-facing readers + the sort correct); any future review-delete path must recompute. ✅
6. **Earnings shape:** add `gross_paise`/`commission_paise`/`net_paise` (non-breaking); UI drops the hardcoded `×0.85`. Commission rate stays **15%** (env `COMMISSION_BPS`, team can retune). ✅
7. **Payouts deferred** — P4 shows earnings only; `Payout` stays as-is. ✅
8. **Coach assign-to-batch** reuses `PUT /studio/batches/:id { coach_id }` (+ coach-ownership check) + a derived `batch_count`; no new assignment endpoint. ✅
