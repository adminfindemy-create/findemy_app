# Group G — Screen Polish, Form Correctness & Theme Drift — Sub-Plan
**Parent:** [00-MASTER-PLAN.md](./00-MASTER-PLAN.md)
**Goal:** Sweep the breadth of Findemy Studio (apps/admin) screen-polish, form-correctness, and theme-drift bugs — hardcoded colors, keyboard avoidance, overflow, dead UI, missing error states, toast/skeleton/error-state robustness, debounce, param-array safety, accessibility, and three batch/students form-correctness bugs.
**Depends on:** Groups A–F (this group touches many of the same files; run it LAST so it sweeps the final state). **In particular Group D creates `apps/admin/src/lib/format.ts` (with `formatRupees`) — Task 8 depends on it.** If Group D has not landed when you reach Task 8, create the file per the snippet in Task 8 (it is the same `formatRupees` as `apps/student/src/lib/format.ts`).
**Blocks:** none — runs last.
**PROJECT RULE — NO GIT.** Every Checkpoint is a typecheck + grep assertion, never a commit.

---

## Context / verified line-number corrections

All line numbers below were re-read against the working tree on 2026-06-07. The audit's numbers had drifted in several places; use **these**.

| # | File | Audit said | Verified | Note |
| --- | --- | --- | --- | --- |
| 1 | `app/(tabs)/schedule.tsx` | `'#FBF7EF'` ~23,398,401; `'#E2DBCC'`; `'#D8492A'` ~406,434,436,470; CATEGORY_COLORS ~12-17 | `#FBF7EF` at **23, 398, 434**; `#E2DBCC` at **401, 436, 470**; `#D8492A` at **406**; `CATEGORY_COLORS` at **12-17** | `#FBF7EF` is **not** an exact theme token (closest is `ivory #FAF6EE`). `#E2DBCC` is **not** exact (closest `hairline #DDD3BC` / `bone #E5DDC9`). `#D8492A` **is** exactly `theme.color.persimmon`. The `CATEGORY_COLORS` `music` value is `#5C2A4A` (a plum, **no** matching token) — keep as a local const, do NOT map to `theme.category`. |
| 2 | `app/(auth)/verify-otp.tsx` | ~102-103 justify center, no KAV | `Screen scroll={false}` at **102**, `justifyContent:'center'` at **103** | Login (`app/(auth)/login.tsx:30-33`) is the KAV template. |
| 3 | `app/attendance-otp.tsx` | heading ~128-130; success screen | heading at **128-130**; success heading at **84-86** | Both serif, centered, no `numberOfLines`. |
| 4 | `app/(auth)/index.tsx` | `styles.signupLink` ~446-449; Apple glyph ~347 | `signupLink` at **446-449**; empty Apple `<Text></Text>` at **347** | `signupLink` is genuinely unreferenced (the real link uses inline styles at 393-403). Apple `<Text style={{ fontSize: 16, color: theme.color.ivory }}></Text>` is empty. |
| 5 | `app/batches/index.tsx` ~30-32; `app/coaches/index.tsx` ~31-33; `app/batches/[id]/index.tsx` ~21; `app/students/[id].tsx` ~15 | no isError | batches/index destructures `{ data, isLoading }` at **12**, branch at **30-32**; coaches/index `{ data, isLoading }` at **12**, branch at **31-33**; batches/[id]/index `{ data: batchData, isLoading }` at **15**, loading at **21-27**; students/[id] `{ data, isLoading }` at **13**, loading at **15-21** | Confirmed: no `isError` handled in any of the four. `schedule.tsx` and `earnings.tsx` **already** handle `isError` (schedule:235, earnings:131) — do NOT touch those. |
| 6 | `src/components/Toast.tsx` ~55-56 top:60; ~19-28 rapid show | `top: 60` at **56**; `show` at **19-28** | No `useSafeAreaInsets`. Fade-out callback `setToast(null)` at **25** can null a freshly-shown toast. |
| 7 | `src/components/SkeletonLoader.tsx` ~20-29; `src/components/ErrorState.tsx` ~22 | cleanup / unmapped code | Skeleton cleanup at **20-29**; ErrorState fallback at **22** | ErrorState has no `message` prop. |
| 8 | `app/earnings.tsx` `fmtBig` ~16-21; delta ~93 | as cited | `fmtBig` at **16-21**; `delta >= 0 ? jadeSoft : roseSoft` at **93** | File already imports `ErrorState` + handles `isError`. |
| 9 | `src/hooks/useDebounce.ts` ~5-9 | `delay` in deps | effect deps `[value, delay]` at **8** | Confirmed. |
| 10 | `useLocalSearchParams` unguarded | batches/[id]/index ~14, edit ~14, students tab ~74, attendance ~15, students/[id] ~12, coaches/[id] ~23 | batches/[id]/index **14**; batches/[id]/edit **14**; attendance **15**; students/[id] **12**; coaches/[id] **23**. **CORRECTION:** `app/(tabs)/students.tsx:74` does **NOT** use `useLocalSearchParams` — it has no route param at all (state only). Drop that site. | All real sites destructure `{ id }` (or `{ otp_id, phone }`, `{ trialId, studentName }`) typed as `string`. |
| 11 | accessibility icon-only pressables | schedule ~313-319; studio darkBtn `✎` | schedule `⋯` menu trigger at **313-319**; studio `✎` darkBtn at **99-101** (`darkBtn` style at 300) | schedule reschedule/cancel actions at 354-365 already have visible text labels — only the `⋯` trigger is glyph-only. Also add a label to the schedule `+ Publish`/`Batches` — those have text, skip. |
| 12 | `app/batches/[id]/edit.tsx` category not editable | payload ~65-75 | payload at **65-75**; no category state/picker anywhere | **Backend `BatchUpdateSchema` accepts `category: z.enum(['music','dance','arts','yoga']).optional()` (verified `apps/api/src/modules/studio/routes.ts:41`).** BUT `useUpdateBatch`'s `mutationFn` body type (`apps/admin/src/hooks/useStudioQueries.ts:129-135`) does **NOT** include `category` — you must extend that type too, or tsc will reject the payload. `Batch` type (`packages/types/src/index.ts:158`) has `category: Category`, so `existing.category` is typed. `new.tsx` uses `CATEGORIES = ['music','dance','arts','yoga']` + `<Chip>` as the picker pattern to mirror. |
| 13 | `app/batches/[id]/edit.tsx` location/meetingLink discarded | ~33-34, 197-207 | state at **33-34**; inputs at **197-207** (gated by `mode`) | Neither is loaded from `existing` nor sent in the payload, and `BatchUpdateSchema` is `.strict()` — sending them would 400. Backend has no such fields → **remove** the inputs + state (honest fix). |
| 14 | `app/batches/[id]/index.tsx` present metric misleading | ~33, 75 | `present` calc at **33**; pill render at **74-75** | `present = roster.filter((s) => (s.attendance_pct ?? 0) >= 75).length` — null-attendance (new) students coerced to 0, so a brand-new batch shows "0 active". `atRisk` (line 34) already guards null correctly. |
| 15 | `app/(tabs)/students.tsx` searchbar resets on category switch | ~129-140, 164; clear at ~149 | search UI gated `category === 'All'` at **129**; tier UI at **164**; `setBatchId('')` on category change at **149** | `query`/`attendanceTier` are not cleared when leaving 'All', so stale `q`/`attendance_tier` keep firing server-side and reappear on return. |

