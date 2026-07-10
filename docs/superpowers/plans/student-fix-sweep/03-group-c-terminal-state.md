# Group C — Terminal-State UI Gates — Sub-Plan
**Parent:** [00-MASTER-PLAN.md](./00-MASTER-PLAN.md)
**Goal:** Prevent the UI from offering actions that the backend will reject (register-while-loading, renew on terminal enrollment, register past deadline) and explain disabled actions.
**Depends on:** Group A, Group B (correct + fresh data). **Blocks:** nothing.

---

## Schema / line-number corrections found during verification

Read the cited files before editing — line numbers below are the **current** (post-drift) locations, re-verified against the working tree.

- **EnrollmentStatus enum is only `active` | `inactive`.** `apps/api/prisma/schema.prisma:486-489`:
  ```prisma
  enum EnrollmentStatus {
    active
    inactive
  }
  ```
  The audit's proposed C3 condition (`status not in ["active","paused","ending"]`) is **incorrect** — there is no `paused`, `ending`, or `grace` value in the enum. The client object's `status` field (`apps/api/src/modules/enrollments/service.ts:157` and `:551`) is the raw enum, so `enrollment.status` is **only ever `"active"` or `"inactive"`**. "Paused" and "Ending" are *derived* on the client from `paused_until` (non-null) and `discontinue_requested_at` (non-null), not from `status`. The screen even references `enrollment.status === "grace"` at `apps/student/app/enrollment/[id].tsx:1102`, but the backend never emits `"grace"`, so that branch is dead. **Correct C3 terminal check is `enrollment.status !== "active"` (equivalently `=== "inactive"`).**
- The client enrollment field names are snake_case: `enrollment.status`, `enrollment.paused_until`, `enrollment.discontinue_requested_at` (confirmed at `service.ts:157-160`).
- **C1** `isRegistered` is `apps/student/app/workshop/[id].tsx:49`; the sticky-CTA block is `:233-286`; the Register `<Button>` is `:277-284` and is already `disabled={... || regStatusQ.isLoading}` at `:280`.
- **C2/C3** The `actionButtons` array is `apps/student/app/enrollment/[id].tsx:816-822` (note: 5 entries — `renew`, `discontinue`, `pause`, `transfer`, `preferred_package`). The action grid render is `:974-1002`; the `onPress` guard is `:978`; the `opacity: btn.disabled ? 0.4 : 1` is `:984`. The reuse flags are defined at `:805-807` (`isPaused`, `isDiscontinuePending`, `isInactive`).
- **C4** `isDeadlinePassed` is `apps/student/app/events/[id].tsx:186-187`; `registrationDeadline` is `:181-185`; the deadline display row guarded by `!isDeadlinePassed` is `:325-340`. The events screen imports `React, { useState }` only (`:1`) — `useEffect` must be added to the import. The trial-countdown idiom to mirror is `apps/student/app/trials/[id].tsx:59-65`.

---

## Files touched

| File | Tasks |
|------|-------|
| `apps/student/app/workshop/[id].tsx` | C1 |
| `apps/student/app/enrollment/[id].tsx` | C2, C3 |
| `apps/student/app/events/[id].tsx` | C4 |

No backend, hook, or shared-package changes. All edits are UI-state only.

---

## Tasks

### Task 1 (C1) — Render a skeleton placeholder in the workshop CTA while registration status is loading

**Files:** `apps/student/app/workshop/[id].tsx`
- `isRegistered` derived at `:49`
- Sticky CTA block at `:233-286`; final `else` (Register) branch at `:276-285`

**Why:** While `regStatusQ.isLoading`, `isRegistered` and `isPending` are both falsy, so the render falls through to the Register CTA. The button is already disabled during load (`:280`), so this is a visual-only flash of the wrong CTA. Replacing it with a neutral disabled placeholder while loading removes the flash.

#### Steps

1. Open the file and locate the start of the sticky CTA conditional at `:234`. Current code:

   ```tsx
   {/* Sticky CTA */}
   <View style={[styles.cta, { backgroundColor: theme.color.paper, borderTopColor: theme.color.hairline }]}>
     {isRegistered ? (
   ```

2. Add a loading branch as the FIRST condition in the chain, so the skeleton wins over the Register fall-through. Change the opening of the conditional from:

   ```tsx
     {isRegistered ? (
   ```

   to:

   ```tsx
     {regStatusQ.isLoading ? (
       <Button disabled block>
         Loading…
       </Button>
     ) : isRegistered ? (
   ```

   The rest of the chain (`: isPending && w.price_paise > 0 ? (...) : (...)`) is unchanged. The closing `)}` at `:286` stays as-is.

