import React from 'react';
import { View, Text, StyleSheet, type ViewStyle } from 'react-native';
import { useTheme } from '../ThemeProvider';

export type BlockPrintCategory = 'music' | 'dance' | 'arts' | 'yoga';

export type BlockPrintCoverProps = {
  /** Category — drives the colour palette. Required. */
  category: BlockPrintCategory | string;
  /** Variant 1–4 shifts the shape composition so a row of cards doesn't look identical. */
  variant?: 1 | 2 | 3 | 4;
  /** Optional initial letter for the centre serif italic motif. */
  letter?: string;
  /** Cover height. Default 130. */
  height?: number;
  /** Extra style on the root. */
  style?: ViewStyle;
  /** Children render on top of the texture (badges, pills, etc). */
  children?: React.ReactNode;
  /** Hide the centre serif letter. */
  hideLetter?: boolean;
};

/**
 * Decorative cover used in place of the mockup's CSS `block-print` art.
 * Composes solid View shapes (no SVG/gradient deps) to give each card a
 * distinct, layered, hand-printed feel. Per-category palettes come from
 * `theme.category.*`.
 */
export function BlockPrintCover({
  category,
  variant = 1,
  letter,
  height = 130,
  style,
  children,
  hideLetter,
}: BlockPrintCoverProps) {
  const theme = useTheme();
  const palette =
    (theme as any).category?.[String(category).toLowerCase()] ??
    (theme as any).category?.music;

  const accent = palette.accent;
  const base = palette.base;
  const ink = palette.ink;

  // Per-variant rotations + offsets so consecutive cards look intentionally
  // varied. Numbers picked by feel.
  const conf = VARIANT_CONFIG[variant];

  return (
    <View
      style={[
        styles.root,
        { height, backgroundColor: base },
        style,
      ]}
    >
      {/* Large soft disc — bottom-left ish */}
      <View
        pointerEvents="none"
        style={[
          styles.disc,
          {
            backgroundColor: accent,
            opacity: conf.disc.opacity,
            top: conf.disc.top,
            left: conf.disc.left,
            right: conf.disc.right,
            bottom: conf.disc.bottom,
            width: conf.disc.size,
            height: conf.disc.size,
            borderRadius: conf.disc.size / 2,
          },
        ]}
      />

      {/* Petal/diamond — a tilted square block */}
      <View
        pointerEvents="none"
        style={[
          styles.petal,
          {
            backgroundColor: ink,
            opacity: conf.petal.opacity,
            top: conf.petal.top,
            right: conf.petal.right,
            width: conf.petal.size,
            height: conf.petal.size,
            transform: [{ rotate: conf.petal.rotate }],
          },
        ]}
      />

      {/* Thin stripe — gives the "block-print plate" feel */}
      <View
        pointerEvents="none"
        style={[
          styles.stripe,
          {
            backgroundColor: accent,
            opacity: 0.18,
            top: conf.stripe.top,
            transform: [{ rotate: conf.stripe.rotate }],
          },
        ]}
      />

      {/* Three accent dots — bottom row of texture */}
      <View pointerEvents="none" style={styles.dotRow}>
        {[0, 1, 2].map((i) => (
          <View
            key={i}
            style={[
              styles.dot,
              { backgroundColor: ink, opacity: 0.18 - i * 0.04 },
            ]}
          />
        ))}
      </View>

      {/* Centre letter — italic serif, accent colour */}
      {!hideLetter && letter ? (
        <View pointerEvents="none" style={styles.letterWrap}>
          <Text
            style={{
              fontFamily: theme.font.serif,
              fontStyle: 'italic',
              fontSize: Math.round(height * 0.5),
              lineHeight: Math.round(height * 0.55),
              color: accent,
              opacity: 0.92,
            }}
          >
            {letter[0]?.toUpperCase()}
          </Text>
        </View>
      ) : null}

      {/* Overlays (badges, pills, etc.) */}
      {children}
    </View>
  );
}

const VARIANT_CONFIG = {
  1: {
    disc: { size: 200, top: -60, left: undefined, right: -60, bottom: undefined, opacity: 0.32 },
    petal: { size: 70, top: 50, right: 90, rotate: '18deg', opacity: 0.22 },
    stripe: { top: 24, rotate: '-22deg' },
  },
  2: {
    disc: { size: 240, top: 50, left: -80, right: undefined, bottom: undefined, opacity: 0.28 },
    petal: { size: 80, top: 30, right: 40, rotate: '34deg', opacity: 0.18 },
    stripe: { top: 80, rotate: '12deg' },
  },
  3: {
    disc: { size: 180, top: undefined, left: undefined, right: 30, bottom: -80, opacity: 0.34 },
    petal: { size: 60, top: 20, right: 30, rotate: '-12deg', opacity: 0.24 },
    stripe: { top: 50, rotate: '8deg' },
  },
  4: {
    disc: { size: 220, top: -90, left: -40, right: undefined, bottom: undefined, opacity: 0.30 },
    petal: { size: 90, top: 60, right: 60, rotate: '-28deg', opacity: 0.16 },
    stripe: { top: 100, rotate: '-8deg' },
  },
} as const;

const styles = StyleSheet.create({
  root: {
    width: '100%',
    position: 'relative',
    overflow: 'hidden',
  },
  disc: {
    position: 'absolute',
  },
  petal: {
    position: 'absolute',
    borderRadius: 14,
  },
  stripe: {
    position: 'absolute',
    height: 2,
    width: '160%',
    left: -30,
  },
  dotRow: {
    position: 'absolute',
    bottom: 6,
    right: 8,
    flexDirection: 'row',
    gap: 4,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  letterWrap: {
    position: 'absolute',
    inset: 0 as any,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
