# Findemy MVP Cleanup & Auth Hardening — Design Spec

**Date:** 2026-05-17
**Status:** Draft, awaiting user approval
**Author:** Claude (brainstorming session with dev@celeslabs.com)

---

## 1. Goal

Bring the Findemy student and admin mobile apps to a launch-ready MVP state by:

1. Adding Apple Sign-In and Google Sign-In to both apps alongside the existing phone/OTP flow.
2. Building the admin app's missing authentication and onboarding surface (currently broken — splash redirects to a non-existent `(auth)/` route).
3. Auditing both apps against their HTML mockups (`ai-usage/student.html`, `ai-usage/admin.html`) and fixing UI/logic gaps.
4. Holding the line on scope: no reel feature, no leaderboard.

## 2. Scope

### In scope

- New OAuth (Apple + Google) routes on the backend, with Prisma schema changes to support OAuth identities.
- Apple/Google Sign-In buttons on student `login.tsx` and `signup.tsx`.
- Full new `(auth)/` group in the admin app: `_layout`, `index` (splash/welcome), `login`, `signup`, `signup-otp`, `onboarding`.
- Admin onboarding wizard (minimal): academy name, city, category(s), owner name, contact phone.
- UI/logic fixes in both apps based on a diff audit against the HTML mockups (excluding reel/leaderboard regions).
- Onboarding-completion gating in both apps' root layouts so partially onboarded users land on the correct next step.

### Out of scope

- Reels feature (creation, feed, navigation, gamification touches) — explicitly excluded.
- Leaderboard system at any level (academy, city, national) — explicitly excluded.
- Findemy-led events/competitions, recognition/rewards, creator partnerships, or any future-phase feature from `vision.md`.
- Payment, batch booking, attendance, reviews, push notifications, or any non-auth backend module changes.
- Refactors not directly required by auth/onboarding work.
- App Store / Play Store submission, screenshot generation, privacy-policy authoring, and the external accounts in `PRE-LAUNCH-CHECKLIST.md`.
- Any git operation. Code is written, never committed.

## 3. Audit findings that shape the design

Before drafting the architecture, the following facts were established from the codebase:

- **Reels and leaderboard have zero occurrences** in `apps/` or `packages/` (grep `-riE 'reel|leaderboard'`). They exist only in the HTML mockups, so the "remove" requirement collapses to "never add them" plus a sanity-check pass on admin settings and nav.
- **Admin auth is broken in current state.** `apps/admin/app/index.tsx` redirects to `/(auth)/login`, but `apps/admin/app/(auth)/` does not exist. The admin app cannot authenticate today. This is a P0, not a nice-to-have.
- **Student auth is wired end-to-end.** The `(auth)/` group has `index`, `login`, `signup`, `signup-otp`, `onboarding`, `interests`. The onboarding screen collects name, age, location, then routes to interests. Needs OAuth buttons added but no structural rebuild.
- **Backend `apps/api/src/modules/auth/`** already handles phone/OTP for both student and academy roles via `role: 'student' | 'academy'` on `/auth/otp/request`. OAuth routes follow the same pattern.
- **Prisma `User` model** has `phone @unique` but no email or OAuth identifiers. `AcademyAccount` is even thinner — only `phone`, `academyId`. Both need OAuth columns and `phone` must become nullable to allow OAuth-first signup.
- **Category enum is narrower than vision** — only `music | dance | arts | yoga`. Admin onboarding and any UI work must respect this enum, not the broader list in `vision.md`.

## 4. Architecture

### 4.1 Shared packages (`packages/`)

**`packages/types`**

Add:

```ts
export type OAuthProvider = 'apple' | 'google';

export interface OAuthLoginRequest {
  idToken: string;
  nonce?: string;       // Apple only
  role: 'student' | 'academy';
}

// Existing AuthLoginResponse already returns { access, refresh, user/account, academy }
// No shape change needed for the response.
```

**`packages/api-client`**

Add two client methods that share existing token-handling and error mapping:

