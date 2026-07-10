# Group F — Functional Flow Gaps — Sub-Plan
**Parent:** [00-MASTER-PLAN.md](./00-MASTER-PLAN.md)
**Goal:** Close real-money/session/refresh gaps and centralize currency+date formatting.
**Depends on:** Group A. **Provides:** apps/student/src/lib/format.ts (formatRupees/formatTrialDate/formatTrialDateShort) consumed by Groups D-adjacent and others.

---

## Context / verified line-number corrections

Every cited file was re-read before writing. Corrections vs. the audit:

- **F1 (paths corrected).** The four bare-`ScrollView` list screens are `apps/student/app/trials/index.tsx`, `apps/student/app/bookings.tsx`, `apps/student/app/saved.tsx`, `apps/student/app/enrollments.tsx` (the latter three are at `app/` root, **not** under `app/(tabs)/`).
- **F2 (downgraded — CONFIRMED).** In `apps/student/app/booking/pay.tsx` the Continue button **is** correctly gated: `const proceedDisabled = !order.data || method !== "razorpay";` (line **147**) and `<Button … disabled={proceedDisabled} … >` (line **380–381**). The real defect is purely visual: `trialFeePaise` falls back to `?? 15000` paise (line **141**) and the breakdown rows render mock `₹150 / ₹12 / −₹50` numbers (lines **254–280**, **383**) **while `order.isLoading`**. Scope for F2 is: guard the totals region with an `ActivityIndicator` while loading and an inline Retry on `order.error`; render the breakdown only once `order.data` exists. F2 does **not** touch the button.
- **F3.** `apps/student/app/(auth)/signup-otp.tsx` empty `catch { // ignore }` on resend is at lines **78–80** (inside `handleResend`, lines **74–81**).
- **F4.** `apps/student/src/lib/api.ts` clears auth silently in two places: lines **17–18** (`if (!refreshToken) { useAuth.getState().clear(); … }`) and the `catch { useAuth.getState().clear(); … }` at lines **33–36**. The session-expired toast belongs on the **catch** path (refresh actually failed); the no-refresh-token path is a cold-start/logged-out state and stays silent.
- **F5.** `apps/student/src/hooks/usePushNotifications.ts` `.catch(() => {})` is at line **38** (the `api.push.register(...).catch(() => {})`). The audit's "~36–39" covers the `registerForPushNotificationsAsync().then(...)` block (lines **34–40**). The *permission* denial actually happens inside `registerForPushNotificationsAsync` (returns `null` at lines **68 / 76 / 96**); the hook only sees `token === null`. So the `pushPermissionDenied` flag is set in the hook when `token` comes back `null`, and the `.catch` logs the register-call failure.
- **F6.** `apps/student/app/booking/pay.tsx` hardcodes `const platformFee = 12;` (line **143**) and `const festiveCredit = trialFee >= 100 ? 50 : 0;` (line **144**), `const total = trialFee + platformFee - festiveCredit;` (line **145**). Backend order builder is `createOrder` in `apps/api/src/modules/payments/service.ts` (lines **28–79**), returning `{ razorpay_order_id, razorpay_key, amount_paise, currency }` from **two** spots (idempotent-hit return lines **43–48**, fresh return lines **73–78**). Client typing is in `packages/api-client/src/index.ts` `payments.createOrder` (lines **279–285**). There is **no** existing `breakdown`/`platform_fee` concept anywhere in the API (grep returned nothing) — we are introducing it.
- **F7 / F8 (Toast is context-only).** `apps/student/src/components/Toast.tsx` exposes `useToast()` via React context only — there is **no** module-level enqueue. F4/F5 run in non-component modules, so Group F introduces a tiny zustand "toast bus" (`apps/student/src/stores/toast.ts`) that `ToastProvider` subscribes to. This is the least-invasive approach (no provider re-architecture, components keep using `useToast()`).
- **Vitest is NOT installed in `apps/student`.** `apps/student/package.json` has `"test": "vitest"` (line 14) but **no** `vitest` devDependency and **no** `vitest.config.ts`. `apps/api` already has `vitest ^2.1.0` + a config. Task 1 therefore adds `vitest` (pin `^2.1.0` to match the workspace) + a minimal `vitest.config.ts` to `apps/student`. No jsdom/RTL needed — the helpers are pure functions.
- **TrialCard.tsx (F8) uses a different format string** than the audit implied: `format(date, "EEEE, MMM d · h:mm a")` (line **45**) — note it includes the time. `formatTrialDate` is date-only, so for TrialCard we keep the time suffix by composing `` `${formatTrialDate(iso)} · ${format(date,"h:mm a")}` `` — see Task 3.

---

## Files touched

| File | Issue(s) | Change |
| --- | --- | --- |
| `apps/student/package.json` | F7/F8 | Add `vitest` devDep |
| `apps/student/vitest.config.ts` | F7/F8 | **New** minimal config |
| `apps/student/src/lib/format.ts` | F7, F8 | **New** shared `formatRupees` / `formatTrialDate` / `formatTrialDateShort` |
| `apps/student/src/lib/format.test.ts` | F7, F8 | **New** vitest unit tests |
| `apps/student/src/stores/toast.ts` | F4, F5 | **New** zustand toast bus |
| `apps/student/src/components/Toast.tsx` | F4, F5 | Subscribe `ToastProvider` to the bus |
| `apps/student/app/trials/index.tsx` | F1, F7, F8 | RefreshControl; drop local `formatRupeesShort`; use `formatTrialDateShort` |
| `apps/student/app/bookings.tsx` | F1, F7, F8 | RefreshControl; `formatRupees`; `formatTrialDateShort` |
| `apps/student/app/saved.tsx` | F1 | RefreshControl |
| `apps/student/app/enrollments.tsx` | F1, F7 | RefreshControl; `formatRupees` |
| `apps/student/app/booking/pay.tsx` | F2, F6, F7 | Loading/error guard on totals; render server `breakdown`; `formatRupees` |
| `apps/student/app/(auth)/signup-otp.tsx` | F3 | Toast on resend success/failure |
| `apps/student/src/lib/api.ts` | F4 | Enqueue session-expired toast before `clear()` |
| `apps/student/src/hooks/usePushNotifications.ts` | F5 | Log + set `pushPermissionDenied` |
| `apps/student/src/stores/auth.ts` | F5 | Add `pushPermissionDenied` flag + setter |
| `apps/student/app/(tabs)/profile.tsx` | F5 | One-time soft banner when denied |
| `apps/student/app/post-trial/index.tsx` | F9 | Star Pressable `paddingHorizontal: 6 → 12` |
| `apps/student/app/(tabs)/index.tsx` | F9 | `accessibilityLabel` on unlabeled Pressables |
| `apps/student/app/profile/edit.tsx` | F10 | Wire `expo-image-picker` to "Change Photo" |
| `apps/api/src/modules/payments/service.ts` | F6 | Compute + return `breakdown` |
| `packages/types/src/index.ts` | F6 | Add `PaymentBreakdown` / `CreateOrderResponse` types |
| `packages/api-client/src/index.ts` | F6 | Add `breakdown` to `createOrder` response typing |

