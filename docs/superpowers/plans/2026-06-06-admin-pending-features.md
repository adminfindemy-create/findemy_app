# Admin Pending Features — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (inline) to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax. **No git commits** (Findemy stays local) — the "Commit" step in the standard template is replaced by "Typecheck/Test gate" here.

**Goal:** Close every functional + visual gap between the `ai-usage/admin.html` prototype and the `apps/admin` Expo app, full-stack.

**Architecture:** Contract-first. `packages/types` → `packages/api-client` → `apps/api` (route → service → repo, Prisma) → `apps/admin` (Expo Router screens + `src/components`, `src/hooks` React Query). Trials stay auto-confirmed.

**Tech Stack:** TypeScript, Fastify + Prisma + zod + vitest (api), React Native / Expo Router + zustand + @tanstack/react-query (admin), pnpm workspaces + turbo.

**Spec:** `docs/superpowers/specs/2026-06-06-admin-pending-features-design.md`

**Verification commands (no git):**
- types/client: `pnpm --filter @findemy/types build && pnpm --filter @findemy/api-client build`
- api tests: `pnpm --filter @findemy/api test -- --run`
- api types: `pnpm --filter @findemy/api typecheck` (baseline: 31 known errors — must not exceed)
- admin types: `pnpm --filter @findemy/admin typecheck` (capture baseline first; must not regress)

**Baseline gate:** Before Phase 0, run all typecheck commands and record error counts in `docs/superpowers/plans/.baseline.txt`. Every later gate compares against it.

---

## Phase 0 — Shared contract & migrations

### Task 0.1: Capture baselines
- [ ] Run each verification command above; write counts to `docs/superpowers/plans/.baseline.txt`.

### Task 0.2: Expand shared types
**Files:** Modify `packages/types/src/index.ts`

- [ ] Replace `Settings` with:
```ts
export type NotificationChannelPrefs = { push: boolean; email: boolean; whatsapp: boolean };
export type Settings = {
  notifications: {
    new_trial: NotificationChannelPrefs;
    classes: { reminder_30min: boolean; attendance_reminder: boolean };
    reviews_activity: { new_review: boolean; leaderboard: boolean; reels: boolean };
    quiet_hours: { enabled: boolean; start: string; end: string };
  };
  privacy: { show_phone: boolean };
  contact: { email?: string; whatsapp?: string };
};
```
- [ ] Extend `Review`:
```ts
export type Review = {
  id: string; student_name: string; rating: number; comment?: string;
  response?: string; created_at: string; responded_at?: string;
  batch_title?: string; session_count?: number; flagged?: boolean;
};
export type ReviewsSummary = {
  average: number; count: number;
  breakdown: Record<1 | 2 | 3 | 4 | 5, number>; needs_reply: number;
};
```
- [ ] Replace `EarningsData`:
```ts
export type EarningsPeriod = 'week' | 'month' | 'year';
export type EarningsTxn = { id: string; label: string; kind: string; dir: 'in' | 'out'; amount_paise: number; at: string };
export type EarningsData = {
  period: EarningsPeriod; total_paise: number; delta_paise: number;
  by_category: { category: string; captured_paise: number; count: number }[];
  by_batch: { batch_id: string; batch_title: string; captured_paise: number; count: number }[];
  transactions: EarningsTxn[];
  payouts: { id: string; amount_paise: number; status: string; paid_at?: string; bank_last4?: string; bank_name?: string }[];
};
```
- [ ] Add activity + trial detail:
```ts
export type ActivityItem = {
  id: string; kind: 'trial_done' | 'review' | 'enrollment' | 'workshop_reg';
  icon_tone: 'jade' | 'marigold' | 'persimmon' | 'rose';
  title: string; subtitle?: string; at: string;
  action?: { label: string; route: string };
};
export type TrialDetail = Trial & {
  note?: string; payment_method?: string; distance_km?: number;
};
```
- [ ] Extend `Workshop.status` union to include `'draft'`; add `status` to `CreateWorkshopRequest`:
```ts
status: z.enum(['draft', 'upcoming']).optional(),
```
- [ ] Add `timings` to batch create/update via a shared zod schema:
```ts
export const BatchTimingInput = z.object({
  day_of_week: z.number().int().min(0).max(6),
  start_time: z.string(),
  duration_min: z.number().int().min(15).max(480),
});
export type BatchTimingInputType = z.infer<typeof BatchTimingInput>;
```

