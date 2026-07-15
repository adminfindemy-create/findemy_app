# Findemy — Phase Plans

> Detailed, per-phase build plans derived from [`../master-execution-plan.md`](../master-execution-plan.md). One folder per phase; each phase folder has a **README** (phase overview + order + exit criteria) and **one file per slice** (the slice's detailed plan, in the Feature Master Plan shape of master-execution-plan §3.2).

## How to use
1. **Read [`deviations-and-deferrals.md`](./deviations-and-deferrals.md) first** — where the *implemented* code departs from these plans, and what was deferred (with the downstream owner). Always check it before planning or building a later phase.
   - See also [`dead-code-registry.md`](./dead-code-registry.md) — the running list of **dead/dormant/superseded code** to remove in one deliberate cleanup pass (Slot system, reschedule, referral, legacy aliases). Add to it in the same commit whenever a phase makes something dead.
   - And [`pre-production-checklist.md`](./pre-production-checklist.md) — the **launch gates** (secrets, DB migrations/DF5, native dev-builds, smoke tests) that can't be done in the dev sandbox. The single most impactful: `EXPO_ACCESS_TOKEN` (all push is a no-op without it).
2. Open the phase folder, read its `README.md` (order, dependencies, exit criteria).
3. Pick a slice file — it's that slice's **Feature Master Plan**: cross-side impact, the shared contract, per-side component design, the sync map, and a Definition of Done.
4. Build it **backend-first → publish the handoff → both apps fan out** (master plan §0.3 / §3.3).
5. Honour the rails in master plan §1 (money in paise, idempotency, IST, `backend/shared/types` as the single contract source). *(Attendance OTP is now 4-digit per S2.2; shared tunables live in `@findemy/types` + `backend/api/src/config.ts` per deviation D2.)*

## Phases

| Phase | Theme | Status |
|---|---|---|
| **[P0 — Rails & cleanup](./P0-rails-and-cleanup/)** | shared contract, discards, auth+onboarding, seed | ✅ planned · **✅ implemented & verified** |
| **[P1 — Discover & profile](./P1-discover-and-profile/)** | academy profile + gallery, discovery, batch model | ✅ planned · **✅ implemented & verified** |
| **[P2 — Conversion loop](./P2-conversion-loop/)** | trial booking, trial OTP, enrol+plans, payments+commission | ✅ planned · **✅ implemented & verified** |
| **[P3 — Classes & attendance](./P3-classes-and-attendance/)** | Classes tab, in-studio QR, online live, schedule+cancel | ✅ planned · **✅ backends implemented & verified** (native A/V + camera UIs scaffolded — dev-build TODO) |
| [P4 — Manage & community](./P4-manage-and-community/) | roster/tiers, coaches, reviews, workshops, events, earnings | ✅ planned · **✅ backends implemented & verified** (2 UI reorgs — Filters sheet, coach-assign — pending) |
| [P5 — Account & polish](./P5-account-and-polish/) | profile/bookings, notifications, design parity, **cleanup** | ✅ planned · **✅ S5.1–S5.3 implemented & verified**; S5.4 partial (live slot-reads rewritten; model-drop + migrations deferred, perms-gated) |

> **Plan a phase before starting it.** Author the rest the same way P0 was done — don't run ahead of the plan.

> **Related, separate initiative:** [`docs/student-app-features-plan/`](../../../docs/student-app-features-plan/) — a new batch of student-app features (Pending/Missed Classes, Class Notes, 1:1 tutor booking, Fees Renewal rollups, Dashboard, Attendance Tracker, Resources, Chat/Support). Uses its own `plan.md`/`feature-dependency.md`/`slice.md` shape rather than this folder's phase-per-slice convention, but cites this plan's file paths and precedents throughout (e.g. reuses the S3.1 classes-tab decision).

## Pre-requisite (Step 0, once)
The folder reorg left `node_modules` stale (symlinks point at the old `apps/`+`packages/` paths). Before any build:
```bash
pnpm install        # relink @findemy/* to backend/ + student-app/ + academy-app/
```
