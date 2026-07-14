import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  RefreshControl,
  StyleSheet,
  Switch,
  Animated,
  Easing,
} from "react-native";
import Svg, { Defs, LinearGradient, Stop, Rect } from "react-native-svg";
import { useRouter } from "expo-router";
import { useTheme, Button, IconSearch, IconSliders, IconMappin } from "@findemy/ui";
import { useLocation } from "@/stores/location";
import { useAuth } from "@/stores/auth";
import { useDiscoverTopRated, useInfiniteDiscover } from "@/hooks/useDiscover";
import { AcademyCard } from "@/components/academy/AcademyCard";
import { useSavedAcademies, useToggleSavedAcademy } from "@/hooks/useSaved";
import { ErrorState } from "@/components/common/ErrorState";
import { EmptyState } from "@/components/common/EmptyState";
import { BottomSheet } from "@/components/common/BottomSheet";
import { LocationSheet, type Area } from "@/components/booking/LocationSheet";
import { SkeletonLoader, SkeletonCard, SkeletonCompactCard } from "@/components/common/SkeletonLoader";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Location from "expo-location";
import type { Category } from "@findemy/types";

// Theme has no purple token (warm persimmon/marigold/jade/rose family only) —
// this is a one-off accent for the greeting name, not a shared design token.
const GREET_NAME_COLOR = "#6D4C9F";

const HERO_CARD_RADIUS = 26;

const CATEGORIES: { key: Category | undefined; label: string; icon: string }[] = [
  { key: undefined, label: "All",   icon: "✦" },
  { key: "music",   label: "Music", icon: "♪" },
  { key: "dance",   label: "Dance", icon: "✦" },
  { key: "arts",    label: "Arts",  icon: "✎" },
  { key: "yoga",    label: "Yoga",  icon: "◐" },
];

// Same glyphs as the category pills below, reused as small coloured chips in
// the hero card so the header pulls in the app's other category colours
// (jade/marigold/blue) instead of reading as one solid orange block.
const HERO_CATEGORY_GLYPHS: { key: "music" | "dance" | "arts" | "yoga"; icon: string }[] = [
  { key: "music", icon: "♪" },
  { key: "dance", icon: "✦" },
  { key: "arts",  icon: "✎" },
  { key: "yoga",  icon: "◐" },
];

const RATING_OPTIONS = [
  { label: "Any",  value: 0 },
  { label: "3+",   value: 3 },
  { label: "4+",   value: 4 },
];

const RADIUS_OPTIONS = [
  { label: "2 km",  value: 2 },
  { label: "5 km",  value: 5 },
  { label: "10 km", value: 10 },
];

function getGreetWord(): string {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}

// Width (px) of one repeat of the rainbow pattern. The gradient tiles via
// spreadMethod="repeat" in SVG's own pixel space (gradientUnits="userSpaceOnUse"),
// so translating the strip left by exactly one cycle and looping is seamless
// regardless of the container's actual width — no onLayout/measuring needed.
const RAINBOW_CYCLE = 90;

// Continuously-scrolling rainbow strip for the hero card footer. Flat
// rectangles + a repeating gradient only — no hand-drawn paths, so it can't
// end up looking "broken" the way the earlier illustration attempts did.
function RainbowBar() {
  const theme = useTheme();
  const shift = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(shift, { toValue: 1, duration: 3200, easing: Easing.linear, useNativeDriver: true })
    );
    loop.start();
    return () => loop.stop();
  }, [shift]);

  const translateX = shift.interpolate({ inputRange: [0, 1], outputRange: [0, -RAINBOW_CYCLE] });

  return (
    <View style={styles.rainbowClip} pointerEvents="none">
      <Animated.View style={{ width: "200%", height: "100%", transform: [{ translateX }] }}>
        <Svg width="100%" height="100%">
          <Defs>
            <LinearGradient
              id="rainbowGrad"
              gradientUnits="userSpaceOnUse"
              x1={0}
              y1={0}
              x2={RAINBOW_CYCLE}
              y2={0}
              spreadMethod="repeat"
            >
              <Stop offset={0} stopColor={theme.color.persimmon} />
              <Stop offset={0.25} stopColor={theme.color.marigold} />
              <Stop offset={0.5} stopColor={theme.color.jade} />
              <Stop offset={0.75} stopColor={GREET_NAME_COLOR} />
              <Stop offset={1} stopColor={theme.color.persimmon} />
            </LinearGradient>
          </Defs>
          <Rect x={0} y={0} width="100%" height="100%" fill="url(#rainbowGrad)" />
        </Svg>
      </Animated.View>
    </View>
  );
}