**Theme tokens confirmed present** (`packages/ui/src/theme.ts`): `color.ivory (#FAF6EE)`, `color.paperWarm (#EDE6D8)`, `color.hairline (#DDD3BC)`, `color.persimmon (#D8492A)`, `color.bone (#E5DDC9)`, `color.jade`, `color.jadeSoft`, `color.rose`, `color.roseSoft`, `color.mist`. **`#FBF7EF` and `#E2DBCC` have NO exact token** — see Task 1 for the substitution decision.

---

## Files touched

| Task | File(s) | Concern |
| --- | --- | --- |
| 1 | `app/(tabs)/schedule.tsx` | hardcoded colors → theme; `⋯` a11y (also Task 11) |
| 2 | `app/(auth)/verify-otp.tsx` | keyboard avoidance |
| 3 | `app/attendance-otp.tsx` | name overflow (`numberOfLines`) |
| 4 | `app/(auth)/index.tsx` | dead `signupLink` style; Apple glyph |
| 5 | `app/batches/index.tsx`, `app/coaches/index.tsx`, `app/batches/[id]/index.tsx`, `app/students/[id].tsx` | error states |
| 6 | `src/components/Toast.tsx` | safe-area inset; rapid-call animation guard |
| 7 | `src/components/SkeletonLoader.tsx`, `src/components/ErrorState.tsx` | skeleton cleanup; ErrorState `message` prop |
| 8 | `app/earnings.tsx` | `fmtBig` thresholds; delta-zero color |
| 9 | `src/hooks/useDebounce.ts` | drop `delay` from deps |
| 10 | `app/batches/[id]/index.tsx`, `app/batches/[id]/edit.tsx`, `app/batches/[id]/attendance.tsx`, `app/students/[id].tsx`, `app/coaches/[id].tsx`, `app/(auth)/verify-otp.tsx`, `app/attendance-otp.tsx` | `useLocalSearchParams` array-safety |
| 11 | `app/(tabs)/schedule.tsx`, `app/(tabs)/studio.tsx` | a11y on icon-only pressables |
| 12 | `app/batches/[id]/edit.tsx`, `src/hooks/useStudioQueries.ts` | editable category |
| 13 | `app/batches/[id]/edit.tsx` | remove dead location/meetingLink |
| 14 | `app/batches/[id]/index.tsx` | present-metric null handling |
| 15 | `app/(tabs)/students.tsx` | clear filters on category switch |

> Tasks 12, 13 both edit `app/batches/[id]/edit.tsx`; Tasks 10, 14 both edit `app/batches/[id]/index.tsx`. Do all edits to a given file in one pass (the per-file ordering is given inside each task). Tasks 1 + 11 both edit `schedule.tsx` — Task 1 covers the `⋯` a11y too, so Task 11 only adds the `studio.tsx` `✎` label.

---

## Tasks

### Task 1 — schedule.tsx: theme-drift colors → inline theme

**File:** `app/(tabs)/schedule.tsx`

The file already uses `useTheme()` inside `ScheduleScreen` (line 94) and renders most colors inline. The remaining hardcoded colors live in (a) the module-level `ScheduleSkeleton` component (no theme in scope) and (b) the module-level `StyleSheet.create` block. Move color-bearing styles inline.

**Decision on the two non-token colors:** `#FBF7EF` and `#E2DBCC` have no exact theme token. They are warm card surfaces. Map `#FBF7EF` → `theme.color.ivory` (`#FAF6EE`, the canonical warm card surface — a 1-shade shift, on-brand and dark-mode-aware) and `#E2DBCC` → `theme.color.hairline` (`#DDD3BC`, the canonical hairline/divider — exactly its role here). `#D8492A` → `theme.color.persimmon` (exact). This is the honest fix: it adopts the real tokens and gains dark-mode support, accepting a <=1-shade visual nudge. **Do NOT invent new tokens (token additions are out of scope for this group).**

`CATEGORY_COLORS` (lines 12-17) stays a local const — its values (`#5C2A4A` plum, `#8A8A33` olive) have no theme tokens.

- [ ] **1.1 — Skeleton card bg.** `ScheduleSkeleton` (lines 19-30) is module-level with no theme. Make it take the color via `useTheme()` inside the component. Change the function:

Before:
```tsx
function ScheduleSkeleton() {
  return (
    <View style={{ gap: 10, marginTop: 8 }}>
      {[1, 2, 3].map((i) => (
        <View key={i} style={{ backgroundColor: '#FBF7EF', borderRadius: 14, padding: 14 }}>
          <SkeletonLoader height={14} width="30%" style={{ marginBottom: 8 }} />
          <SkeletonLoader height={13} width="60%" />
        </View>
      ))}
    </View>
  );
}
```
After:
```tsx
function ScheduleSkeleton() {
  const theme = useTheme();
  return (
    <View style={{ gap: 10, marginTop: 8 }}>
      {[1, 2, 3].map((i) => (
        <View key={i} style={{ backgroundColor: theme.color.ivory, borderRadius: 14, padding: 14 }}>
          <SkeletonLoader height={14} width="30%" style={{ marginBottom: 8 }} />
          <SkeletonLoader height={13} width="60%" />
        </View>
      ))}
    </View>
  );
}
```

- [ ] **1.2 — `manageBatchesBtn` color-bearing props → inline.** In `StyleSheet.create`, `manageBatchesBtn` (lines 395-402) hardcodes `backgroundColor: '#FBF7EF'` and `borderColor: '#E2DBCC'`. Strip those two keys from the StyleSheet entry and pass them inline at the use site (line 161).

In `StyleSheet.create`, change:
```tsx
  manageBatchesBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#FBF7EF',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E2DBCC',
  },
```
to:
```tsx
  manageBatchesBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
```
At the use site (line 161), change:
```tsx
            <Pressable style={styles.manageBatchesBtn} onPress={() => router.push('/batches' as any)}>
```
to:
```tsx
            <Pressable
              style={[styles.manageBatchesBtn, { backgroundColor: theme.color.ivory, borderColor: theme.color.hairline }]}
              onPress={() => router.push('/batches' as any)}
            >
```

- [ ] **1.3 — `publishBtn` color → inline.** StyleSheet `publishBtn` (lines 403-408) hardcodes `backgroundColor: '#D8492A'`. Strip it; pass `theme.color.persimmon` inline at the use site (line 166).

In `StyleSheet.create`, change:
```tsx
  publishBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#D8492A',
    borderRadius: 999,
  },
```
to:
```tsx
  publishBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
  },
```
At the use site (line 166):
```tsx
            <Pressable style={styles.publishBtn} onPress={() => router.push('/schedule/publish')}>
```
to:
```tsx
            <Pressable
              style={[styles.publishBtn, { backgroundColor: theme.color.persimmon }]}
              onPress={() => router.push('/schedule/publish')}
            >
```

- [ ] **1.4 — `batchPill` colors → inline.** StyleSheet `batchPill` (lines 433-445) hardcodes `backgroundColor: '#FBF7EF'` and `borderColor: '#E2DBCC'`. Note `borderLeftColor` is already set inline at the use site (line 271). Strip the two static colors; merge inline.

