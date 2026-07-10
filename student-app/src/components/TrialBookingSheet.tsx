import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  Modal,
  Pressable,
  ScrollView,
  Alert,
  StyleSheet,
} from "react-native";
import { useRouter } from "expo-router";
import { tokens, useTheme, Button } from "@findemy/ui";
import { BottomSheet } from "@/components/BottomSheet";
import { format, addDays, isSameDay, startOfToday } from "date-fns";
import { useProgramSlots } from "@/hooks/useSlots";
import { useCreateBooking } from "@/hooks/useBookings";
import type { Program, ProgramBatch } from "@/lib/programs";

const DAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAYS_AHEAD = 21;

type Props = {
  visible: boolean;
  onClose: () => void;
  program: Program;
  selectedBatch: ProgramBatch | null;
  coachName?: string;
};

function formatBatchSummary(batch: ProgramBatch | null): string {
  if (!batch?.timings?.length) return "";
  const days = [...new Set(batch.timings.map((t) => t.day_of_week))]
    .sort()
    .map((d) => DAY_SHORT[d])
    .join("/");
  const t = batch.timings[0];
  if (!t.start_time) return days;
  const [h, m] = t.start_time.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${days} · ${hour}:${String(m).padStart(2, "0")} ${ampm}`;
}

export function TrialBookingSheet({
  visible,
  onClose,
  program,
  selectedBatch,
  coachName,
}: Props) {
  const theme = useTheme();
  const router = useRouter();
  const createBooking = useCreateBooking();

  const today = startOfToday();
  const [selectedDate, setSelectedDate] = useState<Date>(today);
  const [selectedSlot, setSelectedSlot] = useState<{
    id: string;
    batch_id: string;
  } | null>(null);

  const dateRange = useMemo(
    () => Array.from({ length: DAYS_AHEAD }, (_, i) => addDays(today, i)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const batchDays = useMemo(() => {
    if (!selectedBatch?.timings?.length) return new Set<number>();
    return new Set(selectedBatch.timings.map((t) => t.day_of_week));
  }, [selectedBatch]);

  const batchMeta = useMemo(() => {
    if (!selectedBatch) return [];
    return [
      {
        id: selectedBatch.id,
        coach_name: coachName ?? (selectedBatch as any).coach_name,
      },
    ];
  }, [selectedBatch, coachName]);

  const dateStr = format(selectedDate, "yyyy-MM-dd");
  const slotsQuery = useProgramSlots(batchMeta, dateStr);

  const now = new Date();
  const rawSlots = slotsQuery.slots ?? [];
  const slotList = isSameDay(selectedDate, today)
    ? rawSlots.filter((s) => new Date(s.slot_time) > now)
    : rawSlots;

  const trialFee = `₹${Math.round(program.trial_fee_paise / 100)}`;
  const batchSummary = formatBatchSummary(selectedBatch);

  const handleConfirm = async () => {
    if (!selectedSlot) return;
    try {
      const res = await createBooking.mutateAsync({
        batch_id: selectedSlot.batch_id,
        trial_at: selectedSlot.id,
      });
      onClose();
      router.push(`/booking/pay?booking_id=${(res as any).booking.id}`);
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Booking failed");
    }
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} heightPct={88}>
        <View style={styles.titleRow}>
          <View style={{ flex: 1 }}>
            <Text
              style={{
                fontFamily: theme.font.serif,
                fontSize: 22,
                color: theme.color.ink,
              }}
            >
              Book a Trial
            </Text>
            <Text
              style={{
                fontFamily: tokens.font.sans,
                fontSize: 12,
                color: theme.color.mist,
                marginTop: 2,
              }}
              numberOfLines={1}
            >
              {program.title}
              {batchSummary ? ` · ${batchSummary}` : ""}
            </Text>
          </View>
          <Pressable onPress={onClose} hitSlop={10}>
            <Text style={{ fontSize: 18, color: theme.color.mist }}>✕</Text>
          </Pressable>
        </View>

        {/* Horizontal date strip */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.dateStripContent}
          style={styles.dateStrip}
        >
          {dateRange.map((d) => {
            const dayNum = d.getDay();
            const isAvailable =
              batchDays.size === 0 || batchDays.has(dayNum);
            const isSel = isSameDay(d, selectedDate) && isAvailable;
            return (
              <Pressable
                key={d.toISOString()}
                disabled={!isAvailable}
                onPress={() => {
                  setSelectedDate(d);
                  setSelectedSlot(null);
                }}
                style={[
                  styles.dateChip,
                  {
                    backgroundColor: isSel
                      ? theme.color.persimmon
                      : isAvailable
                      ? theme.color.ivory
                      : theme.color.paperWarm,
                    borderColor: isSel
                      ? theme.color.persimmon
                      : theme.color.hairline,
                    opacity: isAvailable ? 1 : 0.4,
                  },
                ]}
              >
                <Text
                  style={{
                    fontFamily: tokens.font.sans,
                    fontSize: 9,
                    fontWeight: "600",
                    color: isSel ? theme.color.ivory : theme.color.mist,
                    letterSpacing: 0.5,
                  }}
                >
                  {format(d, "EEE").toUpperCase()}
                </Text>
                <Text
                  style={{
                    fontFamily: theme.font.serif,
                    fontSize: 18,
                    color: isSel ? theme.color.ivory : theme.color.ink,
                    marginTop: 2,
                  }}
                >
                  {format(d, "d")}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Slots header */}
        <View style={styles.slotsHead}>
          <Text
            style={{
              fontFamily: theme.font.serif,
              fontSize: 17,
              color: theme.color.ink,
            }}
          >
            {format(selectedDate, "EEE, d MMM")}
          </Text>
          <Text
            style={{
              fontFamily: tokens.font.sans,
              fontSize: 12,
              color: theme.color.persimmon,
              fontStyle: "italic",
            }}
          >
            Trial · {trialFee}
          </Text>
        </View>

        {/* Slot grid */}
        <ScrollView
          style={styles.slotsScroll}
          contentContainerStyle={styles.slotsGrid}
          showsVerticalScrollIndicator={false}
        >
          {slotsQuery.isLoading ? (
            <Text
              style={{
                fontFamily: tokens.font.sans,
                fontSize: 13,
                color: theme.color.mist,
                width: "100%",
                textAlign: "center",
                paddingVertical: 14,
              }}
            >
              Loading…
            </Text>
          ) : slotList.length === 0 ? (
            <Text
              style={{
                fontFamily: tokens.font.sans,
                fontSize: 13,
                color: theme.color.mist,
                width: "100%",
                textAlign: "center",
                paddingVertical: 14,
              }}
            >
              No slots on this day. Try another date.
            </Text>
          ) : (
            slotList.map((slot) => {
              const remaining = slot.capacity - slot.reserved_count;
              const full =
                remaining <= 0 || slot.status === "full";
              const active = selectedSlot?.id === slot.id;
              return (
                <Pressable
                  key={slot.id}
                  disabled={full}
                  onPress={() =>
                    setSelectedSlot({ id: slot.id, batch_id: slot.batch_id })
                  }
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
                      fontFamily: tokens.font.sans,
                      fontSize: 13,
                      fontWeight: "700",
                      color: active
                        ? theme.color.ivory
                        : full
                        ? theme.color.mist
                        : theme.color.ink,
                    }}
                  >
                    {format(new Date(slot.slot_time), "h:mm a")}
                  </Text>
                  {slot.coach_name ? (
                    <Text
                      style={{
                        fontFamily: tokens.font.sans,
                        fontSize: 10,
                        color: active
                          ? "rgba(250,246,238,0.8)"
                          : theme.color.mist,
                        marginTop: 1,
                      }}
                      numberOfLines={1}
                    >
                      {slot.coach_name}
                    </Text>
                  ) : null}
                  <Text
                    style={{
                      fontFamily: tokens.font.sans,
                      fontSize: 10,
                      fontWeight: "600",
                      color: active
                        ? "rgba(250,246,238,0.8)"
                        : full
                        ? theme.color.mist
                        : remaining <= 2
                        ? theme.color.persimmon
                        : theme.color.jade,
                      marginTop: 1,
                    }}
                  >
                    {full ? "Full" : `${remaining} left`}
                  </Text>
                </Pressable>
              );
            })
          )}
        </ScrollView>

        <View style={{ marginTop: 12 }}>
          <Button
            onPress={handleConfirm}
            disabled={!selectedSlot}
            loading={createBooking.isPending}
            block
          >
            Confirm Trial
          </Button>
        </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  titleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingTop: 6,
    paddingBottom: 14,
  },
  dateStrip: {
    marginHorizontal: -24,
  },
  dateStripContent: {
    paddingHorizontal: 24,
    gap: 8,
    paddingVertical: 4,
  },
  dateChip: {
    width: 52,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
  },
  slotsHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 16,
    marginBottom: 8,
  },
  slotsScroll: {
    maxHeight: 170,
  },
  slotsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  slot: {
    flexGrow: 1,
    flexBasis: "30%",
    paddingVertical: 10,
    paddingHorizontal: 6,
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
  },
});
