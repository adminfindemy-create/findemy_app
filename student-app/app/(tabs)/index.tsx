import { AcademyCard } from '@/components/academy/AcademyCard';
import { type Area, LocationSheet } from '@/components/booking/LocationSheet';
import { BottomSheet } from '@/components/common/BottomSheet';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { SkeletonCard, SkeletonCompactCard } from '@/components/common/SkeletonLoader';
import { useDiscoverTopRated, useInfiniteDiscover } from '@/hooks/useDiscover';
import { useMeStats } from '@/hooks/useMeStats';
import { useSavedAcademies, useToggleSavedAcademy } from '@/hooks/useSaved';
import { formatRupees } from '@/lib/format';
import { useAuth } from '@/stores/auth';
import { useLocation } from '@/stores/location';
import type { Category } from '@findemy/types';
import {
  Button,
  IconBell,
  IconCal,
  IconChevR,
  IconMappin,
  IconSearch,
  IconSliders,
  useTheme,
} from '@findemy/ui';
import { format } from 'date-fns';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import type React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';

// Theme has no purple token (warm persimmon/marigold/jade/rose family only) —
// this is a one-off accent for the greeting name, not a shared design token.
const GREET_NAME_COLOR = '#6D4C9F';

const HERO_CARD_RADIUS = 26;

const CATEGORIES: { key: Category | undefined; label: string; icon: string }[] = [
  { key: undefined, label: 'All', icon: '✦' },
  { key: 'music', label: 'Music', icon: '♪' },
  { key: 'dance', label: 'Dance', icon: '✦' },
  { key: 'arts', label: 'Arts', icon: '✎' },
  { key: 'yoga', label: 'Yoga', icon: '◐' },
];

// Same glyphs as the category pills below, reused as small coloured chips in
// the hero card so the header pulls in the app's other category colours
// (jade/marigold/blue) instead of reading as one solid orange block.
const HERO_CATEGORY_GLYPHS: { key: 'music' | 'dance' | 'arts' | 'yoga'; icon: string }[] = [
  { key: 'music', icon: '♪' },
  { key: 'dance', icon: '✦' },
  { key: 'arts', icon: '✎' },
  { key: 'yoga', icon: '◐' },
];

const RATING_OPTIONS = [
  { label: 'Any', value: 0 },
  { label: '3+', value: 3 },
  { label: '4+', value: 4 },
];

const RADIUS_OPTIONS = [
  { label: '2 km', value: 2 },
  { label: '5 km', value: 5 },
  { label: '10 km', value: 10 },
];

function getGreetWord(): string {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}

// One repeat of the rainbow pattern is RAINBOW_CYCLE px wide. Rather than
// relying on SVG's spreadMethod="repeat" (not exposed in this react-native-svg
// version's types), the cycle's stops are baked RAINBOW_CYCLES times across a
// single wide Rect; translating left by exactly one cycle and looping reads
// as an endless scroll, and the extra baked copies guarantee the visible clip
// never runs out of content mid-translate on any phone width.
const RAINBOW_CYCLE = 100;
const RAINBOW_CYCLES = 6;
const RAINBOW_WIDTH = RAINBOW_CYCLE * RAINBOW_CYCLES;