In `StyleSheet.create`, change:
```tsx
  batchPill: {
    backgroundColor: '#FBF7EF',
    borderWidth: 1,
    borderColor: '#E2DBCC',
    borderRadius: 14,
    padding: 12,
    paddingHorizontal: 14,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderLeftWidth: 4,
  },
```
to:
```tsx
  batchPill: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    paddingHorizontal: 14,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderLeftWidth: 4,
  },
```
At the use site (lines 269-272), change:
```tsx
                      <View
                        key={item.slot_id ?? item.id ?? `${item.batch_id}-${item.start_time}-${idx}`}
                        style={[styles.batchPill, { borderLeftColor: catColor }]}
                      >
```
to:
```tsx
                      <View
                        key={item.slot_id ?? item.id ?? `${item.batch_id}-${item.start_time}-${idx}`}
                        style={[styles.batchPill, { backgroundColor: theme.color.ivory, borderColor: theme.color.hairline, borderLeftColor: catColor }]}
                      >
```

- [ ] **1.5 — `sheetHandle` color → inline.** StyleSheet `sheetHandle` (lines 466-473) hardcodes `backgroundColor: '#E2DBCC'`. Strip it; pass inline at the use site (line 347).

In `StyleSheet.create`, change:
```tsx
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E2DBCC',
    alignSelf: 'center',
    marginBottom: 16,
  },
```
to:
```tsx
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
```
At the use site (line 347):
```tsx
            <View style={styles.sheetHandle} />
```
to:
```tsx
            <View style={[styles.sheetHandle, { backgroundColor: theme.color.hairline }]} />
```

- [ ] **1.6 — a11y on the `⋯` menu trigger (lines 313-319).** Add `accessibilityRole`/`accessibilityLabel` (this discharges the schedule half of Task 11). Change:
```tsx
                        <Pressable
                          hitSlop={8}
                          onPress={() => setMenuItem(item)}
                          style={styles.menuBtn}
                        >
                          <Text style={{ fontSize: 18, color: theme.color.mist, lineHeight: 20 }}>⋯</Text>
                        </Pressable>
```
to:
```tsx
                        <Pressable
                          hitSlop={8}
                          onPress={() => setMenuItem(item)}
                          style={styles.menuBtn}
                          accessibilityRole="button"
                          accessibilityLabel={`Class options for ${item.batch_title ?? 'batch'}`}
                        >
                          <Text style={{ fontSize: 18, color: theme.color.mist, lineHeight: 20 }}>⋯</Text>
                        </Pressable>
```

**Checkpoint**
```bash
cd /home/mp2sslrl/code/code && export PATH="$HOME/.local/bin:$PATH" && pnpm --filter @findemy/admin typecheck
grep -n "#FBF7EF\|#E2DBCC\|'#D8492A'" "apps/admin/app/(tabs)/schedule.tsx"; echo "drift exit:$?"
grep -n "accessibilityLabel=" "apps/admin/app/(tabs)/schedule.tsx"
```
Expected: typecheck 0 errors. The drift grep prints **no lines** and `exit:1` (none of `#FBF7EF`/`#E2DBCC`/`'#D8492A'` remain). The accessibilityLabel grep prints the new `⋯` line. (`CATEGORY_COLORS` plum/olive literals intentionally remain and are not in the grep set.)

---

### Task 2 — verify-otp.tsx: keyboard avoidance

**File:** `app/(auth)/verify-otp.tsx`

The autofocused OTP keyboard pushes the centered content (and the Verify button) under it because there's no `KeyboardAvoidingView` and `Screen scroll={false}`. Mirror `login.tsx`'s pattern (its `KeyboardAvoidingView` wraps the centered `View` with `behavior` per platform).

- [ ] **2.1 — import KAV + Platform.** Line 2 is `import { View, Text } from 'react-native';`. Change to:
```tsx
import { View, Text, KeyboardAvoidingView, Platform } from 'react-native';
```

- [ ] **2.2 — wrap the centered view.** Lines 101-103:
```tsx
  return (
    <Screen scroll={false}>
      <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 24 }}>
```
Change to:
```tsx
  return (
    <Screen scroll={false}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 24 }}
      >
```
And the matching closing tag (line 162) — change `</View>` to `</KeyboardAvoidingView>`:
```tsx
      </View>
    </Screen>
```
to:
```tsx
      </KeyboardAvoidingView>
    </Screen>
```
> The old outer `<View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 24 }}>` is replaced by the `KeyboardAvoidingView` carrying the same style — there is exactly one `</View>` at this nesting level (line 162); confirm it is the one closing the centered wrapper before swapping.

**Checkpoint**
```bash
cd /home/mp2sslrl/code/code && export PATH="$HOME/.local/bin:$PATH" && pnpm --filter @findemy/admin typecheck
grep -n "KeyboardAvoidingView" "apps/admin/app/(auth)/verify-otp.tsx"
```
Expected: typecheck 0 errors. grep shows the import line + the opening + closing `KeyboardAvoidingView` (3 matches).

---

### Task 3 — attendance-otp.tsx: name overflow

**File:** `app/attendance-otp.tsx`

Long student names overflow the centered serif heading on both the entry screen (lines 128-130) and the success screen (lines 84-86). Add `numberOfLines={2} ellipsizeMode="tail"`.

- [ ] **3.1 — success heading (lines 84-86).** Change:
```tsx
          <Text style={{ fontFamily: theme.font.serif, fontSize: 24, color: theme.color.ink, marginTop: 16 }}>
            Attendance marked
          </Text>
```
(This one is a fixed string — leave it.) Instead the overflow risk on the success screen is the **name** at lines 87-89:
```tsx
          <Text style={{ fontFamily: theme.font.sans, fontSize: 14, color: theme.color.mist, marginTop: 4 }}>
            {studentName}
          </Text>
```
Change to:
```tsx
          <Text
            style={{ fontFamily: theme.font.sans, fontSize: 14, color: theme.color.mist, marginTop: 4, textAlign: 'center', paddingHorizontal: 24 }}
            numberOfLines={2}
            ellipsizeMode="tail"
          >
            {studentName}
          </Text>
```

- [ ] **3.2 — entry heading (lines 128-130).** Change:
```tsx
        <Text style={[styles.heading, { color: theme.color.ink, fontFamily: theme.font.serif }]}>
          Mark {studentName || 'student'}'s attendance
        </Text>
```
to:
```tsx
        <Text
          style={[styles.heading, { color: theme.color.ink, fontFamily: theme.font.serif }]}
          numberOfLines={2}
          ellipsizeMode="tail"
        >
          Mark {studentName || 'student'}'s attendance
        </Text>
```
(`styles.heading` already has `textAlign: 'center'`, line 202.)

**Checkpoint**
```bash
cd /home/mp2sslrl/code/code && export PATH="$HOME/.local/bin:$PATH" && pnpm --filter @findemy/admin typecheck
grep -c "numberOfLines={2}" "apps/admin/app/attendance-otp.tsx"
```
Expected: typecheck 0 errors. grep count `2`.

---

### Task 4 — welcome screen: dead style + Apple glyph