### Task 0.3: Prisma schema + migration
**Files:** Modify `apps/api/prisma/schema.prisma`; create migration.
- [ ] Read `model AcademySettings` and `model Workshop`. Add to `AcademySettings`: `notificationPrefs Json?`, `quietHoursEnabled Boolean @default(false)`, `quietStart String?`, `quietEnd String?`, `contactEmail String?`, `contactWhatsapp String?`. Confirm `Workshop.status` is a `String` (if enum, add `draft`).
- [ ] Run `pnpm --filter @findemy/api prisma:migrate` (name: `admin_pending_features`). If the dev DB blocks, fall back to `prisma db push`. Run `prisma generate`.
- [ ] Gate: `prisma generate` succeeds; `pnpm --filter @findemy/api typecheck` ≤ baseline.

### Task 0.4: Update api-client signatures
**Files:** Modify `packages/api-client/src/index.ts`
- [ ] Import new types. Change `studio.earnings.get` to accept `{ period?: EarningsPeriod }`. Add under `studio`: `activity: { list: () => request<{ items: ActivityItem[] }>("GET","/studio/activity") }`. Under `studio.reviews` add `summary: () => request<ReviewsSummary>("GET","/studio/reviews/summary")` and allow `list(query)` filter. Under `studio.trials` add `markNoShow: (id) => request("POST", \`/studio/trials/${id}/no-show\`, {})`. Type `studio.trials.get` return as `{ trial: TrialDetail; student: StudentSnapshot }`. Type `studio.settings.get/update` with `Settings`. Type `studio.reviews.list` as `{ items: Review[]; summary?: ReviewsSummary; next_cursor: string|null }`.
- [ ] Gate: `pnpm --filter @findemy/types build && pnpm --filter @findemy/api-client build` pass.

---

## Phase 1 — Trial + Inbox

**Files (BE):** `apps/api/src/modules/studio/{routes,service,repo}.ts`; `apps/api/src/modules/trials/*` (no-show is studio trial). **Test:** `apps/api/src/test/trials.test.ts` (+ new `studio-activity.test.ts`).
**Files (FE):** `apps/admin/app/(tabs)/inbox.tsx`, `apps/admin/app/trial/[id].tsx`, `apps/admin/src/components/InboxCard.tsx` (wire or delete dead code), new `apps/admin/src/components/ActivityRow.tsx`, `apps/admin/src/hooks/useStudioQueries.ts`.

### Task 1.1 (BE): activity feed
- [ ] TEST `studio-activity.test.ts`: authed academy GET `/studio/activity` returns `items` array; an attended trial appears as `kind:'trial_done'`. Run → fail.
- [ ] Implement `repo.getActivity(academyId)` unioning recent: attended Trials, Reviews, Enrollment starts, WorkshopRegistrations → map to `ActivityItem` with `action` routes. `service.getActivity`. Route `GET /studio/activity`. Run → pass. Typecheck gate.

### Task 1.2 (BE): enrich trial detail
- [ ] TEST: `/studio/trials/:id` includes `note`, `mode`, `scheduled_at`, `payment_method`. Run → fail.
- [ ] Extend `service.getTrialDetail` + repo select to return those fields (note from Trial/Booking; payment_method from Payment if present). Run → pass. Gate.

### Task 1.3 (FE): inbox queries + cards
- [ ] Add `useStudioActivity()` query hook. Render Recent Activity section via `ActivityRow` (icon tone, title, subtitle, action button → `router.push(action.route)`).
- [ ] Trial cards: auto-confirmed pill, relative time (`timeAgo`), level, schedule + ₹price subline, "Mark attendance →"; urgent variant (within 2h) + now-row highlight; earnings-mini delta from dashboard `earnings_summary`; bell unread dot from `inbox_counts.new`; today's-classes student count + coach.
- [ ] Gate: `pnpm --filter @findemy/admin typecheck` ≤ baseline.

