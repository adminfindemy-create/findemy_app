# Findemy Student Fix Sweep — Execution Flow

> Companion to [00-MASTER-PLAN.md](./00-MASTER-PLAN.md). This file defines **the order to execute the seven sub-plans**, why, where they can overlap, and the verification gate that closes the work. No git — completion is asserted by checks, not commits.

---

## 1. Dependency graph

```
        ┌─────────────────────────── entry points ───────────────────────────┐
        │                                                                     │
   ╔═══════════╗                                                        ╔═══════════╗
   ║  Group A  ║  data/API contract (trial_at, coach_name, useTrial)    ║  Group G  ║  splash redesign
   ╚═════╤═════╝                                                        ╚═════╤═════╝  (+ navy theme token)
         │ correct data unblocks ▼                                            │
   ╔═════╧═════╗                                                              │ adds theme tokens ▼
   ║  Group B  ║  cache invalidation (enroll dup, workshop reg, slots)        │
   ╚═════╤═════╝                                                        ╔═════╧═════╗
         │ fresh data unblocks ▼                                        ║  Group D  ║  theme drift sweep
   ╔═════╧═════╗        ╔═══════════╗                                   ╚═════╤═════╝  (uses FINAL tokens)
   ║  Group C  ║        ║  Group F  ║  flow gaps (refresh, money,             │
   ╚═════╤═════╝        ╚═════╤═════╝   session, format.ts helpers)           │
         │                   │ provides format.ts ▼                          │
         └─────────┬─────────┴───────────────────────────────────────────────┘
                   ▼
             ╔═══════════╗
             ║  Group E  ║  shared components — LAST (re-touches files all groups edited)
             ╚═══════════╝
```

**Edges that matter:**
- **A → B, A → C, A → F** — every downstream group assumes trials carry `trial_at`/`coach_name` and that `useTrial` is guarded. Fixing data first avoids re-testing on a broken contract.
- **B → C** — C1 (workshop register-while-loading) reads the registration cache that B2 fixes.
- **G → D** — D sweeps colors/fonts against `theme.ts`; G *adds* the `navy` token. Running D after G means one sweep against the final token set, not two.
- **everything → E** — E migrates back-buttons, sheets, pills, cards, and loading states inside the very screens A–D/F/G edit. Running it last avoids merge churn and re-work.
- **G is independent** of A–F and may run anytime; it is slotted mid-sequence only so the human-run `expo install` + PNG export happen before the D theme sweep.

---

## 2. Recommended sequence (single engineer)

| Phase | Group | Why here | Rough size |
|---|---|---|---|
| 1 | **A — Data contract** | Highest correctness risk; unblocks B/C/F | ~9 tasks, ½ day |
| 2 | **B — Cache hygiene** | Quick, high-value; depends on A | ~5 tasks, ½ day |
| 3 | **C — Terminal-state gates** | Depends on A+B fresh data | ~4 tasks, ½ day |
| 4 | **F — Flow gaps** | Touches money + session + creates `format.ts`; depends on A | ~11 tasks, 1–1.5 days |
| 5 | **G — Splash** | Independent; do before D so theme tokens + assets settle | ~5 tasks, ½ day (+ manual asset) |
| 6 | **D — Theme drift** | Largest mechanical surface; needs final tokens from G | route-group chunks, 1–2 days |
| 7 | **E — Shared components** | Pure refactor; must be last | ~7 tasks, 1–2 days |

**Total: ~5–7 working days solo.**

---

## 3. Parallelization (two engineers)

The graph has two independent chains plus a trailing serializer:

- **Engineer 1 (correctness chain):** A → B → C → F
- **Engineer 2 (brand/visual chain):** G → D
- **Both converge on E last** (single engineer; do not split E — its files overlap both chains).

Hand-off rule: Engineer 2 must finish **G** (theme-token additions land in `packages/ui/src/theme.ts`) before starting **D**, and Engineer 1 must finish **F task F7** (`format.ts` created) before D/E lean on `formatRupees`. Coordinate the `theme.ts` edit (G) and any `packages/ui` change (E) so they don't collide.

