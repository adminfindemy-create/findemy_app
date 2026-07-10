import React, { useMemo, useState } from "react";
import { View, Text, ScrollView, Pressable, StyleSheet, FlatList, Linking, useWindowDimensions } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import {
  useTheme,
  Button,
  BlockPrintCover,
  Summary,
  SummaryRow,
  IconChevL,
  IconUser,
  IconMappin,
} from "@findemy/ui";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { useProgram } from "@/hooks/useProgram";
import { enrichProgram } from "@/lib/programs";
import { ErrorState } from "@/components/ErrorState";
import { EmptyState } from "@/components/EmptyState";
import { SkeletonLoader } from "@/components/SkeletonLoader";
import { OptionRow } from "@/components/OptionRow";

const DAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const rupees = (paise?: number | null) => `₹${Math.round(Number(paise ?? 0) / 100).toLocaleString("en-IN")}`;

function formatBatchSchedule(timings: any[]): { days: string; time: string } {
  if (!timings?.length) return { days: "", time: "" };
  const days = [...new Set(timings.map((timing) => timing.day_of_week))].sort().map((dayOfWeek) => DAY_SHORT[dayOfWeek]).join(" · ");
  const firstTiming = timings[0];
  let time = "";
  if (firstTiming.start_time) {
    const [hour24, minute] = firstTiming.start_time.split(":").map(Number);
    const ampm = hour24 >= 12 ? "PM" : "AM";
    const hour12 = hour24 % 12 || 12;
    const startStr = `${hour12}:${String(minute).padStart(2, "0")} ${ampm}`;
    if (firstTiming.duration_min) {
      const endMin = hour24 * 60 + minute + firstTiming.duration_min;
      const endHour24 = Math.floor(endMin / 60) % 24;
      const endMinute = endMin % 60;
      const endAmpm = endHour24 >= 12 ? "PM" : "AM";
      const endHour12 = endHour24 % 12 || 12;
      time = `${startStr} – ${endHour12}:${String(endMinute).padStart(2, "0")} ${endAmpm}`;
    } else {
      time = startStr;
    }
  }
  return { days, time };
}

function seatsFor(batch: any): number {
  // Server batch wire carries computed trial_spots (capacity − active enrolled); prefer it.
  if (batch.trial_spots != null) return Number(batch.trial_spots);
  return Number(batch.capacity ?? 0) - Number(batch.enrolled_count ?? 0);
}

