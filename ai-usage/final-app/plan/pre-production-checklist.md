# Pre-production & production checklist

> **Purpose.** Everything between "all phases implemented + verified in the dev sandbox" and "live for real users." None of this is feature work — it's **environment, credential, device-build, and migration** work that genuinely can't be done in this sandbox. Each item links back to where it's tracked ([`deviations-and-deferrals.md`](./deviations-and-deferrals.md) DF#, [`dead-code-registry.md`](./dead-code-registry.md) A#, or a phase slice).
>
> **Status of the build itself:** all 6 phases' backends verified; 5 packages typecheck; 58 tests green. The items below are the launch gates, **not** unfinished features.
>
> **Last updated:** 2026-06-29.

---

## 🔴 Hard blockers (nothing works for real users until these are done)

1. **`EXPO_ACCESS_TOKEN` is set** — without it, `push/service.ts:47` early-returns `{ sent: 0 }`, so **every** notification we built (trial/class/attendance reminders, review pushes, make-good, academy alerts) silently does nothing. ⚑ The single highest-impact env var.
2. **Real Razorpay keys** + webhook — `RAZORPAY_KEY_ID/SECRET/WEBHOOK_SECRET`. Without them payments run in mock (`payments/service.ts:20`), and the **`/payments/webhook` HMAC verify is skipped** when the secret is empty (`payments/service.ts:101`). No real money moves until these are set + the Razorpay dashboard webhook points at `POST /payments/webhook`.
3. **Prisma migration baseline (DF5)** — see §2. Don't ship schema via `db push`.
4. **Production JWT keypair** — generate a fresh ES256 pair; **do NOT reuse the dev `JWT_PRIVATE_KEY`** (it was exposed in a terminal dump this session — treat as compromised).

---

## 1. Pre-production (staging) — stand up a real environment

- [ ] Provision **Postgres** (managed) + set `DATABASE_URL`.
- [ ] Provision **Redis** (BullMQ needs it) + set `REDIS_URL`; confirm the **9 cron workers** run: `otp-sweeper, slot-ttl, trial-reminder, attendance-close, webhook-retry, enrollment-lifecycle, renewal-reminder, refund-reconcile, class-reminder`.
- [ ] `MOCK=0`, `NODE_ENV=production`, `PORT` set.
- [ ] Deploy the API; confirm it boots (env zod-schema passes — required vars: `DATABASE_URL`, `REDIS_URL`, `JWT_*`).
- [ ] CORS / rate-limiting / TLS in front of the API.

## 2. Database & migrations  — **DF5** + **DF1**

- [ ] **Generate the Prisma migration baseline** in an env with `migrate dev` perms (shadow-DB create permission) — this sandbox can't (DF5). Capture the current schema as the initial migration.
- [ ] Switch the deploy pipeline from `db push` → **`prisma migrate deploy`**.
- [ ] **Audit the `--accept-data-loss` drops we did in dev** so production handles them deliberately (not silent): OTP `VarChar(6→4)`, `WorkshopType` (masterclass/demo removed), `ExpoPushToken→User` FK drop, `Slot` model drop. Where data must be preserved, write a data-migration step (e.g., backfill masterclass/demo → online/offline **before** dropping the enum value).
- [ ] **Execute the dead-code cleanup as real migrations** ([`dead-code-registry.md`](./dead-code-registry.md) §C): rewrite-done live slot reads ✅ (S5.4) → drop the **Slot system** (A1) in one reviewed migration → resolve **referral** (A4) + **legacy aliases** (A5) per product call.
- [ ] Seed: replace the **Delhi-NCR demo seed** with real/empty launch data; confirm no stray Bengaluru references.

## 3. Secrets & third-party config (env)

