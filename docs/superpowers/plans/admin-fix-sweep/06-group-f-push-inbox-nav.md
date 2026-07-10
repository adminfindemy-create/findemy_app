# Group F — Push notifications, inbox state & navigation shell — Sub-Plan
**Parent:** [00-MASTER-PLAN.md](./00-MASTER-PLAN.md)
**Goal:** Make the unread badge actually increment, stop push tokens leaking across logout/refresh, label trial-request cards by real status, give settings/workshops a navbar selection state, sanitize the WhatsApp deep-link, route profile image upload/delete through the shared api-client, and honor (or remove) `Screen`'s `bottomTab` prop so the Save button isn't clipped.
**Depends on:** None — self-contained. Touches `apps/admin` only, plus a verify-only check of `packages/api-client` (no client change required — `api.push.unregister` already exists).
**Blocks:** Group E-equivalent shared-component refactor if one exists for admin (do this first; it changes the same `inbox.tsx`/`Screen.tsx` files).

---

## Context / verified line-number corrections

I re-read every cited file. Several prompt line numbers and claims drifted from the current source. Corrections:

| Item | Prompt claim | Verified reality |
|---|---|---|
| inbox `resetNew()` call | `inbox.tsx` ~58, 68-75 | `resetNew` selector at **:58**; `useFocusEffect` calling `resetNew()` at **:68-75**. Correct. |
| inbox confirmed badge | `inbox.tsx` ~203-206 `urgent ? 'SOON' : 'CONFIRMED'` | At **:203-207** (`styles.trialBadge` `<View>` + `<Text>`). Footer "Auto-confirmed" at **:229**. Correct. |
| inbox **already uses Spill** | (not noted) | `inbox.tsx` **:225** already renders `<Spill state={trial.status ?? 'pending'} />` in `stuRow`, and **:274** for schedule. So the *real* mislabel is only the separate `trialBadge` (`SOON`/`CONFIRMED`) at :203-207 and the hard-coded "Auto-confirmed" footer at :229 — the Spill is fine. Fix targets those two, not the Spill. |
| tab badge | `_layout.tsx` ~67 | `tabBarBadge` at **:67**; `newCount = useInbox((s) => s.newCountSinceLastSeen)` at **:38**. Correct. |
| `bumpNew` never called | src/stores/inbox.ts | Confirmed — `bumpNew` defined (**:21**) but zero call-sites anywhere. `setLastSeen`/`lastSeenCount` defined (**:10/:7/:20**) but unused. |
| push handler empty body | `usePushNotifications.ts` ~53 | `if (data?.type === 'trial:new') { /* comment only */ }` at **:53-55**. Correct. |
| push register, no unregister | `usePushNotifications.ts` ~38-74 | Register at **:41-47**; effect deps `[accessToken]` at **:74**; **no** unregister, **no** token stored. Correct. |
| `api.push.unregister` exists | "verify" | **Verified** in `packages/api-client/src/index.ts` **:370-371**: `unregister: (token) => request("DELETE", \`/push/register?token=${encodeURIComponent(token)}\`)`. Backend `DELETE /push/register` at `apps/api/src/modules/push/routes.ts` **:21-24**. No client change needed. |
| navbar missing settings/workshops | `_layout.tsx` ~48-67 | NavBar `items` at **:52-57** = inbox/schedule/students/studio only. `workshops`/`settings` registered as `Tabs.Screen` at **:71-72** but absent from `items`. Correct. |
| how settings/workshops are reached | "VERIFY" | **Verified**: reached via `router.push('/workshops')` / `router.push('/settings')` from `studio.tsx` **:152, :186, :212** and `earnings.tsx` **:106**. They are *navigable*, just not navbar tabs. On those routes `active = state.routes[state.index].name` is `'workshops'`/`'settings'`, which matches **no** NavBar item, so nothing highlights. |
| InboxCard wa.me | `InboxCard.tsx` ~41 | `Linking.openURL(\`https://wa.me/${item.student_phone}\`)` at **:41**. Correct. |
| profile raw fetch | `profile/edit.tsx` ~121-131, 155-165 | Upload raw `fetch` at **:122-131** (token read at :121); delete raw `fetch` at **:155-165**. Both hit `process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8080'`. Correct. |
| Screen `bottomTab` ignored | `Screen.tsx` ~7-29 | Prop typed at **:11/:15**, destructured at **:11**, but **never used** in JSX (**:21-28**). `edges={['top']}` at **:22** omits bottom. Correct. `profile/edit.tsx` passes `bottomTab={null}` at **:181**; `settings.tsx` passes `bottomTab="settings"` at **:63**. |
| `useStudioInbox` shape | (n/a) | `api.studio.inbox.list({ status, limit })`; query key `['studio','inbox',status]`. Dashboard exposes `inbox_counts: { new; pending; confirmed }` (`packages/types` **:348**). |
| `TrialInboxItem.status` type | (n/a) | `= Trial['status'] = 'booked' \| 'attended' \| 'missed' \| 'cancelled'` (`packages/types` **:197/:211**). So `inbox_counts.new` (the *count* of new requests) is **not** the same axis as `item.status`. The badge derivation must use the **count**, not item status. |
| **push hook is outside QueryClientProvider** | (not noted) | **Critical gotcha:** `_layout.tsx` calls `usePushNotifications()` at **:67**, *outside* `<QueryClientProvider>` (opens at **:71**). So the hook **cannot** call `useQueryClient()`/`invalidateQueries`. The push→badge path must use the **zustand** `useInbox` store (no provider needed). This is why Task 1 uses `bumpNew()` from the store, not query invalidation. |

