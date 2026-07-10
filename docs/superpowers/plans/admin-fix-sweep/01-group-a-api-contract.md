# Group A — API contract & data-shape drift — Sub-Plan
**Parent:** [00-MASTER-PLAN.md](./00-MASTER-PLAN.md)
**Goal:** Fix the API↔client field/route drift so attendance toggles & saves, studio slot-fetch stops 403'ing, schedule cancel/reschedule resolve a real slot id, the student card stops rendering `[object Object]`, and the settings tab can't crash on a missing notification sub-group.
**Depends on:** nothing. **Blocks:** Group C, Group D, Group E, Group F (they assume these contracts round-trip).

---

## Context / verified line-number corrections

Before writing any code, every cited file was re-read. The audit numbers had drifted and **two audited bugs are already fixed in the live code** — the verified state is:

- **A1 (attendance) — CONFIRMED.** `apps/admin/app/batches/[id]/attendance.tsx` reads `s.user_id` at lines **38, 48, 93, 94** (and keys local override state on `userId` throughout). The backend `apps/api/src/modules/attendance/service.ts` `getAttendance` (lines **3–13**) maps each record to `{ id: r.userId, name, present }` — field is **`id`, not `user_id`**. The POST mark schema in `apps/api/src/modules/attendance/routes.ts` (line **7**) **already requires `user_id: z.string()`** (audit correct). The api-client (`packages/api-client/src/index.ts` line **439**) and the `useBatchAttendance` hook (`apps/admin/src/hooks/useStudioQueries.ts` line **144**) **already type the GET response as `{ user_id; name; present }[]`** — so the *type* already expects `user_id`; only the backend runtime field is wrong. Fix = make `getAttendance` emit `user_id`.
- **A2 (studio slots 403) — CONFIRMED, route lives elsewhere.** `api.studio.batches.slots` (`packages/api-client/src/index.ts` lines **444–447**) hits `GET /batches/${batchId}/slots`, registered with `requireAuth('student')` in `apps/api/src/modules/batches/routes.ts` line **5** → 403 for the academy app. Consumed by `useBatchSlots` (`apps/admin/src/hooks/useStudioQueries.ts` lines **258–264**) used in `apps/admin/app/schedule/publish.tsx` (line **28**). The studio slot routes live in **`apps/api/src/modules/slots/routes.ts`** (not `studio/routes.ts`) — that's where the new `GET /studio/batches/:id/slots` belongs. The reusable fetch logic is `getBatchSlots` in **`apps/api/src/modules/batches/service.ts`** (lines **6–16**), backed by `findSlotsByBatch` in `apps/api/src/modules/batches/repo.ts`.
- **A3 (schedule slot id) — CONFIRMED.** `apps/admin/app/(tabs)/schedule.tsx` cancel uses `item.slot_id ?? item.id` (line **127**), reschedule uses `item.slot_id ?? item.id` (line **143**), and the keyExtractor falls back to `item.slot_id ?? item.id ?? ...` (line **270**). The repo `getSchedule` per-item object (`apps/api/src/modules/studio/repo.ts` lines **185–195**) has **no `slot_id`/`id`** — so `DELETE/PUT /studio/slots/undefined` → 404. `ScheduleItem` (`packages/types/src/index.ts` lines **269–275**) has no `slot_id` either. Note: the `slot` rows in `getSchedule` come from `prisma.slot.findMany` (line 154) so `slot.id` is available — just not emitted.
- **A4 (student card) — CONFIRMED, component unused.** `apps/admin/src/components/StudentCard.tsx` line **22** does `student.batches.join(', ')`, but `getStudents` (`apps/api/src/modules/studio/service.ts` lines **244–259**) emits `batches` as `{ title, category }[]`. `StudentListItem.batches` is typed `string[]` (`packages/types/src/index.ts` line **245**) — so the type *lies* and the join renders `[object Object]`. The live `apps/admin/app/(tabs)/students.tsx` already maps `b.title ?? b` correctly, so this is a latent bug in the unused component + a wrong shared type.
- **A5 (settings) — PARTIALLY ALREADY FIXED; scope reduced to the crash guard.** The audit predates the current backend. `apps/api/src/modules/studio/service.ts` `getSettings` (lines **361–386**) **already returns the full granular `{ notifications: { new_trial, classes, reviews_activity, quiet_hours }, privacy, contact }` shape**, fully populated from per-group defaults (`defaultNotifications`, lines 352–359), and `updateSettings` (lines **388–424**) **already deep-merges** against current settings before persisting (no sibling-wipe). The `Settings` type (`packages/types/src/index.ts` lines **279–290**) **already matches** that shape. So **A5(a) contract-mismatch and A5(b) partial-merge are already resolved** — no backend change is needed. The **one remaining real defect** is the frontend crash surface: `apps/admin/app/(tabs)/settings.tsx` reads `n?.new_trial.push` (line **67**), `n?.classes.reminder_30min` (line **75**), `n?.reviews_activity.new_review` (line **82**), `n?.quiet_hours.enabled` (line **93**) — the `?.` only guards `n`; if any *sub-group* is ever absent (older row, partial fixture, future API change) the `.push`/`.reminder_30min`/etc. throws and crashes the whole tab. Fix = per-level optional guards. (Optimistic-update / disable-during-mutation is Group C — NOT here.)

