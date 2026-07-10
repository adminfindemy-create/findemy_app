# Group D — Functional Flow Gaps, Error/Loading States & Money Formatting — Sub-Plan
**Parent:** [00-MASTER-PLAN.md](./00-MASTER-PLAN.md)
**Goal:** Close real functional gaps in the Findemy Studio (academy admin) app — missing loading/error states, broken empty-state copy, misleading money estimates, weak numeric/date validation — and centralize INR formatting in one shared helper.
**Depends on:** Group A.
**Provides:** `apps/admin/src/lib/format.ts` (`formatRupees`) — a shared artifact other Groups may import. Its contract is fixed below.
**Blocks:** nothing downstream, but Task 1 (`format.ts`) MUST land before D7-dependent tasks (3, 4, 10) in this group.

> **PROJECT RULE — NO GIT.** Never `git init` / `add` / `commit` / `push`. Checkpoints are typecheck + grep only.

---

## Context / verified line-number corrections

Every cited file was re-read against the live tree before writing. Corrections vs. the audit:

- **D1 / D2 (`app/reviews/[id]/respond.tsx`).** Confirmed. `const { data } = useStudioReviews();` (line **13**) — **no filter arg**, so the query key is `['studio','reviews', undefined]`, distinct from the list screen's `['studio','reviews', filter]` (e.g. `['studio','reviews','needs_reply']`). `const review = data?.items.find(...)` (line **14**). `onSubmit` (lines **26–29**) is `await respond.mutateAsync(...)` then `router.back()` with **no** try/catch. The "Review not found" early return is lines **31–37**, with **no** `isLoading` branch. `useStudioReviews` (hooks line **187–192**) destructures from `useQuery`, so `isLoading`/`isError` are available. There is **no** single-review endpoint in `api.studio.reviews` (api-client lines 457–463: `list`, `summary`, `respond` only), so the fix keeps resolving from the list but (a) requests the **filtered list won't help** — instead resolve from the **unfiltered** list (current behavior) AND surface its `isLoading`. We do **not** add a new endpoint; we add loading + error + a "go back" fallback. (See Task 2 note.)
- **D3 (`app/(tabs)/workshops.tsx`).** Confirmed. Three tabs (`upcoming`/`live`/`past`, lines **12–16**). Empty text is at lines **137–139**: `tab === 'upcoming' ? 'No upcoming workshops…' : 'No past workshops.'` — the `live` tab falls into the else and wrongly says "No past workshops."
- **D4 (`app/earnings.tsx`).** Confirmed and **scope-corrected**. Line **114**: `₹{fmt(nextPayout?.amount_paise ?? Math.round(total * 0.85))}` where `total = data?.total_paise` (line **43**) is **period-filtered**. **Critical finding:** the `EarningsData` type (`packages/types/src/index.ts` lines **372–388**) and the backend builder (`apps/api/src/modules/studio/repo.ts` `getEarnings`, lines **478–598**) expose **no lifetime / unpaid / pending balance field** — only the period-scoped `total_paise`, period-scoped `by_batch`, and the **real** `payouts[]` rows (each with `status`, `paid_at`, `amount_paise`). So a "stable lifetime balance" does **not exist client-side**. The honest fix (Task 5) therefore: (1) if a real payout row exists (`data.payouts[0]`), render it as a **Scheduled/real** payout with its status + date; (2) if none exists, render the estimate but label it unmistakably as a **period-scoped estimate** ("Est. for THIS MONTH") and visually downgrade it (no 📅 "scheduled" affordance) so a fabricated number is never styled like a booked payout. We do **not** invent a new API field in this group (flag as follow-on).
- **D5 (`app/reviews.tsx`).** **DOWNGRADED — backend already returns summary per-filter.** `summary` is read at line **27** (`const summary = data?.summary;`) and drives the "Needs reply · N" tab label at line **32**. Verified the backend: `service.getReviews` (`apps/api/src/modules/studio/service.ts` lines **302–329**) **always** computes `summary` via a separate `repo.getReviewsSummary(academyId)` call (line **308**) **regardless of `filter`**, and returns it on every response (line **326**). `repo.getReviewsSummary` (`repo.ts` lines **407–432**) is unconditional. The api-client types it `summary?: ReviewsSummary` (optional, line **460**) only because the field is technically optional in the contract — **at runtime it is always present.** So the badge does **not** actually vanish today. The fix is still worthwhile for **robustness** (decouple the badge from list-load state and the `?:` optionality): fetch summary independently via the **existing** `useStudioReviewsSummary()` hook (hooks lines **194–199**; api-client `summary()` line **462**) so the badge survives even if a future backend stops embedding `summary`. Treat as a **defensive HIGH→MEDIUM**, not a live data-loss bug.
- **D6 (`app/batches/new.tsx`).** Confirmed, with a **bounds correction**. zod schema lines **13–18**: `capacity/trial_fee/monthly_fee` are all `z.string().min(1)`. `onSubmit` (lines **56–58**) sends `Number(data.capacity)`, `Number(data.trial_fee) * 100`, `Number(data.monthly_fee) * 100` → `Number("abc") = NaN`. **Backend bounds** (`apps/api/src/modules/studio/routes.ts` `BatchCreateSchema` lines **7–17**): `capacity: z.number().int().min(1)`, `trial_fee_paise: z.number().int().min(0)`, `monthly_fee_paise: z.number().int().min(0)` — note the **fees allow 0** (free trial), only **capacity must be ≥ 1**. The audit's "all `.int().min(1)`" was wrong on the fees. Fix: regex `^\d+$` on all three, plus `refine` capacity ≥ 1; fees ≥ 0 is satisfied by `^\d+$`.
- **D7 (money helper).** Confirmed sites using `Math.round(paise / 100)`:
  - `app/(tabs)/workshops.tsx` line **38** (`price` display).
  - `app/workshops/[id].tsx` line **68** (`price: String(workshop.price_paise / 100)` — the edit-form **round-trip**, keeps decimals) and line **84** (`price_paise: Math.round(Number(data.price) * 100)`).
  - `app/trial/[id].tsx` line **37** (`₹${Math.round(feePaise / 100)}`).
  - `app/earnings.tsx` lines **12–14** (`fmt`) and **16–21** (`fmtBig`). `fmt` is used at lines 94, 114, 156, 186, 217, 249. `fmtBig` is the hero abbreviation (₹1.2L) — **left as-is** (different concern; not paise-dropping in a misleading way, it's an intentional compact format).
  - **`format.ts` does NOT exist yet** (`apps/admin/src/lib/` has only `api.ts`, `theme.ts`). Task 1 creates it.
- **D8 (workshop date validation).** Confirmed. `app/workshops/new.tsx` line **56** and `app/workshops/[id].tsx` line **75** both do `new Date(\`${data.start_date}T${data.start_time}\`).toISOString()` on free-text fields → throws `RangeError: Invalid time value` on malformed input. Both have an outer try/catch that turns it into a generic "Failed to create/update workshop" Alert — so it doesn't crash, but gives a useless message and no field-level feedback. Both schemas currently only `.min(1)` on `start_date`/`start_time` (new: lines **16–17** with messages; edit: lines **16–17** without).
- **D9 (`app/workshops/[id].tsx`).** Confirmed. `const { data } = useStudioWorkshops();` (line **37**), `workshop = data?.items.find(...)` (line **38**), `useEffect` (lines **57–71**) only `reset`s when `workshop` exists, else leaves the blank defaults. No `isLoading`/not-found branch before line **110** render. `useStudioWorkshops` (hooks lines **266–271**) exposes `isLoading`/`isError`/`refetch`.
- **D10 (`app/trial/[id].tsx`).** Confirmed. `const { data, isLoading, error } = useStudioTrial(id);` (line **13**); guard `if (isLoading || !data)` shows "Loading…" (lines **15–21**); `error` is destructured but **never used** → on error, `data` is undefined so it shows "Loading…" forever.
- **D11 (`app/trial/[id].tsx`).** Confirmed. Call/WhatsApp buttons (lines **64–69**) already short-circuit with `student.phone &&` inside `onPress`, so an empty phone is a **silent no-op** (no crash). Fix: add `disabled={!student.phone}` to both so the dead state is visible.
- **D12 (`app/batches/new.tsx`).** Confirmed. `setCoachId((res as any).coach?.id ?? '')` (line **77**) silently clears the just-made selection if the response shape differs. The api-client `coaches.create` shape should be checked when editing; fix validates the id and warns instead of silently blanking.
- **Test runner finding.** `apps/admin` declares `jest ^29.7.0` + `@jest/globals` but has **no** `jest.config`, **no** `babel-jest` / `ts-jest` / `jest-expo`, and **zero** existing test files — `pnpm test` (`"test": "jest"`) would not transform TS. Per the prompt's fallback, **do not** prescribe jest/vitest for `format.ts`. Instead the Task 1 checkpoint is a **tsc-compiled manual-assertion script** run through `node`, which needs no test-runner wiring. (Node 22.13.1, pnpm 11.0.9 confirmed on PATH via `export PATH="$HOME/.local/bin:$PATH"`.)

---

## Files touched

| File | Issue(s) | Change |
| --- | --- | --- |
| `apps/admin/src/lib/format.ts` | D7 | **New** — shared `formatRupees` |
| `apps/admin/app/reviews/[id]/respond.tsx` | D1, D2 | Loading state + try/catch with Alert |
| `apps/admin/app/(tabs)/workshops.tsx` | D3, D7 | Three-tab empty copy; `formatRupees` |
| `apps/admin/app/earnings.tsx` | D4, D7 | Honest scheduled-vs-estimated payout; `formatRupees` in `fmt` |
| `apps/admin/app/reviews.tsx` | D5 | Independent `useStudioReviewsSummary()` for the badge |
| `apps/admin/app/batches/new.tsx` | D6, D12 | Numeric validation (regex + bounds); coach-id guard |
| `apps/admin/app/workshops/[id].tsx` | D7, D8, D9 | Whole-rupee round-trip; date/time validation; loading/not-found states |
| `apps/admin/app/workshops/new.tsx` | D8 | Date/time validation |
| `apps/admin/app/trial/[id].tsx` | D7, D10, D11 | `formatRupees`; error state; phone-guard `disabled` |

Not touched: `fmtBig` in earnings (intentional compact hero format); no new API endpoints/fields (the unpaid-balance gap behind D4 is flagged as a backend follow-on).

---

## Shared artifact contract

Other groups depend on this **exact** signature from `apps/admin/src/lib/format.ts`:

```ts
// Rupees from paise. Default: rounded to whole rupees, en-IN grouping ("₹1,500").
// withDecimals: true → always two decimals ("₹1,500.00").
// Negative paise render with a leading "−" before the "₹" ("−₹50").
export function formatRupees(paise: number, opts?: { withDecimals?: boolean }): string;
```

Rules:
- `paise` is an integer count of paise (1/100 rupee). Non-finite input (`NaN`/`Infinity`) renders `"₹0"`.
- Default (no opts / `withDecimals` falsy) → `Math.round` to nearest rupee, then `toLocaleString("en-IN")` grouping.
- `withDecimals: true` → two fixed decimals via `toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })`.
- Negative amounts: sign computed from `paise < 0`, magnitude formatted from `Math.abs(paise)`, output `"−₹…"` (U+2212 minus, matching the existing earnings delta glyph).
- Callers append their own unit suffixes (`/mo`, ` · Free`).

---

## Tasks

> Order: **Task 1 first** (creates the shared helper the others import), then 2–9 in any order.

---

### Task 1 — D7: create `apps/admin/src/lib/format.ts` (the shared INR helper)

**Files:** `apps/admin/src/lib/format.ts` (new).

- [ ] **Step 1.1 — create the file** `apps/admin/src/lib/format.ts`:

```ts
/**
 * Render a paise amount as INR. Default: rounded to whole rupees with
 * en-IN grouping ("₹1,500"). `withDecimals: true` keeps two decimals
 * ("₹1,500.00"). Negative amounts render as "−₹50". Non-finite input → "₹0".
 *
 * Shared across the Findemy Studio app — see Group D sub-plan contract.
 */
export function formatRupees(paise: number, opts?: { withDecimals?: boolean }): string {
  if (!Number.isFinite(paise)) return '₹0';
  const withDecimals = opts?.withDecimals ?? false;
  const sign = paise < 0 ? '−' : '';
  const rupees = Math.abs(paise) / 100;
  const value = withDecimals
    ? rupees.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : Math.round(rupees).toLocaleString('en-IN');
  return `${sign}₹${value}`;
}
```

- [ ] **Step 1.2 — sanity-check the contract.** Expected outputs (used in the checkpoint script):
  - `formatRupees(150000)` → `"₹1,500"`
  - `formatRupees(15000)` → `"₹150"`
  - `formatRupees(149950)` → `"₹1,500"` (rounds; this is the D7 "1499.5 displayed as 1500" case)
  - `formatRupees(10000000)` → `"₹1,00,000"` (Indian lakh grouping)
  - `formatRupees(0)` → `"₹0"`
  - `formatRupees(-5000)` → `"−₹50"`
  - `formatRupees(150050, { withDecimals: true })` → `"₹1,500.50"`
  - `formatRupees(NaN)` → `"₹0"`

**Checkpoint (Task 1):** typecheck the package, then run a compiled manual-assertion script (no jest wiring exists in `apps/admin` — see Context). From repo root:

```bash
cd /home/mp2sslrl/code/code && export PATH="$HOME/.local/bin:$PATH" && pnpm --filter @findemy/admin typecheck
```
Expected: no errors. Then verify the helper's runtime behavior with a throwaway node script (compile the single file with the repo's tsc, no test runner):

