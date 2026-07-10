# Group B — Cache Hygiene — Sub-Plan
**Parent:** [00-MASTER-PLAN.md](./00-MASTER-PLAN.md)
**Goal:** Fix mutation cache invalidations so lists/details refresh without a manual reload, and remove the duplicate useEnrollBatch.
**Depends on:** Group A (correct trial data). **Blocks:** Group C partially (workshop terminal-state relies on B2).

---

## Context: verified query keys (read before editing)

These are the EXACT consumer query keys confirmed by reading source. Invalidation keys MUST match these prefixes.

| Data | Consumer hook | Query key | File |
| --- | --- | --- | --- |
| Slot list / capacity | `useBatchSlots` / `useProgramSlots` | `["slots", batchId, date]` | `apps/student/src/hooks/useSlots.ts:6,26` |
| Batch availability | `useBatchAvailability` | `["batch-availability", batchId]` | `apps/student/src/hooks/useRenewal.ts:43` |
| Enrollment status | `useEnrollmentStatus` | `["enrollment", batchId]` | `apps/student/src/hooks/useEnroll.ts:7` |
| My enrollments | (list) | `["me", "enrollments"]` | `apps/student/src/hooks/useEnroll.ts:20` |
| Workshop registration status | `useWorkshopRegistrationStatus` | `["workshops", workshopId, "registration"]` | `apps/student/src/hooks/useWorkshops.ts:20` |
| My workshop registrations | `useMyWorkshopRegistrations` | `["me", "workshop-registrations"]` | `apps/student/src/hooks/useWorkshops.ts:27` |
| Trial detail | `useTrial` | `["trial", id]` | `apps/student/src/hooks/useTrials.ts:18` |

> **CORRECTION vs. the issue list:** The slot capacity key is **`["slots", batchId, date]`** (a `slots`-prefixed key with a trailing `date` segment), NOT `["batches", batchId, "slots"]`. There is no `["batches", …, "slots"]` key anywhere in the codebase. The plan below uses the verified `["slots", batchId]` prefix (no `date`), which invalidates every cached date for that batch — exactly what we want after a booking.

---

## Files touched

| File | Change | Issue |
| --- | --- | --- |
| `apps/student/src/hooks/useRenewal.ts` | DELETE duplicate `useEnrollBatch` | B1 |
| `apps/student/app/program/[id]/review.tsx` | (verify import — already from `useEnroll`) | B1 |
| `apps/student/src/hooks/useWorkshops.ts` | Add `["me","workshop-registrations"]` invalidation to `useRegisterWorkshop` | B2 |
| `apps/student/src/hooks/useBookings.ts` | Add `onSuccess` to `useCreateBooking` invalidating slots + availability | B3 |
| `apps/student/app/post-trial/index.tsx` | Add `["trial", trialId]` invalidation to review submit | B4 |

---

## Tasks

### Task 1 (B1, high) — Delete duplicate `useEnrollBatch` from `useRenewal.ts`

**Files:**
- `apps/student/src/hooks/useRenewal.ts:13-25` (the duplicate to delete)
- `apps/student/src/hooks/useEnroll.ts:13-26` (the canonical copy to keep — it invalidates BOTH `["enrollment", batchId]` and `["me","enrollments"]`)

**Importer audit (`grep -rn "useEnrollBatch" apps/student`):**
```
apps/student/app/trials/[id].tsx:7        import { useEnrollmentStatus, useEnrollBatch } from "@/hooks/useEnroll";   ✅ already correct
apps/student/app/program/[id]/review.tsx:17   import { useEnrollBatch } from "@/hooks/useEnroll";                     ✅ already correct
apps/student/src/components/BatchDetailSheet.tsx:5  import { useEnrollBatch, useEnrollmentStatus } from "@/hooks/useEnroll"; ✅ already correct
apps/student/src/hooks/useRenewal.ts:13   export const useEnrollBatch = ...   ← the duplicate definition
apps/student/src/hooks/useEnroll.ts:13    export function useEnrollBatch() ...  ← the canonical definition
```

**Finding:** ALL three importers already import `useEnrollBatch` from `@/hooks/useEnroll`. Nothing imports it from `useRenewal`. So the `useRenewal` copy is dead — no importer rewrites are needed, just deletion.

**Steps:**

