# Group G — Splash Redesign — Sub-Plan
**Parent:** [00-MASTER-PLAN.md](./00-MASTER-PLAN.md)
**Goal:** Replace the mismatched ivory-native / charcoal-JS splash with one branded navy splash (logo mark + two-tone wordmark + DISCOVER YOUR ART).
**Depends on:** nothing (self-contained). **Note:** one manual asset-export step.

---

## Reference

Target brand mock: `ai-usage/splash_screen.jpeg`.

What the mock shows (verified by reading the image):
- Dark **navy** full-bleed backdrop.
- Organic **corner waves**: top-left plum→brown wash, bottom-right marigold/brown→jade-green wash.
- A teardrop / map-pin **logo mark** split into 5 colored petals (persimmon, jade-green, plum, ivory, sand/bone), each carrying a discipline glyph (dance, paint, music, yoga, etc.). We approximate it as 5 geometric petals (the precise glyphs/curves are a deferred trace).
- Two-tone **wordmark**: "Find" in ivory + "emy" in persimmon, one continuous sans word.
- Uppercase **"DISCOVER YOUR ART"** in ivory, wide letter-spacing, flanked by short persimmon **underline rules**.

---

## Verified current state (read before editing)

- **Native splash** `apps/student/app.json:9-13` → `splash.image` = `./assets/images/splash.png`, `resizeMode` = `"contain"`, `backgroundColor` = `"#FBF7EF"` (ivory). Android `adaptiveIcon.backgroundColor` (`:23`) is also `#FBF7EF` — leave it; it is the icon, not the splash.
- `apps/student/assets/images/splash.png` exists but is a **69-byte placeholder stub** (not a real raster).
- **JS splash** `apps/student/app/index.tsx` → dark `theme.color.charcoal` bg (`:24`), two radial-glow discs (`:25-55`), circular outlined "F" mark + persimmon dot (`:57-76`), italic serif "Findemy" `fontSize: 78` (`:79-91`), two-line tagline "Discover your art.\nFind your academy." (`:93-105`), loader bar (`:107-112`), footer "V 1.0 · CRAFTED IN BENGALURU" (`:114-122`). Redirect `useEffect` with **`setTimeout(..., 1200)`** then `router.replace("/(tabs)")` or `"/(auth)"` based on `accessToken` (`:12-21`). **KEEP this redirect timing exactly.**
- **`react-native-svg` is NOT** in `apps/student/package.json` dependencies (`:16-53`).
- `useTheme` is exported from `@findemy/ui` (`packages/ui/src/index.ts` re-exports `./ThemeProvider`). `theme.font.sans` = `"Geist"`, `theme.font.serif` = `"Instrument Serif"`.

### Exact theme color tokens that exist today (`packages/ui/src/theme.ts:2-39`)
`ink`, `inkSoft`, `mist`, `whisper`, `paper`, `paperWarm`, `ivory` (`#FAF6EE`), `bone` (`#E5DDC9`), `hairline`, `persimmon` (`#D8492A`), `persimmonDeep` (`#B33B1E`), `persimmonSoft`, `jade` (`#1E5C5A`), `jadeSoft`, `marigold` (`#E8A33D`), `marigoldSoft`, `rose`, `roseSoft`, `plum` (`#5B2F3D`), `charcoal` (`#1A1614`), `charcoalSoft`, `charcoalLine`, `charcoalMist`.

Confirmed: **`persimmonDeep` exists**, **`jade` exists**, **`plum` exists**, **`bone` exists**. There is **no `brown` token** and **no `navy` token** — both are added in Task 2 (we add `navy` + `wave` browns so corner waves map to real tokens).

---

## Files touched

| File | Action |
| --- | --- |
| `apps/student/package.json` | add `react-native-svg` dep (Task 1, via expo install) |
| `packages/ui/src/theme.ts` | add `navy` + wave color tokens (Task 2) |
| `apps/student/src/components/splash/FindemyLogoMark.tsx` | **new** (Task 3) |
| `apps/student/src/components/splash/FindemyWordmark.tsx` | **new** (Task 3) |
| `apps/student/src/components/splash/SplashWaves.tsx` | **new** (Task 3) |
| `apps/student/app/index.tsx` | full rewrite (Task 4) |
| `apps/student/app.json` | splash `backgroundColor` → navy (Task 5) |
| `apps/student/assets/images/splash.png` | **MANUAL** raster re-export (Task 5) |