```bash
cd /home/mp2sslrl/code/code && export PATH="$HOME/.local/bin:$PATH" && \
cat > /tmp/fmt_check.ts <<'EOF'
import { formatRupees } from './apps/admin/src/lib/format';
const cases: [string, string][] = [
  [formatRupees(150000), '₹1,500'],
  [formatRupees(15000), '₹150'],
  [formatRupees(149950), '₹1,500'],
  [formatRupees(10000000), '₹1,00,000'],
  [formatRupees(0), '₹0'],
  [formatRupees(-5000), '−₹50'],
  [formatRupees(150050, { withDecimals: true }), '₹1,500.50'],
  [formatRupees(NaN), '₹0'],
];
let ok = true;
for (const [got, want] of cases) {
  if (got !== want) { ok = false; console.error(`FAIL: got ${JSON.stringify(got)} want ${JSON.stringify(want)}`); }
}
console.log(ok ? 'ALL PASS' : 'FAILURES ABOVE');
process.exit(ok ? 0 : 1);
EOF
npx --prefix apps/admin tsc /tmp/fmt_check.ts --outDir /tmp/fmt_out --module commonjs --target es2020 --moduleResolution node --skipLibCheck && node /tmp/fmt_out/fmt_check.js
```
Expected final line: `ALL PASS`. (If the `npx --prefix` invocation cannot resolve the relative import, fall back to running the assertions inline with `node -e` after a plain `tsc --noEmit` confirms the file compiles — the load-bearing check is `ALL PASS`.) Then clean up: `rm -rf /tmp/fmt_check.ts /tmp/fmt_out`.

