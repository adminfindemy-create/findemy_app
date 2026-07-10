# Findemy — Pre-Launch Checklist

Everything that needs to happen **outside the codebase** before the apps can run end-to-end. Organized by service / area. Tick off as you complete each row.

State as of 2026-05-17. Includes everything added during the OAuth + onboarding cleanup work — **bold items are new from that pass** and were not in any earlier checklist.

---

## 1. Developer / platform accounts

| # | Service | Cost | Lead time | Owner | Status |
|---|---------|------|-----------|-------|--------|
| 1.1 | **Apple Developer Program** | $99/yr | ~1 week | Varun (student) + Ritwik (admin) | ☐ |
| 1.2 | **Google Play Console** | $25 one-time | ~3 days | Varun (student) + Ritwik (admin) | ☐ |
| 1.3 | **Google Cloud Console project** | Free | Same day | Anshu (backend), Varun for OAuth coordination | ☐ |
| 1.4 | **Razorpay Merchant Account** | Free | **1–3 weeks KYC** | Anshu | ☐ |
| 1.5 | **MSG91** | Pay-per-SMS | 1–3 days DLT | Anshu | ☐ |
| 1.6 | **Cloudflare** (R2 + DNS) | Free tier | Same day | Anshu | ☐ |
| 1.7 | **Expo / EAS** | Free tier | Same day | Varun + Ritwik | ☐ |
| 1.8 | **Railway** | ~$20/mo | Same day | Anshu | ☐ |
| 1.9 | **Sentry** | Free tier | Same day | All | ☐ |
| 1.10 | **Google Maps Platform** | Free tier + billing | Same day | Varun | ☐ |

**Bundle IDs to register on all platforms** (Apple, Play, Google OAuth, Sentry projects):
- Student: `app.findemy.student` (iOS + Android)
- Admin: `app.findemy.admin` (iOS + Android)

---

## 2. Apple — Sign in with Apple

Required for the new Apple Sign-In flow. Cannot be tested on real device without these.

| # | Step | Notes | Status |
|---|------|-------|--------|
| 2.1 | Enroll in Apple Developer Program (item 1.1) | | ☐ |
| 2.2 | Register App ID **`app.findemy.student`** | Identifiers → App IDs → New | ☐ |
| 2.3 | Register App ID **`app.findemy.admin`** | Same flow | ☐ |
| 2.4 | Enable **Sign in with Apple** capability on both App IDs | Edit each App ID → check the capability | ☐ |
| 2.5 | Generate iOS provisioning profiles for both apps | Auto-managed by EAS, but the App IDs above must exist first | ☐ |
| 2.6 | (Optional) Configure Sign in with Apple email relay domain | Only if you plan to send emails to `*@privaterelay.appleid.com` later | ☐ |

**No code-side Apple client ID is needed** — Apple uses the App's bundle ID as the audience for the ID token JWT (verified by `apps/api/src/modules/auth/oauth/apple-verifier.ts` against `APPLE_STUDENT_BUNDLE_ID` / `APPLE_ADMIN_BUNDLE_ID`).

---

## 3. Google — OAuth + Maps + Geocoding

You need **four distinct OAuth client IDs** — one iOS and one Android per app.

### 3a. OAuth client IDs

| # | Step | Notes | Status |
|---|------|-------|--------|
| 3.1 | Create a Google Cloud Console project (or reuse 1.3) | | ☐ |
| 3.2 | Configure OAuth consent screen | App name, support email, dev contact, scopes: `email`, `profile`, `openid` | ☐ |
| 3.3 | iOS OAuth client for **student app** (`app.findemy.student`) | APIs & Services → Credentials → Create → OAuth → iOS. Note the reversed-client-id (`com.googleusercontent.apps.NNN-XXX`) | ☐ |
| 3.4 | Android OAuth client for **student app** | Package: `app.findemy.student`. SHA-1 from EAS keystore | ☐ |
| 3.5 | iOS OAuth client for **admin app** (`app.findemy.admin`) | Separate client | ☐ |
| 3.6 | Android OAuth client for **admin app** | Separate client | ☐ |
| 3.7 | Replace `com.googleusercontent.apps.PLACEHOLDER` in both `app.json` files | `apps/student/app.json` and `apps/admin/app.json` — `@react-native-google-signin/google-signin` plugin config | ☐ |

