# Group A — Data Contract Drift — Sub-Plan
**Parent:** [00-MASTER-PLAN.md](./00-MASTER-PLAN.md)
**Goal:** Fix trial API↔client field drift so dates render, coach name shows, dead status checks go, and useTrial is guarded.
**Depends on:** nothing. **Blocks:** Group B, Group C (they assume correct trial data).

---

## Context / verified line-number corrections

Before writing any code, the cited files were re-read. The audit line numbers had drifted; the **verified** locations are:

- **A1** — `apps/student/app/trials/index.tsx` reads `trial.scheduled_at` inside the **inline local** `TrialCard` component (not the shared one): lines **73**, **74**, **93**. The shared `apps/student/src/components/TrialCard.tsx` reads `trial.scheduled_at` at line **24** and already declares `coach_name?` in its type (line **17**) — but its date field is still `scheduled_at` at line **16**.
- **A2** — `apps/student/app/trials/[id].tsx` renders the coach `Card` at lines **410–421**. `packages/types/src/index.ts` already has `coach_name?` on the `Trial` type (line **175**). The Prisma `Batch.coach` relation **does exist** (schema line **127**), but `apps/api/src/modules/trials/repo.ts` selects `batch: { select: { title, category, trialFeePaise } }` (line **15**, and the matching `select` blocks at lines **39** and **56**) **without** `coach`. So the serializer cannot emit `coach_name` today — we must add the relation to all three repo includes and emit it from the serializer.
- **A3** — Dead `=== "completed"` check is at `apps/student/app/trials/[id].tsx` line **82** and `apps/student/app/trials/index.tsx` line **120**. (Note: `TrialCard.tsx` line **52** has `!== "completed"` disjuncts too, but that file is out of scope for Group A — leave it.)
- **A4** — `apps/student/src/hooks/useTrials.ts` `useTrial(id)` is at lines **16–20** with no `enabled`. Compare `useWorkshop` in `apps/student/src/hooks/useWorkshops.ts` line **15** which has `enabled: !!id`.
- **Test strategy correction** — MOCK mode (`apps/api/src/plugins/mock.ts`) short-circuits every route via fixture handlers **before** the real handler runs, so an `app.inject('/trials/...')` test would assert on `apps/api/src/mock/fixtures.ts` (which already emits `trial_at`/`coach_name`), **not** on the real `serializeTrial`. To actually guard the serializer contract we **export `serializeTrial`** and unit-test it directly with a fabricated Prisma row. This is the only way to prove the real serializer emits `trial_at` and `coach_name`.

`BookingDetailSheet.tsx` line **144** already has the `data.scheduled_at ?? data.trial_at ?? data.trialAt` fallback chain — **leave it untouched** (audit confirmed).

---

## Files touched

| File | Issue | Change |
| --- | --- | --- |
| `apps/api/src/modules/trials/repo.ts` | A2 | Add `coach: { select: { name: true } }` to the `batch` select in all three includes |
| `apps/api/src/modules/trials/service.ts` | A1, A2 | Export `serializeTrial`; emit `coach_name` from `batch.coach.name` |
| `apps/student/src/hooks/useTrials.ts` | A4 | Add `enabled: !!id` to `useTrial` |
| `apps/student/app/trials/index.tsx` | A1, A3 | Inline `TrialCard` reads `trial.trial_at ?? trial.scheduled_at`; drop dead `=== "completed"` |
| `apps/student/app/trials/[id].tsx` | A3 | Drop dead `trial.status === "completed"` disjunct in `canReview` |
| `apps/student/src/components/TrialCard.tsx` | A1 | Type gets `trial_at?`; read `trial.trial_at ?? trial.scheduled_at` |
| `apps/api/src/test/trials.test.ts` | A1, A2 | **New** vitest unit test asserting serializer emits `trial_at` + `coach_name` |

`packages/types/src/index.ts` already has `coach_name?` on `Trial` (line 175) — **no change needed** there for A2; the type already supports it.

---

## Tasks

### Task 1 — A2 (repo): load the `coach` relation on `batch`

**Files:** `apps/api/src/modules/trials/repo.ts` — three `batch: { select: {...} }` blocks at lines **15**, **39**, **56**.

1. In `findTrialsByUser` (line 15), add the `coach` sub-select.

   **Before:**
   ```ts
       include: {
         academy: { select: { name: true, address: true } },
         batch: { select: { title: true, category: true, trialFeePaise: true } },
         slot: { select: { slotTime: true } },
         booking: {
   ```
   **After:**
   ```ts
       include: {
         academy: { select: { name: true, address: true } },
         batch: { select: { title: true, category: true, trialFeePaise: true, coach: { select: { name: true } } } },
         slot: { select: { slotTime: true } },
         booking: {
   ```

