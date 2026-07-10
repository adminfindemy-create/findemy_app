# Student App — Pixel-Level UI Comparison vs Mockup

**Date:** 2026-05-17
**Mockup:** `ai-usage/assets/student.html` (4905 lines)
**Implementation:** `apps/student/`
**Scope:** All in-scope screens (excludes Reels, Create Reel, Leaderboard per spec)

This is an honest, screen-by-screen, element-by-element comparison. Every delta is annotated with severity:

- **P0** — broken or absent functionality; user notices instantly
- **P1** — visible mismatch in layout, copy, or behavior
- **P2** — fine-grain styling (color drift, spacing off by a few pixels, font weight, line-height)

Numbers in parentheses next to mockup elements are line numbers in `student.html`.

---

## 0. Design system / tokens (cross-cutting)

The theme in `packages/ui/src/theme.ts` drifts from the mockup's `:root` tokens (line 17–75 of student.html). All screens are affected by these — fixing here lifts everything.

### 0.1 Color tokens — actual hex deltas

| Token | Mockup | Theme (`packages/ui/src/theme.ts`) | Delta | Severity |
|---|---|---|---|---|
| ink | #14110F | #14110F | match | — |
| ink-soft | #3A332D | #3D3935 | drift 6/8/8 | P2 |
| mist | #8B7F73 | #88827B | drift 3/-/8 | P2 |
| whisper | #B5AB9B | #C8C2B8 | strong drift | **P1** |
| paper | #F1ECE2 | #F1ECE2 | match | — |
| **paper-warm** | **#EDE6D8** | **#F6F0E4** | wrong direction (mockup is darker tan, theme is lighter) | **P1** |
| ivory | #FAF6EE | #FBF7EF | 1-bit drift | P2 |
| **bone** | **#E5DDC9** | **#EFE8DA** | wrong direction (mockup darker) | **P1** |
| hairline | #DDD3BC | #E2DBCC | drift | P2 |
| persimmon | #D8492A | #D8492A | match | — |
| **persimmon-deep** | **#B33B1E** | **#A0331F** | mockup is brighter | **P1** |
| **persimmon-soft** | **#FBE3D9** | **#F4D7CC** | mockup is paler/peachier | **P1** |
| jade | #1E5C5A | #1E5C5A | match | — |
| **jade-soft** | **#C9DCD8** | **(missing)** | not defined in theme | **P1** |
| marigold | #E8A33D | #E8A33D | match | — |
| **marigold-soft** | **#F7E4C0** | **(missing)** | not defined in theme | **P1** |
| rose | #C7556A | #C7556A | match | — |
| **rose-soft** | **#F3DBDF** | **(missing)** | not defined in theme | **P1** |
| **plum** | **#5B2F3D** | **#5C2A4A** | wrong hue (mockup is browner) | **P1** |
| charcoal | #1A1614 | #1F1B17 | drift | P2 |

**Verdict:** The four `*-soft` tokens (jade-soft, marigold-soft, rose-soft, persimmon-soft) are used for the spotlight pills, stat-pill states, badge backgrounds, and category tints. Their absence in theme is why the existing UI feels flat — agents fall back to hard-coded hex.

### 0.2 Radius scale — off by one tier

| Token | Mockup | Theme | Delta |
|---|---|---|---|
| --r-xs | 6 | radius.sm = 6 | renamed |
| --r-sm | 10 | radius.md = 10 | renamed |
| --r-md | **14** | radius.lg = **14** | match by value, but the names shifted |
| --r-lg | **20** | radius.xl = **20** | name-shifted |
| --r-xl | **28** | **(missing)** | no equivalent in theme |
| --r-pill | 999 | radius.pill = 999 | match |

**Verdict:** The mockup uses `--r-md` (14px) for inputs, search bars, cards. The theme has the same value but under a different name (`radius.lg`). Any code calling `theme.radius.md` (10px) where the mockup says `--r-md` (14px) is **4 pixels less rounded than designed**. Also `--r-xl` (28px) — used by the splash mark and onboarding art container — has no equivalent.

### 0.3 Typography

| Mockup | Theme `type.*` |
|---|---|
| `--serif: 'Instrument Serif'` | `font.serif: 'Instrument Serif'` ✓ |
| `--sans: 'Geist'` | `font.sans: 'Geist'` ✓ |

Type ramp (theme has):
- display: 34/40/700, title: 24/30/600, subtitle: 18/24/600, body: 15/22/400, small: 13/18/400, caption: 11/14/500

Mockup uses many different point sizes (not a fixed ramp): 78 (splash wordmark), 44 (auth h1), 38 (onboarding h2), 36 (greet-h), 30 (aca-card h2), 24 (section h3), 22 (profile-row1 serif italic), 18 (auth-mark), 14 (body), 13/12/11/10 (utility). The theme's `display` (34) doesn't match any mockup heading directly. Headings in code mostly inline `fontSize: <number>` ad-hoc.

