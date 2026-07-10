# Group C — react-query Cache Hygiene & Mutation Safety — Sub-Plan
**Parent:** [00-MASTER-PLAN.md](./00-MASTER-PLAN.md)
**Goal:** Make Studio (admin) queries fire only when they can succeed (token + id guards), keep schedule/detail caches fresh after mutations, and make toggles/buttons safe against round-trip lag and double-submits.
**Depends on:** **Group A** (settings shape/merge correctness in `useUpdateStudioSettings`; `slot_id` correctness for cancel/reschedule). This group only ADDS optimism/disable/error-toast and in-flight guards ON TOP of A — it does NOT redo the merge or the `slot_id` selection.
**Blocks:** Nothing downstream; this is the last hygiene pass.

---

## Context: verified line-number corrections (read before editing)

Audit numbers drifted. These are the EXACT lines confirmed by reading source on 2026-06-07.

| Issue | Audit said | Actual (verified) | File |
| --- | --- | --- | --- |
| C1 `usePublishSlots.onSuccess` | ~244–247 | **244–247** (✅ exact) — invalidates only `['studio','batches']` | `apps/admin/src/hooks/useStudioQueries.ts` |
| C2 `useStudioSchedule` | ~89–94 | **89–94** (✅) — no token, no `enabled` | same |
| C2 `useBatchSlots` | ~258–264 | **258–264** (✅) — has `enabled: !!batchId && !!date`, no token | same |
| C3 `useStudioTrial` | ~50–54 | **50–55** — no `enabled` at all | same |
| C3 `useStudioBatch` | — | **103–108** — no `enabled` | same |
| C3 `useBatchAttendance` | — | **143–148** — no `enabled` | same |
| C4 workshop reset effect | ~57–71 | **57–71** (✅) — `}, [workshop]);` at line 71 | `apps/admin/app/workshops/[id].tsx` |
| C5 settings switches | — | Switches in `Row` (45–50); `update.mutate` calls at 19–22; no `disabled`, no optimism | `apps/admin/app/(tabs)/settings.tsx` |
| C6 new-workshop buttons | ~188–195 | **188–194** — both `loading={createWorkshop.isPending}`, neither `disabled` | `apps/admin/app/workshops/new.tsx` |
| C7 schedule cancel/reschedule | ~125–149 | `handleCancelSlot` **115–137**, `handleReschedule` **139–149** — un-awaited `refetch()`, no disable | `apps/admin/app/(tabs)/schedule.tsx` |

### Verified query keys (invalidation targets MUST match these prefixes)

| Data | Consumer hook | Query key | Line |
| --- | --- | --- | --- |
| Schedule (week) | `useStudioSchedule` | `['studio','schedule', week_start]` | `useStudioQueries.ts:91` |
| Batches list | `useStudioBatches` | `['studio','batches']` | `useStudioQueries.ts:98` |
| Settings | `useStudioSettings` | `['studio','settings']` | `useStudioQueries.ts:221` |

> **CORRECTION (C1):** `useDeleteSlot` (352–361) and `useRescheduleSlot` (363–373) already invalidate BOTH `['studio','batches']` and `['studio','schedule']`. `usePublishSlots` invalidates only `['studio','batches']` — it must be brought in line. Partial key `['studio','schedule']` is a prefix, so it invalidates every cached week.

> **CORRECTION (C2):** `useBatchSlots` already has `enabled: !!batchId && !!date` — it is ONLY missing the token gate. `useStudioSchedule` has no `enabled` at all.

> **NOTE (C5/C7 ↔ Group A):** Group A owns the `mutationFn` body of `useUpdateStudioSettings` (deep-merge correctness) and the `item.slot_id ?? item.id` selection inside `handleCancelSlot`/`handleReschedule`. This group adds `onMutate`/`onError` to that same hook and adds `disabled` guards to those same handlers. If Group A has already restructured those bodies, re-base these edits onto the current text — the additions (onMutate/onError, disabled) are orthogonal.