**Honest degradation note (A5):** the prompt asked to also "reconcile backend getSettings/updateSettings" and "send the full merged object on update." Both are already true in live code, so this sub-plan only does the per-level crash guards (the genuine, still-broken part). Sending a deep-partial single toggle from the client is *safe* because the backend deep-merges — so we leave the existing `setNotif` partial PUT as-is rather than churn it.

---

## Files touched

| File | Issue | Change |
| --- | --- | --- |
| `apps/api/src/modules/attendance/service.ts` | A1 | Extract & **export** `serializeAttendance`; emit `user_id` (not `id`) |
| `apps/api/src/test/attendance-serializer.test.ts` | A1 | **New** vitest unit test asserting the serializer emits `user_id` |
| `apps/api/src/modules/slots/routes.ts` | A2 | Add `GET /studio/batches/:id/slots` with `requireAuth('academy')`, reusing `batches/service.getBatchSlots` |
| `packages/api-client/src/index.ts` | A2 | Point `api.studio.batches.slots` at `/studio/batches/:id/slots` |
| `apps/api/src/modules/studio/repo.ts` | A3 | Emit `slot_id: slot.id` from `getSchedule` items |
| `packages/types/src/index.ts` | A3, A4 | Add `slot_id` to `ScheduleItem`; fix `StudentListItem.batches` type |
| `apps/admin/app/(tabs)/schedule.tsx` | A3 | Use `item.slot_id` directly (cancel, reschedule, keyExtractor) |
| `apps/admin/src/components/StudentCard.tsx` | A4 | Map `b.title ?? b` instead of `.join` on objects |
| `apps/admin/app/(tabs)/settings.tsx` | A5 | Per-level optional guards on every notification sub-group read |

No new Prisma columns are needed (every value already exists on its source row), so **no `db push`** is required for Group A.

---

## Tasks

### Task 1 — A1 (backend): export `serializeAttendance` and emit `user_id`

**Files:** `apps/api/src/modules/attendance/service.ts` — `getAttendance` at lines **3–13**, the per-record map at lines **7–11** currently emitting `id: r.userId`.

1. Replace the inline `.map(...)` with an exported pure serializer that emits `user_id`. This keeps the runtime field aligned with the api-client type (`{ user_id; name; present }`) and the POST mark schema (`user_id`), and makes the shape unit-testable without booting the app (MOCK mode would otherwise bypass the real handler).

   **Before:**
   ```ts
   import * as repo from './repo.js';

   export async function getAttendance(batchId: string, dateStr?: string) {
     const date = dateStr ? new Date(dateStr) : new Date();
     const records = await repo.getBatchAttendance(batchId, date);
     return {
       students: records.map((r) => ({
         id: r.userId,
         name: r.user.name,
         present: r.present,
       })),
     };
   }
   ```
   **After:**
   ```ts
   import * as repo from './repo.js';

   type AttendanceRecord = Awaited<ReturnType<typeof repo.getBatchAttendance>>[number];

   export function serializeAttendance(records: AttendanceRecord[]) {
     return {
       students: records.map((r) => ({
         user_id: r.userId,
         name: r.user.name,
         present: r.present,
       })),
     };
   }

   export async function getAttendance(batchId: string, dateStr?: string) {
     const date = dateStr ? new Date(dateStr) : new Date();
     const records = await repo.getBatchAttendance(batchId, date);
     return serializeAttendance(records);
   }
   ```

