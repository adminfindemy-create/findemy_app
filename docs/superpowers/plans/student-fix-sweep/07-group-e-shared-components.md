# Group E — Shared Component Reuse — Sub-Plan
**Parent:** [00-MASTER-PLAN.md](./00-MASTER-PLAN.md)
**Goal:** Replace duplicated inline back-buttons, bottom-sheets, pills, cards, and loading states with shared components for consistency.
**Depends on:** Do LAST — after A–D,F,G land, since it touches many of the same files. Pure refactor, no behavior change.
**New shared components:** BackButton.tsx, BottomSheet.tsx.

---

## Files touched

**New files**
- `apps/student/src/components/BackButton.tsx` (Task 1)
- `apps/student/src/components/BottomSheet.tsx` (Task 3)

**Migrated — back buttons (Task 2)** — verified `router.back()` + glyph offenders:
- `apps/student/app/academy/[id]/offerings.tsx:57`
- `apps/student/app/academy/[id].tsx:135`
- `apps/student/app/(auth)/onboarding.tsx:67`
- `apps/student/app/(auth)/signup.tsx:51`
- `apps/student/app/booking/pay.tsx:154`
- `apps/student/app/booking/slot.tsx:109`
- `apps/student/app/enrollment/pay.tsx:148`
- `apps/student/app/events/pay.tsx:106`
- `apps/student/app/post-trial/index.tsx:76`
- `apps/student/app/program/[id]/enroll.tsx:50` and `:69`
- `apps/student/app/program/[id]/review.tsx:198`
- `apps/student/app/program/[id]/trial.tsx:83` and `:116`
- `apps/student/app/program/[id].tsx:125` and `:171`
- `apps/student/app/refer.tsx:50`
- `apps/student/app/trials/[id].tsx:172` and `:369`
- `apps/student/app/workshop/[id].tsx:159` (the `:96` site is a "Go back" recovery button on an error screen — migrate too)
- `apps/student/app/workshop/pay.tsx:113`

**NOT back buttons (do NOT touch):** `apps/student/app/booking/slot.tsx:191` (calendar month `‹` nav), `apps/student/app/program/[id].tsx` paired `›` calendar arrows, `apps/student/app/live/[batch_id].tsx:37`/`:58` ("Leave" buttons, not chevron back — leave as-is). `apps/student/app/profile/edit.tsx:58` is a programmatic `router.back()` after save, no button — skip.

**Migrated — sheets (Task 4)**
- `apps/student/src/components/OfferingsSheet.tsx` (worked example)
- `apps/student/src/components/BookingDetailSheet.tsx`
- `apps/student/src/components/BatchDetailSheet.tsx`
- `apps/student/src/components/TrialBookingSheet.tsx`
- `apps/student/app/(tabs)/index.tsx` (inline filter sheet, Modal at ~`:294`)
- (`CancelSheet.tsx` already exists with the same pattern — optionally migrate; low priority)

**Migrated — pills (Task 5)**
- `apps/student/app/workshop/[id].tsx:166-171` (TYPE tag → `<Tag>`)
- `apps/student/app/post-trial/index.tsx:126-138` (ATTENDED pill → `<Spill state="attended">`)
- `apps/student/app/enrollments.tsx:130-148` (batch-status pills — see Task 5)

**Migrated — cards (Task 6)**
- `apps/student/app/bookings.tsx:208` (card container → `<Card>`)
- `apps/student/app/trials/[id].tsx:234` (OTP block → `<Card>`; file already imports `Card`)
- `apps/student/app/refer.tsx:66` (persimmon points card — LEAVE, see Task 6)

**Normalized — loading (Task 7)**
- `apps/student/app/refer.tsx:71` (`color="#fff"` — keep, on persimmon bg)
- `apps/student/app/refer.tsx:124` (`"…"` text loader)
- `apps/student/app/enrollment/[id].tsx:956` (`color={theme.color.rose}`)
- `apps/student/app/live/[batch_id].tsx:21` (`color={theme.color.ivory}` — keep, on dark bg)
- `apps/student/app/compare.tsx:78` (`Loading...` text)
- `apps/student/app/trials/[id].tsx:71` and `apps/student/app/trials/index.tsx:167` (`Loading...` text)
- `apps/student/app/academy/[id].tsx:306`, `apps/student/app/(tabs)/index.tsx:285` (inline "Load more" pagination text — keep as text, see Task 7)