### Auth store (for token gates)
`useAuth((s) => s.accessToken)` returns `string | null` (`apps/admin/src/stores/auth.ts:13`). The pattern `const token = useAuth((s) => s.accessToken)` + `enabled: !!token` is already used by `useStudioDashboard` (24,29), `useStudioInbox` (40,46), `useStudioActivity` (58,62). Match it exactly.

---

## Files touched

| File | Change | Issue |
| --- | --- | --- |
| `apps/admin/src/hooks/useStudioQueries.ts` | `usePublishSlots` → also invalidate schedule | C1 |
| `apps/admin/src/hooks/useStudioQueries.ts` | token gate on `useStudioSchedule`, `useBatchSlots` | C2 |
| `apps/admin/src/hooks/useStudioQueries.ts` | id (+token) gate on `useStudioTrial`, `useStudioBatch`, `useBatchAttendance` | C3 |
| `apps/admin/src/hooks/useStudioQueries.ts` | `useUpdateStudioSettings` → onMutate optimistic + onError rollback | C5 |
| `apps/admin/app/workshops/[id].tsx` | reset effect depends on `workshop?.id` | C4 |
| `apps/admin/app/(tabs)/settings.tsx` | Switches `disabled={update.isPending}` + error toast | C5 |
| `apps/admin/app/workshops/new.tsx` | both buttons `disabled={createWorkshop.isPending}` | C6 |
| `apps/admin/app/(tabs)/schedule.tsx` | cancel/reschedule disable while pending; drop un-awaited `refetch()` | C7 |

---

## Tasks

### Task 1 (C1, high) — `usePublishSlots` must also invalidate the schedule

**File:** `apps/admin/src/hooks/useStudioQueries.ts:236–248`

After publishing in `app/schedule/publish.tsx`, the `(tabs)/schedule.tsx` week view (`useStudioSchedule`, key `['studio','schedule', week_start]`) keeps showing stale data because `usePublishSlots.onSuccess` only invalidates `['studio','batches']`. `useDeleteSlot`/`useRescheduleSlot` already invalidate both — match them.

- [ ] Replace the `onSuccess` (lines 244–246):

```ts
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['studio', 'batches'] });
    },
```

with:

```ts
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['studio', 'batches'] });
      qc.invalidateQueries({ queryKey: ['studio', 'schedule'] });
    },
```

**Checkpoint:**
```
cd /home/mp2sslrl/code/code && export PATH="$HOME/.local/bin:$PATH"
# usePublishSlots block (236–248) now contains a schedule invalidation:
awk 'NR>=236 && NR<=248' apps/admin/src/hooks/useStudioQueries.ts | grep -c "studio', 'schedule"   # expect: 1
pnpm --filter @findemy/admin typecheck   # expect: exit 0
```

---

### Task 2 (C2, high) — Token gate on `useStudioSchedule` and `useBatchSlots`

**File:** `apps/admin/src/hooks/useStudioQueries.ts` — `useStudioSchedule` (89–94), `useBatchSlots` (258–264)

On cold start / after logout these fire with no token → 401 / error flash. Add the `token` selector + `enabled: !!token`, combining with any existing param gate.

- [ ] Replace `useStudioSchedule` (89–94):

```ts
export function useStudioSchedule({ week_start }: { week_start: string }) {
  return useQuery<{ days: { date: string; items: ScheduleItem[] }[] }>({
    queryKey: ['studio', 'schedule', week_start],
    queryFn: () => api.studio.schedule.get({ week_start }),
  });
}
```

with:

```ts
export function useStudioSchedule({ week_start }: { week_start: string }) {
  const token = useAuth((s) => s.accessToken);
  return useQuery<{ days: { date: string; items: ScheduleItem[] }[] }>({
    queryKey: ['studio', 'schedule', week_start],
    queryFn: () => api.studio.schedule.get({ week_start }),
    enabled: !!token,
  });
}
```

- [ ] Replace `useBatchSlots` (258–264) — it already has `enabled: !!batchId && !!date`; add the token to the existing condition:

