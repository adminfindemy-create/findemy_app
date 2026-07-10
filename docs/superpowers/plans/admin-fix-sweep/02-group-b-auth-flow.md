# Group B — Auth, Onboarding & Navigation Guards — Sub-Plan
**Parent:** [00-MASTER-PLAN.md](./00-MASTER-PLAN.md)
**Goal:** Make OTP resend actually verify, stop unauthenticated/incomplete users from looping or 401-ing, align phone validation across login/signup/onboarding, make the auth store hydration-aware so guards don't false-fire, and fix the Google audience env mapping.
**Depends on:** Group A (data contract). **Also note:** Tasks B4 and B3 consume the new `_hasHydrated` flag added in Task B7 — implement B7 before wiring B4/B3 to it (ordering enforced below). **Blocks:** Group C (assumes routing/guards are stable).

---

## Context / verified line-number corrections

Before writing any code, every cited file was re-read. The audit line numbers were close; the **verified** locations and **two factual corrections** are:

- **B1/B2** — `apps/admin/app/(auth)/verify-otp.tsx`: the form is created with `useForm({ resolver: zodResolver(OtpVerifyRequest), defaultValues: { otp_id: otp_id ?? '', code: '' } })` at lines **20–23**; `otp_id` is captured **once** at mount from `useLocalSearchParams` (line 14). The Resend `Button` handler is lines **151–160** — it calls `setCountdown(60)` then `api.auth.requestOtp({ phone: phone ?? '', role: 'academy' }).catch(() => {})` **fire-and-forget, discarding the returned `otp_id`**. `requestOtp` returns `{ otp_id, expires_at, channel }` (verified `packages/api-client/src/index.ts:85`). `useForm` currently destructures only `{ control, handleSubmit, formState }` (line 20) — we must also pull `setValue`. `error`/`setError` already exist (line 18).
- **B3** — `apps/admin/app/(auth)/onboarding.tsx`: `account` is read at line **68**; there is **no** mount guard. The only auth check is **post-submit** at lines **102–108** (`useAuth.getState()` after the API call). We add a mount effect. `useState` is already imported (line 1); we add `useEffect`.
- **B4** — `apps/admin/app/_layout.tsx`: `AuthGuard` lines **20–64**. The completeness predicate is lines **40–45** (`academy && academy.name && academy.address && academy.category`). The fragile path compare is lines **48–49** (`const currentPath = '/' + segments.join('/'); if (currentPath !== '/(auth)/onboarding')`). **FACTUAL CORRECTION to the audit:** the backend **does** persist `address` — `createAcademyAndLink` writes `address: city` (`apps/api/src/modules/auth/repo.ts:286`) and `shapeAcademy` returns it (`apps/api/src/modules/auth/service.ts:576`). So on the happy path `address` is non-empty (= the city string). The real defect is that the predicate keys off `address` (a field onboarding *derives*, not one the user is asked for and not one guaranteed non-empty on the OAuth/returning-user shapes), and the brittle exact-string path compare. Fix per audit: drop `address` from the predicate (mirror onboarding's genuinely-required fields `name` + `category`) and use `segments.includes('onboarding')`.
- **B5** — `apps/admin/app/(auth)/login.tsx`: `useForm({ resolver: zodResolver(OtpRequest), defaultValues: { phone: '', role: 'academy' } })` at lines **14–17**; `OtpRequest` imported from `@findemy/types` (line 6). The shared `OtpRequest` is `phone: z.string().regex(/^\+?[1-9]\d{7,14}$/)` (verified `packages/types/src/index.ts:7–10` — the prompt's `packages/types/index.ts` path is actually `packages/types/src/index.ts`). The phone `Input` is lines **62–78**: `keyboardType="phone-pad"`, `onChangeText={onChange}` (no strip), **no `maxLength`**. Signup (the reference) uses a **local** zod `phone: z.string().min(10,…).max(10,…)` with `keyboardType="number-pad"` + `maxLength={10}` (`signup.tsx:13,113–114`). We replace login's reliance on the loose shared schema with a local 10-digit schema + digit-strip + `number-pad` + `maxLength`.
- **B6** — `apps/admin/app/(auth)/onboarding.tsx`: the local `schema` is lines **21–29**; `phone: z.string().min(1, 'Contact phone is required')` is line **28**. The phone `Input` (`keyboardType="phone-pad"`, no strip, no maxLength) is lines **268–290**. We tighten to a 10-digit rule and add strip + `number-pad` + `maxLength`.
- **B7** — `apps/admin/src/stores/auth.ts`: `persist(..., { name: 'findemy-admin-auth', storage: createJSONStorage(() => secureStorage) })` lines **26–39**; SecureStore is async (lines 6–10). There is **no** `_hasHydrated` flag and **no** `onRehydrateStorage`. No existing hydration-flag pattern anywhere in the repo (greps for `_hasHydrated|onRehydrateStorage` returned nothing), so this introduces the pattern.
- **B8** — `apps/admin/app/(auth)/index.tsx`: `configureGoogleSignin` lines **26–41**; the offending mapping is line **29**: `const webClientId = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID;` and line **28** `iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;`. **VERIFIED backend audience config:** `getGoogleAudiences('academy')` returns `[env.GOOGLE_ADMIN_IOS_CLIENT_ID, env.GOOGLE_ADMIN_ANDROID_CLIENT_ID]` (`apps/api/src/modules/auth/service.ts:185`). The admin app must therefore present idTokens whose `aud` matches the **admin** client IDs; the public env vars must be **admin-scoped**: `EXPO_PUBLIC_GOOGLE_ADMIN_IOS_CLIENT_ID` / `EXPO_PUBLIC_GOOGLE_ADMIN_ANDROID_CLIENT_ID`. (The current `EXPO_PUBLIC_GOOGLE_IOS/ANDROID_CLIENT_ID` names are generic/student-shaped and may carry an `aud` the backend's admin verifier rejects → `oauth_audience_mismatch`.)
- **B9** — `apps/admin/app/(auth)/signup.tsx`: the Back `TouchableOpacity` `onPress={() => router.back()}` is line **58**. No `canGoBack` guard.

`requestOtp` response shape `{ otp_id, expires_at, channel }` and `OtpVerifyRequest = { otp_id, code: z.string().length(6) }` are verified — `setValue('otp_id', …)` and `setValue('code','')` are both valid form fields.

---

## Files touched

| File | Issue | Change |
| --- | --- | --- |
| `apps/admin/src/stores/auth.ts` | B7 | Add `_hasHydrated` flag + `setHasHydrated` + `onRehydrateStorage`; type the new state |
| `apps/admin/app/_layout.tsx` | B4, B7 | Wait for hydration; predicate = `name && category`; use `segments.includes('onboarding')` |
| `apps/admin/app/(auth)/onboarding.tsx` | B3, B6 | Mount redirect guard (respects hydration); 10-digit phone zod + strip + `number-pad` + `maxLength` |
| `apps/admin/app/(auth)/verify-otp.tsx` | B1, B2 | Capture resend `otp_id` via `setValue`, reset `code`; await with loading + only reset countdown on success + surface errors |
| `apps/admin/app/(auth)/login.tsx` | B5 | Local 10-digit zod; digit-strip `onChangeText`; `number-pad` + `maxLength={10}` |
| `apps/admin/app/(auth)/index.tsx` | B8 | Map Google client IDs from admin-scoped `EXPO_PUBLIC_GOOGLE_ADMIN_*` env vars |
| `apps/admin/app/(auth)/signup.tsx` | B9 | `router.canGoBack() ? router.back() : router.replace('/(auth)')` |

No backend changes in Group B — the backend already persists `address` and exposes admin audience env vars. B8 is config alignment on the client only.

---

## Tasks

> **Checkpoint commands** used below:
> - App typecheck: `cd /home/mp2sslrl/code/code && export PATH="$HOME/.local/bin:$PATH" && pnpm --filter @findemy/admin typecheck`
> - Backend typecheck (sanity only, no backend edits): `cd /home/mp2sslrl/code/code && export PATH="$HOME/.local/bin:$PATH" && pnpm --filter @findemy/api typecheck`
> - **NO GIT** in this project — checkpoints are tsc + `grep` assertions, never commits.

---

### Task B7 — auth store: add a hydration flag (do this FIRST; B4 & B3 depend on it)

**File:** `apps/admin/src/stores/auth.ts` — state type lines **12–24**, store body lines **26–39**.

- [ ] 1. Add `_hasHydrated` and `setHasHydrated` to the `AuthState` type.

  **Before:**
  ```ts
  export type AuthState = {
    accessToken: string | null;
    refreshToken: string | null;
    account: AcademyAccount | null;
    academy: Academy | null;
    setAuth: (payload: {
      access: string;
      refresh: string;
      account: AcademyAccount;
      academy: Academy | null;
    }) => void;
    clear: () => void;
  };
  ```
  **After:**
  ```ts
  export type AuthState = {
    accessToken: string | null;
    refreshToken: string | null;
    account: AcademyAccount | null;
    academy: Academy | null;
    /** False until SecureStore rehydration completes. Guards must wait on this. */
    _hasHydrated: boolean;
    setHasHydrated: (v: boolean) => void;
    setAuth: (payload: {
      access: string;
      refresh: string;
      account: AcademyAccount;
      academy: Academy | null;
    }) => void;
    clear: () => void;
  };
  ```

- [ ] 2. Seed `_hasHydrated: false`, add `setHasHydrated`, and wire `onRehydrateStorage`.

  **Before:**
  ```ts
  export const useAuth = create<AuthState>()(
    persist(
      (set) => ({
        accessToken: null,
        refreshToken: null,
        account: null,
        academy: null,
        setAuth: ({ access, refresh, account, academy }) =>
          set({ accessToken: access, refreshToken: refresh, account, academy }),
        clear: () =>
          set({ accessToken: null, refreshToken: null, account: null, academy: null }),
      }),
      { name: 'findemy-admin-auth', storage: createJSONStorage(() => secureStorage) }
    )
  );
  ```
  **After:**
  ```ts
  export const useAuth = create<AuthState>()(
    persist(
      (set) => ({
        accessToken: null,
        refreshToken: null,
        account: null,
        academy: null,
        _hasHydrated: false,
        setHasHydrated: (v) => set({ _hasHydrated: v }),
        setAuth: ({ access, refresh, account, academy }) =>
          set({ accessToken: access, refreshToken: refresh, account, academy }),
        clear: () =>
          set({ accessToken: null, refreshToken: null, account: null, academy: null }),
      }),
      {
        name: 'findemy-admin-auth',
        storage: createJSONStorage(() => secureStorage),
        // _hasHydrated is runtime-only; never persist it.
        partialize: (state) => ({
          accessToken: state.accessToken,
          refreshToken: state.refreshToken,
          account: state.account,
          academy: state.academy,
        }),
        // Fires after async SecureStore read resolves (success or error).
        onRehydrateStorage: () => (state) => {
          state?.setHasHydrated(true);
        },
      }
    )
  );
  ```

- [ ] 3. **Checkpoint** — store compiles and exposes the flag:
  ```bash
  cd /home/mp2sslrl/code/code && export PATH="$HOME/.local/bin:$PATH" \
    && grep -n "_hasHydrated\|onRehydrateStorage\|setHasHydrated" apps/admin/src/stores/auth.ts \
    && pnpm --filter @findemy/admin typecheck
  ```
  Expect: grep prints the flag declaration, `setHasHydrated`, and the `onRehydrateStorage` line; typecheck exits **0 errors**.

---

### Task B4 — `_layout` AuthGuard: wait for hydration, fix predicate, robust segment check

**File:** `apps/admin/app/_layout.tsx` — `AuthGuard` lines **20–64**.

- [ ] 1. Subscribe to the hydration flag and the new academy academy state. Add the selector after the existing `academy` selector (line 25).

  **Before:**
  ```ts
    const accessToken = useAuth((s) => s.accessToken);
    const academy = useAuth((s) => s.academy);
  ```
  **After:**
  ```ts
    const accessToken = useAuth((s) => s.accessToken);
    const academy = useAuth((s) => s.academy);
    const hasHydrated = useAuth((s) => s._hasHydrated);
  ```

- [ ] 2. Gate the effect on hydration, fix the completeness predicate, and use `segments.includes('onboarding')`.

  **Before:**
  ```ts
    useEffect(() => {
      if (!navState?.key) return;

      const t = setTimeout(() => {
        const inAuthGroup = segments[0] === '(auth)';

        if (!accessToken) {
          if (!inAuthGroup) {
            router.replace('/(auth)');
          }
          return;
        }

        const academyComplete = !!(
          academy &&
          academy.name &&
          academy.address &&
          academy.category
        );

        if (!academyComplete) {
          const currentPath = '/' + segments.join('/');
          if (currentPath !== '/(auth)/onboarding') {
            router.replace('/(auth)/onboarding');
          }
          return;
        }

        if (inAuthGroup) {
          router.replace('/(tabs)/studio');
        }
      }, 0);

      return () => clearTimeout(t);
    }, [accessToken, academy, segments, router, navState?.key]);
  ```
  **After:**
  ```ts
    useEffect(() => {
      if (!navState?.key) return;
      // Don't route off a not-yet-rehydrated store: SecureStore is async and
      // accessToken reads null on first frame, which would falsely log the user out.
      if (!hasHydrated) return;

      const t = setTimeout(() => {
        const inAuthGroup = segments[0] === '(auth)';
        const onOnboarding = segments.includes('onboarding');

        if (!accessToken) {
          if (!inAuthGroup) {
            router.replace('/(auth)');
          }
          return;
        }

        // Mirror exactly what onboarding requires of the user: an academy with a
        // name and category. (address is derived server-side from city and is not
        // a user-entered required field, so it must not gate the guard.)
        const academyComplete = !!(academy && academy.name && academy.category);

        if (!academyComplete) {
          if (!onOnboarding) {
            router.replace('/(auth)/onboarding');
          }
          return;
        }

        if (inAuthGroup) {
          router.replace('/(tabs)/studio');
        }
      }, 0);

      return () => clearTimeout(t);
    }, [accessToken, academy, segments, router, navState?.key, hasHydrated]);
  ```

- [ ] 3. **Checkpoint** — the guard waits on hydration, predicate drops `address`, and uses the segment check:
  ```bash
  cd /home/mp2sslrl/code/code && export PATH="$HOME/.local/bin:$PATH" \
    && grep -n "if (!hasHydrated) return;\|segments.includes('onboarding')\|academy.name && academy.category" apps/admin/app/_layout.tsx \
    && ! grep -q "academy.address" apps/admin/app/_layout.tsx \
    && pnpm --filter @findemy/admin typecheck
  ```
  Expect: grep prints the three new lines; the `! grep` succeeds (no `academy.address` remains in this file); typecheck **0 errors**.

---

### Task B3 + B6 — onboarding: mount redirect guard + 10-digit phone validation

**File:** `apps/admin/app/(auth)/onboarding.tsx` — imports line **1**, schema lines **21–29**, component lines **65–88**, phone `Input` lines **268–290**.

- [ ] 1. Import `useEffect` and the auth store (the store is already imported as `useAuth`, line 10 — confirm it is). Add `useEffect` to the React import.

  **Before:**
  ```ts
  import React, { useState } from 'react';
  ```
  **After:**
  ```ts
  import React, { useEffect, useState } from 'react';
  ```

- [ ] 2. Tighten the `phone` field in the local zod schema (B6).

  **Before:**
  ```ts
    phone: z.string().min(1, 'Contact phone is required'),
  });
  ```
  **After:**
  ```ts
    phone: z
      .string()
      .regex(/^\d{10}$/, 'Enter a 10-digit phone number'),
  });
  ```

- [ ] 3. Add a mount redirect guard (B3). Insert immediately after the existing `const [errorMsg, setErrorMsg] = useState('');` line (line 71). Use `useAuth.getState()` so the guard fires once on mount regardless of subscription, but gate on hydration so it doesn't bounce a still-rehydrating session.

  **Before:**
  ```ts
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    const defaultOwnerName = onboardingStore.ownerName || account?.ownerName || '';
  ```
  **After:**
  ```ts
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    // Render-time guard: an unauthenticated visit must bounce to the auth root
    // BEFORE the form's submit can 401. Wait for SecureStore rehydration first.
    useEffect(() => {
      const { _hasHydrated, accessToken } = useAuth.getState();
      if (_hasHydrated && !accessToken) {
        router.replace('/(auth)');
      }
    }, [router]);

    const defaultOwnerName = onboardingStore.ownerName || account?.ownerName || '';
  ```

- [ ] 4. Strip non-digits and constrain the phone `Input` (B6).

  **Before:**
  ```ts
              <Input
                placeholder="Contact phone"
                keyboardType="phone-pad"
                value={value}
                onChangeText={(t) => {
                  onChange(t);
                  onboardingStore.setField('phone', t);
                }}
                error={error?.message}
  ```
  **After:**
  ```ts
              <Input
                placeholder="Contact phone"
                keyboardType="number-pad"
                maxLength={10}
                value={value}
                onChangeText={(t) => {
                  const digits = t.replace(/\D/g, '').slice(0, 10);
                  onChange(digits);
                  onboardingStore.setField('phone', digits);
                }}
                error={error?.message}
  ```

- [ ] 5. **Checkpoint** — guard, validation, and input constraints are present:
  ```bash
  cd /home/mp2sslrl/code/code && export PATH="$HOME/.local/bin:$PATH" \
    && grep -n "if (_hasHydrated && !accessToken)\|/\^\\\\d{10}\$/\|replace(/\\\\D/g" apps/admin/app/(auth)/onboarding.tsx \
    && ! grep -q 'keyboardType="phone-pad"' apps/admin/app/(auth)/onboarding.tsx \
    && pnpm --filter @findemy/admin typecheck
  ```
  Expect: grep prints the guard line, the `^\d{10}$` regex, and the digit-strip; the `! grep` confirms `phone-pad` is gone from this file; typecheck **0 errors**.

---

### Task B1 + B2 — verify-otp: resend re-syncs `otp_id`, awaits with feedback

**File:** `apps/admin/app/(auth)/verify-otp.tsx` — `useForm` line **20**, state lines **17–18**, Resend handler lines **151–160**.

- [ ] 1. Pull `setValue` out of `useForm` and add a `resending` state.

  **Before:**
  ```ts
    const setAuth = useAuth((s) => s.setAuth);
    const [countdown, setCountdown] = useState(60);
    const [error, setError] = useState('');

    const { control, handleSubmit, formState } = useForm({
      resolver: zodResolver(OtpVerifyRequest),
      defaultValues: { otp_id: otp_id ?? '', code: '' },
    });
  ```
  **After:**
  ```ts
    const setAuth = useAuth((s) => s.setAuth);
    const [countdown, setCountdown] = useState(60);
    const [error, setError] = useState('');
    const [resending, setResending] = useState(false);

    const { control, handleSubmit, formState, setValue } = useForm({
      resolver: zodResolver(OtpVerifyRequest),
      defaultValues: { otp_id: otp_id ?? '', code: '' },
    });
  ```

- [ ] 2. Add a real resend handler above the `return` (insert just before `return (` on line 101).

  **Before:**
  ```ts
    };

    return (
      <Screen scroll={false}>
  ```
  **After:**
  ```ts
    };

    const onResend = async () => {
      if (resending) return;
      setResending(true);
      setError('');
      try {
        const r = await api.auth.requestOtp({ phone: phone ?? '', role: 'academy' });
        // Backend mints a NEW otp row each request; the freshly-sent code verifies
        // against THIS otp_id, not the original. Re-sync the form and clear the input.
        setValue('otp_id', r.otp_id);
        setValue('code', '');
        setCountdown(60); // only restart the timer once the resend actually succeeded
      } catch (e: any) {
        const code = e?.code ?? '';
        if (code === 'RATE_LIMITED') {
          setError('Too many attempts. Please wait a minute and try again.');
        } else {
          setError(e?.message ?? "Couldn't resend the code. Check your connection.");
        }
      } finally {
        setResending(false);
      }
    };

    return (
      <Screen scroll={false}>
  ```

- [ ] 3. Replace the fire-and-forget Resend `Button` (lines 151–160) with one that awaits, shows loading, and disables while in flight.

  **Before:**
  ```ts
            <Button
              variant="ghost"
              onPress={() => {
                setCountdown(60);
                api.auth.requestOtp({ phone: phone ?? '', role: 'academy' }).catch(() => {});
              }}
            >
              Resend
            </Button>
  ```
  **After:**
  ```ts
            <Button
              variant="ghost"
              onPress={onResend}
              loading={resending}
              disabled={resending}
            >
              {resending ? 'Sending…' : 'Resend'}
            </Button>
  ```

- [ ] 4. **Checkpoint** — resend re-syncs the id, awaits, and the old fire-and-forget is gone:
  ```bash
  cd /home/mp2sslrl/code/code && export PATH="$HOME/.local/bin:$PATH" \
    && grep -n "setValue('otp_id', r.otp_id)\|setValue('code', '')\|onPress={onResend}\|loading={resending}" apps/admin/app/(auth)/verify-otp.tsx \
    && ! grep -q ".catch(() => {})" apps/admin/app/(auth)/verify-otp.tsx \
    && pnpm --filter @findemy/admin typecheck
  ```
  Expect: grep prints all four new lines; the `! grep` confirms no `.catch(() => {})` swallow remains; typecheck **0 errors**.

---

### Task B5 — login: align phone validation with signup (10-digit, number-pad, strip)

**File:** `apps/admin/app/(auth)/login.tsx` — imports lines **5–6**, `useForm` lines **14–17**, phone `Input` lines **62–78**.

- [ ] 1. Add a local zod schema and stop relying on the loose shared `OtpRequest` for validation. Replace the `OtpRequest` import with `z` + keep the type-only role union inline.

  **Before:**
  ```ts
  import { zodResolver } from '@hookform/resolvers/zod';
  import { OtpRequest } from '@findemy/types';
  import { useTheme, Input, Button } from '@findemy/ui';
  ```
  **After:**
  ```ts
  import { zodResolver } from '@hookform/resolvers/zod';
  import { z } from 'zod';
  import { useTheme, Input, Button } from '@findemy/ui';

  // Matches signup: India 10-digit bare number. The backend looks the account up by
  // bare phone, so a loose 8–15-digit shared schema would let mismatched input through.
  const schema = z.object({
    phone: z.string().regex(/^\d{10}$/, 'Enter a 10-digit phone number'),
    role: z.literal('academy'),
  });
  ```

- [ ] 2. Point the resolver at the local schema.

  **Before:**
  ```ts
    const { control, handleSubmit, formState } = useForm({
      resolver: zodResolver(OtpRequest),
      defaultValues: { phone: '', role: 'academy' as const },
    });
  ```
  **After:**
  ```ts
    const { control, handleSubmit, formState } = useForm({
      resolver: zodResolver(schema),
      defaultValues: { phone: '', role: 'academy' as const },
    });
  ```

- [ ] 3. Strip non-digits and constrain the phone `Input`.

  **Before:**
  ```ts
          render={({ field: { onChange, value } }) => (
            <Input
              value={value}
              onChangeText={onChange}
              placeholder="Phone number"
              keyboardType="phone-pad"
              prefix={
  ```
  **After:**
  ```ts
          render={({ field: { onChange, value } }) => (
            <Input
              value={value}
              onChangeText={(t) => onChange(t.replace(/\D/g, '').slice(0, 10))}
              placeholder="Phone number"
              keyboardType="number-pad"
              maxLength={10}
              prefix={
  ```

- [ ] 4. **Checkpoint** — login now mirrors signup and no longer imports the loose schema:
  ```bash
  cd /home/mp2sslrl/code/code && export PATH="$HOME/.local/bin:$PATH" \
    && grep -n "zodResolver(schema)\|keyboardType=\"number-pad\"\|maxLength={10}\|replace(/\\\\D/g" apps/admin/app/(auth)/login.tsx \
    && ! grep -q "OtpRequest" apps/admin/app/(auth)/login.tsx \
    && ! grep -q 'keyboardType="phone-pad"' apps/admin/app/(auth)/login.tsx \
    && pnpm --filter @findemy/admin typecheck
  ```
  Expect: grep prints the local resolver + input constraints; both `! grep`s confirm `OtpRequest` and `phone-pad` are gone; typecheck **0 errors**.

---

### Task B8 — Google config: map admin-scoped client IDs (verification + rename)

**File:** `apps/admin/app/(auth)/index.tsx` — `configureGoogleSignin` lines **26–41** (the env reads are lines **28–29**).

> **Verified backend audience config** (`apps/api/src/modules/auth/service.ts:178–197`): for `role === 'academy'`, accepted Google audiences are exactly `[env.GOOGLE_ADMIN_IOS_CLIENT_ID, env.GOOGLE_ADMIN_ANDROID_CLIENT_ID]`. The admin client must therefore configure Google Sign-In with the **admin** client IDs so the minted idToken's `aud` matches — otherwise the verifier throws `oauth_audience_mismatch` (401). The exact public env-var names to use are `EXPO_PUBLIC_GOOGLE_ADMIN_IOS_CLIENT_ID` and `EXPO_PUBLIC_GOOGLE_ADMIN_ANDROID_CLIENT_ID`.

- [ ] 1. Re-point both client-ID reads at the admin-scoped public env vars.

  **Before:**
  ```ts
  function configureGoogleSignin() {
    if (!GoogleSignin) return false;
    const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
    const webClientId = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID; // android uses webClientId
    if (!iosClientId && !webClientId) return false;
  ```
  **After:**
  ```ts
  function configureGoogleSignin() {
    if (!GoogleSignin) return false;
    // Must match the backend's admin audience (getGoogleAudiences('academy') →
    // GOOGLE_ADMIN_IOS/ANDROID_CLIENT_ID). Generic/student-scoped client IDs would
    // mint idTokens whose `aud` the admin verifier rejects (oauth_audience_mismatch).
    const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_ADMIN_IOS_CLIENT_ID;
    const webClientId = process.env.EXPO_PUBLIC_GOOGLE_ADMIN_ANDROID_CLIENT_ID; // android uses webClientId
    if (!iosClientId && !webClientId) return false;
  ```

- [ ] 2. **Verification — `.env` / `app.config` alignment.** Confirm the new public names exist (or document that they must be added to the admin app env). They are runtime env vars, so this is a config dependency, not a code dependency.
  ```bash
  cd /home/mp2sslrl/code/code \
    && grep -rn "EXPO_PUBLIC_GOOGLE_ADMIN_IOS_CLIENT_ID\|EXPO_PUBLIC_GOOGLE_ADMIN_ANDROID_CLIENT_ID" apps/admin/.env* apps/admin/app.config.* apps/admin/app.json 2>/dev/null \
    ; grep -rn "GOOGLE_ADMIN_IOS_CLIENT_ID\|GOOGLE_ADMIN_ANDROID_CLIENT_ID" apps/api/.env* 2>/dev/null
  ```
  Expect: if the admin `.env` already defines the admin-scoped public vars, they print here. If **nothing** prints for the admin app, that is the action item — add `EXPO_PUBLIC_GOOGLE_ADMIN_IOS_CLIENT_ID` / `EXPO_PUBLIC_GOOGLE_ADMIN_ANDROID_CLIENT_ID` to `apps/admin/.env` set to the **same** values the backend's `GOOGLE_ADMIN_*` vars use (they are the OAuth client's iOS/Android IDs, shared client↔server). Record the finding in the task notes.

- [ ] 3. **Checkpoint** — the source now reads admin-scoped names and the old generic names are gone:
  ```bash
  cd /home/mp2sslrl/code/code && export PATH="$HOME/.local/bin:$PATH" \
    && grep -n "EXPO_PUBLIC_GOOGLE_ADMIN_IOS_CLIENT_ID\|EXPO_PUBLIC_GOOGLE_ADMIN_ANDROID_CLIENT_ID" apps/admin/app/(auth)/index.tsx \
    && ! grep -qE "EXPO_PUBLIC_GOOGLE_(IOS|ANDROID)_CLIENT_ID" apps/admin/app/(auth)/index.tsx \
    && pnpm --filter @findemy/admin typecheck
  ```
  Expect: grep prints both admin-scoped reads; the `! grep` confirms the old generic names no longer appear in this file; typecheck **0 errors**.

---

### Task B9 — signup: safe Back when there is no history

**File:** `apps/admin/app/(auth)/signup.tsx` — Back `TouchableOpacity` line **58**.

- [ ] 1. Guard `router.back()` with `canGoBack()`.

  **Before:**
  ```ts
          <TouchableOpacity onPress={() => router.back()} style={{ marginBottom: 24 }}>
  ```
  **After:**
  ```ts
          <TouchableOpacity
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/(auth)'))}
            style={{ marginBottom: 24 }}
          >
  ```

- [ ] 2. **Checkpoint** — the safe-back guard is present:
  ```bash
  cd /home/mp2sslrl/code/code && export PATH="$HOME/.local/bin:$PATH" \
    && grep -n "router.canGoBack() ? router.back() : router.replace('/(auth)')" apps/admin/app/(auth)/signup.tsx \
    && pnpm --filter @findemy/admin typecheck
  ```
  Expect: grep prints the guarded handler; typecheck **0 errors**.

---

### Task B10 — Group-B final verification

**Files:** none (verification only).

- [ ] 1. Full app typecheck (covers every task).
  ```bash
  cd /home/mp2sslrl/code/code && export PATH="$HOME/.local/bin:$PATH" && pnpm --filter @findemy/admin typecheck
  ```
  Expect: **0 errors**.

- [ ] 2. Sanity: backend still typechecks (no backend edits, so this must stay green).
  ```bash
  cd /home/mp2sslrl/code/code && export PATH="$HOME/.local/bin:$PATH" && pnpm --filter @findemy/api typecheck
  ```
  Expect: **0 errors**.

- [ ] 3. Prove every bad pattern is gone and every fix is in place.
  ```bash
  cd /home/mp2sslrl/code/code
  # B7: hydration flag exists
  grep -q "onRehydrateStorage" apps/admin/src/stores/auth.ts && echo "B7 ok"
  # B4: guard waits for hydration, predicate dropped address
  grep -q "if (!hasHydrated) return;" apps/admin/app/_layout.tsx \
    && ! grep -q "academy.address" apps/admin/app/_layout.tsx && echo "B4 ok"
  # B3/B6: onboarding guard + no phone-pad
  grep -q "if (_hasHydrated && !accessToken)" apps/admin/app/(auth)/onboarding.tsx \
    && ! grep -q 'keyboardType="phone-pad"' apps/admin/app/(auth)/onboarding.tsx && echo "B3/B6 ok"
  # B1/B2: resend re-syncs id, no fire-and-forget
  grep -q "setValue('otp_id', r.otp_id)" apps/admin/app/(auth)/verify-otp.tsx \
    && ! grep -q ".catch(() => {})" apps/admin/app/(auth)/verify-otp.tsx && echo "B1/B2 ok"
  # B5: login no longer phone-pad / loose schema
  ! grep -q 'keyboardType="phone-pad"' apps/admin/app/(auth)/login.tsx \
    && ! grep -q "OtpRequest" apps/admin/app/(auth)/login.tsx && echo "B5 ok"
  # B8: admin-scoped google env
  grep -q "EXPO_PUBLIC_GOOGLE_ADMIN_ANDROID_CLIENT_ID" apps/admin/app/(auth)/index.tsx && echo "B8 ok"
  # B9: safe back
  grep -q "router.canGoBack()" apps/admin/app/(auth)/signup.tsx && echo "B9 ok"
  ```
  Expect: all seven `... ok` lines print.

- [ ] 4. **Checkpoint** — Group B is complete when steps 1–3 all pass. Hand off to Group C, which can now assume the auth store is hydration-aware, the guard no longer loops, resend works, and phone input is consistent.