```ts
auth.oauthApple(req: OAuthLoginRequest): Promise<AuthLoginResponse>
auth.oauthGoogle(req: OAuthLoginRequest): Promise<AuthLoginResponse>
```

### 4.2 Backend (`apps/api/`)

**New routes** in `apps/api/src/modules/auth/routes.ts`:

```
POST /auth/oauth/apple   body: { idToken, nonce, role }
POST /auth/oauth/google  body: { idToken, role }
```

Both return the existing login envelope: `{ access, refresh, user|account, academy? }`.

**Verifier libraries** (`apps/api/src/modules/auth/oauth/`):

- `apple-verifier.ts` — fetches Apple JWKS (cached in-memory with 24h TTL), verifies RS256 signature, checks `iss === 'https://appleid.apple.com'`, `aud === bundleId`, `exp`, optional `nonce === sha256(client_nonce)`.
- `google-verifier.ts` — uses `google-auth-library`'s `OAuth2Client.verifyIdToken({ idToken, audience: [studentClientIds, adminClientIds] })`. Checks `iss in ['https://accounts.google.com', 'accounts.google.com']` and `exp`.

Both return a normalized `{ sub, email, emailVerified, name? }`.

**Service logic** in `service.ts`:

```ts
async function loginWithOAuth({ provider, payload, role }) {
  const profile = provider === 'apple'
    ? await verifyApple(payload)
    : await verifyGoogle(payload);

  if (role === 'student') {
    let user = await repo.findUserByOAuth(provider, profile.sub);
    if (!user && profile.email) user = await repo.findUserByEmail(profile.email);
    if (!user) user = await repo.createUserFromOAuth(provider, profile);
    else if (!user[`${provider}Sub`]) await repo.linkOAuth(user.id, provider, profile.sub);
    return issueTokensForUser(user);
  } else {
    // academy: same shape against AcademyAccount, with academy still null until onboarding
    ...
  }
}
```

**Prisma migration** (`add_oauth_identity`):

```prisma
model User {
  id              String    @id @default(cuid())
  phone           String?   @unique          // CHANGED: nullable
  email           String?   @unique          // NEW
  emailVerified   Boolean   @default(false)  // NEW
  appleSub        String?   @unique          // NEW
  googleSub       String?   @unique          // NEW
  name            String?                    // CHANGED: nullable (set during onboarding)
  age             Int?
  location        String?                    // CHANGED: nullable
  lat             Float?                     // CHANGED: nullable
  lng             Float?                     // CHANGED: nullable
  interests       Category[]
  avatarInitial   String    @db.VarChar(2)
  attendanceOtp   String    @db.VarChar(6)
  createdAt       DateTime  @default(now())
  lastActiveAt    DateTime  @default(now())
  // ... relations unchanged

  @@index([lat, lng])
  @@map("users")
}

model AcademyAccount {
  id            String    @id @default(cuid())
  phone         String?   @unique            // CHANGED: nullable
  email         String?   @unique            // NEW
  emailVerified Boolean   @default(false)    // NEW
  appleSub      String?   @unique            // NEW
  googleSub     String?   @unique            // NEW
  ownerName     String?                      // NEW (admin onboarding)
  academyId     String?   @unique            // CHANGED: nullable (admin signs up first, creates academy during onboarding)
  academy       Academy?  @relation(...)
  createdAt     DateTime  @default(now())

  @@map("academy_accounts")
}

model Academy {
  // ... unchanged fields
  lat              Float?           // CHANGED: nullable (geocoding deferred to batch-creation flow)
  lng              Float?           // CHANGED: nullable
  // @@index([lat, lng]) — Prisma allows nullable composite indexes; rows with null lat/lng are simply excluded from geo queries until populated
}
```

**Migration data backfill:** Existing rows have phone, so nullable change is non-destructive. `avatarInitial` for OAuth users derives from name (or email local-part if name missing) at row-insert time.

**Environment variables added** (`apps/api/.env`):