```ts
export function useBatchSlots(batchId: string, date: string) {
  return useQuery<{ slots: any[] }>({
    queryKey: ['studio', 'batches', batchId, 'slots', date],
    queryFn: () => api.studio.batches.slots(batchId, { date }),
    enabled: !!batchId && !!date,
  });
}
```

with:

```ts
export function useBatchSlots(batchId: string, date: string) {
  const token = useAuth((s) => s.accessToken);
  return useQuery<{ slots: any[] }>({
    queryKey: ['studio', 'batches', batchId, 'slots', date],
    queryFn: () => api.studio.batches.slots(batchId, { date }),
    enabled: !!token && !!batchId && !!date,
  });
}
```

`useAuth` is already imported at line 3 — no import change.

**Checkpoint:**
```
cd /home/mp2sslrl/code/code && export PATH="$HOME/.local/bin:$PATH"
grep -n "enabled: !!token," apps/admin/src/hooks/useStudioQueries.ts        # useStudioSchedule line present
grep -n "enabled: !!token && !!batchId && !!date" apps/admin/src/hooks/useStudioQueries.ts   # expect: 1 match
pnpm --filter @findemy/admin typecheck   # expect: exit 0
```

---

### Task 3 (C3, medium) — id (and token) gates on `useStudioTrial`, `useStudioBatch`, `useBatchAttendance`

**File:** `apps/admin/src/hooks/useStudioQueries.ts` — `useStudioTrial` (50–55), `useStudioBatch` (103–108), `useBatchAttendance` (143–148)

These fire with `id`/`batchId` = `undefined` before `useLocalSearchParams` resolves → requests to `/studio/.../undefined`. Consumers: `useStudioTrial` ← `app/attendance-otp.tsx:21`; `useStudioBatch` ← `app/batches/[id]/index.tsx:15`, `edit.tsx:15`; `useBatchAttendance` ← `app/batches/[id]/attendance.tsx:18`. Match the existing `enabled: !!batchId` pattern on `useBatchStudents` (254). Add `!!token` too — these screens are all behind auth.

- [ ] Replace `useStudioTrial` (50–55):

```ts
export function useStudioTrial(id: string) {
  return useQuery<{ trial: TrialDetail; student: StudentSnapshot }>({
    queryKey: ['studio', 'trial', id],
    queryFn: () => api.studio.trials.get(id),
  });
}
```

with:

```ts
export function useStudioTrial(id: string) {
  const token = useAuth((s) => s.accessToken);
  return useQuery<{ trial: TrialDetail; student: StudentSnapshot }>({
    queryKey: ['studio', 'trial', id],
    queryFn: () => api.studio.trials.get(id),
    enabled: !!token && !!id,
  });
}
```

- [ ] Replace `useStudioBatch` (103–108):

```ts
export function useStudioBatch(id: string) {
  return useQuery<{ batch: Batch }>({
    queryKey: ['studio', 'batch', id],
    queryFn: () => api.studio.batches.get(id),
  });
}
```

with:

```ts
export function useStudioBatch(id: string) {
  const token = useAuth((s) => s.accessToken);
  return useQuery<{ batch: Batch }>({
    queryKey: ['studio', 'batch', id],
    queryFn: () => api.studio.batches.get(id),
    enabled: !!token && !!id,
  });
}
```

- [ ] Replace `useBatchAttendance` (143–148):

```ts
export function useBatchAttendance({ batchId, date }: { batchId: string; date: string }) {
  return useQuery<{ students: { user_id: string; name: string; present: boolean }[] }>({
    queryKey: ['studio', 'batch', batchId, 'attendance', date],
    queryFn: () => api.studio.batches.attendance.get(batchId, { date }),
  });
}
```

with:

```ts
export function useBatchAttendance({ batchId, date }: { batchId: string; date: string }) {
  const token = useAuth((s) => s.accessToken);
  return useQuery<{ students: { user_id: string; name: string; present: boolean }[] }>({
    queryKey: ['studio', 'batch', batchId, 'attendance', date],
    queryFn: () => api.studio.batches.attendance.get(batchId, { date }),
    enabled: !!token && !!batchId && !!date,
  });
}
```