Sites NOT touched but noted as follow-on (F6): `payments.createWorkshopOrder` / `createEnrollmentOrder` / `createEventOrder` and their backend builders return no `breakdown` yet. Out of scope for Group F; only the trial `/payments/order` path is fully specified.

---

## Shared artifact contract

Other groups depend on these **exact** signatures from `apps/student/src/lib/format.ts`:

```ts
// Rupees from paise. Default: no decimals, en-IN grouping (e.g. 1,50,000 → "₹1,500").
// withDecimals: true → always two decimals ("₹1,500.00").
export function formatRupees(paise: number, opts?: { withDecimals?: boolean }): string;

// date-fns format "EEEE, d MMMM yyyy"  → "Saturday, 19 April 2026"
export function formatTrialDate(iso: string): string;

// date-fns format "EEE, d MMM"          → "Sat, 19 Apr"
export function formatTrialDateShort(iso: string): string;
```

Rules: `formatRupees` rounds to the nearest rupee when `withDecimals` is falsy; negative paise render with a leading `−` before the `₹` (e.g. `−₹50`). Callers append unit suffixes (`/mo`, `· prize`) themselves.

---

## Tasks

> Order: **F7 → F8 first** (they create the shared helper everything else uses), then the toast bus, then F1–F6, F9, F10.

---

### Task 1 — F7/F8: create `format.ts`, the shared currency + date helper, with vitest

**Files:** `apps/student/package.json`, `apps/student/vitest.config.ts` (new), `apps/student/src/lib/format.ts` (new), `apps/student/src/lib/format.test.ts` (new).

**Step 1.1 — add vitest to `apps/student/package.json`.** It currently has `"test": "vitest"` (line 14) but no vitest dep. Add to `devDependencies` (pin to the workspace version `^2.1.0` used by `apps/api`):

```json
    "vitest": "^2.1.0"
```

Then install: `pnpm install` (run from repo root).

**Step 1.2 — new `apps/student/vitest.config.ts`** (pure functions, node environment, no RN transform needed since `format.ts` only imports `date-fns`):

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
```

**Step 1.3 — new `apps/student/src/lib/format.ts`:**

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

/** "Saturday, 19 April 2026" */
export function formatTrialDate(iso: string): string {
  return format(new Date(iso), "EEEE, d MMMM yyyy");
}

/** "Sat, 19 Apr" */
export function formatTrialDateShort(iso: string): string {
  return format(new Date(iso), "EEE, d MMM");
}
```

**Step 1.4 — new `apps/student/src/lib/format.test.ts`:**

```ts
import { describe, it, expect } from "vitest";
import { formatRupees, formatTrialDate, formatTrialDateShort } from "./format";

describe("formatRupees", () => {
  it("rounds to whole rupees with en-IN grouping by default", () => {
    expect(formatRupees(150000)).toBe("₹1,500");
    expect(formatRupees(15000)).toBe("₹150");
    expect(formatRupees(12300)).toBe("₹123");
    expect(formatRupees(0)).toBe("₹0");
  });

  it("groups lakhs in the Indian system", () => {
    expect(formatRupees(10000000)).toBe("₹1,00,000");
  });

  it("keeps two decimals when withDecimals is set", () => {
    expect(formatRupees(150050, { withDecimals: true })).toBe("₹1,500.50");
    expect(formatRupees(15000, { withDecimals: true })).toBe("₹150.00");
  });

  it("renders negative amounts with a leading minus sign", () => {
    expect(formatRupees(-5000)).toBe("−₹50");
  });
});

describe("formatTrialDate / formatTrialDateShort", () => {
  // Local-time noon avoids any TZ date-rollover ambiguity.
  const iso = "2026-04-19T12:00:00";

  it("formats the long trial date", () => {
    expect(formatTrialDate(iso)).toBe("Sunday, 19 April 2026");
  });

  it("formats the short trial date", () => {
    expect(formatTrialDateShort(iso)).toBe("Sun, 19 Apr");
  });
});
```

> Note: 2026-04-19 is a **Sunday** — verified, not a typo. (The mock string "Sat, 19 Apr 2026" in `pay.tsx` is wrong; it gets deleted in Task 6.)

**Checkpoint (Task 1):**
```bash
cd apps/student && npx vitest run src/lib/format.test.ts
```
Expected: `Test Files  1 passed`, `Tests  6 passed`. Then:
```bash
cd apps/student && npx tsc --noEmit
```
Expected: no errors.

---

### Task 2 — F4/F5 prerequisite: toast bus + `ToastProvider` subscription

Non-component modules (`api.ts`, push hook) cannot call the context `useToast()`. Add a zustand store that holds the latest enqueue request; `ToastProvider` watches it.

**Files:** `apps/student/src/stores/toast.ts` (new), `apps/student/src/components/Toast.tsx`.