### Task 1.4 (FE): trial detail fidelity
- [ ] Header: time title + CONFIRMED badge. Hero: distance. KV rows (Batch / When / Mode / Pays). Note card (dashed persimmon). Trial-source pill. Auto-confirmed pill by CTA.
- [ ] Gate: admin typecheck ≤ baseline.

---

## Phase 2 — Batch hub + scheduling edit

**Files (BE):** `studio/routes.ts` (BatchCreate/Update schemas + `timings`), `studio/service.ts` (`createBatch`/`updateBatch` write `BatchTiming`; `getBatch` aggregate; roster), `attendance` module (3-state). **Test:** `apps/api/src/test/attendance.test.ts`, new `batch-timings.test.ts`.
**Files (FE):** new `apps/admin/app/batches/[id]/index.tsx` becomes the **hub** (currently edit form) — split: keep edit at `batches/[id]/edit.tsx`, make `[id]/index.tsx` the hub; or add tabs within `[id]/index.tsx`. Decide at execution. `batches/[id]/attendance.tsx`, `batches/new.tsx`.

### Tasks (expand TDD at execution):
- [ ] 2.1 BE: `timings` accepted in BatchCreateSchema/BatchUpdateSchema (drop `.strict()` conflict by adding field); service replaces `BatchTiming` rows in a txn. Test create+update round-trip.
- [ ] 2.2 BE: `getBatch` returns hero meta + roster (per-student session count, enrolled_at, is_trial). Test shape.
- [ ] 2.3 BE: attendance supports 3 states — extend mark body to `{ marks: {user_id, state:'present'|'absent'}[] }`; unmarked = pending. Test.
- [ ] 2.4 FE: batch hub — dark hero, tabs (Today/Upcoming/Roster/Edit), summary pills, rich roster, 3-state checkbox, "Save · N of N marked".
- [ ] 2.5 FE: batch edit — DAYS toggle row, start/end TIME fields, mode cards (location / Zoom link), price tiles, instructor picker, Pause danger row (status→inactive) distinct from Delete.
- [ ] Gates after BE (api test + typecheck) and FE (admin typecheck).

---

## Phase 3 — Availability / slots

**Files (BE):** `apps/api/src/modules/slots/{routes,service}.ts`. **Test:** new `slots-grid.test.ts`.
**Files (FE):** `apps/admin/app/schedule/publish.tsx`.
- [ ] 3.1 BE: extend `PublishSchema` to also accept `slots: { date, time, capacity }[]` (back-compat with `dates`). Service creates per-time Slots with capacity. Test.
- [ ] 3.2 FE: week strip w/ off-day state; per-day time-slot grid (empty `+`/booked/open from `batches.getSlots`); bottom-sheet editor (time + max-trials stepper, publish/remove); "Same as last week" template chip.
- [ ] Gates.

---

## Phase 4 — Attendance OTP

**Files (BE):** trials/studio no-show (added in 0.4 client; implement route+service). **Test:** `trials.test.ts`.
**Files (FE):** `apps/admin/app/attendance-otp.tsx`.
- [ ] 4.1 BE: `POST /studio/trials/:id/no-show` → trial.status `missed`. Test.
- [ ] 4.2 FE: session recap card (avatar, "Trial · subject · level", NOW spill, date/time range); "Couldn't verify · mark no-show" button → markNoShow → back.
- [ ] Gates.

---

## Phase 5 — Reviews

**Files (BE):** `studio/{routes,service,repo}.ts`. **Test:** new `studio-reviews.test.ts`.
**Files (FE):** `apps/admin/app/reviews.tsx`, `apps/admin/app/reviews/[id]/respond.tsx`.
- [ ] 5.1 BE: `GET /studio/reviews/summary` (average, count, breakdown, needs_reply). Test.
- [ ] 5.2 BE: `GET /studio/reviews?filter=all|needs_reply|replied|5|lte3` + meta (created_at, batch_title, session_count, responded_at, flagged). Test.
- [ ] 5.3 FE list: summary card (big rating, 5-star, count, bars); filter tabs incl alert "Needs reply · N", 5★, ≤3★; flagged card; meta line; dated reply block.
- [ ] 5.4 FE respond: review meta line; tone chips (Suggest reply/Apologize/Explain/Invite back) seeding textarea; tip card; pre-filled draft.
- [ ] Gates.