---

## New components

### `apps/student/src/components/BackButton.tsx`
A `Pressable` rendering the `‹` glyph, `accessibilityLabel="Go back"`, `onPress` defaulting to `router.back()`, with optional `style`/`color`/`size` overrides. Standardizes the ~19 hand-rolled variants (mixed `‹`/`←`, `Pressable`/`TouchableOpacity`, varied padding/font sizes).

### `apps/student/src/components/BottomSheet.tsx`
Wraps `Modal` (`transparent`, `animationType="slide"`) with a tappable scrim, a centered drag handle, and a safe-area-padded paper sheet. Props `{ visible, onClose, children, heightPct? }`. Backdrop/handle/shadow styling is lifted verbatim from `OfferingsSheet.tsx` (the canonical/simplest existing sheet).

> Note: `apps/student/src/components/ScreenHeader.tsx` already centralizes a header-with-back variant using `<IconChevL>`, but the screens in this group render their back buttons inline rather than via `ScreenHeader`, so they are not covered by it. `BackButton` is for those inline sites. (Screens that adopt `ScreenHeader` wholesale are out of scope for this pure refactor.)

---

## Reference: shared component prop signatures (verified)

From `packages/ui/src/index.ts`, all of `Spill`, `Tag`, `Card` are exported.

**`Spill`** — `packages/ui/src/components/Spill.tsx`
```ts
function Spill({ state }: { state: 'now' | 'upcoming' | 'done' | 'pending' | 'declined'
  | 'active' | 'trial' | 'inactive' | 'new' | 'confirmed' | 'completed' | 'attended'
  | 'cancelled' | 'booked' | 'rescheduled' | 'paid' | 'failed' | string })
```
Renders a pill-shaped (`borderRadius: 999`) tinted badge; label + tone are looked up from an internal map keyed by `state` (e.g. `attended` → label "Attended", tone `theme.color.jade`). Unknown strings render verbatim with `theme.color.mist`.

**`Tag`** — `packages/ui/src/components/Tag.tsx`
```ts
function Tag({ label, tone = 'ink' }: {
  label: string;
  tone?: 'jade' | 'marigold' | 'persimmon' | 'rose' | 'ink' | 'bone';
})
```
Renders a square-ish (`borderRadius: 6`) tag; background is `<tone>20` (20% alpha), text uses the matching theme color. Caller supplies the literal `label`.

**`Card`** — `packages/ui/src/components/Card.tsx`
```ts
function Card({ children, padding = 16, style }: {
  children: React.ReactNode;
  padding?: number;
  style?: StyleProp<ViewStyle>;
})
```
Renders a `theme.color.ivory` background, `theme.radius.lg` corner, full-width view. **No `variant`/`bg` prop** — background is hard-coded to ivory (callers can layer color via `style`, but persimmon fills are not idiomatic for `Card`). This is why `refer.tsx`'s persimmon points card is left inline (Task 6).

---

## Tasks

### Task 1 — Create `BackButton`

**Files:** new `apps/student/src/components/BackButton.tsx`

**Step 1.1 — Write the component.** Mirror the most common existing variant (`Pressable` + `‹` at `fontSize: 18`, `color: theme.color.ink`) and the circular `backBtn` style sampled from `apps/student/app/workshop/pay.tsx:199` (32×32, `borderRadius: 16`, centered). Make the circular chrome opt-out via a `bare` prop so plain text-row variants (e.g. onboarding/signup `‹ Back` / `← Back`) can drop the circle.

```tsx
import React from "react";
import { Pressable, Text, StyleSheet, type StyleProp, type ViewStyle } from "react-native";
import { useRouter } from "expo-router";
import { useTheme } from "@findemy/ui";

export function BackButton({
  onPress,
  color,
  size = 18,
  bare = false,
  style,
}: {
  /** Defaults to router.back(). */
  onPress?: () => void;
  /** Glyph color. Defaults to theme.color.ink. */
  color?: string;
  /** Glyph font size. */
  size?: number;
  /** Drop the circular chrome (for plain text-row back links). */
  bare?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  const router = useRouter();
  return (
    <Pressable
      onPress={onPress ?? (() => router.back())}
      accessibilityRole="button"
      accessibilityLabel="Go back"
      hitSlop={8}
      style={[bare ? undefined : styles.circle, style]}
    >
      <Text style={{ fontSize: size, color: color ?? theme.color.ink }}>‹</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  circle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
});
```

