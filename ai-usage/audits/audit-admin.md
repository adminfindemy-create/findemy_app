# Admin App Audit — 2026-05-17

## Summary
- P0 count: 2
- P1 count: 8
- P2 count: 14 (aggregated)

## P0 Issues (must fix)

| # | Screen | Mockup section | Gap | File to modify |
|---|--------|----------------|-----|----------------|
| 1 | AUTH — STUDIO LOGIN | Line 619 | Auth flow broken: index.tsx redirects to `/(auth)/login` but `_layout.tsx` in (auth) group exists; login.tsx exists but entire onboarding surface missing (no signup, no OTP verification UX from line 730). App crashes on cold start for unauthenticated users. | `apps/admin/app/index.tsx` + build full auth stack |
| 2 | BATCH DETAIL / ATTENDANCE | Line 1314 | Batch detail screen is missing entirely. No file `apps/admin/app/batches/[id].tsx` implementing the mockup card UI (lines 1350–1400: batch-hero, badge, meta-row, attend-tabs, attend-summary, roster). The tab navigation for "Sessions", "Pending", "Attended" (line 1401–1420) is absent. | Create `apps/admin/app/batches/[id].tsx` |

## P1 Issues (should fix)

| # | Screen | Mockup section | Gap | File to modify |
|---|--------|----------------|-----|----------------|
| 1 | INBOX HOME | Line 783–850 | Stats strip missing "upcoming" stat; only shows "TODAY'S TRIALS" (code shows 3-column grid but mockup line 804–817 uses relative layout). Trial card footer UI (lines 2821–2830: "No one accepted yet" / OTP button flow) missing. | `apps/admin/app/(tabs)/inbox.tsx` |
| 2 | SCHEDULE WEEK | Line 1169–1311 | Week view tabs for "Sessions", "Pending", "Attended" (line 1401–1420 mockup CSS) missing. Publish button (line 1193–1200) is a text button "Publish slots" not a styled circular button. Category color borders (lines 1275–1278) are not fully implemented in batch-pill rendering. | `apps/admin/app/(tabs)/schedule.tsx` |
| 3 | STUDENTS LIST | Line 1646–1732 | Search bar filter icon styled as solid button (line 1686–1691) but code uses simple text icon. Category chip tabs (lines 1693–1702) showing CATEGORIES but mockup implies dynamic filtering. Student row sub-text missing separator dots and category badges. | `apps/admin/app/(tabs)/students.tsx` |
| 4 | STUDENT DETAIL | Line 1735–1795 | Entire dark-top gradient (line 2528–2529 pattern) with dark header missing. Avatar and top section styling uses plain Card instead of styled hero block. Missing action buttons (WhatsApp icon button line 1793 `.wa` class). Stats blocks for trials/enrollments missing visual hierarchy. | `apps/admin/app/students/[id].tsx` |
| 5 | REVIEWS LIST | Line 1876–1975 | Review summary card (lines 1903–1953: big rating, stars, bars) missing entirely. Tab filtering (lines 1955–1975) exists but visual style differs (should use pill-tabs with white on dark ink when active). Review card layout needs stars and breakdown bars. | `apps/admin/app/reviews.tsx` |
| 6 | BATCH EDIT | Line 1490–1589 | Day toggle row (lines 1543–1564) not visible in form; batch edit screen is minimal. Mode toggle cards (lines 1566–1589) for online/offline selection missing. Field groups and spacing don't match mockup hierarchy. | `apps/admin/app/batches/new.tsx` (or extend [id].tsx) |
| 7 | SETTINGS | Line 2628–2727 | Settings list structure present but missing sections for "Notifications & Preferences" like Reels notifications (out of scope but referenced). "Payout info" section missing; should show bank details card. Signout button styling correct but layout differs (margins/spacing). | `apps/admin/app/(tabs)/settings.tsx` |
| 8 | PUBLISH AVAILABILITY | Line 2738–2787 | Week strip (2747–2758) and day picker (2748–2758) UI minimal; implementation is text-based. Publish grid (2764–2776) for hourly slots missing visual design. Slot drawer (2778–2787) for editing slots not implemented. Floating BottomSheet for slot editor absent. | `apps/admin/app/schedule/publish.tsx` |

## P2 Issues (aggregate)
- Inbox trial card styling: missing urgent badge variation (line 828–835 `.urgent` class); meta fields layout differs slightly in spacing.
- Earnings screen: dark top gradient present but earnings tabs styling slightly different (line 2228–2245 CSS vs code pill-style); delta text color mismatch.
- Profile edit: cover image upload UI (line 2394–2414 `.cover-edit`) missing; "verified pill" (line 2415–2429) absent. Avatar edit (line 2444) styled differently.
- Studio menu: avatar styling present; icon colors for menu items (lines 2605–2607) hardcoded rather than using semantic theme tokens.
- Coaches list: minimal implementation matches mockup; no "new coach" flow implementation gaps noted.
- Trial detail: quick buttons (line 1073–1091 `.quick-row` / `.quick-btn`) not present; Call/WhatsApp buttons use standard UI not inline grid.
- Attendance OTP: screen structure correct; cosmetic: lockout messaging (line 41) differs slightly from design.
- Batch list: status badge (line 1420) uses Spill component; visual consistency with mockup acceptable but could be more aligned.
- Reviews respond: textarea styling acceptable; missing "tone chips" (line 2110–2131) for suggested responses (Gracious, Constructive, etc.).
- Schedule: batch category colors hardcoded; mockup lines 1275–1278 define music/dance/arts/yoga border colors but implementation uses const CATEGORY_COLORS.
- Workshop management: not in scope audit but file exists minimally; mockup lines 2838+ suggest Workshop create/edit screens not yet designed.

## Notes
- **Critical path blocker:** Auth flow is completely broken. Unauthenticated users cannot log in; redirect to non-existent route. This must be fixed before any user testing.
- **Batch detail missing:** The batch detail screen (tap on a batch from schedule/batches list) is **completely absent**. This is a major navigation gap — users cannot view or edit batch details.
- **Design consistency:** Overall layout structure matches (dark-top sections, card-based lists, bottom nav), but many detail-level CSS classes from the mockup (`.batch-hero`, `.attend-summary`, `.rev-summary`, etc.) are not implemented, resulting in lower visual fidelity.
- **Scope note:** Reels and Leaderboard touches correctly omitted per spec (notifications around line 3304, settings toggles around 4472–4480).
- **File organization:** Implementation uses a `Screen` wrapper component (not in mockup) which handles safe area and bottom tab display — this is a reasonable abstraction but adds a layer of indirection when comparing code to mockup.