2. **Checkpoint** — backend typechecks and the field is `user_id`:
   ```bash
   cd /home/mp2sslrl/code/code && export PATH="$HOME/.local/bin:$PATH" && \
     grep -n "user_id: r.userId" apps/api/src/modules/attendance/service.ts && \
     ! grep -n "id: r.userId" apps/api/src/modules/attendance/service.ts && \
     pnpm --filter @findemy/api typecheck
   ```
   Expect: the grep prints the `user_id: r.userId,` line, the `! grep` finds **no** `id: r.userId` (so the inverted grep succeeds), and typecheck exits with **0 errors**.

---

### Task 2 — A1 (test): unit-test the attendance serializer contract (TDD)

**Files:** **new** `apps/api/src/test/attendance-serializer.test.ts`. A separate file from the existing inject-based `apps/api/src/test/attendance.test.ts` (that one runs through MOCK mode and would not exercise the real serializer). This calls `serializeAttendance` directly with a fabricated Prisma-shaped row.

1. Write the test FIRST (it will fail until Task 1's export exists; if you did Task 1 first, it passes immediately — either order is fine, but the assertion is the contract gate). Create `apps/api/src/test/attendance-serializer.test.ts`:

   ```ts
   import { describe, it, expect } from 'vitest';
   import { serializeAttendance } from '../modules/attendance/service.js';

   // Shaped like repo.getBatchAttendance's include: { user: { select: { id, name, phone } } }.
   function makeRecord(overrides: Record<string, unknown> = {}) {
     return {
       id: 'att-1',
       batchId: 'batch-1',
       userId: 'user-1',
       date: new Date('2026-06-07T00:00:00.000Z'),
       present: true,
       markedByAccountId: 'acct-1',
       markedAt: new Date('2026-06-07T10:00:00.000Z'),
       user: { id: 'user-1', name: 'Asha Rao', phone: '9876543210' },
       ...overrides,
     } as unknown as Parameters<typeof serializeAttendance>[0][number];
   }

   describe('serializeAttendance', () => {
     it('emits user_id (NOT id) so the client can key/toggle and POST marks (A1)', () => {
       const out = serializeAttendance([makeRecord()]);
       expect(out.students[0].user_id).toBe('user-1');
       // The legacy `id` key the client was never reading must be gone.
       expect((out.students[0] as Record<string, unknown>).id).toBeUndefined();
     });

     it('carries name and present through unchanged', () => {
       const out = serializeAttendance([
         makeRecord({ present: false, user: { id: 'u2', name: 'Dev Kumar', phone: '1' } }),
       ]);
       expect(out.students[0].name).toBe('Dev Kumar');
       expect(out.students[0].present).toBe(false);
     });

     it('returns an empty students array for no records', () => {
       const out = serializeAttendance([]);
       expect(out.students).toEqual([]);
     });
   });
   ```

2. **Checkpoint** — run only this test file:
   ```bash
   cd /home/mp2sslrl/code/code && export PATH="$HOME/.local/bin:$PATH" && \
     pnpm --filter @findemy/api test src/test/attendance-serializer.test.ts
   ```
   Expect: **1 passed** test file, **3 passed** tests, 0 failed.

---

### Task 3 — A2 (backend): add academy-scoped `GET /studio/batches/:id/slots`

**Files:** `apps/api/src/modules/slots/routes.ts` — add a route alongside the existing `/studio/slots/*` routes (lines 27–43). Reuse `getBatchSlots` from the batches module (`apps/api/src/modules/batches/service.ts` lines 6–16) — identical fetch logic, no duplication.

1. Import the batches service and register the new route. Add the import at the top and the route inside `slotRoutes`.

   **Before:**
   ```ts
   import type { FastifyPluginAsync } from 'fastify';
   import { z } from 'zod';
   import * as service from './service.js';
   ```
   **After:**
   ```ts
   import type { FastifyPluginAsync } from 'fastify';
   import { z } from 'zod';
   import * as service from './service.js';
   import * as batchService from '../batches/service.js';
   ```

2. Add the GET route as the first route in `slotRoutes` (before the publish route).

   **Before:**
   ```ts
   export const slotRoutes: FastifyPluginAsync = async (app) => {
     app.post('/studio/slots/publish', { preHandler: app.requireAuth('academy') }, async (req) => {
       const body = PublishSchema.parse(req.body);
       return service.publishSlots(req.user.academy_id!, body);
     });
   ```
   **After:**
   ```ts
   export const slotRoutes: FastifyPluginAsync = async (app) => {
     // Academy-scoped slot listing for the Studio app. Mirrors the student-facing
     // GET /batches/:id/slots but with requireAuth('academy') so the admin app
     // (which has the academy role) is not 403'd.
     app.get('/studio/batches/:id/slots', { preHandler: app.requireAuth('academy') }, async (req) => {
       const { id } = req.params as { id: string };
       const { date } = req.query as { date?: string };
       return batchService.getBatchSlots(id, date);
     });

     app.post('/studio/slots/publish', { preHandler: app.requireAuth('academy') }, async (req) => {
       const body = PublishSchema.parse(req.body);
       return service.publishSlots(req.user.academy_id!, body);
     });
   ```

3. **Checkpoint** — backend typechecks and the new route exists:
   ```bash
   cd /home/mp2sslrl/code/code && export PATH="$HOME/.local/bin:$PATH" && \
     grep -n "/studio/batches/:id/slots" apps/api/src/modules/slots/routes.ts && \
     pnpm --filter @findemy/api typecheck
   ```
   Expect: the grep prints the new route line and typecheck exits with **0 errors**.

---

### Task 4 — A2 (client): point `api.studio.batches.slots` at the new path

**Files:** `packages/api-client/src/index.ts` — `slots` method at lines **444–447**.

1. Change the URL from the student route to the new studio route.

   **Before:**
   ```ts
           slots: (batchId: string, query?: Record<string, unknown>) => {
             const qs = query ? "?" + new URLSearchParams(stripUndefined(query) as any).toString() : "";
             return request<{ slots: unknown[] }>("GET", `/batches/${batchId}/slots${qs}`);
           },
   ```
   **After:**
   ```ts
           slots: (batchId: string, query?: Record<string, unknown>) => {
             const qs = query ? "?" + new URLSearchParams(stripUndefined(query) as any).toString() : "";
             return request<{ slots: unknown[] }>("GET", `/studio/batches/${batchId}/slots${qs}`);
           },
   ```

2. **Checkpoint** — the client now targets the studio path and api-client typechecks:
   ```bash
   cd /home/mp2sslrl/code/code && export PATH="$HOME/.local/bin:$PATH" && \
     grep -n 'studio/batches/${batchId}/slots' packages/api-client/src/index.ts && \
     pnpm --filter @findemy/types typecheck
   ```
   (api-client has no standalone typecheck script in this repo; the consuming `@findemy/admin` typecheck in Task 9 covers compilation. The `@findemy/types` typecheck here is a fast sanity gate.)
   Expect: the grep prints the updated `slots` URL line; types typecheck exits **0 errors**.

---

### Task 5 — A3 (backend): emit `slot_id` from `getSchedule`

**Files:** `apps/api/src/modules/studio/repo.ts` — `getSchedule` per-item push at lines **185–195**. `slot.id` is already available (rows come from `prisma.slot.findMany`, line 154).

1. Add `slot_id` as the first field of the pushed item.

   **Before:**
   ```ts
       days[date].push({
         batch_id: slot.batchId,
         batch_title: slot.batch.title,
         category: slot.batch.category,
         capacity: slot.batch.capacity,
         enrolled_count: slot.batch._count.enrollments,
         coach_name: slot.batch.coach?.name ?? null,
         start_time: start.toISOString(),
         end_time: end.toISOString(),
         status,
       });
   ```
   **After:**
   ```ts
       days[date].push({
         slot_id: slot.id,
         batch_id: slot.batchId,
         batch_title: slot.batch.title,
         category: slot.batch.category,
         capacity: slot.batch.capacity,
         enrolled_count: slot.batch._count.enrollments,
         coach_name: slot.batch.coach?.name ?? null,
         start_time: start.toISOString(),
         end_time: end.toISOString(),
         status,
       });
   ```

2. **Checkpoint** — backend typechecks and `slot_id` is emitted:
   ```bash
   cd /home/mp2sslrl/code/code && export PATH="$HOME/.local/bin:$PATH" && \
     grep -n "slot_id: slot.id" apps/api/src/modules/studio/repo.ts && \
     pnpm --filter @findemy/api typecheck
   ```
   Expect: the grep prints the `slot_id: slot.id,` line and typecheck exits with **0 errors**.

---

### Task 6 — A3 + A4 (types): add `slot_id` to `ScheduleItem`, fix `StudentListItem.batches`

**Files:** `packages/types/src/index.ts` — `StudentListItem` at lines **240–247**, `ScheduleItem` at lines **269–275**.

1. Fix `StudentListItem.batches` to the real shape (`{ title, category }[]`) — the backend `getStudents` emits exactly this (`studio/service.ts` line 257).

   **Before:**
   ```ts
   export type StudentListItem = {
     id: string;
     name: string;
     phone?: string;
     age?: number;
     batches: string[];
     status: string;
   };
   ```
   **After:**
   ```ts
   export type StudentListItem = {
     id: string;
     name: string;
     phone?: string;
     age?: number;
     batches: { title: string; category: string }[];
     status: string;
   };
   ```

2. Add `slot_id` to `ScheduleItem` (the `Slot.id`, now emitted by Task 5).

   **Before:**
   ```ts
   export type ScheduleItem = {
     batch_id: string;
     batch_title: string;
     start_time: string;
     end_time: string;
     status: 'now' | 'upcoming' | 'done';
   };
   ```
   **After:**
   ```ts
   export type ScheduleItem = {
     slot_id: string;
     batch_id: string;
     batch_title: string;
     start_time: string;
     end_time: string;
     status: 'now' | 'upcoming' | 'done';
   };
   ```

3. **Checkpoint** — types compile with the new shapes:
   ```bash
   cd /home/mp2sslrl/code/code && export PATH="$HOME/.local/bin:$PATH" && \
     grep -n "slot_id: string;" packages/types/src/index.ts && \
     grep -n "batches: { title: string; category: string }\[\]" packages/types/src/index.ts && \
     pnpm --filter @findemy/types typecheck
   ```
   Expect: both greps print their lines; types typecheck exits with **0 errors**.

---

### Task 7 — A3 (screen): use `item.slot_id` directly in cancel, reschedule, keyExtractor

**Files:** `apps/admin/app/(tabs)/schedule.tsx` — cancel at line **127**, reschedule at line **143**, keyExtractor at line **270**. With Task 5+6 done, `slot_id` is always present, so the `?? item.id` fallbacks (which resolved to `undefined` → `/studio/slots/undefined`) can go.

1. Fix the cancel mutation (line 127).

   **Before:**
   ```ts
               await deleteSlot.mutateAsync(item.slot_id ?? item.id);
   ```
   **After:**
   ```ts
               await deleteSlot.mutateAsync(item.slot_id);
   ```

2. Fix the reschedule mutation (line 143).

   **Before:**
   ```ts
       await rescheduleSlot.mutateAsync({ id: item.slot_id ?? item.id, slot_time: newTime });
   ```
   **After:**
   ```ts
       await rescheduleSlot.mutateAsync({ id: item.slot_id, slot_time: newTime });
   ```

3. Fix the per-item key (line 270) — `slot_id` is now a stable unique key.

   **Before:**
   ```ts
                       key={item.slot_id ?? item.id ?? `${item.batch_id}-${item.start_time}-${idx}`}
   ```
   **After:**
   ```ts
                       key={item.slot_id}
   ```

4. **Checkpoint** — no `item.id` slot fallbacks remain in this screen:
   ```bash
   cd /home/mp2sslrl/code/code && export PATH="$HOME/.local/bin:$PATH" && \
     ! grep -n "item.slot_id ?? item.id" 'apps/admin/app/(tabs)/schedule.tsx' && \
     grep -n "deleteSlot.mutateAsync(item.slot_id)" 'apps/admin/app/(tabs)/schedule.tsx'
   ```
   Expect: the `! grep` finds **no** `item.slot_id ?? item.id` (so it succeeds), and the second grep prints the cleaned cancel line.

---

### Task 8 — A4 (component): stop rendering batch objects as `[object Object]`

**Files:** `apps/admin/src/components/StudentCard.tsx` — line **22**. `batches` is now typed `{ title, category }[]` (Task 6), so `.join(', ')` no longer compiles and is wrong anyway. Mirror the live `students.tsx` pattern (`b.title ?? b`).

1. Map batch objects to their titles before joining.

   **Before:**
   ```ts
           <Text style={{ fontFamily: theme.font.sans, fontSize: 12, color: theme.color.mist }}>
             {student.batches.join(', ') || 'No batches'}
           </Text>
   ```
   **After:**
   ```ts
           <Text style={{ fontFamily: theme.font.sans, fontSize: 12, color: theme.color.mist }}>
             {student.batches.map((b) => b.title).join(', ') || 'No batches'}
           </Text>
   ```

2. **Checkpoint** — the component maps to titles and no longer joins raw objects:
   ```bash
   cd /home/mp2sslrl/code/code && export PATH="$HOME/.local/bin:$PATH" && \
     grep -n "student.batches.map((b) => b.title).join" apps/admin/src/components/StudentCard.tsx && \
     ! grep -n "student.batches.join" apps/admin/src/components/StudentCard.tsx
   ```
   Expect: the first grep prints the mapped line; the `! grep` confirms the bare `.join` is gone.

---

### Task 9 — A5 (screen): per-level optional guards on notification reads

**Files:** `apps/admin/app/(tabs)/settings.tsx` — sub-group reads at lines **67, 68, 69, 75, 76, 82, 83, 84, 92, 93**. Backend already always returns full groups (see Context A5), so this is defense-in-depth against any future/partial payload: the `?.` must reach through each sub-group, not just `n`.

1. New trial requests rows (lines 67–69).

   **Before:**
   ```ts
           <Row label="Push" value={n?.new_trial.push ?? true} onChange={(v) => setNotif('new_trial', 'push', v)} />
           <Row label="Email" sub={settings?.contact?.email} value={n?.new_trial.email ?? false} onChange={(v) => setNotif('new_trial', 'email', v)} />
           <Row label="WhatsApp" sub={settings?.contact?.whatsapp} value={n?.new_trial.whatsapp ?? false} onChange={(v) => setNotif('new_trial', 'whatsapp', v)} last />
   ```
   **After:**
   ```ts
           <Row label="Push" value={n?.new_trial?.push ?? true} onChange={(v) => setNotif('new_trial', 'push', v)} />
           <Row label="Email" sub={settings?.contact?.email} value={n?.new_trial?.email ?? false} onChange={(v) => setNotif('new_trial', 'email', v)} />
           <Row label="WhatsApp" sub={settings?.contact?.whatsapp} value={n?.new_trial?.whatsapp ?? false} onChange={(v) => setNotif('new_trial', 'whatsapp', v)} last />
   ```

2. Today's classes rows (lines 75–76).

   **Before:**
   ```ts
           <Row label="Reminder 30 min before" value={n?.classes.reminder_30min ?? true} onChange={(v) => setNotif('classes', 'reminder_30min', v)} />
           <Row label="Attendance reminder" value={n?.classes.attendance_reminder ?? true} onChange={(v) => setNotif('classes', 'attendance_reminder', v)} last />
   ```
   **After:**
   ```ts
           <Row label="Reminder 30 min before" value={n?.classes?.reminder_30min ?? true} onChange={(v) => setNotif('classes', 'reminder_30min', v)} />
           <Row label="Attendance reminder" value={n?.classes?.attendance_reminder ?? true} onChange={(v) => setNotif('classes', 'attendance_reminder', v)} last />
   ```

3. Reviews & activity rows (lines 82–84).

   **Before:**
   ```ts
           <Row label="New review" value={n?.reviews_activity.new_review ?? true} onChange={(v) => setNotif('reviews_activity', 'new_review', v)} />
           <Row label="Leaderboard updates" value={n?.reviews_activity.leaderboard ?? false} onChange={(v) => setNotif('reviews_activity', 'leaderboard', v)} />
           <Row label="Reels tagging" value={n?.reviews_activity.reels ?? false} onChange={(v) => setNotif('reviews_activity', 'reels', v)} last />
   ```
   **After:**
   ```ts
           <Row label="New review" value={n?.reviews_activity?.new_review ?? true} onChange={(v) => setNotif('reviews_activity', 'new_review', v)} />
           <Row label="Leaderboard updates" value={n?.reviews_activity?.leaderboard ?? false} onChange={(v) => setNotif('reviews_activity', 'leaderboard', v)} />
           <Row label="Reels tagging" value={n?.reviews_activity?.reels ?? false} onChange={(v) => setNotif('reviews_activity', 'reels', v)} last />
   ```

4. Quiet hours row (lines 90–95). The `sub` already guards `n?.quiet_hours` correctly; only the `value` read needs the deeper guard.

   **Before:**
   ```ts
           <Row
             label="Don't disturb"
             sub={n?.quiet_hours ? `${n.quiet_hours.start} – ${n.quiet_hours.end}` : '22:00 – 07:00'}
             value={n?.quiet_hours.enabled ?? false}
             onChange={(v) => setNotif('quiet_hours', 'enabled', v)}
             last
           />
   ```
   **After:**
   ```ts
           <Row
             label="Don't disturb"
             sub={n?.quiet_hours ? `${n.quiet_hours.start} – ${n.quiet_hours.end}` : '22:00 – 07:00'}
             value={n?.quiet_hours?.enabled ?? false}
             onChange={(v) => setNotif('quiet_hours', 'enabled', v)}
             last
           />
   ```

5. **Checkpoint** — no unguarded sub-group reads remain (each `n?.<group>` must be followed by `?.`, never a bare `.`):
   ```bash
   cd /home/mp2sslrl/code/code && export PATH="$HOME/.local/bin:$PATH" && \
     ! grep -nE 'n\?\.(new_trial|classes|reviews_activity|quiet_hours)\.' 'apps/admin/app/(tabs)/settings.tsx'
   ```
   Expect: the `! grep` finds **no** bare `n?.<group>.` reads (so it succeeds with exit 0). Note this regex intentionally ignores the `n.quiet_hours.start`/`.end` inside the already-guarded `sub` ternary (those are reached only when `n?.quiet_hours` is truthy).

---

### Task 10 — Group-A final verification

**Files:** none (verification only).

1. Backend typecheck (covers Tasks 1, 3, 5).
   ```bash
   cd /home/mp2sslrl/code/code && export PATH="$HOME/.local/bin:$PATH" && pnpm --filter @findemy/api typecheck
   ```
   Expect: **0 errors**.

2. Types typecheck (covers Task 6).
   ```bash
   cd /home/mp2sslrl/code/code && export PATH="$HOME/.local/bin:$PATH" && pnpm --filter @findemy/types typecheck
   ```
   Expect: **0 errors**.

3. Admin app typecheck (covers Tasks 4, 7, 8, 9 — and proves the `StudentListItem`/`ScheduleItem` type changes propagate cleanly to consumers).
   ```bash
   cd /home/mp2sslrl/code/code && export PATH="$HOME/.local/bin:$PATH" && pnpm --filter @findemy/admin typecheck
   ```
   Expect: **0 errors**. If `students.tsx` (which does `b.title ?? b`) now errors because `b` is no longer `string | object`, simplify it to `b.title` there — but verify first; the `?? b` branch becomes dead under the new type and TS may flag it.

4. Attendance serializer test (covers Tasks 1–2).
   ```bash
   cd /home/mp2sslrl/code/code && export PATH="$HOME/.local/bin:$PATH" && \
     pnpm --filter @findemy/api test src/test/attendance-serializer.test.ts
   ```
   Expect: **3 passed**, 0 failed.

5. **Checkpoint** — Group A is complete when steps 1–4 all match their expected output. Hand off to Groups C/D/E/F, which may now assume: attendance emits `user_id`; `GET /studio/batches/:id/slots` is reachable by the academy role; `ScheduleItem.slot_id` is present; `StudentListItem.batches` is `{title,category}[]`; and the settings tab cannot crash on a missing notification sub-group.