3. (No new imports — `Button` is already imported at `:4`.)

**Result:** while `regStatusQ.isLoading` the CTA region shows a single disabled `Loading…` button. Once the query resolves, the existing `isRegistered` / `isPending` / Register branches take over exactly as before.

**Checkpoint**
- Run: `cd apps/student && npx tsc --noEmit` → expect **0 errors**.
- Grep: `grep -n "regStatusQ.isLoading ? (" apps/student/app/workshop/\[id\].tsx` → expect **1 match** (the new leading branch). Confirm the old `disabled={registerMut.isPending || isFull || regStatusQ.isLoading}` at the Register button is still present (`grep -n "isFull || regStatusQ.isLoading" apps/student/app/workshop/\[id\].tsx` → 1 match).
- **Manual test:** Open a workshop detail screen (cold, with network throttled). Observe that during the brief registration-status fetch the CTA shows a disabled **"Loading…"** button, NOT a flash of the "Register · ₹…" button. After load, the correct CTA (Register / Booked ✓ / Complete payment) appears.

---

### Task 2 (C3) — Disable the "Renew" tile on terminal (inactive) enrollments

> Do C3 before C2 because C2's hint text reads off the same `disabled` flags and the Renew tile needs its `disabled` populated first.

**Files:** `apps/student/app/enrollment/[id].tsx`
- `actionButtons` array at `:816-822`
- Reuse flags `isPaused` / `isDiscontinuePending` / `isInactive` defined at `:805-807`

**Why:** The `renew` tile (`:817`) has no `disabled` property, so it is always tappable — including on `inactive` enrollments. The renew flow then hits the backend and is rejected. `isInactive` (`enrollment.status !== "active"`, defined at `:807`) is the correct terminal gate (see schema corrections above — there is no `paused`/`ending`/`grace` status).

#### Steps

1. Locate the `renew` entry at `:817`. Current:

   ```tsx
   const actionButtons: { key: SubSheet; label: string; icon: string; disabled?: boolean }[] = [
     { key: "renew",            label: "Renew",           icon: "🔄" },
   ```

2. Add `disabled: isInactive` to the `renew` entry:

   ```tsx
   const actionButtons: { key: SubSheet; label: string; icon: string; disabled?: boolean }[] = [
     { key: "renew",            label: "Renew",           icon: "🔄", disabled: isInactive },
   ```

   (`isInactive` is already in scope from `:807`. No other entry changes in this step.)

**Result:** on an `inactive` enrollment the Renew tile dims (existing `opacity: btn.disabled ? 0.4 : 1` at `:984`) and is non-tappable (existing `!btn.disabled && setSubSheet(...)` guard at `:978`).

**Checkpoint**
- Run: `cd apps/student && npx tsc --noEmit` → expect **0 errors**.
- Grep: `grep -n '"renew",.*disabled: isInactive' apps/student/app/enrollment/\[id\].tsx` → expect **1 match**.
- **Manual test:** Open the Manage sheet for an enrollment whose `status` is `inactive`. The **Renew** tile is dimmed (40% opacity) and tapping it does nothing. For an `active` enrollment, Renew is full-opacity and opens the Renew sub-sheet.

---

### Task 3 (C2) — Show a reason hint under each disabled manage-action tile

**Files:** `apps/student/app/enrollment/[id].tsx`
- `actionButtons` array at `:816-822` (after Task 2, the `renew` entry now has `disabled: isInactive`)
- Action grid render at `:974-1002`
- `manageStyles` StyleSheet at `:1380-1415`

**Why:** Disabled tiles (Pause/Transfer/Discontinue, and now Renew) dim to 0.4 and stop responding, but give no reason. Add a 12px mist-colored hint line under a disabled tile explaining why. Reuse the existing `isPaused` / `isDiscontinuePending` / `isInactive` flags (`:805-807`) — do NOT recompute state.

#### Steps