1. Open `apps/student/src/hooks/useRenewal.ts`. The duplicate block is lines 13–25:
```ts
export const useEnrollBatch = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ batchId, package_type }: { batchId: string; package_type: string }) =>
      api.batches.enroll(batchId, { package_type }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["me", "enrollments"] });
    },
    onError: (err: any) => {
      Alert.alert("Could not enroll", err?.message ?? "Please try again.");
    },
  });
};
```

2. Delete that entire block (including the trailing blank line after it so two blank lines do not collapse oddly). The file keeps `useRenewalOptions` (5–11), `useRenewEnrollment` (27–39), and `useBatchAvailability` (41–47).

   After deletion the top of the file reads:
```ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Alert } from "react-native";
import { api } from "@/lib/api";

export function useRenewalOptions(batchId: string) {
  return useQuery({
    queryKey: ["renewal-options", batchId],
    queryFn: () => api.batches.getRenewalOptions(batchId),
    enabled: !!batchId,
  });
}

export const useRenewEnrollment = () => {
```

3. Do NOT remove the `useMutation` / `useQueryClient` / `Alert` imports — they are still used by `useRenewEnrollment` (which calls all three).

**Checkpoint:**
```
grep -rn "useEnrollBatch" apps/student/src/hooks/useRenewal.ts   # expect: NO output
grep -rn "from \"@/hooks/useRenewal\"" apps/student | grep -i enroll   # expect: NO output
cd apps/student && npx tsc --noEmit
```
Expected: first two greps print nothing; tsc exits 0. (If tsc surfaces an unused-import error for `Alert`/`useMutation`/`useQueryClient`, re-check step 3 — they should still be referenced by `useRenewEnrollment`.)

---

### Task 2 (B2, high) — `useRegisterWorkshop` must invalidate the "my registrations" list

**Files:**
- `apps/student/src/hooks/useWorkshops.ts:31-42` (`useRegisterWorkshop` — currently invalidates only the registration-status key)
- `apps/student/src/hooks/useWorkshops.ts:25-29` (consumer `useMyWorkshopRegistrations`, key `["me", "workshop-registrations"]`)
- `apps/student/src/hooks/useWorkshops.ts:61-63` (sibling `useCancelWorkshopRegistration` already invalidates BOTH — mirror it)

**Steps:**

1. In `useRegisterWorkshop`, replace the `onSuccess` (lines 35–37):
```ts
    onSuccess: (_, workshopId) => {
      qc.invalidateQueries({ queryKey: ["workshops", workshopId, "registration"] });
    },
```
with:
```ts
    onSuccess: (_, workshopId) => {
      qc.invalidateQueries({ queryKey: ["workshops", workshopId, "registration"] });
      qc.invalidateQueries({ queryKey: ["me", "workshop-registrations"] });
    },
```

This now mirrors `useCancelWorkshopRegistration` (lines 61–64).

**Checkpoint:**
```
grep -n "me.*workshop-registrations" apps/student/src/hooks/useWorkshops.ts
```
Expected: TWO matches (one inside `useRegisterWorkshop` ~line 37, one inside `useCancelWorkshopRegistration` ~line 64). Then:
```
cd apps/student && npx tsc --noEmit
```
Expected: exits 0.

---

### Task 3 (B3, high) — `useCreateBooking` has no `onSuccess`; add slot + availability invalidation

**Files:**
- `apps/student/src/hooks/useBookings.ts:10-13` (`useCreateBooking` — no `onSuccess`)
- `apps/student/src/hooks/useSlots.ts:6,26` (consumer key `["slots", batchId, date]`)
- `apps/student/src/hooks/useRenewal.ts:43` (consumer key `["batch-availability", batchId]`)
- `apps/student/app/booking/slot.tsx:91` (caller — passes `{ batch_id, slot_id }`)
- `packages/types/src/index.ts:43-45` (`CreateBookingRequest` = `{ batch_id, slot_id }`)

**Step 0 — confirm consumer keys (the crux of B3):**

