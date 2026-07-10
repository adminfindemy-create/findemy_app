import React, { useMemo, useState } from "react";
import { View, Text, ScrollView, Pressable, Alert, StyleSheet } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useTheme, Button, ActionBar } from "@findemy/ui";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import {
  format,
  addDays,
  isSameDay,
  startOfToday,
} from "date-fns";
import { useProgram } from "@/hooks/useProgram";
import { enrichProgram } from "@/lib/programs";
import { useProgramSlots } from "@/hooks/useSlots";
import { useCreateBooking } from "@/hooks/useBookings";
import { ScreenHeader } from "@/components/ScreenHeader";
import { ErrorState } from "@/components/ErrorState";
import { EmptyState } from "@/components/EmptyState";
import { SkeletonLoader } from "@/components/SkeletonLoader";

const DAYS_AHEAD = 14;

export default function ProgramTrialScreen() {
  const router = useRouter();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string; academy_id?: string }>();

  const { data, error, isLoading, refetch } = useProgram(id);
  const createBooking = useCreateBooking();

  const today = startOfToday();
  const [selectedDate, setSelectedDate] = useState<Date>(today);
  const [selectedSlot, setSelectedSlot] = useState<{ id: string; batch_id: string } | null>(null);

  const dateRange = useMemo(
    () => Array.from({ length: DAYS_AHEAD }, (_, i) => addDays(today, i)),
    [today]
  );

  const program = useMemo(
    () => (data?.program ? enrichProgram(data.program) : null),
    [data]
  );

  const batchMeta = useMemo(
    () =>
      (program?.batches ?? []).map((b) => ({
        id: b.id,
        coach_name: (b as any).coach_name ?? undefined,
      })),
    [program]
  );

  const dateStr = format(selectedDate, "yyyy-MM-dd");
  const slotsQuery = useProgramSlots(batchMeta, dateStr);

  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.color.paper }} edges={["top"]}>
        <View style={{ padding: 24, gap: 12 }}>
          <SkeletonLoader height={32} width="60%" borderRadius={8} />
          <SkeletonLoader height={80} borderRadius={16} />
          <SkeletonLoader height={120} borderRadius={16} />
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.color.paper }} edges={["top"]}>
        <ErrorState code={(error as any)?.code} onRetry={refetch} />
      </SafeAreaView>
    );
  }

  if (!program) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.color.paper }} edges={["top"]}>
        <ScreenHeader title="Book a trial" />
        <EmptyState message="This program is no longer available." />
      </SafeAreaView>
    );
  }

  const trialFee = `₹${Math.round(program.trial_fee_paise / 100)}`;
  const now = new Date();
  const rawSlots = slotsQuery.slots ?? [];
  const slotList = isSameDay(selectedDate, today)
    ? rawSlots.filter((s) => new Date(s.slot_time) > now)
    : rawSlots;

  const handleContinue = async () => {
    if (!selectedSlot) return;
    try {
      const res = await createBooking.mutateAsync({
        batch_id: selectedSlot.batch_id,
        trial_at: selectedSlot.id,
      });
      router.push(`/booking/pay?booking_id=${(res as any).booking.id}`);
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Booking failed");
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.color.paper }} edges={["top"]}>
      <ScreenHeader title="Book a trial" />
      <ScrollView contentContainerStyle={{ paddingBottom: 130 }}>
        <View style={styles.headerWrap}>
          <Text
            style={{
              fontFamily: theme.font.sans,
              fontSize: 13,
              color: theme.color.inkSoft,
              lineHeight: 18,
            }}
          >
            {program.title} · 45-minute trial · {trialFee}
          </Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.dateStripContent}
          style={styles.dateStrip}
        >
          {dateRange.map((d) => {
            const isSel = isSameDay(d, selectedDate);
            return (
              <Pressable
                key={d.toISOString()}
                onPress={() => {
                  setSelectedDate(d);
                  setSelectedSlot(null);
                }}
                style={[
                  styles.dateChip,
                  {
                    backgroundColor: isSel ? theme.color.persimmon : theme.color.ivory,
                    borderColor: isSel ? theme.color.persimmon : theme.color.hairline,
                  },
                ]}
              >
                <Text
                  style={{
                    fontFamily: theme.font.sansSemibold,
                    fontSize: 10,
                    color: isSel ? theme.color.ivory : theme.color.mist,
                    letterSpacing: 0.6,
                  }}
                >
                  {format(d, "EEE").toUpperCase()}
                </Text>
                <Text
                  style={{
                    fontFamily: theme.font.serif,
                    fontSize: 22,
                    color: isSel ? theme.color.ivory : theme.color.ink,
                    marginTop: 4,
                  }}
                >
                  {format(d, "d")}
                </Text>
                <Text
                  style={{
                    fontFamily: theme.font.sans,
                    fontSize: 10,
                    color: isSel ? "rgba(250,246,238,0.85)" : theme.color.mist,
                    marginTop: 2,
                  }}
                >
                  {format(d, "MMM")}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={styles.slotsHead}>
          <Text style={{ fontFamily: theme.font.serif, fontSize: 22, color: theme.color.ink }}>
            Available · {format(selectedDate, "EEE d MMM")}
          </Text>
        </View>

        {slotsQuery.error ? (
          <View style={{ paddingHorizontal: 24 }}>
            <ErrorState code={(slotsQuery.error as any)?.code} onRetry={slotsQuery.refetch} />
          </View>
        ) : slotsQuery.isLoading ? (
          <View style={{ paddingHorizontal: 24, gap: 8 }}>
            <SkeletonLoader height={64} borderRadius={14} />
            <SkeletonLoader height={64} borderRadius={14} />
          </View>
        ) : (
          <View style={styles.slotsGrid}>
            {slotList.length === 0 ? (
              <Text
                style={{
                  fontFamily: theme.font.sans,
                  fontSize: 13,
                  color: theme.color.mist,
                  textAlign: "center",
                  width: "100%",
                  paddingVertical: 20,
                }}
              >
                No slots available on this day. Try another date.
              </Text>
            ) : (
              slotList.map((slot) => {
                const remaining = slot.capacity - slot.reserved_count;
                const full = remaining <= 0 || slot.status === "full";
                const active = selectedSlot?.id === slot.id;
                return (
                  <Pressable
                    key={slot.id}
                    disabled={full}
                    onPress={() => setSelectedSlot({ id: slot.id, batch_id: slot.batch_id })}
                    style={[
                      styles.slot,
                      {
                        backgroundColor: active
                          ? theme.color.persimmon
                          : full
                          ? theme.color.paperWarm
                          : theme.color.ivory,
                        borderColor: active
                          ? theme.color.persimmon
                          : theme.color.hairline,
                      },
                    ]}
                  >
                    <Text
                      style={{
                        fontFamily: theme.font.sansBold,
                        fontSize: 14,
                        color: active ? theme.color.ivory : full ? theme.color.mist : theme.color.ink,
                      }}
                    >
                      {format(new Date(slot.slot_time), "h:mm a")}
                    </Text>
                    {slot.coach_name ? (
                      <Text
                        style={{
                          fontFamily: theme.font.sans,
                          fontSize: 11,
                          color: active ? "rgba(250,246,238,0.85)" : theme.color.mist,
                          marginTop: 2,
                        }}
                        numberOfLines={1}
                      >
                        {slot.coach_name}
                      </Text>
                    ) : null}
                    <Text
                      style={{
                        fontFamily: theme.font.sansSemibold,
                        fontSize: 11,
                        color: active
                          ? "rgba(250,246,238,0.85)"
                          : full
                          ? theme.color.mist
                          : remaining <= 2
                          ? theme.color.persimmon
                          : theme.color.jade,
                        marginTop: 2,
                      }}
                    >
                      {full ? "Full" : remaining === 1 ? "1 left" : `${remaining} left`}
                    </Text>
                    <Text
                      style={{
                        fontFamily: theme.font.sans,
                        fontSize: 11,
                        color: active ? "rgba(250,246,238,0.85)" : theme.color.mist,
                        marginTop: 2,
                      }}
                    >
                      {trialFee}
                    </Text>
                  </Pressable>
                );
              })
            )}
          </View>
        )}

        <Text
          style={{
            fontFamily: theme.font.sans,
            fontSize: 11,
            color: theme.color.mist,
            textAlign: "center",
            marginTop: 14,
          }}
        >
          Slots fill up fast — confirmed instantly when you pay.
        </Text>
      </ScrollView>

      <ActionBar bottomInset={insets.bottom}>
        <Button
          onPress={handleContinue}
          disabled={!selectedSlot}
          loading={createBooking.isPending}
          block
        >
          Continue · review & pay
        </Button>
      </ActionBar>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  headerWrap: {
    paddingHorizontal: 24,
    paddingTop: 4,
    paddingBottom: 18,
  },
  dateStrip: {
    paddingVertical: 4,
  },
  dateStripContent: {
    paddingHorizontal: 24,
    gap: 10,
  },
  dateChip: {
    width: 60,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
  },
  slotsHead: {
    paddingHorizontal: 24,
    marginTop: 24,
    marginBottom: 10,
  },
  slotsGrid: {
    paddingHorizontal: 24,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  slot: {
    flexGrow: 1,
    flexBasis: "30%",
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
  },
});
