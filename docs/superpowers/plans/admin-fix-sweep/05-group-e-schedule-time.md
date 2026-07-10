# Group E — Schedule timezone correctness & dashboard accuracy — Sub-Plan
**Parent:** [00-MASTER-PLAN.md](./00-MASTER-PLAN.md)
**Goal:** Make slot wall-clock times consistent across every creation/edit/display path (one fixed app timezone), fix the week-strip count bucketing, stop "Publish whole week" from silently duplicating slots, show the real review total on the Studio dashboard, and clean up two small display bugs in the schedule screen.
**Depends on:** Group A (schedule/inbox items now carry `slot_id`; reschedule/cancel call `item.slot_id ?? item.id`). **Blocks:** nothing.

---

## The single timezone convention (decided before writing tasks)

This is the trickiest decision in the sweep, so it is settled here once and every task obeys it.

**Observed reality (verified, not assumed):**
- There is **no per-academy IANA timezone** anywhere — `grep -rn "Asia/Kolkata|timeZone|IST"` over `apps/api/src` and `apps/admin` returns only a worker cron comment and unrelated strings. The `Academy`/`Slot`/`Batch` Prisma models have no tz column (schema `model Slot` lines 175-190 — `slotTime DateTime`, nothing else).
- The server builds slot instants with **server-local** `new Date(dateStr); .setHours(h,m,0,0)` (`apps/api/src/modules/slots/service.ts` lines 22-23 grid mode, 34-38 quick mode). `new Date('2026-06-10')` parses as **UTC midnight**, then `.setHours` mutates in **server-local** time — so the produced instant already depends on the server's TZ env. In production that is undefined/unstable.
- The client (`schedule.tsx`, `publish.tsx`) reads those UTC instants back with **`new Date(iso).getHours()` / `.setHours()`** (device-local) while bucketing/labelling with **`toISOString().slice(0,10)`** (UTC). Local-vs-UTC mixing → off-by-offset times and mis-bucketed day badges (bugs E1, E2).

**Why we are NOT "constructing in the studio's tz server-side" literally:** there is no stored studio tz to construct from, and adding a per-academy IANA field + a tz library (`@date-fns/tz` / Luxon) + a migration is a feature, not a fix, and is explicitly out of scope (db is `db push`, no migration files; see MEMORY). Inventing `Intl`-based IANA math with no source tz would be guessing.

**Chosen convention — one fixed app timezone (IST, UTC+05:30), applied identically on both sides.** Findemy is an India-market product (the worker comment literally annotates `09:00 IST`). IST has **no DST**, so a fixed `+05:30` offset is exact and DST-free — no tz library needed. The rule, everywhere:

> A slot's **wall-clock time** (the "6:00 PM" a coach types) is an **IST wall-clock**. We store the corresponding **UTC instant** in `slotTime`. We compose UTC-from-IST-wall-clock when **creating/editing**, and we derive the IST date + IST hours when **bucketing/displaying**.

Concretely this means two tiny, symmetric helpers — one per package — both pure offset math (`±330` minutes), no dependencies:

- **Server** `apps/api/src/lib/ist.ts`: `istWallClockToUtc(dateStr, hh, mm)` → `Date` (the UTC instant whose IST wall-clock is `dateStr hh:mm`); `istDateKey(d)` → `'yyyy-MM-dd'` IST date of an instant.
- **Client** `apps/admin/src/lib/ist.ts`: `istDateKey(iso|Date)` → IST `'yyyy-MM-dd'`; `setIstWallClock(iso, hh, mm)` → ISO string of the UTC instant for IST wall-clock `hh:mm` on the IST day of `iso`.

The client **stops** calling `Date.prototype.setHours/getHours` for slot math (those are device-local and were the root cause); it uses these helpers + `date-fns format` for display only. `date-fns format(new Date(iso), 'h:mm a')` renders in **device-local** time — acceptable for display because Indian coaches' devices are in IST, and crucially the *bucketing* (the part that was wrong) is now offset-exact. (A fully device-tz-independent display would require formatting through the offset too; that is noted as an honest residual at the end, not fixed, to keep scope tight.)

This convention fixes E1 (creation paths now agree — both compose UTC from an IST wall-clock) and E2 (bucketing keys are IST on both server emit and client strip).

---

## Context / verified line-number corrections

The cited files were re-read; audit line numbers were mostly accurate. Verified locations:

- **E1a** — `apps/admin/app/(tabs)/schedule.tsx` `RescheduleModal.handleConfirm`: `const base = new Date(item?.start_time ?? '')` line **51**, `base.setHours(hh, mm, 0, 0)` line **53**, `onConfirm(base.toISOString())` line **54**. (Audit "~51-54" ✓.)
- **E1b** — `apps/admin/app/schedule/publish.tsx` `onConfirmEdit`: `const base = new Date(editingSlot.slot_time)` line **109**, `base.setHours(hh, mm, 0, 0)` line **110**, `mutateAsync({ ... slot_time: base.toISOString() })` line **112**. Also `onEditTime` seeds the field with `format(new Date(slot.slot_time), 'HH:mm')` line **98** (device-local read — replace with IST read).
- **E1c (server)** — `apps/api/src/modules/slots/service.ts` grid mode lines **20-30** (`new Date(s.date); slotTime.setHours(h,m,0,0)`), quick mode lines **33-46** (`new Date(dateStr)` → per-timing `setHours`). `publishSlots` is already `export`ed (line 6). `repo.createSlots` is a bare `prisma.slot.createMany` (`apps/api/src/modules/slots/repo.ts` lines 10-14) — **no dedupe**.
- **E2** — `schedule.tsx`: `batchCountByDate[day.date] = (day.items ?? []).length` line **110** (key = server `day.date`); strip pill key `const dateStr = format(day, 'yyyy-MM-dd')` line **177**, lookup `batchCountByDate[dateStr]` line **179**; day header `format(new Date(day.date + 'T12:00:00'), ...)` lines **243-244**. Server emits `day.date = slot.slotTime.toISOString().slice(0,10)` at `apps/api/src/modules/studio/repo.ts` line **175** (UTC date) — change to IST date key.
- **E3** — `publish.tsx` `onSameAsLastWeek` lines **65-76** (button "Publish whole week" line 210, toast "Published week from template" line 72; iterates `addDays(date, i)` from the **selected** date, not last week / not a template). Re-publish duplicates because of E1c no-dedupe.
- **E4** — `apps/admin/app/(tabs)/studio.tsx` `reviewCount = dashboard?.recent_reviews?.length ? String(...) : undefined` lines **72-74**. `recent_reviews` is the capped `take: 5` preview from `studio/repo.getDashboardStats` (line **47-52, 63**). `useStudioReviewsSummary()` exists (`apps/admin/src/hooks/useStudioQueries.ts` line **194**) returning `ReviewsSummary` with `.count` (server `getReviewsSummary` returns `{ average, count, breakdown, needs_reply }`, repo lines 407-432). `aca.rating_count` is also already rendered in `ratingLabel` (studio.tsx line 78) — but it comes from the academy object, not a reviews count, so we use the summary's `count` (true total of `Review` rows).
- **E5** — `apps/admin/src/components/ScheduleDay.tsx`: `new Date(date)` label line **17** (UTC-parses), raw `{item.start_time} – {item.end_time}` lines **40-42** (full ISO). **Verified DEAD**: `grep -rn "ScheduleDay" apps/admin` returns only its own declaration (no imports). Per audit instruction, fix anyway (cheap, removes a latent footgun) but mark it as dead in the Files table.
- **E6** — `schedule.tsx` `const ampm = start.getHours() >= 12 ? 'PM' : 'AM'` line **266**; rendered `{format(start, 'h:mm')}` line **279** and `{ampm} · …` line **290**. (`start.getHours()` is device-local — collapsing into `format(start,'h:mm a')` removes the redundancy and the second local-hours call.)
- **E7** — `schedule.tsx` `RescheduleModal` `const [timeStr, setTimeStr] = useState('')` line **41**; never reset when `visible` flips true. Modal is mounted persistently (always rendered, `visible={!!rescheduleItem}` line 377) so state survives close/reopen.
- **ScheduleItem type** — `packages/types/src/index.ts` lines **269-275** has `start_time`/`end_time` strings; no change needed.
- **Test infra** — vitest is configured (`apps/api/src/test/*.test.ts`, e.g. `attendance.test.ts` line 1 imports from `vitest`). MOCK mode short-circuits HTTP routes (per Group A context), so the slot-time/dedupe logic is unit-tested by importing `publishSlots` / the IST helper **directly**, not via `app.inject`.

---

## Files touched

| File | Issue | Change |
| --- | --- | --- |
| `apps/api/src/lib/ist.ts` | E1, E2 | **New.** Pure IST (+05:30) offset helpers: `istWallClockToUtc`, `istDateKey`. |
| `apps/api/src/lib/ist.test.ts` | E1, E2 | **New.** Unit tests for the helpers (TDD — written first). |
| `apps/api/src/modules/slots/service.ts` | E1c, E3 | Build slot times via `istWallClockToUtc`; dedupe in-batch + against existing slots by `(batchId, slotTime)`. |
| `apps/api/src/modules/slots/repo.ts` | E3 | Add `findSlotTimesForBatch(batchId, times)` to fetch existing `slotTime`s for dedupe. |
| `apps/api/src/modules/slots/service.test.ts` | E1c, E3 | **New.** TDD for IST slot construction + dedupe. |
| `apps/api/src/modules/studio/repo.ts` | E2 | Emit `day.date` as IST date key via `istDateKey`. |
| `apps/admin/src/lib/ist.ts` | E1, E2 | **New.** Client IST helpers: `istDateKey`, `setIstWallClock`. |
| `apps/admin/app/(tabs)/schedule.tsx` | E1a, E2, E6, E7 | Reschedule builds time via `setIstWallClock`; strip buckets by IST key; header by IST; drop manual `ampm`; reset `timeStr` on open. |
| `apps/admin/app/schedule/publish.tsx` | E1b, E3 | Edit-time builds via `setIstWallClock`; seed via IST read; relabel "Publish whole week" to upcoming-7-days, dedupe-safe. |
| `apps/admin/app/(tabs)/studio.tsx` | E4 | Use `useStudioReviewsSummary().count` for the Reviews badge. |
| `apps/admin/src/components/ScheduleDay.tsx` | E5 | Format times with `date-fns`; IST date label. (Dead component — defensive fix.) |

No `packages/types` change needed.

---

## Tasks

### Task 1 — E1/E2 (server helper, TDD): IST offset utilities

**Files:** **new** `apps/api/src/lib/ist.ts`, **new** `apps/api/src/lib/ist.test.ts`. Write the test first.

1. Create the test `apps/api/src/lib/ist.test.ts`:

   ```ts
   import { describe, it, expect } from 'vitest';
   import { istWallClockToUtc, istDateKey } from './ist.js';

   describe('istWallClockToUtc', () => {
     it('maps an IST wall-clock to the correct UTC instant (offset -5:30)', () => {
       // 18:00 IST on 2026-06-10  ==  12:30 UTC on 2026-06-10
       const utc = istWallClockToUtc('2026-06-10', 18, 0);
       expect(utc.toISOString()).toBe('2026-06-10T12:30:00.000Z');
     });

     it('rolls back across UTC midnight for early IST wall-clocks', () => {
       // 02:00 IST on 2026-06-10  ==  20:30 UTC on 2026-06-09
       const utc = istWallClockToUtc('2026-06-10', 2, 0);
       expect(utc.toISOString()).toBe('2026-06-09T20:30:00.000Z');
     });

     it('is independent of the host machine timezone', () => {
       // No Date.setHours anywhere → result must not shift with process.env.TZ.
       const utc = istWallClockToUtc('2026-01-01', 9, 30);
       expect(utc.toISOString()).toBe('2026-01-01T04:00:00.000Z');
     });
   });

   describe('istDateKey', () => {
     it('returns the IST calendar date of a UTC instant', () => {
       // 20:30 UTC == 02:00 IST next day → IST date is the 11th
       expect(istDateKey(new Date('2026-06-10T20:30:00.000Z'))).toBe('2026-06-11');
     });

     it('keeps the same date for a midday IST instant', () => {
       expect(istDateKey(new Date('2026-06-10T12:30:00.000Z'))).toBe('2026-06-10');
     });

     it('round-trips with istWallClockToUtc', () => {
       const utc = istWallClockToUtc('2026-12-31', 23, 45);
       expect(istDateKey(utc)).toBe('2026-12-31');
     });
   });
   ```