**Checkpoint:**
```
cd /home/mp2sslrl/code/code && export PATH="$HOME/.local/bin:$PATH"
grep -c "enabled: !!token && !!id" apps/admin/src/hooks/useStudioQueries.ts          # expect: 2 (trial + batch)
grep -c "enabled: !!token && !!batchId && !!date" apps/admin/src/hooks/useStudioQueries.ts   # expect: 2 (slots + attendance)
pnpm --filter @findemy/admin typecheck   # expect: exit 0
```

---

### Task 4 (C4, medium) — Workshop edit `reset()` must not wipe in-progress edits

**File:** `apps/admin/app/workshops/[id].tsx:57–71`

`workshop = data?.items.find((w) => w.id === id)` (line 38) returns a NEW object reference after any background refetch/invalidation of `['studio','workshops']`. The effect depends on `[workshop]` (line 71), so each refetch re-runs `reset(...)` and discards whatever the user is mid-typing. Depend on `workshop?.id` so reset runs once per workshop, not per object identity.

- [ ] Change the dependency array on line 71:

```ts
  }, [workshop]);
```

to:

```ts
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workshop?.id]);
```

(The body still reads the latest `workshop` fields; we only stop re-running on every new object reference. The eslint-disable documents the intentional narrow dependency. The early `if (!workshop) return;` at line 58 still guards the first undefined render.)

**Checkpoint:**
```
cd /home/mp2sslrl/code/code && export PATH="$HOME/.local/bin:$PATH"
grep -n "\[workshop?.id\]" apps/admin/app/workshops/\[id\].tsx     # expect: 1 match
grep -c "}, \[workshop\]);" apps/admin/app/workshops/\[id\].tsx    # expect: 0 (old dep gone)
pnpm --filter @findemy/admin typecheck   # expect: exit 0
```

---

### Task 5 (C5, medium) — Settings: optimistic toggle + rollback + disable + error toast

**Depends on Group A** (the `mutationFn` deep-merge in `useUpdateStudioSettings` and the read-side `settings` shape). This task adds `onMutate`/`onError` to the hook and `disabled`/error-toast to the screen. Do NOT touch the `mutationFn` body or the merge logic.

**Files:**
- `apps/admin/src/hooks/useStudioQueries.ts:226–234` (`useUpdateStudioSettings`)
- `apps/admin/app/(tabs)/settings.tsx` (Switches + toast)

**5a — Hook: optimistic cache update with rollback.**

The mutation variable is a deep-partial `{ notifications?: {...}, privacy?: {...} }` (the screen sends one nested leaf at a time, e.g. `{ notifications: { new_trial: { push: true } } }` or `{ privacy: { show_phone: true } }`). Cache shape is `{ settings: Settings }` under `['studio','settings']`. Optimistically deep-merge the partial into the cached settings, snapshot for rollback, and keep the existing `onSuccess` invalidation.

- [ ] Replace `useUpdateStudioSettings` (226–234):

```ts
export function useUpdateStudioSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (req: any) => api.studio.settings.update(req),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['studio', 'settings'] });
    },
  });
}
```

with:

```ts
// Deep-merge a partial settings patch into the cached object so toggles
// reflect instantly. Mirrors the server-side merge that Group A implemented
// in `mutationFn`; here it only drives the optimistic cache value.
function mergeSettings(base: any, patch: any): any {
  if (patch == null || typeof patch !== 'object') return patch;
  const out: any = Array.isArray(base) ? [...(base ?? [])] : { ...(base ?? {}) };
  for (const key of Object.keys(patch)) {
    const pv = patch[key];
    out[key] =
      pv != null && typeof pv === 'object' && !Array.isArray(pv)
        ? mergeSettings(out[key], pv)
        : pv;
  }
  return out;
}

export function useUpdateStudioSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (req: any) => api.studio.settings.update(req),
    onMutate: async (patch: any) => {
      await qc.cancelQueries({ queryKey: ['studio', 'settings'] });
      const previous = qc.getQueryData<{ settings: Settings }>(['studio', 'settings']);
      if (previous) {
        qc.setQueryData<{ settings: Settings }>(['studio', 'settings'], {
          settings: mergeSettings(previous.settings, patch),
        });
      }
      return { previous };
    },
    onError: (_err, _patch, ctx) => {
      if (ctx?.previous) {
        qc.setQueryData(['studio', 'settings'], ctx.previous);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['studio', 'settings'] });
    },
  });
}
```