### 3b. Google services

| # | Step | Notes | Status |
|---|------|-------|--------|
| 3.8 | Enable **Geocoding API** | Used by backend for academy address → lat/lng | ☐ |
| 3.9 | Create restricted API key for Geocoding | Sets `GOOGLE_GEOCODING_KEY` | ☐ |
| 3.10 | Enable **Maps SDK for iOS** and **Maps SDK for Android** | For `react-native-maps` in student app | ☐ |
| 3.11 | Restricted Maps API key (per app bundle ID) | Sets `EXPO_PUBLIC_GOOGLE_MAPS_KEY` | ☐ |
| 3.12 | Attach a billing account | Required even for free-tier Maps usage | ☐ |

---

## 4. Razorpay

| # | Step | Notes | Status |
|---|------|-------|--------|
| 4.1 | Create Razorpay merchant account (item 1.4) | KYC 1–3 weeks | ☐ |
| 4.2 | Submit KYC documents | Business PAN, GST cert (if registered), cancelled cheque / bank statement, director KYC (Aadhaar + PAN), business proof (incorporation cert / GST) | ☐ |
| 4.3 | Generate test keys (`rzp_test_...`) | `apps/student/.env` `EXPO_PUBLIC_RAZORPAY_KEY` + `apps/api/.env` `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` | ☐ |
| 4.4 | Generate live keys (`rzp_live_...`) once KYC approved | Replace test keys for prod | ☐ |
| 4.5 | Configure webhook | URL: `https://api.findemy.app/payments/webhook`, secret in `RAZORPAY_WEBHOOK_SECRET`, events: `payment.captured`, `payment.failed` | ☐ |

---

## 5. MSG91 (phone OTP)

| # | Step | Notes | Status |
|---|------|-------|--------|
| 5.1 | Create MSG91 account (item 1.5) | | ☐ |
| 5.2 | Submit DLT registration | Register sender ID e.g. `FINDMY`. India regulatory requirement | ☐ |
| 5.3 | Register OTP template | Body: `Your Findemy verification code is {#var#}. Valid for 5 minutes.` DLT approval 1–3 days | ☐ |
| 5.4 | Generate auth key + capture template ID | Sets `MSG91_AUTH_KEY` + `MSG91_TEMPLATE_ID` in `apps/api/.env` | ☐ |

---

## 6. Cloudflare R2 (image storage)

| # | Step | Notes | Status |
|---|------|-------|--------|
| 6.1 | Create Cloudflare account + R2 bucket `findemy-uploads` | | ☐ |
| 6.2 | Generate R2 API token with bucket-scoped access | Sets `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET` in `apps/api/.env` | ☐ |
| 6.3 | (Optional) Configure custom domain for public asset URLs | e.g. `cdn.findemy.app` → R2 bucket | ☐ |

---

## 7. Hosting + DNS (Railway)

| # | Record / step | Type | Value / notes | Status |
|---|---------------|------|---------------|--------|
| 7.1 | Buy / confirm domain `findemy.app` | — | Namecheap / GoDaddy / Cloudflare Registrar | ☐ |
| 7.2 | `findemy.app` apex | CNAME / A | Marketing site host | ☐ |
| 7.3 | `api.findemy.app` | A | Railway app IP (SSL automatic on Railway) | ☐ |
| 7.4 | Deploy backend to Railway | — | `pnpm --filter @findemy/api start`. Set env vars in Railway dashboard | ☐ |
| 7.5 | Provision Railway Postgres + Redis | — | Wire `DATABASE_URL` + `REDIS_URL` into the API service | ☐ |
| 7.6 | Run initial migration on Railway DB | — | `pnpm --filter @findemy/api prisma:deploy` (production-safe variant of `prisma:migrate`) | ☐ |
| 7.7 | Seed demo data | — | `pnpm --filter @findemy/api seed` — creates 3–5 demo academies with coaches + batches, 1 demo academy account (for Ritwik), sample events | ☐ |

---

## 8. EAS / Expo build