> Per the dispatching-parallel-agents discipline: A/B/C/F and G/D touch **different files** within each chain, so they don't interfere. E is the one group that conflicts with everything — keep it serial and last.

---

## 4. Per-group entry criteria & exit checkpoint

Run a group only when its **entry** holds; close it only when its **exit** passes.

| Group | Entry criteria | Exit checkpoint (per sub-plan) |
|---|---|---|
| A | clean `tsc` baseline | `cd apps/api && npx vitest run` (new `trials.test.ts` green) · `grep -rn 'scheduled_at' apps/student/app/trials` → only fallback uses · `tsc` 0 errors |
| B | A done | `tsc` 0 errors · grep shows new `invalidateQueries` keys present · no `useEnrollBatch` in `useRenewal.ts` |
| C | A, B done | `cd apps/student && npx tsc --noEmit` 0 errors · manual: register-while-loading shows placeholder; Renew disabled on `inactive` enrollment; event deadline ticks |
| F | A done; vitest added (task 1) | `cd apps/student && npx vitest run` (format tests green) · `cd apps/api && npx vitest run` · grep: no local `formatRupees`/`?? 15000` left at migrated sites |
| G | — | `cd apps/student && npx tsc --noEmit` 0 errors · manual cold-launch: navy splash, no ivory flash |
| D | G done (final tokens) | per route-group greps return empty (`fontFamily: "System"`, `"Instrument Serif"`, target hexes, `shadowColor: "#000"`) · `tsc` 0 errors |
| E | A–D, F, G done | `tsc` 0 errors · grep: zero inline `‹`/`←` back buttons in migrated screens; sheets import `BottomSheet` |

---

## 5. Global verification gate (run after E)

This is the master "definition of done" — all must pass:

```bash
# 1. Types across the whole monorepo
pnpm -w typecheck            # turbo tsc --noEmit, expect 0 errors everywhere

# 2. Lint
pnpm -w lint                 # Biome, expect clean

# 3. Unit tests
cd apps/api && npx vitest run        # incl. serializer trial_at/coach_name + breakdown
cd ../student && npx vitest run      # incl. formatRupees/formatTrialDate

# 4. Residual-drift greps (all should print nothing)
grep -rn 'fontFamily: *"System"' apps/student/app apps/student/src
grep -rn 'fontFamily: *"Instrument Serif"' apps/student/app apps/student/src
grep -rn 'shadowColor: *"#000"' apps/student
grep -rn '#D8492A\|#1E5C5A\|#FAF6EE\|#E8A33D' apps/student/app apps/student/src
```

**Manual smoke (device/simulator):**
1. **Trials list** — dates render (no "Invalid Date"); open a trial with a coach → coach name shows.
2. **Booking** — book a trial → academy slot capacity drops without reload; pay screen shows a spinner (not ₹150 mock) until the real breakdown loads.
3. **Workshop** — register → Bookings hub shows it immediately; cancel → CTA flips to Register (no stale "Booked ✓"); CTA shows a placeholder while status loads.
4. **Enrollment** — disabled manage tiles show a reason; Renew greyed on an `inactive` enrollment.
5. **Lists** — pull-to-refresh works on Trials / Bookings / Saved / Enrollments.
6. **Auth** — force a 401 → "session expired" toast then redirect; resend OTP offline → error toast.
7. **Splash** — cold launch shows the navy branded splash, "DISCOVER YOUR ART" with persimmon rule, no flash of the old ivory/charcoal screens.
8. **Consistency** — every back button, bottom sheet, and status pill looks identical across screens.

---

## 6. Rollback / safety note

There is **no git** here, so there is no `git revert` safety net. Mitigations:
- Execute **one group at a time**; do not start the next group until the current group's exit checkpoint passes.
- Within a group, follow the bite-sized steps and run the **Checkpoint** after each task — a failed `tsc`/grep localizes the regression immediately.
- The two manual asset steps in Group G (the `expo install` and the PNG export) are the only places where state changes outside the editable source tree — do them deliberately.
- Keep the working tree backed up by your own means (filesystem snapshot / copy) before the large mechanical Group D sweep, since it is the highest-volume diff (~150 edits) and has no VCS undo.