2. In `findTodayTrialsByUser` (line 39), add the same `coach` sub-select.

   **Before:**
   ```ts
       include: {
         academy: { select: { name: true, address: true } },
         batch: { select: { title: true, category: true, trialFeePaise: true } },
         slot: { select: { slotTime: true } },
         booking: {
           select: {
             rescheduleCount: true,
   ```
   **After:**
   ```ts
       include: {
         academy: { select: { name: true, address: true } },
         batch: { select: { title: true, category: true, trialFeePaise: true, coach: { select: { name: true } } } },
         slot: { select: { slotTime: true } },
         booking: {
           select: {
             rescheduleCount: true,
   ```

3. In `findTrialById` (line 56), add the same `coach` sub-select.

   **Before:**
   ```ts
       include: {
         academy: { select: { name: true, address: true } },
         batch: { select: { title: true, category: true, trialFeePaise: true } },
         slot: { select: { slotTime: true } },
         user: { select: { attendanceOtp: true } },
   ```
   **After:**
   ```ts
       include: {
         academy: { select: { name: true, address: true } },
         batch: { select: { title: true, category: true, trialFeePaise: true, coach: { select: { name: true } } } },
         slot: { select: { slotTime: true } },
         user: { select: { attendanceOtp: true } },
   ```

4. **Checkpoint** — confirm all three batch selects now load the coach:
   ```bash
   grep -c "coach: { select: { name: true } }" apps/api/src/modules/trials/repo.ts
   ```
   Expect output: `3`.

---

### Task 2 — A1 + A2 (service): export the serializer and emit `coach_name`

**Files:** `apps/api/src/modules/trials/service.ts` — `serializeTrial` declared at line **5**, return object lines **14–37**; `trial_at` already emitted at line **21**.

1. Export `serializeTrial` so it can be unit-tested directly.

   **Before:**
   ```ts
   function serializeTrial(trial: Awaited<ReturnType<typeof repo.findTrialsByUser>>[number]) {
   ```
   **After:**
   ```ts
   export function serializeTrial(trial: Awaited<ReturnType<typeof repo.findTrialsByUser>>[number]) {
   ```

2. Emit `coach_name` from the now-loaded `batch.coach.name`. Add the field right after `batch_category` (line 29). The `as any` cast mirrors the existing `trialFeePaise` access on the next line and is safe because the coach relation is optional in the inferred type.

   **Before:**
   ```ts
       batch_title: trial.batch.title,
       batch_category: trial.batch.category,
       trial_fee_paise: (trial as any).batch.trialFeePaise ?? 0,
   ```
   **After:**
   ```ts
       batch_title: trial.batch.title,
       batch_category: trial.batch.category,
       coach_name: (trial as any).batch.coach?.name ?? null,
       trial_fee_paise: (trial as any).batch.trialFeePaise ?? 0,
   ```

3. **Checkpoint** — type-check the API and confirm the new field exists:
   ```bash
   grep -n "coach_name:" apps/api/src/modules/trials/service.ts && cd apps/api && npx tsc --noEmit
   ```
   Expect: the grep prints the `coach_name: (trial as any).batch.coach?.name ?? null,` line, and `tsc --noEmit` exits with **0 errors**.

---

### Task 3 — A1 + A2 (test): unit-test the serializer contract

**Files:** **new** `apps/api/src/test/trials.test.ts`. Follows the import/describe style of `apps/api/src/test/booking.test.ts`, but calls `serializeTrial` directly (MOCK mode would otherwise bypass the real serializer — see Context). No DB or app boot is needed because we feed a fabricated Prisma-shaped row.

