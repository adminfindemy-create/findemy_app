import {
  BlockPrintCover,
  IconArrowR,
  IconFlame,
  IconMappin,
  IconStar,
  useTheme,
} from '@findemy/ui';
import { Image } from 'expo-image';
import React from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Rect, ClipPath, G } from 'react-native-svg';

const NEAR_CARD_RADIUS = 20;

const COMPACT_COVER_HEIGHT = 148;

type AcademyCardProps = {
  academy: {
    id: string;
    name: string;
    category: string;
    rating?: number;
    // The discover API returns rating_count/online_available/trial_from_paise;
    // detail responses use the *_count/onlineAvailable spellings. Accept both.
    review_count?: number;
    rating_count?: number;
    distance_km?: number;
    verified?: boolean;
    onlineAvailable?: boolean;
    online_available?: boolean;
    address?: string;
    images?: string[];
    trial_fee_paise?: number;
    trial_from_paise?: number | null;
    monthly_fee_paise?: number;
    monthly_from_paise?: number | null;
    lat?: number;
    lng?: number;
  };
  onPress: () => void;
  variant?: 'default' | 'compact';
  isSaved?: boolean;
  onToggleSave?: (id: string) => void;
};

function variantForId(id: string | undefined): 1 | 2 | 3 | 4 {
  if (!id) return 1;
  const sum = Array.from(id).reduce((total, char) => total + char.charCodeAt(0), 0);
  return ((sum % 4) + 1) as 1 | 2 | 3 | 4;
}

function formatPrice(paise?: number): string {
  if (paise == null) return '—';
  if (paise === 0) return 'Free';
  return `₹${Math.round(paise / 100).toLocaleString('en-IN')}`;
}

function Cover({
  academy,
  height,
  radius,
}: { academy: AcademyCardProps['academy']; height: number; radius: number }) {
  return academy.images?.length ? (
    <Image
      source={{ uri: academy.images[0] }}
      style={{ width: '100%', height, borderRadius: radius }}
      contentFit="cover"
    />
  ) : (
    <BlockPrintCover
      category={academy.category}
      variant={variantForId(academy.id)}
      letter={academy.name?.[0] ?? 'A'}
      height={height}
      hideLetter
      style={{ width: '100%', height, borderRadius: radius, overflow: 'hidden' }}
    />
  );
}

function Heart({
  saved,
  onPress,
  persimmon,
  ink,
}: { saved: boolean; onPress?: () => void; persimmon: string; ink: string }) {
  const scale = React.useRef(new Animated.Value(1)).current;
  const bounce = () => {
    Animated.sequence([
      Animated.spring(scale, { toValue: 0.8, useNativeDriver: true, speed: 50, bounciness: 0 }),
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 16, bounciness: 14 }),
    ]).start();
  };
  return (
    <Pressable
      style={styles.heartBtn}
      onPress={() => {
        bounce();
        onPress?.();
      }}
      hitSlop={8}
      accessibilityLabel={saved ? 'Remove from wishlist' : 'Save to wishlist'}
    >
      <Animated.Text
        style={{
          fontSize: 15,
          lineHeight: 17,
          color: saved ? persimmon : ink,
          transform: [{ scale }],
        }}
      >
        {saved ? '♥' : '♡'}
      </Animated.Text>
    </Pressable>
  );
}

// Footer CTA on the near-card — the one literal "button" inside the card, so
// it gets its own press-in/out spring instead of the card's flat opacity dim.
function ViewButton({
  color,
  fontFamily,
  onPress,
}: { color: string; fontFamily: string; onPress?: () => void }) {
  const scale = React.useRef(new Animated.Value(1)).current;
  const pressIn = () =>
    Animated.spring(scale, {
      toValue: 0.9,
      useNativeDriver: true,
      speed: 40,
      bounciness: 6,
    }).start();
  const pressOut = () =>
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 20,
      bounciness: 10,
    }).start();
  return (
    <Pressable onPress={onPress} onPressIn={pressIn} onPressOut={pressOut} hitSlop={6}>
      <Animated.View style={[styles.viewPill, { backgroundColor: color, transform: [{ scale }] }]}>
        <Text style={{ fontFamily, fontSize: 12.5, color: '#fff' }}>View →</Text>
      </Animated.View>
    </Pressable>
  );
}

