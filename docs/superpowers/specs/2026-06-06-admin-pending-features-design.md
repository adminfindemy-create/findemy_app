# Admin (Academy/Studio) App — Pending Features Design

**Date:** 2026-06-06
**Scope decisions (confirmed with user):** Full-stack (extend `packages/types`, `packages/api-client`, `apps/api`, `apps/admin`). Functional **and** visual fidelity. Trials stay **auto-confirmed** (no accept/decline lifecycle).

## Goal

Close the gap between the `ai-usage/admin.html` prototype and the implemented `apps/admin` Expo app. Every prototype screen already has an implementation; what is missing are **features and visual fidelity within screens**. This spec covers all of them, decomposed into independently-shippable phases.

## Approach

Contract-first. `packages/types` is the source of truth → `api-client` signatures → `apps/api` route/service/repo → `apps/admin` UI + styling. Each phase ships backend + wiring + UI together and is verifiable on its own. Prisma migrations are batched in Phase 0.

### Constraints discovered during exploration
- **Slots are date/whole-day based.** `slots.publishSlots(academy_id, { batch_id, dates })`. The `Slot` model has `slot_time` + `capacity` + `reserved_count` but **no instrument/level metadata**. The prototype's slot-drawer instrument/level chips have no data home → **dropped**. We implement the time-slot grid + a per-slot "max trials" (= capacity) editor.
- **No activity/notification table.** The inbox Recent Activity feed is composed by unioning recent rows across `Trial`, `Review`, `Enrollment`, `WorkshopRegistration`.
- **`BatchUpdateSchema`/`BatchCreateSchema` are `.strict()` and omit `timings`.** Editing batch days/time requires adding `timings` to those schemas + service handling of `BatchTiming` rows.
- **Migrations required.** `AcademySettings` granular notification prefs + quiet hours; `Workshop.status` add `draft`.
- **Verification baseline.** Known pre-existing `tsc` errors: api 31, student 1. Admin must not regress; new API code should not add errors beyond a documented, justified set.
- **No git.** Do not commit/push (project stays local).

## Phases

### Phase 0 — Shared contract & migrations (foundation; everything depends on this)
**types** (`packages/types/src/index.ts`):
- `Settings` expanded:
  ```
  notifications: {
    new_trial: { push, email, whatsapp },
    classes: { reminder_30min, attendance_reminder },
    reviews_activity: { new_review, leaderboard, reels },
    quiet_hours: { enabled, start, end },
  }
  privacy: { show_phone }
  contact?: { email?, whatsapp? }
  ```
  (Keep back-compat: API maps old `new_trial_alerts`/`review_alerts` ⇄ new shape so the student app and existing rows keep working.)
- `EarningsData` += `period: 'week'|'month'|'year'`, `delta_paise`, `by_category: {category, captured_paise, count}[]`, `transactions: {id, label, kind, dir:'in'|'out', amount_paise, at}[]`; payout += `bank_last4?`, `bank_name?`, `paid_at?`.
- `ReviewsSummary = { average, count, breakdown: Record<1|2|3|4|5, number>, needs_reply: number }`.
- `Review` += `created_at`, `batch_title?`, `session_count?`, `responded_at?`, `flagged?` (rating ≤ 3 && no response).
- `ActivityItem = { id, kind, icon_tone, title, subtitle?, at, action?: { label, route } }`.
- `Workshop.status` += `'draft'`; `CreateWorkshopRequest` += `status?: 'draft'|'upcoming'` (publish vs draft).
- Batch create/update += `timings?: BatchTiming[]`.
- `Trial` detail fields: `note?`, `source?`, `mode`, `payment_method?`, `scheduled_at`, `distance_km?`.

**api-client** (`packages/api-client/src/index.ts`): update affected signatures; add `studio.activity.list()`, `studio.reviews.summary()`, `studio.earnings.get({period})`, richer `slots.publish` body, `studio.trials` no-show.

**Prisma** (`apps/api/prisma/schema.prisma` + migration):
- `AcademySettings`: add `notification_prefs Json?`, `quiet_hours_enabled`, `quiet_start`, `quiet_end`, `contact_email`, `contact_whatsapp`.
- `Workshop.status`: allow `draft` (string field or enum extension).
- Run `pnpm --filter @findemy/api prisma migrate dev`.

### Phase 1 — Trial + Inbox (highest impact)
**BE:** new `GET /studio/activity` (unioned recent feed with `action` hints); enrich `GET /studio/trials/:id` to include note, source, mode, payment_method, scheduled time, distance.
**FE — inbox:** trial cards show auto-confirmed pill, relative time, level, schedule + price subline, "Mark attendance →"; urgent variant + now-row highlight; **Recent Activity feed** section with per-row action buttons (Invite to enroll, Respond, …); earnings-mini delta line; bell unread dot; today's-classes student count + teacher name.
**FE — trial detail:** header time + CONFIRMED badge; hero distance; KV rows (Batch / When / Mode / Pays); note card; trial-source pill; auto-confirmed pill by CTA.