**Checkpoint:**
```
pnpm --filter @findemy/student exec tsc --noEmit
grep -n "export function BackButton" apps/student/src/components/BackButton.tsx
```
Expected: tsc reports 0 errors; grep prints exactly one match.

---

### Task 2 — Migrate inline back buttons to `BackButton`

**Files:** the 18 offender files listed under "Migrated — back buttons" above. Migrate one screen at a time, verifying tsc after each.

**Step 2.1 — Add the import** to each file:
```tsx
import { BackButton } from "@/components/BackButton";
```

**Step 2.2 — Replace the inline JSX.** Three representative before/afters; the rest are repeat applications of the same shapes.

**(a) Circular-chrome variant** — `apps/student/app/workshop/pay.tsx:113-115`
Before:
```tsx
<Pressable onPress={() => router.back()} style={styles.backBtn}>
  <Text style={{ fontSize: 18, color: theme.color.ink }}>‹</Text>
</Pressable>
```
After:
```tsx
<BackButton style={styles.backBtn} />
```
(`styles.backBtn` and the local `‹` `<Text>` can be deleted if no longer referenced. Identical shape at `booking/pay.tsx:154`, `booking/slot.tsx:109`, `enrollment/pay.tsx:148`, `events/pay.tsx:106`, `program/[id]/enroll.tsx:50` & `:69`, `program/[id]/review.tsx:198`, `program/[id]/trial.tsx:83` & `:116`, `workshop/[id].tsx:159`, `academy/[id]/offerings.tsx:57` — that last uses an inline `style={styles.back}` and inline glyph but same structure.)

**(b) Dark-overlay variant (ivory glyph)** — `apps/student/app/academy/[id].tsx:135-137`
Before:
```tsx
<Pressable onPress={() => router.back()} style={styles.iconBtn}>
  <Text style={{ color: "#FAF6EE", fontSize: 16 }}>‹</Text>
</Pressable>
```
After:
```tsx
<BackButton style={styles.iconBtn} color="#FAF6EE" size={16} />
```
(Preserves the ivory glyph over the photo header. Same shape at `program/[id].tsx:125` & `:171`, `post-trial/index.tsx:76`, `trials/[id].tsx:172` (uses `TouchableOpacity`, no style — render `<BackButton size={22} bare />`), `refer.tsx:50` (inline padding style — `<BackButton size={22} bare style={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 4 }} />`).)

**(c) Text-row variant (`‹ Back` / `← Back`)** — `apps/student/app/(auth)/signup.tsx:51-55`
Before:
```tsx
<TouchableOpacity onPress={() => router.back()} style={{ marginBottom: 24 }}>
  <Text style={{ fontFamily: theme.font.sans, fontSize: 14, color: theme.color.persimmon }}>
    ← Back
  </Text>
</TouchableOpacity>
```
After (normalize the `←` to `‹`, keep the persimmon "Back" word as a label):
```tsx
<BackButton bare size={14} color={theme.color.persimmon} style={{ marginBottom: 24 }} />
```
> Decision: the visible word "Back" is dropped in favor of the bare glyph for consistency with the rest of the app. If product wants to keep the word, instead extend `BackButton` with an optional `label?: string` prop and pass `label="Back"`. Default plan: glyph only. Same shape at `onboarding.tsx:67` (`‹ Back`, `marginBottom: 18`) and `trials/[id].tsx:369-372` (`← Back`, `marginTop: 12` — recovery button on the not-found state).

**Step 2.3 — Error-recovery button** at `apps/student/app/workshop/[id].tsx:96`:
```tsx
<Pressable onPress={() => router.back()} style={{ marginTop: 16 }}>
```
This wraps a "Go back" text label on an error screen. Replace with `<BackButton bare style={{ marginTop: 16 }} />` only if it currently renders a `‹`/`←`; if it renders a worded button via `<Button>`, leave it. Verify the inner content before migrating.