```
APPLE_STUDENT_BUNDLE_ID=app.findemy.student
APPLE_ADMIN_BUNDLE_ID=app.findemy.admin
GOOGLE_STUDENT_IOS_CLIENT_ID=...
GOOGLE_STUDENT_ANDROID_CLIENT_ID=...
GOOGLE_ADMIN_IOS_CLIENT_ID=...
GOOGLE_ADMIN_ANDROID_CLIENT_ID=...
```

### 4.3 Student app (`apps/student/`)

**Changes (no new files except an `OAuthButtons.tsx` component):**

- New `apps/student/src/components/OAuthButtons.tsx` — renders Apple (iOS) and Google buttons; handles native sign-in, error states, calls API, sets auth store, routes to onboarding or tabs based on completeness.
- `app/(auth)/login.tsx` — render `<OAuthButtons mode="login" />` above the phone field.
- `app/(auth)/signup.tsx` — render `<OAuthButtons mode="signup" />` above the phone field.
- `app/_layout.tsx` — add onboarding-completeness guard. If `accessToken && (!user.name || !user.location || !user.interests?.length)`, redirect to first incomplete onboarding step.
- `app.json` — add `expo-apple-authentication` plugin block, Google sign-in plugin block with iOS/Android client IDs from `process.env`.
- UI/logic gap fixes from audit (see §5 Audit Plan).

**Onboarding gating logic:**

```ts
function nextOnboardingStep(user: User): string | null {
  if (!user.name || !user.location) return '/(auth)/onboarding';
  if (!user.interests?.length) return '/(auth)/interests';
  return null; // complete
}
```

**Phone collection — student vs admin (explicit, since the apps differ):**

- **Student OAuth signups:** phone is **optional**. The `attendanceOtp` field is a server-generated code displayed in the app for batch attendance — no SMS goes to the student. An inline "Add phone to receive class reminders" card on the profile screen lets them add it later.
- **Admin OAuth signups:** phone is **required** during onboarding (it's the academy's public contact number, used by prospective students). The admin onboarding wizard collects it as a mandatory field if not already present from a phone/OTP signup.

### 4.4 Admin app (`apps/admin/`)

**Net-new files** (entire `(auth)/` group):

```
apps/admin/app/(auth)/
├── _layout.tsx           # Stack navigator, no header
├── index.tsx             # Welcome / role explainer
├── login.tsx             # Phone field + OAuth buttons
├── signup.tsx            # Phone field + OAuth buttons
├── signup-otp.tsx        # OTP code entry
└── onboarding.tsx        # Academy setup wizard
```

`apps/admin/src/components/OAuthButtons.tsx` — same shape as student version, role-aware.

**Onboarding wizard** — single screen, vertically scrolling form (no multi-step UI per the "minimal" decision):

| Field | Type | Required | Notes |
|---|---|---|---|
| Owner name | text | yes | maps to `AcademyAccount.ownerName` |
| Academy name | text | yes | creates `Academy.name` |
| City | text | yes | maps to `Academy.address` (single line initially) |
| Category | single-select from `music\|dance\|arts\|yoga` | yes | `Academy.category` |
| Contact phone | tel | yes if not already set | `AcademyAccount.phone` |

On submit: backend creates `Academy`, links to `AcademyAccount`, returns full account. Geocoding (lat/lng) deferred to a later batch-detail screen — admin onboarding does not require it.

**Routing guard** in `apps/admin/app/_layout.tsx`:

```ts
if (!accessToken) → /(auth)/login
else if (!academy) → /(auth)/onboarding
else → /(tabs)/studio
```

### 4.5 Reel/leaderboard sanity pass

A grep audit in Phase 0 confirms zero references in `apps/` and `packages/`. The cleanup work is:

- Verify admin settings screen does **not** include a "Reels tagging your studio" toggle (mockup `admin.html:4480` shows it; ensure absence).
- Verify neither app's nav/tabs reference Reels or Leaderboard routes.
- Document in inline comments — none needed since the features are simply absent.

No removal work expected; this is a check, not a delete.

## 5. UI/Logic audit plan (Phase 0)

Both apps need a diff pass against the HTML mockups. Two parallel explorer agents will produce structured punch lists:

**Output locations** (working files, not committed): `ai-usage/audit-student.md` and `ai-usage/audit-admin.md`.