1. Extend the `actionButtons` type and entries to carry an optional `disabledReason`. Replace the whole array (`:816-822`, already showing the Task-2 edit) with:

   ```tsx
   const actionButtons: {
     key: SubSheet;
     label: string;
     icon: string;
     disabled?: boolean;
     disabledReason?: string;
   }[] = [
     { key: "renew",            label: "Renew",           icon: "🔄", disabled: isInactive, disabledReason: "Enrollment ended" },
     { key: "discontinue",      label: "Discontinue",     icon: "⏹",  disabled: isDiscontinuePending || isInactive, disabledReason: isDiscontinuePending ? "Already ending" : "Enrollment ended" },
     { key: "pause",            label: "Pause",           icon: "⏸",  disabled: isPaused || isInactive,             disabledReason: isPaused ? "Already paused" : "Enrollment ended" },
     { key: "transfer",         label: "Transfer",        icon: "↗",  disabled: isPaused || isInactive,             disabledReason: isPaused ? "Paused — resume first" : "Enrollment ended" },
     { key: "preferred_package", label: "Package pref.", icon: "📦" },
   ];
   ```

   Notes:
   - The `disabledReason` is only read when `disabled` is true (see step 2 guard), so its value when `disabled` is false is irrelevant.
   - `preferred_package` has no `disabled`/`disabledReason` (always enabled, matching current behavior).

2. In the action-grid render (`:975-1001`), add the hint `<Text>` after the label `<Text>`, inside the `<Pressable>`. Current render of one tile (`:975-1001`):

   ```tsx
   {actionButtons.map((btn) => (
     <Pressable
       key={btn.key}
       onPress={() => !btn.disabled && setSubSheet(btn.key)}
       style={[
         manageStyles.actionBtn,
         {
           backgroundColor: theme.color.ivory,
           borderColor: theme.color.hairline,
           opacity: btn.disabled ? 0.4 : 1,
         },
       ]}
     >
       <Text style={{ fontSize: 22, marginBottom: 6 }}>{btn.icon}</Text>
       <Text
         style={{
           fontFamily: theme.font.sans,
           fontSize: 12,
           fontWeight: "600",
           color: theme.color.inkSoft,
           textAlign: "center",
         }}
       >
         {btn.label}
       </Text>
     </Pressable>
   ))}
   ```

   Change two things: (a) keep `opacity` on the tile but raise the **text** opacity concern by leaving label as-is; (b) add the hint line. Replace the block above with:

   ```tsx
   {actionButtons.map((btn) => (
     <Pressable
       key={btn.key}
       onPress={() => !btn.disabled && setSubSheet(btn.key)}
       style={[
         manageStyles.actionBtn,
         {
           backgroundColor: theme.color.ivory,
           borderColor: theme.color.hairline,
           opacity: btn.disabled ? 0.4 : 1,
         },
       ]}
     >
       <Text style={{ fontSize: 22, marginBottom: 6 }}>{btn.icon}</Text>
       <Text
         style={{
           fontFamily: theme.font.sans,
           fontSize: 12,
           fontWeight: "600",
           color: theme.color.inkSoft,
           textAlign: "center",
         }}
       >
         {btn.label}
       </Text>
       {btn.disabled && btn.disabledReason ? (
         <Text style={[manageStyles.actionHint, { color: theme.color.mist }]}>
           {btn.disabledReason}
         </Text>
       ) : null}
     </Pressable>
   ))}
   ```

3. Add the `actionHint` style to the `manageStyles` StyleSheet (`:1380-1415`). Add this entry right after the `actionBtn` block (which ends at `:1414`):

   ```tsx
     actionBtn: {
       width: "30%",
       flexGrow: 1,
       alignItems: "center",
       paddingVertical: 16,
       paddingHorizontal: 8,
       borderRadius: 14,
       borderWidth: 1,
     },
     actionHint: {
       fontSize: 12,
       marginTop: 4,
       textAlign: "center",
     },
   ```

   (Note: 12px per the audit. Color comes from `theme.color.mist` inline so the StyleSheet entry stays theme-agnostic.)

**Result:** a disabled tile shows its dimmed icon + label plus a small mist hint ("Already paused", "Already ending", "Enrollment ended", "Paused — resume first"). Enabled tiles and `preferred_package` are unchanged.

**Checkpoint**
- Run: `cd apps/student && npx tsc --noEmit` → expect **0 errors**.
- Grep: `grep -n "disabledReason" apps/student/app/enrollment/\[id\].tsx` → expect **6 matches** (1 type field + 4 entry usages + 1 render read; exact count may be 6 — confirm the type field line, the 4 tile entries, and the JSX `btn.disabledReason`). `grep -n "actionHint" apps/student/app/enrollment/\[id\].tsx` → expect **2 matches** (style def + usage).
- **Manual test:**
  - Paused enrollment (`paused_until` in future): open Manage. **Pause** tile dimmed with "Already paused"; **Transfer** dimmed with "Paused — resume first". Renew/Discontinue tappable (active+paused is still `status==="active"`).
  - Enrollment with a scheduled discontinuation (`discontinue_requested_at` set): **Discontinue** tile dimmed with "Already ending".
  - Inactive enrollment (`status==="inactive"`): Renew/Discontinue/Pause/Transfer all dimmed with "Enrollment ended".