1. Create `apps/api/src/test/trials.test.ts` with the full contents below.

   ```ts
   import { describe, it, expect } from 'vitest';
   import { serializeTrial } from '../modules/trials/service.js';

   // A fabricated row shaped like the Prisma include in repo.findTrialsByUser.
   // We cast to the serializer's parameter type because we only populate the
   // fields the serializer actually reads.
   function makeTrialRow(overrides: Record<string, unknown> = {}) {
     const trialAt = new Date('2026-07-01T10:30:00.000Z');
     return {
       id: 'trial-1',
       userId: 'user-1',
       academyId: 'academy-1',
       batchId: 'batch-1',
       slotId: 'slot-1',
       bookingId: 'booking-1',
       trialAt,
       status: 'booked',
       attendanceMarkedAt: null,
       attendanceMarkedByAccountId: null,
       createdAt: new Date('2026-06-01T00:00:00.000Z'),
       academy: { name: 'Raaga Music', address: '12 MG Road' },
       batch: {
         title: 'Guitar · Beginner',
         category: 'music',
         trialFeePaise: 0,
         coach: { name: 'Asha Rao' },
       },
       slot: { slotTime: trialAt },
       booking: {
         status: 'confirmed',
         rescheduleCount: 0,
         payment: { status: 'captured', amountPaise: 0, refundStatus: null },
       },
       ...overrides,
     } as unknown as Parameters<typeof serializeTrial>[0];
   }

   describe('serializeTrial', () => {
     it('emits trial_at as an ISO string (A1)', () => {
       const out = serializeTrial(makeTrialRow());
       expect(out.trial_at).toBe('2026-07-01T10:30:00.000Z');
       // It must NOT use the legacy scheduled_at key clients were drifting on.
       expect((out as Record<string, unknown>).scheduled_at).toBeUndefined();
     });

     it('emits coach_name from batch.coach.name (A2)', () => {
       const out = serializeTrial(makeTrialRow());
       expect(out.coach_name).toBe('Asha Rao');
     });

     it('emits coach_name as null when the coach relation is absent (A2)', () => {
       const out = serializeTrial(
         makeTrialRow({
           batch: { title: 'Guitar', category: 'music', trialFeePaise: 0 },
         }),
       );
       expect(out.coach_name).toBeNull();
     });

     it('mirrors a cancelled parent booking onto a still-booked trial', () => {
       const out = serializeTrial(
         makeTrialRow({
           status: 'booked',
           booking: {
             status: 'cancelled',
             rescheduleCount: 0,
             payment: { status: 'captured', amountPaise: 0, refundStatus: null },
           },
         }),
       );
       expect(out.status).toBe('cancelled');
     });
   });
   ```

2. **Checkpoint** — run only this test file:
   ```bash
   cd apps/api && npx vitest run src/test/trials.test.ts
   ```
   Expect: **1 passed** test file, **4 passed** tests, 0 failed.

---

### Task 4 — A4 (hook): guard `useTrial` with `enabled: !!id`

**Files:** `apps/student/src/hooks/useTrials.ts` — `useTrial` at lines **16–20**. Pattern mirror: `useWorkshop` in `apps/student/src/hooks/useWorkshops.ts` line **15**.

1. Add the `enabled` guard.

   **Before:**
   ```ts
   export const useTrial = (id: string) =>
     useQuery({
       queryKey: ["trial", id],
       queryFn: () => api.trials.get({ id }),
     });
   ```
   **After:**
   ```ts
   export const useTrial = (id: string) =>
     useQuery({
       queryKey: ["trial", id],
       queryFn: () => api.trials.get({ id }),
       enabled: !!id,
     });
   ```

2. **Checkpoint** — confirm the guard is present:
   ```bash
   grep -n "enabled: !!id" apps/student/src/hooks/useTrials.ts
   ```
   Expect: one match printing the `enabled: !!id,` line inside `useTrial`.

---

### Task 5 — A1 (index screen): read `trial_at` with `scheduled_at` fallback

**Files:** `apps/student/app/trials/index.tsx` — inline local `TrialCard` at lines **71–128**; `scheduled_at` reads at lines **73**, **74**, **93**.

1. Fix the `isToday` / `isPast` derivations (lines 73–74).

   **Before:**
   ```ts
   function TrialCard({ trial, onPress }: { trial: any; onPress: () => void }) {
     const theme = useTheme();
     const isToday = new Date(trial.scheduled_at).toDateString() === new Date().toDateString();
     const isPast = new Date(trial.scheduled_at) < new Date();
   ```
   **After:**
   ```ts
   function TrialCard({ trial, onPress }: { trial: any; onPress: () => void }) {
     const theme = useTheme();
     const trialAt = trial.trial_at ?? trial.scheduled_at;
     const isToday = new Date(trialAt).toDateString() === new Date().toDateString();
     const isPast = new Date(trialAt) < new Date();
   ```

2. Fix the rendered date (line 93) to use the same `trialAt` local.

   **Before:**
   ```ts
         <Text style={{ fontFamily: theme.font.sans, fontSize: 14, color: theme.color.mist, marginTop: 4 }}>
           {new Date(trial.scheduled_at).toLocaleDateString("en-IN", {
             weekday: "short",
             day: "numeric",
             month: "short",
             hour: "2-digit",
             minute: "2-digit",
           })}
         </Text>
   ```
   **After:**
   ```ts
         <Text style={{ fontFamily: theme.font.sans, fontSize: 14, color: theme.color.mist, marginTop: 4 }}>
           {new Date(trialAt).toLocaleDateString("en-IN", {
             weekday: "short",
             day: "numeric",
             month: "short",
             hour: "2-digit",
             minute: "2-digit",
           })}
         </Text>
   ```