---

## Files touched

| File | Tasks | Change |
|---|---|---|
| `apps/admin/src/stores/inbox.ts` | 1 | Add persistence of `lastSeenCount`; keep `bumpNew`/`setLastSeen` (now used). |
| `apps/admin/src/hooks/usePushNotifications.ts` | 1, 2, 3 | Call `bumpNew()` on `trial:new`; store token in ref + `unregister` on cleanup; gate on a stable logged-in key; fix deps. |
| `apps/admin/app/(tabs)/inbox.tsx` | 1, 4 | Wire `setLastSeen(inbox_counts.new)` on focus alongside `resetNew()`; replace the `SOON/CONFIRMED` `trialBadge` and "Auto-confirmed" footer with status-driven copy. |
| `apps/admin/app/(tabs)/_layout.tsx` | 1, 5 | Derive badge from store; add settings/workshops navbar handling so `active` highlights. |
| `apps/admin/src/components/InboxCard.tsx` | 6 | Sanitize phone for `wa.me`. |
| `apps/admin/app/profile/edit.tsx` | 7 | Route upload/delete through a shared helper that reuses `getBaseUrl()` + 401 refresh-retry. |
| `apps/admin/src/lib/api.ts` | 7 | Export `getBaseUrl` and add a multipart-capable `uploadWithAuth`/`deleteJsonWithAuth` helper reusing the same refresh path. |
| `apps/admin/src/components/Screen.tsx` | 8 | Render bottom spacing from `bottomTab`, add bottom safe-area padding for non-tab scroll screens. |

**No new files. No api-client change** (`api.push.unregister` already present).

---

## Tasks

### Task 1 — Revive the unread badge (push `bumpNew` + focus `setLastSeen`)

The badge feature is dead: `bumpNew()` is never called and `setLastSeen`/`lastSeenCount` are unused. Two complementary fixes: (a) increment on a real `trial:new` push, and (b) make the on-focus reset use `setLastSeen(currentNewCount)` so the badge reflects "new since last viewed" even without a push (catch-up via the 30s poll / dashboard count).

**Files:** `src/stores/inbox.ts`, `src/hooks/usePushNotifications.ts`, `app/(tabs)/inbox.tsx`, `app/(tabs)/_layout.tsx`.

**Step 1.1 — Persist `lastSeenCount` in the store.**
- [ ] Add `persist` so the "last seen" survives reloads. Keep `bumpNew`/`setLastSeen`/`resetNew` as-is (they are correct; they were just never wired).

`apps/admin/src/stores/inbox.ts` — before:
```ts
import { create } from 'zustand';

export type InboxFilter = 'new' | 'pending' | 'confirmed' | 'completed';

export type InboxState = {
  filter: InboxFilter;
  lastSeenCount: number;
  newCountSinceLastSeen: number;
  setFilter: (f: InboxFilter) => void;
  setLastSeen: (c: number) => void;
  bumpNew: () => void;
  resetNew: () => void;
};

export const useInbox = create<InboxState>((set) => ({
  filter: 'new',
  lastSeenCount: 0,
  newCountSinceLastSeen: 0,
  setFilter: (f) => set({ filter: f }),
  setLastSeen: (c) => set({ lastSeenCount: c }),
  bumpNew: () => set((s) => ({ newCountSinceLastSeen: s.newCountSinceLastSeen + 1 })),
  resetNew: () => set({ newCountSinceLastSeen: 0 }),
}));
```
after:
```ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type InboxFilter = 'new' | 'pending' | 'confirmed' | 'completed';

export type InboxState = {
  filter: InboxFilter;
  lastSeenCount: number;
  newCountSinceLastSeen: number;
  setFilter: (f: InboxFilter) => void;
  setLastSeen: (c: number) => void;
  bumpNew: () => void;
  resetNew: () => void;
};

export const useInbox = create<InboxState>()(
  persist(
    (set) => ({
      filter: 'new',
      lastSeenCount: 0,
      newCountSinceLastSeen: 0,
      setFilter: (f) => set({ filter: f }),
      setLastSeen: (c) => set({ lastSeenCount: c }),
      bumpNew: () => set((s) => ({ newCountSinceLastSeen: s.newCountSinceLastSeen + 1 })),
      resetNew: () => set({ newCountSinceLastSeen: 0 }),
    }),
    {
      name: 'findemy-admin-inbox',
      storage: createJSONStorage(() => AsyncStorage),
      // Only persist the seen baseline; filter + transient unread count are session state.
      partialize: (s) => ({ lastSeenCount: s.lastSeenCount }),
    }
  )
);
```
> **Verify the AsyncStorage dependency before committing to it.** Run the grep in the checkpoint. If `@react-native-async-storage/async-storage` is **not** already a dependency of `apps/admin`, do **not** add a new dep just for this — instead drop `persist` entirely and keep the original plain `create<InboxState>((set) => ({...}))`. `lastSeenCount` not surviving a cold start is an acceptable degradation (worst case the badge shows a stale count once after relaunch, then self-corrects on focus). The auth store uses `expo-secure-store`, which is the wrong tool for a non-secret counter, so don't reuse that. Default: **if AsyncStorage is absent, ship the non-persisted version.**