**File:** `app/(auth)/index.tsx`

- [ ] **4.1 — remove dead `signupLink` style (lines 446-449).** It is unreferenced (the visible link at 393-403 uses inline styles). Delete the block from `StyleSheet.create`:
```tsx
  signupLink: {
    alignItems: 'center',
    paddingVertical: 24,
  },
```
(Delete the whole key including its trailing comma; the entry above it, `socialIcon`, keeps its own closing brace + comma.)

- [ ] **4.2 — Apple glyph (line 347).** The Apple button icon is an empty `<Text></Text>`, leaving a blank gutter. Use the Apple logo glyph `` (U+F8FF, the Apple-platform private-use glyph that renders the  mark on iOS — this button is iOS-only, gated by `Platform.OS === 'ios'` at line 337, so the glyph is guaranteed to render). Change:
```tsx
              <View style={{ width: 24, alignItems: 'center' }}>
                <Text style={{ fontSize: 16, color: theme.color.ivory }}></Text>
              </View>
```
to:
```tsx
              <View style={{ width: 24, alignItems: 'center' }}>
                <Text style={{ fontSize: 18, color: theme.color.ivory }}></Text>
              </View>
```
> The character between the quotes is the single code point U+F8FF (). If your editor cannot input it reliably, write it as `{''}` instead:
> ```tsx
>                 <Text style={{ fontSize: 18, color: theme.color.ivory }}>{''}</Text>
> ```
> Prefer the `''` escape form — it is copy-paste-safe and unambiguous in code review.

**Checkpoint**
```bash
cd /home/mp2sslrl/code/code && export PATH="$HOME/.local/bin:$PATH" && pnpm --filter @findemy/admin typecheck
grep -n "signupLink" "apps/admin/app/(auth)/index.tsx"; echo "signupLink exit:$?"
grep -n "uF8FF" "apps/admin/app/(auth)/index.tsx"
```
Expected: typecheck 0 errors. `signupLink` grep prints nothing (`exit:1`). The `uF8FF` grep prints the Apple-glyph line.

---

### Task 5 — error states on list/detail screens

**Files:** `app/batches/index.tsx`, `app/coaches/index.tsx`, `app/batches/[id]/index.tsx`, `app/students/[id].tsx`

Each only destructures `data`/`isLoading`, so a failed fetch hangs on "Loading…" (detail screens) or shows a blank/empty list. Add an `isError` branch with a retryable message, distinct from the empty state. Reuse `ErrorState` (`@/components/ErrorState`) which already takes `{ code?, onRetry? }` and (after Task 7) `message?`.

- [ ] **5.1 — `app/batches/index.tsx`.** Import ErrorState (line 4 area):
```tsx
import { ErrorState } from '@/components/ErrorState';
```
Add `isError`/`refetch` to the hook (line 12):
```tsx
  const { data, isLoading } = useStudioBatches();
```
to:
```tsx
  const { data, isLoading, isError, refetch } = useStudioBatches();
```
Add the branch (lines 30-32) — insert the `isError` check between loading and empty:
```tsx
        {isLoading ? (
          <Text style={{ color: theme.color.mist, fontFamily: theme.font.sans }}>Loading…</Text>
        ) : data?.items.length === 0 ? (
```
to:
```tsx
        {isLoading ? (
          <Text style={{ color: theme.color.mist, fontFamily: theme.font.sans }}>Loading…</Text>
        ) : isError ? (
          <ErrorState message="Couldn't load batches." onRetry={refetch} />
        ) : data?.items.length === 0 ? (
```

- [ ] **5.2 — `app/coaches/index.tsx`.** Same pattern. Import ErrorState; hook (line 12) `{ data, isLoading }` → `{ data, isLoading, isError, refetch }`; branch (lines 31-33):
```tsx
        {isLoading ? (
          <Text style={{ color: theme.color.mist, fontFamily: theme.font.sans }}>Loading…</Text>
        ) : isError ? (
          <ErrorState message="Couldn't load coaches." onRetry={refetch} />
        ) : data?.items.length === 0 ? (
```

- [ ] **5.3 — `app/batches/[id]/index.tsx`.** Import ErrorState. Hook (line 15):
```tsx
  const { data: batchData, isLoading } = useStudioBatch(id);
```
to:
```tsx
  const { data: batchData, isLoading, isError, refetch } = useStudioBatch(id);
```
The early return (lines 21-27) currently conflates loading with missing data. Split error out — insert before the loading return:
```tsx
  if (isError) {
    return (
      <Screen header={<ScreenHeader title="Batch" showBack />} bottomTab={null}>
        <ErrorState message="Couldn't load this batch." onRetry={refetch} />
      </Screen>
    );
  }

  if (isLoading || !batch) {
    return (
      <Screen header={<ScreenHeader title="Batch" showBack />} bottomTab={null}>
        <Text style={{ color: theme.color.mist, fontFamily: theme.font.sans, padding: 24 }}>Loading…</Text>
      </Screen>
    );
  }
```
> `batch` is `batchData?.batch` (line 18) — keep the `!batch` in the loading guard so a successful-but-empty response still falls through to loading rather than crashing on `batch.title`.

- [ ] **5.4 — `app/students/[id].tsx`.** Import ErrorState. Hook (line 13):
```tsx
  const { data, isLoading } = useStudioStudent(id);
```
to:
```tsx
  const { data, isLoading, isError, refetch } = useStudioStudent(id);
```
Insert the error return before the loading return (lines 15-21):
```tsx
  if (isError) {
    return (
      <Screen header={<ScreenHeader title="Student" showBack />} bottomTab={null}>
        <ErrorState message="Couldn't load this student." onRetry={refetch} />
      </Screen>
    );
  }

  if (isLoading || !data) {
    return (
      <Screen header={<ScreenHeader title="Student" showBack />} bottomTab={null}>
        <Text style={{ color: theme.color.mist, fontFamily: theme.font.sans, padding: 24 }}>Loading…</Text>
      </Screen>
    );
  }
```

> Do Task 7 (ErrorState `message` prop) BEFORE this task's typecheck, or `message=` will be a type error. If you prefer to do tasks in order, run Task 5's typecheck only after Task 7 lands; the grep assertions here are order-independent.