2. Create `apps/api/src/lib/ist.ts` to satisfy the test:

   ```ts
   // Findemy is a single-market (India) product and IST has no DST, so a fixed
   // +05:30 offset is exact. These helpers are pure offset math — they never
   // touch Date.prototype.getHours/setHours, so results do not depend on the
   // host machine's timezone. See docs .../05-group-e-schedule-time.md for the
   // "one fixed app timezone" convention.
   const IST_OFFSET_MIN = 5 * 60 + 30; // +05:30

   /**
    * Returns the UTC instant whose IST wall-clock is `dateStr` at `hh:mm`.
    * `dateStr` is a 'yyyy-MM-dd' IST calendar date.
    */
   export function istWallClockToUtc(dateStr: string, hh: number, mm: number): Date {
     const [y, mo, d] = dateStr.split('-').map(Number);
     // Compose the wall-clock as if it were UTC, then subtract the IST offset
     // to land on the true UTC instant.
     const asUtcMillis = Date.UTC(y, (mo ?? 1) - 1, d ?? 1, hh, mm, 0, 0);
     return new Date(asUtcMillis - IST_OFFSET_MIN * 60_000);
   }

   /** IST calendar date ('yyyy-MM-dd') of a UTC instant. */
   export function istDateKey(instant: Date): string {
     const shifted = new Date(instant.getTime() + IST_OFFSET_MIN * 60_000);
     return shifted.toISOString().slice(0, 10);
   }
   ```

3. **Checkpoint** — run the new helper test (TZ-shuffled to prove independence):
   ```bash
   cd /home/mp2sslrl/code/code && export PATH="$HOME/.local/bin:$PATH" && TZ=America/New_York pnpm --filter @findemy/api test src/lib/ist.test.ts
   ```
   Expect: **1 file, 6 passed, 0 failed** — and identical results regardless of `TZ`.

---

### Task 2 — E3 (repo): query existing slot times for dedupe

**Files:** `apps/api/src/modules/slots/repo.ts` — append after `createSlots` (lines 10-14).

1. Add a helper that returns the millisecond timestamps of slots already in a batch at the candidate times (so the service can skip duplicates).

   **Before** (end of `createSlots`):
   ```ts
   export async function createSlots(
     slots: { id: string; batchId: string; slotTime: Date; capacity: number }[],
   ) {
     return prisma.slot.createMany({ data: slots });
   }
   ```
   **After:**
   ```ts
   export async function createSlots(
     slots: { id: string; batchId: string; slotTime: Date; capacity: number }[],
   ) {
     return prisma.slot.createMany({ data: slots });
   }

   /**
    * Returns the existing slotTime millisecond values for `batchId` that fall on
    * any candidate timestamp, so callers can dedupe by (batchId, slotTime).
    */
   export async function findExistingSlotMillis(
     batchId: string,
     candidates: Date[],
   ): Promise<Set<number>> {
     if (candidates.length === 0) return new Set();
     const rows = await prisma.slot.findMany({
       where: { batchId, slotTime: { in: candidates } },
       select: { slotTime: true },
     });
     return new Set(rows.map((r) => r.slotTime.getTime()));
   }
   ```

2. **Checkpoint** — confirm the helper exists and the package type-checks:
   ```bash
   cd /home/mp2sslrl/code/code && export PATH="$HOME/.local/bin:$PATH" && grep -n "findExistingSlotMillis" apps/api/src/modules/slots/repo.ts && pnpm --filter @findemy/api typecheck
   ```
   Expect: grep prints the export line; typecheck exits **0 errors**.

---

### Task 3 — E1c/E3 (slots service, TDD): IST construction + dedupe

**Files:** **new** `apps/api/src/modules/slots/service.test.ts`, then edit `apps/api/src/modules/slots/service.ts`.

1. Write the test first. It mocks `./repo.js` so no DB is needed and asserts (a) slot times are composed via the IST convention (UTC-from-IST-wall-clock, machine-tz-independent) and (b) duplicates are dropped both in-batch and against existing slots.

   ```ts
   import { describe, it, expect, vi, beforeEach } from 'vitest';

   // Mock the repo so the service runs without a DB.
   const getBatch = vi.fn();
   const createSlots = vi.fn();
   const findExistingSlotMillis = vi.fn();
   vi.mock('./repo.js', () => ({
     getBatch: (...a: any[]) => getBatch(...a),
     createSlots: (...a: any[]) => createSlots(...a),
     findExistingSlotMillis: (...a: any[]) => findExistingSlotMillis(...a),
   }));
   // Push notifications are irrelevant here.
   vi.mock('../push/service.js', () => ({ sendPushNotifications: vi.fn() }));

   import { publishSlots } from './service.js';

   beforeEach(() => {
     vi.clearAllMocks();
     createSlots.mockResolvedValue({});
     findExistingSlotMillis.mockResolvedValue(new Set<number>());
   });

   describe('publishSlots — IST wall-clock construction', () => {
     it('grid mode composes UTC from IST wall-clock (18:00 IST → 12:30 UTC)', async () => {
       getBatch.mockResolvedValue({ id: 'b1', capacity: 6, timings: [] });
       await publishSlots('aca1', {
         batch_id: 'b1',
         slots: [{ date: '2026-06-10', time: '18:00', capacity: 4 }],
       });
       const created = createSlots.mock.calls[0][0];
       expect(created).toHaveLength(1);
       expect(created[0].slotTime.toISOString()).toBe('2026-06-10T12:30:00.000Z');
       expect(created[0].capacity).toBe(4);
     });

     it('quick mode composes each timing as an IST wall-clock', async () => {
       getBatch.mockResolvedValue({
         id: 'b1',
         capacity: 6,
         timings: [{ startTime: '09:30', dayOfWeek: 3, durationMin: 60 }],
       });
       await publishSlots('aca1', { batch_id: 'b1', dates: ['2026-01-01'] });
       const created = createSlots.mock.calls[0][0];
       expect(created[0].slotTime.toISOString()).toBe('2026-01-01T04:00:00.000Z');
     });
   });

   describe('publishSlots — dedupe by (batch, slotTime)', () => {
     it('drops duplicate candidates within the same request', async () => {
       getBatch.mockResolvedValue({ id: 'b1', capacity: 6, timings: [] });
       await publishSlots('aca1', {
         batch_id: 'b1',
         slots: [
           { date: '2026-06-10', time: '18:00' },
           { date: '2026-06-10', time: '18:00' }, // exact dup
         ],
       });
       expect(createSlots.mock.calls[0][0]).toHaveLength(1);
     });

     it('drops candidates that already exist in the batch', async () => {
       getBatch.mockResolvedValue({ id: 'b1', capacity: 6, timings: [] });
       const existing = new Date('2026-06-10T12:30:00.000Z').getTime();
       findExistingSlotMillis.mockResolvedValue(new Set([existing]));
       const res = await publishSlots('aca1', {
         batch_id: 'b1',
         slots: [{ date: '2026-06-10', time: '18:00' }],
       });
       expect(createSlots).not.toHaveBeenCalled();
       expect(res.slots_created).toBe(0);
     });
   });
   ```

