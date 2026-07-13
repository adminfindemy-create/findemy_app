export const tokens = {
  color: {
    // Inks
    ink: '#1A1611',
    inkSoft: '#3A332D',
    mist: '#6E655A',
    whisper: '#8A8071',

    // Papers (clean white surfaces — prototype refresh)
    paper: '#FFFFFF',
    paperWarm: '#F5F5F5',
    ivory: '#FFFFFF',
    bone: '#E5DDC9',
    hairline: '#E8E1D2',

    // Persimmon (brand accent — warm orange)
    persimmon: '#EC5A2B',
    persimmonDeep: '#D24A20',
    persimmonSoft: '#FBE3D8',

    // Jade (cool secondary — calm teal)
    jade: '#1E6F66',
    jadeSoft: '#D8E6E1',

    // Marigold / gold (yellow accent)
    marigold: '#C8862A',
    marigoldSoft: '#F3E4C6',

    // Rose (alert / cancel)
    rose: '#C0392B',
    roseSoft: '#F7DAD5',

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
  },
  font: {
    // Prototype refresh: Libre Caslon (display serif) + Plus Jakarta Sans.
    // Font files bundled in student-app/assets/fonts and loaded via useFonts
    // in app/_layout.tsx. Names below must match the keys registered there.
    //
    // RN can't synthesise italic or heavier weights for a named custom font, so
    // each weight/style is its own registered family. Prefer `sansFor(weight)`
    // (below) over `sans` + fontWeight, and `serifItalic` over serif+italic.
    serif: 'LibreCaslonDisplay',
    serifItalic: 'LibreCaslonText-Italic',
    sans: 'PlusJakartaSans',
    sansMedium: 'PlusJakartaSans-Medium',
    sansSemibold: 'PlusJakartaSans-SemiBold',
    sansBold: 'PlusJakartaSans-Bold',
  },
  // Type ramp matches mockup-specific sizes used at serif/sans intersections.
  type: {
    // Display (huge serif italic, splash + auth heroes)
    splash: { size: 78, lineHeight: 78, weight: 400 },
    hero:   { size: 44, lineHeight: 46, weight: 400 },
    h1:     { size: 38, lineHeight: 40, weight: 400 },
    h2:     { size: 30, lineHeight: 32, weight: 400 },
    h3:     { size: 24, lineHeight: 28, weight: 400 },
    h4:     { size: 22, lineHeight: 26, weight: 400 },
    h5:     { size: 18, lineHeight: 22, weight: 600 },

    // Sans body / utility
    body:     { size: 14, lineHeight: 20, weight: 400 },
    bodyLg:   { size: 15, lineHeight: 22, weight: 400 },
    small:    { size: 13, lineHeight: 18, weight: 400 },
    micro:    { size: 12, lineHeight: 16, weight: 500 },
    tiny:     { size: 11, lineHeight: 14, weight: 500 },
    label:    { size: 10, lineHeight: 12, weight: 600 },

    // Legacy aliases (kept so existing screens don't break — point at the
    // closest new equivalent).
    display:  { size: 44, lineHeight: 46, weight: 400 },
    title:    { size: 24, lineHeight: 28, weight: 400 },
    subtitle: { size: 18, lineHeight: 22, weight: 600 },
    caption:  { size: 11, lineHeight: 14, weight: 500 },
  },
  space: {
    0: 0,
    1: 4,
    2: 8,
    3: 12,
    4: 16,
    5: 20,
    6: 24,
    8: 32,
    10: 40,
    12: 48,
    14: 56,
    16: 64,
  },
  radius: {
    // Aligned with mockup names; values are the mockup values verbatim.
    xs: 6,
    sm: 10,
    md: 14,
    lg: 20,
    xl: 28,
    pill: 999,
  },
  // Soft neutral shadows tuned for the white-surface refresh. (Earlier the
  // mockup used warm-brown rgba(60,30,10,...) which read heavy on the new
  // white background, so colour is cooled and opacity lowered.)
  shadow: {
    sm: {
      shadowColor: '#1A1611',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 3,
      elevation: 1,
    },
    md: {
      shadowColor: '#1A1611',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.08,
      shadowRadius: 16,
      elevation: 4,
    },
    lg: {
      shadowColor: '#14110F',
      shadowOffset: { width: 0, height: 16 },
      shadowOpacity: 0.12,
      shadowRadius: 28,
      elevation: 10,
    },
  },
  // Per-category palette for art / chip / accent surfaces — used by
  // BlockPrintCover, badges, chips.
  category: {
    music:  { base: '#FBE9D6', accent: '#EC5A2B', ink: '#5B2B14' },
    dance:  { base: '#D9EBE3', accent: '#1E6F66', ink: '#0E3936' },
    arts:   { base: '#FBE4B8', accent: '#C8862A', ink: '#5B3F0E' },
    yoga:   { base: '#E2EAF4', accent: '#3F6FA8', ink: '#2A3D55' },
  },
} as const;

export type Theme = typeof tokens;

/**
 * Maps a numeric/string font weight to the correct registered Plus Jakarta Sans
 * family. Use this everywhere instead of relying on `fontWeight` with the base
 * `sans` family, which RN won't render bolder for a named custom font.
 */
export function sansFor(weight?: string | number): string {
  const numericWeight = typeof weight === 'string' ? parseInt(weight, 10) : weight ?? 400;
  if (numericWeight >= 700) return tokens.font.sansBold;
  if (numericWeight >= 600) return tokens.font.sansSemibold;
  if (numericWeight >= 500) return tokens.font.sansMedium;
  return tokens.font.sans;
}

export const lightTheme: Theme = tokens;

export const darkTheme = {
  ...tokens,
  color: {
    ...tokens.color,
    ink: '#FAF6EE',
    inkSoft: '#F1ECE2',
    mist: '#B5AB9B',
    whisper: '#8B7F73',
    paper: '#1A1614',
    paperWarm: '#2A2520',
    ivory: '#1A1614',
    bone: '#2A2520',
    hairline: '#3A3530',
  },
} as unknown as Theme;
