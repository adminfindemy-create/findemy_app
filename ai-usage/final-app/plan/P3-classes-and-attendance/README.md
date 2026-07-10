# P3 — Classes & attendance

> **Goal.** The post-enrol experience: a student **Classes** tab (enrolled batches only), and the **3-mode attendance backbone** — in-studio **QR**, online **auto-on-join**, trials **OTP** (already done in S2.2) — plus academy **schedule + cancel-class with a make-good credit**.
>
> **Source:** [`../../master-execution-plan.md`](../../master-execution-plan.md) §P3. Code state **re-grounded against the post-P2 code (2026-06-27)** via four read-only maps. **Read [`../deviations-and-deferrals.md`](../deviations-and-deferrals.md) first** — P3 builds directly on P2 carryovers (rooms = `batch.id`; trial OTP is trials-only; slots dormant).

## ✅ Implementation status (2026-06-28)
**All four slices implemented; every backend round-trip-verified. 5 packages typecheck, 58 tests green.**

| Slice | Backend | Apps | Verified |
|---|---|---|---|
| **S3.1** Classes tab | ✅ `GET /me/classes` (active/past split, attended = `BatchAttendance`) | ✅ student Classes tab (conditional, adaptive) | round-trip ✓ |
| **S3.2** In-studio QR | ✅ token issue / check-in / roster; `markedByAccountId` nullable; `sessionDateIST` | ✅ academy QR+roster screen; ⚠️ student camera scan **scaffolded** (data flow wired, native `expo-camera` + QR-image render are dev-build TODOs) | round-trip ✓ (present, idempotent, null marker) |
| **S3.3** Online live + 100ms | ✅ `ensureLiveRoom` (race-guarded), `getBatchToken`→room, **peer.join webhook → present**, host token (`HMS_*` in env) | ⚠️ academy host + student join **scaffolded** (token/roster flow wired, real `@100ms/react-native-sdk` A/V is a dev-build + credentials TODO) | round-trip ✓ (room, host token, webhook→present, IST date) |
| **S3.4** Schedule + cancel + make-good | ✅ schedule off `BatchTiming` (mode + cancelled), `Batch.sessionsPerMonth`, cancel = **credit + extend-to-next-occurrence**, idempotent, paused-excluded | ✅ academy schedule (`cancelSession`, key change) + `sessions_per_month` inputs (new/edit batch) | round-trip ✓ (extend 07-17→07-18 = exactly 1 session) |

> **Native A/V boundary (honest):** the 100ms video and camera-QR screens are written + typecheck-clean with their data flow wired, but **runtime A/V is only verifiable on a custom dev build with real 100ms credentials** (the DF6 constraint). **Deferred cleanups:** the dormant `DELETE /studio/slots/:id` route + `deleteSlot` are unused-but-not-removed; `live/end` is client-side back-nav (no server record). The online live roster reuses the S3.2 `session/attendance` endpoint (no separate roster endpoint).

## Slices
| Slice | What | Status mix | Deps |
|---|---|---|---|
| [**S3.1**](./S3.1-classes-tab.md) | Student **Classes** tab (enrolled-only, adaptive) | ✅ DONE | S2.3 |
| [**S3.2**](./S3.2-in-studio-qr.md) | **In-studio QR** check-in (per-session QR → scan → present) | ✅ backend + academy; student scan scaffold | S3.1, S1.3 |
| [**S3.3**](./S3.3-online-live-auto-join.md) | **Online live** class + **auto-on-join** attendance | ✅ backend; native A/V scaffold | S3.1, S1.3 |
| [**S3.4**](./S3.4-schedule-cancel-make-good.md) | Academy **schedule** + **cancel-class** + **make-good** credit | ✅ DONE | S2.3 |

## Order (solo dev)
```
S3.1  Classes tab + GET /me/classes        # foundational; the tab the others hang in-class actions off
S3.2  in-studio QR                         # establishes the attendance-write foundation (BatchAttendance)
S3.3  online live (real 100ms)             # room-per-batch + SDK in both apps + peer.join webhook attendance
S3.4  schedule + cancel + make-good        # rewrites the academy schedule OFF slots; SessionCredit ledger
```
> S3.2 builds the shared **attendance-write foundation** (the `BatchAttendance` upsert + `markedByAccountId` nullability); S3.3 reuses it for auto-on-join. S3.4 is independent (schedule/cancel) but must finish the slot→timing transition the academy schedule still depends on.