**Step 2.1 — new `apps/student/src/stores/toast.ts`:**

```ts
import { create } from "zustand";

export type ToastVariant = "success" | "error";

type ToastRequest = { message: string; variant: ToastVariant; nonce: number } | null;

type ToastBus = {
  request: ToastRequest;
  enqueueToast: (message: string, variant?: ToastVariant) => void;
};

export const useToastBus = create<ToastBus>((set) => ({
  request: null,
  enqueueToast: (message, variant = "success") =>
    set({ request: { message, variant, nonce: Date.now() } }),
}));

/** Imperative entry point for non-component modules (api.ts, hooks). */
export function enqueueToast(message: string, variant: ToastVariant = "success") {
  useToastBus.getState().enqueueToast(message, variant);
}
```

**Step 2.2 — `apps/student/src/components/Toast.tsx`:** subscribe the provider. Add the import at the top:

Before (line 3):
```ts
import { useTheme } from "@findemy/ui";
```
After:
```ts
import { useTheme } from "@findemy/ui";
import { useToastBus } from "@/stores/toast";
```

Then inside `ToastProvider`, after the existing `show` callback (it ends at line 33) and before the existing cleanup `useEffect` (line 35), add a subscription effect that forwards bus requests into `show`:

Before:
```ts
  }, [opacity]);

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);
```
After:
```ts
  }, [opacity]);

  // Bridge: non-component modules enqueue via the zustand bus; surface them here.
  const busRequest = useToastBus((s) => s.request);
  useEffect(() => {
    if (busRequest) show(busRequest.message, busRequest.variant);
  }, [busRequest, show]);

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);
```

(`busRequest.nonce` makes every enqueue a new object so repeated identical messages still re-fire the effect.)

**Checkpoint (Task 2):**
```bash
cd apps/student && npx tsc --noEmit
```
Expected: no errors. And confirm the bus is wired:
```bash
grep -n "useToastBus" apps/student/src/components/Toast.tsx
```
Expected: import line + the `useToastBus((s) => s.request)` selector line.

---

### Task 3 — F8: replace trial-date renderers with `formatTrialDate*`

**Files:** `apps/student/src/components/TrialCard.tsx`, `apps/student/app/trials/index.tsx`, `apps/student/app/enrollment/confirmation.tsx`. (Also handled in Task 4/6 for `bookings.tsx` / `pay.tsx`.)

> Scope note: only **trial-style date-only** renderers move to the helper. Renderers that include a time component and a `·` time suffix are migrated by **composing** `formatTrialDate*` + the time piece, so the time is preserved. Pure `h:mm a` renderers (`slot.tsx`, `TrialBookingSheet.tsx`, `program/[id]/trial.tsx` slot times) are **left alone** — they are not trial-date renderers.

**Step 3.1 — `TrialCard.tsx`.** It already imports `format` from date-fns (line 4) and computes `const date = new Date(trial.scheduled_at);` (line 24). Add the helper import next to it:

Before (line 4):
```ts
import { format } from "date-fns";
```
After:
```ts
import { format } from "date-fns";
import { formatTrialDate } from "@/lib/format";
```

Before (line 45):
```tsx
          {format(date, "EEEE, MMM d · h:mm a")}
```
After (date via helper, keep the time suffix):
```tsx
          {`${formatTrialDate(trial.scheduled_at)} · ${format(date, "h:mm a")}`}
```

**Step 3.2 — `apps/student/app/trials/index.tsx`.** The inline `TrialCard` renders the date via `toLocaleDateString` (lines 92–100). Add the helper import (combine with the F7 import added in Task 4 — same import line):

Add to imports:
```ts
import { formatTrialDateShort } from "@/lib/format";
```

Before (lines 92–100):
```tsx
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
After (date via helper + time appended to preserve the original output shape):
```tsx
        <Text style={{ fontFamily: theme.font.sans, fontSize: 14, color: theme.color.mist, marginTop: 4 }}>
          {`${formatTrialDateShort(trial.scheduled_at)}, ${new Date(trial.scheduled_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}`}
        </Text>
```

**Step 3.3 — `apps/student/app/enrollment/confirmation.tsx`** has a local date formatter at line 17 (`new Date(iso).toLocaleDateString("en-IN", {...})`). Read it, and if it produces a full weekday/day/month/year date, replace its body with `return formatTrialDate(iso);` and add the import; otherwise leave it (it may be a date-only "started" stamp where `formatTrialDate` is still appropriate). Add:
```ts
import { formatTrialDate } from "@/lib/format";
```

**Checkpoint (Task 3):**
```bash
grep -rn 'toLocaleDateString("en-IN"' apps/student/app/trials/index.tsx apps/student/app/enrollment/confirmation.tsx
```
Expected: trials/index.tsx line gone (replaced by `formatTrialDateShort`); confirmation.tsx either gone or intentionally retained per the read. Then:
```bash
cd apps/student && npx tsc --noEmit
```
Expected: no errors.

---

### Task 4 — F1 + F7/F8: RefreshControl + shared formatters on the four list screens

Each screen wraps a bare `<ScrollView>`. Add `RefreshControl` wired to the screen's query refetch, plus swap in the shared currency/date helpers where they render money/dates.

**Step 4.1 — `apps/student/app/trials/index.tsx`** (three queries: `upcoming`, `past`, `today`; ScrollView at line 152).

Imports — before (line 2):
```tsx
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
```
After:
```tsx
import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from "react-native";
```
Add (with the Task 3.2 import):
```tsx
import { formatRupees, formatTrialDateShort } from "@/lib/format";
```

Delete the local `formatRupeesShort` (lines 12–15) and update its caller (line 39):

Before (line 39):
```tsx
        {isFree ? "Free" : `Paid · ${formatRupeesShort(amount)}`}
```
After:
```tsx
        {isFree ? "Free" : `Paid · ${formatRupees(amount)}`}