`Settings` is already imported at line 16; `useQueryClient` at line 1. No import changes.

> If Group A already added its own `onMutate`/optimistic block, do NOT add a second one — instead verify it includes the rollback (`onError` restoring `ctx.previous`) and leave the screen-side changes (5b) as the only addition. The two groups must not both own the optimistic block.

**5b — Screen: disable Switches while pending + error toast.**

The `Toast` provider exposes `useToast().show(message, 'error')` (`apps/admin/src/components/Toast.tsx:49`). The screen currently fires `update.mutate(...)` fire-and-forget with no disable and no failure feedback.

- [ ] Add the toast import and hook. After the existing import block (the line `import type { Settings } from '@findemy/types';` at line 8), the imports already include the screen's deps; add the Toast import:

```ts
import type { Settings } from '@findemy/types';
```

becomes (insert a line after it):

```ts
import type { Settings } from '@findemy/types';
import { useToast } from '@/components/Toast';
```

- [ ] Inside the component, after `const update = useUpdateStudioSettings();` (line 15), add:

```ts
  const update = useUpdateStudioSettings();
```

becomes:

```ts
  const update = useUpdateStudioSettings();
  const { show: showToast } = useToast();
```

- [ ] Add error feedback to both mutate callers (19–22). Replace:

```ts
  const setNotif = (group: 'new_trial' | 'classes' | 'reviews_activity' | 'quiet_hours', key: string, value: boolean) => {
    update.mutate({ notifications: { [group]: { [key]: value } } } as any);
  };
  const setPrivacy = (value: boolean) => update.mutate({ privacy: { show_phone: value } } as any);
```

with:

```ts
  const onSettingsError = () => showToast('Could not save setting', 'error');
  const setNotif = (group: 'new_trial' | 'classes' | 'reviews_activity' | 'quiet_hours', key: string, value: boolean) => {
    update.mutate({ notifications: { [group]: { [key]: value } } } as any, { onError: onSettingsError });
  };
  const setPrivacy = (value: boolean) =>
    update.mutate({ privacy: { show_phone: value } } as any, { onError: onSettingsError });
```