### 8a. `eas.json` per app

Both `apps/student/eas.json` and `apps/admin/eas.json` should follow this shape (use separate bundle IDs):

```json
{
  "cli": { "version": ">= 12.0.0" },
  "build": {
    "development": { "developmentClient": true, "distribution": "internal" },
    "preview":     { "distribution": "internal", "android": { "buildType": "apk" } },
    "production":  { "autoIncrement": true }
  }
}
```

### 8b. Setup steps

| # | Step | Notes | Status |
|---|------|-------|--------|
| 8.1 | Create Expo organization + invite team | | ☐ |
| 8.2 | `eas login` on each developer's machine | | ☐ |
| 8.3 | Run `eas build:configure` for both apps | Generates Apple/Google credentials in EAS | ☐ |
| 8.4 | Generate `EXPO_ACCESS_TOKEN` for backend push | Sets `EXPO_ACCESS_TOKEN` in `apps/api/.env` (Expo push notifications) | ☐ |
| 8.5 | **Rebuild dev clients for both apps** | Required because the OAuth pass added native modules: `expo-apple-authentication`, `@react-native-google-signin/google-signin`, `expo-crypto`. Run `eas build --profile development --platform ios` + `--platform android` for each app | ☐ |
| 8.6 | Build production binaries when ready | `eas build --profile production --platform ios|android` per app | ☐ |

---

## 9. Sentry

| # | Step | Notes | Status |
|---|------|-------|--------|
| 9.1 | Create Sentry org + three projects (`findemy-api`, `findemy-student`, `findemy-admin`) | | ☐ |
| 9.2 | Capture DSNs | Sets `SENTRY_DSN` in `apps/api/.env`, `EXPO_PUBLIC_SENTRY_DSN` in both apps' `.env` | ☐ |
| 9.3 | (Optional) Configure source-maps upload in EAS build hook | For symbolicated stack traces | ☐ |

---

## 10. JWT keys (backend)

