import React, { useMemo, useState } from "react";
import { View, Text, ScrollView, Pressable, StyleSheet, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import { useTheme, BlockPrintCover, IconChevR } from "@findemy/ui";
import { Image } from "expo-image";
import { SafeAreaView } from "react-native-safe-area-context";
import { format } from "date-fns";
import { ScreenHeader } from "@/components/ScreenHeader";
import { SkeletonLoader } from "@/components/SkeletonLoader";
import { EmptyState } from "@/components/EmptyState";
import { useTrialsMy } from "@/hooks/useTrials";
import { useMyWorkshopRegistrations } from "@/hooks/useWorkshops";
import { useMyEventRegistrations } from "@/hooks/useEvents";
import { getWorkshopImage, getEventImage } from "@/lib/eventImages";

function inr(paise?: number | null): string {
  const n = Math.round((paise ?? 0) / 100);
  const s = String(n);
  if (s.length <= 3) return `₹${s}`;
  const last3 = s.slice(-3);
  const rest = s.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ",");
  return `₹${rest},${last3}`;
}

type Row = {
  key: string;
  title: string;
  badge: { label: string; bg: string; fg: string };
  subText: string;
  footLeft: string;
  footRight?: string;
  thumb: "workshop" | "event" | { category: string };
  workshopType?: string;
  eventType?: string;
  onPress: () => void;
  sortDate: number;
  past: boolean;
};