**Student agent output:** a markdown table of `{ screen, mockup-section, gap-description, severity }` covering every screen except reels-* and leaderboard-* sections of `student.html`. Written to `ai-usage/audit-student.md`.

**Admin agent output:** same format for `admin.html`, excluding the reels-tagging notification and leaderboard-updates settings toggle. Written to `ai-usage/audit-admin.md`.

Severity scale:
- **P0** — blocks the user (broken nav, crash, missing required field)
- **P1** — visible UI mismatch users will notice (wrong copy, missing component, wrong tab order)
- **P2** — cosmetic polish (spacing, color, font weight)

Phase 3 fixes all P0 and P1 issues; P2 is logged but not fixed unless trivial.

## 6. Data flow — happy path

### 6.1 Student Apple Sign-In (new user)

```
[login.tsx]
  tap "Continue with Apple"
  → AppleAuthentication.signInAsync({ nonce: sha256(rawNonce) })
     ↓ returns { identityToken, fullName, email, nonce }
  → api.auth.oauthApple({ idToken: identityToken, nonce: rawNonce, role: 'student' })
     ↓ backend verifies JWT against Apple JWKS, audience check
     ↓ no existing user with this appleSub or email
     ↓ creates User { appleSub, email, emailVerified: true, avatarInitial: derive(name ?? email) }
     ↓ issues access + refresh tokens
  ← { access, refresh, user }
  → useAuth.setAuth(...)
  → nextOnboardingStep(user) === '/(auth)/onboarding'
  → router.replace('/(auth)/onboarding')
```

### 6.2 Student Google Sign-In (returning user)

```
[login.tsx]
  tap "Continue with Google"
  → GoogleSignin.signIn() → returns { idToken, user }
  → api.auth.oauthGoogle({ idToken, role: 'student' })
     ↓ backend verifies via google-auth-library
     ↓ existing user matched by googleSub
  ← { access, refresh, user }
  → useAuth.setAuth(...)
  → nextOnboardingStep === null (already onboarded)
  → router.replace('/(tabs)')
```

### 6.3 Admin OAuth (new academy account)

Same shape as student, but `role: 'academy'` and lands on `/(auth)/onboarding` to create the Academy record.

## 7. Error handling

Backend returns typed `AppError` with codes:

| Code | HTTP | Trigger |
|---|---|---|
| `oauth_invalid_token` | 401 | Signature fails, malformed JWT |
| `oauth_expired` | 401 | `exp` in past |
| `oauth_audience_mismatch` | 401 | `aud` not in allowed bundle/client IDs |
| `oauth_issuer_mismatch` | 401 | `iss` not the provider's expected value |
| `oauth_nonce_mismatch` | 401 | Apple-only: nonce hash doesn't match |
| `oauth_provider_unreachable` | 502 | JWKS fetch failed |

**Client treatment:**

- All 401s → red inline error under the button: "Couldn't sign in with Apple/Google. Try again or use phone."
- 502 → "Apple/Google service is temporarily unavailable. Try again."
- User cancellation (Apple `ERR_CANCELED`, Google `SIGN_IN_CANCELLED`, Google `IN_PROGRESS`) → silent dismissal, no UI change.
- Network failure → same inline error treatment as 502.
- Every catch path that surfaces user-visible error also logs to Sentry with `provider` and `errorCode` tags. No silent swallows.

## 8. Testing strategy

**Backend** (`apps/api/`):

- Unit tests for `apple-verifier.ts` and `google-verifier.ts` with mocked JWKS / mocked `OAuth2Client`. Cases: valid token, expired, bad audience, bad signature, bad nonce (Apple), provider unreachable.
- Integration tests for `POST /auth/oauth/apple` and `POST /auth/oauth/google` covering: new user, returning user, link-existing-by-email, role mismatch, replay.
- Existing `apps/api/src/test/auth.test.ts` style is the template — extend it, do not duplicate.

**Apps:**