| # | Step | Notes | Status |
|---|------|-------|--------|
| 10.1 | Generate EC P-256 keypair locally | `openssl ecparam -genkey -name prime256v1 -noout -out private.pem && openssl ec -in private.pem -pubout -out public.pem` | ☐ |
| 10.2 | Paste into `apps/api/.env` | `JWT_PRIVATE_KEY` and `JWT_PUBLIC_KEY` — preserve newlines (use `\n` escapes or Railway's multi-line env method) | ☐ |
| 10.3 | Store private key in a password manager | Losing it invalidates every issued token; rotating means everyone re-logs in | ☐ |

---

## 11. Environment variables — final populate

The `.env.example` files in each app are the only ones tracked. Do **not** commit the real `.env` files.

### `apps/api/.env`
- `DATABASE_URL`, `REDIS_URL` — from Railway (step 7.5)
- `JWT_PRIVATE_KEY`, `JWT_PUBLIC_KEY` — from step 10
- `MSG91_AUTH_KEY`, `MSG91_TEMPLATE_ID` — from step 5
- `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` — from step 4
- `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET` — from step 6
- `GOOGLE_GEOCODING_KEY` — from step 3.9
- `EXPO_ACCESS_TOKEN` — from step 8.4
- `SENTRY_DSN` — from step 9.2
- **`APPLE_STUDENT_BUNDLE_ID`** = `app.findemy.student`
- **`APPLE_ADMIN_BUNDLE_ID`** = `app.findemy.admin`
- **`GOOGLE_STUDENT_IOS_CLIENT_ID`** — from step 3.3
- **`GOOGLE_STUDENT_ANDROID_CLIENT_ID`** — from step 3.4
- **`GOOGLE_ADMIN_IOS_CLIENT_ID`** — from step 3.5
- **`GOOGLE_ADMIN_ANDROID_CLIENT_ID`** — from step 3.6

### `apps/student/.env`
- `EXPO_PUBLIC_API_URL` — `https://api.findemy.app` (prod) or local IP (dev)
- `EXPO_PUBLIC_RAZORPAY_KEY` — public test/live key from step 4
- `EXPO_PUBLIC_GOOGLE_MAPS_KEY` — from step 3.11
- `EXPO_PUBLIC_SENTRY_DSN` — from step 9.2
- **`EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`** — same value as `GOOGLE_STUDENT_IOS_CLIENT_ID`
- **`EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID`** — same value as `GOOGLE_STUDENT_ANDROID_CLIENT_ID`

### `apps/admin/.env`
- `EXPO_PUBLIC_API_URL`
- `EXPO_PUBLIC_GOOGLE_MAPS_KEY` (only if admin uses maps; currently no)
- `EXPO_PUBLIC_SENTRY_DSN`
- **`EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`** — same value as `GOOGLE_ADMIN_IOS_CLIENT_ID`
- **`EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID`** — same value as `GOOGLE_ADMIN_ANDROID_CLIENT_ID`

---

## 12. App Store submission (Apple)

| # | Asset / step | Notes | Status |
|---|--------------|-------|--------|
| 12.1 | App Store Connect app records for both apps | Bundle IDs from step 2 | ☐ |
| 12.2 | Screenshots — 6.5", 5.5", iPad (per app, per locale) | Generate from production build | ☐ |
| 12.3 | App description, keywords, support URL, marketing URL | Per app | ☐ |
| 12.4 | Privacy policy URL (publicly accessible) | Apple requires this for Sign in with Apple | ☐ |
| 12.5 | Demo account credentials for review | Apple reviewers must log in without a real phone — backdoor test account or OTP bypass | ☐ |
| 12.6 | App Privacy disclosures (data collected, used, linked) | Match what the code actually collects: phone, email (OAuth), name, location | ☐ |
| 12.7 | **In-app account deletion flow** | **Apple hard requirement** for apps that support account creation. Currently NOT implemented — **P0 before submission** | ☐ |

---

## 13. Play Store submission (Google)

| # | Asset / step | Notes | Status |
|---|--------------|-------|--------|
| 13.1 | Play Console app records for both apps | Bundle IDs from step 2 (Android uses same identifiers) | ☐ |
| 13.2 | Screenshots — phone + tablet, per app | | ☐ |
| 13.3 | Feature graphic (1024×500) + icon (512×512) per app | | ☐ |
| 13.4 | Content rating questionnaire | | ☐ |
| 13.5 | Data safety form | Match what code collects | ☐ |
| 13.6 | Privacy policy URL | Same one used for Apple | ☐ |

---

## 14. Pre-launch ops + smoke tests

| # | Step | Notes | Status |
|---|------|-------|--------|
| 14.1 | Configure Railway alerting | Slack/email on crashes, restarts, high CPU | ☐ |
| 14.2 | Set up Sentry alert rules | First seen, high frequency, etc. | ☐ |
| 14.3 | Backup strategy for Railway Postgres | Daily automated dumps | ☐ |
| 14.4 | Razorpay webhook signature verification end-to-end test | Use Razorpay's test webhook simulator | ☐ |
| 14.5 | MSG91 SMS deliverability test on a real Indian number | Confirm DLT template fires | ☐ |
| 14.6 | Apple Sign-In end-to-end test on TestFlight build | Cannot be tested in simulator-only path reliably | ☐ |
| 14.7 | Google Sign-In end-to-end test on both iOS + Android dev clients | After step 8.5 | ☐ |

---

## 15. Items deliberately out of scope (do not action)

Per MVP scoping decisions:

- **Reel / leaderboard infrastructure** — not implemented anywhere, will not be implemented this phase.
- **Account-linking across providers when emails differ** — accepted limitation; user signing in with Apple (one email) and Google (different email) gets two separate accounts.
- **Apple's "hide my email" relay handling** — works as-is; we store the relay address but never email until reminders are added later.
- **Multiple payment methods** — UI shows Wallet/Card/UPI/Razorpay options, but only Razorpay is wired; the rest show "Coming soon".

---

## 16. Escalation contacts

| Service | Support channel |
|---------|----------------|
| Razorpay | partners@razorpay.com |
| MSG91 | support@msg91.com |
| Apple Developer | developer.apple.com/contact |
| Google Play | play-console-help@google.com |
| Railway | discord.gg/railway |
| Expo | expo.dev/support |
