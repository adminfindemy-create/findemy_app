# Group D — Theme Drift Sweep — Sub-Plan
**Parent:** [00-MASTER-PLAN.md](./00-MASTER-PLAN.md)
**Goal:** Eliminate hardcoded fonts/colors/shadows in apps/student so the app renders on-brand from theme tokens.
**Depends on:** Group G (adds navy token) is independent; this group must use the FINAL theme.ts token set. **Blocks:** nothing. Do this as a late, mechanical sweep.
**Scale:** ~133 fontFamily + 6 serif + ~11 hex + 9 shadow edits across ~40 files. Land in route-group chunks.

---

## Crux: how to reference theme from a StyleSheet

There are two distinct situations. Counts below are real (grep-verified 2026-06-06).

**Situation A — INLINE style, `theme` IS in scope (103 of the 133 `fontFamily: "System"`).**
The literal sits inside a JSX `style={{ ... }}` (or `style={[ ..., { ... } ]}`) *inside the component body*, where `const theme = useTheme();` is already declared. These are trivial: replace `fontFamily: "System"` with `fontFamily: theme.font.sans`. Same for serif and the inline hex colors (D2/D3).

How to tell: the offending line number is **before** the module-level `const styles = StyleSheet.create(` line in the file. (In `app/program/[id]/review.tsx`, `useTheme()` is at line 75, `StyleSheet.create` is at line 666, and lines 249–642 are all inline → use `theme.font.sans` directly.)

**Situation B — MODULE-LEVEL `StyleSheet.create`, `theme` is NOT in scope (30 of the 133).**
The literal sits inside the top-level `const styles = StyleSheet.create({ ... })`, which is evaluated at module load before any component renders. `useTheme()` is a hook and cannot be called there. (In `review.tsx` this is exactly the one occurrence at line 683, inside the block starting at 666.)

**Prescribed approach for Situation B: import the static `tokens` object and reference it directly.**
`@findemy/ui` already re-exports `tokens` from `packages/ui/src/theme.ts` (`packages/ui/src/index.ts:1` does `export * from "./theme"`). `tokens.font` is **not** overridden by `darkTheme` (only `color` is — see `theme.ts:133-147`), so `tokens.font.sans` / `tokens.font.serif` are theme-stable and safe to use in a module-level StyleSheet. Do this:

```ts
// at top of file, extend the existing import
import { useTheme, tokens /* ...existing... */ } from "@findemy/ui";
// inside the module-level StyleSheet.create({ ... })
label: {
  fontFamily: tokens.font.sans,   // was: "System"
  // ...
},
```

Do **not** use approach (a) "hoist into an inline style" for Situation B — it churns the JSX unnecessarily. Use `tokens.*` for module-level, `theme.*` for inline. This keeps the diff mechanical and reviewable.

> Caveat for COLOR tokens in Situation B: `tokens.color.*` is the **light** palette and will not flip in dark mode. None of the D3/D5 module-level color edits below live in a dark-mode-sensitive surface (shadows are warm-brown in both themes; the D5 sites all use the fixed shadow color), so `tokens.color.*` / the literal `"#3C1E0A"` is correct. If a future color edit lands inside a module-level StyleSheet on a theme-flipping surface, hoist it inline instead.

---

## Files touched (by route group)

Per-file `fontFamily: "System"` counts (grep-verified). "(B:n)" = n of them are module-level (Situation B).

