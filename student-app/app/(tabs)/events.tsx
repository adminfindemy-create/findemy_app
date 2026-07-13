import React, { useState } from "react";
import { View, Text, ScrollView, Pressable, RefreshControl, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useTheme } from "@findemy/ui";
import { Image } from "expo-image";
import { useEvents } from "@/hooks/useEvents";
import { useAllWorkshops } from "@/hooks/useWorkshops";
import { EventRowCard } from "@/components/listings/EventRowCard";
import { WorkshopRowCard } from "@/components/listings/WorkshopRowCard";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { getEventImage } from "@/lib/eventImages";
import { SafeAreaView } from "react-native-safe-area-context";
import { format } from "date-fns";

const EVENT_TABS = [
  { key: "all", label: "All" },
  { key: "competition", label: "Competitions" },
  { key: "workshop", label: "Workshops" },
  { key: "meetup", label: "Meetups" },
];

const EMPTY: Record<string, string> = {
  all: "No events or workshops right now. Check back soon.",
  competition: "No competitions live right now.",
  workshop: "No upcoming workshops.",
  meetup: "No meetups planned. Check back soon.",
};

function inr(paise?: number | null): string {
  const rupees = Math.round((paise ?? 0) / 100);
  const rupeesStr = String(rupees);
  if (rupeesStr.length <= 3) return `₹${rupeesStr}`;
  const last3 = rupeesStr.slice(-3);
  const rest = rupeesStr.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ",");
  return `₹${rest},${last3}`;
}

function eventDate(iso?: string) {
  if (!iso) return "";
  const date = new Date(iso);
  return isNaN(date.getTime()) ? "" : format(date, "d MMM · EEE");
}