### Phase 2 — Batch hub + scheduling edit
**BE:** add `timings` to batch create/update (replace `BatchTiming` rows); batch-detail aggregate (hero meta + roster with per-student session/enrolled-date/trial flag); 3-state attendance (present / absent / pending/unmarked).
**FE — batch hub:** dark hero (status badge, title, meta row), tabs (Today / Upcoming / Roster / Edit), attendance summary pills, rich roster rows (avatar + sub), 3-state checkbox, "Save attendance · N of N marked" CTA.
**FE — batch edit:** DAYS day-toggle row, start/end TIME fields, mode as two cards (In studio → location field / Online → Zoom link), trial+monthly+capacity as price tiles, instructor picker row, "Pause this batch" danger row (distinct from delete).

### Phase 3 — Availability / slots
**BE:** extend `publishSlots` to accept per-day time-slots with per-slot capacity (max trials) in addition to the existing date list (back-compat).
**FE:** week strip with off-day state, time-slot grid (empty `+` / booked / open), slot bottom-sheet editor (time + max-trials stepper, publish/remove), "Same as last week" template chip.

### Phase 4 — Attendance OTP
**BE:** mark-no-show endpoint (trial → `missed`).
**FE:** session recap card (avatar, "Trial · subject · level", NOW spill, date/time range); "Couldn't verify · mark no-show" fallback action.

### Phase 5 — Reviews
**BE:** `GET /studio/reviews/summary` (average, count, star breakdown, needs_reply); `GET /studio/reviews` filters (`all|needs_reply|replied|5|lte3`) + meta (date, batch_title, session_count, responded_at).
**FE — list:** summary card (big rating, 5-star, count, breakdown bars), filter tabs incl. alert-styled "Needs reply · N" + 5★ + ≤3★, flagged card styling + "Respond now — protect your rating" CTA, meta line (date · subject · sessions), dated "YOUR REPLY · <date>" block.
**FE — respond:** review quote meta line; tone/suggestion chips (Suggest reply, Apologize, Explain, Invite back) that seed the textarea; tip card; pre-filled draft.

### Phase 6 — Earnings
**BE:** `GET /studio/earnings?period=week|month|year` → total, delta vs previous period, `by_category` (trial / monthly / workshop), `transactions` (signed, incl. platform-fee out-rows), payout with date + bank last4.
**FE:** period selector ("Apr ▾" / Week·Month·Year), period label, delta indicator, category breakdown, recent transactions (signed +/−), payout card with calendar icon + bank + chevron.

### Phase 7 — Studio menu / Profile / Settings
**BE:** granular settings get/update (mapped to `notification_prefs`); academy profile fields (tagline, specialities) on `GET/PUT /studio/academy`.
**FE — studio menu:** rating subtitle (★ + review count), row sub-values/deltas, Verification/KYC row, ACCOUNT section (notifications, login phone, team access "Coming in v2"), SUPPORT section (Help & FAQ, Contact, Rate app), sign-out + version footer.
**FE — profile edit:** cover image + "Change cover" + verified pill, name card (avatar + location + pencil), field rows (Tagline, About, Address, Contact, Photos), specialities chips (+ Add).
**FE — settings:** granular notification sections with toggles (New trial: Push/Email/WhatsApp; Classes: reminder 30min / attendance reminder; Reviews & activity: new review / leaderboard / reels; Quiet hours), channel subs (email/WhatsApp), payout-info card.

### Phase 8 — Workshops
**BE:** `draft` status + publish transition; live derived (`start_at ≤ now ≤ start_at + duration`).
**FE — list:** Upcoming / Live (+ "Live soon") / Past tabs, per-card status pill, duration + location/mode meta line, free-vs-capped count display.
**FE — create/edit:** native date/time pickers (with icons), "Save as draft" + "Publish workshop", type selector as 2×2 icon grid.

### Phase 9 — Login polish
**FE:** "Studio" pill badge in brand row, OTP-security helper line (shield + "OTP-only sign in · one login per academy"), WhatsApp trial-alerts footer tip card.

## Testing & verification
- **API:** extend the existing vitest suites (`apps/api/src/test/*`) with cases for each new/changed endpoint (activity feed, batch timings, reviews summary + filters, earnings periods, granular settings round-trip, workshop draft/publish, mark-no-show).
- **Admin:** `pnpm --filter @findemy/admin exec tsc --noEmit` after each phase — must stay at 0 new errors.
- **Types/client:** `pnpm --filter @findemy/types build` + `--filter @findemy/api-client build` after Phase 0.
- Manual: smoke each touched screen against the prototype.

## Sequencing & risk
- Build in phase order. Phase 0 unblocks all others.
- Highest value: Phases 1–2. Highest risk/uncertainty: Phase 3 (slots remodel) and granular settings migration (Phase 0/7) — keep migrations additive + back-compatible.
- Checkpoint after each phase so the user can steer.

## Out of scope / explicitly dropped
- Trial accept/decline lifecycle (auto-confirm retained).
- Slot instrument/level metadata (no data model).
- Reels/Leaderboard feature surfaces beyond settings toggles (per original audit scope note).