**Checkpoint** (run after Task 7's ErrorState change exists)
```bash
cd /home/mp2sslrl/code/code && export PATH="$HOME/.local/bin:$PATH" && pnpm --filter @findemy/admin typecheck
grep -rl "isError" apps/admin/app/batches/index.tsx apps/admin/app/coaches/index.tsx "apps/admin/app/batches/[id]/index.tsx" "apps/admin/app/students/[id].tsx"
```
Expected: typecheck 0 errors. The grep lists all **four** files (each now references `isError`).

---

### Task 6 — Toast.tsx: safe-area inset + rapid-call guard

**File:** `src/components/Toast.tsx`

Two fixes: (a) `top: 60` ignores the notch/Dynamic Island — use `useSafeAreaInsets().top + 12`; (b) a `show` fired mid-fade-out can be nulled by the prior fade-out's `setToast(null)` completion callback — guard it with a monotonically-increasing id so a stale callback can't clear a newer toast, and stop the running fade-out before starting a new one.

- [ ] **6.1 — imports.** Line 2 + line 3:
```tsx
import { Animated, StyleSheet, Text } from "react-native";
import { useTheme } from "@findemy/ui";
```
to:
```tsx
import { Animated, StyleSheet, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@findemy/ui";
```

- [ ] **6.2 — add inset + a generation ref.** Inside `ToastProvider`, after the existing `timerRef` (line 17), add:
```tsx
  const insets = useSafeAreaInsets();
  const genRef = useRef(0);
```

- [ ] **6.3 — guard the animation in `show` (lines 19-28).** Replace:
```tsx
  const show = useCallback((message: string, variant: ToastVariant = "success") => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setToast({ message, variant });
    Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    timerRef.current = setTimeout(() => {
      Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }).start(() =>
        setToast(null)
      );
    }, 3000);
  }, [opacity]);
```
with:
```tsx
  const show = useCallback((message: string, variant: ToastVariant = "success") => {
    if (timerRef.current) clearTimeout(timerRef.current);
    opacity.stopAnimation();
    const gen = ++genRef.current;
    setToast({ message, variant });
    Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    timerRef.current = setTimeout(() => {
      Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }).start(() => {
        // Only clear if no newer toast has been shown since this one started fading.
        if (genRef.current === gen) setToast(null);
      });
    }, 3000);
  }, [opacity]);
```

- [ ] **6.4 — apply the inset to the container.** The container style is module-level (line 41 render + lines 53-67 StyleSheet). Pass `top` inline at render so it can read `insets`. Change line 41:
```tsx
        <Animated.View style={[styles.container, { opacity, backgroundColor: bg, shadowColor: theme.color.ink }]}>
```
to:
```tsx
        <Animated.View style={[styles.container, { top: insets.top + 12, opacity, backgroundColor: bg, shadowColor: theme.color.ink }]}>
```
And remove `top: 60` from the StyleSheet `container` (lines 54-67):
```tsx
  container: {
    position: "absolute",
    top: 60,
    left: 20,
```
to:
```tsx
  container: {
    position: "absolute",
    left: 20,
```

**Checkpoint**
```bash
cd /home/mp2sslrl/code/code && export PATH="$HOME/.local/bin:$PATH" && pnpm --filter @findemy/admin typecheck
grep -n "useSafeAreaInsets\|genRef\|stopAnimation" apps/admin/src/components/Toast.tsx
grep -n "top: 60" apps/admin/src/components/Toast.tsx; echo "top60 exit:$?"
```
Expected: typecheck 0 errors. First grep shows the inset hook, the generation ref, and `opacity.stopAnimation()`. The `top: 60` grep prints nothing (`exit:1`).

---

### Task 7 — SkeletonLoader cleanup + ErrorState message prop

**Files:** `src/components/SkeletonLoader.tsx`, `src/components/ErrorState.tsx`

- [ ] **7.1 — SkeletonLoader cleanup resets opacity (lines 20-29).** Negligible, but tidy: reset `opacity` to its base on unmount so a recycled `Animated.Value` doesn't flash. Change:
```tsx
  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 600, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, []);
```
to:
```tsx
  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 600, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => {
      anim.stop();
      opacity.setValue(0.4);
    };
  }, [opacity]);
```

- [ ] **7.2 — ErrorState accepts an optional `message` (line 14-22).** Let callers pass a human message (used by Task 5) and let unknown codes carry the server message instead of falling to the generic copy. Change:
```tsx
export function ErrorState({
  code,
  onRetry,
}: {
  code?: string;
  onRetry?: () => void;
}) {
  const theme = useTheme();
  const message = (code && MESSAGES[code]) || MESSAGES.INTERNAL;
```
to:
```tsx
export function ErrorState({
  code,
  message,
  onRetry,
}: {
  code?: string;
  /** Explicit human message; wins over the code map. Use for server messages or screen-specific copy. */
  message?: string;
  onRetry?: () => void;
}) {
  const theme = useTheme();
  const resolved = message || (code && MESSAGES[code]) || MESSAGES.INTERNAL;
```
And update the render (line 27) `{message}` → `{resolved}`:
```tsx
      <Text style={{ color: theme.color.ink, fontFamily: theme.font.sans, fontSize: 15, marginBottom: 12 }}>
        {message}
      </Text>
```
to:
```tsx
      <Text style={{ color: theme.color.ink, fontFamily: theme.font.sans, fontSize: 15, marginBottom: 12 }}>
        {resolved}
      </Text>
```

**Checkpoint**
```bash
cd /home/mp2sslrl/code/code && export PATH="$HOME/.local/bin:$PATH" && pnpm --filter @findemy/admin typecheck
grep -n "message?: string" apps/admin/src/components/ErrorState.tsx
grep -n "opacity.setValue" apps/admin/src/components/SkeletonLoader.tsx
```
Expected: typecheck 0 errors. Both greps print one match.

---

### Task 8 — earnings.tsx: fmtBig thresholds + delta-zero color

**File:** `app/earnings.tsx` (depends on `apps/admin/src/lib/format.ts` from Group D — see note below)

`fmtBig` (lines 16-21) shows "100.0k" for ₹99,999 (overstates — `99999/1000 = 99.999 → toFixed(1) = 100.0`) and shows raw rupees for amounts <₹1000 with no grouping. The delta color (line 93) paints a **zero** delta green (`delta >= 0 ? jadeSoft : roseSoft`).

**Group D dependency:** Group D creates `apps/admin/src/lib/format.ts` exporting `formatRupees`. If it does not exist when you reach this task, create it now with this content (identical to `apps/student/src/lib/format.ts`):
```ts
import { format } from "date-fns";

/**
 * Render a paise amount as INR. Default: rounded to whole rupees with
 * en-IN grouping ("₹1,500"). `withDecimals` keeps two decimals ("₹1,500.00").
 * Negative amounts render as "−₹50".
 */
export function formatRupees(paise: number, opts?: { withDecimals?: boolean }): string {
  const withDecimals = opts?.withDecimals ?? false;
  const sign = paise < 0 ? "−" : "";
  const rupees = Math.abs(paise) / 100;
  const value = withDecimals
    ? rupees.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : Math.round(rupees).toLocaleString("en-IN");
  return `${sign}₹${value}`;
}
```
> `fmtBig` returns a string **without** the `₹` (the rupee sign is rendered separately at lines 88-89). Keep that contract — `fmtBig` returns just the number/abbreviation. The local `fmt` helper (lines 12-14) returns grouped rupees without `₹`; we keep `fmt` for the `₹{fmt(...)}` call sites but fix its overstatement-free sibling `fmtBig`.

- [ ] **8.1 — fix `fmtBig` thresholds (lines 16-21).** Use `Math.floor` on the abbreviation so ₹99,999 reads "99.9k" not "100.0k", drop a trailing `.0`, and group sub-1000 amounts. Replace:
```tsx
function fmtBig(paise: number): string {
  const amount = Math.round(paise / 100);
  if (amount >= 100000) return (amount / 100000).toFixed(1) + 'L';
  if (amount >= 1000) return (amount / 1000).toFixed(1) + 'k';
  return String(amount);
}
```
with:
```tsx
function fmtBig(paise: number): string {
  const amount = Math.round(paise / 100);
  // Truncate (not round) the abbreviation so e.g. ₹99,999 -> "99.9k", never "100.0k".
  const abbr = (n: number, suffix: string) => {
    const v = Math.floor(n * 10) / 10; // one decimal, floored
    return (Number.isInteger(v) ? String(v) : v.toFixed(1)) + suffix;
  };
  if (amount >= 100000) return abbr(amount / 100000, 'L');
  if (amount >= 1000) return abbr(amount / 1000, 'k');
  return amount.toLocaleString('en-IN');
}
```

- [ ] **8.2 — delta-zero color (line 93).** A zero delta should be neutral, not green. Change:
```tsx
            <Text style={[styles.earnDelta, { fontFamily: theme.font.sans, color: delta >= 0 ? theme.color.jadeSoft : theme.color.roseSoft }]}>
```
to:
```tsx
            <Text style={[styles.earnDelta, { fontFamily: theme.font.sans, color: delta > 0 ? theme.color.jadeSoft : delta < 0 ? theme.color.roseSoft : theme.color.whisper }]}>
```
> `theme.color.whisper` (`#B5AB9B`) reads as a muted neutral on the dark hero — appropriate for "No change". (The "No change vs previous" copy at line 94 already handles the zero case textually; this just stops the green tint.)

> `formatRupees` import is **not strictly required** by these two edits (the file's own `fmt` is retained for the `₹{fmt(...)}` sites). The audit suggested optionally routing through `formatRupees`; since `fmt`/`fmtBig` return un-prefixed strings and the screen prints `₹` separately, swapping to `formatRupees` (which prepends `₹`) would churn ~9 call sites for no correctness gain. **Decision: keep `fmt`, fix `fmtBig` in place.** Do not import `formatRupees` here.

**Checkpoint**
```bash
cd /home/mp2sslrl/code/code && export PATH="$HOME/.local/bin:$PATH" && pnpm --filter @findemy/admin typecheck
grep -n "delta > 0 ?" apps/admin/app/earnings.tsx
grep -n "Math.floor(n \* 10)" apps/admin/app/earnings.tsx
```
Expected: typecheck 0 errors. Both greps print one match. (Spot-check mentally: `fmtBig(9999900)` → amount 99999 → `99999/1000 = 99.999`, floored one-decimal → `99.9k`. `fmtBig(50000)` → 500 → `"500"`.)

---

### Task 9 — useDebounce: drop `delay` from deps

**File:** `src/hooks/useDebounce.ts`

Including `delay` in the effect deps (line 8) means a parent passing a new literal each render resets the timer forever. Drop it (the debounce interval is read at timer creation; a changing delay re-arming is not the desired behavior).

- [ ] **9.1 — remove `delay` from deps.** Lines 5-9:
```tsx
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
```
to:
```tsx
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
    // `delay` intentionally excluded: a parent passing a fresh literal each
    // render would otherwise re-arm the timer forever. The value change drives it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
```

**Checkpoint**
```bash
cd /home/mp2sslrl/code/code && export PATH="$HOME/.local/bin:$PATH" && pnpm --filter @findemy/admin typecheck
grep -n "}, \[value\]);" apps/admin/src/hooks/useDebounce.ts
```
Expected: typecheck 0 errors. grep prints the `}, [value]);` line (no `delay` in deps).

---

### Task 10 — useLocalSearchParams array-safety

**Files:** `app/batches/[id]/index.tsx`, `app/batches/[id]/edit.tsx`, `app/batches/[id]/attendance.tsx`, `app/students/[id].tsx`, `app/coaches/[id].tsx`, `app/(auth)/verify-otp.tsx`, `app/attendance-otp.tsx`

Expo Router can return `string | string[]` for a param even when typed `string`. Normalize each destructured param. The mechanical fix: rename the destructured value to `*Param` and add a normalizing line.

> **CORRECTION:** `app/(tabs)/students.tsx:74` (audit) does **NOT** use `useLocalSearchParams` — skip it. The real sites are the seven files above.

- [ ] **10.1 — `app/batches/[id]/index.tsx:14`.** Change:
```tsx
  const { id } = useLocalSearchParams<{ id: string }>();
```
to:
```tsx
  const { id: idParam } = useLocalSearchParams<{ id: string | string[] }>();
  const id = Array.isArray(idParam) ? idParam[0] : idParam;
```
(`id` remains a `string | undefined` downstream — every existing use of `id` is unchanged.)

- [ ] **10.2 — `app/batches/[id]/edit.tsx:14`.** Same transform (the line is identical). Apply the same two-line replacement.

- [ ] **10.3 — `app/batches/[id]/attendance.tsx:15`.** Same transform.

- [ ] **10.4 — `app/students/[id].tsx:12`.** Same transform.

- [ ] **10.5 — `app/coaches/[id].tsx:23`.** Same transform.

- [ ] **10.6 — `app/(auth)/verify-otp.tsx:14`.** Two params. Change:
```tsx
  const { otp_id, phone } = useLocalSearchParams<{ otp_id: string; phone: string }>();
```
to:
```tsx
  const { otp_id: otpIdParam, phone: phoneParam } = useLocalSearchParams<{ otp_id: string | string[]; phone: string | string[] }>();
  const otp_id = Array.isArray(otpIdParam) ? otpIdParam[0] : otpIdParam;
  const phone = Array.isArray(phoneParam) ? phoneParam[0] : phoneParam;
```

- [ ] **10.7 — `app/attendance-otp.tsx:17`.** Two params. Change:
```tsx
  const { trialId, studentName } = useLocalSearchParams<{ trialId: string; studentName: string }>();
```
to:
```tsx
  const { trialId: trialIdParam, studentName: studentNameParam } = useLocalSearchParams<{ trialId: string | string[]; studentName: string | string[] }>();
  const trialId = Array.isArray(trialIdParam) ? trialIdParam[0] : trialIdParam;
  const studentName = Array.isArray(studentNameParam) ? studentNameParam[0] : studentNameParam;
```

> Note `trialId` is later passed to `useStudioTrial(trialId)` and `mark.mutateAsync({ id: trialId, ... })`; both expect `string`. Post-normalization `trialId` is `string | undefined` — same as before (the old typed-`string` was also possibly undefined at runtime). No new tsc error introduced; if the hook signatures are non-optional `string`, they already accepted the old `trialId` so the type is unchanged.

**Checkpoint**
```bash
cd /home/mp2sslrl/code/code && export PATH="$HOME/.local/bin:$PATH" && pnpm --filter @findemy/admin typecheck
grep -rn "Array.isArray(idParam)\|Array.isArray(otpIdParam)\|Array.isArray(trialIdParam)" apps/admin/app | wc -l
grep -rn "string | string\[\]" apps/admin/app | wc -l
```
Expected: typecheck 0 errors. First grep count `5` (the five `id`/`otp_id`/`trialId` normalizers — coaches/[id], batches/[id]/index, batches/[id]/edit, attendance, students/[id] use `idParam`; verify-otp uses `otpIdParam`; attendance-otp uses `trialIdParam` → tighten the grep if needed). Second grep count `>= 7` (one per normalized param-bag type).

---

### Task 11 — a11y on remaining icon-only pressables

**File:** `app/(tabs)/studio.tsx` (the schedule `⋯` was handled in Task 1.6)

- [ ] **11.1 — studio `✎` darkBtn (lines 99-101).** Add `accessibilityRole`/`accessibilityLabel`. Change:
```tsx
              <Pressable style={styles.darkBtn} onPress={() => router.push('/profile/edit' as any)}>
                <Text style={{ color: theme.color.ivory, fontSize: 16 }}>✎</Text>
              </Pressable>
```
to:
```tsx
              <Pressable
                style={styles.darkBtn}
                onPress={() => router.push('/profile/edit' as any)}
                accessibilityRole="button"
                accessibilityLabel="Edit academy profile"
              >
                <Text style={{ color: theme.color.ivory, fontSize: 16 }}>✎</Text>
              </Pressable>
```

**Checkpoint**
```bash
cd /home/mp2sslrl/code/code && export PATH="$HOME/.local/bin:$PATH" && pnpm --filter @findemy/admin typecheck
grep -n 'accessibilityLabel="Edit academy profile"' "apps/admin/app/(tabs)/studio.tsx"
```
Expected: typecheck 0 errors. grep prints one match.

---

### Task 12 — edit-batch: make category editable

**Files:** `app/batches/[id]/edit.tsx`, `src/hooks/useStudioQueries.ts`

The edit form never lets you change category, though `BatchUpdateSchema` accepts it (`apps/api/src/modules/studio/routes.ts:41`). Add a category chip row seeded from `existing.category`, include `category` in the payload, and **extend the `useUpdateBatch` body type** (which currently omits `category`).

- [ ] **12.1 — extend the hook's body type** in `src/hooks/useStudioQueries.ts` (the `useUpdateBatch` `mutationFn` body, lines 129-135). Change:
```tsx
    mutationFn: (body: {
      title?: string; level?: string; capacity?: number;
      trial_fee_paise?: number; monthly_fee_paise?: number;
      coach_id?: string; status?: 'active' | 'inactive';
      mode?: 'online' | 'offline';
      timings?: { day_of_week: number; start_time: string; duration_min: number }[];
    }) => api.studio.batches.update(id, body),
```
to:
```tsx
    mutationFn: (body: {
      title?: string; category?: 'music' | 'dance' | 'arts' | 'yoga';
      level?: string; capacity?: number;
      trial_fee_paise?: number; monthly_fee_paise?: number;
      coach_id?: string; status?: 'active' | 'inactive';
      mode?: 'online' | 'offline';
      timings?: { day_of_week: number; start_time: string; duration_min: number }[];
    }) => api.studio.batches.update(id, body),
```

- [ ] **12.2 — add a `CATEGORIES` const + category state** in `app/batches/[id]/edit.tsx`. After the `DAY_LABELS` const (line 9), add:
```tsx
const CATEGORIES = ['music', 'dance', 'arts', 'yoga'] as const;
type Cat = (typeof CATEGORIES)[number];
```
Add the state alongside the other `useState` calls (after line 22's `title` state is fine):
```tsx
  const [category, setCategory] = useState<Cat>('music');
```

- [ ] **12.3 — seed category from `existing`** inside the hydrate effect (lines 36-52). After `setTitle(existing.title || '');` (line 38), add:
```tsx
    setCategory((existing.category as Cat) ?? 'music');
```

- [ ] **12.4 — render the chip row.** `Chip` is already imported (line 3). Add a category picker right after the `NAME` field (after the title `TextInput` at line 135, before the `LEVEL` label at line 137):
```tsx
        {label('CATEGORY')}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {CATEGORIES.map((c) => (
            <Chip key={c} label={c} selected={category === c} onPress={() => setCategory(c)} />
          ))}
        </View>
```

- [ ] **12.5 — include `category` in the payload** (lines 65-75). Change:
```tsx
      await updateBatch.mutateAsync({
        title: title.trim(),
        level: level.trim(),
```
to:
```tsx
      await updateBatch.mutateAsync({
        title: title.trim(),
        category,
        level: level.trim(),
```

**Checkpoint**
```bash
cd /home/mp2sslrl/code/code && export PATH="$HOME/.local/bin:$PATH" && pnpm --filter @findemy/admin typecheck
grep -n "category" "apps/admin/app/batches/[id]/edit.tsx"
grep -n "category?:" apps/admin/src/hooks/useStudioQueries.ts
```
Expected: typecheck 0 errors. First grep shows the const, state, seed, chip row, and payload (>=5 hits). Second grep shows the extended `useUpdateBatch` body type.

---

### Task 13 — edit-batch: remove dead location/meetingLink inputs

**File:** `app/batches/[id]/edit.tsx`

`location`/`meetingLink` are captured but never loaded from `existing` nor sent (and `BatchUpdateSchema` is `.strict()` — sending them would 400). Backend has no such fields → remove the inputs + state (honest fix).

- [ ] **13.1 — remove the state (lines 33-34).** Delete:
```tsx
  const [location, setLocation] = useState('');
  const [meetingLink, setMeetingLink] = useState('');
```

- [ ] **13.2 — remove the gated inputs (lines 197-207).** Delete the whole `mode === 'offline' ? (...) : (...)` block that renders the `STUDIO LOCATION` / `MEETING LINK` inputs:
```tsx
        {mode === 'offline' ? (
          <>
            {label('STUDIO LOCATION')}
            <TextInput value={location} onChangeText={setLocation} placeholder="Room / address" placeholderTextColor={theme.color.mist} style={inputStyle} />
          </>
        ) : (
          <>
            {label('MEETING LINK')}
            <TextInput value={meetingLink} onChangeText={setMeetingLink} placeholder="Zoom / Meet link" placeholderTextColor={theme.color.mist} autoCapitalize="none" style={inputStyle} />
          </>
        )}
```
> The `mode` toggle itself (lines 173-195) stays — `mode` IS persisted (it's in the payload at line 73 and the schema). Only the location/meetingLink follow-up inputs are dead. The `MODE` selector now sits directly above `PRICING`.

**Checkpoint**
```bash
cd /home/mp2sslrl/code/code && export PATH="$HOME/.local/bin:$PATH" && pnpm --filter @findemy/admin typecheck
grep -n "location\|meetingLink\|STUDIO LOCATION\|MEETING LINK" "apps/admin/app/batches/[id]/edit.tsx"; echo "dead exit:$?"
```
Expected: typecheck 0 errors (no "unused variable" errors and no dangling references). The dead-UI grep prints **nothing** (`exit:1`).

---

### Task 14 — batch-hub: present-metric null handling

**File:** `app/batches/[id]/index.tsx`

`present = roster.filter((s) => (s.attendance_pct ?? 0) >= 75).length` (line 33) coerces null-attendance (new) students to 0, so a brand-new batch shows "0 active" while every student is actually "new". Treat null explicitly and rename the pill so it doesn't imply enrollment state.

- [ ] **14.1 — recompute the metrics (lines 32-34).** Change:
```tsx
  const enrolled = roster.length;
  const present = roster.filter((s) => (s.attendance_pct ?? 0) >= 75).length;
  const atRisk = roster.filter((s) => s.attendance_pct != null && s.attendance_pct < 50).length;
```
to:
```tsx
  const enrolled = roster.length;
  // Only students with a recorded attendance % count toward active/at-risk.
  // Null-attendance students are "new" and belong to neither bucket.
  const active = roster.filter((s) => s.attendance_pct != null && s.attendance_pct >= 75).length;
  const atRisk = roster.filter((s) => s.attendance_pct != null && s.attendance_pct < 50).length;
  const isNew = roster.filter((s) => s.attendance_pct == null).length;
```

- [ ] **14.2 — update the pill row (lines 73-83).** Replace the `present`-based pill with an `active` pill labeled "regular" (avoids implying enrollment), and add a "new" pill when there are new students. Change:
```tsx
        {/* Summary pills */}
        <View style={styles.pillRow}>
          <View style={[styles.pill, { backgroundColor: theme.color.jadeSoft }]}>
            <Text style={[styles.pillText, { color: theme.color.jade }]}>{present} active</Text>
          </View>
          <View style={[styles.pill, { backgroundColor: theme.color.roseSoft }]}>
            <Text style={[styles.pillText, { color: theme.color.rose }]}>{atRisk} at risk</Text>
          </View>
          <View style={[styles.pill, { backgroundColor: theme.color.paperWarm }]}>
            <Text style={[styles.pillText, { color: theme.color.inkSoft }]}>{enrolled} enrolled</Text>
          </View>
        </View>
```
to:
```tsx
        {/* Summary pills */}
        <View style={styles.pillRow}>
          <View style={[styles.pill, { backgroundColor: theme.color.jadeSoft }]}>
            <Text style={[styles.pillText, { color: theme.color.jade }]}>{active} regular</Text>
          </View>
          <View style={[styles.pill, { backgroundColor: theme.color.roseSoft }]}>
            <Text style={[styles.pillText, { color: theme.color.rose }]}>{atRisk} at risk</Text>
          </View>
          {isNew > 0 ? (
            <View style={[styles.pill, { backgroundColor: theme.color.marigoldSoft }]}>
              <Text style={[styles.pillText, { color: theme.color.inkSoft }]}>{isNew} new</Text>
            </View>
          ) : (
            <View style={[styles.pill, { backgroundColor: theme.color.paperWarm }]}>
              <Text style={[styles.pillText, { color: theme.color.inkSoft }]}>{enrolled} enrolled</Text>
            </View>
          )}
        </View>
```
> "regular" = students attending >=75% (a behavior metric, not enrollment state). The "new" pill surfaces null-attendance students so a fresh batch reads "0 regular · 0 at risk · N new" instead of the misleading "0 active". When there are no new students the original "enrolled" pill is preserved.

**Checkpoint**
```bash
cd /home/mp2sslrl/code/code && export PATH="$HOME/.local/bin:$PATH" && pnpm --filter @findemy/admin typecheck
grep -n "const present" "apps/admin/app/batches/[id]/index.tsx"; echo "present exit:$?"
grep -n "regular\|isNew" "apps/admin/app/batches/[id]/index.tsx"
```
Expected: typecheck 0 errors. The `const present` grep prints nothing (`exit:1` — renamed away). The `regular`/`isNew` grep shows the new metric + label.

---

### Task 15 — students tab: clear filters on category switch

**File:** `app/(tabs)/students.tsx`

Search/tier UI only renders for `category === 'All'`, but switching categories doesn't clear `query`/`attendanceTier`, so stale `q`/`attendance_tier` keep firing server-side (the `useStudioStudents` call at lines 86-90 always runs) and silently reappear on return to 'All'. The category chip already clears `batchId` (line 149) — add `query`/`attendanceTier` to that reset.

- [ ] **15.1 — clear on category change (line 149).** Change:
```tsx
              onPress={() => { setCategory(cat); setBatchId(''); }}
```
to:
```tsx
              onPress={() => {
                setCategory(cat);
                setBatchId('');
                if (cat !== 'All') {
                  setQuery('');
                  setAttendanceTier('');
                }
              }}
```
> Clearing only when leaving 'All' preserves the user's typed query while they stay on the All tab. The debounced `q` (line 84) follows `query`, so clearing `query` clears the server filter on the next debounce tick; since the student list isn't shown off the All tab, the stale fetch no longer matters and the All tab returns clean.

**Checkpoint**
```bash
cd /home/mp2sslrl/code/code && export PATH="$HOME/.local/bin:$PATH" && pnpm --filter @findemy/admin typecheck
grep -n "setQuery('')" "apps/admin/app/(tabs)/students.tsx"
grep -n "setAttendanceTier('')" "apps/admin/app/(tabs)/students.tsx"
```
Expected: typecheck 0 errors. Both greps print the new reset lines inside the category `onPress`.

---

## Final Group-G Checkpoint

Run the full typecheck plus the cross-cutting greps; each drift/dead-UI grep must report `exit:1` (found nothing).
```bash
cd /home/mp2sslrl/code/code && export PATH="$HOME/.local/bin:$PATH" && pnpm --filter @findemy/admin typecheck ; echo "tsc exit:$?"

# Task 1 — no schedule hardcoded brand colors
grep -n "#FBF7EF\|#E2DBCC\|'#D8492A'" "apps/admin/app/(tabs)/schedule.tsx" ; echo "T1 drift exit:$?"
# Task 2 — KAV present
grep -cn "KeyboardAvoidingView" "apps/admin/app/(auth)/verify-otp.tsx"
# Task 4 — dead style gone, glyph present
grep -n "signupLink" "apps/admin/app/(auth)/index.tsx" ; echo "T4 dead exit:$?"
grep -n "uF8FF" "apps/admin/app/(auth)/index.tsx"
# Task 5 — isError in all four screens
grep -rl "isError" apps/admin/app/batches/index.tsx apps/admin/app/coaches/index.tsx "apps/admin/app/batches/[id]/index.tsx" "apps/admin/app/students/[id].tsx"
# Task 6 — toast safe-area, no top:60
grep -n "useSafeAreaInsets" apps/admin/src/components/Toast.tsx ; grep -n "top: 60" apps/admin/src/components/Toast.tsx ; echo "T6 top60 exit:$?"
# Task 7 — ErrorState message prop
grep -n "message?: string" apps/admin/src/components/ErrorState.tsx
# Task 9 — debounce deps
grep -n "}, \[value\]);" apps/admin/src/hooks/useDebounce.ts
# Task 11 — studio a11y
grep -n 'accessibilityLabel="Edit academy profile"' "apps/admin/app/(tabs)/studio.tsx"
# Task 12/13 — category in, location/meetingLink out
grep -n "category?:" apps/admin/src/hooks/useStudioQueries.ts
grep -n "STUDIO LOCATION\|MEETING LINK" "apps/admin/app/batches/[id]/edit.tsx" ; echo "T13 dead exit:$?"
# Task 14 — present renamed
grep -n "const present" "apps/admin/app/batches/[id]/index.tsx" ; echo "T14 present exit:$?"
# Task 15 — filter clear
grep -n "setQuery('')" "apps/admin/app/(tabs)/students.tsx"
```
Expected: `tsc exit:0`. The four drift/dead greps (`T1 drift`, `T4 dead`, `T6 top60`, `T13 dead`, `T14 present`) print **no lines** and report `exit:1`. The KAV count is `3`. The `isError` grep lists all four files. The remaining greps each print their new line.
