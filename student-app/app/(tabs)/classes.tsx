import React from "react";
import { View, Text, ScrollView, Pressable, RefreshControl, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useTheme, BlockPrintCover, Icon, Button } from "@findemy/ui";
import { SafeAreaView } from "react-native-safe-area-context";
import { format, differenceInCalendarMonths } from "date-fns";
import type { ClassItem } from "@findemy/types";
import { useClasses } from "@/hooks/useClasses";
import { SkeletonLoader } from "@/components/SkeletonLoader";
import { ErrorState } from "@/components/ErrorState";

const DAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function inr(paise?: number | null): string {
  const n = Math.round((paise ?? 0) / 100);
  const s = String(n);
  if (s.length <= 3) return `₹${s}`;
  const last3 = s.slice(-3);
  const rest = s.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ",");
  return `₹${rest},${last3}`;
}

function timeOf(t?: string) {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${ampm}`;
}

function scheduleSummary(timings?: { day_of_week: number; start_time?: string }[]) {
  if (!timings?.length) return "";
  const days = [...new Set(timings.map((t) => t.day_of_week))].sort().map((d) => DAY_SHORT[d]).join("·");
  return `${days}${timings[0]?.start_time ? ` · ${timeOf(timings[0].start_time)}` : ""}`;
}

// Prototype past row shows how long the class ran ("4 months").
function durationLabel(startIso?: string, endIso?: string) {
  if (!startIso || !endIso) return undefined;
  const start = new Date(startIso);
  const end = new Date(endIso);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return undefined;
  const months = Math.max(1, differenceInCalendarMonths(end, start));
  return `${months} month${months === 1 ? "" : "s"}`;
}

function RowCard({
  category,
  title,
  badge,
  subText,
  footLeft,
  footRight,
  footRightJade,
  onPress,
}: {
  category: string;
  title: string;
  badge: { label: string; bg: string; fg: string };
  subText: string;
  footLeft: string;
  footRight?: string;
  footRightJade?: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: "#fff", borderColor: theme.color.hairline, ...theme.shadow.sm },
        pressed && { transform: [{ scale: 0.978 }] },
      ]}
    >
      <BlockPrintCover category={category as any} variant={1} height={74} hideLetter style={styles.thumb} />
      <View style={styles.body}>
        <Text style={[styles.ttl, { fontFamily: theme.font.sansBold, color: theme.color.ink }]} numberOfLines={1}>
          {title}
        </Text>
        <View style={styles.subRow}>
          <View style={[styles.badge, { backgroundColor: badge.bg }]}>
            <Text style={[styles.badgeText, { fontFamily: theme.font.sansBold, color: badge.fg }]}>{badge.label}</Text>
          </View>
          <Text style={[styles.sub, { fontFamily: theme.font.sansMedium, color: theme.color.mist }]} numberOfLines={1}>
            {`· ${subText}`}
          </Text>
        </View>
        <View style={styles.foot}>
          <Text style={[styles.footText, { fontFamily: theme.font.sansMedium, color: theme.color.mist }]} numberOfLines={1}>
            {footLeft}
          </Text>
          {footRight ? (
            <Text
              style={[styles.price, { fontFamily: theme.font.sansBold, color: footRightJade ? theme.color.jade : theme.color.ink }]}
            >
              {footRight}
            </Text>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

export default function ClassesScreen() {
  const theme = useTheme();
  const router = useRouter();
  const classesQ = useClasses();

  const active = (classesQ.data?.active ?? []) as ClassItem[];
  const past = (classesQ.data?.past ?? []) as ClassItem[];

  const isLoading = classesQ.isLoading;
  const isError = classesQ.isError;
  const refetch = () => {
    classesQ.refetch();
  };
  const fetching = classesQ.isFetching;

  const hasAny = active.length > 0 || past.length > 0;

  const SectionLabel = ({ children }: { children: string }) => (
    <Text style={[styles.sectionLabel, { fontFamily: theme.font.sansBold, color: theme.color.whisper }]}>{children}</Text>
  );

  const coachFirst = (name?: string) => (name ?? "").split(" ")[0];
  const footFor = (c: ClassItem) => [c.academy_name, coachFirst(c.coach_name)].filter(Boolean).join(" · ");

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.color.paper }} edges={["top"]}>
      <View style={styles.head}>
        <View style={[styles.hlWrap, { backgroundColor: theme.color.persimmonSoft }]}>
          <Text style={{ fontFamily: theme.font.serif, fontSize: 40, color: theme.color.ink, letterSpacing: -0.5 }}>
            My Classes.
          </Text>
        </View>
      </View>

      {isLoading ? (
        <View style={{ padding: 20, gap: 12 }}>
          <SkeletonLoader height={102} borderRadius={20} />
          <SkeletonLoader height={102} borderRadius={20} />
        </View>
      ) : isError ? (
        <ErrorState onRetry={refetch} />
      ) : !hasAny ? (
        <View style={styles.empty}>
          <View style={[styles.emptyIcon, { backgroundColor: theme.color.paperWarm }]}>
            <Icon name="sparkle" size={28} color={theme.color.whisper} />
          </View>
          <Text style={{ fontFamily: theme.font.serif, fontSize: 25, color: theme.color.ink, marginBottom: 6 }}>
            No classes yet
          </Text>
          <Text
            style={{
              fontFamily: theme.font.sans,
              fontSize: 14,
              lineHeight: 22,
              color: theme.color.mist,
              maxWidth: 262,
              textAlign: "center",
              marginBottom: 18,
            }}
          >
            Enroll in a class to get started — your enrolled classes will show up here. Trials, workshops and events live in Your Bookings.
          </Text>
          <Button onPress={() => router.replace("/(tabs)" as any)}>Explore academies</Button>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 120 }}
          refreshControl={<RefreshControl refreshing={fetching} onRefresh={refetch} tintColor={theme.color.persimmon} />}
          showsVerticalScrollIndicator={false}
        >
          {active.length > 0 ? (
            <>
              <SectionLabel>Enrolled</SectionLabel>
              {active.map((c) => {
                const paused = c.status === "paused";
                const closing = c.batch_status === "closing";
                const online = c.mode === "online";
                const resumes = paused && c.paused_until ? `Resumes ${format(new Date(c.paused_until), "d MMMM")}` : undefined;
                const schedule = [online ? "Online" : undefined, scheduleSummary(c.timings)].filter(Boolean).join(" · ");
                // A closing batch is being discontinued: student is covered until their paid term ends.
                const closingSub = closing && c.current_period_end
                  ? `Closing — active until ${format(new Date(c.current_period_end), "d MMM yyyy")}`
                  : undefined;
                const badge = closing
                  ? { label: "Closing", bg: theme.color.roseSoft, fg: theme.color.rose }
                  : paused
                  ? { label: "On hold", bg: theme.color.marigoldSoft, fg: theme.color.marigold }
                  : { label: "Active", bg: theme.color.jadeSoft, fg: theme.color.jade };
                return (
                  <RowCard
                    key={c.enrollment_id}
                    category={c.category ?? "music"}
                    title={c.batch_title}
                    badge={badge}
                    subText={closingSub ?? resumes ?? schedule}
                    footLeft={footFor(c)}
                    footRight={c.monthly_fee_paise ? `${inr(c.monthly_fee_paise)}/mo` : undefined}
                    onPress={() => router.push(`/enrollment/${c.enrollment_id}` as any)}
                  />
                );
              })}
            </>
          ) : null}

          {past.length > 0 ? (
            <>
              <SectionLabel>Past</SectionLabel>
              {past.map((c) => (
                <RowCard
                  key={c.enrollment_id}
                  category={c.category ?? "music"}
                  title={c.batch_title}
                  badge={{ label: "Ended", bg: theme.color.paperWarm, fg: theme.color.inkSoft }}
                  subText={format(new Date(c.current_period_end ?? c.started_at), "MMM yyyy")}
                  footLeft={footFor(c)}
                  footRight={durationLabel(c.started_at, c.current_period_end)}
                  onPress={() => router.push(`/enrollment/${c.enrollment_id}` as any)}
                />
              ))}
            </>
          ) : null}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  head: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 10 },
  hlWrap: { alignSelf: "flex-start", borderRadius: 5, paddingHorizontal: 4 },
  sectionLabel: { fontSize: 13, letterSpacing: 1.3, textTransform: "uppercase", marginTop: 18, marginBottom: 10 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
    borderWidth: 1,
    borderRadius: 20,
    padding: 14,
    marginBottom: 12,
  },
  thumb: { width: 74, height: 74, borderRadius: 15, overflow: "hidden" },
  body: { flex: 1, minWidth: 0 },
  ttl: { fontSize: 16, letterSpacing: -0.16, lineHeight: 18 },
  subRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 3, flexWrap: "wrap" },
  badge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  badgeText: { fontSize: 10.5, letterSpacing: 0.84, textTransform: "uppercase" },
  sub: { fontSize: 12.5, flexShrink: 1 },
  foot: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 8 },
  footText: { fontSize: 12.5, flexShrink: 1, paddingRight: 8 },
  price: { fontSize: 15, fontVariant: ["tabular-nums"] },
  empty: { alignItems: "center", paddingTop: 56, paddingHorizontal: 24, paddingBottom: 40 },
  emptyIcon: { width: 66, height: 66, borderRadius: 20, alignItems: "center", justifyContent: "center", marginBottom: 16 },
});