```

Add a refreshing flag in `MyTrialsScreen` (after line 138, where `error` is derived):
```tsx
  const refreshing = upcoming.isRefetching || past.isRefetching || today.isRefetching;
  const onRefresh = () => { upcoming.refetch(); past.refetch(); today.refetch(); };
```

ScrollView — before (line 152):
```tsx
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}>
```
After:
```tsx
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.color.persimmon} />}
      >
```

**Step 4.2 — `apps/student/app/bookings.tsx`** (four queries: `upcomingTrials`, `pastTrials`, `workshopRegs`, `enrollments`; ScrollView at line 112).

Imports — before (line 2):
```tsx
import { View, Text, ScrollView, Pressable, StyleSheet } from "react-native";
```
After:
```tsx
import { View, Text, ScrollView, Pressable, StyleSheet, RefreshControl } from "react-native";
```
Add:
```tsx
import { formatRupees, formatTrialDateShort } from "@/lib/format";
```

In `BookingsScreen`, after `isLoading` (line 52) add:
```tsx
  const refreshing =
    upcomingTrials.isRefetching ||
    pastTrials.isRefetching ||
    workshopRegs.isRefetching ||
    enrollments.isRefetching;
  const onRefresh = () => {
    upcomingTrials.refetch();
    pastTrials.refetch();
    workshopRegs.refetch();
    enrollments.refetch();
  };
```

ScrollView — before (lines 112–115):
```tsx
        <ScrollView
          contentContainerStyle={[styles.body, { backgroundColor: theme.color.ivory }]}
          showsVerticalScrollIndicator={false}
        >
```
After:
```tsx
        <ScrollView
          contentContainerStyle={[styles.body, { backgroundColor: theme.color.ivory }]}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.color.persimmon} />}
        >
```

Currency (F7) in `BookingCard` — before (lines 183–195, 202–204):
```tsx
    if (data.trial_fee_paise) {
      amountStr = `₹${Math.round(data.trial_fee_paise / 100).toLocaleString("en-IN")}`;
    }
```
```tsx
    amountStr =
      data.price_paise > 0
        ? `₹${Math.round(data.price_paise / 100).toLocaleString("en-IN")}`
        : "Free";
```
```tsx
    amountStr = data.monthly_fee_paise
      ? `₹${Math.round(data.monthly_fee_paise / 100).toLocaleString("en-IN")}/mo`
      : null;
```
After:
```tsx
    if (data.trial_fee_paise) {
      amountStr = formatRupees(data.trial_fee_paise);
    }
```
```tsx
    amountStr = data.price_paise > 0 ? formatRupees(data.price_paise) : "Free";
```
```tsx
    amountStr = data.monthly_fee_paise ? `${formatRupees(data.monthly_fee_paise)}/mo` : null;
```

Dates (F8) — before (lines 182, 189–191):
```tsx
    dateStr = at ? format(new Date(at), "EEE, d MMM · h:mm a") : "";
```
```tsx
    dateStr = data.start_at
      ? format(new Date(data.start_at), "EEE, d MMM · h:mm a")
      : "";
```
After (date via helper, keep the `· h:mm a` time):
```tsx
    dateStr = at ? `${formatTrialDateShort(at)} · ${format(new Date(at), "h:mm a")}` : "";
```
```tsx
    dateStr = data.start_at
      ? `${formatTrialDateShort(data.start_at)} · ${format(new Date(data.start_at), "h:mm a")}`
      : "";
```
(The `Enrolled {format(... "d MMM yyyy")}` line 200 is a non-trial "d MMM yyyy" stamp — **leave it**; `date-fns format` import stays in use.)

**Step 4.3 — `apps/student/app/saved.tsx`** (one query: `saved`; ScrollView at line 35). No money/dates here — RefreshControl only.

Imports — before (line 2):
```tsx
import { View, Text, Pressable, ScrollView, StyleSheet } from "react-native";
```
After:
```tsx
import { View, Text, Pressable, ScrollView, StyleSheet, RefreshControl } from "react-native";
```

ScrollView — before (lines 35–38):
```tsx
        <ScrollView
          contentContainerStyle={[styles.body, { backgroundColor: theme.color.ivory }]}
          showsVerticalScrollIndicator={false}
        >
```
After:
```tsx
        <ScrollView
          contentContainerStyle={[styles.body, { backgroundColor: theme.color.ivory }]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={saved.isRefetching}
              onRefresh={() => saved.refetch()}
              tintColor={theme.color.persimmon}
            />
          }
        >
```

**Step 4.4 — `apps/student/app/enrollments.tsx`** (one query: `enrollments`; ScrollView at line 61).

Imports — before (line 2):
```tsx
import { View, Text, ScrollView, StyleSheet, Pressable } from "react-native";
```
After:
```tsx
import { View, Text, ScrollView, StyleSheet, Pressable, RefreshControl } from "react-native";
```
Add:
```tsx
import { formatRupees } from "@/lib/format";
```

ScrollView — before (lines 61–64):
```tsx
        <ScrollView
          contentContainerStyle={[styles.body, { backgroundColor: theme.color.ivory }]}
          showsVerticalScrollIndicator={false}
        >
```
After:
```tsx
        <ScrollView
          contentContainerStyle={[styles.body, { backgroundColor: theme.color.ivory }]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={enrollments.isRefetching}
              onRefresh={() => enrollments.refetch()}
              tintColor={theme.color.persimmon}
            />
          }
        >
```

Currency (F7) — before (lines 67–69):
```tsx
            const fee = batch.monthly_fee_paise
              ? `₹${Math.round(batch.monthly_fee_paise / 100).toLocaleString("en-IN")}/mo`
              : null;
```
After:
```tsx
            const fee = batch.monthly_fee_paise ? `${formatRupees(batch.monthly_fee_paise)}/mo` : null;