**auth** (1)
- `app/(auth)/index.tsx` — 1 (B:0). Plus `app/(auth)/login.tsx` — D3 only (#E8A33D, inline).

**tabs** (4)
- `app/(tabs)/index.tsx` — 2 (B:2). Plus D5 shadow at :497.
- `app/(tabs)/events.tsx` — 2 (B:2).

**trials + booking** (15)
- `app/trials/[id].tsx` — 4 (B:1). Plus D3 (#E8F5E9, #2E7D32 at :449/:450, inline).
- `app/booking/pay.tsx` — 5 (B:3). Plus D2 serif at :467.
- `app/booking/confirmation.tsx` — 4 (B:2). Plus D2 serif at :461.
- `app/booking/slot.tsx` — 2 (B:2).

**workshop + events** (23 + 1)
- `app/workshop/[id].tsx` — 8 (B:1). Plus D3 (#1E5C5A :244, #88827B :85/:95, #E8552B :97). Plus D4 (`TYPE_TAG` :28).
- `app/workshop/pay.tsx` — 3 (B:2). Plus D2 serif at :236.
- `app/workshop/confirmation.tsx` — 2 (B:?).
- `app/events/[id].tsx` — D5 shadow at :524 (no `fontFamily: "System"`).
- `app/events/pay.tsx` — D2 serif at :293 (no `fontFamily: "System"`).

**enrollment** (1)
- `app/enrollment/[id].tsx` — D5 shadow at :1314; D4 (`CATEGORY_COLORS` :35 → `theme.category`).
- `app/enrollment/pay.tsx` — D2 serif at :416.
- `app/enrollment/confirmation.tsx` — D2 serif at :341.

**program** (41)
- `app/program/[id]/review.tsx` — 18 (B:1, at :683). Plus D5 shadow at :749.
- `app/program/[id].tsx` — 13 (B:0). Plus D3 (#FAF6EE :126, :172, inline).
- `app/program/[id]/trial.tsx` — 9 (B:?).
- `app/program/[id]/enroll.tsx` — 1 (B:?).

**live + academy + index** (12)
- `app/live/[batch_id].tsx` — 4 (B:3). Plus D3 (#D8492A :58, inline).
- `app/academy/[id].tsx` — 7 (B:?). Plus D3 (#FAF6EE :136, :143, :149, inline).
- `app/academy/[id]/offerings.tsx` — 2.
- `app/index.tsx` — 1 (B:1).
- `app/post-trial/index.tsx` — 1.

**shared components** (44)
- `src/components/BatchDetailSheet.tsx` — 9 (B:1, at :300). Plus D5 shadow at :260.
- `src/components/TrialBookingSheet.tsx` — 8. Plus D5 shadow at :369.
- `src/components/OfferingsSheet.tsx` — 7 (B:1). Plus D5 shadow at :264.
- `src/components/CohortCard.tsx` — 6.
- `src/components/WorkshopRowCard.tsx` — 4 (B:2).
- `src/components/ProgramRowCard.tsx` — 4 (B:2).
- `src/components/EventRowCard.tsx` — 4 (B:2).
- `src/components/AcademyCard.tsx` — 2 (B:2).
- `src/components/BookingDetailSheet.tsx` — D5 shadow at :469; D4 (`WORKSHOP_TYPE_COLORS` :27).
- `src/components/Toast.tsx` — D5 shadow at :65 (no `fontFamily: "System"`).

> Per-file counts will be re-derived by each task via grep; do not trust this list as the count of record — trust the Checkpoint grep.

---

## Token mapping tables

### fontFamily → token (D1, D2)

| Literal | Inline (theme in scope) | Module-level StyleSheet |
| --- | --- | --- |
| `fontFamily: "System"` | `fontFamily: theme.font.sans` | `fontFamily: tokens.font.sans` |
| `fontFamily: "Geist"` (appears in some inline workshop styles) | `fontFamily: theme.font.sans` | `fontFamily: tokens.font.sans` |
| `fontFamily: "Instrument Serif"` | `fontFamily: theme.font.serif` | `fontFamily: tokens.font.serif` |

`tokens.font.sans === "Geist"`, `tokens.font.serif === "Instrument Serif"` (theme.ts:41-42).

### hex → color token (D3)

All values read from `packages/ui/src/theme.ts`. Choose inline (`theme.color.*`) or module-level (`tokens.color.*`) per the rule above; every D3 site below is **inline** so use `theme.color.*`.

| Hex | Token | Token value | Match | Site(s) |
| --- | --- | --- | --- | --- |
| `#D8492A` | `theme.color.persimmon` | `#D8492A` | exact | `app/live/[batch_id].tsx:58` |
| `#1E5C5A` | `theme.color.jade` | `#1E5C5A` | exact | `app/workshop/[id].tsx:244` |
| `#FAF6EE` | `theme.color.ivory` | `#FAF6EE` | exact | `app/academy/[id].tsx:136,143,149`; `app/program/[id].tsx:126,172` |
| `#E8A33D` | `theme.color.marigold` | `#E8A33D` | exact | `app/(auth)/login.tsx:54` |
| `#88827B` | `theme.color.mist` | `#8B7F73` | **closest, FLAG** | `app/workshop/[id].tsx:85,95` |
| `#E8552B` | `theme.color.persimmon` | `#D8492A` | **closest, FLAG** | `app/workshop/[id].tsx:97` |
| `#E8F5E9` | `theme.color.jadeSoft` | `#C9DCD8` | **closest, FLAG** | `app/trials/[id].tsx:449` |
| `#2E7D32` | `theme.color.jade` | `#1E5C5A` | **closest, FLAG** | `app/trials/[id].tsx:450` |

FLAG = no exact token; substitution shifts the rendered color. `#88827B`→mist and `#E8552B`→persimmon are warm-family neighbors and safe to swap mechanically but should get a visual glance. `#E8F5E9`/`#2E7D32` are a green "success" pill that does not exist as a token; mapping to `jadeSoft`/`jade` keeps it in the brand teal family — **flag for design sign-off**, since it changes a green success cue to teal. If design rejects, the fallback is to leave these two literals in place (they are out of scope for a pure token sweep) rather than invent a token. Do NOT add a token in this group (token additions belong to Group G).

### fontSize → type ramp (D6, OPTIONAL — not a sweep)

Verified against `theme.ts:56-61`.

| fontSize literal | Ramp key | Ramp size |
| --- | --- | --- |
| `10` | `theme.type.label.size` | 10 |
| `11` | `theme.type.tiny.size` | 11 |
| `12` | `theme.type.micro.size` | 12 |
| `13` | `theme.type.small.size` | 13 |
| `14` | `theme.type.body.size` | 14 |

Current counts (grep, may include matches inside larger numbers — treat as upper bound): `10`→43, `11`→59, `12`→76, `13`→120, `14`→77 (~375 total). **This is explicitly NOT a required task.** Replacing a bare `fontSize: 13` with `theme.type.small.size` only swaps the size and loses the ramp's `lineHeight`/`weight`, so a naive sweep is *not* a faithful improvement and risks visual regressions. Recommendation: when you are already editing a file for D1–D5, opportunistically convert a `fontSize` literal **only if** you also pull the matching `lineHeight`/`fontWeight` from the ramp (or the line already sets them to ramp-consistent values). Never run this as a standalone find/replace. No Checkpoint is attached to D6.

---

## D4 — shared palette extraction

### New file: `apps/student/src/lib/typeColors.ts`

```ts
// Shared workshop "type" tag palette. Single source of truth for the
// masterclass/offline/online/demo chip colors used across bookings,
// the workshop detail screen, and the booking detail sheet.
export type WorkshopTypeColor = { bg: string; fg: string };

export const WORKSHOP_TYPE_COLORS: Record<string, WorkshopTypeColor> = {
  masterclass: { bg: "#FBE3D9", fg: "#A0331F" },
  offline:     { bg: "#FBE4B8", fg: "#5B3F0E" },
  online:      { bg: "#C9DCD8", fg: "#0E3936" },
  demo:        { bg: "#E2DBCC", fg: "#3A332D" },
};
```

> These four colors are tag-specific and have no 1:1 theme token (e.g. `#A0331F`, `#E2DBCC` are not in `theme.color`), so a shared `lib` constant is the correct extraction target — not a theme token. Keep the literals here.

### Call-site edits

**`app/bookings.tsx`** — delete the local block at lines 17–22, add import.
```ts
// remove lines 17-22 (the local const WORKSHOP_TYPE_COLORS = { ... })
// add to the import group near the top:
import { WORKSHOP_TYPE_COLORS } from "@/lib/typeColors";
```
Usage at `:162` (`WORKSHOP_TYPE_COLORS[wType] ?? WORKSHOP_TYPE_COLORS.demo`) is unchanged.

**`app/workshop/[id].tsx`** — the local one is named `TYPE_TAG` and adds a `label` field; preserve `label`. Compose the shared palette with the labels instead of duplicating the colors.
```ts
import { WORKSHOP_TYPE_COLORS } from "@/lib/typeColors";

// replace the block at lines 28-33 with:
const TYPE_TAG: Record<string, { bg: string; fg: string; label: string }> = {
  masterclass: { ...WORKSHOP_TYPE_COLORS.masterclass, label: "Masterclass" },
  offline:     { ...WORKSHOP_TYPE_COLORS.offline,     label: "Offline" },
  online:      { ...WORKSHOP_TYPE_COLORS.online,      label: "Online" },
  demo:        { ...WORKSHOP_TYPE_COLORS.demo,        label: "Demo" },
};
```
Usage at `:152` (`TYPE_TAG[w.type] ?? TYPE_TAG.demo`) is unchanged.

**`src/components/BookingDetailSheet.tsx`** — delete the local block at lines 27–32, add import.
```ts
// remove lines 27-32 (the local const WORKSHOP_TYPE_COLORS = { ... })
import { WORKSHOP_TYPE_COLORS } from "@/lib/typeColors";
```
Usage at `:110` is unchanged.

**`app/enrollment/[id].tsx`** — the local `CATEGORY_COLORS` (lines 35–39) is byte-for-byte the same shape and values as `theme.category` (`theme.ts:121-126`: music/dance/arts/yoga, each `{ base, accent, ink }` — exact value match). Replace with `theme.category`. `theme` is in scope at the use site (`useTheme()` at :1048, use at :1082).
```ts
// delete the local const CATEGORY_COLORS block at lines 35-39 entirely
// at line 1082, change:
//   const catColors = CATEGORY_COLORS[enrollment.category] ?? CATEGORY_COLORS.music;
// to:
const catColors = theme.category[enrollment.category as keyof typeof theme.category] ?? theme.category.music;
```
(Confirmed `theme.category` exists — `theme.ts:119-126`.)

### D5 — shadow color

`theme.shadow.sm/md` use `shadowColor: '#3C1E0A'` (theme.ts:98,105); `lg` uses `#28140A`. The 9 sites all hardcode `shadowColor: "#000"` as part of an ad-hoc shadow that approximates the `md` look. Replace each with the warm shadow color. Use `theme.color`? — there is **no** standalone shadow-color token in `theme.color`, so reference the literal via the shadow group:
- Inline (theme in scope): `shadowColor: theme.shadow.md.shadowColor`.
- Module-level StyleSheet: `shadowColor: tokens.shadow.md.shadowColor`.

This resolves to `#3C1E0A` and keeps a single source. All 9 D5 sites are inside module-level StyleSheets (they sit next to `shadowOffset`/`shadowRadius` style props), so use `tokens.shadow.md.shadowColor`.

The 9 sites (re-grep-confirmed): `app/(tabs)/index.tsx:497`, `app/events/[id].tsx:524`, `app/enrollment/[id].tsx:1314`, `app/program/[id]/review.tsx:749`, `src/components/OfferingsSheet.tsx:264`, `src/components/BookingDetailSheet.tsx:469`, `src/components/Toast.tsx:65`, `src/components/TrialBookingSheet.tsx:369`, `src/components/BatchDetailSheet.tsx:260`.

---

## Tasks

> Ordering: do D4 + the New file first (so imports exist), then the route-group sweeps. Each route-group task covers D1/D2/D3/D5 for the files it owns. D6 is never a task.

### Task 0 — D4: create shared palette + rewire call sites
1. Create `apps/student/src/lib/typeColors.ts` exactly as in the D4 section above.
2. Edit `app/bookings.tsx`, `app/workshop/[id].tsx`, `src/components/BookingDetailSheet.tsx`, `app/enrollment/[id].tsx` per the call-site edits above.

**Checkpoint**
```bash
# the palette literal "#FBE3D9" should now exist only in the shared file (1 hit)
grep -rln '"#FBE3D9"' apps/student/app apps/student/src
# expected: apps/student/src/lib/typeColors.ts   (and nothing else)

# CATEGORY_COLORS local const is gone
grep -rn 'CATEGORY_COLORS' apps/student/app/enrollment
# expected: no output

# theme.category is now referenced
grep -rn 'theme.category' apps/student/app/enrollment/\[id\].tsx
# expected: 1 hit at the catColors line
```
Expected: `#FBE3D9` appears in exactly one file (`typeColors.ts`); `CATEGORY_COLORS` returns nothing; `theme.category` present.

---

### Task 1 — auth route group
Files: `app/(auth)/index.tsx` (1× System, inline), `app/(auth)/login.tsx` (D3 #E8A33D at :54, inline).
- Replace `fontFamily: "System"` → `theme.font.sans` (verify scope; `(auth)/index.tsx` has `useTheme`).
- `app/(auth)/login.tsx:54` `color: "#E8A33D"` → `color: theme.color.marigold` (theme in scope, :18).

**Checkpoint**
```bash
grep -rn 'fontFamily: *"System"' 'apps/student/app/(auth)'
grep -rn '#E8A33D' 'apps/student/app/(auth)'
```
Expected: both return **nothing**.

---

### Task 2 — tabs route group
Files: `app/(tabs)/index.tsx` (2× System, both module-level), `app/(tabs)/events.tsx` (2× System, both module-level).
- Replace both `fontFamily: "System"` in each file with `fontFamily: tokens.font.sans` (module-level → import `tokens`). Add `tokens` to the `@findemy/ui` import.
- `app/(tabs)/index.tsx:497` `shadowColor: "#000"` → `tokens.shadow.md.shadowColor`.

**Checkpoint**
```bash
grep -rn 'fontFamily: *"System"' 'apps/student/app/(tabs)'
grep -rn 'shadowColor: *"#000"' 'apps/student/app/(tabs)'
```
Expected: both return **nothing**.

---

### Task 3 — trials + booking route group
Files: `app/trials/[id].tsx`, `app/booking/pay.tsx`, `app/booking/confirmation.tsx`, `app/booking/slot.tsx`.
- `fontFamily: "System"`: inline → `theme.font.sans`; module-level (booking/pay ×3, booking/confirmation ×2, booking/slot ×2, trials/[id] ×1) → `tokens.font.sans` (add `tokens` import).
- D2 serif: `app/booking/pay.tsx:467`, `app/booking/confirmation.tsx:461` → `tokens.font.serif` (both are inside module-level StyleSheets — confirm; if inline use `theme.font.serif`).
- D3 in `app/trials/[id].tsx` (inline, theme in scope): `:449` `backgroundColor: "#E8F5E9"` → `theme.color.jadeSoft`; `:450` `color: "#2E7D32"` → `theme.color.jade` (FLAG: green→teal, design sign-off — see mapping table).

**Checkpoint**
```bash
grep -rn 'fontFamily: *"System"' apps/student/app/trials apps/student/app/booking
grep -rn 'fontFamily: *"Instrument Serif"' apps/student/app/booking
grep -rn '#E8F5E9\|#2E7D32' apps/student/app/trials
```
Expected: all three return **nothing**.

---

### Task 4 — workshop + events route group
Files: `app/workshop/[id].tsx`, `app/workshop/pay.tsx`, `app/workshop/confirmation.tsx`, `app/events/[id].tsx`, `app/events/pay.tsx`.
- `fontFamily: "System"`: inline → `theme.font.sans`; module-level (workshop/[id] ×1, workshop/pay ×2, workshop/confirmation as found) → `tokens.font.sans`.
- D2 serif: `app/workshop/pay.tsx:236`, `app/events/pay.tsx:293` → serif token (module-level → `tokens.font.serif`; verify).
- D3 in `app/workshop/[id].tsx` (inline, theme in scope at :? — `useTheme` present):
  - `:244` `backgroundColor: "#1E5C5A"` → `theme.color.jade`.
  - `:85`, `:95` `color: "#88827B"` → `theme.color.mist` (FLAG).
  - `:97` `color: "#E8552B"` → `theme.color.persimmon` (FLAG).
  - Also the inline `fontFamily: "Geist"` at :85/:95 → `theme.font.sans`.
- D5: `app/events/[id].tsx:524` `shadowColor: "#000"` → `tokens.shadow.md.shadowColor`.

**Checkpoint**
```bash
grep -rn 'fontFamily: *"System"' apps/student/app/workshop apps/student/app/events
grep -rn 'fontFamily: *"Instrument Serif"' apps/student/app/workshop apps/student/app/events
grep -rn '#1E5C5A\|#88827B\|#E8552B' apps/student/app/workshop
grep -rn 'shadowColor: *"#000"' apps/student/app/events
```
Expected: all four return **nothing**.

---

### Task 5 — enrollment route group
Files: `app/enrollment/[id].tsx` (System: none; D5 shadow + D4 done in Task 0), `app/enrollment/pay.tsx`, `app/enrollment/confirmation.tsx`.
- D2 serif: `app/enrollment/pay.tsx:416`, `app/enrollment/confirmation.tsx:341` → serif token (module-level → `tokens.font.serif`; verify).
- D5: `app/enrollment/[id].tsx:1314` `shadowColor: "#000"` → `tokens.shadow.md.shadowColor`.

**Checkpoint**
```bash
grep -rn 'fontFamily: *"Instrument Serif"' apps/student/app/enrollment
grep -rn 'shadowColor: *"#000"' apps/student/app/enrollment
grep -rn 'fontFamily: *"System"' apps/student/app/enrollment
```
Expected: all three return **nothing**.

---

### Task 6 — program route group
Files: `app/program/[id]/review.tsx` (18× System, B:1 at :683; D5 at :749), `app/program/[id].tsx` (13× System, all inline; D3 #FAF6EE ×2), `app/program/[id]/trial.tsx` (9×), `app/program/[id]/enroll.tsx` (1×).
- `fontFamily: "System"`: inline → `theme.font.sans`; the one module-level case in `review.tsx:683` → `tokens.font.sans` (add `tokens` import).
- D3 in `app/program/[id].tsx` (inline, theme in scope): `:126`, `:172` `color: "#FAF6EE"` → `theme.color.ivory`.
- D5: `app/program/[id]/review.tsx:749` `shadowColor: "#000"` → `tokens.shadow.md.shadowColor`.

**Checkpoint**
```bash
grep -rn 'fontFamily: *"System"' apps/student/app/program
grep -rn '#FAF6EE' apps/student/app/program
grep -rn 'shadowColor: *"#000"' apps/student/app/program
```
Expected: all three return **nothing**.

---

### Task 7 — live + academy + root-index route group
Files: `app/live/[batch_id].tsx` (4× System, B:3; D3 #D8492A), `app/academy/[id].tsx` (7×; D3 #FAF6EE ×3), `app/academy/[id]/offerings.tsx` (2×), `app/index.tsx` (1×, B:1), `app/post-trial/index.tsx` (1×).
- `fontFamily: "System"`: inline → `theme.font.sans`; module-level (live/[batch_id] ×3, index ×1) → `tokens.font.sans`.
- D3 in `app/live/[batch_id].tsx:58` (inline) `backgroundColor: "#D8492A"` → `theme.color.persimmon`.
- D3 in `app/academy/[id].tsx` (inline, theme in scope): `:136`, `:143`, `:149` `color: "#FAF6EE"` → `theme.color.ivory` (preserve the conditional at :149: `color: isSaved ? theme.color.persimmon : theme.color.ivory`).

**Checkpoint**
```bash
grep -rn 'fontFamily: *"System"' apps/student/app/live apps/student/app/academy apps/student/app/index.tsx apps/student/app/post-trial
grep -rn '#D8492A' apps/student/app/live
grep -rn '#FAF6EE' apps/student/app/academy
```
Expected: all three return **nothing**.

---

### Task 8 — shared components route group
Files: `src/components/BatchDetailSheet.tsx` (9× System, B:1 at :300; D5 :260), `src/components/TrialBookingSheet.tsx` (8×; D5 :369), `src/components/OfferingsSheet.tsx` (7×, B:1; D5 :264), `src/components/CohortCard.tsx` (6×), `src/components/WorkshopRowCard.tsx` (4×, B:2), `src/components/ProgramRowCard.tsx` (4×, B:2), `src/components/EventRowCard.tsx` (4×, B:2), `src/components/AcademyCard.tsx` (2×, B:2), `src/components/BookingDetailSheet.tsx` (D5 :469; D4 done in Task 0), `src/components/Toast.tsx` (D5 :65).
- `fontFamily: "System"`: inline → `theme.font.sans`; module-level → `tokens.font.sans` (add `tokens` import to each Situation-B file).
- D5 (all module-level): each `shadowColor: "#000"` → `tokens.shadow.md.shadowColor`:
  `BatchDetailSheet.tsx:260`, `TrialBookingSheet.tsx:369`, `OfferingsSheet.tsx:264`, `BookingDetailSheet.tsx:469`, `Toast.tsx:65`.

**Checkpoint**
```bash
grep -rn 'fontFamily: *"System"' apps/student/src/components
grep -rn 'shadowColor: *"#000"' apps/student/src/components
```
Expected: both return **nothing**.

---

### Task 9 — FINAL full-tree verification
Run every sweep grep across the whole subtree; each must return **nothing**, then typecheck.

**Checkpoint**
```bash
# D1 — no System fonts anywhere
grep -rn 'fontFamily: *"System"' apps/student/app apps/student/src ; echo "D1 exit:$?"
# D2 — no raw serif literal
grep -rn 'fontFamily: *"Instrument Serif"' apps/student/app apps/student/src ; echo "D2 exit:$?"
# D5 — no neutral black shadow
grep -rn 'shadowColor: *"#000"' apps/student/app apps/student/src ; echo "D5 exit:$?"
# D3 — no brand hex literals (the swept set)
grep -rn '#D8492A\|#1E5C5A\|#FAF6EE\|#E8A33D\|#88827B\|#E8552B\|#E8F5E9\|#2E7D32' apps/student/app apps/student/src ; echo "D3 exit:$?"
# D4 — no duplicated palette outside the shared file
grep -rln '"#FBE3D9"' apps/student/app apps/student/src   # expect ONLY src/lib/typeColors.ts
grep -rn 'CATEGORY_COLORS' apps/student/app ; echo "D4 cat exit:$?"
# typecheck
cd apps/student && npx tsc --noEmit ; echo "tsc exit:$?"
```
Expected output: every `grep` for D1/D2/D3/D5 prints **no lines** and reports `exit:1` (grep found nothing). The `#FBE3D9` grep prints exactly one path: `apps/student/src/lib/typeColors.ts`. The `CATEGORY_COLORS` grep prints no lines (`exit:1`). `npx tsc --noEmit` prints no errors and reports `tsc exit:0`.

> Note on D3 final grep: `#FBE3D9`-family workshop tag colors (e.g. `#A0331F`) intentionally remain in `src/lib/typeColors.ts` — they are not in the D3 swept set, so the D3 grep above does not include them and will still pass. If a later edit reintroduces any swept hex, this grep catches it.