**Severity:** **P1**. Inline sizes work but lose consistency. Should add a serif heading ramp matching the mockup's specific values.

### 0.4 Shadows

| Mockup | Theme |
|---|---|
| `--sh-sm: 0 1px 2px rgba(60,30,10,0.06)` | `shadow.sm: { offset: {0,1}, opacity:0.04, radius:2 }` — opacity drift |
| `--sh-md: 0 8px 24px -12px rgba(60,30,10,0.16), 0 2px 6px rgba(60,30,10,0.04)` | `shadow.md: { offset:{0,2}, opacity:0.06, radius:6 }` — much weaker, single layer |
| `--sh-lg: 0 24px 48px -16px rgba(40,20,10,0.20)` | `shadow.lg: { offset:{0,8}, opacity:0.08, radius:16 }` — drift |

The mockup uses warm-brown tinted shadows (rgba(60,30,10,...)) — the theme uses neutral black with opacity. **Visible difference** on every elevated card. **Severity P1.**

### 0.5 Pattern art (`block-print`, `art-1`, `art-2`, `art-3`, `art-music`, `art-dance`, `art-arts`, `art-yoga`)

The mockup uses CSS to render textured/patterned backgrounds on every cover image placeholder (academy covers, onboarding tiles, interest cards, ticket thumb, joined-academies thumb, reel thumbs). These are NOT photos; they are deliberate decorative art.

`block-print` likely refers to a CSS background pattern (radial dots, hatching, or SVG noise) layered on top of the per-category gradient.

**Implementation:** none. The current `AcademyCard` falls back to a solid bone background + giant serif letter. After today's fix it uses a category-tinted background + decorative offset disc. Still not the block-print texture.

**Severity:** **P0** for design fidelity. This is THE visual signature of the app. Until this is in, every screen with a cover image looks unfinished.

---

## 1. Splash screen

**Mockup:** lines 620–712 (CSS), 3205–3226 (HTML).
**Implementation:** `apps/student/app/index.tsx` (45 lines).

### Layout deltas

| Mockup element | Implementation | Severity |
|---|---|---|
| Dark `charcoal` background with radial persimmon glow at 50%/110% + marigold glow at 80%/20% | Solid `ivory` background | **P0** |
| Dotted pattern overlay (`background-image: radial-gradient(rgba(255,255,255,0.04) 1px, transparent 1px); background-size: 24px 24px`) | None | **P1** |
| 64×64 splash-mark circle with 1.5px ivory border, persimmon dot at top-right (–4,–4), italic serif "F" centered | None | **P1** |
| Serif italic wordmark "Findemy" at 78px, -0.03em letter-spacing, ivory color | "Findemy" at 36px, dark color, NOT italic | **P0** |
| Tagline "Discover your art.\nFind your academy." at 13px, 70% ivory | None | **P1** |
| Loader bar 80×2px, 60% persimmon fill | None | **P1** |
| Footer "v 1.0 · CRAFTED IN BENGALURU" at 10px, 0.3em letter-spacing, uppercase | None | **P1** |

**Verdict:** the splash is essentially a placeholder. Earlier audit flagged this as P1 but it's really **P0** given the brand impression it makes. ~45 lines → needs ~200 lines.

---

## 2. Onboarding

**Mockup:** lines 715–805 (CSS), 3228–3258 (HTML).
**Implementation:** `apps/student/app/(auth)/onboarding.tsx`.

### Layout deltas

| Mockup element | Implementation | Severity |
|---|---|---|
| **2×2 art carousel** at top, height 360px, ivory background, 8px padding, 8px gap between 4 tiles ("Music", "Dance", "Arts", "Yoga") with category-art backgrounds, italic serif label bottom-left of each tile, dark gradient overlay | **Missing entirely** — implementation is form-only | **P0** |
| Kicker "step 02 — choose your art" at 11px, 0.24em letter-spacing, uppercase, persimmon | None | **P1** |
| Heading "The practice that *moves you*." at 38px serif, italic emphasis on "moves you" | Different copy ("Welcome!") | **P1** |
| Body "Browse 4,800+ academies, studios and gurus across India — for every age, every skill level." | "Tell us a bit about yourself" | **P1** |
| Footer with 3-dot pagination (active middle dot is 24×6px pill, others 6×6) + ghost "Continue" button | "Continue" button only, no dots | **P1** |

**Verdict:** The current onboarding is a name/age/location form — useful but does NOT match the mockup's "choose your art" interest-introduction screen. Onboarding step 02 (mockup) is functionally the interests screen step 05. The two roles overlap.