2. Edit `apps/api/src/modules/slots/service.ts`. Add the import, build times via `istWallClockToUtc`, and dedupe before `createSlots`.

   **Before** (lines 1-4):
   ```ts
   import { AppError } from '../../lib/app-error.js';
   import { newId } from '../../lib/id.js';
   import * as repo from './repo.js';
   import { sendPushNotifications } from '../push/service.js';
   ```
   **After:**
   ```ts
   import { AppError } from '../../lib/app-error.js';
   import { newId } from '../../lib/id.js';
   import { istWallClockToUtc } from '../../lib/ist.js';
   import * as repo from './repo.js';
   import { sendPushNotifications } from '../push/service.js';
   ```

3. Replace the grid + quick construction blocks and the create call (current lines 17-49).

   **Before:**
   ```ts
     const slots: { id: string; batchId: string; slotTime: Date; capacity: number }[] = [];

     // Grid mode: explicit per-time slots, each with its own capacity (max trials).
     for (const s of data.slots ?? []) {
       const [h, m] = s.time.split(':').map(Number);
       const slotTime = new Date(s.date);
       slotTime.setHours(h ?? 0, m ?? 0, 0, 0);
       slots.push({
         id: newId(),
         batchId: data.batch_id,
         slotTime,
         capacity: s.capacity ?? batch.capacity,
       });
     }

     // Quick mode: whole-day publish derived from the batch's configured timings.
     for (const dateStr of data.dates ?? []) {
       const baseDate = new Date(dateStr);
       for (const timing of batch.timings) {
         const [h, m] = timing.startTime.split(':').map(Number);
         const slotTime = new Date(baseDate);
         slotTime.setHours(h, m, 0, 0);
         slots.push({
           id: newId(),
           batchId: data.batch_id,
           slotTime,
           capacity: batch.capacity,
         });
       }
     }

     await repo.createSlots(slots);
     return { slots_created: slots.length };
   }
   ```
   **After:**
   ```ts
     const candidates: { id: string; batchId: string; slotTime: Date; capacity: number }[] = [];

     // Grid mode: explicit per-time slots, each with its own capacity (max trials).
     // The typed time is an IST wall-clock; store the matching UTC instant.
     for (const s of data.slots ?? []) {
       const [h, m] = s.time.split(':').map(Number);
       candidates.push({
         id: newId(),
         batchId: data.batch_id,
         slotTime: istWallClockToUtc(s.date, h ?? 0, m ?? 0),
         capacity: s.capacity ?? batch.capacity,
       });
     }

     // Quick mode: whole-day publish derived from the batch's configured timings.
     for (const dateStr of data.dates ?? []) {
       for (const timing of batch.timings) {
         const [h, m] = timing.startTime.split(':').map(Number);
         candidates.push({
           id: newId(),
           batchId: data.batch_id,
           slotTime: istWallClockToUtc(dateStr, h ?? 0, m ?? 0),
           capacity: batch.capacity,
         });
       }
     }

     // Dedupe by (batch, slotTime): first within this request, then against
     // slots already published for the batch — re-publishing the same dates is
     // a no-op instead of creating duplicate slots.
     const existing = await repo.findExistingSlotMillis(
       data.batch_id,
       candidates.map((c) => c.slotTime),
     );
     const seen = new Set<number>(existing);
     const slots: typeof candidates = [];
     for (const c of candidates) {
       const key = c.slotTime.getTime();
       if (seen.has(key)) continue;
       seen.add(key);
       slots.push(c);
     }

     if (slots.length > 0) await repo.createSlots(slots);
     return { slots_created: slots.length };
   }
   ```

4. **Checkpoint** — run the slots service test (TZ-shuffled) and type-check:
   ```bash
   cd /home/mp2sslrl/code/code && export PATH="$HOME/.local/bin:$PATH" \
     && TZ=America/New_York pnpm --filter @findemy/api test src/modules/slots/service.test.ts \
     && pnpm --filter @findemy/api typecheck
   ```
   Expect: **5 passed, 0 failed** (TZ-independent); typecheck **0 errors**. Also confirm no `setHours` remains in the service:
   ```bash
   grep -n "setHours" apps/api/src/modules/slots/service.ts || echo "clean"
   ```
   Expect: `clean`.

---

### Task 4 — E2 (server): emit `day.date` as an IST date key

**Files:** `apps/api/src/modules/studio/repo.ts` — `getSchedule`, line **175**.

1. Import the helper at the top (the file currently imports only `Category` and `prisma`, lines 1-2).

   **Before:**
   ```ts
   import type { Category } from '@prisma/client';
   import { prisma } from '../../lib/prisma.js';
   ```
   **After:**
   ```ts
   import type { Category } from '@prisma/client';
   import { prisma } from '../../lib/prisma.js';
   import { istDateKey } from '../../lib/ist.js';
   ```

2. Bucket by IST date instead of UTC date (line 175).

   **Before:**
   ```ts
     const days: Record<string, any[]> = {};
     for (const slot of slots) {
       const date = slot.slotTime.toISOString().slice(0, 10);
   ```
   **After:**
   ```ts
     const days: Record<string, any[]> = {};
     for (const slot of slots) {
       const date = istDateKey(slot.slotTime);
   ```

3. **Checkpoint** — confirm the UTC bucketing is gone and the package type-checks:
   ```bash
   cd /home/mp2sslrl/code/code && export PATH="$HOME/.local/bin:$PATH" \
     && grep -n "istDateKey(slot.slotTime)" apps/api/src/modules/studio/repo.ts \
     && ! grep -n "toISOString().slice(0, 10)" apps/api/src/modules/studio/repo.ts \
     && pnpm --filter @findemy/api typecheck
   ```
   Expect: grep prints the new IST line; the `!grep` succeeds (no UTC-slice bucketing left in `getSchedule`); typecheck **0 errors**.
   (Note: `getBatchStudents` line 357 also uses `toISOString().slice(0,10)` on a `last_seen` date — that is a date-only `@db.Date` column, **out of scope**, leave it. The `!grep` above is scoped to confirm the *getSchedule* bucket changed; if the `last_seen` line trips it, instead run `grep -n "const date = " apps/api/src/modules/studio/repo.ts` and confirm it reads `istDateKey`.)