Grep results that pin down the EXACT keys the mutation must invalidate:
```
# slot capacity is read here — key is ["slots", batchId, date]:
apps/student/src/hooks/useSlots.ts:6     queryKey: ["slots", batchId, date],
apps/student/src/hooks/useSlots.ts:26    queryKey: ["slots", b.id, date],

# batch availability is read here — key is ["batch-availability", batchId]:
apps/student/src/hooks/useRenewal.ts:43  queryKey: ["batch-availability", batchId],
```
There is **no** `["batches", batchId, "slots"]` key in the repo (the issue's proposed key was wrong). We use the partial key `["slots", batch_id]` — React Query treats it as a prefix, so it invalidates every cached `["slots", batch_id, <date>]` entry for that batch, which is exactly what we want after a booking consumes a slot.

**`batchId` availability:** The mutation variables ARE `CreateBookingRequest` = `{ batch_id, slot_id }` (verified `packages/types/src/index.ts:43-45`, and the caller `apps/student/app/booking/slot.tsx:91` calls `createBooking.mutateAsync({ batch_id, slot_id: selectedSlot })`). So `batch_id` is the second arg to `onSuccess` — no need to read it from the response.

**Steps:**

1. The current hook (lines 10–13):
```ts
export const useCreateBooking = () =>
  useMutation({
    mutationFn: api.bookings.create,
  });
```

2. Replace it with a version that captures the query client and invalidates on success, reading `batch_id` from the mutation variables:
```ts
export const useCreateBooking = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.bookings.create,
    onSuccess: (_, { batch_id }) => {
      qc.invalidateQueries({ queryKey: ["slots", batch_id] });
      qc.invalidateQueries({ queryKey: ["batch-availability", batch_id] });
    },
  });
};
```

`useQueryClient` is already imported at `apps/student/src/hooks/useBookings.ts:1`, so no import change is needed. The destructured `{ batch_id }` is fully typed because `api.bookings.create` takes `CreateBookingRequestType` (`{ batch_id: string; slot_id: string }`).

**Checkpoint:**
```
grep -n "queryKey: \[\"slots\", batch_id\]" apps/student/src/hooks/useBookings.ts
grep -n "batch-availability.*batch_id" apps/student/src/hooks/useBookings.ts
cd apps/student && npx tsc --noEmit
```
Expected: each grep prints exactly one match; tsc exits 0 (confirms `batch_id` destructure is type-safe).

**Manual flow note:** Book a trial slot end-to-end (`/booking/slot` → select slot → Continue → pay). Navigate back to the same batch's slot calendar (`apps/student/app/booking/slot.tsx`) — the booked slot's "N left" capacity should now reflect the reservation without a manual app reload, because `["slots", batch_id]` was invalidated and `useBatchSlots` refetches.

---

### Task 4 (B4, medium) — Review submit must invalidate the trial DETAIL key

**Files:**
- `apps/student/app/post-trial/index.tsx:44-58` (the `submit` mutation; `onSuccess` at 51–54)
- `apps/student/app/post-trial/index.tsx:31` (`trialId` is in scope, destructured from `useLocalSearchParams`)
- `apps/student/src/hooks/useTrials.ts:18` (consumer `useTrial`, key `["trial", id]`)

**Steps:**

1. Current `onSuccess` (lines 51–54):
```ts
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trials"] });
      setSubmitted(true);
    },
```

2. Add the detail-key invalidation so the single-trial screen (`useTrial`, key `["trial", trialId]`) refreshes too:
```ts
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trials"] });
      queryClient.invalidateQueries({ queryKey: ["trial", trialId] });
      setSubmitted(true);
    },
```
`trialId` is already in scope from the `useLocalSearchParams` destructure at line 31, and `queryClient` from `useQueryClient()` at line 38.

**Checkpoint:**
```
grep -n "queryKey: \[\"trial\", trialId\]" apps/student/app/post-trial/index.tsx
cd apps/student && npx tsc --noEmit
```
Expected: grep prints one match; tsc exits 0.

---

## Final verification (whole group)

```
cd apps/student && npx tsc --noEmit                                  # expect: clean, exit 0
grep -rn "useEnrollBatch" apps/student/src/hooks/useRenewal.ts       # expect: no output (B1 done)
grep -n "me.*workshop-registrations" apps/student/src/hooks/useWorkshops.ts   # expect: 2 matches (B2 done)
grep -n "queryKey: \[\"slots\", batch_id\]" apps/student/src/hooks/useBookings.ts   # expect: 1 match (B3 done)
grep -n "queryKey: \[\"trial\", trialId\]" apps/student/app/post-trial/index.tsx   # expect: 1 match (B4 done)
```

Manual smoke flows:
- **B2/B3:** Book a trial → after payment, the slot calendar capacity updates and the workshop/enrollment lists reflect the new state on next view without a reload.
- **B4:** Submit a post-trial review → re-open that trial's detail screen and confirm the review/rating shows immediately (detail key invalidated).

> **EXCLUDED:** Original B5 (saved-academy keys) was a FALSE positive — the save/unsave mutations and `useSavedAcademies` already share `["me","saved-academies"]`. No change.
