import { Text, View } from "react-native";

/**
 * Minimal icon set built from Unicode + emoji glyphs. Real SVG icons would
 * require `react-native-svg`; this keeps zero new deps while still giving us
 * consistent sizing + colour. Phase 4 deliverable.
 */

const GLYPH: Record<string, string> = {
  home: "⌂",
  cal: "⌗", // calendar — a hash-like grid feel
  clock: "◷",
  loc: "◉",
  mappin: "⊙",
  bell: "♪",
  chevL: "‹",
  chevR: "›",
  chevD: "▾",
  chevU: "▴",
  arrowR: "→",
  arrowUp: "↑",
  arrowL: "←",
  arrowDown: "↓",
  check: "✓",
  x: "✕",
  plus: "＋",
  search: "⌕",
  sliders: "≡",
  edit: "✎",
  user: "◯",
  users: "◯◯",
  mail: "✉",
  phone: "☎",
  wa: "W",
  shield: "⛨",
  star: "★",
  starOutline: "☆",
  heart: "♥",
  heartOutline: "♡",
  medal: "✦",
  trophy: "♛",
  flame: "♨",
  sparkle: "✦",
  help: "?",
  camera: "▣",
  image: "▤",
  scan: "▦",
  music: "♪",
  dance: "✦",
  brush: "✎",
  yoga: "◐",
  share: "↗",
  comment: "◷",
  play: "▶",
  pause: "■",
  audio: "♪",
  bolt: "⚡",
  timer: "◷",
  fast: "»",
  info: "ⓘ",
  lock: "⌷",
};

type IconProps = {
  size?: number;
  color?: string;
  weight?: "regular" | "bold";
};

function makeIcon(key: string) {
  return function Icon({ size = 16, color = "#1A1611", weight = "regular" }: IconProps) {
    const glyph = GLYPH[key] ?? "?";
    return (
      <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
        <Text
          style={{
            fontSize: size * 0.92,
            lineHeight: size,
            color,
            fontWeight: weight === "bold" ? "700" : "500",
            textAlign: "center",
          }}
        >
          {glyph}
        </Text>
      </View>
    );
  };
}

// Named exports for the icons the codebase already references.
export const IconHome = makeIcon("home");
export const IconCal = makeIcon("cal");
export const IconClock = makeIcon("clock");
export const IconLoc = makeIcon("loc");
export const IconBell = makeIcon("bell");
export const IconChevL = makeIcon("chevL");
export const IconChevR = makeIcon("chevR");
export const IconChevD = makeIcon("chevD");
export const IconArrowR = makeIcon("arrowR");
export const IconArrowUp = makeIcon("arrowUp");
export const IconCheck = makeIcon("check");
export const IconX = makeIcon("x");
export const IconPlus = makeIcon("plus");
export const IconSearch = makeIcon("search");
export const IconSliders = makeIcon("sliders");
export const IconEdit = makeIcon("edit");
export const IconMappin = makeIcon("mappin");
export const IconUser = makeIcon("user");
export const IconUsers = makeIcon("users");
export const IconMail = makeIcon("mail");
export const IconPhone = makeIcon("phone");
export const IconWa = makeIcon("wa");
export const IconShield = makeIcon("shield");
export const IconStar = makeIcon("star");
export const IconHeart = makeIcon("heart");
export const IconMedal = makeIcon("medal");
export const IconTrophy = makeIcon("trophy");
export const IconFlame = makeIcon("flame");
export const IconSparkle = makeIcon("sparkle");
export const IconHelp = makeIcon("help");
export const IconCamera = makeIcon("camera");
export const IconImage = makeIcon("image");
export const IconQr = makeIcon("scan");

/**
 * Generic Icon component for consumer code that prefers passing a name.
 * Falls back to a placeholder `?` if the name isn't recognised.
 */
export function Icon({
  name,
  size = 16,
  color = "#1A1611",
  weight = "regular",
}: IconProps & { name: keyof typeof GLYPH }) {
  const Component = makeIcon(name as string);
  return <Component size={size} color={color} weight={weight} />;
}
