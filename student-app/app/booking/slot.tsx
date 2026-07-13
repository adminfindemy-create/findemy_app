import React, { useMemo, useState } from "react";
import { View, Text, ScrollView, Pressable, Alert, StyleSheet } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useTheme, Button, IconChevL, IconChevR } from "@findemy/ui";
import { SafeAreaView } from "react-native-safe-area-context";
import { useBatchSlots } from "@/hooks/useSlots";
import { useCreateBooking, useRescheduleBooking } from "@/hooks/useBookings";
import { ScreenHeader } from "@/components/common/ScreenHeader";
import { Stepper } from "@/components/common/Stepper";
import { ErrorState } from "@/components/common/ErrorState";
import {
  format,
  addMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isBefore,
  startOfToday,
} from "date-fns";

export default function BookingSlotScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { batch_id, reschedule_booking_id } = useLocalSearchParams<{ batch_id: string; reschedule_booking_id?: string }>();

  const [viewMonth, setViewMonth] = useState(startOfToday());
  const [selectedDate, setSelectedDate] = useState<Date>(startOfToday());
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);

  const dateStr = format(selectedDate, "yyyy-MM-dd");
  const slots = useBatchSlots(batch_id, dateStr);
  const createBooking = useCreateBooking();
  const rescheduleBooking = useRescheduleBooking();

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(viewMonth), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(viewMonth), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end }).slice(0, 42);
  }, [viewMonth]);

  const today = startOfToday();

  const onContinue = async () => {
    if (!selectedSlot) return;
    if (reschedule_booking_id) {
      try {
        await rescheduleBooking.mutateAsync({ id: reschedule_booking_id, new_trial_at: selectedSlot });
        router.replace("/bookings");
      } catch (error: any) {
        Alert.alert("Error", error.message ?? "Reschedule failed");
      }
    } else {
      try {
        const response = await createBooking.mutateAsync({ batch_id, trial_at: selectedSlot });
        router.push(`/booking/pay?booking_id=${response.booking.id}`);
      } catch (error: any) {
        Alert.alert("Error", error.message ?? "Booking failed");
      }
    }
  };

  const rawSlots = (slots.data?.slots ?? []) as any[];
  const slotList = isSameDay(selectedDate, new Date())
    ? rawSlots.filter((slot: any) => new Date(slot.slot_time) > new Date())
    : rawSlots;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.color.paper }} edges={["top"]}>
      <ScreenHeader title={reschedule_booking_id ? "Reschedule" : "Book a trial"} />

      <ScrollView contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        <Stepper step={1} total={3} label="Step 1 of 3 · Pick a slot" />

        {/* Calendar */}
        <View style={[styles.cal, { borderColor: theme.color.hairline, ...theme.shadow.sm }]}>
          <View style={styles.calHead}>
            <Pressable onPress={() => setViewMonth(addMonths(viewMonth, -1))} style={[styles.calNav, { borderColor: theme.color.hairline }]} accessibilityLabel="Previous month">
              <IconChevL size={16} color={theme.color.ink} />
            </Pressable>
            <Text style={{ fontFamily: theme.font.sansBold, fontSize: 16, color: theme.color.ink }}>{format(viewMonth, "MMMM yyyy")}</Text>
            <Pressable onPress={() => setViewMonth(addMonths(viewMonth, 1))} style={[styles.calNav, { borderColor: theme.color.hairline }]} accessibilityLabel="Next month">
              <IconChevR size={16} color={theme.color.ink} />
            </Pressable>
          </View>

          <View style={styles.dowRow}>
            {["M", "T", "W", "T", "F", "S", "S"].map((dayLetter, index) => (
              <Text key={index} style={[styles.dow, { color: theme.color.whisper, fontFamily: theme.font.sansBold }]}>{dayLetter}</Text>
            ))}
          </View>

          <View style={styles.grid}>
            {days.map((day, index) => {
              const inMonth = isSameMonth(day, viewMonth);
              const isSelected = isSameDay(day, selectedDate);
              const isPast = isBefore(day, today);
              const isToday = isSameDay(day, today);
              return (
                <Pressable
                  key={index}
                  disabled={isPast}
                  onPress={() => {
                    setSelectedDate(day);
                    setSelectedSlot(null);
                  }}
                  style={styles.dayCell}
                >
                  <View
                    style={[
                      styles.dayInner,
                      isSelected && { backgroundColor: theme.color.persimmon },
                      isToday && !isSelected && { borderWidth: 1.5, borderColor: theme.color.persimmon },
                    ]}
                  >
                    <Text
                      style={{
                        fontFamily: theme.font.sansSemibold,
                        fontSize: 14,
                        color: isSelected ? "#fff" : isPast || !inMonth ? theme.color.whisper : theme.color.ink,
                      }}
                    >
                      {format(day, "d")}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>

        <Text style={[styles.stepLabel, { fontFamily: theme.font.sansBold, color: theme.color.mist }]}>
          {format(selectedDate, "EEE, d MMMM")} · available times
        </Text>

        {slots.error ? (
          <ErrorState code={(slots.error as any)?.code} onRetry={slots.refetch} />
        ) : slotList.length === 0 ? (
          <Text style={{ fontFamily: theme.font.sans, fontSize: 13, color: theme.color.mist, textAlign: "center", paddingVertical: 20 }}>
            No slots available on this day. Try another date.
          </Text>
        ) : (
          <View style={{ gap: 10 }}>
            {slotList.map((slot) => {
              const remaining = (slot.capacity ?? 0) - (slot.reserved_count ?? 0);
              const full = remaining <= 0 || slot.status === "full";
              const active = selectedSlot === slot.id;
              return (
                <Pressable
                  key={slot.id}
                  disabled={full}
                  onPress={() => setSelectedSlot(slot.id)}
                  style={[
                    styles.slot,
                    {
                      backgroundColor: active ? theme.color.persimmon : "#fff",
                      borderColor: active ? theme.color.persimmon : theme.color.hairline,
                      opacity: full ? 0.5 : 1,
                    },
                  ]}
                >
                  <Text style={{ fontFamily: theme.font.sansBold, fontSize: 15, color: active ? "#fff" : theme.color.ink }}>
                    {format(new Date(slot.slot_time), "h:mm a")}
                  </Text>
                  <Text style={{ fontFamily: theme.font.sansSemibold, fontSize: 11.5, marginTop: 3, color: active ? "rgba(255,255,255,0.75)" : full ? theme.color.mist : remaining <= 2 ? theme.color.persimmon : theme.color.jade }}>
                    {full ? "Full" : active ? "Selected" : remaining === 1 ? "1 left" : `${remaining} left`}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>

      <SafeAreaView edges={["bottom"]} style={[styles.footer, { backgroundColor: theme.color.paper, borderTopColor: theme.color.hairline }]}>
        <Button
          block
          variant="dark"
          onPress={onContinue}
          disabled={!selectedSlot}
          loading={createBooking.isPending || rescheduleBooking.isPending}
        >
          {reschedule_booking_id ? "Reschedule" : "Continue"}
        </Button>
      </SafeAreaView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  cal: { backgroundColor: "#fff", borderWidth: 1, borderRadius: 20, padding: 16, marginBottom: 4 },
  calHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  calNav: { width: 34, height: 34, borderRadius: 17, borderWidth: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#fff" },
  dowRow: { flexDirection: "row", marginBottom: 8, paddingHorizontal: 2 },
  dow: { flex: 1, textAlign: "center", fontSize: 10.5, letterSpacing: 1, textTransform: "uppercase" },
  grid: { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 2 },
  dayCell: { width: `${100 / 7}%`, height: 44, alignItems: "center", justifyContent: "center" },
  dayInner: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  stepLabel: { fontSize: 11, letterSpacing: 1.4, textTransform: "uppercase", marginTop: 20, marginBottom: 12 },
  slot: { borderWidth: 1, borderRadius: 16, padding: 13 },
  footer: { position: "absolute", bottom: 0, left: 0, right: 0, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12, borderTopWidth: 1 },
});