export default function DiscoverScreen() {
  const router = useRouter();
  const theme = useTheme();
  const user = useAuth((state) => state.user);
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
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
    q: searchQuery,
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

  const firstName = user?.name?.split(" ")[0] ?? "there";
  const initial = firstName[0]?.toUpperCase() ?? "S";
  const hasLocation = location.lat != null;
  const locLabel = areaLabel ?? user?.location ?? (hasLocation ? "Near you" : "Set your location");

  const pickArea = (area: Area) => {
    useLocation.getState().setLocation(area.lat, area.lng);
    setAreaLabel(area.name);
  };
  const useCurrentLocation = () => {
    setAreaLabel(null);
    requestLocation();
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.color.paper }} edges={["top"]}>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.color.persimmon} />
        }
        contentContainerStyle={{ paddingHorizontal: 18, paddingTop: 10, paddingBottom: 130 }}
        showsVerticalScrollIndicator={false}
        stickyHeaderIndices={[3]}
      >
        {/* top-bar: the slim app-identity strip most home screens have,
            sitting above the personal greeting rather than folded into it. */}
        <View style={styles.topBar}>
          <Text style={[styles.topBarBrand, { fontFamily: theme.font.serifItalic, color: theme.color.persimmon }]}>
            findemy
          </Text>
        </View>

        {/* greet-row: greeting on the left, profile avatar pinned top-right. */}
        <View style={styles.greetRow}>
          <Text style={[styles.greetName, { fontFamily: theme.font.serifItalic, color: theme.color.mist }]} numberOfLines={1}>
            {"Good " + getGreetWord().toLowerCase() + ", "}
            <Text style={{ fontFamily: theme.font.sansBold, color: GREET_NAME_COLOR }}>{firstName}</Text>
          </Text>
          <Pressable
            onPress={() => router.push("/(tabs)/profile")}
            style={[styles.avatar, { backgroundColor: theme.color.persimmon, borderColor: theme.color.hairline }]}
            accessibilityLabel="Go to profile"
            accessibilityRole="button"
          >
            <Text style={{ fontFamily: theme.font.serifItalic, fontSize: 17, color: "#fff" }}>{initial}</Text>
          </Pressable>
        </View>

        {/* hero: compact panel — a line of text, a colour row, a rainbow
            footer strip. Kept short on purpose so it no longer eats half the
            visible screen. */}
        <View style={[styles.heroCard, { backgroundColor: theme.color.paperWarm, borderColor: theme.color.hairline }]}>
          <View style={styles.heroTextRow}>
            <Text style={[styles.heroLine, { fontFamily: theme.font.serif, color: theme.color.inkSoft }]}>
              Discover your{" "}
            </Text>
            <Text style={[styles.hero, { fontFamily: theme.font.serif, color: theme.color.persimmon }]}>
              Artistry.
            </Text>
          </View>

          <View style={styles.heroGlyphRow}>
            {HERO_CATEGORY_GLYPHS.map((g) => (
              <View key={g.key} style={[styles.heroGlyphChip, { backgroundColor: theme.category[g.key].base }]}>
                <Text style={{ fontSize: 12, color: theme.category[g.key].accent }}>{g.icon}</Text>
              </View>
            ))}
          </View>

          <RainbowBar />
        </View>

        {/* search — sticky (index 3 in stickyHeaderIndices) so it stays reachable while scrolling */}
        <View style={[styles.stickySearchWrap, { backgroundColor: theme.color.paper }]}>
          <View style={[styles.search, { borderColor: theme.color.hairline, ...theme.shadow.md }]}>
            <IconSearch size={20} color={theme.color.persimmon} />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Find a mentor or studio…"
              placeholderTextColor={theme.color.whisper}
              style={{ flex: 1, fontFamily: theme.font.sans, fontSize: 15, color: theme.color.ink, paddingVertical: 0 }}
            />
            <Pressable
              style={[styles.filt, { backgroundColor: theme.color.paperWarm }]}
              accessibilityLabel="Filter academies"
              accessibilityRole="button"
              onPress={openFilters}
            >
              <IconSliders size={16} color={theme.color.inkSoft} />
              {isFiltered ? <View style={[styles.filtBadge, { backgroundColor: theme.color.persimmon }]} /> : null}
            </Pressable>
          </View>
        </View>

        {/* loc-row */}
        <View style={styles.locRow}>
          <Pressable style={[styles.locChip, { backgroundColor: theme.color.paperWarm }]} onPress={() => setShowLocation(true)}>
            <IconMappin size={14} color={theme.color.persimmon} />
            <Text style={{ fontFamily: theme.font.sansSemibold, fontSize: 13, color: theme.color.inkSoft }}>{locLabel}</Text>
          </Pressable>
        </View>

        {/* pills */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pills} style={{ marginHorizontal: -18 }}>
          {CATEGORIES.map((chip) => {
            const active = category === chip.key;
            return (
              <Pressable
                key={chip.label}
                onPress={() => setCategory(chip.key)}
                accessibilityRole="button"
                accessibilityLabel={`Filter by ${chip.label}`}
                style={[
                  styles.pill,
                  {
                    backgroundColor: active ? theme.color.ink : "#fff",
                    borderColor: active ? theme.color.ink : theme.color.hairline,
                  },
                ]}
              >
                <Text style={{ fontFamily: theme.font.sansSemibold, fontSize: 13, color: active ? "#fff" : theme.color.inkSoft }}>
                  {chip.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Top rated */}
        <View style={styles.sectionHead}>
          <View>
            <Text style={[styles.st, { fontFamily: theme.font.sansBold, color: theme.color.ink }]}>Top rated</Text>
            <Text style={[styles.sk, { fontFamily: theme.font.sansBold, color: theme.color.whisper }]}>HIGHEST RATED THIS WEEK</Text>
          </View>
        </View>
        {topRated.isLoading ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 12, gap: 14 }}>
            <SkeletonCompactCard />
            <SkeletonCompactCard />
          </ScrollView>
        ) : topRated.error ? (
          <ErrorState code={(topRated.error as any)?.code} onRetry={topRated.refetch} />
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -18 }} contentContainerStyle={{ paddingHorizontal: 18, gap: 14 }}>
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
            <Text style={[styles.st, { fontFamily: theme.font.sansBold, color: theme.color.ink }]}>Near you</Text>
            <Text style={[styles.sk, { fontFamily: theme.font.sansBold, color: theme.color.whisper }]}>STUDIOS CLOSE BY</Text>
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
            message={isFiltered || searchQuery ? "No academies match your filters." : "No academies found near you yet."}
            actionLabel={isFiltered ? "Clear filters" : undefined}
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
                style={{ alignItems: "center", paddingVertical: 16 }}
                accessibilityRole="button"
                accessibilityLabel="Load more academies"
              >
                <Text style={{ fontFamily: theme.font.sansSemibold, fontSize: 13, color: theme.color.persimmon }}>
                  {nearby.isFetchingNextPage ? "Loading…" : "Load more"}
                </Text>
              </Pressable>
            )}
          </View>
        )}
      </ScrollView>

      {/* Filter bottom sheet */}
      <BottomSheet visible={showFilters} onClose={() => setShowFilters(false)}>
        <View style={styles.sheetTitleRow}>
          <Text style={{ fontFamily: theme.font.serifItalic, fontSize: 28, color: theme.color.ink }}>Filters</Text>
          <Pressable onPress={() => setShowFilters(false)} accessibilityRole="button" accessibilityLabel="Close filters">
            <Text style={{ fontSize: 18, color: theme.color.mist }}>✕</Text>
          </Pressable>
        </View>

        <View style={[styles.filterRow, { borderBottomColor: theme.color.hairline }]}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: theme.font.sansSemibold, fontSize: 14, color: theme.color.ink }}>Online classes only</Text>
            <Text style={{ fontFamily: theme.font.sans, fontSize: 12, color: theme.color.mist, marginTop: 2 }}>
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
          <Text style={[styles.filterLabel, { fontFamily: theme.font.sansBold, color: theme.color.whisper }]}>MINIMUM RATING</Text>
          <View style={styles.chipGroup}>
            {RATING_OPTIONS.map((opt) => {
              const on = draftRating === opt.value;
              return (
                <Pressable
                  key={opt.value}
                  onPress={() => setDraftRating(opt.value)}
                  accessibilityRole="button"
                  accessibilityLabel={`${opt.value} stars and up`}
                  style={[styles.optChip, { backgroundColor: on ? theme.color.persimmon : "#fff", borderColor: on ? theme.color.persimmon : theme.color.hairline }]}
                >
                  <Text style={{ fontFamily: theme.font.sansSemibold, fontSize: 14, color: on ? "#fff" : theme.color.inkSoft }}>
                    {opt.value > 0 ? `★ ${opt.label}` : opt.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={[styles.filterSection, { borderBottomColor: theme.color.hairline, opacity: hasLocation ? 1 : 0.4 }]}>
          <Text style={[styles.filterLabel, { fontFamily: theme.font.sansBold, color: theme.color.whisper }]}>
            DISTANCE {!hasLocation ? "(enable location)" : ""}
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
                  style={[styles.optChip, { backgroundColor: on ? theme.color.persimmon : "#fff", borderColor: on ? theme.color.persimmon : theme.color.hairline }]}
                >
                  <Text style={{ fontFamily: theme.font.sansSemibold, fontSize: 14, color: on ? "#fff" : theme.color.inkSoft }}>
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.sheetBtns}>
          <View style={{ flex: 1 }}>
            <Button block variant="ghost" onPress={clearFilters}>Clear</Button>
          </View>
          <View style={{ flex: 2 }}>
            <Button block onPress={applyFilters}>Apply filters</Button>
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
  topBar: { marginTop: 2 },
  topBarBrand: { fontSize: 15, letterSpacing: 0.2 },
  greetRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    marginTop: 10,
  },
  greetName: {
    flexShrink: 1,
    fontSize: 17,
    lineHeight: 24,
    letterSpacing: 0.1,
  },
  // hero: its own flat-color section, set apart from the plain greeting row
  // above by background + border alone — no gradients, no illustration. Kept
  // deliberately short (small padding, single text row) so it reads as an
  // accent strip rather than eating half the screen.
  heroCard: {
    borderRadius: HERO_CARD_RADIUS,
    borderWidth: 1,
    padding: 14,
    marginTop: 12,
    overflow: "hidden",
  },
  heroTextRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "flex-end" },
  heroLine: { fontSize: 19, lineHeight: 24 },
  hero: { fontSize: 22, lineHeight: 24 },
  heroGlyphRow: {
    flexDirection: "row",
    gap: 6,
    marginTop: 10,
  },
  heroGlyphChip: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  rainbowClip: {
    height: 3,
    borderRadius: 1.5,
    overflow: "hidden",
    marginTop: 12,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  search: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 13,
    marginTop: 14,
    marginBottom: 10,
  },
  filt: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  filtBadge: {
    position: "absolute",
    top: -2,
    right: -2,
    width: 9,
    height: 9,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: "#fff",
  },
  locRow: { flexDirection: "row", marginBottom: 8 },
  locChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    borderRadius: 999,
    paddingHorizontal: 15,
    paddingVertical: 9,
  },
  pills: {
    gap: 10,
    paddingHorizontal: 18,
    paddingVertical: 6,
  },
  pill: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 15,
    paddingVertical: 9,
  },
  sectionHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginTop: 22,
    marginBottom: 12,
  },
  st: { fontSize: 19, letterSpacing: -0.3 },
  sk: { fontSize: 10, letterSpacing: 1.8, marginTop: 4 },
  // Filter sheet
  sheetTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
    marginBottom: 8,
  },
  filterRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
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
    flexDirection: "row",
    gap: 8,
  },
  optChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1.5,
  },
  sheetBtns: {
    flexDirection: "row",
    gap: 10,
    marginTop: 22,
  },
});