---

## Phase 6 — Earnings

**Files (BE):** `studio/{routes,service,repo}.ts`. **Test:** new `studio-earnings.test.ts`.
**Files (FE):** `apps/admin/app/earnings.tsx`.
- [ ] 6.1 BE: `GET /studio/earnings?period=` → total, delta vs prev period, by_category (trial/monthly/workshop from Payment/WorkshopPayment/EnrollmentPayment), transactions (signed incl platform-fee out), payout date + bank_last4. Test each period.
- [ ] 6.2 FE: period selector (Week/Month/Year + label), delta indicator, category breakdown, transactions list (+/−), payout card w/ calendar + bank + chevron.
- [ ] Gates.

---

## Phase 7 — Studio menu / Profile / Settings

**Files (BE):** `studio/routes.ts` `SettingsUpdateSchema` (granular), `studio/service.ts` get/update settings mapping to `notificationPrefs`; `AcademyUpdateSchema` + service for tagline/specialities. **Test:** new `studio-settings.test.ts`.
**Files (FE):** `apps/admin/app/(tabs)/studio.tsx`, `apps/admin/app/profile/edit.tsx`, `apps/admin/app/(tabs)/settings.tsx`. New `apps/admin/app/verification.tsx` (KYC stub), `apps/admin/app/support.tsx` optional.
- [ ] 7.1 BE: granular settings round-trip (read defaults, partial update, persisted). Map legacy fields for back-compat. Test.
- [ ] 7.2 BE: academy tagline + specialities fields. Test.
- [ ] 7.3 FE studio menu: rating subtitle, row sub-values, KYC row, ACCOUNT + SUPPORT sections, sign-out + version footer.
- [ ] 7.4 FE settings: granular notification sections (channels, class reminders, attendance, reviews/leaderboard/reels, quiet hours), channel subs, payout-info card.
- [ ] 7.5 FE profile edit: cover image + verified pill, name card, field rows (tagline/about/address/contact), specialities chips.
- [ ] Gates.

---

## Phase 8 — Workshops

**Files (BE):** `apps/api/src/modules/workshops/{routes,service}.ts`. **Test:** new `workshops-draft.test.ts`.
**Files (FE):** `apps/admin/app/(tabs)/workshops.tsx`, `apps/admin/app/workshops/new.tsx`, `apps/admin/app/workshops/[id].tsx`.
- [ ] 8.1 BE: create accepts `status:'draft'|'upcoming'`; publish transition (update status draft→upcoming). `live` derived helper in responses. Test draft create + publish.
- [ ] 8.2 FE list: Upcoming / Live / Past tabs, status pills (incl "Live soon"), duration + location/mode meta, free-vs-capped count.
- [ ] 8.3 FE create/edit: native date/time pickers (`@react-native-community/datetimepicker` — check if installed; else inline platform picker), "Save as draft" + "Publish", type 2×2 icon grid.
- [ ] Gates.

---

## Phase 9 — Login polish

**Files (FE):** `apps/admin/app/(auth)/login.tsx`.
- [ ] 9.1 "Studio" pill badge in brand row; OTP-security helper line (shield + "OTP-only sign in · one login per academy"); WhatsApp trial-alerts footer tip card.
- [ ] Gate: admin typecheck ≤ baseline.

---

## Self-review notes
- Spec coverage: every spec phase → plan phase 0–9. ✓
- Type consistency: `Settings`, `EarningsData`, `Review`, `ReviewsSummary`, `ActivityItem`, `TrialDetail`, `BatchTimingInput` defined in Task 0.2 and referenced consistently in 0.4 + later phases. ✓
- Phases 2–9 list tasks with file maps + key signatures; bite-sized TEST/IMPL/RUN steps expanded at execution (later phases depend on earlier outcomes). Phase 0–1 fully specified.
- Dropped (no data model): trial accept/decline, slot instrument/level. Documented in spec.
