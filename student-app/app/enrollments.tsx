import React from "react";
import { View, Text, ScrollView, StyleSheet, Pressable, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import { useTheme, Tag } from "@findemy/ui";
import { SafeAreaView } from "react-native-safe-area-context";
import { ScreenHeader } from "@/components/ScreenHeader";
import { EmptyState } from "@/components/EmptyState";
import { SkeletonLoader } from "@/components/SkeletonLoader";
import { useEnrollments } from "@/hooks/useEnrollments";
import { format } from "date-fns";
import { formatRupees } from "@/lib/format";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function getNextClass(
  timings: { day_of_week: number; start_time: string; duration_min?: number }[] | undefined | null
): Date | null {
  if (!timings || !timings.length) return null;
  const now = new Date();
  let closest: Date | null = null;
  for (const t of timings) {
    const [h, m] = t.start_time.split(":").map(Number);
    const d = new Date();
    d.setHours(h, m, 0, 0);
    let diff = t.day_of_week - d.getDay();
    if (diff === 0) {
      const minutesPast = (now.getTime() - d.getTime()) / 60000;
      if (minutesPast > (t.duration_min ?? 60)) diff = 7;
    } else if (diff < 0) {
      diff += 7;
    }
    d.setDate(d.getDate() + diff);
    if (!closest || d < closest) closest = d;
  }
  return closest;
}

export default function EnrollmentsScreen() {
  const router = useRouter();
  const theme = useTheme();
  const enrollments = useEnrollments();

  const batches = enrollments.data?.items ?? [];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.color.ivory }} edges={["top"]}>
      <ScreenHeader title="Your Classes" />

      {enrollments.isLoading ? (
        <View style={styles.body}>
          <SkeletonLoader height={120} borderRadius={16} />
          <View style={{ height: 12 }} />
          <SkeletonLoader height={120} borderRadius={16} />
        </View>
      ) : batches.length === 0 ? (
        <EmptyState
          message="No active enrollments yet. Book a trial and enroll to see your classes here."
          actionLabel="Explore academies"
          onAction={() => router.push("/(tabs)")}
        />
      ) : (
        <ScrollView
          contentContainerStyle={[styles.body, { backgroundColor: theme.color.ivory }]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={enrollments.isRefetching}
              onRefresh={() => enrollments.refetch()}
              tintColor={theme.color.persimmon}
            />
          }
        >
          {batches.map((batch: any) => {
            const nextClass = getNextClass(batch.timings);
            const fee = batch.monthly_fee_paise ? `${formatRupees(batch.monthly_fee_paise)}/mo` : null;

            // Online join indicator
            let onlinePill: { label: string; live: boolean } | null = null;
            if (batch.mode === "online" && batch.status === "active" && nextClass) {
              const duration = batch.timings?.[0]?.duration_min ?? 60;
              const minutesUntil = (nextClass.getTime() - Date.now()) / 60000;
              if (minutesUntil > -duration && minutesUntil <= 10) {
                onlinePill = { label: "● Live", live: true };
              } else if (minutesUntil > 10) {
                const mins = Math.round(minutesUntil);
                onlinePill = {
                  label: "Starts in " + (mins < 60 ? `${mins}m` : `${Math.round(mins / 60)}h`),
                  live: false,
                };
              }
            }

            return (
              <Pressable
                key={batch.id}
                onPress={() => router.push(`/enrollment/${batch.id}` as any)}
                style={({ pressed }) => [
                  styles.batchCard,
                  {
                    backgroundColor: theme.color.ivory,
                    borderColor: theme.color.hairline,
                    opacity: pressed ? 0.85 : 1,
                    ...theme.shadow.sm,
                  },
                ]}
              >
                {/* Top row: category tag + title + status pill */}
                <View style={styles.batchTopRow}>
                  <Tag label={String(batch.category).toUpperCase()} tone="persimmon" />
                  <Text
                    style={{
                      fontFamily: theme.font.sansSemibold,
                      fontSize: 15,
                      color: theme.color.ink,
                      flex: 1,
                      marginLeft: 8,
                    }}
                    numberOfLines={1}
                  >
                    {batch.batch_title}
                  </Text>
                  {/* Context-aware status pill */}
                  {batch.paused_until ? (
                    <View style={{ marginLeft: 6 }}><Tag label="⏸ Paused" tone="marigold" /></View>
                  ) : batch.discontinue_requested_at ? (
                    <View style={{ marginLeft: 6 }}><Tag label="Ending" tone="rose" /></View>
                  ) : batch.status === "grace" ? (
                    <View style={{ marginLeft: 6 }}><Tag label="Grace period" tone="marigold" /></View>
                  ) : onlinePill ? (
                    <View style={{ marginLeft: 6 }}>
                      <Tag label={onlinePill.label} tone={onlinePill.live ? "jade" : "bone"} />
                    </View>
                  ) : null}
                </View>

                {/* Academy · Coach */}
                <Text
                  style={{
                    fontFamily: theme.font.sans,
                    fontSize: 11,
                    color: theme.color.mist,
                    marginTop: 4,
                  }}
                >
                  {batch.academy_name}
                  {batch.coach_name ? ` · ${batch.coach_name}` : ""}
                </Text>

                {/* Next class */}
                {nextClass && (
                  <View style={styles.nextClassRow}>
                    <Text style={{ fontSize: 11, color: theme.color.jade }}>▸ </Text>
                    <Text
                      style={{
                        fontFamily: theme.font.sansSemibold,
                        fontSize: 12,
                        color: theme.color.jade,
                      }}
                    >
                      {"Next class: " + format(nextClass, "EEE, d MMM 'at' h:mm a")}
                    </Text>
                  </View>
                )}

                {/* Progress row: attended + fee */}
                <View style={[styles.progressRow, { borderTopColor: theme.color.hairline }]}>
                  <View>
                    <Text
                      style={{
                        fontFamily: theme.font.sansSemibold,
                        fontSize: 9,
                        color: theme.color.mist,
                        textTransform: "uppercase",
                        letterSpacing: 1,
                      }}
                    >
                      Attended
                    </Text>
                    <Text
                      style={{
                        fontFamily: theme.font.serif,
                        fontSize: 18,
                        color: theme.color.ink,
                        lineHeight: 20,
                        marginTop: 2,
                      }}
                    >
                      {batch.attended_count > 0 ? `${batch.attended_count} classes` : "No classes yet"}
                    </Text>
                    {batch.attended_count > 0 && (
                      <View style={{ flexDirection: "row", gap: 3, marginTop: 6 }}>
                        {Array.from({ length: 10 }).map((_, i) => (
                          <View
                            key={i}
                            style={{
                              width: 7,
                              height: 7,
                              borderRadius: 4,
                              backgroundColor:
                                i < Math.min(batch.attended_count, 10)
                                  ? theme.color.persimmon
                                  : theme.color.hairline,
                            }}
                          />
                        ))}
                      </View>
                    )}
                  </View>
                  {fee && (
                    <Text
                      style={{
                        fontFamily: theme.font.sans,
                        fontSize: 12,
                        color: theme.color.mist,
                        alignSelf: "flex-end",
                      }}
                    >
                      {fee}
                    </Text>
                  )}
                </View>

                {/* Day chips */}
                {(batch.timings?.length ?? 0) > 0 && (
                  <View style={styles.dayChips}>
                    {(batch.timings ?? []).map((t: any, i: number) => (
                      <View
                        key={i}
                        style={[styles.dayChip, { backgroundColor: theme.color.persimmonSoft }]}
                      >
                        <Text
                          style={{
                            fontFamily: theme.font.sansSemibold,
                            fontSize: 10,
                            color: theme.color.persimmon,
                          }}
                        >
                          {DAY_LABELS[t.day_of_week]}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
              </Pressable>
            );
          })}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  body: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 48,
  },
  batchCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
  },
  batchTopRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  nextClassRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
  },
  progressRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  dayChips: {
    flexDirection: "row",
    gap: 6,
    marginTop: 10,
  },
  dayChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
});