**Step 1.2 — Increment on a real `trial:new` push.**
- [ ] In `usePushNotifications.ts`, import the store and call `bumpNew()` from the `trial:new` branch. The store is plain zustand, callable outside React via `useInbox.getState()` — this sidesteps the "hook runs outside QueryClientProvider" problem (see Context table).

`apps/admin/src/hooks/usePushNotifications.ts` — add to imports (top, after the existing `useAuth` import):
```ts
import { useInbox } from '@/stores/inbox';
```
Replace the empty handler body (**:53-55**) — before:
```ts
        if (data?.type === 'trial:new') {
          // Trigger inbox refetch via query client invalidation
        }
```
after:
```ts
        if (data?.type === 'trial:new') {
          // Bump the unread tab badge. We use the zustand store (not query
          // invalidation) because this hook mounts OUTSIDE QueryClientProvider.
          // The inbox screen's 30s poll + on-focus refetch reconciles the list.
          useInbox.getState().bumpNew();
        }
```

**Step 1.3 — On focus, set the seen baseline from the live count.**
- [ ] In `inbox.tsx`, in addition to `resetNew()`, persist the current "new" count as the seen baseline. This makes `lastSeenCount` meaningful and lets the badge recover even when a push was missed.

`apps/admin/app/(tabs)/inbox.tsx` — add the selector next to `resetNew` (**:58**):
```ts
  const resetNew = useInbox((s) => s.resetNew);
  const setLastSeen = useInbox((s) => s.setLastSeen);
```
Update the focus effect (**:68-75**) — before:
```ts
  useFocusEffect(
    React.useCallback(() => {
      resetNew();
      refetchDash();
      refetchInbox();
      refetchActivity();
    }, [resetNew, refetchDash, refetchInbox, refetchActivity])
  );
```
after:
```ts
  useFocusEffect(
    React.useCallback(() => {
      resetNew();
      refetchDash();
      refetchInbox();
      refetchActivity();
    }, [resetNew, refetchDash, refetchInbox, refetchActivity])
  );

  // Record the count the coach has now seen as the baseline for "new since".
  // `dashboard` updates after the refetch above; this effect re-runs when it lands.
  React.useEffect(() => {
    const seen = (dashboard as Record<string, any> | undefined)?.inbox_counts?.new;
    if (typeof seen === 'number') setLastSeen(seen);
  }, [dashboard, setLastSeen]);
```
> Note: `dash` is computed at **:77** (`const dash = dashboard as Record<string, any> | undefined;`) *after* the focus effect. Reference `dashboard` directly in the new effect (as written) to avoid a use-before-declare; do not move `dash` up.

**Step 1.4 — Badge value (unchanged wiring, now actually fed).** `_layout.tsx` already reads `newCountSinceLastSeen` (**:38**) into `tabBarBadge` (**:67**). With 1.2 feeding it, no `_layout` change is required *for the badge itself* (the navbar entry-point work is Task 5). Leave the badge wiring as-is.

**Checkpoint:**
```
cd /home/mp2sslrl/code/code && export PATH="$HOME/.local/bin:$PATH" && pnpm --filter @findemy/admin typecheck
cd /home/mp2sslrl/code/code && cat apps/admin/package.json | grep -c "@react-native-async-storage/async-storage"  # 1 = present → persist OK; 0 = drop persist (Step 1.1 note)
cd /home/mp2sslrl/code/code && grep -rn "bumpNew\|setLastSeen" apps/admin/src apps/admin/app
```
Expected: typecheck **0 errors**. The grep shows `bumpNew()` called in `usePushNotifications.ts` and `setLastSeen` used in `inbox.tsx` (no longer dead). If the async-storage count is `0`, you must have already reverted to the non-persisted store.

---

### Task 2 — Unregister push token on logout / cleanup

The hook registers a token whenever `accessToken` becomes truthy but never unregisters it, and never even keeps the token, so the device keeps receiving push after logout.

**Files:** `src/hooks/usePushNotifications.ts`.