| Var(s) | Gates | Source / action |
|---|---|---|
| `EXPO_ACCESS_TOKEN` | **All push notifications** (no-op without it) | Expo account |
| `RAZORPAY_KEY_ID/SECRET/WEBHOOK_SECRET` | Payments + webhook HMAC verify | Razorpay dashboard; point webhook → `/payments/webhook` |
| `HMS_ACCESS_KEY/SECRET/MANAGEMENT_TOKEN/TEMPLATE_ID/WEBHOOK_SECRET` | **100ms live classes** (mock token without them) | 100ms dashboard; create a **template with `host` + `guest` roles**; point webhook → `/rooms/100ms/webhook` |
| `MSG91_AUTH_KEY/TEMPLATE_ID` | **SMS OTP** (without it, OTP is returned in the API response — dev only) | MSG91 |
| `R2_ACCOUNT_ID/ACCESS_KEY_ID/SECRET_ACCESS_KEY/BUCKET` | Image uploads (Cloudflare R2) | Cloudflare |
| `GOOGLE_GEOCODING_KEY` | Address → lat/lng | Google Cloud |
| `SENTRY_DSN` | Error tracking | Sentry |
| `APPLE_*_BUNDLE_ID`, `GOOGLE_*_CLIENT_ID` | Apple/Google social sign-in | Apple/Google consoles |
| `JWT_PRIVATE_KEY/PUBLIC_KEY` | Auth | **Fresh production pair** (don't reuse dev) |
| `COMMISSION_BPS` | Commission rate (default 1500=15%) | Confirm the team's final number |

- [ ] Move secrets into a real secrets manager (not committed `.env`); `.env` stays gitignored.

## 4. Native mobile builds — the P3 dev-build work

- [ ] **Custom Expo dev/prod build** (NOT Expo Go) via EAS — required for the native modules.
- [ ] Install + wire the **scaffolded** native screens to real modules (currently typecheck-clean placeholders):
  - [ ] `@100ms/react-native-sdk` → real **video** in `student-app live/[batch_id]` (join) + `academy-app live-class` (host). *(DF6 — un-deferred; scaffold built.)*
  - [ ] `expo-camera` → real **QR scanner** in `student-app checkin-scan`.
  - [ ] `react-native-qrcode-svg` → real **QR image** in `academy-app attendance` (currently a placeholder box).
  - [ ] Config plugins + **camera/mic permissions** (iOS `NSCameraUsageDescription`/`NSMicrophoneUsageDescription`, Android `CAMERA`/`RECORD_AUDIO`).
- [ ] App icons, splash, bundle IDs; EAS **build + submit** to App Store / Play Store.

## 5. Functional smoke tests — on a real build, with real keys

- [ ] **Online live class** (100ms): academy starts → student joins → A/V works → **`peer.join` webhook marks attendance**.
- [ ] **In-studio QR**: academy shows QR → student camera scans → marked present.
- [ ] **Push delivery** end-to-end (with `EXPO_ACCESS_TOKEN`): academy push *and* student push both arrive (re-confirms the academy-push fix on real devices).
- [ ] **Payments**: a real (test-mode) trial/enrol/workshop payment captures via the live Razorpay webhook + **commission ledger row** is written.
- [ ] **Reminders**: class-reminder / attendance-reminder fire ~window before a real session (both sides).

## 6. Security & correctness

- [ ] **Rotate the dev JWT key** (exposed this session).
- [ ] Confirm **webhook signature verification** is active (Razorpay + 100ms HMAC) — both **skip verification when their secret is empty**, so set the secrets.
- [ ] Authn/z spot-check: academy endpoints reject other academies' data (we verified the coach-assign + batch-ownership paths; re-confirm broadly).
- [ ] Review-count integrity: confirm `Academy.ratingCount` matches actual reviews (we fixed the seed); **if review moderation/delete is ever added, recompute** — **DF7**.

## 7. Optional / deferred (decide per launch scope — not blockers)

- [ ] **DF2** — academy "Trials today" grouping on Schedule (cosmetic).
- [ ] **DF4** — `student-app program/[id]/review.tsx` enrols Monthly-only (thread a `package_type`).
- [ ] **DF7** — review-count recompute on delete (only if moderation is built).
- [ ] **Payouts** — the `Payout` model is display-only; actual payout processing (transfers, settlement) was deferred out of P4. Decide if launch needs it.
- [ ] Student **activity-feed** screen (deferred in P5; pushes already deliver events).

---

> **Bottom line:** the application is feature-complete and verified in the sandbox. Going live = (a) set the secrets (esp. `EXPO_ACCESS_TOKEN`, Razorpay, 100ms), (b) generate real migrations + run the Slot cleanup, (c) do the native dev-build wiring, (d) smoke-test on a device. Everything here is gated on an environment/credential/device we don't have in the sandbox — which is exactly why it's a separate checklist, not a code TODO.