---

### Task 4 (C4) — Tick `now` so the event registration deadline updates without a remount

**Files:** `apps/student/app/events/[id].tsx`
- Import line at `:1` (`import React, { useState } from "react";`)
- `registrationDeadline` at `:181-185`, `isDeadlinePassed` at `:186-187`
- Idiom to mirror: `apps/student/app/trials/[id].tsx:59-65`

**Why:** `isDeadlinePassed` reads `Date.now()` once per render. If the user lingers on the screen as the deadline elapses, the CTA does not flip to "Registration closed" until the next render. Add a 60s ticking `now` state and derive `isDeadlinePassed` from it, mirroring the trial countdown idiom (which uses `useState(() => Date.now())` + `setInterval` + cleanup).

#### Steps

1. Add `useEffect` to the React import at `:1`. Current:

   ```tsx
   import React, { useState } from "react";
   ```

   Change to:

   ```tsx
   import React, { useEffect, useState } from "react";
   ```

2. Add a `now` state + ticking effect inside `EventDetailScreen`, just after the existing hook declarations. The hooks block currently ends at `:140`:

   ```tsx
     const { data, isLoading, error, refetch } = useEvent(id);
     const regStatus = useEventRegistrationStatus(id);
     const registerMut = useRegisterForEvent();
     const [showCancelSheet, setShowCancelSheet] = useState(false);
   ```

   Add after `:140`:

   ```tsx
     const { data, isLoading, error, refetch } = useEvent(id);
     const regStatus = useEventRegistrationStatus(id);
     const registerMut = useRegisterForEvent();
     const [showCancelSheet, setShowCancelSheet] = useState(false);
     const [now, setNow] = useState<number>(() => Date.now());

     useEffect(() => {
       const interval = setInterval(() => setNow(Date.now()), 60_000);
       return () => clearInterval(interval);
     }, []);
   ```

   > This effect is placed BEFORE the `isLoading` / `error` early returns at `:142-160`, so the Rules of Hooks are preserved (the effect runs on every render path). `now` is otherwise unused until step 3, which is fine.

3. Derive `isDeadlinePassed` from `now` instead of `Date.now()`. Current (`:186-187`):

   ```tsx
   const isDeadlinePassed =
     registrationDeadline ? Date.now() > registrationDeadline.getTime() : false;
   ```

   Change to:

   ```tsx
   const isDeadlinePassed =
     registrationDeadline ? now > registrationDeadline.getTime() : false;
   ```

   No other reads of the deadline need changing — `canRegister` (`:189`), `canCancel` (`:213-216`), the deadline display row (`:325`), and the closed-CTA branch (`:471`) all consume `isDeadlinePassed`, which now re-derives every 60s.

**Result:** while the screen is open, `now` advances every 60s; the moment the registration deadline passes, the next tick flips `isDeadlinePassed`, hiding the "Register by …" row and switching the CTA to the disabled "Registration closed" button — no manual refresh / remount needed.

**Checkpoint**
- Run: `cd apps/student && npx tsc --noEmit` → expect **0 errors**.
- Grep: `grep -n "useEffect" apps/student/app/events/\[id\].tsx` → expect **2 matches** (import + effect). `grep -n "now > registrationDeadline" apps/student/app/events/\[id\].tsx` → expect **1 match**. `grep -n "Date.now() > registrationDeadline" apps/student/app/events/\[id\].tsx` → expect **0 matches** (old code gone).
- **Manual test:** Open an event whose `registrationDeadline` is ~1 minute in the future and a Register CTA is showing. Leave the screen open. Within ~60s of the deadline passing, the "Register by …" line disappears and the CTA changes to the disabled **"Registration closed"** button — without navigating away or pulling to refresh. (To exercise quickly, temporarily set a near-future deadline event in your test data.)

---

## Group-C exit checkpoint

Run from repo root:

```
cd apps/student && npx tsc --noEmit
```

Expected: **0 errors**. Then spot-grep all four edits:

```
grep -n "regStatusQ.isLoading ? (" apps/student/app/workshop/\[id\].tsx        # C1: 1
grep -n '"renew",.*disabled: isInactive' apps/student/app/enrollment/\[id\].tsx # C3: 1
grep -n "actionHint" apps/student/app/enrollment/\[id\].tsx                     # C2: 2
grep -n "now > registrationDeadline" apps/student/app/events/\[id\].tsx         # C4: 1
```

All four UI gates are state-only; no backend contract changes, so no API/worker regression risk.