**Checkpoint:**
```
pnpm --filter @findemy/student exec tsc --noEmit
grep -rn "router.back()" apps/student/app | grep -E "←|‹" 
grep -rn "‹ Back|← Back" apps/student/app
```
Expected: tsc 0 errors. The second grep returns **only** non-back-button calendar nav (`booking/slot.tsx:191` `‹`, paired `›` arrows) — no `router.back()` lines paired with a glyph remain. The third grep returns nothing (all `‹ Back`/`← Back` text labels migrated).

---

### Task 3 — Create `BottomSheet`

**Files:** new `apps/student/src/components/BottomSheet.tsx`

**Step 3.1 — Extract the canonical styling.** From `apps/student/src/components/OfferingsSheet.tsx` (styles block), the standard backdrop/sheet/handle are:
```
backdrop: { flex: 1, backgroundColor: "rgba(20,16,14,0.45)" }
sheet:    { borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 24,
            paddingBottom: 40, maxHeight: "82%", shadowColor: "#000",
            shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.1, shadowRadius: 16, elevation: 10 }
handle:   { width: 36, height: 4, borderRadius: 2, alignSelf: "center", marginTop: 10, marginBottom: 6 }
```
(`BookingDetailSheet`, `BatchDetailSheet`, `TrialBookingSheet`, and the inline filter sheet all use near-identical values — only `borderTopRadius` (24 vs 28), `shadowRadius` (16 vs 20), and `maxHeight`/`paddingHorizontal` drift. Standardize on the OfferingsSheet values; expose `maxHeight` via `heightPct`.)

**Step 3.2 — Write the component.**
```tsx
import React from "react";
import { Modal, View, Pressable, StyleSheet } from "react-native";
import { useTheme } from "@findemy/ui";

export function BottomSheet({
  visible,
  onClose,
  children,
  heightPct = 82,
}: {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  /** Max sheet height as a percentage of screen height. */
  heightPct?: number;
}) {
  const theme = useTheme();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View
        style={[
          styles.sheet,
          { backgroundColor: theme.color.paper, maxHeight: `${heightPct}%` },
        ]}
      >
        <View style={[styles.handle, { backgroundColor: theme.color.hairline }]} />
        {children}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(20,16,14,0.45)",
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingBottom: 40,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 10,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginTop: 10,
    marginBottom: 6,
  },
});
```
> Note: `KeyboardAvoidingView` (used by `CancelSheet`) and the close `✕` button are sheet-specific; keep those inside `children` where needed rather than baking into `BottomSheet`. Sheets that need keyboard avoidance (`TrialBookingSheet`, the filter sheet has a `TextInput`?) should wrap their `children` in `KeyboardAvoidingView` themselves.

**Checkpoint:**
```
pnpm --filter @findemy/student exec tsc --noEmit
grep -n "export function BottomSheet" apps/student/src/components/BottomSheet.tsx
```
Expected: tsc 0 errors; one grep match.

---

### Task 4 — Migrate sheets to `BottomSheet`

**Files:** `OfferingsSheet.tsx` (worked example), then `BookingDetailSheet.tsx`, `BatchDetailSheet.tsx`, `TrialBookingSheet.tsx`, and the inline filter sheet in `app/(tabs)/index.tsx`.

**Step 4.1 — Worked example: `OfferingsSheet.tsx`.**
Add import:
```tsx
import { BottomSheet } from "@/components/BottomSheet";
```
Before (the render frame):
```tsx
return (
  <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
    <Pressable style={styles.backdrop} onPress={onClose} />
    <View style={[styles.sheet, { backgroundColor: theme.color.paper }]}>
      <View style={[styles.handle, { backgroundColor: theme.color.hairline }]} />

      <View style={styles.titleRow}>
        ...
      </View>
      <ScrollView ...>
        ...
      </ScrollView>
    </View>
  </Modal>
);
```
After — drop the `Modal`/`Pressable`/outer `View`/`handle`, keep the inner content:
```tsx
return (
  <BottomSheet visible={visible} onClose={onClose}>
    <View style={styles.titleRow}>
      ...
    </View>
    <ScrollView ...>
      ...
    </ScrollView>
  </BottomSheet>
);
```
Then delete the now-unused `backdrop`, `sheet`, and `handle` keys from the local `StyleSheet.create` (and remove the now-unused `Modal` import if nothing else uses it; `Pressable` is still used by the cards, keep it). The remaining `titleRow`, `scrollContent`, `sectionLabel`, `card`, `lvlPill` styles stay.

