# Findemy Student App — Fix Sweep · Master Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement each sub-plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Resolve the verified bugs and consistency issues in the Findemy student app (Expo/RN) and its API, grouped into seven independent workstreams that can be executed in a defined order.

**Architecture:** The fixes span four layers — API serializers/order endpoints (`apps/api`), shared packages (`packages/types`, `packages/api-client`, `packages/ui`), the student app's data/hooks layer (`apps/student/src`), and its screens (`apps/student/app`). Each group is a self-contained sub-plan that produces working, testable software on its own.

**Tech stack:** pnpm + turbo monorepo · Fastify + Prisma + vitest (api) · Expo Router + React Native + @tanstack/react-query + zustand (student) · Biome.

> ⚠️ **Project rule — NO git.** This repository is intentionally not under version control. **No sub-plan contains `git add`/`git commit` steps.** Every task ends with a **Checkpoint** (a `tsc`/`grep`/`vitest` command + expected output) instead of a commit. Do not initialize git or commit anything.

---

## Source of truth

This plan is built from a **verified** audit, not the raw `ai-usage/student_enhancement.md` doc. During verification (7 parallel auditors reading the actual code), three claims were found **false** and are **excluded**, and several were corrected:

| Original claim | Disposition |
|---|---|
| **A5** — `@findemy/types` missing `OAuthLoginRequest`/`AuthLoginResponse`, breaks `tsc` | ❌ **FALSE** — both are exported. Excluded. |
| **A6** — `(auth)/index.tsx` references non-existent `Appearance.AppleAuthenticationError` | ❌ **FALSE** — code uses the valid `AppleAuthentication.AppleAuthenticationError.CANCELED`. Excluded. |
| **B5** — saved-academy toggle key mismatch (`["saved"]`) | ❌ **FALSE** — both sides use `["me","saved-academies"]`. Excluded. |
| **F2** — Continue button enabled before order loads (high, real-money) | ⚠️ **DOWNGRADED** — button is already gated (`!order.data`). Scope reduced to guarding the *mock display totals*. |
| **C3** — disable Renew when status not in `["active","paused","ending"]` | 🔧 **CORRECTED** — `EnrollmentStatus` enum is only `active|inactive`. Gate is `status !== "active"` (the screen's existing `isInactive`). |
| **B3** — invalidate `["batches", batchId, "slots"]` | 🔧 **CORRECTED** — real consumer key is `["slots", batchId, date]`; invalidate by prefix `["slots", batch_id]`. |
| **D1** — ~95 `fontFamily: "System"` | 🔧 **CORRECTED** — actual count **133** (103 inline / 30 module-level). |

**37 audited claims → 28 confirmed + 6 partial (kept, scoped) + 3 false (dropped).**

---

## The seven groups

| # | Group | Sub-plan | Severity weight | Depends on | Nature |
|---|---|---|---|---|---|
| A | Data / API contract drift | [01-group-a-data-contract.md](./01-group-a-data-contract.md) | 1 high + mediums | — | Logic + tests |
| B | Cache invalidation hygiene | [02-group-b-cache-hygiene.md](./02-group-b-cache-hygiene.md) | 3 high | A | Logic |
| C | Terminal-state UI gates | [03-group-c-terminal-state.md](./03-group-c-terminal-state.md) | mediums | A, B | UI state |
| F | Functional flow gaps | [04-group-f-flow-gaps.md](./04-group-f-flow-gaps.md) | 3 high | A | Logic + API + tests |
| G | Splash redesign | [05-group-g-splash.md](./05-group-g-splash.md) | brand | — | New UI + assets |
| D | Theme drift sweep | [06-group-d-theme-drift.md](./06-group-d-theme-drift.md) | high (breadth) | G (final theme tokens) | Mechanical sweep |
| E | Shared-component reuse | [07-group-e-shared-components.md](./07-group-e-shared-components.md) | mediums | A–D, F, G | Pure refactor |

## Execution order

See **[EXECUTION-FLOW.md](./EXECUTION-FLOW.md)** for the full ordering rationale, the dependency graph, parallelization options, and the global verification gate. In brief:

```
A → B → C → F → G → D → E
(correctness first; mechanical breadth and pure refactors last)
```

A and G are entry points (no deps). E must be last (it re-touches files every other group edits). D should run after G so it sweeps against the final theme-token set.

---

## Cross-cutting shared artifacts (build once, reuse everywhere)

These are created by the group noted and consumed across the sweep. Contracts are fixed here so the sub-plans interlock:

- **`apps/student/src/lib/format.ts`** — *created in Group F (tasks F7/F8, done first within F).*
  - `formatRupees(paise: number, opts?: { withDecimals?: boolean }): string` — en-IN grouping, default no decimals.
  - `formatTrialDate(iso: string): string` — date-fns `"EEEE, d MMMM yyyy"`.
  - `formatTrialDateShort(iso: string): string` — date-fns `"EEE, d MMM"`.
- **`apps/student/src/lib/typeColors.ts`** — *created in Group D (task 0).* `export const WORKSHOP_TYPE_COLORS` (4-entry workshop palette; the `workshop/[id].tsx` `TYPE_TAG` variant's `label` field preserved via spread).
- **`apps/student/src/components/BackButton.tsx`** and **`BottomSheet.tsx`** — *created in Group E.*
- **`apps/student/src/components/splash/{FindemyLogoMark,FindemyWordmark,SplashWaves}.tsx`** — *created in Group G.*
- **`apps/student/src/stores/toast.ts`** — *created in Group F (toast bus prerequisite).* Imperative `enqueueToast()` so non-component modules (`src/lib/api.ts`, push hook) can raise toasts; `ToastProvider` subscribes.
- **`packages/ui/src/theme.ts`** token additions — Group G adds `navy` (+ wave tokens). Group D consumes the *final* token set, so it runs after G.

## Tooling prerequisites surfaced during planning

- **vitest is NOT installed in `apps/student`** (only a `"test": "vitest"` script). Group F task 1 adds `vitest` + a `vitest.config.ts` before any student-side unit test. `apps/api` already has vitest.
- **`react-native-svg` is NOT a student dep** — Group G adds it (`npx expo install react-native-svg`, a native-tooling step a human runs).
- **`expo-image-picker` is NOT a student dep** (it is in `apps/admin`) — Group F task F10 adds it if the "Change Photo" affordance is wired rather than hidden.
- **Two manual steps exist** (outside an automated worker): Group G's `expo install` and the 1284×2778 `splash.png` raster export. Both are flagged in-plan.

## Global definition of done

1. `pnpm -w typecheck` (turbo `tsc --noEmit` across all packages) passes with **0 errors**.
2. `pnpm -w lint` (Biome) passes.
3. `cd apps/api && npx vitest run` and `cd apps/student && npx vitest run` pass (incl. new serializer + format tests).
4. The per-group verification greps in each sub-plan return their expected (usually empty) results.
5. Manual smoke of the flows listed in EXECUTION-FLOW.md "Global verification gate".

No git commit closes this work — completion is asserted by the checks above, per the no-git rule.