## 🔗 Sync with executed code (read before starting)
1. **Attendance has three separate writers, by booking type** (master §2.2): **trials → OTP** (done, S2.2, `trials/service.ts:80` — *trials only, leave alone*); **in-studio class → QR** (S3.2, new); **online class → auto-on-join** (S3.3, new). Both class writers target the **same `BatchAttendance` model** (`schema.prisma:684`, `@@unique([batchId, userId, date])`).
2. **A "session" has no row anymore (slots retired, D1).** A class session is a **`(batch, date)` occurrence** projected from `BatchTiming`. So: attendance keys off `(batchId, userId, date)` (existing unique); cancellation must **create** a record (there's no slot to delete). **MVP assumes ≤1 session/day per batch** (the seed batches are 1 timing/day) — see Decision 1. **⚠️ Both attendance writers (QR + auto-join) MUST normalize `date` to IST start-of-day** via one shared helper, else an evening class crossing the UTC date boundary creates two rows and breaks idempotency across the writers.
3. **⚠️ `BatchAttendance.markedByAccountId` is required (NOT NULL)** — but QR (student-driven) and auto-on-join have no academy marker. **Make it nullable** (Decision 2). The manual-mark endpoint/UI (`attendance` module + `academy attendance.tsx`) is **removed** — QR-only, no manual override (locked).
4. **"Live" is timing-derived** (`rooms/repo.ts findLiveBatch`, S2.1/D4); the one-live-session-per-batch caveat (D4) carries. Room provisioning (a real 100ms room per batch) + attendance (the `peer.join` webhook, **not** a write inside `getBatchToken`) are the real-100ms build — see §5.
5. **✅ Real 100ms integration is IN scope (owner decision — DF6 un-deferred).** S3.3 builds the **real 100ms** path: a 100ms **room per batch** (`Batch.liveRoomId`, lazily provisioned via the Management API — today `generateHmsToken` wrongly passes `batch.id` as the 100ms room id, so it always mock-falls-back), `@100ms/react-native-sdk` in **both apps** (academy host + student join, real A/V), and **attendance written by a signed 100ms `peer.join` webhook** — so "present" = actually connected, not screen-open. *Constraint:* code-complete + typecheck-clean here, but live A/V is verified once real `HMS_*` keys are set (mock fallback without them, like Razorpay).
6. **⚠️ The academy schedule still reads dormant `Slot` rows** (`studio/repo.ts getSchedule:153`) and cancels via `deleteSlot(slot_id)`. S3.4 **rewrites the schedule off `BatchTiming`** (like trial-availability) and replaces the raw delete with a real cancel + `SessionCredit`. This overlaps the DF1 slot cleanup.
7. **`GET /me/enrollments` returns active only** (`auth/repo.ts findMyEnrollments:311`, `where status:'active'`) and **`attended_count` counts *trials*** (`:335`), not class attendance. S3.1 adds **past** enrolments + fixes attended to count `BatchAttendance`.
8. **No `SessionCredit`/`CancelledSession` model; the `Batch` has no session count** — entitlement is implicit (`endDate`). S3.4 BUILDs **`Batch.sessionsPerMonth`** + `SessionCredit` + period-extension (Decisions 1–2).
9. **New deps:** student-app needs a **camera/QR scanner** (`expo-camera`) for S3.2; academy-app needs a **QR display** lib (`react-native-qrcode-svg`) for S3.2. Neither is installed.

## P3 exit criteria (phase Definition of Done)
- [ ] Brand-new student → **no Classes tab**; after enrolling once → tab shows that batch (inline); **trials never appear** in Classes (they stay in Bookings) (S3.1).
- [ ] Academy shows an in-studio session **QR**; student **scans → present**; academy live roster flips them; **double-scan is a no-op**; **no manual marking** remains (S3.2).
- [ ] Academy "Start live class" (online); student **joins → marked present automatically** + appears in the joined roster (no scan) (S3.3).
- [ ] Academy **cancels** one session of an 8-class month → student entitlement **stays 8** (one make-good appended, unbilled), student **notified** (S3.4).
- [ ] All 5 packages typecheck; backend boots; **full suite stays green**; seed loads; the academy schedule no longer depends on `Slot` rows.

## Decisions (owner-locked + recommendations)
1. **✅ Sessions-per-month is an explicit `Batch.sessionsPerMonth` field (owner).** The academy sets the number of classes/month at batch creation (alongside days/times). Entitled count = `sessionsPerMonth × period-months + Σ SessionCredit` — so "8 stays 8" is a concrete, displayable number. (S3.4.)
2. **✅ Make-good = `SessionCredit` (count/audit) + `extendPeriodEndDate` (delivery).** Record the credit **and** extend the affected period's `endDate` one session interval (reuse `enrollments/repo.ts:148`) so the student physically gets the class back — the displayed count stays 8 *and* the extra session occurs. (S3.4 §3.)
3. **✅ Online live = real 100ms (owner) with attendance on the verified `peer.join` webhook** — see "Sync" §5. The earlier "auto-on-open" overstatement is gone.
4. **Session granularity** = `(batch, date)` (MVP, ≤1 session/day — true for the seed); add `sessionStart` only when a multi-session batch exists. *(Recommendation.)*
5. **`markedByAccountId` → nullable** (null = self/auto check-in). *(Recommendation.)*
6. **`attended_count`** switches from counting trials → counting `BatchAttendance` (the real class number). *(Recommendation.)*