**Step 4.2 — `BatchDetailSheet.tsx`.** Same transform. Note this file has **two** `<Modal>` render paths (a loading/empty path at `:53-55` rendering just a backdrop, and the full sheet at `:84`). Convert the full path to `BottomSheet`; for the bare-backdrop early-return path, render `<BottomSheet visible={visible} onClose={onClose}><.../></BottomSheet>` with a minimal loading body (or keep that early path as a plain `Modal`+`Pressable` if it intentionally shows no sheet — verify intent before changing).

**Step 4.3 — `BookingDetailSheet.tsx`.** Same transform. It uses a larger radius (28) and a `closeBtn` absolutely-positioned `✕` — keep `closeBtn` inside `children`; accept the radius standardizing to 24. Delete unused `backdrop`/`sheet`/`handle` style keys.

**Step 4.4 — `TrialBookingSheet.tsx`.** Same transform. If it wraps content in `KeyboardAvoidingView`, keep that wrapper inside `children`.

**Step 4.5 — Inline filter sheet `app/(tabs)/index.tsx` (~`:294`).**
Before:
```tsx
<Modal visible={showFilters} transparent animationType="slide" onRequestClose={() => setShowFilters(false)}>
  <Pressable style={styles.backdrop} onPress={() => setShowFilters(false)} />
  <View style={[styles.sheet, { backgroundColor: theme.color.paper }]}>
    <View style={[styles.handle, { backgroundColor: theme.color.hairline }]} />
    <View style={styles.sheetTitleRow}>...</View>
    ...
  </View>
</Modal>
```
After:
```tsx
<BottomSheet visible={showFilters} onClose={() => setShowFilters(false)}>
  <View style={styles.sheetTitleRow}>...</View>
  ...
</BottomSheet>
```
Remove the file-local `backdrop`/`sheet`/`handle` styles if not referenced elsewhere in this screen; add the `BottomSheet` import.

**Checkpoint:**
```
pnpm --filter @findemy/student exec tsc --noEmit
grep -rn "rgba(20,16,14,0.45)" apps/student/src/components apps/student/app
```
Expected: tsc 0 errors. The backdrop-color grep returns **only** `BottomSheet.tsx` (and `CancelSheet.tsx`/`CancelSheet`'s own `rgba(20,17,15,0.4)` differs, so won't match) — no migrated sheet still defines its own `rgba(20,16,14,0.45)` backdrop.

---

### Task 5 — Replace inline pills with `<Spill>` / `<Tag>`

**Files:** `app/workshop/[id].tsx`, `app/post-trial/index.tsx`, `app/enrollments.tsx`.

**Step 5.1 — `workshop/[id].tsx:166-171` (TYPE tag → `<Tag>`).**
Add `Tag` to the `@findemy/ui` import. The inline tag uses `tagDef = TYPE_TAG[w.type] ?? TYPE_TAG.demo` (line `:152`) with `{ bg, fg, label }`.
Before:
```tsx
<View style={{ flexDirection: "row", gap: 8, marginBottom: 14 }}>
  <View style={{ backgroundColor: tagDef.bg, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 }}>
    <Text style={{ fontFamily: "System", fontSize: 10, fontWeight: "700", color: tagDef.fg, letterSpacing: 0.4 }}>
      {tagDef.label.toUpperCase()}
    </Text>
  </View>
</View>
```
After:
```tsx
<View style={{ flexDirection: "row", gap: 8, marginBottom: 14 }}>
  <Tag label={tagDef.label} tone="persimmon" />
</View>
```
> Pick the `tone` that best matches the existing `tagDef.fg`/`bg` per workshop type (inspect `TYPE_TAG`). If types map to distinct colors that `Tag`'s 6 tones can't cover, either extend `Tag`'s tone union or keep this one inline. Default: map to the nearest tone. Note `<Tag>` uses `borderRadius: 6` (square) vs the old `999` pill — a minor visual change; acceptable for a tag.