// Continuously-scrolling rainbow strip for the hero card footer. Flat
// rectangles + a repeating gradient only — no hand-drawn paths, so it can't
// end up looking "broken" the way the earlier illustration attempts did.
function RainbowBar() {
  const theme = useTheme();
  const shift = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(shift, {
        toValue: 1,
        duration: 3200,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [shift]);

  const translateX = shift.interpolate({ inputRange: [0, 1], outputRange: [0, -RAINBOW_CYCLE] });

  const hues = [theme.color.persimmon, theme.color.marigold, theme.color.jade, GREET_NAME_COLOR];
  const stops: { offset: number; color: string }[] = [];
  for (let cycle = 0; cycle < RAINBOW_CYCLES; cycle++) {
    hues.forEach((color, i) => {
      stops.push({ offset: (cycle + i / hues.length) / RAINBOW_CYCLES, color });
    });
  }
  stops.push({ offset: 1, color: hues[0] });

  return (
    <View style={styles.rainbowClip} pointerEvents="none">
      <Animated.View style={{ transform: [{ translateX }] }}>
        <Svg width={RAINBOW_WIDTH} height={3}>
          <Defs>
            <LinearGradient id="rainbowGrad" x1="0" y1="0" x2="1" y2="0">
              {stops.map((s, i) => (
                <Stop key={i} offset={s.offset} stopColor={s.color} />
              ))}
            </LinearGradient>
          </Defs>
          <Rect x={0} y={0} width={RAINBOW_WIDTH} height={3} fill="url(#rainbowGrad)" />
        </Svg>
      </Animated.View>
    </View>
  );
}

// M6.2: dashboard rollup — next class / pending fees / unread notices, sourced
// from GET /me/stats (extended in this slice). Purely additive to the
// discovery-first home tab: best-effort, so a loading/errored stats fetch
// renders nothing rather than disturbing the hero/search/category sections
// above and below it (same "never blocks" posture as the Classes tab's
// pending-sessions feed).
function DashboardTile({
  icon,
  iconBg,
  iconColor,
  label,
  value,
  badge,
  onPress,
}: {
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  label: string;
  value: string;
  badge?: number;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        dashStyles.tile,
        { backgroundColor: theme.color.paperWarm, borderColor: theme.color.hairline },
        pressed && { transform: [{ scale: 0.98 }] },
      ]}
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${value}`}
    >
      <View style={[dashStyles.tileIconWrap, { backgroundColor: iconBg }]}>
        {icon}
        {badge ? (
          <View
            style={[
              dashStyles.tileBadge,
              { backgroundColor: theme.color.persimmon, borderColor: theme.color.paperWarm },
            ]}
          >
            <Text style={{ fontSize: 9, fontFamily: theme.font.sansBold, color: '#fff' }}>
              {badge > 9 ? '9+' : badge}
            </Text>
          </View>
        ) : null}
      </View>
      <Text
        style={[
          dashStyles.tileLabel,
          { fontFamily: theme.font.sansBold, color: theme.color.whisper },
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
      <Text
        style={[
          dashStyles.tileValue,
          { fontFamily: theme.font.sansSemibold, color: theme.color.ink },
        ]}
        numberOfLines={2}
      >
        {value}
      </Text>
    </Pressable>
  );
}

function DashboardSummary() {
  const theme = useTheme();
  const router = useRouter();
  const { data } = useMeStats();

  // Best-effort: while loading or on error, render nothing rather than a
  // skeleton — this row is a bonus at-a-glance summary, not core discovery.
  if (!data) return null;

  const nextClassValue = data.next_class
    ? `${data.next_class.batch_title} · ${format(new Date(data.next_class.start_at), 'EEE, d MMM · h:mm a')}`
    : 'No classes scheduled';

  const feesValue =
    data.pending_fees_count > 0
      ? `${data.pending_fees_count} due · ${formatRupees(data.pending_fees_amount_paise)}`
      : 'All caught up';

  const noticesValue =
    data.unread_notice_count > 0 ? `${data.unread_notice_count} unread` : 'No new notices';

  return (
    <View style={dashStyles.row}>
      <DashboardTile
        icon={<IconCal size={16} color={theme.color.jade} />}
        iconBg={theme.color.jadeSoft}
        iconColor={theme.color.jade}
        label="NEXT CLASS"
        value={nextClassValue}
        onPress={() => router.push('/(tabs)/classes')}
      />
      <DashboardTile
        icon={
          <Text
            style={{
              fontSize: 14,
              color: data.pending_fees_count > 0 ? theme.color.rose : theme.color.jade,
            }}
          >
            ₹
          </Text>
        }
        iconBg={data.pending_fees_count > 0 ? theme.color.roseSoft : theme.color.jadeSoft}
        iconColor={data.pending_fees_count > 0 ? theme.color.rose : theme.color.jade}
        label="PENDING FEES"
        value={feesValue}
        onPress={() => router.push('/(tabs)/classes')}
      />
      <DashboardTile
        icon={<IconBell size={16} color={theme.color.marigold} />}
        iconBg={theme.color.marigoldSoft}
        iconColor={theme.color.marigold}
        label="NOTICES"
        value={noticesValue}
        badge={data.unread_notice_count}
        onPress={() => router.push('/notifications')}
      />
    </View>
  );
}

const dashStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  tile: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
  },
  tileIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  tileBadge: {
    position: 'absolute',
    top: -4,
    right: -6,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  tileLabel: {
    fontSize: 9,
    letterSpacing: 1,
    marginBottom: 3,
  },
  tileValue: {
    fontSize: 12.5,
    lineHeight: 16,
  },
});

export default function DiscoverScreen() {
  const router = useRouter();
  const theme = useTheme();
  const user = useAuth((state) => state.user);
  const location = useLocation();
  const [category, setCategory] = useState<Category | undefined>();
  const [refreshing, setRefreshing] = useState(false);
  const [showLocation, setShowLocation] = useState(false);
  const [areaLabel, setAreaLabel] = useState<string | null>(null);

  // Applied filters
  const [filterOnline, setFilterOnline] = useState(false);
  const [filterMinRating, setFilterMinRating] = useState(0);
  const [filterRadius, setFilterRadius] = useState(0);

  // Draft filters (inside the sheet before Apply)
  const [showFilters, setShowFilters] = useState(false);
  const [draftOnline, setDraftOnline] = useState(false);
  const [draftRating, setDraftRating] = useState(0);
  const [draftRadius, setDraftRadius] = useState(0);

  const isFiltered = filterOnline || filterMinRating > 0 || filterRadius > 0;

  const topRated = useDiscoverTopRated(location);
  const nearby = useInfiniteDiscover({
    ...location,
    category,
    online: filterOnline || undefined,
    minRating: filterMinRating || undefined,
    radius: filterRadius || undefined,
  });
  const { data: savedData } = useSavedAcademies();
  const toggleSave = useToggleSavedAcademy();
  const savedIds = new Set(((savedData as any)?.items ?? []).map((academy: any) => academy.id));
  const nearbyItems = nearby.data?.pages.flatMap((page) => page.items) ?? [];

  const requestLocation = useCallback(async () => {
    try {
      const permissionResult = await Location.requestForegroundPermissionsAsync();
      useLocation.getState().setPermission(permissionResult.status as any);
      if (!permissionResult.granted) return;
      const position = await Location.getCurrentPositionAsync({});
      useLocation.getState().setLocation(position.coords.latitude, position.coords.longitude);
    } catch {
      // Device location services disabled — silently skip
    }
  }, []);

  useEffect(() => {
    if (location.lat != null) return;
    requestLocation();
  }, [location.lat, requestLocation]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    nearby.refetch().finally(() => setRefreshing(false));
  }, [nearby]);

  const openFilters = () => {
    setDraftOnline(filterOnline);
    setDraftRating(filterMinRating);
    setDraftRadius(filterRadius);
    setShowFilters(true);
  };

  const applyFilters = () => {
    setFilterOnline(draftOnline);
    setFilterMinRating(draftRating);
    setFilterRadius(draftRadius);
    setShowFilters(false);
  };

  const clearFilters = () => {
    setDraftOnline(false);
    setDraftRating(0);
    setDraftRadius(0);
    setFilterOnline(false);
    setFilterMinRating(0);
    setFilterRadius(0);
    setShowFilters(false);
  };

  const firstName = user?.name?.split(' ')[0] ?? 'there';
  const initial = firstName[0]?.toUpperCase() ?? 'S';
  const hasLocation = location.lat != null;
  const locLabel = areaLabel ?? user?.location ?? (hasLocation ? 'Near you' : 'Set your location');

  const pickArea = (area: Area) => {
    useLocation.getState().setLocation(area.lat, area.lng);
    setAreaLabel(area.name);
  };
  const useCurrentLocation = () => {
    setAreaLabel(null);
    requestLocation();
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.color.paper }} edges={['top']}>
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.color.persimmon}
          />
        }
        contentContainerStyle={{ paddingHorizontal: 18, paddingTop: 14, paddingBottom: 130 }}
        showsVerticalScrollIndicator={false}
        stickyHeaderIndices={[2]}
      >
        {/* brand-bar: plain text row, scrolls away with the rest of the
            content — not a fixed app-bar, no colour band, no gradient. */}
        <View style={styles.brandBar}>
          <Text
            style={[
              styles.brandName,
              { fontFamily: theme.font.serifItalic, color: theme.color.persimmon },
            ]}
          >
            findemy
          </Text>
          <Pressable
            onPress={() => router.push('/(tabs)/profile')}
            style={[
              styles.avatar,
              { backgroundColor: theme.color.persimmon, borderColor: theme.color.hairline },
            ]}
            accessibilityLabel="Go to profile"
            accessibilityRole="button"
          >
            <Text style={{ fontFamily: theme.font.serifItalic, fontSize: 17, color: '#fff' }}>
              {initial}
            </Text>
          </Pressable>
        </View>

        {/* hero: greeting + tagline share one card, with the location picker
            as a circular icon pinned top-right (was its own row below the
            search bar — same onPress, no separate section needed for it).
            Headline sizes now pull straight from the app's own type ramp
            (theme.type.h1 / .hero) instead of one-off pixel values. */}
        <View
          style={[
            styles.heroCard,
            { backgroundColor: theme.color.paperWarm, borderColor: theme.color.hairline },
          ]}
        >
          <View style={styles.heroTopRow}>
            <View style={{ flex: 1 }}>
              <Text
                style={[
                  styles.heroKicker,
                  { fontFamily: theme.font.sansBold, color: theme.color.whisper },
                ]}
              >
                {`GOOD ${getGreetWord().toUpperCase()}`}
              </Text>
              <Text
                style={[
                  styles.heroGreet,
                  { fontFamily: theme.font.serifItalic, color: theme.color.inkSoft },
                ]}
                numberOfLines={1}
              >
                {'Hey '}
                <Text style={{ color: GREET_NAME_COLOR }}>{firstName}</Text>
              </Text>
            </View>

            <Pressable
              onPress={() => setShowLocation(true)}
              style={[styles.heroLocBtn, { backgroundColor: theme.color.persimmonSoft }]}
              accessibilityLabel={`Change location — ${locLabel}`}
              accessibilityRole="button"
            >
              <View style={[styles.heroLocPin, { backgroundColor: theme.color.persimmon }]}>
                <IconMappin size={9} color="#fff" />
              </View>
              <Text
                style={[
                  styles.heroLocLabel,
                  { fontFamily: theme.font.sansSemibold, color: theme.color.persimmonDeep },
                ]}
                numberOfLines={1}
              >
                {locLabel}
              </Text>
              <View style={{ transform: [{ rotate: '90deg' }] }}>
                <IconChevR size={9} color={theme.color.persimmonDeep} />
              </View>
            </Pressable>
          </View>

          <View style={styles.heroTextRow}>
            <Text
              style={[
                styles.heroLine,
                { fontFamily: theme.font.serif, color: theme.color.inkSoft },
              ]}
            >
              Discover your{' '}
            </Text>
            <Text
              style={[styles.hero, { fontFamily: theme.font.serif, color: theme.color.persimmon }]}
            >
              Artistry.
            </Text>
          </View>

          <View style={styles.heroGlyphRow}>
            {HERO_CATEGORY_GLYPHS.map((g) => (
              <View
                key={g.key}
                style={[styles.heroGlyphChip, { backgroundColor: theme.category[g.key].base }]}
              >
                <Text style={{ fontSize: 13, color: theme.category[g.key].accent }}>{g.icon}</Text>
              </View>
            ))}
          </View>

          <RainbowBar />
        </View>

        {/* M6.2: dashboard rollup — next class / pending fees / unread
            notices, purely additive below the hero card. Never renders
            anything while loading/erroring, so it can't disturb the
            discovery flow beneath it. */}
        <DashboardSummary />

        {/* search — sticky (index 1 in stickyHeaderIndices) so it stays
            reachable while scrolling. This is now a static-looking trigger,
            not a real input: tapping it pushes /search, which has its own
            focused, auto-focused input and live debounced results — the
            pattern most apps use rather than typing inline here. */}
        <View style={[styles.stickySearchWrap, { backgroundColor: theme.color.paper }]}>
          <Pressable
            style={[styles.search, { backgroundColor: theme.color.paperWarm }, theme.shadow.sm]}
            onPress={() => router.push('/search')}
            accessibilityRole="button"
            accessibilityLabel="Search academies"
          >
            <IconSearch size={17} color={theme.color.persimmon} />
            <Text
              style={{
                flex: 1,
                fontFamily: theme.font.sans,
                fontSize: 14,
                color: theme.color.whisper,
              }}
            >
              Find a mentor or studio…
            </Text>
            <Pressable
              style={[styles.filt, { backgroundColor: '#fff' }]}
              accessibilityLabel="Filter academies"
              accessibilityRole="button"
              onPress={openFilters}
            >
              <IconSliders size={14} color={theme.color.inkSoft} />
              {isFiltered ? (
                <View style={[styles.filtBadge, { backgroundColor: theme.color.persimmon }]} />
              ) : null}
            </Pressable>
          </Pressable>
        </View>

        {/* tabs: underline style (à la Linkit) instead of filled pills — a
            bottom hairline turns the row into its own "section", the active
            tab gets a coloured underline, and it's still horizontally
            scrollable for the full category list. */}
        <View style={[styles.tabSection, { borderBottomColor: theme.color.hairline }]}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabRow}
          >
            {CATEGORIES.map((chip) => {
              const active = category === chip.key;
              return (
                <Pressable
                  key={chip.label}
                  onPress={() => setCategory(chip.key)}
                  accessibilityRole="button"
                  accessibilityLabel={`Filter by ${chip.label}`}
                  style={[styles.tab, active && { borderBottomColor: theme.color.persimmon }]}
                >
                  <Text
                    style={{
                      fontFamily: active ? theme.font.sansBold : theme.font.sansSemibold,
                      fontSize: 14,
                      color: active ? theme.color.persimmon : theme.color.mist,
                    }}
                  >
                    {chip.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* Top rated */}
        <View style={styles.sectionHead}>
          <View>
            <Text style={[styles.st, { fontFamily: theme.font.sansBold, color: theme.color.ink }]}>
              Top rated
            </Text>
            <Text
              style={[styles.sk, { fontFamily: theme.font.sansBold, color: theme.color.whisper }]}
            >
              HIGHEST RATED THIS WEEK
            </Text>
          </View>
        </View>
        {topRated.isLoading ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingRight: 12, gap: 14 }}
          >
            <SkeletonCompactCard />
            <SkeletonCompactCard />
          </ScrollView>
        ) : topRated.error ? (
          <ErrorState code={(topRated.error as any)?.code} onRetry={topRated.refetch} />
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ marginHorizontal: -18 }}
            contentContainerStyle={{ paddingHorizontal: 18, gap: 14 }}
          >
            {(topRated.data?.items ?? []).map((item: any) => (
              <AcademyCard
                key={item.id}
                variant="compact"
                academy={item}
                onPress={() => router.push(`/academy/${item.id}`)}
                isSaved={savedIds.has(item.id)}
                onToggleSave={(id) => toggleSave.mutate(id)}
              />
            ))}
          </ScrollView>
        )}

        {/* Near you */}
        <View style={styles.sectionHead}>
          <View>
            <Text style={[styles.st, { fontFamily: theme.font.sansBold, color: theme.color.ink }]}>
              Near you
            </Text>
            <Text
              style={[styles.sk, { fontFamily: theme.font.sansBold, color: theme.color.whisper }]}
            >
              STUDIOS CLOSE BY
            </Text>
          </View>
        </View>
        {nearby.isLoading ? (
          <View style={{ gap: 12 }}>
            <SkeletonCard />
            <SkeletonCard />
          </View>
        ) : nearby.error ? (
          <ErrorState code={(nearby.error as any)?.code} onRetry={nearby.refetch} />
        ) : nearbyItems.length === 0 ? (
          <EmptyState
            message={
              isFiltered ? 'No academies match your filters.' : 'No academies found near you yet.'
            }
            actionLabel={isFiltered ? 'Clear filters' : undefined}
            onAction={isFiltered ? clearFilters : undefined}
          />
        ) : (
          <View>
            {nearbyItems.map((item: any) => (
              <AcademyCard
                key={item.id}
                academy={item}
                onPress={() => router.push(`/academy/${item.id}`)}
                isSaved={savedIds.has(item.id)}
                onToggleSave={(id) => toggleSave.mutate(id)}
              />
            ))}
            {nearby.hasNextPage && (
              <Pressable
                onPress={() => nearby.fetchNextPage()}
                style={{ alignItems: 'center', paddingVertical: 16 }}
                accessibilityRole="button"
                accessibilityLabel="Load more academies"
              >
                <Text
                  style={{
                    fontFamily: theme.font.sansSemibold,
                    fontSize: 13,
                    color: theme.color.persimmon,
                  }}
                >
                  {nearby.isFetchingNextPage ? 'Loading…' : 'Load more'}
                </Text>
              </Pressable>
            )}
          </View>
        )}
      </ScrollView>

      {/* Filter bottom sheet */}
      <BottomSheet visible={showFilters} onClose={() => setShowFilters(false)}>
        <View style={styles.sheetTitleRow}>
          <Text
            style={{ fontFamily: theme.font.serifItalic, fontSize: 28, color: theme.color.ink }}
          >
            Filters
          </Text>
          <Pressable
            onPress={() => setShowFilters(false)}
            accessibilityRole="button"
            accessibilityLabel="Close filters"
          >
            <Text style={{ fontSize: 18, color: theme.color.mist }}>✕</Text>
          </Pressable>
        </View>

        <View style={[styles.filterRow, { borderBottomColor: theme.color.hairline }]}>
          <View style={{ flex: 1 }}>
            <Text
              style={{ fontFamily: theme.font.sansSemibold, fontSize: 14, color: theme.color.ink }}
            >
              Online classes only
            </Text>
            <Text
              style={{
                fontFamily: theme.font.sans,
                fontSize: 12,
                color: theme.color.mist,
                marginTop: 2,
              }}
            >
              Show academies offering online sessions
            </Text>
          </View>
          <Switch
            value={draftOnline}
            onValueChange={setDraftOnline}
            trackColor={{ false: theme.color.hairline, true: theme.color.persimmon }}
            thumbColor="#fff"
          />
        </View>

        <View style={[styles.filterSection, { borderBottomColor: theme.color.hairline }]}>
          <Text
            style={[
              styles.filterLabel,
              { fontFamily: theme.font.sansBold, color: theme.color.whisper },
            ]}
          >
            MINIMUM RATING
          </Text>
          <View style={styles.chipGroup}>
            {RATING_OPTIONS.map((opt) => {
              const on = draftRating === opt.value;
              return (
                <Pressable
                  key={opt.value}
                  onPress={() => setDraftRating(opt.value)}
                  accessibilityRole="button"
                  accessibilityLabel={`${opt.value} stars and up`}
                  style={[
                    styles.optChip,
                    {
                      backgroundColor: on ? theme.color.persimmon : '#fff',
                      borderColor: on ? theme.color.persimmon : theme.color.hairline,
                    },
                  ]}
                >
                  <Text
                    style={{
                      fontFamily: theme.font.sansSemibold,
                      fontSize: 14,
                      color: on ? '#fff' : theme.color.inkSoft,
                    }}
                  >
                    {opt.value > 0 ? `★ ${opt.label}` : opt.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View
          style={[
            styles.filterSection,
            { borderBottomColor: theme.color.hairline, opacity: hasLocation ? 1 : 0.4 },
          ]}
        >
          <Text
            style={[
              styles.filterLabel,
              { fontFamily: theme.font.sansBold, color: theme.color.whisper },
            ]}
          >
            DISTANCE {!hasLocation ? '(enable location)' : ''}
          </Text>
          <View style={styles.chipGroup}>
            {RADIUS_OPTIONS.map((opt) => {
              const on = draftRadius === opt.value;
              return (
                <Pressable
                  key={opt.value}
                  onPress={() => hasLocation && setDraftRadius(on ? 0 : opt.value)}
                  accessibilityRole="button"
                  accessibilityLabel={`Within ${opt.value} km`}
                  style={[
                    styles.optChip,
                    {
                      backgroundColor: on ? theme.color.persimmon : '#fff',
                      borderColor: on ? theme.color.persimmon : theme.color.hairline,
                    },
                  ]}
                >
                  <Text
                    style={{
                      fontFamily: theme.font.sansSemibold,
                      fontSize: 14,
                      color: on ? '#fff' : theme.color.inkSoft,
                    }}
                  >
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.sheetBtns}>
          <View style={{ flex: 1 }}>
            <Button block variant="ghost" onPress={clearFilters}>
              Clear
            </Button>
          </View>
          <View style={{ flex: 2 }}>
            <Button block onPress={applyFilters}>
              Apply filters
            </Button>
          </View>
        </View>
      </BottomSheet>

      <LocationSheet
        visible={showLocation}
        onClose={() => setShowLocation(false)}
        onPickArea={pickArea}
        onUseCurrent={useCurrentLocation}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // brand-bar: plain scrolling row — "findemy" wordmark + profile avatar,
  // aligned. No fixed positioning, no colour band.
  brandBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  brandName: { fontSize: 24, letterSpacing: 0.2 },
  // hero: greeting + tagline share one card. Headline kept modest (not the
  // app's h1/hero scale) so it reads as one balanced element among the
  // greeting, glyph row, and rainbow bar rather than dominating the card.
  heroCard: {
    borderRadius: HERO_CARD_RADIUS,
    borderWidth: 1,
    padding: 18,
    overflow: 'hidden',
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 14,
  },
  heroKicker: { fontSize: 10, letterSpacing: 1.6, marginBottom: 5 },
  heroGreet: { fontSize: 19, lineHeight: 22 },
  heroLocBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 999,
    paddingVertical: 4,
    paddingLeft: 5,
    paddingRight: 8,
    maxWidth: 110,
  },
  heroLocPin: {
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroLocLabel: { fontSize: 10.5, flexShrink: 1 },
  heroTextRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline' },
  heroLine: { fontSize: 22, lineHeight: 26 },
  hero: { fontSize: 26, lineHeight: 30 },
  heroGlyphRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
  },
  heroGlyphChip: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rainbowClip: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
    marginTop: 14,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stickySearchWrap: {
    paddingTop: 14,
    paddingBottom: 10,
  },
  // search: flat fill + soft shadow instead of white+hairline+heavy-shadow —
  // sleeker, closer to how most modern search bars are styled. Background is
  // set at the call site (paperWarm) so it reads against the white page and
  // the white filter button pops inside it.
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  filt: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  filtBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 9,
    height: 9,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: '#fff',
  },
  // tabs: underline style — a full-bleed bottom hairline turns the row into
  // its own section, the active tab gets a coloured underline, and it stays
  // horizontally scrollable.
  tabSection: {
    marginHorizontal: -18,
    marginTop: 6,
    borderBottomWidth: 1,
    marginBottom: 4,
  },
  tabRow: {
    gap: 22,
    paddingHorizontal: 18,
  },
  tab: {
    paddingBottom: 11,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  sectionHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 22,
    marginBottom: 12,
  },
  st: { fontSize: 19, letterSpacing: -0.3 },
  sk: { fontSize: 10, letterSpacing: 1.8, marginTop: 4 },
  // Filter sheet
  sheetTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    marginBottom: 8,
  },
  filterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  filterSection: {
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  filterLabel: {
    fontSize: 10,
    letterSpacing: 1.4,
    marginBottom: 10,
  },
  chipGroup: {
    flexDirection: 'row',
    gap: 8,
  },
  optChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1.5,
  },
  sheetBtns: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 22,
  },
});
