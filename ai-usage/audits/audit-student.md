# Student App Audit — 2026-05-17

## Summary
- P0 count: 2
- P1 count: 7
- P2 count: 2 (aggregated)

## P0 Issues (must fix)

| # | Screen | Mockup section | Gap | File to modify |
|---|--------|----------------|-----|----------------|
| 1 | BOOKING - Payment Method Selection UI | Line 2356–2401 | Mockup shows payment method selection (Wallet, Card, Razorpay, UPI) with radio buttons and selected state. Implementation in `pay.tsx` (lines 1–141) skips directly to Razorpay checkout without showing method options. User cannot see or choose payment method before proceeding. | `apps/student/app/booking/pay.tsx` |
| 2 | INTERESTS SCREEN - Grid Layout Mismatch | Line 936–978 | Mockup specifies 2-column grid (`grid-template-columns: 1fr 1fr`). Implementation uses 3-column flex layout (`width: "31%"`). Cards on-screen don't match mockup proportions and arrangement. | `apps/student/app/(auth)/interests.tsx` line 175 |

## P1 Issues (should fix)

| # | Screen | Mockup section | Gap | File to modify |
|---|--------|----------------|-----|----------------|
| 1 | SPLASH SCREEN | Line 620–712 | Mockup shows full splash with Findemy serif wordmark (78px), loading progress bar, grid background, footer tag. No `splash.tsx` found in codebase. App skips directly to auth flow. | Create `apps/student/app/splash.tsx` with visible loading state or integrate into root `_layout.tsx` |
| 2 | AUTH - Screen Consolidation | Line 808–913 | Mockup shows single "Login / Signup" screen with tab segmented control. Implementation splits into `(auth)/index.tsx` (welcome), `login.tsx`, and `signup.tsx`. Mockup design expects unified screen; current implementation has separate routes. | Consolidate `index.tsx`, `login.tsx`, `signup.tsx` into single auth screen or add tab selector at welcome |
| 3 | ONBOARDING - Visual Carousel Missing | Line 715–806 | Mockup shows onboarding art carousel (4-tile grid with category images, kicker "Discover", heading with italic accent, pagination dots). Implementation has form-only (`name`, `age`, `location` fields). Entire visual carousel section missing. | `apps/student/app/(auth)/onboarding.tsx` — add visual art carousel before or above form |
| 4 | BOOKING CONFIRMATION - Ticket Card Detail | Line 2458–2505 | Mockup shows full booking ticket: academy thumbnail, dashed border divider, two-column footer (date, location, instructor, price, etc.), perforated edges. Implementation shows minimal confirmation (checkmark icon + brief text). Ticket card with full details missing. | `apps/student/app/booking/confirmation.tsx` |
| 5 | TRIAL DETAIL - Missing "Trial Today" View | Line 3028–3064 | Mockup shows separate "Trial Today" screen (day-of experience) with: large OTP display, countdown timer to start, location/academy info, 3-action button grid (Reschedule, Cancel, Share). Implementation in `trials/[id].tsx` has basic info but no countdown or dedicated "today" view. | Create `apps/student/app/trials/today.tsx` or extend `[id].tsx` with conditional "today" render branch |
| 6 | POST-TRIAL REVIEW - Decision Buttons Missing | Line 3086–3092 | Mockup shows post-review decision UI with buttons: "Try More", "Enroll Now", "Not Interested". Implementation in `post-trial/index.tsx` has star rating + comment but no follow-up decision buttons. User has no next action after submitting review. | `apps/student/app/post-trial/index.tsx` |
| 7 | PROFILE - Stats & Badges Section | Line 2849–2960 | Mockup shows profile with large stats grid (4-column: trials, classes, rating, rank), dark header, and badges grid. Implementation renders stats but layout/styling may differ (cosmetic). Reels section correctly omitted per scope. | `apps/student/app/(tabs)/profile.tsx` — verify stats display matches mockup proportions |

## P2 Issues (aggregate)
- **Typography fine-tuning**: Mockup uses Instrument Serif italic for accent text at sizes 22–78px; implementation follows serif pattern but font weights, line heights, and italic styling may have 1–2px variance. Acceptable cosmetic variance.
- **Color token consistency**: Implementation uses some hardcoded hex values (e.g., `#000` in login, direct color refs) instead of centralizing all colors via theme tokens. Mockup expects unified color system.
- **Shadow & elevation**: Mockup defines sh-sm, sh-md, sh-lg shadow tokens; implementation approximates with inline shadows. Depth perception slightly different but functionally acceptable.

## Notes
- **Out-of-scope correctly handled**: Reels, Create Reel, and Leaderboard tabs excluded as required. Three-tab nav bar (Explore, Events, Profile) is correct per requirements.
- **Auth architecture choice**: Implementation uses Expo Router `(auth)` group with separate screens. Mockup shows single unified auth screen. Both approaches valid; current implementation is also standard pattern.
- **Booking flow**: Slot selection → Payment summary (without method picker) → Confirmation. Mockup expects method selection before final payment. Current flow works but skips user choice visibility.
- **Trial views**: Mockup separates "My Trial", "Trial Today", and "Post-Trial" into distinct UX. Implementation uses conditional rendering in single `[id].tsx` screen—functional but less clear separation for day-of experience.
- **Payment integration**: Uses Razorpay SDK directly. Mockup shows local method selection UI as preference layer before external payment gateway. Consider adding wallet/card UI if multiple payment methods needed later.