```
(The `format(nextClass, "EEE, d MMM 'at' h:mm a")` at line 195 is a composed "next class" string with a literal `'at'` — **leave it**; not a trial-date renderer.)

**Checkpoint (Task 4):**
```bash
grep -rn "RefreshControl" apps/student/app/trials/index.tsx apps/student/app/bookings.tsx apps/student/app/saved.tsx apps/student/app/enrollments.tsx
```
Expected: each file shows the import + a `<RefreshControl …>` usage. Confirm the old local formatter is gone:
```bash
grep -rn "formatRupeesShort" apps/student
```
Expected: no matches. Then:
```bash
cd apps/student && npx tsc --noEmit
```
Expected: no errors.

---

### Task 5 — F6: server-computed payment breakdown (backend → types → client)

**Step 5.1 — backend `apps/api/src/modules/payments/service.ts`.** `createOrder` returns from two spots. Add a `breakdown` to both. Insert the breakdown computation just after `const amountPaise = booking.batch.trialFeePaise;` (line 35):

Before (line 35):
```ts
  const amountPaise = booking.batch.trialFeePaise;
```
After:
```ts
  const amountPaise = booking.batch.trialFeePaise;

  // Server-authoritative price breakdown (paise). The platform fee and any
  // credits live here, NOT in the client. total = base + platform_fee − credits.
  const PLATFORM_FEE_PAISE = 1200;
  const creditsAppliedPaise = amountPaise >= 10000 ? 5000 : 0;
  const breakdown = {
    base_paise: amountPaise,
    platform_fee_paise: PLATFORM_FEE_PAISE,
    credits_applied_paise: creditsAppliedPaise,
    total_paise: amountPaise + PLATFORM_FEE_PAISE - creditsAppliedPaise,
  };
```

> This reproduces the previous client constants exactly (₹12 fee = 1200 paise; ₹50 credit = 5000 paise when trial fee ≥ ₹100 = 10000 paise) so behavior is unchanged, but now authoritative. The `amount_paise` charged via Razorpay stays `amountPaise` (the base trial fee) to avoid changing money flow in this task; `total_paise` is display-only. (If the business wants to charge the net total, that is a deliberate follow-on — flag, do not silently change the charge.)

Idempotent-hit return — before (lines 43–48):
```ts
    return {
      razorpay_order_id: existing.razorpayOrderId,
      razorpay_key: env.RAZORPAY_KEY_ID || 'rzp_test_xxx',
      amount_paise: existing.amountPaise,
      currency: existing.currency,
    };
```
After:
```ts
    return {
      razorpay_order_id: existing.razorpayOrderId,
      razorpay_key: env.RAZORPAY_KEY_ID || 'rzp_test_xxx',
      amount_paise: existing.amountPaise,
      currency: existing.currency,
      breakdown,
    };
```

Fresh return — before (lines 73–78):
```ts
  return {
    razorpay_order_id: razorpayOrderId,
    razorpay_key: env.RAZORPAY_KEY_ID || 'rzp_test_xxx',
    amount_paise: amountPaise,
    currency: 'INR',
  };
```
After:
```ts
  return {
    razorpay_order_id: razorpayOrderId,
    razorpay_key: env.RAZORPAY_KEY_ID || 'rzp_test_xxx',
    amount_paise: amountPaise,
    currency: 'INR',
    breakdown,
  };
```

**Step 5.2 — types `packages/types/src/index.ts`.** Add near `CreateOrderRequest` / `CreateOrderRequestType` (the request const is at lines 52–54, the inferred type at line 79). Add these exported types (place them just after line 79):

```ts
export type PaymentBreakdown = {
  base_paise: number;
  platform_fee_paise: number;
  credits_applied_paise: number;
  total_paise: number;
};

export type CreateOrderResponse = {
  razorpay_order_id: string;
  razorpay_key: string;
  amount_paise: number;
  currency: string;
  breakdown: PaymentBreakdown;
};
```

**Step 5.3 — client `packages/api-client/src/index.ts`.** Add the new types to the existing import from `@findemy/types`. The current import block already pulls `CreateOrderRequestType` (line 10) — add alongside it:

```ts
  CreateOrderResponse,
  PaymentBreakdown,
```

Then update `payments.createOrder` (lines 279–285):

Before:
```ts
      createOrder: (payload: CreateOrderRequestType) =>
        request<{
          razorpay_order_id: string;
          razorpay_key: string;
          amount_paise: number;
          currency: string;
        }>("POST", "/payments/order", payload),
```
After:
```ts
      createOrder: (payload: CreateOrderRequestType) =>
        request<CreateOrderResponse>("POST", "/payments/order", payload),
```

(`PaymentBreakdown` is exported for the student app to import; if the import is unused in api-client itself, import only `CreateOrderResponse` to avoid an unused-import lint — confirm the lint config and drop `PaymentBreakdown` from the api-client import if so. It is still exported from `@findemy/types` for the app.)

**Checkpoint (Task 5):**
```bash
grep -n "breakdown" apps/api/src/modules/payments/service.ts
```
Expected: the `breakdown` object + both return sites. Then build the packages and api:
```bash
cd packages/types && npx tsc --noEmit && cd ../api-client && npx tsc --noEmit && cd ../../apps/api && npx tsc --noEmit
```
Expected: no errors across all three.

---

### Task 6 — F2 + F6 + F7: `pay.tsx` loading/error guard and server breakdown

**File:** `apps/student/app/booking/pay.tsx`.

**Step 6.1 — imports.** Add `ActivityIndicator` and the formatter:

Before (line 2):
```tsx
import { View, Text, Alert, Pressable, StyleSheet, ScrollView } from "react-native";
```
After:
```tsx
import { View, Text, Alert, Pressable, StyleSheet, ScrollView, ActivityIndicator } from "react-native";
```
Add:
```tsx
import { formatRupees } from "@/lib/format";
```

**Step 6.2 — delete the mock totals (F2 + F6).** Before (lines 141–145):
```tsx
  const trialFeePaise = order.data?.amount_paise ?? b?.batch?.trial_fee_paise ?? 15000;
  const trialFee = trialFeePaise / 100;
  const platformFee = 12;
  const festiveCredit = trialFee >= 100 ? 50 : 0;
  const total = trialFee + platformFee - festiveCredit;
