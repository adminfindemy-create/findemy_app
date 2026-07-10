# Findemy Studio (Admin) App — Fix Sweep · Master Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement each sub-plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Resolve the verified functionality and frontend bugs in the Findemy **Studio (academy admin)** app (`apps/admin`, Expo Router + React Native) and the small number of backend (`apps/api`) and shared-package fixes they require, grouped into seven independent workstreams executed in a defined order.

**Architecture:** The fixes span four layers — API serializers/routes (`apps/api`), shared packages (`packages/types`, `packages/api-client`), the admin app's data/hooks layer (`apps/admin/src`), and its screens (`apps/admin/app`). Each group is a self-contained sub-plan that produces working, type-checking software on its own.

**Tech stack:** pnpm + turbo monorepo · Fastify + Prisma + vitest (api) · Expo Router + React Native + @tanstack/react-query + zustand (admin) · Biome.

> ⚠️ **Project rule — NO git.** This repository is intentionally not under version control. **No sub-plan contains `git add`/`git commit` steps.** Every task ends with a **Checkpoint** (a `tsc` / `grep` / `vitest` command + expected output) instead of a commit. Do not initialize git or commit anything.

---

## How this plan was produced

The admin app (~7.5k lines, ~50 files) was audited by **5 parallel reviewers**, each reading the actual code for one domain and cross-checking every API call against `packages/api-client`, `packages/types`, and the backend `apps/api/src/modules/*` routes/services. The seven sub-plans were then authored by **7 parallel writers**, each of which **re-read the cited files and corrected the audit's line numbers** before writing tasks. Corrections that changed scope are recorded below and in each sub-plan's "Context / verified line-number corrections" section.

### Verified corrections (claims that changed during planning)

| Claim | Disposition |
|---|---|
| **Settings shape mismatch + partial-merge wipes siblings** (2× "critical") | ⚠️ **DOWNGRADED** — backend `getSettings`/`updateSettings` already returns the full granular shape **and** already deep-merges, and the `Settings` type already matches. The only real defect left is the **frontend per-level crash guard** (`n?.group.key` → `n?.group?.key`). Scope reduced to that. (Group A, Task 9.) |
| **Auth-guard loop because `address` is never set** | 🔧 **CORRECTED** — backend **does** persist `address` (`createAcademyAndLink` writes `address: city`). The real defect is the `_layout` predicate keying off a non-user-entered field **plus** a brittle exact-string path compare. Fix = drop `address` from the predicate and use `segments.includes('onboarding')`. (Group B.) |
| **Reviews "Needs reply" badge vanishes on non-`all` tabs** | ⚠️ **DOWNGRADED** — backend `getReviews` already returns `summary` unconditionally per filter; api-client merely types it `summary?`. No live data-loss bug; fix is robustness via the existing `useStudioReviewsSummary()` hook. (Group D.) |
| **Earnings: base estimate on lifetime/unpaid balance** | 🔧 **CORRECTED** — `EarningsData` has no lifetime/unpaid balance field. Fix splits real `payouts[0]` (scheduled) from a clearly-labeled period-scoped estimate, with a backend follow-on TODO. (Group D.) |
| **Attendance: fix frontend to use `s.id`** | 🔧 **CORRECTED** — api-client and the hook already type the field `user_id`; only the backend runtime value (`id: r.userId`) is wrong. Fix is **backend-only** (emit `user_id`). (Group A.) |
| **New-batch all-fees `.min(1)` validation** | 🔧 **CORRECTED** — backend is `capacity .int().min(1)` but fees are `.int().min(0)` (fees may legitimately be 0). Validation must mirror that. (Group D.) |
| **Settings/workshops unreachable** | 🔧 **CORRECTED** — both are reachable via `router.push` from studio/earnings; they're just absent from the custom NavBar so `active` highlights nothing. Fix = NavBar alias, not new buttons. (Group F.) |

**~63 audited findings → confirmed and grouped below; 2 downgraded, 5 scope-corrected, 0 dropped.**

---

## The seven groups