export function AcademyCard({
  academy,
  onPress,
  variant = 'default',
  isSaved = false,
  onToggleSave,
}: AcademyCardProps) {
  const theme = useTheme();
  const cat = String(academy.category).toUpperCase();
  const toggle = () => onToggleSave?.(academy.id);

  // Compact = prototype `.studio-card` (top-rated horizontal carousel).
  if (variant === 'compact') {
    const trending = (academy.rating ?? 0) >= 4.5;
    const compactTrialFrom = academy.trial_from_paise ?? academy.trial_fee_paise;
    const compactReviews = academy.rating_count ?? academy.review_count;
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.studioCard,
          { backgroundColor: '#fff', borderColor: theme.color.hairline, ...theme.shadow.sm },
          pressed && styles.studioCardPressed,
        ]}
      >
        <View style={styles.studioCover}>
          <View style={styles.fill}>
            <Cover academy={academy} height={COMPACT_COVER_HEIGHT} radius={0} />
          </View>
          <View style={styles.scrimTop} />
          <View style={styles.scrimBottom} />

          {trending ? (
            <View style={[styles.badge, { backgroundColor: theme.color.persimmon }]}>
              <IconFlame size={11} color="#fff" />
              <Text style={[styles.badgeText, { fontFamily: theme.font.sansBold }]}>TRENDING</Text>
            </View>
          ) : (
            <View style={[styles.badge, { backgroundColor: 'rgba(20,16,14,0.55)' }]}>
              <Text style={[styles.badgeText, { fontFamily: theme.font.sansBold }]}>{cat}</Text>
            </View>
          )}

          <View style={styles.studioHeart}>
            <Heart
              saved={isSaved}
              onPress={toggle}
              persimmon={theme.color.persimmon}
              ink={theme.color.ink}
            />
          </View>

          <Text style={[styles.studioName, { fontFamily: theme.font.serif }]} numberOfLines={2}>
            {academy.name}
          </Text>
        </View>

        <View>
          <Svg style={StyleSheet.absoluteFillObject} pointerEvents="none">
            <Defs>
              <LinearGradient id="studioFootWash" x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0" stopColor={theme.color.paper} stopOpacity={1} />
                <Stop offset="0.7" stopColor={theme.color.paper} stopOpacity={1} />
                <Stop offset="1" stopColor={theme.color.persimmonSoft} stopOpacity={0.6} />
              </LinearGradient>
            </Defs>
            <Rect x={0} y={0} width="100%" height="100%" fill="url(#studioFootWash)" />
          </Svg>
          <View style={styles.studioMeta}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
              {academy.rating != null ? (
                <View style={[styles.ratingPill, { backgroundColor: theme.color.persimmonSoft }]}>
                  <IconStar size={12} color={theme.color.persimmon} />
                  <Text
                    style={[
                      styles.metaStrong,
                      { fontFamily: theme.font.sansBold, color: theme.color.persimmonDeep },
                    ]}
                  >
                    {academy.rating.toFixed(1)}
                  </Text>
                  {compactReviews != null ? (
                    <Text
                      style={{
                        fontFamily: theme.font.sansMedium,
                        fontSize: 11,
                        color: theme.color.persimmonDeep,
                        opacity: 0.75,
                      }}
                    >
                      ({compactReviews})
                    </Text>
                  ) : null}
                </View>
              ) : null}
              {academy.distance_km != null ? (
                <View style={styles.starRow}>
                  <IconMappin size={12} color={theme.color.whisper} />
                  <Text
                    style={{
                      fontFamily: theme.font.sansSemibold,
                      fontSize: 12,
                      color: theme.color.mist,
                    }}
                  >
                    {academy.distance_km.toFixed(1)} km
                  </Text>
                </View>
              ) : null}
            </View>

            {compactTrialFrom != null ? (
              <View style={[styles.studioFoot, { borderTopColor: theme.color.hairline }]}>
                <View>
                  <Text
                    style={[
                      styles.priceLbl,
                      { fontFamily: theme.font.sansBold, color: theme.color.whisper },
                    ]}
                  >
                    TRIAL FROM
                  </Text>
                  <Text
                    style={[
                      styles.priceAmt,
                      { fontFamily: theme.font.sansBold, color: theme.color.ink },
                    ]}
                  >
                    {formatPrice(compactTrialFrom)}
                  </Text>
                </View>
                <View style={[styles.studioCta, { backgroundColor: theme.color.ink }]}>
                  <IconArrowR size={13} color="#fff" />
                </View>
              </View>
            ) : (
              <View style={{ alignItems: 'flex-end', marginTop: 6 }}>
                <IconArrowR size={14} color={theme.color.persimmon} />
              </View>
            )}
          </View>
        </View>
      </Pressable>
    );
  }

  // Default = prototype `.near-card` (vertical list row).
  const online = academy.online_available ?? academy.onlineAvailable;
  const reviews = academy.rating_count ?? academy.review_count;
  const trialFrom = academy.trial_from_paise ?? academy.trial_fee_paise;
  const locationLabel = [
    academy.address,
    academy.distance_km != null ? `${academy.distance_km.toFixed(1)} km` : null,
  ]
    .filter(Boolean)
    .join(' · ');
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.nearCard, pressed && styles.nearCardPressed]}
    >
      <View style={[styles.nearCardInner, { borderColor: theme.color.hairline }]}>
        {/* Warm gradient wash + top accent bar — replaces the flat white fill.
            Clipped with an in-SVG <ClipPath> rather than relying on the parent's
            overflow:hidden, since RN doesn't reliably clip a nested Svg canvas
            to a rounded-corner ancestor on every platform. */}
        <Svg style={StyleSheet.absoluteFillObject} pointerEvents="none">
          <Defs>
            <LinearGradient id="nearCardWash" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor={theme.color.paper} stopOpacity={1} />
              <Stop offset="0.6" stopColor={theme.color.paper} stopOpacity={1} />
              <Stop offset="1" stopColor={theme.color.persimmonSoft} stopOpacity={0.7} />
            </LinearGradient>
            <LinearGradient id="nearCardBar" x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0" stopColor={theme.color.persimmon} />
              <Stop offset="1" stopColor={theme.color.marigold} />
            </LinearGradient>
            <ClipPath id="nearCardClip">
              <Rect
                x={0}
                y={0}
                width="100%"
                height="100%"
                rx={NEAR_CARD_RADIUS}
                ry={NEAR_CARD_RADIUS}
              />
            </ClipPath>
          </Defs>
          <G clipPath="url(#nearCardClip)">
            <Rect x={0} y={0} width="100%" height="100%" fill="url(#nearCardWash)" />
            <Rect x={0} y={0} width="100%" height={3} fill="url(#nearCardBar)" />
          </G>
        </Svg>

        <View style={styles.nearCardContent}>
          <View style={styles.thumb}>
            <Cover academy={academy} height={96} radius={16} />
            <View style={{ position: 'absolute', top: 7, right: 7 }}>
              <Heart
                saved={isSaved}
                onPress={toggle}
                persimmon={theme.color.persimmon}
                ink={theme.color.ink}
              />
            </View>
          </View>

          <View style={styles.nearBody}>
            <View style={styles.nearCat}>
              <View style={[styles.catChip, { backgroundColor: theme.color.persimmonSoft }]}>
                <Text
                  style={[
                    styles.nearCatText,
                    { fontFamily: theme.font.sansBold, color: theme.color.persimmonDeep },
                  ]}
                >
                  {cat}
                </Text>
              </View>
              {online ? (
                <View style={[styles.catChip, { backgroundColor: theme.color.jadeSoft }]}>
                  <Text
                    style={[
                      styles.nearCatText,
                      { fontFamily: theme.font.sansBold, color: theme.color.jade },
                    ]}
                  >
                    ONLINE
                  </Text>
                </View>
              ) : null}
            </View>

            <Text
              style={[styles.nearName, { fontFamily: theme.font.serif, color: theme.color.ink }]}
              numberOfLines={2}
            >
              {academy.name}
            </Text>

            {locationLabel ? (
              <View style={styles.nearLoc}>
                <IconMappin size={13} color={theme.color.persimmon} />
                <Text
                  style={[
                    styles.nearLocText,
                    { fontFamily: theme.font.sansMedium, color: theme.color.inkSoft },
                  ]}
                  numberOfLines={1}
                >
                  {locationLabel}
                </Text>
              </View>
            ) : null}

            {academy.rating != null || reviews != null ? (
              <View style={styles.nearRate}>
                {academy.rating != null ? (
                  <View style={[styles.ratingPill, { backgroundColor: theme.color.persimmonSoft }]}>
                    <IconStar size={12} color={theme.color.persimmon} />
                    <Text
                      style={[
                        styles.metaStrong,
                        { fontFamily: theme.font.sansBold, color: theme.color.persimmonDeep },
                      ]}
                    >
                      {academy.rating.toFixed(1)}
                    </Text>
                  </View>
                ) : null}
                {reviews != null ? (
                  <Text
                    style={{
                      fontFamily: theme.font.sansMedium,
                      fontSize: 12,
                      color: theme.color.whisper,
                    }}
                  >
                    {reviews} reviews
                  </Text>
                ) : null}
              </View>
            ) : null}

            {trialFrom != null ? (
              <View style={[styles.nearFoot, { borderTopColor: theme.color.hairline }]}>
                <View style={{ flexShrink: 1 }}>
                  <Text
                    style={[
                      styles.priceLbl,
                      { fontFamily: theme.font.sansBold, color: theme.color.whisper },
                    ]}
                  >
                    TRIAL FROM
                  </Text>
                  <Text
                    style={[
                      styles.priceAmt,
                      { fontFamily: theme.font.sansBold, color: theme.color.ink },
                    ]}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                  >
                    {formatPrice(trialFrom)}
                  </Text>
                </View>
                <ViewButton
                  color={theme.color.persimmon}
                  fontFamily={theme.font.sansBold}
                  onPress={onPress}
                />
              </View>
            ) : (
              <View style={{ alignItems: 'flex-end', marginTop: 9 }}>
                <ViewButton
                  color={theme.color.persimmon}
                  fontFamily={theme.font.sansBold}
                  onPress={onPress}
                />
              </View>
            )}
          </View>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // studio-card (compact) — a single elevated card unit: image up top (clipped
  // to the card's own radius), all metadata inside the card body below so
  // nothing floats outside the card boundary.
  studioCard: {
    width: 192,
    borderRadius: 22,
    borderWidth: 1,
    overflow: 'hidden',
  },
  studioCardPressed: { opacity: 0.92, transform: [{ scale: 0.99 }] },
  studioCover: {
    height: COMPACT_COVER_HEIGHT,
    justifyContent: 'flex-end',
    padding: 12,
    overflow: 'hidden',
  },
  fill: { ...StyleSheet.absoluteFillObject },
  scrimTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 54,
    backgroundColor: 'rgba(20,16,14,0.28)',
  },
  scrimBottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 78,
    backgroundColor: 'rgba(20,16,14,0.45)',
  },
  studioName: {
    color: '#fff',
    fontSize: 15.5,
    lineHeight: 18,
    textShadowColor: 'rgba(0,0,0,0.55)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
  },
  studioHeart: { position: 'absolute', top: 10, right: 10 },
  studioMeta: {
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 12,
  },
  studioFoot: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    marginTop: 9,
    paddingTop: 9,
  },
  studioCta: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: 10,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  badgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  ratingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  starRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaStrong: { fontSize: 12.5, fontWeight: '600' },

  // near-card (default)
  nearCard: {
    borderRadius: NEAR_CARD_RADIUS,
    marginBottom: 12,
  },
  nearCardPressed: { opacity: 0.96, transform: [{ scale: 0.99 }] },
  nearCardInner: {
    borderWidth: 1,
    borderRadius: NEAR_CARD_RADIUS,
    overflow: 'hidden',
  },
  nearCardContent: {
    flexDirection: 'row',
    gap: 12,
    padding: 12,
  },
  thumb: { width: 96, alignSelf: 'flex-start' },
  nearBody: { flex: 1, minWidth: 0 },
  nearCat: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  catChip: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  nearCatText: { fontSize: 10, fontWeight: '700', letterSpacing: 1.1 },
  nearName: { fontSize: 18, lineHeight: 21, marginTop: 8, marginBottom: 6, letterSpacing: 0.1 },
  nearLoc: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  nearLocText: { fontSize: 12, flex: 1 },
  nearRate: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginTop: 6 },
  nearFoot: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    marginTop: 9,
    paddingTop: 9,
  },
  priceLbl: { fontSize: 9, letterSpacing: 1.2, textTransform: 'uppercase' },
  priceAmt: { fontSize: 16, marginTop: 1 },
  viewPill: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  heartBtn: {
    // Prototype `.heart`: white blurred circle with a soft shadow.
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1A1611',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
    elevation: 2,
  },
});