```
After (drive everything off the server breakdown; no mock fallback):
```tsx
  const breakdown = order.data?.breakdown ?? null;
  const totalPaise = breakdown?.total_paise ?? 0;
```

`proceedDisabled` (line 147) is **unchanged** — it already gates on `!order.data`.

**Step 6.3 — replace the summary money rows (lines 254–280) with a loading/error/data guard.** Before:
```tsx
          <View style={[styles.summaryDivider, { borderColor: theme.color.hairline }]} />
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: theme.color.mist }]}>Trial fee</Text>
            <Text style={[styles.summaryValue, { color: theme.color.ink }]}>
              ₹{trialFee.toFixed(2)}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: theme.color.mist }]}>Platform fee</Text>
            <Text style={[styles.summaryValue, { color: theme.color.ink }]}>
              ₹{platformFee.toFixed(2)}
            </Text>
          </View>
          {festiveCredit > 0 ? (
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: theme.color.mist }]}>Festive credit</Text>
              <Text style={[styles.summaryValue, { color: theme.color.jade }]}>
                − ₹{festiveCredit.toFixed(2)}
              </Text>
            </View>
          ) : null}
          <View style={[styles.summaryDivider, { borderColor: theme.color.hairline }]} />
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryTotal, { color: theme.color.ink }]}>Total</Text>
            <Text style={[styles.summaryTotal, { color: theme.color.ink }]}>
              ₹{total.toFixed(0)}
            </Text>
          </View>
```
After:
```tsx
          <View style={[styles.summaryDivider, { borderColor: theme.color.hairline }]} />
          {order.isLoading ? (
            <View style={{ paddingVertical: 18, alignItems: "center" }}>
              <ActivityIndicator color={theme.color.persimmon} />
              <Text style={{ fontFamily: theme.font.sans, fontSize: 12, color: theme.color.mist, marginTop: 8 }}>
                Calculating total…
              </Text>
            </View>
          ) : order.error ? (
            <View style={{ paddingVertical: 14, alignItems: "center" }}>
              <Text style={{ fontFamily: theme.font.sans, fontSize: 13, color: theme.color.persimmon, marginBottom: 8 }}>
                Couldn't load the price. Check your connection.
              </Text>
              <Pressable onPress={() => order.refetch()} accessibilityRole="button" accessibilityLabel="Retry loading price">
                <Text style={{ fontFamily: theme.font.sans, fontSize: 13, fontWeight: "700", color: theme.color.persimmon }}>
                  Retry
                </Text>
              </Pressable>
            </View>
          ) : breakdown ? (
            <>
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: theme.color.mist }]}>Trial fee</Text>
                <Text style={[styles.summaryValue, { color: theme.color.ink }]}>
                  {formatRupees(breakdown.base_paise, { withDecimals: true })}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: theme.color.mist }]}>Platform fee</Text>
                <Text style={[styles.summaryValue, { color: theme.color.ink }]}>
                  {formatRupees(breakdown.platform_fee_paise, { withDecimals: true })}
                </Text>
              </View>
              {breakdown.credits_applied_paise > 0 ? (
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, { color: theme.color.mist }]}>Festive credit</Text>
                  <Text style={[styles.summaryValue, { color: theme.color.jade }]}>
                    {formatRupees(-breakdown.credits_applied_paise, { withDecimals: true })}
                  </Text>
                </View>
              ) : null}
              <View style={[styles.summaryDivider, { borderColor: theme.color.hairline }]} />
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryTotal, { color: theme.color.ink }]}>Total</Text>
                <Text style={[styles.summaryTotal, { color: theme.color.ink }]}>
                  {formatRupees(breakdown.total_paise)}
                </Text>
              </View>
            </>
          ) : null}
```

**Step 6.4 — the CTA label (line 383).** Before:
```tsx
          {`Pay ₹${total.toFixed(0)} & confirm trial`}
```
After:
```tsx
          {breakdown ? `Pay ${formatRupees(breakdown.total_paise)} & confirm trial` : "Pay & confirm trial"}
```

**Step 6.5 — the mock date string (line 238).** While here, kill the mock fallback date (it's also a wrong-weekday literal). Before:
```tsx
              {slotDate ? format(slotDate, "EEE, d MMM yyyy") : "Sat, 19 Apr 2026"}
```
After (use the shared helper; show an em-dash when no slot):
```tsx
              {slotDate ? formatTrialDateShort(slotIso!) : "—"}
```
…and add `formatTrialDateShort` to the import from `@/lib/format`. (Leave the `h:mm a` time row at line 244 — it's a pure time, not a date.)

**Checkpoint (Task 6):**
```bash
grep -n "platformFee\|festiveCredit\|?? 15000\|trialFee.toFixed\|150" apps/student/app/booking/pay.tsx
```
Expected: no matches (all mock constants and `?? 15000` gone). Then:
```bash
cd apps/student && npx tsc --noEmit
```
Expected: no errors (the `order.data.breakdown` access typechecks against the new `CreateOrderResponse`).

---

### Task 7 — F3: surface OTP-resend success/failure via toast

**File:** `apps/student/app/(auth)/signup-otp.tsx`. This is a component, so use the context `useToast()`.

Add the import (after line 7):
```ts
import { useToast } from "@/components/Toast";
```
In `SignupOtpScreen`, after `const setAuth = useAuth((s) => s.setAuth);` (line 22):
```ts
  const toast = useToast();
```
Replace `handleResend` (lines 74–81). Before:
```tsx
  const handleResend = async () => {
    setResendTimer(60);
    try {
      await api.auth.requestOtp({ phone, role: "student" });
    } catch {
      // ignore
    }
  };
```
After:
```tsx
  const handleResend = async () => {
    setResendTimer(60);
    try {
      await api.auth.requestOtp({ phone, role: "student" });
      toast.show("A new code is on its way.", "success");
    } catch {
      toast.show("Couldn't resend the code. Please try again.", "error");
      setResendTimer(0); // let them retry immediately on failure
    }
  };