| # | Group | Sub-plan | Severity weight | Depends on | Nature |
|---|---|---|---|---|---|
| A | API contract & data-shape drift | [01-group-a-api-contract.md](./01-group-a-api-contract.md) | **3 critical** + 1 high | — | API + client + app, TDD |
| B | Auth, onboarding & nav guards | [02-group-b-auth-flow.md](./02-group-b-auth-flow.md) | 1 critical + 3 high | A | Logic + UI state |
| C | Cache hygiene & mutation safety | [03-group-c-cache-hygiene.md](./03-group-c-cache-hygiene.md) | 2 high | A | react-query |
| D | Flow gaps, error/loading & money | [04-group-d-flow-gaps.md](./04-group-d-flow-gaps.md) | 2 critical + 3 high | A | Logic + new `format.ts` |
| E | Schedule timezone & dashboard | [05-group-e-schedule-time.md](./05-group-e-schedule-time.md) | 2 high | A | Date/tz, TDD + new `ist.ts` |
| F | Push, inbox & navigation shell | [06-group-f-push-inbox-nav.md](./06-group-f-push-inbox-nav.md) | 1 critical + 3 high | A | Hooks + shell |
| G | Polish, forms & theme drift | [07-group-g-polish-forms-theme.md](./07-group-g-polish-forms-theme.md) | mediums (breadth) | A–F (+ D for `format.ts`) | Sweep + forms |

## Execution order

See **[EXECUTION-FLOW.md](./EXECUTION-FLOW.md)** for the dependency graph, parallelization options, and the global verification gate. In brief:

```
A → { B, C, D, E, F in any order / parallel } → G
(correctness contracts first; breadth + form/theme cleanup last)
```

A is the sole entry point — every other group assumes the corrected API/data contracts (`slot_id` on schedule items, `user_id` on attendance, settings guards). G runs last because it re-touches files that B–F edit and consumes Group D's `format.ts`.

---

## Cross-cutting shared artifacts (build once, reuse everywhere)

- **`apps/admin/src/lib/format.ts`** — *created in Group D (Task 1, done first within D).* `formatRupees(paise: number, opts?: { withDecimals?: boolean }): string` — en-IN grouping, default no decimals. Consumed by D's money sites and Group G's earnings tweaks.
- **`apps/api/src/lib/ist.ts` + `apps/admin/src/lib/ist.ts`** — *created in Group E.* Symmetric pure-offset IST (UTC+05:30) helpers (`istWallClockToUtc` / `setIstWallClock` / `istDateKey`) so slot times are constructed and bucketed identically on server and client. No tz library, no schema change.
- **`_hasHydrated` flag on the auth store** (`apps/admin/src/stores/auth.ts`) — *added in Group B (Task B7, first within B).* Consumed by the `_layout` route guard (B4) and the onboarding mount guard (B3) so neither false-fires during async SecureStore rehydration.
- **Settings per-level guards** (Group A, Task 9) — Group C's optimistic-update/disabled-while-pending work (C5) builds on top of A's corrected settings access; do not redo the merge in C.

---

## Severity snapshot

- **Critical (7):** attendance fully broken (`user_id`), batch-slots always 403, schedule cancel/reschedule always 404 (`slot_id`), OTP resend never verifies, review-respond shows "not found" + swallows errors, profile image upload bypasses auth-refresh & https enforcement.
- **High (~12):** schedule timezone drift, week-strip badge mis-bucketing, dead unread badge, push not unregistered on logout + re-registers on every token refresh, onboarding redirect loop, weak login phone validation, new-batch NaN payload, workshops "live"-tab empty text, earnings payout estimate, StudentCard `[object Object]`, missing token/id query guards.
- **Medium / Low (~44):** form gaps (category not editable, dead location/meetingLink inputs), money formatting, missing loading/error states, theme-drift hardcoded colors, keyboard avoidance, accessibility on icon-only buttons, toast safe-area, debounce deps, param-array safety, and assorted UX polish.

Each item is enumerated with file:line and a concrete fix inside its group's sub-plan.