---

### Task 2 — D1 + D2: respond screen loading state + error handling

**File:** `apps/admin/app/reviews/[id]/respond.tsx`.

> Note (D1): there is no single-review endpoint. We keep resolving from the **unfiltered** `useStudioReviews()` list (current key) but now surface its `isLoading` so a cold/loading cache shows a spinner instead of an instant "Review not found". On genuine absence (loaded, not in list) we still show "not found" but with a Back affordance.

- [ ] **Step 2.1 — destructure `isLoading`.** Before (line 13):
```tsx
  const { data } = useStudioReviews();
```
After:
```tsx
  const { data, isLoading } = useStudioReviews();
```

- [ ] **Step 2.2 — wrap the submit in try/catch (D2).** Before (lines 26–29):
```tsx
  const onSubmit = async () => {
    await respond.mutateAsync({ id, response });
    router.back();
  };
```
After (match the workshop create/update error pattern — `Alert.alert`, `router.back()` only on success):
```tsx
  const onSubmit = async () => {
    try {
      await respond.mutateAsync({ id, response });
      router.back();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to submit your response. Please try again.');
    }
  };
```

- [ ] **Step 2.3 — add a loading branch before "not found" (D1).** Before (lines 31–37):
```tsx
  if (!review) {
    return (
      <Screen header={<ScreenHeader title="Respond" showBack />} bottomTab={null}>
        <Text style={{ color: theme.color.mist, fontFamily: theme.font.sans, padding: 24 }}>Review not found</Text>
      </Screen>
    );
  }
```
After:
```tsx
  if (isLoading) {
    return (
      <Screen header={<ScreenHeader title="Respond" showBack />} bottomTab={null}>
        <View style={{ padding: 24, alignItems: 'center' }}>
          <ActivityIndicator color={theme.color.persimmon} />
        </View>
      </Screen>
    );
  }

  if (!review) {
    return (
      <Screen header={<ScreenHeader title="Respond" showBack />} bottomTab={null}>
        <View style={{ padding: 24, gap: 12 }}>
          <Text style={{ color: theme.color.mist, fontFamily: theme.font.sans }}>Review not found.</Text>
          <Button onPress={() => router.back()}>Go back</Button>
        </View>
      </Screen>
    );
  }
```