**Step 5.2 — `post-trial/index.tsx:126-138` (ATTENDED → `<Spill>`).**
Add `Spill` to the `@findemy/ui` import.
Before:
```tsx
<View style={[styles.attendedTag, { backgroundColor: "#C9DCD8" }]}>
  <Text style={{ fontFamily: "System", fontSize: 10, fontWeight: "700", color: theme.color.jade, letterSpacing: 0.6 }}>
    ATTENDED
  </Text>
</View>
```
After:
```tsx
<Spill state="attended" />
```
(`Spill`'s map already has `attended` → label "Attended", tone `theme.color.jade` — matches the existing jade-on-mint pill. Remove the now-unused `attendedTag` style.)

**Step 5.3 — `enrollments.tsx:130-148` (batch-status pills → `<Spill>`).**
These are **batch-status** pills (NOT workshop type tags): a `paused_until` → "⏸ Paused" (amber), `discontinue_requested_at` → "Ending" (rose), `status === "grace"` → "Grace period" (amber), else an `onlinePill`. `Spill`'s map does not include "paused"/"ending"/"grace" states, and these use custom hex (`#F7E4C0`/`#C68410`) plus a leading `⏸` emoji that `Spill` can't express. **Decision:** these do not cleanly map to `Spill`'s vocabulary — **leave them inline**, OR (preferred, if Group worth it) extend `Spill`'s map with `paused`/`ending`/`grace` entries and pass `<Spill state={...} />`. Given this is a pure low-risk refactor, default to **leaving `enrollments.tsx` pills inline** and noting them for a future `Spill` vocabulary expansion. Do not force-fit.

**Checkpoint:**
```
pnpm --filter @findemy/student exec tsc --noEmit
grep -n "attendedTag" apps/student/app/post-trial/index.tsx
grep -n "<Tag\|<Spill" apps/student/app/workshop/[id].tsx apps/student/app/post-trial/index.tsx
```
Expected: tsc 0 errors. `attendedTag` grep returns nothing (style removed). The `<Tag`/`<Spill` grep shows the new components in place.

---

### Task 6 — Replace inline card containers with `<Card>`

**Files:** `app/bookings.tsx`, `app/trials/[id].tsx`. **Leave** `app/refer.tsx`.

**Step 6.1 — `trials/[id].tsx:234` (OTP block → `<Card>`).** File already imports `Card` (`:4`). The OTP block is a fixed container:
```tsx
<View style={[styles.todayOtp, { backgroundColor: theme.color.ivory, borderColor: theme.color.hairline }]}>
  ... OTP digits ...
</View>
```
Replace the outer `<View>` with `<Card>`, moving any layout-only style (alignItems/padding) into `Card`'s `style` prop and dropping the ivory `backgroundColor` (Card supplies it):
```tsx
<Card style={styles.todayOtp}>
  ... OTP digits ...
</Card>
```
Then strip `backgroundColor`/`borderRadius`/`padding` from the `todayOtp` style (Card provides ivory bg, `radius.lg`, and `padding={16}`). Keep `borderColor`/`borderWidth`/`alignItems` if present by leaving them in `todayOtp` and passing via `style` (Card merges `style` last). If the block needs a visible hairline border, keep `borderWidth`/`borderColor` in `todayOtp`.

**Step 6.2 — `bookings.tsx:208` (card → `<Card>`).** Add `Card` to the `@findemy/ui` import (currently only `useTheme`). The container is a pressable `styles.card` with ivory bg + hairline + shadow. Because this is a `Pressable` (not a static `View`), wrap the `Card` content inside the existing `Pressable` rather than replacing it — `Card` is a `View`. Practical move: keep the `Pressable`, replace its inner ivory styling with a child `<Card>`, OR leave as-is since the press affordance + shadow are bespoke. **Decision:** if the only win is the ivory/radius/padding, nest `<Card>` inside the `Pressable`; if it adds churn without clear benefit, leave `bookings.tsx` inline. Low priority — prefer leaving if the `Pressable`+shadow structure resists a clean `Card` swap.

**Step 6.3 — `refer.tsx:66` (persimmon points card — LEAVE).** The `pointsCard` uses `backgroundColor: theme.color.persimmon`. `Card` has **no `bg`/`variant` prop** (hard-coded ivory). Forcing persimmon via `style` would fight `Card`'s own `backgroundColor` (style merges last so it'd actually win, but semantically misuses `Card`). **Explicitly LEAVE `refer.tsx` pointsCard inline.**

**Checkpoint:**
```
pnpm --filter @findemy/student exec tsc --noEmit
grep -n "<Card" apps/student/app/trials/[id].tsx
grep -n "theme.color.persimmon" apps/student/app/refer.tsx
```
Expected: tsc 0 errors. `<Card` appears in `trials/[id].tsx`. `refer.tsx` still contains the persimmon points card (unchanged).