---

## Tasks

### Task 1 — Add `react-native-svg` to apps/student

**Files:** `apps/student/package.json`

`react-native-svg` is a native module; it must be installed with `expo install` so Expo pins the version matching SDK 54 — **do not** hand-edit a guessed version.

**Steps:**
1. **[MANUAL — run by a human / in an environment with network + native tooling]** From the app dir, run:
   ```
   cd apps/student && npx expo install react-native-svg
   ```
2. Confirm it adds a dependency line to `apps/student/package.json` under `"dependencies"`. For Expo SDK 54 this resolves to the **15.x** line, i.e.:
   ```json
   "react-native-svg": "15.12.1",
   ```
   (Exact patch may differ — accept whatever `expo install` pins; do not override it.)
3. If `expo install` cannot run here (no native tooling), add the line manually as a fallback **only** to unblock typecheck, and leave a `// TODO: re-pin via expo install` note in the PR description. Preferred path is the real `expo install`.

**Checkpoint**
- `grep react-native-svg apps/student/package.json` prints exactly one dependency line.
- `cd apps/student && npx tsc --noEmit` → **0 errors** (types ship inside the package).
- _Manual note:_ this step is a human/native-tooling step; verify the lockfile (`pnpm-lock.yaml`) updated too if `expo install` ran.

---

### Task 2 — Add `navy` + wave color tokens to theme

**Files:** `packages/ui/src/theme.ts`

Native splash bg and JS splash bg must read from **one source of truth**. Add a `navy` token plus the two warm wave-wash colors the mock uses in its corners, placed in the existing **"Plum + charcoals (dark surfaces)"** group so dark-surface colors stay together.

**Steps:**
1. Open `packages/ui/src/theme.ts`. Find the dark-surfaces block (`:33-38`):
   ```ts
       // Plum + charcoals (dark surfaces)
       plum: '#5B2F3D',
       charcoal: '#1A1614',
       charcoalSoft: '#2A2520',
       charcoalLine: '#2E2825',
       charcoalMist: '#3A3530',
   ```
2. Replace that block with (adds `navy`, `navyDeep`, and two `wave*` browns; nothing existing removed):
   ```ts
       // Plum + charcoals (dark surfaces)
       plum: '#5B2F3D',
       charcoal: '#1A1614',
       charcoalSoft: '#2A2520',
       charcoalLine: '#2E2825',
       charcoalMist: '#3A3530',

       // Navy (splash backdrop — midtone sampled from ai-usage/splash_screen.jpeg)
       navy: '#1A1D3D',
       navyDeep: '#13152E',

       // Wave washes (organic corner blobs on the splash)
       waveBrown: '#6E3B2A',
       waveOlive: '#4A4A2E',
   ```
3. No other edits — `darkTheme` (`:133-147`) spreads `...tokens.color`, so the new tokens flow through automatically and need no override.

**Why these hexes:** `navy #1A1D3D` is the midtone navy backdrop; `navyDeep #13152E` is a slightly darker variant for any layered vignette; `waveBrown` / `waveOlive` map the top-left plum→brown and bottom-right olive/marigold corner washes to real named tokens so components never hardcode strays.

**Checkpoint**
- `grep -n "navy:" packages/ui/src/theme.ts` → prints `navy: '#1A1D3D',`.
- `cd packages/ui && npx tsc --noEmit` → **0 errors** (the `as const` object still type-checks; `Theme` type widens automatically).

---

### Task 3 — Create splash component primitives

**Files (new):**
- `apps/student/src/components/splash/FindemyLogoMark.tsx`
- `apps/student/src/components/splash/FindemyWordmark.tsx`
- `apps/student/src/components/splash/SplashWaves.tsx`

