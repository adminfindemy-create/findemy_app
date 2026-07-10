# Findemy MVP — Pre-Launch Checklist

## 1. Developer Accounts (External)

| Account | Cost | Lead Time | Owner | Status |
|---------|------|-----------|-------|--------|
| **Apple Developer Program** | $99/yr | ~1 week | Varun (student) / Ritwik (admin) | ☐ |
| **Google Play Console** | $25 one-time | ~3 days | Varun (student) / Ritwik (admin) | ☐ |
| **Razorpay Merchant** | Free | **1-3 weeks KYC** | Anshu (backend) | ☐ |
| **MSG91** | Pay-per-SMS | 1-3 days DLT reg | Anshu | ☐ |
| **Cloudflare** | Free tier | Same day | Anshu | ☐ |
| **Expo / EAS** | Free tier | Same day | Varun + Ritwik | ☐ |
| **Railway** | ~$20/mo | Same day | Anshu | ☐ |
| **Sentry** | Free tier | Same day | All | ☐ |
| **Google Maps Platform** | Free tier + billing | Same day | Varun | ☐ |

### Razorpay KYC Documents Needed
- Business PAN
- GST certificate (if GST registered)
- Cancelled cheque / bank statement
- Director/founder KYC (Aadhaar + PAN)
- Business proof ( incorporation certificate / GST )

### MSG91 DLT Template Registration
- Register sender ID (e.g. `FINDMY`)
- Submit OTP template: "Your Findemy verification code is {#var#}. Valid for 5 minutes."
- DLT approval: 1-3 days

---

## 2. Secrets & Environment Variables

### `apps/api/.env` (Anshu)

```bash
# Database & Cache
DATABASE_URL=postgres://...              # Railway Postgres URL
REDIS_URL=redis://...                    # Railway Redis URL

# JWT (generate once, keep safe)
JWT_PRIVATE_KEY="-----BEGIN EC PRIVATE KEY-----\n...\n-----END EC PRIVATE KEY-----"
JWT_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----\n...\n-----END PUBLIC KEY-----"

# Razorpay (from Razorpay Dashboard)
RAZORPAY_KEY_ID=rzp_live_xxx
RAZORPAY_KEY_SECRET=xxx
RAZORPAY_WEBHOOK_SECRET=xxx

# MSG91 (from MSG91 Dashboard)
MSG91_AUTH_KEY=xxx
MSG91_TEMPLATE_ID=xxx

# Cloudflare R2 (for avatars + batch images)
R2_ACCOUNT_ID=xxx
R2_ACCESS_KEY_ID=xxx
R2_SECRET_ACCESS_KEY=xxx
R2_BUCKET=findemy-uploads

# Google Geocoding
GOOGLE_GEOCODING_KEY=xxx

# Expo Push (from expo.dev)
EXPO_ACCESS_TOKEN=xxx

# Sentry (from sentry.io)
SENTRY_DSN=https://...@sentry.io/...
```

**Generate JWT keys:**
```bash
openssl ecparam -genkey -name prime256v1 -noout -out private.pem
openssl ec -in private.pem -pubout -out public.pem
```

### `apps/student/.env` (Varun)

```bash
EXPO_PUBLIC_API_URL=https://api.findemy.app   # Production backend URL
EXPO_PUBLIC_SENTRY_DSN=...
```

### `apps/admin/.env` (Ritwik)

```bash
EXPO_PUBLIC_API_URL=https://api.findemy.app
EXPO_PUBLIC_SENTRY_DSN=...
```

---

## 3. EAS Build Config (Varun + Ritwik)

Create `apps/student/eas.json`:
```json
{
  "cli": { "version": ">= 12.0.0" },
  "build": {
    "development": { "developmentClient": true, "distribution": "internal" },
    "preview": { "distribution": "internal", "android": { "buildType": "apk" } },
    "production": { "autoIncrement": true }
  }
}
```

Create `apps/admin/eas.json` (same structure, different bundle IDs).

Register bundle IDs:
- Student: `app.findemy.student` (iOS) / `app.findemy.student` (Android)
- Admin: `app.findemy.admin` (iOS) / `app.findemy.admin` (Android)

---

## 4. Database Seed (Anshu)

Run once after first deploy:
```bash
cd apps/api
pnpm prisma:migrate
pnpm seed
```

Seed should create:
- 3-5 demo academies with coaches + batches
- 1 demo academy account (for Ritwik to login)
- Sample events

---

## 5. DNS & SSL (Anshu)

| Record | Type | Value |
|--------|------|-------|
| `api.findemy.app` | A | Railway app IP |
| `findemy.app` | CNAME | Vercel / Railway |

SSL is automatic on Railway.

---

## 6. Razorpay Webhook Setup (Anshu)

In Razorpay Dashboard → Webhooks:
- URL: `https://api.findemy.app/payments/webhook`
- Secret: match `RAZORPAY_WEBHOOK_SECRET`
- Events: `payment.captured`, `payment.failed`

---

## 7. Pre-Submission App Review

### Apple App Store
- [ ] Privacy policy URL
- [ ] App screenshots (6.5" + 5.5" + iPad)
- [ ] App description
- [ ] Keywords
- [ ] Support URL
- [ ] Demo account credentials (for review)

### Google Play
- [ ] Privacy policy URL
- [ ] App screenshots (phone + tablet)
- [ ] Feature graphic
- [ ] App description
- [ ] Content rating questionnaire

---

## 8. Team Contacts for Escalation

| Service | Support Channel |
|---------|----------------|
| Razorpay | partners@razorpay.com |
| MSG91 | support@msg91.com |
| Apple Developer | developer.apple.com/contact |
| Google Play | play-console-help@google.com |
| Railway | discord.gg/railway |
| Expo | expo.dev/support |