- [ ] **Step 2.4 — update the import on line 2** to include `Alert` and `ActivityIndicator`. Before:
```tsx
import { View, Text, StyleSheet, TextInput, Pressable, ScrollView } from 'react-native';
```
After:
```tsx
import { View, Text, StyleSheet, TextInput, Pressable, ScrollView, Alert, ActivityIndicator } from 'react-native';
```
(`Button` is already imported from `@findemy/ui` on line 3; `View` already imported.)

**Checkpoint (Task 2):**
```bash
cd /home/mp2sslrl/code/code && export PATH="$HOME/.local/bin:$PATH" && pnpm --filter @findemy/admin typecheck
grep -n "ActivityIndicator\|catch (e: any)\|Review not found" apps/admin/app/reviews/\[id\]/respond.tsx
```
Expected: typecheck clean; loading `ActivityIndicator`, a `catch (e: any)` in `onSubmit`, and "Review not found." present.

---

### Task 3 — D3 + D7: workshops empty copy for all three tabs + `formatRupees`

**File:** `apps/admin/app/(tabs)/workshops.tsx`.

- [ ] **Step 3.1 — import the helper.** After the hooks import (line 5 `import { useStudioWorkshops } …`), add:
```tsx
import { formatRupees } from '@/lib/format';
```

- [ ] **Step 3.2 — use `formatRupees` for price (D7).** Before (line 38):
```tsx
  const price = workshop.price_paise === 0 ? 'Free' : `₹${Math.round(workshop.price_paise / 100).toLocaleString('en-IN')}`;
```
After:
```tsx
  const price = workshop.price_paise === 0 ? 'Free' : formatRupees(workshop.price_paise);
```

- [ ] **Step 3.3 — handle all three empty states (D3).** Before (lines 137–139):
```tsx
          <Text style={{ fontFamily: theme.font.sans, fontSize: 14, color: theme.color.mist, marginTop: 24, textAlign: 'center' }}>
            {tab === 'upcoming' ? 'No upcoming workshops. Tap + New to create one.' : 'No past workshops.'}
          </Text>
```
After:
```tsx
          <Text style={{ fontFamily: theme.font.sans, fontSize: 14, color: theme.color.mist, marginTop: 24, textAlign: 'center' }}>
            {tab === 'upcoming'
              ? 'No upcoming workshops. Tap + New to create one.'
              : tab === 'live'
              ? 'Nothing live right now. Sessions appear here when they start.'
              : 'No past workshops.'}
          </Text>
```

**Checkpoint (Task 3):**
```bash
cd /home/mp2sslrl/code/code && export PATH="$HOME/.local/bin:$PATH" && pnpm --filter @findemy/admin typecheck
grep -n "Nothing live right now\|formatRupees" apps/admin/app/\(tabs\)/workshops.tsx
```
Expected: typecheck clean; the live-empty copy and `formatRupees` both present; no remaining `Math.round(workshop.price_paise / 100)`.

---

### Task 4 — D4 + D7: honest payout (scheduled vs estimated) + `formatRupees`

**File:** `apps/admin/app/earnings.tsx`.

> D4 rationale (verified): `EarningsData` exposes **no** lifetime/unpaid balance — only period `total_paise` and the real `payouts[]` rows. So we cannot base the headline on a stable balance. Instead: (a) when a real payout row exists, show **it** (real amount + status + date, keep the 📅 "scheduled" affordance); (b) when none exists, show a period-scoped **estimate**, explicitly labeled and visually downgraded so it's never mistaken for a booked payout. The fabricated `total * 0.85` stays as the estimate value but is now honestly framed.