- No E2E OAuth tests — those require real provider SDKs and signed builds, not feasible without paid Apple Developer account.
- Component tests for `OAuthButtons` rendering both providers on iOS and Google-only on Android.
- A render test for `_layout.tsx` confirming the routing guard pushes to the correct next step given several auth-state fixtures.

**Manual smoke checklist** (executed before flagging work done):

- Student: phone OTP login still works end-to-end.
- Student: Apple button on iOS triggers native sheet, completes in dev sandbox, lands on onboarding.
- Student: Google button on iOS + Android completes, returning user skips onboarding.
- Admin: cold-start with no auth lands on `/(auth)/login` (currently crashes — primary regression check).
- Admin: signup → OTP → onboarding → studio tab.
- Admin: OAuth signup → onboarding → studio tab.
- Both apps: typecheck passes (`pnpm -r typecheck`), existing tests pass (`pnpm -r test`).

## 9. Execution plan — subagent-driven

The agentic mechanism is **subagent dispatch** (option 1, recommended). No agent team is created.

| Phase | Work | Agents | Mode | Depends on |
|---|---|---|---|---|
| 0 | Audit: explorer per app produces UI/logic gap punch list vs mockup | 2 × Explore | parallel | — |
| 1 | Extend `packages/types` + `packages/api-client` with OAuth shapes | 1 × general-purpose | sequential | — |
| 2 | Backend: prisma migration + Apple/Google verifiers + service + routes + tests | 1 × general-purpose | sequential | Phase 1 |
| 3a | Student app: `OAuthButtons`, button wiring, onboarding guard, P0/P1 fixes from Phase 0 | 1 × general-purpose | parallel with 3b | Phase 2 |
| 3b | Admin app: build entire `(auth)/` group + onboarding wizard + `OAuthButtons` + P0/P1 fixes from Phase 0 | 1 × general-purpose | parallel with 3a | Phase 2 |
| 4 | Verification: typecheck both apps, run all tests, eyeball diff against mockups, produce status report | 1 × general-purpose | sequential | Phases 3a + 3b |

Each agent receives a self-contained brief with: spec section to consult, files to read first, files allowed to modify, files forbidden to touch, verification commands to run before reporting done.

## 10. Open items flagged but not blocking

- **Apple Developer account ($99/yr)** and bundle ID registration per `PRE-LAUNCH-CHECKLIST.md` is not yet done. The code will be complete and unit-testable, and Apple's dev sandbox works without store submission, but production builds require the account. Spec proceeds assuming the account is procured before app-store submission, not before code work.
- **Google OAuth client IDs** — need to be created in Google Cloud Console (separate iOS + Android per app, 4 total). Env-var placeholders are wired but real values plug in later.
- **MSG91 DLT registration** affects phone OTP, not OAuth — orthogonal.

## 11. Risks

- **Prisma schema changes** (phone, name, location, lat, lng nullable on User; lat/lng nullable on Academy; new OAuth columns) is a single migration. Safe in dev (single-developer); production rollout would need staging verification. Pre-launch state means no real users yet, so risk is low.
- **OAuth account-linking ambiguity** — if a user signs in with Apple (email `foo@x.com`) and later with Google (same email), we link by email. If emails differ between providers, we create separate accounts. This is acceptable for MVP but documented as a known limitation.
- **Apple's "hide my email" feature** produces a relay address — works fine for our flow (we store it as-is and never email until reminders are added later).
- **Subagent coordination on shared packages** — Phase 1 (`packages/`) sequenced before Phase 3 (app work) avoids the only meaningful merge conflict surface. If audit reveals a P0 in shared `packages/ui`, it gets fixed in Phase 1 by the same agent.

## 12. Non-decisions deferred

- Choice of geocoding for admin onboarding's city → lat/lng (out of MVP scope per "minimal" decision; lat/lng stays null until first batch is created).
- Account-deletion flow for OAuth users (Apple requires this for store approval; tracked separately as a pre-submission TODO, not part of this spec).
- Refresh-token rotation strategy (existing implementation is reused unchanged).

---

**End of spec.** Next step: self-review pass, then user reads and approves, then writing-plans skill produces the executable plan.