**Step 2.1 — Store the registered token in a ref and unregister on cleanup.**
- [ ] Add a `registeredToken` ref. On successful register, save it. In the effect cleanup, if a token is stored, call `api.push.unregister(token)` and clear the ref. (Cleanup runs both on unmount and — combined with Task 3's dependency change — when the logged-in identity changes, i.e. logout.)

`apps/admin/src/hooks/usePushNotifications.ts` — add the ref alongside the existing listener refs (**:35-36**):
```ts
  const notificationListener = useRef<any>(null);
  const responseListener = useRef<any>(null);
  const registeredToken = useRef<string | null>(null);
```
Update the register call (**:41-47**) — before:
```ts
    registerForPushNotificationsAsync().then((token) => {
      if (token) {
        api.push
          .register({ expo_token: token, platform: Platform.OS as 'ios' | 'android' })
          .catch(() => {});
      }
    });
```
after:
```ts
    registerForPushNotificationsAsync().then((token) => {
      if (token) {
        registeredToken.current = token;
        api.push
          .register({ expo_token: token, platform: Platform.OS as 'ios' | 'android' })
          .catch(() => {});
      }
    });
```
Update the cleanup (**:70-73**) — before:
```ts
    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
```
after:
```ts
    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
      const token = registeredToken.current;
      if (token) {
        // Detach this device from the now-logged-out account so it stops
        // receiving push. Best-effort: ignore failures (offline logout).
        api.push.unregister(token).catch(() => {});
        registeredToken.current = null;
      }
    };
```
> Backend `DELETE /push/register?token=` requires auth (`requireAuth()` preHandler). On logout the cleanup runs *before* `clear()` has necessarily torn everything down, but to be safe the unregister relies on the token still being valid at cleanup time. Because Task 3 changes the dep to a stable logged-in key, cleanup fires while `accessToken` is still the old (valid) one during the transition tick; the api-client reads `getAccessToken()` at request time. If the token is already cleared the request 401s and the `.catch` swallows it — acceptable (server-side token rows are also cleaned on account teardown). Do not block logout on this call.

**Checkpoint:**
```
cd /home/mp2sslrl/code/code && export PATH="$HOME/.local/bin:$PATH" && pnpm --filter @findemy/admin typecheck
cd /home/mp2sslrl/code/code && grep -n "api.push.unregister\|registeredToken" apps/admin/src/hooks/usePushNotifications.ts
```
Expected: typecheck **0 errors**. Grep shows the ref declared, assigned on register, and `api.push.unregister(token)` in cleanup.

---

### Task 3 — Stop re-registering on every token refresh

The effect deps are `[accessToken]`. `api.ts` rotates `accessToken` on every refresh (`setAuth` in `doRefresh`), so routine refresh re-runs permission prompts + re-POSTs `/push/register`. Gate on a stable logged-in identity instead.

**Files:** `src/hooks/usePushNotifications.ts`.

**Step 3.1 — Depend on a stable logged-in key, not the rotating token.**
- [ ] Subscribe to `account?.id` (stable across refreshes; null on logout) and use a boolean `isLoggedIn` for the guard. Keep reading the token via the api-client at request time (it already does). Include `router` in deps for lint-correctness.

`apps/admin/src/hooks/usePushNotifications.ts` — replace the token subscription (**:34**) — before:
```ts
  const accessToken = useAuth((s) => s.accessToken);
```
after:
```ts
  // Gate on the stable account id, NOT the access token: the token rotates on
  // every refresh, which would otherwise re-trigger registration each refresh.
  const accountId = useAuth((s) => s.account?.id ?? null);
```
Update the guard (**:39**) — before:
```ts
    if (!accessToken || isExpoGo || !Notifications) return;
```
after:
```ts
    if (!accountId || isExpoGo || !Notifications) return;
```
Update the deps (**:74**) — before:
```ts
  }, [accessToken]);
```
after:
```ts
  }, [accountId, router]);
```
> `router` from `useRouter()` is stable across renders in expo-router, so adding it to deps does not re-run the effect; it's purely for exhaustive-deps lint correctness (the cleanup/handlers close over `router`). The effect now runs once per login (when `accountId` goes null→value) and tears down once per logout (value→null), which is exactly when we want register/unregister to fire.
>
> **Verify `AcademyAccount` has an `id` field.** It is the keyed identity in `useAuth`. If the field is named differently (e.g. `account_id`), use that. Confirm via the checkpoint grep; adjust the selector if needed.

**Checkpoint:**
```
cd /home/mp2sslrl/code/code && export PATH="$HOME/.local/bin:$PATH" && pnpm --filter @findemy/admin typecheck
cd /home/mp2sslrl/code/code && grep -n "accountId\|account?.id\|\[accountId, router\]" apps/admin/src/hooks/usePushNotifications.ts
cd /home/mp2sslrl/code/code && grep -rn "id:\|account_id" packages/types/src/index.ts | grep -i "AcademyAccount" -A0  # sanity: confirm the id field name
```
Expected: typecheck **0 errors** (a clean typecheck *is* the proof `account?.id` resolves to a real field). Grep shows `accountId` gating the effect and `[accountId, router]` deps; `accessToken` no longer referenced in this hook.

---

### Task 4 — Label trial-request cards by real status (drop SOON/CONFIRMED + "Auto-confirmed")

`inbox.tsx` already renders a correct `<Spill state={trial.status ?? 'pending'} />` at :225. The bugs are the *second*, redundant badge (`trialBadge` showing `urgent ? 'SOON' : 'CONFIRMED'` at :203-207) which mislabels every `status:'new'` item as "CONFIRMED", and the hard-coded "Auto-confirmed" footer at :229.

**Files:** `app/(tabs)/inbox.tsx`.

**Step 4.1 — Replace the SOON/CONFIRMED badge with an urgency-only tag.** Keep the urgency signal (it *is* useful — derived from `isUrgent(scheduled_at)`), but stop asserting "CONFIRMED". For urgent items show "SOON"; for non-urgent, show nothing (the real status is already on the `<Spill>` at :225).

`apps/admin/app/(tabs)/inbox.tsx` — before (**:203-207**):
```tsx
                  <View style={[styles.trialBadge, urgent && { backgroundColor: theme.color.persimmon }]}>
                    <Text style={{ fontFamily: theme.font.sans, fontSize: 9, fontWeight: '700', color: urgent ? theme.color.ivory : '#A0331F', letterSpacing: 1.4 }}>
                      {urgent ? 'SOON' : 'CONFIRMED'}
                    </Text>
                  </View>
```
after:
```tsx
                  {urgent ? (
                    <View style={[styles.trialBadge, { backgroundColor: theme.color.persimmon }]}>
                      <Text style={{ fontFamily: theme.font.sans, fontSize: 9, fontWeight: '700', color: theme.color.ivory, letterSpacing: 1.4 }}>
                        SOON
                      </Text>
                    </View>
                  ) : null}
```
> The default `styles.trialBadge` background (`#F4D7CC`) and the `#A0331F` text were the "CONFIRMED" pill styling — removed since that label is gone. `styles.trialBadge` is still referenced (urgent path), so keep the style. The non-urgent slot now renders nothing; the `metaRow` layout still works because the preceding `<View style={{ flex: 1 }} />` / subParts text fills the row.

**Step 4.2 — Replace the hard-coded "Auto-confirmed" footer with a status-driven label.** The footer left cell hard-codes "Auto-confirmed"; drive it from `trial.status`. Map: a status of `'booked'`/`'attended'` → "Confirmed" (jade); anything else → the humanized status. Reuse `<Spill>` is overkill in the footer (it's a text row), so map to a plain label.

`apps/admin/app/(tabs)/inbox.tsx` — before (**:227-234**):
```tsx
                <View style={[styles.cardFoot, { borderTopColor: theme.color.hairline }]}>
                  <Text style={{ fontFamily: theme.font.sans, fontSize: 11, color: theme.color.jade, fontWeight: '600' }}>
                    Auto-confirmed
                  </Text>
                  <Text style={{ fontFamily: theme.font.sans, fontSize: 12, color: theme.color.persimmon, fontWeight: '600' }}>
                    Mark attendance →
                  </Text>
                </View>
```
after:
```tsx
                <View style={[styles.cardFoot, { borderTopColor: theme.color.hairline }]}>
                  <Text style={{ fontFamily: theme.font.sans, fontSize: 11, color: FOOT_TONE[trial.status] ?? theme.color.mist, fontWeight: '600' }}>
                    {FOOT_LABEL[trial.status] ?? 'Requested'}
                  </Text>
                  <Text style={{ fontFamily: theme.font.sans, fontSize: 12, color: theme.color.persimmon, fontWeight: '600' }}>
                    {trial.status === 'attended' ? 'View →' : 'Mark attendance →'}
                  </Text>
                </View>
```
Add the two maps just below the `isUrgent` helper (after **:44**, module scope). They depend on `theme`, so build them from theme inside the component instead — define them at the top of `InboxScreen` (after `const theme = useTheme();` at :54):
```tsx
  // Footer label/tone keyed by the real trial status (TrialInboxItem.status =
  // 'booked' | 'attended' | 'missed' | 'cancelled'). Replaces the hard-coded
  // "Auto-confirmed" which misrepresented pending/new requests.
  const FOOT_LABEL: Record<string, string> = {
    booked: 'Confirmed',
    attended: 'Attended',
    missed: 'Missed',
    cancelled: 'Cancelled',
  };
  const FOOT_TONE: Record<string, string> = {
    booked: theme.color.jade,
    attended: theme.color.jade,
    missed: theme.color.rose,
    cancelled: theme.color.mist,
  };
```
> Rationale: `TrialInboxItem.status` is `Trial['status']` = `booked|attended|missed|cancelled` (verified `packages/types` :197/:211). There is no literal `'new'`/`'pending'` on the item — "newness" is the `inbox_counts.new` *count*, a separate axis. So the footer must reflect the booking status, not invent "Auto-confirmed". The `<Spill>` at :225 already shows the same status pictorially; the footer text now agrees with it instead of contradicting it.
>
> **The `<Spill state={trial.status ?? 'pending'} />` at :225 stays unchanged** — it's already correct (`Spill`'s map covers `booked`/`attended`/`cancelled`; unknown strings fall through to a mist label, so `'missed'` renders "Missed" verbatim via the fallback — acceptable). Do **not** touch :225.

**Checkpoint:**
```
cd /home/mp2sslrl/code/code && export PATH="$HOME/.local/bin:$PATH" && pnpm --filter @findemy/admin typecheck
cd /home/mp2sslrl/code/code && grep -n "CONFIRMED\|Auto-confirmed" apps/admin/app/'(tabs)'/inbox.tsx
cd /home/mp2sslrl/code/code && grep -n "FOOT_LABEL\|FOOT_TONE\|SOON" apps/admin/app/'(tabs)'/inbox.tsx
```
Expected: typecheck **0 errors**. First grep returns **nothing** (both dead labels gone). Second grep shows the new maps + the urgency-only `SOON` badge.

---

### Task 5 — Give settings & workshops a navbar selection state

`settings`/`workshops` are real tab screens reached via `router.push('/settings')`/`'/workshops'` (from `studio.tsx`/`earnings.tsx`), but they have no NavBar item, so when the user lands on them `active` matches nothing and the navbar shows no selection. They are not top-level tabs conceptually (they're studio sub-pages), so **don't** add navbar buttons — instead map them onto the existing **Studio** tab so it stays highlighted, and ensure tapping a navbar item from those routes still works.

**Files:** `app/(tabs)/_layout.tsx`.

> Decision (vs. the prompt's "add NavBar entries or move out of (tabs)"): adding two more buttons would crowd the 4-item bar and misrepresent settings/workshops as peer destinations to Home/Schedule/Students. Moving them out of `(tabs)` is a larger refactor (breaks the existing `router.push('/settings')` deep paths and the `Screen bottomTab="settings"` contract). The minimal correct fix is an **active-key alias**: treat `settings`/`workshops` (and `studio`) as the Studio cluster so the Studio tab highlights on those routes. This satisfies "ensure `active` mapping handles them" without UI churn.

**Step 5.1 — Alias settings/workshops to the studio active key.**
`apps/admin/app/(tabs)/_layout.tsx` — before (**:48-49**):
```tsx
      tabBar={({ state, navigation }) => {
        const active = state.routes[state.index].name;
```
after:
```tsx
      tabBar={({ state, navigation }) => {
        const routeName = state.routes[state.index].name;
        // settings & workshops are Studio sub-pages reached via router.push (no
        // navbar button of their own) — keep the Studio tab highlighted there.
        const active =
          routeName === 'settings' || routeName === 'workshops' ? 'studio' : routeName;
```
> The rest of the `NavBar` block (`items`, `active={active}`, `onChange`) is unchanged. The `onChange` handler does `state.routes.find((r) => r.name === key)` then `navigation.navigate(route.name)` — `studio` is a real route so navigating Home/Schedule/Students/Studio from a settings/workshops screen still works. The icon-color ternaries (`active === 'inbox'` etc., :53-56) now also see `active === 'studio'` on those routes, so the Studio `AcaIcon` shows its active border. Good.

**Checkpoint:**
```
cd /home/mp2sslrl/code/code && export PATH="$HOME/.local/bin:$PATH" && pnpm --filter @findemy/admin typecheck
cd /home/mp2sslrl/code/code && grep -n "routeName === 'settings'\|=== 'workshops'\|const active" apps/admin/app/'(tabs)'/_layout.tsx
```
Expected: typecheck **0 errors**. Grep shows the alias mapping and that `active` is derived (not the raw route name) so settings/workshops highlight Studio.

---

### Task 6 — Sanitize the WhatsApp deep-link in InboxCard

`https://wa.me/${item.student_phone}` passes the phone verbatim; spaces, `+`, dashes, parens break the link.

**Files:** `src/components/InboxCard.tsx`.

**Step 6.1 — Strip non-digits for the wa.me path.**
`apps/admin/src/components/InboxCard.tsx` — before (**:38-42**):
```tsx
        <IconButton
          icon={<IconWa size={18} color={theme.color.jade} />}
          accessibilityLabel={`Message ${item.student_name} on WhatsApp`}
          onPress={() => item.student_phone && Linking.openURL(`https://wa.me/${item.student_phone}`)}
        />
```
after:
```tsx
        <IconButton
          icon={<IconWa size={18} color={theme.color.jade} />}
          accessibilityLabel={`Message ${item.student_name} on WhatsApp`}
          onPress={() =>
            item.student_phone &&
            Linking.openURL(`https://wa.me/${item.student_phone.replace(/\D/g, '')}`)
          }
        />
```
> The `tel:` link at :36 keeps the verbatim number on purpose — dialers accept `+`/spaces and `tel:` benefits from the leading `+`. Only `wa.me` needs bare digits. Leave the `tel:` handler unchanged.

**Checkpoint:**
```
cd /home/mp2sslrl/code/code && export PATH="$HOME/.local/bin:$PATH" && pnpm --filter @findemy/admin typecheck
cd /home/mp2sslrl/code/code && grep -n "wa.me\|replace(/\\\\D/g" apps/admin/src/components/InboxCard.tsx
```
Expected: typecheck **0 errors**. Grep shows the `wa.me` URL now uses `.replace(/\D/g, '')`.

---

### Task 7 — Route profile image upload/delete through the api-client (CRITICAL)

`profile/edit.tsx` uses raw `fetch` against `process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8080'` with a manually-read token. This bypasses `getBaseUrl()`'s https-in-prod enforcement (could ship a Bearer token + image over plaintext http), skips the 401→refresh→retry path, and duplicates base-URL config that can drift from `api.ts`.

The api-client (`createClient`) is JSON-only and not easily extended for multipart from app code without changing the shared package. The lowest-risk fix that satisfies "at minimum reuse `getBaseUrl()` and handle 401" is to **add two small helpers in `apps/admin/src/lib/api.ts`** that reuse the exact same `getBaseUrl()` + the shared `doRefresh()`/`refreshInFlight` machinery, then call them from `profile/edit.tsx`. No api-client package change.

**Files:** `src/lib/api.ts`, `app/profile/edit.tsx`.

**Step 7.1 — Export `getBaseUrl` and add auth-aware multipart/JSON helpers in `api.ts`.**
`apps/admin/src/lib/api.ts` — change the `getBaseUrl` signature to be exported, and append two helpers + the existing `api`. Before (**:7**):
```ts
function getBaseUrl(): string {
```
after:
```ts
export function getBaseUrl(): string {
```
Append at the **end** of the file (after the `export const api = createClient({...});` block at :63-74):
```ts

/**
 * Fire an authed request that the JSON-only api-client can't express (multipart
 * upload, DELETE-with-body). Reuses getBaseUrl() (https enforcement) and the
 * SAME refresh machinery as the client: on 401 it triggers one shared refresh
 * and retries once. Never reads the base URL or token independently elsewhere.
 */
async function authedFetch(
  path: string,
  init: { method: string; body?: BodyInit; headers?: Record<string, string> }
): Promise<Response> {
  const url = `${getBaseUrl()}${path}`;
  const run = async () => {
    const token = useAuth.getState().accessToken;
    return fetch(url, {
      ...init,
      headers: {
        ...init.headers,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
  };

  let res = await run();
  if (res.status === 401) {
    // Single shared refresh (same promise concurrent JSON calls use).
    if (!refreshInFlight) {
      refreshInFlight = doRefresh().finally(() => {
        refreshInFlight = null;
      });
    }
    const newToken = await refreshInFlight;
    if (newToken) res = await run();
  }
  return res;
}

/** Multipart upload (image picker asset). Returns parsed JSON or throws. */
export async function uploadMultipart<T>(path: string, form: FormData): Promise<T> {
  // NOTE: do NOT set Content-Type — fetch sets the multipart boundary itself.
  const res = await authedFetch(path, { method: 'POST', body: form as unknown as BodyInit });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any).message || 'Upload failed');
  }
  return res.json() as Promise<T>;
}

/** DELETE with a JSON body (the api-client request() doesn't take a DELETE body). */
export async function deleteJson<T>(path: string, body: unknown): Promise<T> {
  const res = await authedFetch(path, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any).message || 'Request failed');
  }
  return res.json() as Promise<T>;
}
```
> `refreshInFlight` and `doRefresh` are module-scoped in `api.ts` (**:18, :20**), so the helpers share the *same* in-flight refresh as JSON calls — no duplicate refresh storms. `getBaseUrl()` throws in non-dev builds if the URL isn't https, which now also protects these uploads (previously they'd silently POST over http). This is the security fix.

**Step 7.2 — Use the helpers in `profile/edit.tsx`.**
`apps/admin/app/profile/edit.tsx` — update the import (**:12**) — before:
```tsx
import { api } from '@/lib/api';
```
after:
```tsx
import { api, uploadMultipart, deleteJson } from '@/lib/api';
```
Remove the now-unused `useAuth` import if nothing else in the file uses it — **verify first**: it's imported at :13 (`import { useAuth } from '@/stores/auth';`) and used at :121 and :161 (both removed below). After the edits below, grep for other `useAuth` references; if none remain, delete the import line. (If `useAuth` is referenced elsewhere, keep it.)

Replace the upload `fetch` block (**:121-138**) — before:
```tsx
      const token = useAuth.getState().accessToken;
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8080'}/studio/academy/upload`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token ?? ''}`,
          },
          body: formData as any,
        },
      );
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error((err as any).message || 'Upload failed');
      }
      const json = await response.json() as { url: string; images: string[] };
      setImages(json.images);
      showToast('Image uploaded', 'success');
      refetch();
```
after:
```tsx
      const json = await uploadMultipart<{ url: string; images: string[] }>(
        '/studio/academy/upload',
        formData
      );
      setImages(json.images);
      showToast('Image uploaded', 'success');
      refetch();
```
Replace the delete `fetch` block (**:155-169**) — before:
```tsx
          try {
            const response = await fetch(
              `${process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8080'}/studio/academy/image`,
              {
                method: 'DELETE',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${useAuth.getState().accessToken ?? ''}`,
                },
                body: JSON.stringify({ url }),
              },
            );
            if (!response.ok) throw new Error('Failed to remove image');
            const json = await response.json() as { images: string[] };
            setImages(json.images);
            refetch();
          } catch {
            Alert.alert('Error', 'Could not remove image');
          }
```
after:
```tsx
          try {
            const json = await deleteJson<{ images: string[] }>(
              '/studio/academy/image',
              { url }
            );
            setImages(json.images);
            refetch();
          } catch {
            Alert.alert('Error', 'Could not remove image');
          }
```
> Behavior preserved (toast on upload, alert on delete failure, `refetch()`), but now: https enforced in prod, 401 auto-refreshes once and retries, and there is a single source of truth for the base URL. The `formData`/`FormData` construction at :114-119 is unchanged.

**Checkpoint:**
```
cd /home/mp2sslrl/code/code && export PATH="$HOME/.local/bin:$PATH" && pnpm --filter @findemy/admin typecheck
cd /home/mp2sslrl/code/code && grep -rn "EXPO_PUBLIC_API_URL\|fetch(" apps/admin/app/profile/edit.tsx
cd /home/mp2sslrl/code/code && grep -n "uploadMultipart\|deleteJson\|export function getBaseUrl" apps/admin/src/lib/api.ts
cd /home/mp2sslrl/code/code && grep -n "useAuth" apps/admin/app/profile/edit.tsx
```
Expected: typecheck **0 errors**. The first grep returns **nothing** (no raw `EXPO_PUBLIC_API_URL` / `fetch(` left in `edit.tsx`). The second shows the three new exports. The last grep is empty unless `useAuth` is used elsewhere — if empty, confirm you removed its import.

---

### Task 8 — Honor (or neutralize) `Screen`'s `bottomTab` prop + bottom safe-area

`Screen` accepts `bottomTab` but never uses it; `edges={['top']}` omits bottom, so on non-tab scroll screens (e.g. `profile/edit` passing `bottomTab={null}`) the "Save profile" button can be clipped by the home indicator. Render bottom spacing from the prop.

**Files:** `src/components/Screen.tsx`.

> Decision: rather than delete the prop (which would force edits across every caller passing `bottomTab=...`), make it meaningful: when `bottomTab` is a tab name, reserve space for the floating NavBar; otherwise add bottom safe-area inset so content/buttons clear the home indicator. This fixes the clipping and gives the prop a real purpose. Keep `edges={['top']}` (so the header still hugs the status bar) but add bottom padding manually via `useSafeAreaInsets`.

**Step 8.1 — Use insets + NavBar height for bottom padding.**
`apps/admin/src/components/Screen.tsx` — before (**:1-29**):
```tsx
import React from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@findemy/ui';
export { ScreenHeader } from './ScreenHeader';

export function Screen({
  children,
  header,
  bottomTab,
  scroll = true,
}: {
  children: React.ReactNode;
  header?: React.ReactNode;
  bottomTab?: 'inbox' | 'studio' | 'schedule' | 'students' | 'workshops' | 'settings' | null;
  scroll?: boolean;
}) {
  const theme = useTheme();
  const Container = scroll ? ScrollView : View;

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: theme.color.paperWarm }]} edges={['top']}>
      {header}
      <Container style={[styles.content, { backgroundColor: theme.color.paperWarm }]}>
        {children}
      </Container>
    </SafeAreaView>
  );
}
```
after:
```tsx
import React from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, NAV_BAR_HEIGHT } from '@findemy/ui';
export { ScreenHeader } from './ScreenHeader';

export function Screen({
  children,
  header,
  bottomTab,
  scroll = true,
}: {
  children: React.ReactNode;
  header?: React.ReactNode;
  bottomTab?: 'inbox' | 'studio' | 'schedule' | 'students' | 'workshops' | 'settings' | null;
  scroll?: boolean;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const Container = scroll ? ScrollView : View;

  // When this screen sits under the floating NavBar (a tab name), reserve the
  // bar's height so content/buttons aren't hidden behind it. Otherwise just
  // clear the home indicator with the bottom safe-area inset (+ a little slack).
  const bottomPad = bottomTab ? NAV_BAR_HEIGHT + 8 : insets.bottom + 16;
  const containerStyle = [
    styles.content,
    { backgroundColor: theme.color.paperWarm },
  ];
  const padStyle = { paddingBottom: bottomPad };

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: theme.color.paperWarm }]} edges={['top']}>
      {header}
      {scroll ? (
        <ScrollView style={containerStyle} contentContainerStyle={padStyle}>
          {children}
        </ScrollView>
      ) : (
        <View style={[containerStyle, padStyle]}>{children}</View>
      )}
    </SafeAreaView>
  );
}
```
> `NAV_BAR_HEIGHT` is exported from `@findemy/ui` (verified `packages/ui/src/components/NavBar.tsx` :52). For scroll screens, padding goes on `contentContainerStyle` (correct for `ScrollView` — `paddingBottom` on the *style* of a ScrollView does nothing useful). For non-scroll, it goes on the `View`'s style. `Container` const is removed in favor of the explicit branch so the props differ correctly per element. `bottomTab={null}` (profile/edit) now yields `insets.bottom + 16` of clearance, fixing the clipped Save button. `bottomTab="settings"` yields NavBar-height spacing (settings is rendered inside the tab navigator and the floating NavBar overlays it).

**Checkpoint:**
```
cd /home/mp2sslrl/code/code && export PATH="$HOME/.local/bin:$PATH" && pnpm --filter @findemy/admin typecheck
cd /home/mp2sslrl/code/code && grep -n "NAV_BAR_HEIGHT\|useSafeAreaInsets\|bottomPad\|contentContainerStyle" apps/admin/src/components/Screen.tsx
```
Expected: typecheck **0 errors**. Grep shows `bottomTab` is now consumed (used in `bottomPad`) and bottom padding is applied via `contentContainerStyle` (scroll) / `View` style (non-scroll).

---

## Final Group-F Checkpoint

```
cd /home/mp2sslrl/code/code && export PATH="$HOME/.local/bin:$PATH" && pnpm --filter @findemy/admin typecheck
# Badge revived:
cd /home/mp2sslrl/code/code && grep -rn "bumpNew\|setLastSeen" apps/admin/src/hooks/usePushNotifications.ts apps/admin/app/'(tabs)'/inbox.tsx
# Push cleanup + stable gate:
cd /home/mp2sslrl/code/code && grep -n "api.push.unregister\|accountId\|\[accountId, router\]" apps/admin/src/hooks/usePushNotifications.ts
# Dead labels gone:
cd /home/mp2sslrl/code/code && grep -n "CONFIRMED\|Auto-confirmed" apps/admin/app/'(tabs)'/inbox.tsx
# Navbar alias:
cd /home/mp2sslrl/code/code && grep -n "routeName === 'settings'\|=== 'workshops'" apps/admin/app/'(tabs)'/_layout.tsx
# wa.me sanitized:
cd /home/mp2sslrl/code/code && grep -n "replace(/\\\\D/g" apps/admin/src/components/InboxCard.tsx
# Upload through client, no raw fetch/env:
cd /home/mp2sslrl/code/code && grep -rn "EXPO_PUBLIC_API_URL\|fetch(" apps/admin/app/profile/edit.tsx
cd /home/mp2sslrl/code/code && grep -n "uploadMultipart\|deleteJson\|export function getBaseUrl" apps/admin/src/lib/api.ts
# Screen bottomTab honored:
cd /home/mp2sslrl/code/code && grep -n "NAV_BAR_HEIGHT\|bottomPad" apps/admin/src/components/Screen.tsx
```
Expected:
- typecheck: **0 errors**.
- `bumpNew`/`setLastSeen` now have call-sites (no longer dead store members).
- `api.push.unregister` called in cleanup; effect gated on `accountId` (not the rotating `accessToken`); deps `[accountId, router]`.
- `CONFIRMED`/`Auto-confirmed` greps return **nothing**.
- navbar aliases settings/workshops → studio so a tab highlights.
- `InboxCard` wa.me uses `.replace(/\D/g,'')`.
- `profile/edit.tsx` has **no** raw `fetch(` / `EXPO_PUBLIC_API_URL`; `api.ts` exports `getBaseUrl`/`uploadMultipart`/`deleteJson`.
- `Screen` consumes `bottomTab` for bottom padding.

> No git. No commits. Checkpoints are typecheck + grep only.