- [ ] **Step 4.1 — route `fmt` through the shared helper (D7).** Before (lines 12–14):
```tsx
function fmt(paise: number) {
  return Math.round(paise / 100).toLocaleString('en-IN');
}
```
After (keep the bare-number contract callers rely on — they prepend `₹` themselves — by stripping the helper's `₹`):
```tsx
import { formatRupees } from '@/lib/format';

function fmt(paise: number) {
  // Callers render their own "₹" glyph; strip the helper's leading sign/symbol
  // but preserve a negative "−" if present.
  const s = formatRupees(paise);
  return s.replace('₹', '');
}
```
> `fmtBig` (lines 16–21) is the compact hero format (₹1.2L / ₹3.4k) — **leave it unchanged.**

- [ ] **Step 4.2 — rewrite the payout card (D4).** Before (lines 100–123):
```tsx
        {(() => {
          const nextPayout = data?.payouts?.[0];
          const bank = nextPayout?.bank_last4 ? `··${nextPayout.bank_last4}` : 'Add bank in settings';
          return (
            <Pressable
              style={[styles.payoutCard, { backgroundColor: theme.color.marigold, marginHorizontal: 24, marginBottom: 18 }]}
              onPress={() => router.push('/(tabs)/settings' as never)}
            >
              <Text style={{ fontSize: 18 }}>📅</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: theme.font.sans, fontSize: 10, letterSpacing: 1.4, fontWeight: '700', marginBottom: 2, color: theme.color.ink }}>
                  NEXT PAYOUT
                </Text>
                <Text style={{ fontFamily: theme.font.serif, fontSize: 22, color: theme.color.ink }}>
                  ₹{fmt(nextPayout?.amount_paise ?? Math.round(total * 0.85))}
                </Text>
                <Text style={{ fontFamily: theme.font.sans, fontSize: 11, color: theme.color.inkSoft, marginTop: 2 }}>
                  {nextPayout?.paid_at ? new Date(nextPayout.paid_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : 'Estimated · after platform fee'} · {bank}
                </Text>
              </View>
              <Text style={{ fontSize: 18, color: theme.color.ink }}>›</Text>
            </Pressable>
          );
        })()}
```
After (scheduled payout = real row, marigold + 📅; estimate = period-scoped, muted paper, 〜 glyph, label ties it to the period):
```tsx
        {(() => {
          const nextPayout = data?.payouts?.[0];
          const bank = nextPayout?.bank_last4 ? `··${nextPayout.bank_last4}` : 'Add bank in settings';
          const isScheduled = !!nextPayout;
          // No lifetime/unpaid balance in EarningsData — estimate is period-scoped.
          const estimatePaise = Math.round(total * 0.85);
          const amountPaise = isScheduled ? nextPayout!.amount_paise : estimatePaise;
          return (
            <Pressable
              style={[
                styles.payoutCard,
                {
                  backgroundColor: isScheduled ? theme.color.marigold : theme.color.paperWarm,
                  borderWidth: isScheduled ? 0 : 1,
                  borderColor: theme.color.hairline,
                  borderStyle: isScheduled ? 'solid' : 'dashed',
                  marginHorizontal: 24,
                  marginBottom: 18,
                },
              ]}
              onPress={() => router.push('/(tabs)/settings' as never)}
            >
              <Text style={{ fontSize: 18 }}>{isScheduled ? '📅' : '〜'}</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: theme.font.sans, fontSize: 10, letterSpacing: 1.4, fontWeight: '700', marginBottom: 2, color: isScheduled ? theme.color.ink : theme.color.mist }}>
                  {isScheduled ? 'NEXT PAYOUT' : `ESTIMATED · ${periodLabel}`}
                </Text>
                <Text style={{ fontFamily: theme.font.serif, fontSize: 22, color: isScheduled ? theme.color.ink : theme.color.inkSoft }}>
                  ₹{fmt(amountPaise)}
                </Text>
                <Text style={{ fontFamily: theme.font.sans, fontSize: 11, color: isScheduled ? theme.color.inkSoft : theme.color.mist, marginTop: 2 }}>
                  {isScheduled
                    ? `${nextPayout!.paid_at ? new Date(nextPayout!.paid_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : nextPayout!.status} · ${bank}`
                    : `Estimate after platform fee · not yet scheduled · ${bank}`}
                </Text>
              </View>
              <Text style={{ fontSize: 18, color: theme.color.ink }}>›</Text>
            </Pressable>
          );
        })()}
```
> `periodLabel` is already in scope (line 45). `nextPayout!.status` (a real `Payout` status string) is shown when a scheduled row has no `paid_at`, instead of a misleading "Estimated" label.

- [ ] **Step 4.3 — follow-on flag.** Add a one-line comment above the payout card block (just before the `{(() => {` on line 100):
```tsx
        {/* TODO(backend): EarningsData has no unpaid/lifetime balance; the estimate
            is period-scoped. A real "available_balance_paise" field would let this
            headline be accurate regardless of the selected period. */}
```

**Checkpoint (Task 4):**
```bash
cd /home/mp2sslrl/code/code && export PATH="$HOME/.local/bin:$PATH" && pnpm --filter @findemy/admin typecheck
grep -n "isScheduled\|ESTIMATED ·\|not yet scheduled\|TODO(backend)" apps/admin/app/earnings.tsx
```
Expected: typecheck clean; the scheduled/estimate split, the period-scoped estimate label, and the follow-on TODO all present.

---

### Task 5 — D5: badge from independent summary query (defensive)

**File:** `apps/admin/app/reviews.tsx`.

> Verified the backend returns `summary` on every `getReviews` response regardless of filter, so this is **defensive** (robustness against the `summary?:` optionality and future backend changes), not a live bug. Fetch the summary independently via the existing `useStudioReviewsSummary()` hook and prefer it for the badge while still using the list's summary for the rating-distribution card (which only matters on the "all"-ish views and is unaffected).

- [ ] **Step 5.1 — import the summary hook.** Before (line 9):
```tsx
import { useStudioReviews } from '@/hooks/useStudioQueries';
```
After:
```tsx
import { useStudioReviews, useStudioReviewsSummary } from '@/hooks/useStudioQueries';
```

- [ ] **Step 5.2 — call it and derive the badge count from it.** Before (lines 25–28):
```tsx
  const { data, isLoading, isError, refetch } = useStudioReviews(filter);

  const summary = data?.summary;
  const items = data?.items ?? [];
```
After:
```tsx
  const { data, isLoading, isError, refetch } = useStudioReviews(filter);
  const { data: summaryData } = useStudioReviewsSummary();

  // Summary card uses whichever summary is available; the badge count is driven
  // by the independent query so it never depends on the filtered list's load
  // state or the optional embedded `summary`.
  const summary = summaryData ?? data?.summary;
  const needsReply = summaryData?.needs_reply ?? data?.summary?.needs_reply ?? 0;
  const items = data?.items ?? [];
```

- [ ] **Step 5.3 — use `needsReply` in the tab (line 32).** Before:
```tsx
    { key: 'needs_reply', label: `Needs reply${summary?.needs_reply ? ` · ${summary.needs_reply}` : ''}`, alert: !!summary?.needs_reply },
```
After:
```tsx
    { key: 'needs_reply', label: `Needs reply${needsReply ? ` · ${needsReply}` : ''}`, alert: !!needsReply },
```

**Checkpoint (Task 5):**
```bash
cd /home/mp2sslrl/code/code && export PATH="$HOME/.local/bin:$PATH" && pnpm --filter @findemy/admin typecheck
grep -n "useStudioReviewsSummary\|needsReply" apps/admin/app/reviews.tsx
```
Expected: typecheck clean; the hook imported + called, `needsReply` driving the badge.

---

### Task 6 — D6 + D12: batch numeric validation + coach-id guard

**File:** `apps/admin/app/batches/new.tsx`.

> Backend bounds (verified): `capacity` ≥ 1, `trial_fee_paise` ≥ 0, `monthly_fee_paise` ≥ 0 (fees may be 0). The fee inputs are in **rupees**, multiplied by 100 on submit, so a non-negative integer string is the right client constraint.

- [ ] **Step 6.1 — tighten the zod schema (D6).** Before (lines 13–18):
```tsx
const schema = z.object({
  title: z.string().min(1, 'Title is required'),
  capacity: z.string().min(1),
  trial_fee: z.string().min(1),
  monthly_fee: z.string().min(1),
});
```
After:
```tsx
const schema = z.object({
  title: z.string().min(1, 'Title is required'),
  capacity: z
    .string()
    .regex(/^\d+$/, 'Enter a whole number')
    .refine((v) => Number(v) >= 1, 'Capacity must be at least 1'),
  trial_fee: z.string().regex(/^\d+$/, 'Enter a whole rupee amount'),
  monthly_fee: z.string().regex(/^\d+$/, 'Enter a whole rupee amount'),
});
```

- [ ] **Step 6.2 — surface the field errors on the inputs.** The three numeric `Controller`s (lines 116–122, 125–131, 135–141) don't pass `error`. Add `fieldState: { error }` and `error={error?.message}` to each. Capacity — before (lines 116–122):
```tsx
        <Controller
          control={control}
          name="capacity"
          render={({ field: { onChange, value } }) => (
            <Input placeholder="Capacity" keyboardType="number-pad" value={value} onChangeText={onChange} />
          )}
        />
```
After:
```tsx
        <Controller
          control={control}
          name="capacity"
          render={({ field: { onChange, value }, fieldState: { error } }) => (
            <Input placeholder="Capacity" keyboardType="number-pad" value={value} onChangeText={onChange} error={error?.message} />
          )}
        />
```
Trial fee — before (lines 125–131):
```tsx
          <Controller
            control={control}
            name="trial_fee"
            render={({ field: { onChange, value } }) => (
              <Input placeholder="Trial fee (₹)" keyboardType="number-pad" value={value} onChangeText={onChange} />
            )}
          />
```
After:
```tsx
          <Controller
            control={control}
            name="trial_fee"
            render={({ field: { onChange, value }, fieldState: { error } }) => (
              <Input placeholder="Trial fee (₹)" keyboardType="number-pad" value={value} onChangeText={onChange} error={error?.message} />
            )}
          />
```
Monthly fee — before (lines 135–141):
```tsx
          <Controller
            control={control}
            name="monthly_fee"
            render={({ field: { onChange, value } }) => (
              <Input placeholder="Monthly fee (₹)" keyboardType="number-pad" value={value} onChangeText={onChange} />
            )}
          />
```
After:
```tsx
          <Controller
            control={control}
            name="monthly_fee"
            render={({ field: { onChange, value }, fieldState: { error } }) => (
              <Input placeholder="Monthly fee (₹)" keyboardType="number-pad" value={value} onChangeText={onChange} error={error?.message} />
            )}
          />
```

- [ ] **Step 6.3 — guard the created coach id (D12).** Before (lines 74–81):
```tsx
    try {
      const res = await createCoach.mutateAsync({ name: coachName.trim(), specialty: coachSpecialty.trim() });
      await refetchCoaches();
      setCoachId((res as any).coach?.id ?? '');
      setCoachName('');
      setCoachSpecialty('');
      setShowCoachModal(false);
      showToast('Coach added', 'success');
```
After (only overwrite the selection when a real id came back; warn otherwise instead of silently clearing):
```tsx
    try {
      const res = await createCoach.mutateAsync({ name: coachName.trim(), specialty: coachSpecialty.trim() });
      await refetchCoaches();
      const newCoachId = (res as any)?.coach?.id;
      if (typeof newCoachId === 'string' && newCoachId) {
        setCoachId(newCoachId);
      } else {
        // Don't silently clear the current selection if the response shape changed.
        console.warn('[batches/new] createCoach returned no coach.id; leaving selection unchanged', res);
      }
      setCoachName('');
      setCoachSpecialty('');
      setShowCoachModal(false);
      showToast('Coach added', 'success');
```

**Checkpoint (Task 6):**
```bash
cd /home/mp2sslrl/code/code && export PATH="$HOME/.local/bin:$PATH" && pnpm --filter @findemy/admin typecheck
grep -n "regex(/\^\\\\d+\$/\|Capacity must be at least 1\|leaving selection unchanged" apps/admin/app/batches/new.tsx
```
Expected: typecheck clean; the three numeric regexes, the capacity refine message, and the coach-id guard all present.

---

### Task 7 — D8 + D9 + D7: workshop edit — validation, loading/not-found, whole-rupee round-trip

**File:** `apps/admin/app/workshops/[id].tsx`.

- [ ] **Step 7.1 — validate date/time + add a refine for a real datetime (D8).** Before (lines 13–22):
```tsx
const schema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().min(1, 'Description is required'),
  start_date: z.string().min(1),
  start_time: z.string().min(1),
  duration_min: z.string().min(1),
  capacity: z.string().min(1),
  price: z.string().min(1),
  location: z.string().optional(),
});
```
After:
```tsx
const schema = z
  .object({
    title: z.string().min(1, 'Title is required'),
    description: z.string().min(1, 'Description is required'),
    start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD'),
    start_time: z.string().regex(/^\d{2}:\d{2}$/, 'Use HH:MM (24h)'),
    duration_min: z.string().regex(/^\d+$/, 'Enter a whole number'),
    capacity: z.string().regex(/^\d+$/, 'Enter a whole number'),
    price: z.string().regex(/^\d+$/, 'Enter a whole rupee amount'),
    location: z.string().optional(),
  })
  .refine((d) => !isNaN(new Date(`${d.start_date}T${d.start_time}`).getTime()), {
    message: 'That date/time is not valid',
    path: ['start_date'],
  });
```

- [ ] **Step 7.2 — whole-rupee round-trip in the form reset (D7).** Before (line 68):
```tsx
      price: String(workshop.price_paise / 100),
```
After:
```tsx
      price: String(Math.round(workshop.price_paise / 100)),
```

- [ ] **Step 7.3 — whole-rupee on submit (D7) — already integer-safe but standardize.** Before (line 84):
```tsx
        price_paise: Math.round(Number(data.price) * 100),
```
After (with the `^\d+$` validation, `Number(data.price)` is a clean integer rupee; keep the explicit round for safety):
```tsx
        price_paise: Math.round(Number(data.price)) * 100,
```

- [ ] **Step 7.4 — loading / not-found states (D9).** `useStudioWorkshops` already exposes `isLoading`/`isError`. Update the destructure on line 37. Before:
```tsx
  const { data } = useStudioWorkshops();
```
After:
```tsx
  const { data, isLoading, isError, refetch } = useStudioWorkshops();
```
Then add guard branches **before** the main `return` (insert just before line 110 `return (`):
```tsx
  if (isLoading) {
    return (
      <Screen header={<ScreenHeader title="Edit Workshop" showBack />} bottomTab={null}>
        <View style={{ padding: 24, alignItems: 'center' }}>
          <ActivityIndicator color={theme.color.persimmon} />
        </View>
      </Screen>
    );
  }

  if (isError) {
    return (
      <Screen header={<ScreenHeader title="Edit Workshop" showBack />} bottomTab={null}>
        <ErrorState onRetry={refetch} />
      </Screen>
    );
  }

  if (!workshop) {
    return (
      <Screen header={<ScreenHeader title="Edit Workshop" showBack />} bottomTab={null}>
        <View style={{ padding: 24, gap: 12 }}>
          <Text style={{ color: theme.color.mist, fontFamily: theme.font.sans }}>Workshop not found.</Text>
          <Button onPress={() => router.back()}>Go back</Button>
        </View>
      </Screen>
    );
  }
```

- [ ] **Step 7.5 — imports.** Add `ActivityIndicator` to the `react-native` import (line 2) and `ErrorState`. Before (line 2):
```tsx
import { View, Text, ScrollView, Alert } from 'react-native';
```
After:
```tsx
import { View, Text, ScrollView, Alert, ActivityIndicator } from 'react-native';
```
And add after the existing `ScreenHeader` import (line 9):
```tsx
import { ErrorState } from '@/components/ErrorState';
```
(`Button` is already imported from `@findemy/ui` line 4; `Screen`/`ScreenHeader` already imported.)

> Note: the `useEffect` that `reset`s the form (lines 57–71) stays — once `workshop` is guaranteed non-null by the new guards, it still runs on first populate. Keeping the guards before the form render means the `useEffect` is declared above them (hooks order preserved — guards come after all hook calls). **Verify** when editing that all `useState`/`useForm`/`useEffect` calls remain above the new early returns.

**Checkpoint (Task 7):**
```bash
cd /home/mp2sslrl/code/code && export PATH="$HOME/.local/bin:$PATH" && pnpm --filter @findemy/admin typecheck
grep -n "Use YYYY-MM-DD\|is not valid\|Workshop not found\|Math.round(workshop.price_paise" apps/admin/app/workshops/\[id\].tsx
```
Expected: typecheck clean; date regex message, datetime refine message, not-found state, and whole-rupee reset all present.

---

### Task 8 — D8: workshop create — date/time validation

**File:** `apps/admin/app/workshops/new.tsx`.

- [ ] **Step 8.1 — tighten the schema (mirror Task 7.1).** Before (lines 13–22):
```tsx
const schema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().min(1, 'Description is required'),
  start_date: z.string().min(1, 'Date is required'),
  start_time: z.string().min(1, 'Time is required'),
  duration_min: z.string().min(1),
  capacity: z.string().min(1),
  price: z.string().min(1),
  location: z.string().optional(),
});
```
After:
```tsx
const schema = z
  .object({
    title: z.string().min(1, 'Title is required'),
    description: z.string().min(1, 'Description is required'),
    start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD'),
    start_time: z.string().regex(/^\d{2}:\d{2}$/, 'Use HH:MM (24h)'),
    duration_min: z.string().regex(/^\d+$/, 'Enter a whole number'),
    capacity: z.string().regex(/^\d+$/, 'Enter a whole number'),
    price: z.string().regex(/^\d+$/, 'Enter a whole rupee amount'),
    location: z.string().optional(),
  })
  .refine((d) => !isNaN(new Date(`${d.start_date}T${d.start_time}`).getTime()), {
    message: 'That date/time is not valid',
    path: ['start_date'],
  });
```

- [ ] **Step 8.2 — whole-rupee on submit (consistency with edit).** Before (line 65):
```tsx
          price_paise: Math.round(Number(data.price) * 100),
```
After:
```tsx
          price_paise: Math.round(Number(data.price)) * 100,
```
> The `start_at` build (line 56) is now safe because the refine guarantees a valid datetime before submit; the surrounding try/catch (lines 55–71) stays as a backstop.

**Checkpoint (Task 8):**
```bash
cd /home/mp2sslrl/code/code && export PATH="$HOME/.local/bin:$PATH" && pnpm --filter @findemy/admin typecheck
grep -n "Use YYYY-MM-DD\|is not valid" apps/admin/app/workshops/new.tsx
```
Expected: typecheck clean; date regex message + datetime refine message present.

---

### Task 9 — D7 + D10 + D11: trial detail — `formatRupees`, error state, phone guards

**File:** `apps/admin/app/trial/[id].tsx`.

- [ ] **Step 9.1 — import the helper + `ErrorState`.** After the hooks import (line 7 `import { useStudioTrial } …`), add:
```tsx
import { formatRupees } from '@/lib/format';
import { ErrorState } from '@/components/ErrorState';
```

- [ ] **Step 9.2 — branch on `error` (D10).** Before (lines 15–21):
```tsx
  if (isLoading || !data) {
    return (
      <Screen header={<ScreenHeader title="Trial detail" showBack />} bottomTab={null}>
        <Text style={{ color: theme.color.mist, fontFamily: theme.font.sans, padding: 24 }}>Loading…</Text>
      </Screen>
    );
  }
```
After:
```tsx
  if (error) {
    return (
      <Screen header={<ScreenHeader title="Trial detail" showBack />} bottomTab={null}>
        <ErrorState onRetry={refetch} />
      </Screen>
    );
  }

  if (isLoading || !data) {
    return (
      <Screen header={<ScreenHeader title="Trial detail" showBack />} bottomTab={null}>
        <Text style={{ color: theme.color.mist, fontFamily: theme.font.sans, padding: 24 }}>Loading…</Text>
      </Screen>
    );
  }
```

- [ ] **Step 9.3 — expose `refetch` from the hook.** Before (line 13):
```tsx
  const { data, isLoading, error } = useStudioTrial(id);
```
After:
```tsx
  const { data, isLoading, error, refetch } = useStudioTrial(id);
```

- [ ] **Step 9.4 — `formatRupees` for the fee (D7).** Before (line 37):
```tsx
      value: [feePaise != null ? `₹${Math.round(feePaise / 100)}` : null, trial.payment_method]
```
After:
```tsx
      value: [feePaise != null ? formatRupees(feePaise) : null, trial.payment_method]
```

- [ ] **Step 9.5 — phone-guard the Call/WhatsApp buttons (D11).** Before (lines 64–69):
```tsx
            <Button size="sm" onPress={() => student.phone && Linking.openURL(`tel:${student.phone}`)}>
              Call
            </Button>
            <Button size="sm" variant="soft" onPress={() => student.phone && Linking.openURL(`https://wa.me/${student.phone.replace(/\D/g, '')}`)}>
              WhatsApp
            </Button>
```
After:
```tsx
            <Button size="sm" disabled={!student.phone} onPress={() => student.phone && Linking.openURL(`tel:${student.phone}`)}>
              Call
            </Button>
            <Button size="sm" variant="soft" disabled={!student.phone} onPress={() => student.phone && Linking.openURL(`https://wa.me/${student.phone.replace(/\D/g, '')}`)}>
              WhatsApp
            </Button>
```
> Confirm when editing that `@findemy/ui` `Button` accepts a `disabled` prop (it is used with `disabled` in `respond.tsx` line 110 and `batches/new.tsx` patterns, so it does).

**Checkpoint (Task 9):**
```bash
cd /home/mp2sslrl/code/code && export PATH="$HOME/.local/bin:$PATH" && pnpm --filter @findemy/admin typecheck
grep -n "if (error)\|disabled={!student.phone}\|formatRupees" apps/admin/app/trial/\[id\].tsx
```
Expected: typecheck clean; the error branch, both `disabled={!student.phone}` guards, and `formatRupees` all present.

---

## Final verification (all tasks)

```bash
cd /home/mp2sslrl/code/code && export PATH="$HOME/.local/bin:$PATH"

# 1. Whole app typechecks
pnpm --filter @findemy/admin typecheck
#    Expected: no errors

# 2. No paise-dropping Math.round at the migrated money sites
grep -rn "Math.round(\(workshop.price_paise\|feePaise\) / 100)" apps/admin/app
#    Expected: no matches (workshops list + trial detail now use formatRupees)

# 3. Shared helper exists and is imported where expected
grep -rln "from '@/lib/format'" apps/admin/app
#    Expected: workshops.tsx, earnings.tsx, trial/[id].tsx (and any others migrated)

# 4. Loading/error/empty states landed
grep -n "ActivityIndicator" apps/admin/app/reviews/\[id\]/respond.tsx apps/admin/app/workshops/\[id\].tsx
grep -n "Nothing live right now" apps/admin/app/\(tabs\)/workshops.tsx
grep -n "ESTIMATED ·" apps/admin/app/earnings.tsx
#    Expected: each present
```
