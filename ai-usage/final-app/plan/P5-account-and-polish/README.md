# P5 — Account & polish (final phase)

> **Goal.** Wrap the apps: the student **Profile/bookings** home (trials live here, not Classes), **notifications + activity** (fill the missing emitters + reminder workers), **design-system + a11y parity** on the net-new screens, and a **dead-code + migration-baseline cleanup** before launch.
>
> **Source:** [`../../master-execution-plan.md`](../../master-execution-plan.md) §P5. Code state **re-grounded against the post-P4 code (2026-06-29)** via two read-only maps. **Read [`../deviations-and-deferrals.md`](../deviations-and-deferrals.md) + [`../dead-code-registry.md`](../dead-code-registry.md) first** — P5 *consumes* DF4/DF5/DF7 and *executes* the dead-code registry.

## ✅ Implementation status (2026-06-29)
**S5.1–S5.3 done + verified; S5.4 partial (model drop deferred). 5 packages typecheck, 58 tests green.**

| Slice | Status | Notes |
|---|---|---|
| **S5.1** Profile/bookings | ✅ DONE | Removed orphaned `trials/index.tsx`; kept live `trials/[id]`; repointed **4** refs → `/bookings`; academy Studio/Settings/KYC REUSE-verified. |
| **S5.2** Notifications | ✅ DONE | **Fixed the shipped academy-push bug** (subjectId resolution + dropped the bogus `ExpoPushToken→User` FK); added review-reply + new-review pushes; **`SessionReminderSent` table** + **class/attendance reminder worker** (cron `*/15`, durable idempotency) — round-trip verified; make-good push regression-checked. |
| **S5.3** Design/a11y | ✅ DONE | a11y labels/targets on net-new icon-only controls (review stars, class cards, rate link); kit/tokens verified. |
| **S5.4** Cleanup | ⚠️ PARTIAL | ✅ rewrote the **live `include: slot` reads → `trialAt`** (trials/studio/payments) — verified. ⛔ **Slot model drop + migration baseline DEFERRED** — needs `migrate` perms (DF5), a pre-launch task that **cannot run in this dev env**. |

> **What's left of S5.4 (deferred, by design):** generate the Prisma **migration baseline** in a perms-enabled env, then drop the **Slot model/enum/columns + module + workers + api-client + seed/mock** in one coordinated PR (registry A1). The live coupling is already gone (this slice), so the eventual drop is mechanical. Also pending the product call: **referral** (A4) + **legacy aliases** (A5).

## Slices
| Slice | What | Status mix | Deps |
|---|---|---|---|
| [**S5.1**](./S5.1-profile-bookings.md) | Student **Profile/bookings** (trials under Profile), academy **Studio/Settings/KYC** | REUSE + small CHANGE | S2.1, S3.1 |
| [**S5.2**](./S5.2-notifications-activity.md) | **Notifications + activity** — add review/reminder emitters, optional student feed | REUSE + BUILD (emitters/workers) | S3.4, S4.3 |
| [**S5.3**](./S5.3-design-a11y-parity.md) | **Design-system + a11y parity** on the net-new screens | REUSE (verify) | the screens they cover |
| [**S5.4**](./S5.4-cleanup-and-migrations.md) | **Dead-code removal + Prisma migration baseline** (executes the registry; DF5) | CHANGE (delete) | all phases done |

## Order (solo dev)
```
S5.2  notifications: review-reply + new-review push, class-reminder worker, attendance-reminder (scope first)
S5.1  profile/bookings: verify trials-under-Profile; resolve the orphaned /trials screen
S5.3  a11y pass over the net-new screens (Classes tab, QR scan, live class, review, earnings, roster badges)
S5.4  ⚑ CLEANUP LAST — migration baseline (DF5) → then delete the dead Slot system + orphans (registry)
```
> **Why S5.4 is last:** the dead-code removal drops DB columns/models (Slot, nullable `slotId`s, maybe referral) — that **must go through a real Prisma migration** (DF5), not `db push`. So the cleanup is gated on generating the migration baseline, and it's safest once every feature is built + verified (nothing new will reintroduce a dependency). This is the pre-launch tidy.