```

**Checkpoint (Task 7):**
```bash
grep -n "// ignore\|toast.show" apps/student/app/(auth)/signup-otp.tsx
```
Expected: `// ignore` gone; two `toast.show` calls present. Then `cd apps/student && npx tsc --noEmit` → no errors.

---

### Task 8 — F4: session-expired toast before clearing auth

**File:** `apps/student/src/lib/api.ts`. Non-component module → use the imperative bus from Task 2.

Add the import (after line 2):
```ts
import { enqueueToast } from "@/stores/toast";
```
Update the refresh-failure `catch` (lines 33–36). Before:
```ts
    } catch {
      useAuth.getState().clear();
      return null;
    }
```
After:
```ts
    } catch {
      enqueueToast("Your session expired — please sign in again.", "error");
      useAuth.getState().clear();
      return null;
    }
```
(The `if (!refreshToken)` branch at lines 17–18 stays silent — that's a logged-out/cold-start state, not an expiry.)

**Checkpoint (Task 8):**
```bash
grep -n "enqueueToast" apps/student/src/lib/api.ts
```
Expected: import + the one call inside the catch. Then `cd apps/student && npx tsc --noEmit` → no errors.

---

### Task 9 — F5: log + flag push-permission denial; one-time soft banner

**Files:** `apps/student/src/stores/auth.ts`, `apps/student/src/hooks/usePushNotifications.ts`, `apps/student/app/(tabs)/profile.tsx`.

**Step 9.1 — auth store flag.** `apps/student/src/stores/auth.ts`. Add to `AuthState` (after `devBypass: boolean;`, line 27):
```ts
  pushPermissionDenied: boolean;
  setPushPermissionDenied: (v: boolean) => void;
```
Add the initial value (after `devBypass: false,`, line 46):
```ts
      pushPermissionDenied: false,
```
Add the setter (after `setUser`, line 50):
```ts
      setPushPermissionDenied: (v) => set({ pushPermissionDenied: v }),
```
And include it in `clear()` reset (line 52):

Before:
```ts
      clear: () =>
        set({ accessToken: null, refreshToken: null, user: null, attendanceOtp: null, devBypass: false }),
```
After:
```ts
      clear: () =>
        set({ accessToken: null, refreshToken: null, user: null, attendanceOtp: null, devBypass: false, pushPermissionDenied: false }),
```

**Step 9.2 — the hook.** `apps/student/src/hooks/usePushNotifications.ts`. The `.then` callback (lines 34–40) receives `token` (which is `null` when permission was denied). Set the flag on `null`, log + flag on a register failure. Before:
```ts
    registerForPushNotificationsAsync().then((token) => {
      if (token) {
        api.push
          .register({ expo_token: token, platform: Platform.OS as "ios" | "android" })
          .catch(() => {});
      }
    });
```
After:
```ts
    registerForPushNotificationsAsync()
      .then((token) => {
        if (token) {
          useAuth.getState().setPushPermissionDenied(false);
          api.push
            .register({ expo_token: token, platform: Platform.OS as "ios" | "android" })
            .catch((err) => {
              console.warn("[push] token registration failed:", err);
            });
        } else {
          // Device returned no token → permission denied or unsupported.
          useAuth.getState().setPushPermissionDenied(true);
        }
      })
      .catch((err) => {
        console.warn("[push] permission request failed:", err);
        useAuth.getState().setPushPermissionDenied(true);
      });
```
(`useAuth` is already imported at line 8.)

**Step 9.3 — soft banner on the profile screen.** `apps/student/app/(tabs)/profile.tsx`. Read it first for the header/scroll layout, then add a one-time dismissible banner near the top of the scrollable content, shown only when `pushPermissionDenied` is true and not yet dismissed this session:
```tsx
// near the other hooks
const pushDenied = useAuth((s) => s.pushPermissionDenied);
const [bannerDismissed, setBannerDismissed] = useState(false);
// …in the JSX, above the first profile section:
{pushDenied && !bannerDismissed ? (
  <View style={{ marginHorizontal: 24, marginTop: 12, padding: 12, borderRadius: 12, backgroundColor: theme.color.marigoldSoft, flexDirection: "row", alignItems: "center" }}>
    <Text style={{ flex: 1, fontFamily: theme.font.sans, fontSize: 12, color: theme.color.ink }}>
      Notifications are off. Enable them in Settings to get trial reminders.
    </Text>
    <Pressable onPress={() => setBannerDismissed(true)} accessibilityRole="button" accessibilityLabel="Dismiss notification banner">
      <Text style={{ fontSize: 16, color: theme.color.mist, paddingLeft: 8 }}>✕</Text>
    </Pressable>
  </View>
) : null}
```
Ensure `useAuth`, `useState`, `View`, `Text`, `Pressable` are imported in that file (add any missing). Banner is one-time per session via local `bannerDismissed` state (no persistence needed).

**Checkpoint (Task 9):**
```bash
grep -n "pushPermissionDenied" apps/student/src/stores/auth.ts apps/student/src/hooks/usePushNotifications.ts apps/student/app/\(tabs\)/profile.tsx
```
Expected: flag + setter in the store, two `setPushPermissionDenied` calls in the hook, the selector in profile. Then `cd apps/student && npx tsc --noEmit` → no errors.

---

### Task 10 — F9: tap target + accessibility labels

**Files:** `apps/student/app/post-trial/index.tsx`, `apps/student/app/(tabs)/index.tsx`.

**Step 10.1 — `post-trial/index.tsx`** star Pressable (lines 162–166). It **already** has `accessibilityLabel={`${n} stars`}` (line 166) — do **not** re-add. Only bump the tap padding. Before (line 165):
```tsx
                  style={{ paddingHorizontal: 6 }}
```
After:
```tsx
                  style={{ paddingHorizontal: 12 }}
```

**Step 10.2 — `(tabs)/index.tsx`.** Add `accessibilityLabel` (and `accessibilityRole="button"`) to the Pressables that lack one. Verified labeled already: lines **163** (Go to profile), **185** (Filter academies), **278** (Load more). Verified **missing** labels — add them:

| Line | Element | Add |
| --- | --- | --- |
| 201 | category chip | `accessibilityRole="button" accessibilityLabel={`Filter by ${chip.label}`}` |
| 295 | filter sheet backdrop | `accessibilityRole="button" accessibilityLabel="Close filters"` |
| 303 | sheet close ✕ | `accessibilityRole="button" accessibilityLabel="Close filters"` |
| 331 | rating option chip | `accessibilityRole="button" accessibilityLabel={`${opt.value} stars and up`}` |
| 357 | radius option chip | `accessibilityRole="button" accessibilityLabel={`Within ${opt.value} km`}` |
| 378 | Clear filters | `accessibilityRole="button" accessibilityLabel="Clear filters"` |
| 386 | Apply filters | `accessibilityRole="button" accessibilityLabel="Apply filters"` |

Example, before (line 201):
```tsx
            <Pressable
              key={chip.label}
              onPress={() => setCategory(chip.key)}
```
After:
```tsx
            <Pressable
              key={chip.label}
              onPress={() => setCategory(chip.key)}
              accessibilityRole="button"
              accessibilityLabel={`Filter by ${chip.label}`}
```
(Confirm each option's available variable name when editing — `chip.label`, `opt.value` — and adjust the label expression accordingly.)

**Checkpoint (Task 10):**
```bash
grep -c "accessibilityLabel" apps/student/app/\(tabs\)/index.tsx
```
Expected: count increases by 7 (from 3 to 10). And:
```bash
grep -n "paddingHorizontal: 6" apps/student/app/post-trial/index.tsx
```
Expected: no match (now 12). Then `cd apps/student && npx tsc --noEmit` → no errors.

---

### Task 11 — F10: wire "Change Photo" to expo-image-picker

**Files:** `apps/student/package.json`, `apps/student/app/profile/edit.tsx`. `expo-image-picker` is **not** in the student app (it is in `apps/admin`), so add it.

**Step 11.1 — add the dependency.** In `apps/student/package.json` `dependencies`, add the expo-image-picker version matching the student app's Expo SDK. Determine the exact version with:
```bash
cd apps/student && npx expo install expo-image-picker
```
(`expo install` picks the SDK-compatible version automatically and updates package.json.)

**Step 11.2 — `app/profile/edit.tsx`.** Add the import (after line 18):
```ts
import * as ImagePicker from "expo-image-picker";
```
Add local state for the picked avatar (after `const [errorMsg, setErrorMsg] = useState("");`, line 35):
```ts
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
```
Add the picker handler (after `onSubmit`, around line 64):
```ts
  const handleChangePhoto = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permission needed", "Allow photo access to change your picture.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]?.uri) {
      setAvatarUri(result.assets[0].uri);
    }
  };
```
Wire the button + render the picked image. The avatar block is lines 93–109. Update the `TouchableOpacity` (line 102):

Before:
```tsx
          <TouchableOpacity activeOpacity={0.7}>
```
After:
```tsx
          <TouchableOpacity activeOpacity={0.7} onPress={handleChangePhoto} accessibilityRole="button" accessibilityLabel="Change profile photo">
```
And show the picked image in the avatar circle when present. Before (lines 95–101):
```tsx
          <View style={[styles.avatar, { backgroundColor: theme.color.persimmon }]}>
            <Text
              style={[styles.avatarInitial, { fontFamily: theme.font.serif, color: theme.color.ivory }]}
            >
              {initial}
            </Text>
          </View>
```
After (add `Image` to the `react-native` import at line 2):
```tsx
          <View style={[styles.avatar, { backgroundColor: theme.color.persimmon, overflow: "hidden" }]}>
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={{ width: "100%", height: "100%" }} />
            ) : (
              <Text
                style={[styles.avatarInitial, { fontFamily: theme.font.serif, color: theme.color.ivory }]}
              >
                {initial}
              </Text>
            )}
          </View>
```

> Where the uri goes: held in local `avatarUri` for immediate preview. Persisting the avatar to the backend is **out of scope** (there is no avatar field on `me.updateOnboarding` / the `User` type). Add a `// TODO: upload avatarUri once the profile API accepts an avatar` next to `onSubmit`. This satisfies "pick + set the avatar" (preview) without inventing an upload endpoint. If the team prefers, the alternative is to **hide** the control — but wiring the picker for preview is the lower-risk, user-visible improvement.

**Checkpoint (Task 11):**
```bash
grep -n "expo-image-picker" apps/student/package.json && grep -n "launchImageLibraryAsync\|onPress={handleChangePhoto}" apps/student/app/profile/edit.tsx
```
Expected: dependency present; picker handler + wired onPress present. Then `cd apps/student && npx tsc --noEmit` → no errors.

---

## Final verification (all tasks)

```bash
# 1. Shared helper tests pass
cd apps/student && npx vitest run
#    Expected: Test Files 1 passed, Tests 6 passed

# 2. Student app typechecks
cd apps/student && npx tsc --noEmit
#    Expected: no errors

# 3. Backend + packages typecheck (F6)
cd packages/types && npx tsc --noEmit
cd packages/api-client && npx tsc --noEmit
cd apps/api && npx tsc --noEmit
#    Expected: no errors

# 4. No legacy currency/date patterns remain at the migrated sites
grep -rn "formatRupeesShort" apps/student
#    Expected: no matches
grep -n "platformFee\|festiveCredit\|?? 15000" apps/student/app/booking/pay.tsx
#    Expected: no matches
grep -rn "RefreshControl" apps/student/app/trials/index.tsx apps/student/app/bookings.tsx apps/student/app/saved.tsx apps/student/app/enrollments.tsx
#    Expected: 4 files each show import + usage
```