(The per-call `onError` runs in addition to the hook's rollback `onError`; react-query invokes both. The hook restores the cache, the screen shows the toast — the Switch snaps back to truth via the restored cache.)

- [ ] Disable the Switch while a write is in flight. In the `Row` component's `<Switch>` (45–50), add `disabled`:

```ts
        <Switch
          value={value}
          onValueChange={onChange}
          trackColor={{ false: theme.color.whisper, true: theme.color.persimmonSoft }}
          thumbColor={value ? theme.color.persimmon : theme.color.mist}
        />
```

becomes:

```ts
        <Switch
          value={value}
          onValueChange={onChange}
          disabled={update.isPending}
          trackColor={{ false: theme.color.whisper, true: theme.color.persimmonSoft }}
          thumbColor={value ? theme.color.persimmon : theme.color.mist}
        />
```

`update` is in the component's closure (the `Row` is declared inside `SettingsScreen`), so `update.isPending` is in scope.

**Checkpoint:**
```
cd /home/mp2sslrl/code/code && export PATH="$HOME/.local/bin:$PATH"
grep -c "onMutate" apps/admin/src/hooks/useStudioQueries.ts            # expect: >=1 (optimistic added)
grep -c "ctx?.previous" apps/admin/src/hooks/useStudioQueries.ts        # expect: 1 (rollback)
grep -n "disabled={update.isPending}" apps/admin/app/\(tabs\)/settings.tsx   # expect: 1 match
grep -n "showToast('Could not save setting'" apps/admin/app/\(tabs\)/settings.tsx   # expect: 1 match
pnpm --filter @findemy/admin typecheck   # expect: exit 0
```

---

### Task 6 (C6, low) — New-workshop buttons must be disabled while creating

**File:** `apps/admin/app/workshops/new.tsx:188–194`

Both "Publish workshop" and "Save as draft" share `loading={createWorkshop.isPending}` but neither is `disabled`, so a fast double-tap (or tapping the other button mid-create) fires two `create` calls. Disable both while pending.

- [ ] Replace the button block (188–194):

```tsx
        <View style={{ marginTop: 32, gap: 10 }}>
          <Button block loading={createWorkshop.isPending} onPress={submit('upcoming')}>
            Publish workshop
          </Button>
          <Button block variant="ghost" loading={createWorkshop.isPending} onPress={submit('draft')}>
            Save as draft
          </Button>
        </View>
```

with:

```tsx
        <View style={{ marginTop: 32, gap: 10 }}>
          <Button block loading={createWorkshop.isPending} disabled={createWorkshop.isPending} onPress={submit('upcoming')}>
            Publish workshop
          </Button>
          <Button block variant="ghost" loading={createWorkshop.isPending} disabled={createWorkshop.isPending} onPress={submit('draft')}>
            Save as draft
          </Button>
        </View>
```

**Checkpoint:**
```
cd /home/mp2sslrl/code/code && export PATH="$HOME/.local/bin:$PATH"
grep -c "disabled={createWorkshop.isPending}" apps/admin/app/workshops/new.tsx   # expect: 2
pnpm --filter @findemy/admin typecheck   # expect: exit 0
```

---

### Task 7 (C7, medium) — Schedule cancel/reschedule in-flight guard

**File:** `apps/admin/app/(tabs)/schedule.tsx` — `handleCancelSlot` (115–137), `handleReschedule` (139–149), action sheet (354–365), `RescheduleModal` confirm (83–85)

Both handlers call `refetch()` un-awaited after the mutation, and the trigger Pressables are never disabled, so a rapid double-tap fires two `deleteSlot`/`rescheduleSlot` mutations. The hooks (`useDeleteSlot` 352–361, `useRescheduleSlot` 363–373) already invalidate `['studio','schedule']` themselves, so the manual `refetch()` is redundant — drop it and rely on the invalidation. Add disabled guards on the action triggers.

> Group A owns the `item.slot_id ?? item.id` selection inside these handlers (lines 127, 143). Leave that expression as Group A left it; only change the post-mutation `refetch()` and add disabled guards.

- [ ] In `handleCancelSlot`, remove the un-awaited `refetch()` (line 129). Replace the `onPress` body (125–133):

```ts
          onPress: async () => {
            try {
              await deleteSlot.mutateAsync(item.slot_id ?? item.id);
              refetch();
              showToast('Class cancelled', 'success');
            } catch {
              showToast('Failed to cancel class', 'error');
            }
          },
```

with:

```ts
          onPress: async () => {
            if (deleteSlot.isPending) return;
            try {
              await deleteSlot.mutateAsync(item.slot_id ?? item.id);
              // useDeleteSlot invalidates ['studio','schedule'] — no manual refetch needed
              showToast('Class cancelled', 'success');
            } catch {
              showToast('Failed to cancel class', 'error');
            }
          },
```

- [ ] In `handleReschedule` (139–149), remove the un-awaited `refetch()` (line 144) and add an in-flight guard:

```ts
  const handleReschedule = async (newTime: string) => {
    const item = rescheduleItem;
    setRescheduleItem(null);
    try {
      await rescheduleSlot.mutateAsync({ id: item.slot_id ?? item.id, slot_time: newTime });
      refetch();
      showToast('Class rescheduled', 'success');
    } catch {
      showToast('Failed to reschedule', 'error');
    }
  };
```

with:

```ts
  const handleReschedule = async (newTime: string) => {
    if (rescheduleSlot.isPending) return;
    const item = rescheduleItem;
    setRescheduleItem(null);
    try {
      await rescheduleSlot.mutateAsync({ id: item.slot_id ?? item.id, slot_time: newTime });
      // useRescheduleSlot invalidates ['studio','schedule'] — no manual refetch needed
      showToast('Class rescheduled', 'success');
    } catch {
      showToast('Failed to reschedule', 'error');
    }
  };
```

- [ ] Disable the two action-sheet triggers while their mutation is in flight. Replace the Reschedule + Cancel Pressables (354–365):

```tsx
            <Pressable
              style={[styles.sheetAction, { borderColor: theme.color.hairline }]}
              onPress={() => { setRescheduleItem(menuItem); setMenuItem(null); }}
            >
              <Text style={{ fontFamily: theme.font.sans, fontSize: 15, color: theme.color.ink }}>Reschedule</Text>
            </Pressable>
            <Pressable
              style={[styles.sheetAction, { borderColor: theme.color.hairline }]}
              onPress={() => handleCancelSlot(menuItem)}
            >
              <Text style={{ fontFamily: theme.font.sans, fontSize: 15, color: theme.color.rose }}>Cancel class</Text>
            </Pressable>
```

with:

```tsx
            <Pressable
              style={[styles.sheetAction, { borderColor: theme.color.hairline, opacity: rescheduleSlot.isPending ? 0.4 : 1 }]}
              onPress={() => { setRescheduleItem(menuItem); setMenuItem(null); }}
              disabled={rescheduleSlot.isPending}
            >
              <Text style={{ fontFamily: theme.font.sans, fontSize: 15, color: theme.color.ink }}>Reschedule</Text>
            </Pressable>
            <Pressable
              style={[styles.sheetAction, { borderColor: theme.color.hairline, opacity: deleteSlot.isPending ? 0.4 : 1 }]}
              onPress={() => handleCancelSlot(menuItem)}
              disabled={deleteSlot.isPending}
            >
              <Text style={{ fontFamily: theme.font.sans, fontSize: 15, color: theme.color.rose }}>Cancel class</Text>
            </Pressable>
```

- [ ] Disable the modal "Reschedule" confirm button while pending. In `RescheduleModal`, the confirm Pressable (83–85) cannot see `rescheduleSlot` (it's outside `ScheduleScreen`), so thread an `isPending` prop. Update the interface (32–37):

```ts
interface RescheduleModalProps {
  visible: boolean;
  item: any;
  onClose: () => void;
  onConfirm: (newTime: string) => void;
}
```

to:

```ts
interface RescheduleModalProps {
  visible: boolean;
  item: any;
  onClose: () => void;
  onConfirm: (newTime: string) => void;
  isPending?: boolean;
}
```

  Update the signature (39):

```ts
function RescheduleModal({ visible, item, onClose, onConfirm }: RescheduleModalProps) {
```

to:

```ts
function RescheduleModal({ visible, item, onClose, onConfirm, isPending }: RescheduleModalProps) {
```

  Update the confirm Pressable (83–85):

```tsx
            <Pressable style={[styles.modalBtn, { backgroundColor: theme.color.persimmon, flex: 1 }]} onPress={handleConfirm}>
              <Text style={{ fontFamily: theme.font.sans, fontSize: 14, fontWeight: '600', color: '#fff' }}>Reschedule</Text>
            </Pressable>
```

to:

```tsx
            <Pressable style={[styles.modalBtn, { backgroundColor: theme.color.persimmon, flex: 1, opacity: isPending ? 0.6 : 1 }]} onPress={handleConfirm} disabled={isPending}>
              <Text style={{ fontFamily: theme.font.sans, fontSize: 14, fontWeight: '600', color: '#fff' }}>{isPending ? 'Rescheduling…' : 'Reschedule'}</Text>
            </Pressable>
```

  Pass the prop at the render site (376–381):

```tsx
      <RescheduleModal
        visible={!!rescheduleItem}
        item={rescheduleItem}
        onClose={() => setRescheduleItem(null)}
        onConfirm={handleReschedule}
      />
```

to:

```tsx
      <RescheduleModal
        visible={!!rescheduleItem}
        item={rescheduleItem}
        onClose={() => setRescheduleItem(null)}
        onConfirm={handleReschedule}
        isPending={rescheduleSlot.isPending}
      />
```

> **Note on `refetch`:** After removing both `refetch()` calls, `refetch` is still destructured at line 102 and used by `ErrorState onRetry={refetch}` (236), so the import/destructure stays — no unused-var error.

**Checkpoint:**
```
cd /home/mp2sslrl/code/code && export PATH="$HOME/.local/bin:$PATH"
grep -c "deleteSlot.isPending" apps/admin/app/\(tabs\)/schedule.tsx        # expect: >=2 (guard + sheet)
grep -c "rescheduleSlot.isPending" apps/admin/app/\(tabs\)/schedule.tsx    # expect: >=3 (guard + sheet + modal prop)
grep -c "refetch();" apps/admin/app/\(tabs\)/schedule.tsx                  # expect: 0 (both manual refetches removed)
grep -c "onRetry={refetch}" apps/admin/app/\(tabs\)/schedule.tsx          # expect: 1 (refetch still used → no unused var)
pnpm --filter @findemy/admin typecheck   # expect: exit 0
```

---

## Final verification (whole group)

```
cd /home/mp2sslrl/code/code && export PATH="$HOME/.local/bin:$PATH"
pnpm --filter @findemy/admin typecheck   # expect: clean, exit 0

# C1 — publish invalidates schedule
awk 'NR>=236 && NR<=249' apps/admin/src/hooks/useStudioQueries.ts | grep -c "studio', 'schedule"   # >=1
# C2/C3 — token + id gates
grep -c "const token = useAuth((s) => s.accessToken);" apps/admin/src/hooks/useStudioQueries.ts     # 8 (3 pre-existing + 5 added)
grep -c "enabled: !!token && !!id" apps/admin/src/hooks/useStudioQueries.ts                          # 2
grep -c "enabled: !!token && !!batchId && !!date" apps/admin/src/hooks/useStudioQueries.ts           # 2
# C4 — workshop reset narrowed
grep -c "\[workshop?.id\]" apps/admin/app/workshops/\[id\].tsx                                        # 1
# C5 — optimistic + disable + toast
grep -c "onMutate" apps/admin/src/hooks/useStudioQueries.ts                                           # >=1
grep -c "disabled={update.isPending}" apps/admin/app/\(tabs\)/settings.tsx                            # 1
# C6 — double-submit guard
grep -c "disabled={createWorkshop.isPending}" apps/admin/app/workshops/new.tsx                        # 2
# C7 — schedule guards, no manual refetch
grep -c "refetch();" apps/admin/app/\(tabs\)/schedule.tsx                                             # 0
```

Manual smoke flows:
- **C1:** Publish slots for a date (`/schedule/publish`) → switch to the Schedule tab → the new slots appear without a reload.
- **C2/C3:** Log out, then re-launch → no 401/error flash on Schedule / Batch / Attendance / Trial screens (queries idle until token + id present).
- **C4:** Open a workshop to edit, start typing in a field, wait for a background refetch (or pull-to-refresh) → your edits are NOT wiped.
- **C5:** Toggle a settings switch → it flips instantly (optimistic); switches disable briefly while saving; kill the network and toggle → it snaps back and an error toast appears.
- **C6:** On New Workshop, double-tap Publish → only ONE workshop is created.
- **C7:** Open a class's ⋯ menu → Cancel; double-tap is ignored; the week refreshes via the hook's own invalidation; reschedule confirm shows "Rescheduling…" and is un-tappable while in flight.

> **Group A coupling reminder:** C5 (settings merge) and C7 (`slot_id` selection) correctness live in Group A. If A is not yet merged, the optimistic value and the cancelled slot may use the wrong field — run Group A's checkpoints first, then this group's, to confirm both layers agree.