---

### Task 5 — E1/E2 (client helper): IST utilities for the admin app

**Files:** **new** `apps/admin/src/lib/ist.ts`. Mirror of the server helper, adapted for ISO-string inputs (the client never has a bare `yyyy-MM-dd` for an existing slot — it has the slot's ISO instant).

1. Create `apps/admin/src/lib/ist.ts`:

   ```ts
   // Client mirror of apps/api/src/lib/ist.ts. A slot's wall-clock is an IST
   // (+05:30, no DST) wall-clock; we store/transport the UTC instant. These
   // pure-offset helpers replace device-local Date.getHours/setHours so slot
   // math no longer depends on the device timezone.
   const IST_OFFSET_MIN = 5 * 60 + 30;

   /** IST calendar date ('yyyy-MM-dd') of an instant (ISO string or Date). */
   export function istDateKey(instant: string | Date): string {
     const d = typeof instant === 'string' ? new Date(instant) : instant;
     const shifted = new Date(d.getTime() + IST_OFFSET_MIN * 60_000);
     return shifted.toISOString().slice(0, 10);
   }

   /**
    * Given an existing slot instant `iso`, return the ISO string of the UTC
    * instant for IST wall-clock `hh:mm` on the SAME IST calendar day as `iso`.
    * Used when a coach edits a slot's time.
    */
   export function setIstWallClock(iso: string, hh: number, mm: number): string {
     const dateStr = istDateKey(iso); // IST day of the original slot
     const [y, mo, d] = dateStr.split('-').map(Number);
     const asUtcMillis = Date.UTC(y, (mo ?? 1) - 1, d ?? 1, hh, mm, 0, 0);
     return new Date(asUtcMillis - IST_OFFSET_MIN * 60_000).toISOString();
   }
   ```

2. **Checkpoint** — file exists and admin type-checks:
   ```bash
   cd /home/mp2sslrl/code/code && export PATH="$HOME/.local/bin:$PATH" \
     && grep -n "export function setIstWallClock" apps/admin/src/lib/ist.ts \
     && pnpm --filter @findemy/admin typecheck
   ```
   Expect: grep prints the export; typecheck **0 errors**.

---

### Task 6 — E1a/E2/E6/E7 (schedule screen): IST reschedule, IST bucketing, ampm cleanup, modal reset

**Files:** `apps/admin/app/(tabs)/schedule.tsx`. Four edits.

1. Import the client IST helper. Add to the existing date-fns import area (line 9-10).

   **Before:**
   ```ts
   import { startOfWeek, addDays, format, isToday } from 'date-fns';
   import { useToast } from '@/components/Toast';
   ```
   **After:**
   ```ts
   import { startOfWeek, addDays, format, isToday } from 'date-fns';
   import { useToast } from '@/components/Toast';
   import { istDateKey, setIstWallClock } from '@/lib/ist';
   ```

2. **E7 + E1a** — `RescheduleModal`: reset `timeStr` when the modal opens, and build the new time via `setIstWallClock` instead of `new Date().setHours().toISOString()`.

   **Before** (lines 39-55):
   ```ts
   function RescheduleModal({ visible, item, onClose, onConfirm }: RescheduleModalProps) {
     const theme = useTheme();
     const [timeStr, setTimeStr] = useState('');

     const handleConfirm = () => {
       if (!timeStr.trim()) return;
       // Parse HH:MM input and combine with item's date
       const [hh, mm] = timeStr.split(':').map(Number);
       if (isNaN(hh) || isNaN(mm)) {
         Alert.alert('Invalid time', 'Enter time as HH:MM (e.g. 09:30)');
         return;
       }
       const base = new Date(item?.start_time ?? '');
       if (isNaN(base.getTime())) return;
       base.setHours(hh, mm, 0, 0);
       onConfirm(base.toISOString());
     };
   ```
   **After:**
   ```ts
   function RescheduleModal({ visible, item, onClose, onConfirm }: RescheduleModalProps) {
     const theme = useTheme();
     const [timeStr, setTimeStr] = useState('');

     // Seed the field with the slot's current IST wall-clock each time the modal
     // opens; otherwise the previous slot's value lingers (E7).
     React.useEffect(() => {
       if (visible && item?.start_time) {
         setTimeStr(format(new Date(item.start_time), 'HH:mm'));
       }
     }, [visible, item?.start_time]);

     const handleConfirm = () => {
       if (!timeStr.trim()) return;
       // Parse HH:MM input as an IST wall-clock and combine with the slot's IST day.
       const [hh, mm] = timeStr.split(':').map(Number);
       if (isNaN(hh) || isNaN(mm)) {
         Alert.alert('Invalid time', 'Enter time as HH:MM (e.g. 09:30)');
         return;
       }
       if (!item?.start_time) return;
       onConfirm(setIstWallClock(item.start_time, hh, mm));
     };
   ```

   (`React` is already imported as the default at line 1 — `import React, { useState } from 'react'` — so `React.useEffect` resolves. The seed uses `format(..., 'HH:mm')` which renders device-local; for IST devices this equals the IST wall-clock, and it is only a prefill the coach can overwrite.)

3. **E2** — bucket the week-strip counts by IST date so the badge lands on the day the coach sees. The server now emits `day.date` as an IST key (Task 4), and the strip pills key off `format(day,'yyyy-MM-dd')` which is the device-local date of a `date-fns` `Date` — for IST devices these align. To be robust regardless of device tz, bucket from each item's `start_time` via `istDateKey` rather than trusting the device-local strip key to equal the server key.

   **Before** (lines 108-111):
   ```ts
     const batchCountByDate: Record<string, number> = {};
     days.forEach((day: any) => {
       batchCountByDate[day.date] = (day.items ?? []).length;
     });
   ```
   **After:**
   ```ts
     // Bucket by IST calendar date derived from each slot's instant, so the
     // count badge lands on the same day the strip renders (E2). day.date is
     // already an IST key from the server, but deriving here keeps client and
     // server agreeing even if the device tz differs.
     const batchCountByDate: Record<string, number> = {};
     days.forEach((day: any) => {
       (day.items ?? []).forEach((it: any) => {
         const key = it.start_time ? istDateKey(it.start_time) : day.date;
         batchCountByDate[key] = (batchCountByDate[key] ?? 0) + 1;
       });
     });
   ```

   And the day-block header (lines 243-244) UTC-parses `day.date`; with `day.date` now an IST key, `+ 'T12:00:00'` (noon, no Z) is parsed device-local and is safe from date-flip — **leave lines 243-244 as-is** (noon buffer already prevents the flip; changing it risks regressions). No edit needed here.

4. **E6** — drop the manual `ampm` and use a single `format(start,'h:mm a')`.

   **Before** (line 266):
   ```ts
                   const durationH = (end.getTime() - start.getTime()) / 3600000;
                   const ampm = start.getHours() >= 12 ? 'PM' : 'AM';
                   const catColor = CATEGORY_COLORS[(item.category ?? '').toLowerCase()] ?? theme.color.mist;
   ```
   **After:**
   ```ts
                   const durationH = (end.getTime() - start.getTime()) / 3600000;
                   const catColor = CATEGORY_COLORS[(item.category ?? '').toLowerCase()] ?? theme.color.mist;
   ```

   **Before** (time column, lines 278-291):
   ```ts
                           <Text style={{ fontFamily: theme.font.serif, fontSize: 17, color: theme.color.ink, lineHeight: 19 }}>
                             {format(start, 'h:mm')}
                           </Text>
                           <Text
                             style={{
                               fontFamily: theme.font.sans,
                               fontSize: 10,
                               color: theme.color.mist,
                               marginTop: 3,
                               letterSpacing: 0.6,
                             }}
                           >
                             {ampm} · {durationH % 1 === 0 ? durationH + 'h' : durationH.toFixed(1) + 'h'}
                           </Text>
   ```
   **After:**
   ```ts
                           <Text style={{ fontFamily: theme.font.serif, fontSize: 17, color: theme.color.ink, lineHeight: 19 }}>
                             {format(start, 'h:mm a')}
                           </Text>
                           <Text
                             style={{
                               fontFamily: theme.font.sans,
                               fontSize: 10,
                               color: theme.color.mist,
                               marginTop: 3,
                               letterSpacing: 0.6,
                             }}
                           >
                             {durationH % 1 === 0 ? durationH + 'h' : durationH.toFixed(1) + 'h'}
                           </Text>
   ```

5. **Checkpoint** — confirm the bad patterns are gone and admin type-checks:
   ```bash
   cd /home/mp2sslrl/code/code && export PATH="$HOME/.local/bin:$PATH" \
     && ! grep -n "base.setHours\|const ampm =\|getHours() >= 12" 'apps/admin/app/(tabs)/schedule.tsx' \
     && grep -n "setIstWallClock(item.start_time" 'apps/admin/app/(tabs)/schedule.tsx' \
     && grep -n "format(start, 'h:mm a')" 'apps/admin/app/(tabs)/schedule.tsx' \
     && grep -n "istDateKey(it.start_time)" 'apps/admin/app/(tabs)/schedule.tsx' \
     && pnpm --filter @findemy/admin typecheck
   ```
   Expect: the `!grep` succeeds (no `setHours`/manual `ampm`/local `getHours` left), the three `grep`s each print their line, typecheck **0 errors**.

---

### Task 7 — E1b/E3 (publish screen): IST edit-time, relabel "Publish whole week"

**Files:** `apps/admin/app/schedule/publish.tsx`. Three edits.

1. Import the client IST helper (after the existing imports, lines 5-9).

   **Before:**
   ```ts
   import { format, addDays, startOfToday } from 'date-fns';
   ```
   **After:**
   ```ts
   import { format, addDays, startOfToday } from 'date-fns';
   import { setIstWallClock, istDateKey } from '@/lib/ist';
   ```
   (`istDateKey` is imported for the seed read in step 2; if linting flags it as unused after step 2 keeps `format`, drop it — but step 2 uses it.)

2. **E1b** — `onEditTime` seed + `onConfirmEdit` build via IST. Currently `onEditTime` (line 98) reads device-local `format(...,'HH:mm')` and `onConfirmEdit` (lines 109-112) does `new Date().setHours().toISOString()`.

   **Before** (lines 97-100):
   ```ts
     const onEditTime = (slot: any) => {
       setNewTimeStr(format(new Date(slot.slot_time), 'HH:mm'));
       setEditingSlot(slot);
     };
   ```
   **After:**
   ```ts
     const onEditTime = (slot: any) => {
       // Seed with the slot's current wall-clock (device-local format ≈ IST on
       // an IST device); the value is composed back as an IST wall-clock on save.
       setNewTimeStr(format(new Date(slot.slot_time), 'HH:mm'));
       setEditingSlot(slot);
     };
   ```
   (Seed read is unchanged in behaviour but the comment documents intent; `istDateKey` is **not** used here after all — so adjust the import in step 1 to **only** `setIstWallClock`. Update step-1 import to: `import { setIstWallClock } from '@/lib/ist';`.)

   **Before** (lines 102-119, `onConfirmEdit`):
   ```ts
     const onConfirmEdit = async () => {
       if (!editingSlot) return;
       const [hh, mm] = newTimeStr.split(':').map(Number);
       if (isNaN(hh) || isNaN(mm)) {
         Alert.alert('Invalid time', 'Enter time as HH:MM');
         return;
       }
       const base = new Date(editingSlot.slot_time);
       base.setHours(hh, mm, 0, 0);
       try {
         await rescheduleSlot.mutateAsync({ id: editingSlot.id, slot_time: base.toISOString() });
         setEditingSlot(null);
         refetchSlots();
         showToast('Slot time updated', 'success');
       } catch {
         showToast('Failed to update time', 'error');
       }
     };
   ```
   **After:**
   ```ts
     const onConfirmEdit = async () => {
       if (!editingSlot) return;
       const [hh, mm] = newTimeStr.split(':').map(Number);
       if (isNaN(hh) || isNaN(mm)) {
         Alert.alert('Invalid time', 'Enter time as HH:MM');
         return;
       }
       // Compose the new time as an IST wall-clock on the slot's IST day, matching
       // how slots are created server-side (no device-local setHours).
       const slotTime = setIstWallClock(editingSlot.slot_time, hh, mm);
       try {
         await rescheduleSlot.mutateAsync({ id: editingSlot.id, slot_time: slotTime });
         setEditingSlot(null);
         refetchSlots();
         showToast('Slot time updated', 'success');
       } catch {
         showToast('Failed to update time', 'error');
       }
     };
   ```

3. **E3** — `onSameAsLastWeek` is mislabeled and the iteration is fine (upcoming 7 days from the selected date) but the label and toast lie about a "template"/"last week". With server-side dedupe now in place (Task 3), re-publishing the same dates is a safe no-op, so the action becomes an honest "publish the next 7 days". Rename the handler, fix the toast, and surface how many were actually created.

   **Before** (lines 65-76):
   ```ts
     const onSameAsLastWeek = async () => {
       if (!batchId) return;
       // Copy this week's slot-bearing dates by re-publishing the same 7 dates a week ahead.
       const dates = Array.from({ length: 7 }).map((_, i) => format(addDays(date, i), 'yyyy-MM-dd'));
       try {
         await publish.mutateAsync({ batch_id: batchId, dates });
         refetchSlots();
         showToast('Published week from template', 'success');
       } catch (e: any) {
         Alert.alert('Error', e.message || 'Failed');
       }
     };
   ```
   **After:**
   ```ts
     const onPublishWeek = async () => {
       if (!batchId) return;
       // Publish this batch's configured timings for the 7 days starting at the
       // selected date. Server dedupes by (batch, slotTime), so re-running this
       // never creates duplicate slots (E3).
       const dates = Array.from({ length: 7 }).map((_, i) => format(addDays(date, i), 'yyyy-MM-dd'));
       try {
         const res: any = await publish.mutateAsync({ batch_id: batchId, dates });
         refetchSlots();
         const n = res?.slots_created ?? 0;
         showToast(n > 0 ? `Published ${n} slot${n === 1 ? '' : 's'} for the week` : 'Week already published', 'success');
       } catch (e: any) {
         Alert.alert('Error', e.message || 'Failed');
       }
     };
   ```

   Update the button's `onPress` (line 206) to the renamed handler. The label "Publish whole week" (line 210) is now accurate — keep it.

   **Before** (lines 205-212):
   ```ts
             <Pressable
               onPress={onSameAsLastWeek}
               style={[styles.tplChip, { backgroundColor: theme.color.paperWarm, borderColor: theme.color.hairline }]}
             >
               <Text style={{ fontFamily: theme.font.sans, fontSize: 12, color: theme.color.inkSoft }}>
                 Publish whole week
               </Text>
             </Pressable>
   ```
   **After:**
   ```ts
             <Pressable
               onPress={onPublishWeek}
               style={[styles.tplChip, { backgroundColor: theme.color.paperWarm, borderColor: theme.color.hairline }]}
             >
               <Text style={{ fontFamily: theme.font.sans, fontSize: 12, color: theme.color.inkSoft }}>
                 Publish whole week
               </Text>
             </Pressable>
   ```

   (Verify `usePublishSlots().mutateAsync` resolves to the server's `{ slots_created }` payload — `publishSlots` returns it (Task 3); if the hook discards the result, `res?.slots_created` falls back to `0` and the toast still reads sensibly.)

4. **Checkpoint** — confirm the device-local edit-build is gone, the handler is renamed, and admin type-checks:
   ```bash
   cd /home/mp2sslrl/code/code && export PATH="$HOME/.local/bin:$PATH" \
     && ! grep -n "base.setHours\|onSameAsLastWeek\|Published week from template" apps/admin/app/schedule/publish.tsx \
     && grep -n "setIstWallClock(editingSlot.slot_time" apps/admin/app/schedule/publish.tsx \
     && grep -n "onPublishWeek" apps/admin/app/schedule/publish.tsx \
     && pnpm --filter @findemy/admin typecheck
   ```
   Expect: `!grep` succeeds (no `setHours`/old handler/old toast), both `grep`s print their lines, typecheck **0 errors**.

---

### Task 8 — E4 (studio dashboard): real review total on the Reviews badge

**Files:** `apps/admin/app/(tabs)/studio.tsx` — import (line 6-7), `reviewCount` (lines 72-74).

1. Import the summary hook.

   **Before:**
   ```ts
   import { useStudioDashboard } from '@/hooks/useStudioQueries';
   import { useStudioAcademy } from '@/hooks/useStudioAcademy';
   ```
   **After:**
   ```ts
   import { useStudioDashboard, useStudioReviewsSummary } from '@/hooks/useStudioQueries';
   import { useStudioAcademy } from '@/hooks/useStudioAcademy';
   ```

2. Call the hook and use its `count` (true total of `Review` rows) instead of the capped `recent_reviews.length`.

   **Before** (lines 64-74):
   ```ts
     const { data } = useStudioDashboard();
     const dashboard = data as Record<string, any> | undefined;
     const { data: academyData } = useStudioAcademy();
     const aca = (academyData as any)?.academy as Record<string, any> | undefined;

     const monthEarnings = dashboard?.earnings_summary?.this_month_paise
       ? `₹${Math.round(dashboard.earnings_summary.this_month_paise / 100).toLocaleString('en-IN')}`
       : undefined;
     const reviewCount = dashboard?.recent_reviews?.length
       ? String(dashboard.recent_reviews.length)
       : undefined;
   ```
   **After:**
   ```ts
     const { data } = useStudioDashboard();
     const dashboard = data as Record<string, any> | undefined;
     const { data: academyData } = useStudioAcademy();
     const aca = (academyData as any)?.academy as Record<string, any> | undefined;
     const { data: reviewsSummary } = useStudioReviewsSummary();

     const monthEarnings = dashboard?.earnings_summary?.this_month_paise
       ? `₹${Math.round(dashboard.earnings_summary.this_month_paise / 100).toLocaleString('en-IN')}`
       : undefined;
     // Total number of reviews, not the capped recent-preview list (E4).
     const reviewCount = reviewsSummary?.count
       ? String(reviewsSummary.count)
       : undefined;
   ```

3. **Checkpoint** — confirm the capped read is gone and admin type-checks:
   ```bash
   cd /home/mp2sslrl/code/code && export PATH="$HOME/.local/bin:$PATH" \
     && ! grep -n "recent_reviews?.length" 'apps/admin/app/(tabs)/studio.tsx' \
     && grep -n "reviewsSummary?.count" 'apps/admin/app/(tabs)/studio.tsx' \
     && pnpm --filter @findemy/admin typecheck
   ```
   Expect: `!grep` succeeds, the `grep` prints the new line, typecheck **0 errors**.

---

### Task 9 — E5 (dead ScheduleDay component): format times, IST label

**Files:** `apps/admin/src/components/ScheduleDay.tsx`. **Verified dead** (no importers). Fix defensively per audit so it never renders raw ISO if revived.

1. Import `date-fns format` and the IST helper.

   **Before** (lines 1-5):
   ```ts
   import React, { useState } from 'react';
   import { View, Text, Pressable, StyleSheet } from 'react-native';
   import { useTheme, Spill } from '@findemy/ui';
   import type { ScheduleItem } from '@findemy/types';
   import { useRouter } from 'expo-router';
   ```
   **After:**
   ```ts
   import React, { useState } from 'react';
   import { View, Text, Pressable, StyleSheet } from 'react-native';
   import { useTheme, Spill } from '@findemy/ui';
   import type { ScheduleItem } from '@findemy/types';
   import { useRouter } from 'expo-router';
   import { format } from 'date-fns';
   import { istDateKey } from '@/lib/ist';
   ```

2. Fix the day label (line 17) — `date` is the IST date key from the server; build a noon-buffered local date so the label doesn't flip.

   **Before:**
   ```ts
     const label = new Date(date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric' });
   ```
   **After:**
   ```ts
     const label = format(new Date(date + 'T12:00:00'), 'EEE d');
   ```

3. Format the slot times (lines 40-42) instead of dumping raw ISO. Use the item key off `istDateKey` too so the React key is stable.

   **Before** (lines 31-43):
   ```ts
             {items.map((item) => (
               <Pressable
                 key={`${item.batch_id}-${item.start_time}-${item.end_time}`}
                 onPress={() => router.push(`/batches/${item.batch_id}`)}
                 style={[styles.item, { backgroundColor: theme.color.paper }]}
               >
                 <Text style={{ fontFamily: theme.font.sans, fontSize: 14, color: theme.color.ink }}>
                   {item.batch_title}
                 </Text>
                 <Text style={{ fontFamily: theme.font.sans, fontSize: 12, color: theme.color.mist }}>
                   {item.start_time} – {item.end_time}
                 </Text>
                 <Spill state={item.status} />
   ```
   **After:**
   ```ts
             {items.map((item) => (
               <Pressable
                 key={`${item.batch_id}-${item.start_time}-${item.end_time}`}
                 onPress={() => router.push(`/batches/${item.batch_id}`)}
                 style={[styles.item, { backgroundColor: theme.color.paper }]}
               >
                 <Text style={{ fontFamily: theme.font.sans, fontSize: 14, color: theme.color.ink }}>
                   {item.batch_title}
                 </Text>
                 <Text style={{ fontFamily: theme.font.sans, fontSize: 12, color: theme.color.mist }}>
                   {format(new Date(item.start_time), 'h:mm a')} – {format(new Date(item.end_time), 'h:mm a')}
                 </Text>
                 <Spill state={item.status} />
   ```
   (`istDateKey` is imported in step 1 for parity/intent but only the label needs a date; if linting flags it unused, drop the `istDateKey` import and keep only `format`. Prefer keeping it minimal — remove the `istDateKey` import line if unused.)

4. **Checkpoint** — confirm raw ISO render is gone and admin type-checks:
   ```bash
   cd /home/mp2sslrl/code/code && export PATH="$HOME/.local/bin:$PATH" \
     && ! grep -n "{item.start_time} – {item.end_time}" apps/admin/src/components/ScheduleDay.tsx \
     && grep -n "format(new Date(item.start_time), 'h:mm a')" apps/admin/src/components/ScheduleDay.tsx \
     && pnpm --filter @findemy/admin typecheck
   ```
   Expect: `!grep` succeeds, the `grep` prints the formatted line, typecheck **0 errors**.

---

### Task 10 — Group-E final verification

**Files:** none (verification only).

1. Backend: type-check + the two new test files (TZ-shuffled to prove the convention is host-tz-independent).
   ```bash
   cd /home/mp2sslrl/code/code && export PATH="$HOME/.local/bin:$PATH" \
     && pnpm --filter @findemy/api typecheck \
     && TZ=America/New_York pnpm --filter @findemy/api test src/lib/ist.test.ts src/modules/slots/service.test.ts
   ```
   Expect: typecheck **0 errors**; **2 files, 11 passed, 0 failed**.

2. Admin: type-check the whole app (covers Tasks 5-9).
   ```bash
   cd /home/mp2sslrl/code/code && export PATH="$HOME/.local/bin:$PATH" && pnpm --filter @findemy/admin typecheck
   ```
   Expect: **0 errors**.

3. Prove every bad timezone/display pattern is gone across the touched files.
   ```bash
   grep -rn "\.setHours(" apps/api/src/modules/slots/service.ts apps/admin/app/schedule/publish.tsx 'apps/admin/app/(tabs)/schedule.tsx'
   grep -rn "getHours() >= 12\|const ampm =" 'apps/admin/app/(tabs)/schedule.tsx'
   grep -rn "recent_reviews?.length" 'apps/admin/app/(tabs)/studio.tsx'
   grep -rn "onSameAsLastWeek\|Published week from template" apps/admin/app/schedule/publish.tsx
   grep -rn "{item.start_time} – {item.end_time}" apps/admin/src/components/ScheduleDay.tsx
   ```
   Expect: **all five greps produce no output** (exit 1).

4. Prove the IST convention is wired on every path.
   ```bash
   grep -rn "istWallClockToUtc" apps/api/src/modules/slots/service.ts
   grep -rn "istDateKey(slot.slotTime)" apps/api/src/modules/studio/repo.ts
   grep -rn "setIstWallClock" apps/admin/app/schedule/publish.tsx 'apps/admin/app/(tabs)/schedule.tsx'
   grep -rn "findExistingSlotMillis" apps/api/src/modules/slots/service.ts apps/api/src/modules/slots/repo.ts
   ```
   Expect: each grep prints at least one match (server construction, server bucketing, both client edit paths, dedupe wired in service + repo).

5. **Checkpoint** — Group E is complete when steps 1-4 all match. Honest residual (documented, not fixed to keep scope tight): slot *display* via `date-fns format(new Date(iso), ...)` still renders in the **device** timezone, so a coach whose device is set to a non-IST zone would see shifted labels. The *bucketing, creation, and edit* math — the parts that were actually wrong — are now offset-exact and host-tz-independent. A future feature ticket can route display through the same offset (or add a real per-academy IANA tz) if non-IST coach devices become a concern.