3. **Checkpoint** — confirm no `scheduled_at` reads remain in this file:
   ```bash
   grep -n "scheduled_at" apps/student/app/trials/index.tsx
   ```
   Expect: only the **fallback** occurrences `trial.trial_at ?? trial.scheduled_at` (one, on the new `trialAt` line). No bare `new Date(trial.scheduled_at)` calls remain.

---

### Task 6 — A3 (index screen): drop the dead `=== "completed"` review branch

**Files:** `apps/student/app/trials/index.tsx` — line **120**. `TrialStatus` is `booked|attended|missed|cancelled` (schema lines 292–297), so `status === "completed"` is never true and this whole branch is dead. The "leave a review" affordance lives in the detail screen guarded by `isPast` (Task 7), so deleting this dead block loses no behaviour.

1. Remove the dead block (lines 120–124).

   **Before:**
   ```ts
           {trial.status === "completed" && !trial.reviewed && (
             <View style={{ marginTop: 12, alignSelf: "flex-start" }}>
               <Button variant="ghost" onPress={() => {}}>Leave a review</Button>
             </View>
           )}
         </Card>
   ```
   **After:**
   ```ts
         </Card>
   ```

2. **Checkpoint** — confirm the dead string is gone from this file:
   ```bash
   grep -n '"completed"' apps/student/app/trials/index.tsx
   ```
   Expect: **no output** (exit code 1).

---

### Task 7 — A3 (detail screen): drop the dead `=== "completed"` disjunct in `canReview`

**Files:** `apps/student/app/trials/[id].tsx` — `canReview` at lines **81–83**. Keep the `isPast` guard; drop only the impossible `trial.status === "completed"` disjunct.

1. Simplify `canReview`.

   **Before:**
   ```ts
     const canReview =
       trial.status === "completed" ||
       (isPast && trial.status !== "cancelled" && trial.status !== "attended");
   ```
   **After:**
   ```ts
     const canReview =
       isPast && trial.status !== "cancelled" && trial.status !== "attended";
   ```

2. **Checkpoint** — confirm `"completed"` no longer appears in this file:
   ```bash
   grep -n '"completed"' apps/student/app/trials/[id].tsx
   ```
   Expect: **no output** (exit code 1). (Note: `coach_name` rendering at lines 410–421 is now live because Task 2 emits it — no change needed here.)

---

### Task 8 — A1 (shared TrialCard component): type + read `trial_at`

**Files:** `apps/student/src/components/TrialCard.tsx` — type field at line **16**, usage at line **24**. The type already declares `coach_name?` (line 17), so only the date field needs `trial_at` added.

1. Add `trial_at?` to the prop type and keep `scheduled_at?` as the legacy fallback.

   **Before:**
   ```ts
     trial: {
       id: string;
       batch_title: string;
       status: string;
       scheduled_at: string;
       coach_name?: string;
     };
   ```
   **After:**
   ```ts
     trial: {
       id: string;
       batch_title: string;
       status: string;
       trial_at?: string;
       scheduled_at?: string;
       coach_name?: string;
     };
   ```

2. Read `trial_at` with the `scheduled_at` fallback (line 24).

   **Before:**
   ```ts
     const theme = useTheme();
     const date = new Date(trial.scheduled_at);
   ```
   **After:**
   ```ts
     const theme = useTheme();
     const date = new Date(trial.trial_at ?? trial.scheduled_at ?? "");
   ```

3. **Checkpoint** — confirm the component now prefers `trial_at` and the type carries it:
   ```bash
   grep -n "trial_at" apps/student/src/components/TrialCard.tsx
   ```
   Expect: two matches — the `trial_at?: string;` type field and the `trial.trial_at ?? trial.scheduled_at ?? ""` read.

---

### Task 9 — Group-A final verification

**Files:** none (verification only).

1. Type-check the API package (covers Tasks 1–3).
   ```bash
   cd apps/api && npx tsc --noEmit
   ```
   Expect: **0 errors**.

2. Run the new serializer test (covers Tasks 1–3).
   ```bash
   cd apps/api && npx vitest run src/test/trials.test.ts
   ```
   Expect: **4 passed**, 0 failed.

3. Prove every bad client pattern is gone (covers Tasks 4–8).
   ```bash
   grep -rn '"completed"' apps/student/app/trials
   grep -rn 'new Date(trial.scheduled_at)' apps/student/app/trials apps/student/src/components/TrialCard.tsx
   grep -rn 'enabled: !!id' apps/student/src/hooks/useTrials.ts
   ```
   Expect:
   - first grep: **no output** (no dead `"completed"` checks remain in the trials screens),
   - second grep: **no output** (no bare `scheduled_at` date reads remain),
   - third grep: **one match** (the `useTrial` guard).

4. **Checkpoint** — Group A is complete when steps 1–3 all match their expected output. Hand off to Group B / Group C, which can now assume `trial_at` and `coach_name` are present on serialized trials.
