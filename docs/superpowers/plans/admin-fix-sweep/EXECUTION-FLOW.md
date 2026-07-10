# Admin Fix Sweep — Execution Flow

**Parent:** [00-MASTER-PLAN.md](./00-MASTER-PLAN.md)

This document defines the ordering, the dependency rationale, parallelization options, and the global verification gate for the seven groups.

> ⚠️ **NO git.** Every task in every sub-plan ends with a verification **Checkpoint**, not a commit. Do not init/commit.

---

## Dependency graph

```
            ┌─────────────────────────────────────────┐
            │  A — API contract & data drift           │  (entry point, no deps)
            │  • attendance user_id  (backend)         │
            │  • /studio/batches/:id/slots (backend)   │
            │  • slot_id on ScheduleItem (backend+type)│
            │  • StudentCard batches shape             │
            │  • settings per-level crash guards       │
            └───────────────┬─────────────────────────┘
                            │ (everyone assumes corrected contracts)
        ┌──────────┬────────┼─────────┬──────────┬──────────┐
        ▼          ▼        ▼         ▼          ▼          ▼
   ┌────────┐ ┌────────┐ ┌──────┐ ┌────────┐ ┌────────┐
   │   B    │ │   C    │ │  D   │ │   E    │ │   F    │   (independent; run in any order / parallel)
   │ auth   │ │ cache  │ │ flow │ │ sched  │ │ push   │
   │ guards │ │ hygiene│ │ +money│ │ +tz   │ │ inbox  │
   └────┬───┘ └───┬────┘ └──┬───┘ └───┬────┘ └───┬────┘
        │         │         │         │          │
        └─────────┴────┬────┴─────────┴──────────┘
                       ▼
                 ┌───────────┐
                 │     G     │  (last — re-touches B–F files; consumes D's format.ts)
                 │ polish /  │
                 │ forms /   │
                 │ theme     │
                 └───────────┘
```

## Recommended order

```
A  →  B · C · D · E · F  →  G
```

### Why A first (hard prerequisite)

A fixes the **contracts every other group reads**:
- **`slot_id` on schedule items** — Group C's reschedule/cancel in-flight guards and Group E's slot-time math both operate on the schedule item; they assume `item.slot_id` exists.
- **`user_id` on attendance** — anything touching the attendance screen assumes the corrected field.
- **`/studio/batches/:id/slots` (academy-auth endpoint)** — Group C adds the token guard to `useBatchSlots`; pointless until the endpoint returns 200 instead of 403.
- **Settings per-level guards** — Group C's optimistic settings update (C5) builds on A's corrected access.

Starting B–F before A means writing code against contracts that are about to change.

### Why B–F are mutually independent

They touch disjoint surfaces:
- **B** — `app/(auth)/*`, `app/_layout.tsx`, `src/stores/auth.ts`, `src/stores/onboarding.ts`
- **C** — `src/hooks/useStudioQueries.ts` (+ small edits in `schedule.tsx`, `workshops/[id].tsx`, `settings.tsx`)
- **D** — `app/reviews/[id]/respond.tsx`, `app/workshops/*`, `app/trial/[id].tsx`, `app/earnings.tsx`, `app/batches/new.tsx`, new `src/lib/format.ts`
- **E** — `app/(tabs)/schedule.tsx`, `app/schedule/publish.tsx`, `app/(tabs)/studio.tsx`, `src/components/ScheduleDay.tsx`, backend `slots`/`studio`, new `ist.ts`
- **F** — `app/(tabs)/inbox.tsx`, `src/stores/inbox.ts`, `src/hooks/usePushNotifications.ts`, `app/(tabs)/_layout.tsx`, `app/profile/edit.tsx`, `src/lib/api.ts`, `src/components/Screen.tsx`

**Overlap watch:** C, E, and G all edit `app/(tabs)/schedule.tsx`. If running B–F in parallel across worktrees, serialize the schedule-tab edits (A → E → C ordering for that file), then let G sweep it last. The same caution applies to `settings.tsx` (A then C) and `workshops/[id].tsx` (C then D).

### Why G last

G is the breadth/cleanup group: theme-drift sweep, accessibility labels, loading/error states, form correctness (category picker, dead inputs), and earnings polish that consumes **Group D's `format.ts`**. It re-touches files every other group edits, so running it last avoids merge churn and lets it verify against the final state.

## Parallelization options

- **Sequential (simplest):** A → B → C → D → E → F → G. Safest; one checkpoint surface at a time.
- **Fan-out after A:** complete A, then dispatch B/C/D/E/F as parallel subagents (each its own sub-plan), then G. Honor the overlap-watch serialization above for `schedule.tsx` / `settings.tsx` / `workshops/[id].tsx`.

## Global verification gate (run after G)

```bash
cd /home/mp2sslrl/code/code
export PATH="$HOME/.local/bin:$PATH"

# 1. Everything type-checks
pnpm --filter @findemy/types     typecheck
pnpm --filter @findemy/api-client typecheck
pnpm --filter @findemy/api       typecheck
pnpm --filter @findemy/admin     typecheck

# 2. Backend unit tests (attendance serializer, IST helpers, slot dedupe)
pnpm --filter @findemy/api test

# 3. Lint
pnpm --filter @findemy/admin lint
```

**Expected:** all typecheck commands exit 0; vitest green; biome clean.

### Manual smoke flows (device / simulator)

After the gate passes, exercise the previously-broken critical paths:
1. **Attendance** — open a batch → Attendance → toggle individual students → Save → confirm only the tapped rows change and the POST succeeds.
2. **Schedule** — cancel a class and reschedule a class → both succeed (no 404) and the tab updates without a manual refresh.
3. **Slots** — open Publish → the "Published slots" list loads (no 403) → publish, edit, delete reflect immediately.
4. **OTP** — request OTP → Resend → the newly received code verifies successfully.
5. **Review respond** — from a filtered tab, tap Respond → see a loading state (not "Review not found") → submit; on a forced failure, see an error alert (no silent navigation).
6. **Profile photo** — upload and delete a profile image → succeeds via the shared client (survives a token refresh).