## 🔗 Sync with executed code (read before starting) — verified 2026-06-29
1. **Student bookings = REUSE.** Profile → **"Your Bookings"** (`/bookings`, `student-app/app/bookings.tsx`) already combines **trials + workshops + enrolments** off `GET /trials/my` + `GET /me/workshop-registrations` + enrolments. **Trials ARE under Profile**, not Classes (S3.1 satisfied). ✅
2. **⚠️ Orphaned `/trials/index.tsx`** — a "My Trials" screen reachable **only** after a reschedule redirect (`booking/slot.tsx:86 router.replace('/trials')`). It duplicates the bookings view and isn't linked from Profile → **dead/orphaned** (add to the dead-code registry; S5.1 decides remove-vs-link).
3. **Saved/wishlist, student edit-profile/general-info, academy Studio hub, Settings (incl. the `attendance_reminder` toggle, `settings.tsx:81`), bank/KYC fields (`academy profile/edit.tsx:292-322` → `PUT /studio/academy`)** — all **REUSE** (exist + wired).
4. **Push infra = REUSE.** `push/service.ts sendPushNotifications` + `ExpoPushToken` + `POST /push/register` work. **18 emitters already fire** (trial booked, payment captured, enrolment confirmed, pause/transfer, lifecycle worker, renewal reminders, trial reminders).
5. **✅ Make-good push already exists** — `sessions/service.ts:78` pushes affected students on cancel ("make-good session added", S3.4). **Do not rebuild.**
6. **⚠️ Missing emitters (S5.2 BUILD):** **review-reply** push (`reviews/service.ts respondToReview` + `studio respond` send none), **new-review-to-academy** push (`createReview` sends none), **class-reminder-30min** worker (setting `reminder_30min` exists, no worker), **attendance-reminder** worker (setting exists, **scope undefined** — decision needed).
7. **Activity feed:** academy side **REUSE** (`GET /studio/activity` + inbox UI). Student side **not built** — a student notification/activity *history* screen would be net-new (recommend **defer/minimal**; pushes already deliver the events).
8. **Net-new screens needing the a11y/parity pass (S5.3):** student **Classes tab**, **review** screen, **checkin-scan**, **live/[batch_id]**; academy **live-class**, **attendance** (QR/roster); plus the earnings net display + roster tier badges (P4).

## P5 exit criteria (phase Definition of Done)
- [ ] A booked trial is found under **Profile → Your Bookings** (not Classes); the orphaned `/trials` screen is removed or intentionally linked.
- [ ] Academy responding to a review **pushes the student**; a new review **pushes the academy**; cancelling a class still pushes make-good (regression check).
- [ ] The **class-reminder (30 min)** worker fires for an upcoming session; the **attendance-reminder** behaves per the locked scope.
- [ ] The net-new screens pass the a11y checklist (focus, reduced-motion, 44px targets, ARIA) + match the persimmon-primary kit.
- [ ] **S5.4:** a Prisma **migration baseline** is generated; the **Slot system + orphans are deleted** (registry A1–A5); all 5 packages typecheck, full suite green, trial-booking + schedule round-trips pass.

## Decisions (recommendations — confirm before building)
1. **Orphaned `/trials/index.tsx`:** **remove it** (the unified `/bookings` is the canonical trials home; the orphan is only reachable via a reschedule redirect → repoint that to `/bookings`). *(Recommend; logs to dead-code registry.)*
2. **Attendance-reminder scope ✅ (owner-locked): BOTH sides.** ~2h before an **in-studio** class, push enrolled **students** ("Class today — check in with the QR") **and** the **academy** ("Open the QR — your class is soon"). Online classes excluded (auto-mark on join). One worker, two audiences, per-(batch,date) sent-guard.
3. **Student activity feed ✅ (owner-locked): deferred** (post-MVP) — push notifications already deliver every event. The dead Profile **"Notifications"** row (a "coming soon" alert) has been **removed** (`student-app/app/(tabs)/profile.tsx`) so there's no dangling entry pointing at the unbuilt feed.
4. **Class-reminder source:** scan **`BatchTiming` occurrences** (slots are dormant/being deleted), not `Slot` rows. *(Recommend — aligns with S3.4 + the S5.4 cleanup.)*