---

### Task 7 — Normalize loading states

**Standard:** inline waits → `<ActivityIndicator color={theme.color.persimmon}>`; above-the-fold lists → existing `SkeletonLoader`/`SkeletonCard`/`SkeletonCompactCard`. Text-only loaders (`"…"`/`"Loading..."`) used as full-screen/blocking waits → `<ActivityIndicator color={theme.color.persimmon}>`. Pagination "Load more"/"Loading…" inline footer text stays as text (it's a button label, not a spinner).

**Step 7.1 — ActivityIndicator color normalization.**
- `enrollment/[id].tsx:179`, `:720` — already `theme.color.persimmon`. **No change.**
- `enrollment/[id].tsx:956` — `color={theme.color.rose}`. Change to `color={theme.color.persimmon}` **unless** it's a destructive/cancel action affordance where rose is intentional — verify context; default to persimmon.
- `live/[batch_id].tsx:21` — `color={theme.color.ivory}` on a dark video bg. **Keep** (contrast requires light spinner).
- `refer.tsx:71` — `color="#fff"` inside the persimmon points card. **Keep** (on persimmon bg).

**Step 7.2 — Text loaders → spinner** (blocking/full-screen waits):
- `compare.tsx:78` — replace the `Loading...` `<Text>` with `<ActivityIndicator color={theme.color.persimmon} style={{ padding: 24 }} />`.
- `trials/[id].tsx:71` and `trials/index.tsx:167` — replace `<Text>Loading...</Text>` with `<ActivityIndicator color={theme.color.persimmon} />` (add `ActivityIndicator` to the `react-native` import in each).

**Step 7.3 — Text loaders that stay as text** (inline button/footer labels — keep, do NOT convert):
- `refer.tsx:124` — `{claimMutation.isPending ? "…" : "Claim"}` is a button label. Normalize the ellipsis glyph `…` → keep as-is or swap for an inline `<ActivityIndicator size="small" color="#fff" />` inside the button; **default: keep text**, just ensure the glyph is the single-char `…` (it already is).
- `academy/[id].tsx:306` (`"Loading…"`), `(tabs)/index.tsx:285` (`"Loading..."`) — pagination "Load more" footer labels. **Keep as text**, but normalize the literal to a consistent `"Loading…"` (single ellipsis char) across both for consistency.

**Step 7.4 — Skeletons (already correct).** The `SkeletonLoader`/`SkeletonCard`/`SkeletonCompactCard` usages across `academy/[id].tsx`, `program/[id].tsx`, `bookings.tsx`, `enrollments.tsx`, `(tabs)/index.tsx`, etc. already follow the standard for above-the-fold lists. **No change** — they are the reference implementation.

**Checkpoint:**
```
pnpm --filter @findemy/student exec tsc --noEmit
grep -rn "Loading\.\.\." apps/student/app
grep -rn "ActivityIndicator color={theme.color.rose}" apps/student/app
```
Expected: tsc 0 errors. `Loading...` (triple-dot) grep returns nothing in blocking-wait screens (`compare.tsx`, `trials/[id].tsx`, `trials/index.tsx` converted to spinners; remaining matches only in pagination footers normalized to `Loading…`). The rose-ActivityIndicator grep returns nothing (or only the intentionally-kept destructive site, documented in 7.1).

---

## Final Group-E Checkpoint

```
pnpm --filter @findemy/student exec tsc --noEmit
grep -rn "router.back()" apps/student/app | grep -E "←|‹ Back|← Back"
grep -rn "rgba(20,16,14,0.45)" apps/student/src/components apps/student/app
grep -n "export function BackButton" apps/student/src/components/BackButton.tsx
grep -n "export function BottomSheet" apps/student/src/components/BottomSheet.tsx
```
Expected:
- tsc: **0 errors**.
- First grep: **no matches** — zero hand-rolled `←`/`‹ Back`/`← Back` back buttons remain in migrated screens (calendar `‹`/`›` nav at `booking/slot.tsx`/`program/[id].tsx` are not `router.back()` and won't match).
- Second grep: backdrop literal only in `BottomSheet.tsx` — every migrated sheet routes through it.
- Last two greps: one match each (the two new shared components exist).