export default function ProgramScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { width: heroW } = useWindowDimensions();
  const { id } = useLocalSearchParams<{ id: string; academy_id?: string }>();

  const { data, error, isLoading, refetch } = useProgram(id);
  const academy = data?.academy as any;
  // academy_id for downstream navigation — from the fetched program (deep-link safe).
  const academy_id = (academy?.id ?? "") as string;

  const program = useMemo(
    () => (data?.program ? enrichProgram(data.program) : null),
    [data]
  );

  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
  const effectiveBatchId = selectedBatchId ?? (program?.batches[0]?.id ?? null);
  const selectedBatch = useMemo(
    () => program?.batches.find((batch) => batch.id === effectiveBatchId) ?? program?.batches[0] ?? null,
    [program, effectiveBatchId]
  );

  const selectedCoachName = (selectedBatch as any)?.coach_name ?? undefined;

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.color.paper }}>
        <SkeletonLoader height={230} borderRadius={0} />
        <View style={{ padding: 18, gap: 10 }}>
          <SkeletonLoader height={30} width="60%" borderRadius={8} />
          <SkeletonLoader height={120} borderRadius={18} />
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.color.paper }}>
        <ErrorState code={(error as any)?.code} onRetry={refetch} />
      </SafeAreaView>
    );
  }

  if (!program) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.color.paper }}>
        <EmptyState message="This program is no longer available." />
      </SafeAreaView>
    );
  }

  const mode = (selectedBatch as any)?.mode === "online" ? "Online · Findemy room" : "In-studio";
  const trial = rupees(program.trial_fee_paise);
  const isFull = program.total_seats_left <= 0;

  const goBookTrial = () => router.push(`/booking/slot?batch_id=${effectiveBatchId}`);
  const goEnroll = () =>
    router.push({ pathname: `/program/${id}/review`, params: { academy_id, batch_id: effectiveBatchId ?? "" } });

  // Prefer academy-uploaded program media; fall back to the academy's photos.
  const heroMedia: { url: string; type: "photo" | "video" }[] =
    program.media?.length > 0
      ? program.media
      : ((academy?.images ?? []) as string[]).map((url) => ({ url, type: "photo" as const }));

  return (
    <View style={{ flex: 1, backgroundColor: theme.color.paper }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 110 }}>
        {/* Hero — program media (photos + videos), falling back to academy photos / category art */}
        <View style={{ position: "relative", height: 230 }}>
          {heroMedia.length > 0 ? (
            <FlatList
              data={heroMedia}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              keyExtractor={(_item, index) => `media-${index}`}
              renderItem={({ item }) =>
                item.type === "video" ? (
                  <Pressable onPress={() => Linking.openURL(item.url)} style={{ width: heroW, height: 230, backgroundColor: "#000", alignItems: "center", justifyContent: "center" }}>
                    <View style={styles.playCircle}><Text style={{ color: "#fff", fontSize: 24, marginLeft: 3 }}>▶</Text></View>
                    <Text style={{ fontFamily: theme.font.sans, fontSize: 12, color: "rgba(255,255,255,0.85)", marginTop: 10 }}>Tap to play video</Text>
                  </Pressable>
                ) : (
                  <Image source={{ uri: item.url }} style={{ width: heroW, height: 230 }} contentFit="cover" />
                )
              }
              style={{ height: 230 }}
            />
          ) : (
            <BlockPrintCover category={(program.category as any) ?? "music"} variant={2} letter={program.title?.[0]} height={230} />
          )}
          <View style={styles.scrimTop} pointerEvents="none" />
          <SafeAreaView edges={["top"]} style={styles.topBar} pointerEvents="box-none">
            <Pressable style={styles.circleBtn} onPress={() => router.back()} accessibilityLabel="Back">
              <IconChevL size={18} color="#fff" />
            </Pressable>
          </SafeAreaView>
        </View>

        {/* Body */}
        <View style={{ padding: 18 }}>
          {academy?.name ? (
            <Text style={[styles.kicker, { fontFamily: theme.font.sansBold, color: theme.color.persimmon }]}>
              {academy.name}
            </Text>
          ) : null}
          <Text style={{ fontFamily: theme.font.serif, fontSize: 27, lineHeight: 29, color: theme.color.ink, marginTop: 6, marginBottom: 14 }}>
            {program.title}
          </Text>

          {/* About */}
          {program.description ? (
            <View style={{ marginBottom: 20 }}>
              <Text style={[styles.blockLabel, { fontFamily: theme.font.sansBold, color: theme.color.whisper }]}>About this program</Text>
              <Text style={{ fontFamily: theme.font.sans, fontSize: 13.5, lineHeight: 21, color: theme.color.inkSoft }}>
                {program.description}
              </Text>
            </View>
          ) : null}

          {/* Summary */}
          <Summary>
            <SummaryRow icon={<IconUser size={18} color={theme.color.persimmon} />} label="Coach" value={selectedCoachName ?? "—"} />
            <SummaryRow icon={<IconMappin size={18} color={theme.color.persimmon} />} label="Mode" value={mode} />
            <SummaryRow
              icon={<Text style={{ color: theme.color.persimmon, fontFamily: theme.font.sansBold, fontSize: 16 }}>₹</Text>}
              label="Fees"
              value={`Trial ${trial} · ${rupees(program.monthly_fee_paise_from)}/mo`}
              last
            />
          </Summary>

          {/* Batch */}
          {program.batches.length > 0 ? (
            <View style={{ marginTop: 22 }}>
              <Text style={[styles.blockLabel, { fontFamily: theme.font.sansBold, color: theme.color.whisper }]}>Batch</Text>
              {program.batches.map((batch) => {
                const seats = seatsFor(batch);
                const full = seats <= 0;
                const { days, time } = formatBatchSchedule((batch as any).timings ?? []);
                return (
                  <OptionRow
                    key={batch.id}
                    selected={batch.id === effectiveBatchId}
                    disabled={full}
                    onPress={() => setSelectedBatchId(batch.id)}
                    title={days || batch.level || "Batch"}
                    sub={`${time ? time + " · " : ""}${full ? "Full" : `${seats} seat${seats === 1 ? "" : "s"} left`}`}
                  />
                );
              })}
            </View>
          ) : null}

          {/* Things to know */}
          {program.things_to_know && program.things_to_know.length > 0 ? (
            <View style={{ marginTop: 14 }}>
              <Text style={[styles.blockLabel, { fontFamily: theme.font.sansBold, color: theme.color.whisper }]}>Things to know</Text>
              <View style={{ gap: 6 }}>
                {program.things_to_know.map((tip, index) => (
                  <View key={index} style={{ flexDirection: "row", gap: 8 }}>
                    <Text style={{ color: theme.color.persimmon, fontFamily: theme.font.sansBold, fontSize: 13.5 }}>•</Text>
                    <Text style={{ flex: 1, fontFamily: theme.font.sans, fontSize: 13.5, lineHeight: 21, color: theme.color.inkSoft }}>{tip}</Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          {/* Policy */}
          <View style={[styles.policy, { backgroundColor: theme.color.paperWarm }]}>
            <Text style={{ fontFamily: theme.font.sans, fontSize: 12.5, lineHeight: 19, color: theme.color.inkSoft }}>
              <Text style={{ fontFamily: theme.font.sansBold, color: theme.color.ink }}>Cancellation: </Text>
              free up to 12 hours before your trial. Enrolments can be paused or transferred anytime from Your Classes.
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Action bar */}
      <SafeAreaView edges={["bottom"]} style={[styles.actionBar, { backgroundColor: "rgba(255,255,255,0.97)", borderTopColor: theme.color.hairline }]}>
        <View style={styles.priceLead}>
          <Text style={[styles.priceL, { fontFamily: theme.font.sansBold, color: theme.color.whisper }]}>TRIAL</Text>
          <Text style={[styles.priceV, { fontFamily: theme.font.sansBold, color: theme.color.ink }]}>{trial}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Button block variant="ghost" onPress={goBookTrial} disabled={isFull || !selectedBatch}>
            Book a Trial
          </Button>
        </View>
        <View style={{ flex: 1.3 }}>
          <Button block onPress={goEnroll} disabled={isFull || !selectedBatch}>
            Enroll Now
          </Button>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  scrimTop: { position: "absolute", top: 0, left: 0, right: 0, height: 110, backgroundColor: "rgba(0,0,0,0.22)" },
  playCircle: { width: 60, height: 60, borderRadius: 30, backgroundColor: "rgba(255,255,255,0.16)", alignItems: "center", justifyContent: "center" },
  topBar: { position: "absolute", top: 0, left: 0, right: 0, paddingHorizontal: 18, paddingTop: 8 },
  circleBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(20,16,14,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  kicker: { fontSize: 11, letterSpacing: 2 },
  blockLabel: { fontSize: 11.5, letterSpacing: 1.4, textTransform: "uppercase", marginBottom: 10 },
  policy: { borderRadius: 16, padding: 14, marginTop: 18 },
  actionBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    borderTopWidth: 1,
  },
  priceLead: { flexShrink: 0 },
  priceL: { fontSize: 9.5, letterSpacing: 1.2 },
  priceV: { fontSize: 19 },
});