export default function BookingsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const [seg, setSeg] = useState<"upcoming" | "past">("upcoming");

  const upcomingTrials = useTrialsMy("upcoming");
  const pastTrials = useTrialsMy("past");
  const workshopRegs = useMyWorkshopRegistrations();
  const eventRegs = useMyEventRegistrations();

  const isLoading = upcomingTrials.isLoading || pastTrials.isLoading || workshopRegs.isLoading || eventRegs.isLoading;
  const refreshing = upcomingTrials.isRefetching || pastTrials.isRefetching || workshopRegs.isRefetching || eventRegs.isRefetching;
  const onRefresh = () => {
    upcomingTrials.refetch();
    pastTrials.refetch();
    workshopRegs.refetch();
    eventRegs.refetch();
  };

  const jade = { bg: theme.color.jadeSoft, fg: theme.color.jade };
  const neutral = { bg: theme.color.bone, fg: theme.color.inkSoft };
  const rose = { bg: theme.color.roseSoft, fg: theme.color.rose };

  const rows = useMemo<Row[]>(() => {
    const out: Row[] = [];
    const now = Date.now();

    const pushTrial = (t: any, past: boolean) => {
      const at = t.scheduled_at ?? t.trial_at ?? t.trialAt;
      const when = at ? `${format(new Date(at), "EEE d MMM · h:mm a")}` : "";
      const st = (t.status ?? "").toLowerCase();
      const badge = past
        ? st === "missed" || st === "cancelled"
          ? { label: st === "missed" ? "Missed" : "Cancelled", ...rose }
          : { label: "Attended", ...neutral }
        : { label: "Booked", ...jade };
      out.push({
        key: `trial-${t.id}`,
        title: t.batch_title ?? "Trial",
        badge,
        subText: when,
        footLeft: t.academy_name ?? "",
        footRight: t.trial_fee_paise != null ? (t.trial_fee_paise === 0 ? "Free" : inr(t.trial_fee_paise)) : undefined,
        thumb: { category: t.category ?? "music" },
        onPress: () => router.push(`/trials/${t.id}` as any),
        sortDate: at ? new Date(at).getTime() : 0,
        past,
      });
    };

    for (const t of (upcomingTrials.data?.items ?? []) as any[]) pushTrial(t, false);
    for (const t of (pastTrials.data?.items ?? []) as any[]) pushTrial(t, true);

    for (const w of (workshopRegs.data?.items ?? []) as any[]) {
      const at = w.start_at ? new Date(w.start_at).getTime() : 0;
      const past = at ? at < now : false;
      const online = (w.workshop_type ?? "") === "online";
      out.push({
        key: `workshop-${w.id}`,
        title: w.workshop_title ?? "Workshop",
        badge: online ? { label: "Online", ...jade } : { label: "Workshop", bg: theme.color.marigoldSoft, fg: theme.color.marigold },
        subText: w.start_at ? format(new Date(w.start_at), "d MMM · h:mm a") : "",
        footLeft: w.academy_name ? `By ${w.academy_name}` : "",
        footRight: w.price_paise > 0 ? inr(w.price_paise) : "Free",
        thumb: "workshop",
        workshopType: w.workshop_type,
        onPress: () => router.push(`/workshop/${w.workshop_id}` as any),
        sortDate: at,
        past,
      });
    }

    for (const ev of (eventRegs.data?.items ?? []) as any[]) {
      const at = ev.start_at ? new Date(ev.start_at).getTime() : 0;
      const past = at ? at < now : false;
      out.push({
        key: `event-${ev.id}`,
        title: ev.event_title ?? "Event",
        badge: { label: "Event", ...jade },
        subText: ev.start_at ? format(new Date(ev.start_at), "d MMM · h:mm a") : "",
        footLeft: ev.organizer_name ? `By ${ev.organizer_name}` : (ev.location ?? ""),
        footRight: ev.price_paise > 0 ? inr(ev.price_paise) : "Free",
        thumb: "event",
        eventType: ev.event_type,
        onPress: () => router.push(`/events/${ev.event_id}` as any),
        sortDate: at,
        past,
      });
    }

    return out.sort((a, b) => b.sortDate - a.sortDate);
  }, [upcomingTrials.data, pastTrials.data, workshopRegs.data, eventRegs.data, theme]);

  const shown = rows.filter((r) => (seg === "past" ? r.past : !r.past));

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.color.paper }} edges={["top"]}>
      <ScreenHeader title="Your bookings" />

      <View style={[styles.seg, { backgroundColor: theme.color.paperWarm }]}>
        {(["upcoming", "past"] as const).map((s) => {
          const active = seg === s;
          return (
            <Pressable
              key={s}
              onPress={() => setSeg(s)}
              style={[styles.segBtn, active && { backgroundColor: "#fff", ...theme.shadow.sm }]}
            >
              <Text style={{ fontFamily: theme.font.sansBold, fontSize: 13.5, color: active ? theme.color.ink : theme.color.inkSoft }}>
                {s === "upcoming" ? "Upcoming" : "Past"}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {isLoading ? (
        <View style={{ paddingHorizontal: 20, gap: 12 }}>
          {[0, 1, 2].map((i) => <SkeletonLoader key={i} height={90} borderRadius={20} />)}
        </View>
      ) : shown.length === 0 ? (
        <EmptyState message={seg === "past" ? "No past bookings yet." : "No upcoming bookings. Book a trial or register for a workshop."} />
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 48 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.color.persimmon} />}
        >
          {shown.map((r) => (
            <Pressable
              key={r.key}
              onPress={r.onPress}
              style={[styles.card, { backgroundColor: "#fff", borderColor: theme.color.hairline, ...theme.shadow.sm }]}
            >
              {r.thumb === "workshop" ? (
                <Image source={{ uri: getWorkshopImage(r.workshopType) }} style={styles.thumb} contentFit="cover" transition={150} />
              ) : r.thumb === "event" ? (
                <Image source={{ uri: getEventImage(r.eventType) }} style={styles.thumb} contentFit="cover" transition={150} />
              ) : (
                <BlockPrintCover category={r.thumb.category as any} variant={1} height={66} hideLetter style={styles.thumb} />
              )}
              <View style={styles.body}>
                <Text style={[styles.ttl, { fontFamily: theme.font.sansBold, color: theme.color.ink }]} numberOfLines={1}>
                  {r.title}
                </Text>
                <View style={styles.subRow}>
                  <View style={[styles.badge, { backgroundColor: r.badge.bg }]}>
                    <Text style={[styles.badgeText, { color: r.badge.fg }]}>{r.badge.label}</Text>
                  </View>
                  <Text style={[styles.sub, { fontFamily: theme.font.sansMedium, color: theme.color.mist }]} numberOfLines={1}>
                    {r.subText}
                  </Text>
                </View>
                <View style={styles.foot}>
                  <Text style={[styles.footText, { fontFamily: theme.font.sansMedium, color: theme.color.mist }]} numberOfLines={1}>
                    {r.footLeft}
                  </Text>
                  {r.footRight ? (
                    <Text style={{ fontFamily: theme.font.sansBold, fontSize: 14, color: theme.color.ink }}>{r.footRight}</Text>
                  ) : null}
                  <IconChevR size={18} color={theme.color.whisper} />
                </View>
              </View>
            </Pressable>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  seg: { flexDirection: "row", gap: 8, borderRadius: 999, padding: 5, marginHorizontal: 20, marginTop: 8, marginBottom: 16 },
  segBtn: { flex: 1, borderRadius: 999, paddingVertical: 11, alignItems: "center" },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
    borderWidth: 1,
    borderRadius: 20,
    padding: 12,
    marginBottom: 12,
  },
  thumb: { width: 66, height: 66, borderRadius: 15, overflow: "hidden" },
  body: { flex: 1, minWidth: 0 },
  ttl: { fontSize: 16, letterSpacing: -0.1, lineHeight: 18 },
  subRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4, flexWrap: "wrap" },
  badge: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 999 },
  badgeText: { fontSize: 10, fontWeight: "700", letterSpacing: 0.4 },
  sub: { fontSize: 12.5, flexShrink: 1 },
  foot: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, marginTop: 8 },
  footText: { fontSize: 12.5, flex: 1 },
});