> **DEFERRED TRACE (only marked placeholder in this plan):** the exact 5-petal teardrop curves and the discipline glyphs in `ai-usage/splash_screen.jpeg` are not vectorized here. `FindemyLogoMark` ships a **working geometric 5-petal fallback** that compiles and renders a recognizable pin-shaped, 5-color mark. A designer later replaces the `PETAL_PATHS` path strings with the traced artwork — fills already map to real theme tokens, so swapping path `d` strings is the only follow-up.

**Step 3a — `FindemyLogoMark.tsx`**

5 SVG `<Path>` petals arranged as a teardrop/pin (4 fan petals + 1 point), filled with brand tokens (persimmon / jade / plum / bone / ivory) matching the mock's palette.

```tsx
import { View } from "react-native";
import Svg, { Path, Circle } from "react-native-svg";
import { useTheme } from "@findemy/ui";

type Props = {
  size?: number;
};

/**
 * Findemy 5-petal mark.
 *
 * PLACEHOLDER GEOMETRY — trace the real petals + discipline glyphs from
 * ai-usage/splash_screen.jpeg and replace the `d` strings below. Fills already
 * map to real theme tokens, so only the path data changes. viewBox is a
 * 120x150 portrait box (teardrop / map-pin proportions).
 */
export function FindemyLogoMark({ size = 132 }: Props) {
  const theme = useTheme();
  const width = size;
  const height = (size * 150) / 120;

  // Geometric fallback: a pin/teardrop split into 5 wedges around center
  // (60,66) flaring up-and-out, converging to the point at (60,142).
  const PETALS: { d: string; fill: string }[] = [
    // top-left — dance (persimmon)
    { d: "M60 66 L60 12 C40 14 26 30 26 52 C26 60 30 66 38 70 Z", fill: theme.color.persimmon },
    // mid-left — paint (jade)
    { d: "M60 66 L38 70 C22 76 16 92 22 106 C28 100 44 90 60 82 Z", fill: theme.color.jade },
    // top-right — music (plum)
    { d: "M60 66 L60 12 C80 14 94 30 94 52 C94 60 90 66 82 70 Z", fill: theme.color.plum },
    // mid-right — yoga (bone / sand)
    { d: "M60 66 L82 70 C98 76 104 92 98 106 C92 100 76 90 60 82 Z", fill: theme.color.bone },
    // center point — figure (ivory)
    { d: "M60 82 L22 106 C34 126 60 142 60 142 C60 142 86 126 98 106 Z", fill: theme.color.ivory },
  ];

  return (
    <View style={{ width, height }}>
      <Svg width={width} height={height} viewBox="0 0 120 150">
        {PETALS.map((p, i) => (
          <Path key={i} d={p.d} fill={p.fill} />
        ))}
        {/* small focal dot at the mark's heart (stands in for a glyph) */}
        <Circle cx={60} cy={66} r={6} fill={theme.color.navy} />
      </Svg>
    </View>
  );
}
```

**Step 3b — `FindemyWordmark.tsx`**

Two `<Text>` siblings on one baseline: "Find" ivory + "emy" persimmon. Sans face, tight tracking.

```tsx
import { View, Text, StyleSheet } from "react-native";
import { useTheme } from "@findemy/ui";

type Props = {
  size?: number;
};

export function FindemyWordmark({ size = 56 }: Props) {
  const theme = useTheme();
  const base = {
    fontFamily: theme.font.sans,
    fontSize: size,
    lineHeight: size * 1.05,
    letterSpacing: -1,
    fontWeight: "600" as const,
  };
  return (
    <View style={styles.row}>
      <Text style={[base, { color: theme.color.ivory }]}>Find</Text>
      <Text style={[base, { color: theme.color.persimmon }]}>emy</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "baseline",
  },
});
```

**Step 3c — `SplashWaves.tsx`**

Organic corner washes. SVG-blob path tracing is **deferred**, so this ships a **View-based fallback**: oversized rounded blobs absolutely positioned off the top-left and bottom-right corners, low opacity, colors from the new wave tokens + plum/jade. It fills the parent (`StyleSheet.absoluteFill`).