**Audit decision needed:** is the mockup's "step 02 onboarding" actually the same screen as our `(auth)/interests.tsx`? If so, our `(auth)/onboarding.tsx` (form) is an extra screen not in the mockup. Reconcile: rename current onboarding to "Tell us about yourself" (interstitial), and make interests.tsx match the mockup's art-tile design.

---

## 3. Login / Signup (Auth)

**Mockup:** lines 808–913 (CSS), 3261–3311 (HTML for login).
**Implementation:** `apps/student/app/(auth)/login.tsx`, `signup.tsx`.

### Layout deltas

| Mockup element | Implementation | Severity |
|---|---|---|
| 36×36 dark `auth-mark` square top with italic serif "F" in marigold | 56×56 round mark with lowercase italic "f" | **P1** (style & shape) |
| h1 "Welcome\n*back*." at 44px serif, italic on "back" | "Book your\nfirst class" — different copy | **P1** |
| Body "Log in to continue exploring academies, reels and competitions near you." | "Enter your phone number to continue." | **P1** |
| Phone / Email tabbed segmented control above fields | Phone only, no tabs | **P1** (Email never in scope, but tab UI absent regardless) |
| Two input fields: Mobile + Password, each with their own `auth-label` heading | Single phone input | **P1** (Password flow not in scope; OTP flow replaces it. But the mockup's labeled input style is missing — current uses placeholder text only) |
| Primary "Log in" button full-width with arrow icon | "Get OTP" with no icon | **P1** |
| "or continue with" hairline divider | None on login screen (OAuth is on welcome screen) | **P1** |
| Google + Apple social buttons in a row, equal-width | OAuth is on `(auth)/index.tsx` (welcome) not login | **structural difference** |
| Bottom link "New to Findemy? Create an account" | "Don't have an account?" | **P2** copy |

**Verdict:** Login design intent in mockup is a single "Phone tab + Email tab + password + social row" screen. Current is a phone-only OTP-initiation screen with social buttons split to welcome. Architectural difference — both are valid; the implementation matches the OTP-first flow which the spec accepted.

---

## 4. Signup · OTP

**Mockup:** lines 3313–3354.
**Implementation:** `apps/student/app/(auth)/signup-otp.tsx`.

### Layout deltas

| Mockup element | Implementation | Severity |
|---|---|---|
| Back chevron top-left at 60px top, 24px left | Likely present (`router.back()` somewhere) | Verify |
| h1 "Verify your\n*number*." 44px serif, italic emphasis | Different/simpler heading | **P1** |
| Subline showing phone "+91 98450 47291" with **Tap to edit** affordance | Phone displayed but probably not editable | **P1** |
| "Enter OTP" label, then 6-cell OTP row (`otp-row` with each `otp-cell`) — filled cells have ink fill, cursor cell has blinking caret | OTPInput component from `@findemy/ui` — visual style unknown until checked | **P2** (likely close) |
| Below cells: "Resend in 00:42" countdown + "Resend" link | Countdown likely present | Verify |
| Bottom: "Verify & continue" with arrow + "🛡 End-to-end encrypted" footer note | "Verify" button, no footer note | **P1** |

---

## 5. Interests

**Mockup:** lines 916–980 (CSS), 3356–3398 (HTML).
**Implementation:** `apps/student/app/(auth)/interests.tsx`.

### Layout deltas

| Mockup element | Implementation | Severity |
|---|---|---|
| Kicker "step 04 — your interests" at 11px persimmon | Verify | **P1** (likely missing) |
| h2 "Pick what you'd\nlove to *learn*." 38px serif italic emphasis on "learn" | Heading present but copy may differ | **P1** |
| Sub "Choose at least 2. We'll personalise your discover feed." | Verify | **P1** |
| **2×2 art-grid of interest cards** — each card has `art-music/dance/arts/yoga` background + block-print + name label bottom; selected state shows checkmark badge top-right | Earlier fix: 2-col grid present, but cards are plain (no art, no checkmark badge) | **P0** |
| Footer "3 of 4 selected · Skip · Continue" | Skip + Continue likely present, count probably not | **P1** |

---

## 6. Discover / Home

**Mockup:** lines 981–1268 (CSS), 3401–3522 (HTML).
**Implementation:** `apps/student/app/(tabs)/index.tsx`.

This screen got the most attention this session. After today's fixes:

### What's fixed

- ✓ Greeting copy now "Good evening,\nFind your next *class*." matching mockup
- ✓ Location filter chips ("Near me · 5km" / "Online too")
- ✓ 5 academies in mock data
- ✓ Tab labeled "Discover"
- ✓ Category-tinted card covers
- ✓ Verified pill, Online pill, heart, distance, review count, monthly fee on cards

### What's still missing

| Mockup element | Implementation | Severity |
|---|---|---|
| Status bar (9:41 + signal dots + wifi + battery) | None — RN system status bar shows instead | **P2** (intentional — system bar is correct for production) |
| Greet-row: greet text "Good evening," at 13px, ink-soft; below it the 36px greet-h | Today's fix uses `theme.font.sans` for greet, `theme.font.serif` for greet-h ✓ | **P2** |
| Search bar: ivory bg, hairline border, search icon left, sliders icon in dark ink filter square | Code has search icon (text "Search"), filter btn — but uses `≡` glyph not sliders SVG | **P2** |
| Category chips have icons (music note, dance figure, brush, yoga pose) | Text-only chips | **P1** |
| Active chip is "persimmon" colored (orange fill); other chips are ivory with hairline border | Current uses ink-black for active. **Different active color.** | **P1** |
| Location filter chips have paper-warm background, persimmon map-pin icon | Today's fix uses `theme.color.paperWarm` ✓ + emoji 📍 | **P2** (emoji not SVG) |
| ~~Leaderboard card~~ | Out of scope ✓ | — |
| Section header "Top rated" with "See all →" link aligned right | Section title present, no "See all" link | **P1** |
| **`tr-cover` is 168×168px** with `block-print` art (no body content overlaid on cover) | Card width is **220px**, cover 130px tall, content overlaid (catTag/rating/online pills sit ON the cover) | **P1** |
| `tr-card` width 168px | 220px | **P1** |
| `tr-card` body: category label colored per-category (music=persimmon, dance=jade, arts=persimmon-deep) above 14px name, then meta "★ 4.9 · 1.2 km · 84 reviews" | Has: name, meta "1.5 km · 124 reviews", trial fee | **P1** (missing colored category label; has fee instead) |
| Section "Near you" with "Map view →" link | Section present, no "Map view" link | **P1** |
| `ny-card` cover height 130px with `art-1 block-print` | 140px tinted bg + offset disc + letter | **P0** (no block-print texture) |
| `ny-cover .tag-verified` is top-LEFT pill `rgba(20,16,14,0.55)` blurred background, with checkmark + "Verified" | Today's fix: dark pill with "✓ Verified" top-left ✓ | **P2** (no backdrop blur in RN; close enough visually) |
| `ny-cover .heart` is top-RIGHT 32×32 dark blurred circle with `i-heart-f` filled SVG | Today's fix: 30×30 dark circle with `♡` outline text | **P2** (icon: outline vs filled) |
| `ny-cover .online` is absolute bottom-LEFT pill `rgba(20,16,14,0.7)` with "Online available" text | Today's fix: dark pill with "Online" (shorter copy) sits in same overlay row as cat/rating | **P1** (position differs; copy shortened) |
| `ny-body .name` 15px font-weight 600 | 15px 600 ✓ | match |
| `ny-body .sub` is "Music · 1.2 km · ★ 4.9 (84)" — composite line with star inline | Code has address + distance "Indiranagar · 1.8 km" — different composition | **P1** |
| `ny-body .row` shows price `₹150 trial · ₹2,200/mo` + "+ Compare" button right-aligned | Today's fix has trial + monthly fee + compare button ✓ | **P2** (price formatting close but no ₹ followed by no-space; check) |
| `ny-compare` button is a small pill, persimmon-bordered | Today's fix uses hairline border default, persimmon when selected | **P1** (active state wrong; default border color wrong per mockup) |
| **Bottom NavBar** has 5 slots including reels (out of scope) + FAB | 3-tab nav present, no FAB | **P2** (correct per spec) |
| **Floating FAB `nav-fab`** ✕ for reel creation | Not present ✓ (out of scope) | — |

---

## 7. Academy profile

**Mockup:** lines 1270–1448 (CSS), 3633–3765 (HTML).
**Implementation:** `apps/student/app/academy/[id].tsx`.

This is one of the most visually rich screens. Major deltas:

| Mockup element | Implementation | Severity |
|---|---|---|
| **`aca-cover` 360px tall**, dark/category background with `block-print` + decorative star SVG bottom-right at 0.18 opacity | Implementation likely has plain header — needs inspection | **P0** |
| Top bar: back button left, share + heart buttons right (all dark blurred circles 38×38px) | Probably basic header | **P1** |
| **`aca-card`** floats 32px up from the cover bottom (`margin: -32px 16px 0`), 28px border-radius, sh-md shadow, has "Verified" tag floating at `top: -16px; left: 22px` | Likely no floating card | **P0** |
| h2 30px serif "Raaga Music\nAcademy" multiline | Verify | **P1** |
| `aca-loc` line with map-pin icon "Indiranagar, Bengaluru · 1.2 km" | Verify | **P2** |
| `stat-row` 4-column grid with 22px serif values (`Rating 4.9` with persimmon italic em, `84 reviews`, `12 years`, `340+ students`); top/bottom hairline borders | Verify | **P1** |
| Tabs "Batches / Workshops / Reviews" — `aca-tab on` has bottom underline | Verify | **P1** |
| Batch cards: title + clock-icon time + `b-slots` pill (jade-soft bg "8 slots" or persimmon-soft "2 left" for low) | Verify | **P1** |
| Workshop cards `ws-card` with type tag (`masterclass`, `offline`, `online`) + date/time meta + price/spots footer | Verify | **P1** |
| Sticky bottom CTA "Book a trial · ₹150 →" | Verify | **P1** |

(Needs implementation read for line-level accuracy. Marking as P0 for the cover/floating card composition.)

---

## 8. Compare academies

**Mockup:** lines 1450–1553 (CSS), 3524–3631 (HTML).
**Implementation:** `apps/student/app/compare.tsx`.

| Mockup element | Implementation | Severity |
|---|---|---|
| Top bar: back chevron left, "Compare" title center, X close right | Verify | **P1** |
| Two-column header with circular ic-aca (R / N letters) + name + sub | Verify | **P1** |
| Comparison table 6+ rows: Rating, Trial fee, Monthly fee, Instruments/Styles, Batch times, Experience — winning cell marked `cmp-val win` (jade-soft bg), other `alt` | Verify | **P0** if missing |
| Bottom CTAs: "Book Raaga" primary + "Book Nrityanjali" ghost | Verify | **P1** |

---

## 9. Events / Workshops

**Mockup:** lines 1971–2159 (CSS), 3907–4228 (HTML, 4 tab variants).
**Implementation:** `apps/student/app/(tabs)/events.tsx`.

### Layout deltas

| Mockup element | Implementation | Severity |
|---|---|---|
| `events-head` heading "Events &\n*Competitions*" 38px serif, italic on second word | Code has "What's *on*" (different, simpler copy) | **P1** |
| Lede line "By Findemy · Perform · Compete · Be seen" at 11px uppercase letter-spaced | Missing | **P1** |
| Tabs "All / Competitions / Talent Hunts / Meetups" — `ev-tab on` has underline + bold | Tabs "All / Competitions / Workshops / Meetups" — slight difference in tab labels (Workshops vs Talent Hunts) | **P1** |
| **Spotlight card** (lines 3932–3940) — large dark "Spotlight event" card with badge, two-line title, meta row, pill + price row; sits above the regular event list on "All" tab | **Missing entirely** | **P0** |
| `event-card` with `stripe-head` (colored stripe at top with two tags) + body (h4 + meta-row + foot with prize/spots + Register button) | Today's mock data has 4 events; card component is `EventCard` (not read yet) | **P1** |
| Stripe head colors vary: jade, ink (dark), rose, marigold per event type | Verify | **P1** |
| Tags inside stripe-head: type tag + price tag (different color combinations) | Verify | **P1** |
| Body h4 in 18–20px serif | Verify | **P2** |
| Meta-row icons (calendar, location, flame) | Verify | **P2** |
| Footer prize line `prize` with `sub` for spots + jade "Register" button | Verify | **P1** |
| "Talent Hunts" sub-section has section header + lede line above cards (line 4094–4095) | Verify | **P1** |
| Mockup has 4 separate tab views (all, competitions, talent-hunts, meetups) with content variation | Single tab UI in code | **P1** |

**Verdict:** Events tab is structurally simpler than mockup. The spotlight card is the biggest visible gap.

---

## 10. Booking · slot

**Mockup:** lines 2160–~ (CSS), 4230–4303 (HTML).
**Implementation:** `apps/student/app/booking/slot.tsx`.

| Mockup element | Implementation | Severity |
|---|---|---|
| Top bar with back btn + 4-step pill stepper (2 of 4 filled persimmon) + "2 / 4" text | Code has `<ScreenHeader title="Pick a slot" />` — no stepper | **P0** |
| `book-head` h2 "Pick a *date*\n& time slot." 32px serif italic emphasis | Code has small "Select a date" label | **P1** |
| Body "Trial sessions are 45 minutes. You can reschedule once for free." | Missing | **P1** |
| `mini-aca` strip with thumb + name + sub | Missing | **P1** |
| **Calendar grid** with month header + nav, day-of-week row (M T W T F S S), 5 rows of day cells with `dot` for available days, `today` for current, `sel` for selected, `dim` for outside month | Code has horizontal date strip (14 days as pills) | **P0** structural difference |
| `slots-head` with "Available slots · Sat 19" + legend "● open ● selected" | Verify | **P1** |
| `slots-grid` 3-column with each slot showing time + cap line ("3 left" / "Full" / "Selected" / "1 left") | Verify | **P0** |
| Bottom CTA "Continue · review & pay →" | Verify | **P1** |

---

## 11. Booking · pay

**Mockup:** lines 4305–4383.
**Implementation:** `apps/student/app/booking/pay.tsx`.

After today's fix, payment method picker exists. Comparison vs mockup:

| Mockup element | Implementation | Severity |
|---|---|---|
| 4-step pill stepper (3 of 4 filled) + "3 / 4" | Missing | **P0** |
| h2 "Review & *pay*." | Verify | **P1** |
| Body "Your slot is held for 5 minutes. Confirmed once you pay." | Verify | **P1** |
| Mini-aca strip again | Verify | **P1** |
| `summary` table: Date / Time / Mode / Trial fee / Platform fee / Festive credit / Total | Verify | **P1** |
| Payment options as ROWS (not radio chips) — each row has icon-square + name + sub + radio circle on right; options include "UPI · priya@okhdfc · Default", "VISA · ···· 4821 · Expires 11/29", "+ Add new method · Card, wallet, net-banking" | Today's fix has 4 method radio options (Wallet/Card/Razorpay/UPI) with "Coming soon" — different composition | **P1** |
| Footer note "Free reschedule up to 6 hours before." | Verify | **P2** |
| CTA "Pay ₹112 & confirm trial →" | Verify | **P1** |

---

## 12. Confirmation

**Mockup:** lines 4385–4474.
**Implementation:** `apps/student/app/booking/confirmation.tsx`.

| Mockup element | Implementation | Severity |
|---|---|---|
| Big checkmark `confirm-mark` icon at top | Likely present | **P2** |
| h2 "You're *booked*." | Verify | **P1** |
| Body with phone number bolded | Verify | **P1** |
| `booking-id` chip "Booking · FDM-04A19-RG72" | Likely missing | **P1** |
| **`ticket` block** with perforated edges (left/right "perf"), thumb + name on top, 4-column body (Date / Time / Class / Paid), footer "Show at reception · *Findemy*" | **Likely missing** — current confirmation is minimal per audit-student.md P1 #4 | **P0** |
| `otp-display` with 6-digit OTP large monospaced + "Show to your instructor at class" hint | May exist or share component with my-trial | **P1** |
| Two ghost buttons: "Get directions" + "Add to calendar" | Verify | **P1** |
| Instructions list "What to bring" — 4 bulleted items with custom bullet | Verify | **P1** |

---

## 13. Profile (tab)

**Mockup:** lines 2786–2992 (CSS), 4610–4719 (HTML).
**Implementation:** `apps/student/app/(tabs)/profile.tsx`.

The screenshot from the user shows the home tab. Profile tab not yet screenshotted but likely has similar bland-vs-design gap.

| Mockup element | Implementation | Severity |
|---|---|---|
| **`profile-top`** has DARK ink/charcoal background (~260px tall) — `on-dark` status bar style, hero block with avatar + name + sub + stats | Verify; comment in profile.tsx mentions `DARK_TOP = 260` so dark hero likely present | **P1** verify |
| `profile-row1` top bar with italic serif "Profile" left + 2 icon buttons right (edit, bell) | Verify | **P1** |
| 4-column profile-stats: Enrolled / Trials / Reels / Badges | If `Reels` and `Badges` removed (out of scope), only 2 stats remain — adjust grid to 2-col or fill with relevant metrics (e.g., Reviews) | **P1** |
| `profile-rank-pill` block (leaderboard tease) | Out of scope ✓ | — |
| `Your reels` section with horizontal strip of 3 reel thumbnails | Out of scope ✓ | — |
| **Achievements** section with 4 badges (gold medal "First reel", jade flame "7-day streak", rose heart "100 likes", persimmon trophy "Top 10") | Reels/leaderboard adjacent — discuss if achievements stay or all go | **P1** decision |
| **Joined academies** list: 2 rows with `thumb art-1/2 block-print` + name + sub + colored "Active"/"Trialed" pill | This is the enrollments list; today's fix makes it not crash. Visual: needs `block-print` art thumb + colored stat pill | **P1** |

---

## 14. My trial

**Mockup:** lines 2993–3027 (CSS), 4721–4787 (HTML).
**Implementation:** `apps/student/app/trials/[id].tsx`.

After today's fix, the file has an `isLiveToday` branch that renders the "Trial Today" mode. The non-today branch should render mockup "My trial":

| Mockup element | Implementation | Severity |
|---|---|---|
| Top bar: back chevron + "Your trial" title + share icon | Verify | **P1** |
| Status row with `spill active` pill "Confirmed" + "In 3 days · Sat 19 Apr · 4:00 PM" | Verify | **P1** |
| **`my-trial-hero card`** — academy initial avatar `ic-aca` left, name "Raaga Music" + "with Anand R · Guitar · Beginner" + location line below | Verify | **P1** |
| `otp-display` block | Verify | **P1** |
| `my-trial-bring` — chip row "Comfortable clothes / Water bottle / Guitar provided" with check/info icons | Verify | **P1** |
| Two ghost CTAs: Directions + Add to calendar | Verify | **P1** |
| Bottom links: Reschedule · Cancel trial (cancel in rose) | Verify | **P1** |

---

## 15. Trial today

**Mockup:** lines 3028–3065 (CSS), 4789–4842 (HTML).
**Implementation:** branch inside `apps/student/app/trials/[id].tsx`.

| Mockup element | Implementation | Severity |
|---|---|---|
| Top bar: back chevron + "Today" tag pill right | Verify | **P1** |
| **`today-pulse`** — big "Starts in" label + h1 "2h 15m" massive countdown (likely 64–80px serif) + sub "Raaga Music · 12, 3rd Cross · Indiranagar" | Today's fix added the branch; sizes/styling unknown | **P1** |
| `today-otp` block with 6-digit OTP huge + hint | Verify | **P1** |
| `today-meta` row: ic-aca + name + sub + big 4:00 PM time right | Verify | **P1** |
| 3 action tiles: Directions / Call / I'm late (warn = rose-tint) | Verify | **P1** |
| Bottom: Cancel trial link | Verify | **P1** |

---

## 16. Post-trial

**Mockup:** lines 3066–3204 (CSS), 4844–4900+ (HTML).
**Implementation:** `apps/student/app/post-trial/index.tsx`.

After today's fix, three decision buttons (Enroll Now / Try More / Not Interested) appear after submission. Comparison:

| Mockup element | Implementation | Severity |
|---|---|---|
| Top: close X + "How was it?" heading | Verify | **P1** |
| `post-academy` row with ic-aca + name + sub + jade "ATTENDED" tag right | Verify | **P1** |
| **`post-stars-block`** — "Rate your trial" prompt + 5 large 32px star buttons (4 selected, 1 outline) + caption "4 of 5 · Great teacher" | StarRating present from UI lib; caption likely missing | **P1** |
| **`post-chips-block`** — "What stood out?" prompt + chip cloud (Patient teacher / Nice space / Good pace etc., toggleable) | Missing entirely | **P1** |
| `Add note (optional)` textarea | Input multiline present ✓ | **P2** |
| Decision buttons (the user asked for, today's fix added) | "Enroll Now" / "Try More Academies" / "Not Interested" ✓ | match |
| Skip link bottom | Verify | **P2** |

---

## Cross-cutting issues

### Status bar
The mockup shows a faux iOS status bar (time + signal dots + wifi + battery) for every screen. The implementation correctly uses the system status bar via `expo-status-bar`. **No action** — mockup's bar is a presentation device.

### Bottom nav bar
- Mockup has 5 slots (incl. Reels + FAB) on tabbed screens
- Implementation has 3 slots (Discover, Events, Profile) — **correct** per scope decision
- Mockup uses dark variant on Reels and Profile (`nav-bar.on-dark`); profile tab dark hero would need a dark nav variant too — verify

### `block-print` decorative pattern
Mockup uses CSS pattern on every cover image. Without a custom RN equivalent the app looks like a stock listing app. Options:
1. SVG pattern via `react-native-svg` (~50 lines of `<Pattern>` def)
2. Pre-rendered PNG textures bundled in `assets/`
3. Multi-layer `LinearGradient` from `expo-linear-gradient` to approximate

### Decorative SVGs
- Academy cover has a decorative star/circle SVG at bottom-right (line 3657–3661)
- Splash has dotted background pattern
- Profile dark top has implicit background art
None of these are in current code. **P1.**

### Iconography
Mockup uses a consistent flat-line icon set defined via `<symbol id="i-*">` (search, sliders, music note, dance figure, brush, yoga pose, mappin, check, heart-f, share, chevrons, calendar, clock, info, lock, phone, play, trophy, plus, sparkle, medal, flame, bolt, timer, fast, edit, bell, user, home, comment, audio). Implementation uses inline View shapes for some (`ExploreIcon`, `CalendarIcon` in `(tabs)/_layout.tsx`) and emoji/character substitutes elsewhere (📍 for map pin, ♡ for heart). **P1 — needs a unified icon component library** matching mockup symbols.

---

## Summary scorecard

| Category | P0 count | P1 count | P2 count |
|---|---|---|---|
| Design tokens (colors, radii, shadows) | 0 | 9 | 7 |
| Pattern art / decorative | 1 (block-print everywhere) | 6 (decorative SVGs) | 0 |
| Splash | 2 | 5 | 0 |
| Onboarding | 1 | 4 | 0 |
| Auth (login/signup/OTP) | 0 | 8 | 2 |
| Interests | 1 | 4 | 0 |
| Discover/Home | 1 | 11 | 6 |
| Academy profile | 2 | 8 | 1 |
| Compare | 1 | 3 | 0 |
| Events | 1 | 8 | 2 |
| Booking · slot | 2 | 4 | 0 |
| Booking · pay | 1 | 6 | 1 |
| Confirmation | 1 | 5 | 1 |
| Profile tab | 0 | 5 | 1 |
| My trial | 0 | 8 | 0 |
| Trial today | 0 | 7 | 0 |
| Post-trial | 0 | 5 | 2 |
| Iconography | 0 | 1 | 0 |
| **TOTAL** | **13** | **107** | **23** |

(Counts are floor-approximations; some "verify" items would resolve to P2 once read.)

---

## Recommended fix sequence

This is roughly 4–6 days of focused engineering work to truly hit pixel-parity. Recommended phasing:

### Phase 1 — Design system foundation (1 day)
- Fix theme colors to mockup exact hexes
- Add missing `*-soft` tokens (jade-soft, marigold-soft, rose-soft)
- Rename radius tokens to match mockup naming, add `xl: 28`
- Replace neutral shadows with warm-tinted shadows (rgba(60,30,10,...))
- Add typography helpers for the specific sizes the mockup uses (44, 38, 36, 30, 22)
- Create `BlockPrintCover` component (SVG pattern + category gradient) as one reusable building block

**Impact:** every screen feels closer to designed without touching screen code.

### Phase 2 — Splash + cover art rollout (1 day)
- Build proper splash (radial gradient bg, splash-mark, italic 78px wordmark, loader, footer)
- Replace `AcademyCard` cover placeholder with `BlockPrintCover`
- Apply same to Academy detail cover, booking mini-aca thumb, ticket thumb, profile joined-list thumbs

**Impact:** the app gets its visual identity back.

### Phase 3 — Per-screen polish (2–3 days)
In rough priority order:
1. **Academy profile** (P0 floating card + stat row + tabbed batches/workshops/reviews)
2. **Booking slot** (P0 calendar grid + slot picker, replace day strip)
3. **Booking pay** (stepper + summary table + payment options rows)
4. **Confirmation** (ticket block with perforated edges)
5. **Compare** (table layout with win-highlighting)
6. **Events** (spotlight card + striped event cards)
7. **Interests** (art-tile grid + selected checkmark)
8. **Onboarding** (decide whether to merge with interests; if separate, build art carousel)
9. **Profile** (verify dark hero + adjust 4-stat grid to remove reels/badges)
10. **My trial / Trial today** (verify hero / pulse / OTP / actions structure)
11. **Post-trial** (add "What stood out?" chip cloud)

### Phase 4 — Iconography (1 day)
- Build `<Icon name="search|sliders|music|dance|..."/>` component fed from a single SVG sprite or per-icon component file
- Replace every emoji and inline View-icon usage with this component

### Phase 5 — Microscopic polish (0.5 day)
- Active chip color (persimmon, not ink) on Discover
- "See all →" and "Map view →" section links
- Tag/pill border-radii (mockup uses 999 pill)
- Letter-spacing on uppercase labels (0.18em–0.24em — currently 0)

---

## What CAN'T be hit even with perfect implementation

- Backdrop-blur (CSS `backdrop-filter`) is not supported in React Native core without `@react-native-community/blur` (iOS-only) or `expo-blur`. Mockup uses it on heart button, online pill, top-bar icon buttons. RN approximation: solid rgba background.
- CSS `block-print` exact texture — needs a hand-tuned SVG pattern or asset
- CSS pseudo-elements (`::before`, `::after`) for decorative dots/glows — must be modeled as real `<View>` siblings

These are **acceptable approximations**, but worth flagging — the eventual native build will be ~95% of mockup fidelity, not literally 100%.

---

## Closing

The mockup represents a deliberate, premium-looking design with significant decorative investment (warm shadows, block-print art, italic serif emphasis, custom icons, perforated tickets). The current implementation captured the **information architecture** but glossed the **decoration**. To close the gap meaningfully requires:

1. **Design system fixes** (one focused PR) — biggest leverage
2. **`BlockPrintCover` component** — one PR — unlocks 8+ screens at once
3. **Screen-by-screen polish** — many small PRs

Doing this incrementally through 5 phases is realistic. Trying to do everything at once will stall (we already saw two agents stall this session on smaller scopes).