export default function EventsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const [type, setType] = useState("all");
  const [refreshing, setRefreshing] = useState(false);
  const events = useEvents(type === "all" || type === "workshop" ? undefined : type);
  const workshops = useAllWorkshops();

  const onRefresh = () => {
    setRefreshing(true);
    const tasks =
      type === "workshop"
        ? [workshops.refetch()]
        : type === "all"
        ? [events.refetch(), workshops.refetch()]
        : [events.refetch()];
    Promise.all(tasks).finally(() => setRefreshing(false));
  };

  const allItems: any[] = events.data?.items ?? [];
  const spotlight = type === "all" ? allItems.find((item) => item.is_spotlight) : null;
  const rest = spotlight ? allItems.filter((item) => item.id !== spotlight.id) : allItems;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.color.paper }} edges={["top"]}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.color.persimmon} />}
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Heading */}
        <View style={styles.head}>
          <Text style={[styles.kicker, { fontFamily: theme.font.sansBold, color: theme.color.mist }]}>
            BY FINDEMY
          </Text>
          <Text style={{ fontFamily: theme.font.serif, fontSize: 40, lineHeight: 42, letterSpacing: -0.5 }}>
            <Text style={{ fontFamily: theme.font.serifItalic, color: theme.color.inkSoft }}>Events &{"\n"}</Text>
            <Text style={{ color: theme.color.persimmon }}>Competitions.</Text>
          </Text>
        </View>

        {/* Pills */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillRow}>
          {EVENT_TABS.map((eventTab) => {
            const active = type === eventTab.key;
            return (
              <Pressable
                key={eventTab.key}
                onPress={() => setType(eventTab.key)}
                style={[
                  styles.pill,
                  active
                    ? { backgroundColor: theme.color.ink, borderColor: theme.color.ink }
                    : { backgroundColor: "#fff", borderColor: theme.color.hairline, ...theme.shadow.sm },
                ]}
              >
                <Text
                  style={{
                    fontFamily: active ? theme.font.sansBold : theme.font.sansMedium,
                    fontSize: 14,
                    color: active ? theme.color.ivory : theme.color.inkSoft,
                  }}
                >
                  {eventTab.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={styles.list}>
          {type === "meetup" && events.isLoading ? (
            <Text style={styles.loadingText}>Loading…</Text>
          ) : type === "all" ? (
            events.isLoading && workshops.isLoading ? (
              <Text style={styles.loadingText}>Loading…</Text>
            ) : rest.length === 0 && (workshops.data?.items ?? []).length === 0 && !spotlight ? (
              <EmptyState message={EMPTY.all} />
            ) : (
              <>
                {spotlight ? <Spotlight event={spotlight} onPress={() => router.push(`/events/${spotlight.id}`)} /> : null}
                <View style={styles.sectionHead}>
                  <Text style={[styles.st, { fontFamily: theme.font.sansBold, color: theme.color.ink }]}>This month</Text>
                  <Text style={[styles.sk, { fontFamily: theme.font.sansBold, color: theme.color.whisper }]}>UPCOMING IN DELHI-NCR</Text>
                </View>
                <View style={styles.stack}>
                  {rest.map((item: any) => (
                    <EventRowCard key={item.id} event={item} onPress={() => router.push(`/events/${item.id}`)} />
                  ))}
                  {(workshops.data?.items ?? []).map((workshop: any) => (
                    <WorkshopRowCard key={workshop.id} workshop={workshop} onPress={() => router.push(`/workshop/${workshop.id}`)} />
                  ))}
                </View>
              </>
            )
          ) : type === "workshop" ? (
            workshops.isLoading ? (
              <Text style={styles.loadingText}>Loading…</Text>
            ) : workshops.error ? (
              <ErrorState code={(workshops.error as any)?.code} onRetry={workshops.refetch} />
            ) : (workshops.data?.items ?? []).length === 0 ? (
              <EmptyState message={EMPTY.workshop} />
            ) : (
              <View style={styles.stack}>
                {(workshops.data?.items ?? []).map((workshop: any) => (
                  <WorkshopRowCard key={workshop.id} workshop={workshop} onPress={() => router.push(`/workshop/${workshop.id}`)} />
                ))}
              </View>
            )
          ) : events.isLoading ? (
            <Text style={styles.loadingText}>Loading…</Text>
          ) : events.error ? (
            <ErrorState code={(events.error as any)?.code} onRetry={events.refetch} />
          ) : allItems.length === 0 ? (
            <EmptyState message={EMPTY[type] ?? "No events found."} />
          ) : (
            <View style={styles.stack}>
              {allItems.map((item: any) => (
                <EventRowCard key={item.id} event={item} onPress={() => router.push(`/events/${item.id}`)} />
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );

  function Spotlight({ event, onPress }: { event: any; onPress: () => void }) {
    const meta = [eventDate(event.start_at).split(" · ")[0], event.location].filter(Boolean).join(" · ");
    return (
      <Pressable onPress={onPress} style={styles.spotlight}>
        <Image source={{ uri: getEventImage(event.type) }} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} />
        <View style={[StyleSheet.absoluteFill, styles.spotScrim]} pointerEvents="none" />
        <View style={[styles.spBadge, { backgroundColor: theme.color.persimmon }]}>
          <Text style={styles.spBadgeText}>✦ SPOTLIGHT EVENT</Text>
        </View>
        <View>
          <Text style={styles.spBy}>{(event.organizer_name ? `By ${event.organizer_name}` : "By Findemy").toUpperCase()}</Text>
          <Text style={[styles.spNm, { fontFamily: theme.font.serif }]}>{event.title}</Text>
        </View>
        <View style={styles.spFoot}>
          <Text style={styles.spMeta} numberOfLines={1}>{meta}</Text>
          {event.prize_paise != null ? (
            <View style={styles.spPrize}>
              <Text style={styles.spPrizeL}>PRIZE POOL</Text>
              <Text style={styles.spPrizeV}>{inr(event.prize_paise)}</Text>
            </View>
          ) : null}
        </View>
      </Pressable>
    );
  }
}

const styles = StyleSheet.create({
  head: { paddingHorizontal: 24, paddingTop: 12, paddingBottom: 14 },
  kicker: { fontSize: 11, letterSpacing: 2.2, marginBottom: 8, fontWeight: "700" },
  pillRow: { paddingHorizontal: 24, paddingBottom: 14, gap: 10, flexDirection: "row", alignItems: "center" },
  pill: { paddingHorizontal: 17, paddingVertical: 11, borderRadius: 999, borderWidth: 1 },
  list: { paddingHorizontal: 24 },
  loadingText: { fontSize: 13, color: "#9a9186", marginTop: 24 },
  spotlight: {
    borderRadius: 26,
    overflow: "hidden",
    padding: 18,
    minHeight: 230,
    justifyContent: "space-between",
    marginBottom: 18,
  },
  spotScrim: { backgroundColor: "rgba(0,0,0,0.42)" },
  spBadge: { alignSelf: "flex-start", paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999 },
  spBadgeText: { color: "#fff", fontSize: 10, fontWeight: "700", letterSpacing: 1.2 },
  spBy: { color: "rgba(255,255,255,0.75)", fontSize: 11, fontWeight: "700", letterSpacing: 1.6, marginBottom: 4 },
  spNm: { color: "#fff", fontSize: 30, lineHeight: 32, textShadowColor: "rgba(0,0,0,0.5)", textShadowRadius: 12, textShadowOffset: { width: 0, height: 2 } },
  spFoot: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", gap: 12 },
  spMeta: { color: "rgba(255,255,255,0.85)", fontSize: 12.5, fontWeight: "600", flex: 1 },
  spPrize: { backgroundColor: "rgba(255,255,255,0.16)", borderRadius: 14, paddingHorizontal: 13, paddingVertical: 9, alignItems: "center" },
  spPrizeL: { color: "rgba(255,255,255,0.7)", fontSize: 8.5, fontWeight: "700", letterSpacing: 1.1 },
  spPrizeV: { color: "#fff", fontSize: 15, fontWeight: "800" },
  sectionHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginTop: 6, marginBottom: 14 },
  st: { fontSize: 23, fontWeight: "800", letterSpacing: -0.4 },
  sk: { fontSize: 11, letterSpacing: 2, fontWeight: "700", marginTop: 5 },
  stack: { flexDirection: "column", gap: 0 },
});