```tsx
import { View, StyleSheet } from "react-native";
import { useTheme } from "@findemy/ui";

/**
 * Organic corner washes (top-left plum→brown, bottom-right olive→jade).
 *
 * View-based fallback — SVG path tracing of the exact blob curves from
 * ai-usage/splash_screen.jpeg is deferred. Oversized soft-radius rectangles
 * read as organic corner waves against the navy backdrop.
 */
export function SplashWaves() {
  const theme = useTheme();
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* top-left: plum wash */}
      <View
        style={[
          styles.blob,
          {
            backgroundColor: theme.color.plum,
            opacity: 0.55,
            width: 460,
            height: 380,
            top: -200,
            left: -180,
            borderBottomRightRadius: 320,
            transform: [{ rotate: "-12deg" }],
          },
        ]}
      />
      {/* top-left accent: warm brown */}
      <View
        style={[
          styles.blob,
          {
            backgroundColor: theme.color.waveBrown,
            opacity: 0.35,
            width: 300,
            height: 240,
            top: -150,
            left: -120,
            borderBottomRightRadius: 220,
            transform: [{ rotate: "-8deg" }],
          },
        ]}
      />
      {/* bottom-right: olive wash */}
      <View
        style={[
          styles.blob,
          {
            backgroundColor: theme.color.waveOlive,
            opacity: 0.5,
            width: 460,
            height: 400,
            bottom: -220,
            right: -160,
            borderTopLeftRadius: 320,
            transform: [{ rotate: "-10deg" }],
          },
        ]}
      />
      {/* bottom-right accent: persimmon-deep / brown */}
      <View
        style={[
          styles.blob,
          {
            backgroundColor: theme.color.waveBrown,
            opacity: 0.4,
            width: 320,
            height: 280,
            bottom: -180,
            right: -120,
            borderTopLeftRadius: 240,
            transform: [{ rotate: "-6deg" }],
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  blob: {
    position: "absolute",
  },
});
```

**Checkpoint**
- The three files exist under `apps/student/src/components/splash/`.
- `cd apps/student && npx tsc --noEmit` → **0 errors** (requires Task 1 + Task 2 done first — `react-native-svg` types + `theme.color.navy` / `waveBrown` / `waveOlive`).

---

### Task 4 — Rewrite `apps/student/app/index.tsx`

**Files:** `apps/student/app/index.tsx`

Full-bleed navy View → `<SplashWaves/>` behind a centered column: `<FindemyLogoMark/>` → `<FindemyWordmark/>` → 56px-wide 1px persimmon rule → "DISCOVER YOUR ART" (ivory @70%, `letterSpacing: 4`, tiny size). **Remove** the old serif F mark, glows, loader bar, tagline, and footer. **Keep** the redirect `useEffect` with its `1200`ms timeout verbatim.

Replace the **entire file** with:

```tsx
import { useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useTheme } from "@findemy/ui";
import { useAuth } from "@/stores/auth";
import { SplashWaves } from "@/components/splash/SplashWaves";
import { FindemyLogoMark } from "@/components/splash/FindemyLogoMark";
import { FindemyWordmark } from "@/components/splash/FindemyWordmark";

export default function SplashScreen() {
  const router = useRouter();
  const theme = useTheme();
  const accessToken = useAuth((s) => s.accessToken);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (accessToken) {
        router.replace("/(tabs)");
      } else {
        router.replace("/(auth)");
      }
    }, 1200);
    return () => clearTimeout(timer);
  }, [accessToken, router]);

  return (
    <View style={[styles.root, { backgroundColor: theme.color.navy }]}>
      <SplashWaves />

      <View style={styles.column}>
        <FindemyLogoMark size={140} />

        <View style={styles.wordmarkWrap}>
          <FindemyWordmark size={56} />
        </View>

        <View
          style={[styles.rule, { backgroundColor: theme.color.persimmon }]}
        />

        <Text
          style={[
            styles.discover,
            { color: theme.color.ivory, fontFamily: theme.font.sans },
          ]}
        >
          DISCOVER YOUR ART
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
    overflow: "hidden",
  },
  column: {
    alignItems: "center",
  },
  wordmarkWrap: {
    marginTop: 28,
  },
  rule: {
    width: 56,
    height: 1,
    marginTop: 18,
    marginBottom: 14,
    opacity: 0.9,
  },
  discover: {
    fontSize: 11,
    letterSpacing: 4,
    opacity: 0.7,
    textAlign: "center",
  },
});
```

