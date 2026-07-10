# P2 — Conversion loop

> **Goal.** The core revenue path: **discover → try → enrol**. Make trial booking compute availability from `capacity − enrolled` (retire published `Slot`s), issue a **4-digit** attendance OTP, price enrolment from the **batch's academy-set discount** (consuming the S1.3 fields), and write a **commission ledger** on every paid trial/enrolment.
>
> **Source:** [`../../master-execution-plan.md`](../../master-execution-plan.md) §P2. Code state **re-grounded against the post-P1 code (2026-06-27)** via four read-only code maps — several master-plan one-liners were corrected (see "Sync with executed code").

## Slices
| Slice | What | Status mix | Deps |
|---|---|---|---|
| [**S2.4**](./S2.4-payments-commission.md) | Payments + **commission ledger** | REUSE / BUILD | S0.1 — **unblocks S2.1/S2.3 confirmations + S4.6** |
| [**S2.3**](./S2.3-enrolment-plans-discount.md) | Enrolment priced from **batch discount**; drop `biannual` | CHANGE / BUILD | S1.3, S2.4 |
| [**S2.1**](./S2.1-trial-booking-spots.md) | Trial booking off **capacity − enrolled**; **Slot teardown** | CHANGE | S1.3, S2.4 |
| [**S2.2**](./S2.2-trial-attendance-otp.md) | Trial attendance OTP **6 → 4 digit** | CHANGE | S2.1 |

## Order (solo dev) — build-first by risk + dependency
```
S2.4  payments + commission ledger    # foundational, additive, low-risk — establishes the commission rail
S2.3  enrol pricing from batch + drop biannual   # consumes S1.3; medium; server + student plan picker
S2.1  trial booking off slots + Slot teardown    # THE RISKY ONE — large blast radius (Slot.id == roomId). backend-first, staged
S2.2  attendance OTP 4-digit          # mechanical; split generator, flip length everywhere
```
> **Why S2.4 first, not S2.1?** Payments already *work* (the webhook creates trials/enrolments); S2.4 only *adds* the commission ledger — additive and low-risk, and it's where S2.1/S2.3 confirmations hang their ledger write. Lead with it so the rail exists before the risky slot teardown. **S2.1 is the real work and the critical risk** (the `Slot` model is coupled to online-class rooms).

## 🔗 Sync with executed code (read before starting — corrects the master-plan shorthand)
The four code maps found reality differs from the master-plan one-liners. Honor these:

1. **Trial booking is `POST /bookings` → webhook creates the Trial — NOT `POST /trials`.** The student reserves via `POST /bookings { batch_id, slot_id }` (`bookings/service.ts:6`); on `payment.captured` the **webhook** creates the `Trial` (`payments/service.ts:216‑224`). There is **no** `POST /trials` create endpoint (`trials/routes.ts` is read + attendance only). S2.1 keeps this booking-mediated flow; it changes the **availability source** and **drops `slot_id`**.
2. **Availability is slot-based today.** `bookings/service.ts:19` checks `slot.reservedCount >= slot.capacity`. S2.1 switches this to `getBatchAvailability()` (`batches/service.ts:53` — already returns `{capacity, enrolled, available, accepting}`). The 4h-refund (`bookings/service.ts:105`) and reschedule-once (`:169`) logic are **already correct** — just repoint off `trial.trialAt` instead of `slot.slotTime`.
3. **⚠️ `Slot.id` IS the online-class `roomId`.** `rooms/repo.ts` keys the live-video room off `slot.id`. The Slot teardown (deferred from S0.2; `TODO(S2.1)` on the model) is therefore **high blast radius (~15 files)** and must **re-key rooms off `batch.id`** before deleting `Slot`. This is S2.1's central risk — staged in its plan.
4. **Attendance OTP is per-USER, plaintext, timing-safe — not per-trial, not hashed.** `User.attendanceOtp` (`schema VarChar(6)`), verified at `trials/service.ts:119` via `crypto.timingSafeEqual`. The login OTP and attendance OTP **share `generateOtpCode()`** (`lib/otp.ts:4`). S2.2 must **split the generator** (login stays 6-digit, attendance → 4-digit) or it breaks login.
5. **Enrol pricing is already server-authoritative — it just reads the wrong source.** `POST /batches/:id/enroll { package_type }` (`batches/routes.ts:16`); the client sends only the plan, never an amount. But `computeAmount()` reads **hardcoded `PACKAGE_CONFIG`** (`enrollments/service.ts:12`), not `Batch.*DiscountBps`. S2.3 swaps the discount **source** (the math is REUSE). **Renewal has the same bug** — fix it in the same pass.
6. **`biannual` is gone from `PlanEnum`** (`@findemy/types`) **but still live in runtime code**: `enrollments/service.ts` PACKAGE_CONFIG, `batches/service.ts:19/46` validPackages, `payments/service.ts:130` months-map, and 4 student screens. S2.3 removes them together.
7. **Commission ledger does NOT exist.** The payments webhook is idempotent (early-returns if `status==='captured'`, `payments/service.ts:210`). S2.4 BUILDs `CommissionLedger` and writes it **inside the existing capture transaction**, idempotent on `(itemType, itemId)`. Platform-fee/credits are **already fully removed** (S0.2). Commission is **server-side only** (not in `PaymentBreakdown`, not added to the learner's price).

## ✅ Implementation status (2026-06-27) — COMPLETE & VERIFIED
All four slices implemented; **5 packages typecheck clean**; **backend boots** (`:8080`); **full suite green (58/58)**. Verified evidence:
- **S2.4:** `CommissionLedger` (db push, `@@unique[itemType,itemId]`) + `lib/commission.ts`; ledger written inside the trial + enrolment capture txns; **proportional reversal** wired into trial/workshop/**enrolment** refund paths (enrolment *does* refund — `discontinueEnrollment`). **Real-DB round-trip proven**: write is idempotent (2 webhooks → 1 row), 15% correct, half-refund → `accrued`/partial, full → `reversed`.
- **S2.3:** enrol + **renewal** priced from `Batch.{quarterly,annual}DiscountBps` (round-trip: quarterly −10%, annual −20%); `biannual` removed (backend + 3 student screens); **promo codes removed** (fixed a client/server price mismatch); plan picker shows **dynamic** discount + Popular/Best-value (discount threaded into `BatchDetailSheet`).
- **S2.1:** trial booking off **capacity − enrolled** at the batch's class sessions; `Booking.trialAt` + `GET /batches/:id/trial-availability`; reschedule/4h-refund off `trialAt`; rooms re-keyed off `batch.id`; both slot workers guarded; **3 student booking screens** + hooks + api-client moved to `{trial_at}`. **Real-DB round-trip proven** (availability projects sessions; booking stores `trialAt`, `slotId=null`; invalid time rejected).
- **S2.2:** OTP generator **split** (login `generateOtpCode` stays 6, `generateAttendanceOtp` → 4); call sites repointed; route `length(4)`; `User.attendanceOtp` → `VarChar(4)` (db push); seed demo `4927`; `attendance.test` → `toBe(4)`; fixtures + academy/student OTP UIs → 4. **Verified: login 6-digit / attendance 4-digit.**
- **Central config:** shared contract constants (`PLAN_MONTHS`, `DISCOUNT_BPS_CAP`, OTP lengths) added to **`@findemy/types`** (not `@findemy/config`, which turned out to be a *tooling-config* package); backend policy (`COMMISSION_BPS` env-overridable = 15%, refund windows, trial horizon) in **`backend/api/src/config.ts`**.

### ⚠️ Deviations / deferred (honest record)
- **S2.1 = Option B (agreed with owner):** the `Slot` model + `slots` module + `slot-ttl`/`webhook-retry` slot code are **left dormant** (FKs nullable, guarded), not deleted. The functional goal is met (trials book off capacity, no published slots). **Deferred:** a pure "delete dead Slot code" cleanup pass.
- **Trial-spots semantics (locked):** a booked trial does **not** consume a spot — `trial_spots = capacity − enrolled` (headroom). `getBatchAvailability` unchanged.
- **`review.tsx`** still enrols Monthly (a monthly-specific path); the **dynamic plan picker is `BatchDetailSheet`** (quarterly/annual at the batch's %).
- **Academy "Trials today" Schedule grouping — deferred** (trials are reachable via the existing inbox/trials views; data is auto-confirmed).
- **Commission rate = 15%** (`COMMISSION_BPS` env-overridable); **workshop/event commission** is a `TODO(S4.x)` (the enum carries the values).

## P2 exit criteria (phase Definition of Done)
- [ ] Trial availability derives from `capacity − enrolled` (no published `Slot`); the `Slot` model + `slots` module are removed and rooms re-keyed off `batch.id`; booking still reschedules once + refunds ≥4h (S2.1).
- [ ] Student shows a **4-digit** attendance code; academy verifies it → present/no-show; login OTP unaffected (stays 6-digit) (S2.2).
- [ ] Student enrols Monthly/Quarterly/Annual priced from the **batch's** `quarterly_discount_bps`/`annual_discount_bps`; `biannual` and promo codes gone; renewal priced the same way (S2.3).
- [ ] Every captured trial + enrolment writes one **`CommissionLedger`** row (idempotent); platform-fee/credits stay gone; commission never touches the learner's price (S2.4).
- [ ] All 5 packages typecheck; backend boots; **full backend suite stays green**; seed loads; the E2E (book trial → auto-confirmed in academy + spots drop; enrol Quarterly at academy-set % → spots drop + commission row) holds.

## Decisions
1. **✅ Trial spots — a booked trial does NOT consume a spot (locked).** `trial_spots = capacity − enrolled` is **pure headroom** ("how many trials the batch can accommodate"); only **enrolments** consume it, so the number is stable when trials are booked and drops when a trial converts to an enrolment. `getBatchAvailability` is **unchanged**; the "spots decrement" wording in the master E2E is superseded. (S2.1 §4.)
2. **✅ Commission rate = 15%, centrally configurable (locked).** There was **no business-config file**; `env.ts` is secrets-only; tunables were scattered literals. P2 introduces a central tunables home — **shared constants in `@findemy/types`** (client+server-agreed; `@findemy/config` is a tooling-config package, see deviation D2), **backend policy in `backend/api/src/config.ts`** — and homes `COMMISSION_BPS` there, **env-overridable**, default **1500 = 15%** (confirmed with the owner — change `COMMISSION_BPS` anytime, no code change). (S2.4 §"Config".)

### Still recommended (not blocking)
3. **Slot teardown depth.** Recommendation: **full removal**, but **staged** (re-key rooms → repoint availability/`trialAt` → drop FKs → delete module/model), green at each step. The roomId re-key is the gate. (S2.1.)
4. **Attendance OTP scope.** Recommendation: **keep per-user** (current `User.attendanceOtp`, → 4-digit) — one code per student; the prototype's `4927`/`8260` become seeded per-user codes. (S2.2.)
5. **Commission on refund.** Recommendation: reverse the ledger row **synchronously in the cancel path** (no refund webhook exists). Earnings *net* read is S4.6. (S2.4 §4.)