Notes:
- `@/components/...` and `@/stores/auth` use the app's existing `@/*` path alias (already used at `:5` for `@/stores/auth`).
- The old `glow`, `mark`, `markDot`, `loader`, `loaderFill`, `footer` styles are **gone** — confirm none remain.

**Checkpoint**
- `cd apps/student && npx tsc --noEmit` → **0 errors**.
- `grep -nE "charcoal|loaderFill|CRAFTED IN BENGALURU|Findemy\"|radial" apps/student/app/index.tsx` → **no matches** (old splash fully removed; wordmark is now component-driven).
- _Manual:_ cold-launch the app → JS splash shows **navy** bg with wave corners, 5-petal mark, "Find"+"emy" wordmark, persimmon rule, "DISCOVER YOUR ART". No charcoal background.

---

### Task 5 — Native splash backgroundColor → navy (+ manual raster)

**Files:** `apps/student/app.json`, and **MANUAL** `apps/student/assets/images/splash.png`

**Steps:**
1. In `apps/student/app.json`, edit the `splash` block (`:9-13`). Change only `backgroundColor`; keep `resizeMode: "contain"` and the `image` path:
   ```json
       "splash": {
         "image": "./assets/images/splash.png",
         "resizeMode": "contain",
         "backgroundColor": "#1A1D3D"
       },
   ```
   `#1A1D3D` is the same hex as the `navy` token from Task 2 — native + JS now share one value. Setting it eliminates the ivory flash between the OS splash and the first JS frame.
2. **Leave** Android `adaptiveIcon.backgroundColor` (`:23`) as `#FBF7EF` — that is the launcher icon, not the splash.

3. **[MANUAL — human asset export, not an automated worker step]** The current `apps/student/assets/images/splash.png` is a **69-byte placeholder stub**. A human must export a real raster from `ai-usage/splash_screen.jpeg` artwork:
   - **Dimensions:** 1284 × 2778 px (iPhone portrait splash reference size).
   - **Background:** navy `#1A1D3D` (must match `app.json` so `resizeMode: "contain"` letterboxing is invisible).
   - **Content:** the 5-petal mark + "Findemy" two-tone wordmark + "DISCOVER YOUR ART", centered, on the navy field — matching the JS splash so the OS→JS handoff is seamless.
   - Overwrite `apps/student/assets/images/splash.png` with this PNG.
   - This cannot be produced by an automated worker (binary raster export); flag it explicitly as a **human task** in the PR.

**Checkpoint**
- `grep -n "1A1D3D" apps/student/app.json` → prints the splash `backgroundColor` line.
- `cd apps/student && npx tsc --noEmit` → **0 errors** (JSON change doesn't affect TS, but run to confirm the group still compiles).
- _Manual:_ after the PNG is exported, **cold-launch** (fully kill + relaunch) on a device/simulator → native splash shows **navy** background with the branded mark, then JS splash (also navy) — **no ivory flash** at any point. Until the PNG is re-exported, the native splash will show navy bg with the stub image (still no ivory flash, just no centered art yet).

---

## Manual steps summary (flag in PR)

1. **Task 1** — `npx expo install react-native-svg` should be run in an environment with native tooling + network so Expo pins the SDK-correct version and updates the lockfile.
2. **Task 5** — export the real `splash.png` raster (1284 × 2778, navy `#1A1D3D` bg) from the `ai-usage/splash_screen.jpeg` artwork; the 69-byte stub must be replaced by a human.
3. **Task 3 (deferred trace, not blocking)** — replace `FindemyLogoMark` `PETAL_PATHS` geometric fallback and `SplashWaves` View blobs with vectorized SVG traced from the mock when a designer is available.
