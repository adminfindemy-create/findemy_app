import React, { useEffect, useRef, useState } from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useTheme, Button, BlockPrintCover, Summary, SummaryRow, IconClock } from "@findemy/ui";
import { Image } from "expo-image";
import { useBooking } from "@/hooks/useBookings";
import { useAuth } from "@/stores/auth";
import { SafeAreaView } from "react-native-safe-area-context";
import { format } from "date-fns";
import * as Notifications from "expo-notifications";

export default function BookingConfirmationScreen() {
  const router = useRouter();
  const { booking_id } = useLocalSearchParams<{ booking_id: string }>();
  const theme = useTheme();
  const attendanceOtp = useAuth((state) => state.attendanceOtp);
  const { data, refetch } = useBooking(booking_id);
  const [timedOut, setTimedOut] = useState(false);

  const booking = data?.booking as any;
  const isConfirmed = booking?.status === "confirmed";
  const reminderScheduled = useRef(false);

  useEffect(() => {
    if (isConfirmed) return;
    const interval = setInterval(() => refetch(), 2000);
    const timeout = setTimeout(() => {
      clearInterval(interval);
      setTimedOut(true);
    }, 30_000);
    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [isConfirmed, refetch]);

  useEffect(() => {
    if (!isConfirmed || reminderScheduled.current) return;
    reminderScheduled.current = true;
    const slotTimeRaw = booking?.slot?.slot_time ?? booking?.slot_time ?? booking?.trial_at;
    if (!slotTimeRaw) return;
    const slotTime = new Date(slotTimeRaw);
    if (isNaN(slotTime.getTime())) return;
    const triggerTime = new Date(slotTime.getTime() - 60 * 60 * 1000);
    if (triggerTime <= new Date()) return;
    const academyName = booking?.academy?.name ?? "your academy";
    Notifications.scheduleNotificationAsync({
      content: { title: "Class reminder 🎵", body: `Your trial at ${academyName} starts in 1 hour!`, data: { screen: "bookings" } },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: triggerTime },
    }).catch(() => {});
  }, [isConfirmed, booking]);

  const centered = (node: React.ReactNode) => (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.color.paper }}>
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24 }}>{node}</View>
    </SafeAreaView>
  );

  if (!isConfirmed && !timedOut) {
    return centered(
      <Text style={{ fontFamily: theme.font.sans, fontSize: 15, color: theme.color.mist }}>Confirming your booking…</Text>
    );
  }

  if (booking?.status === "cancelled") {
    return centered(
      <>
        <Text style={{ fontFamily: theme.font.serif, fontSize: 28, color: theme.color.rose, marginBottom: 12 }}>Payment failed</Text>
        <Button onPress={() => router.replace(`/booking/pay?booking_id=${booking_id}`)}>Try again</Button>
      </>
    );
  }

  if (timedOut && !isConfirmed) {
    return centered(
      <>
        <Text style={{ fontFamily: theme.font.sans, fontSize: 15, color: theme.color.mist, textAlign: "center" }}>
          We're still processing this. You'll get a push notification when it's confirmed.
        </Text>
        <View style={{ marginTop: 24 }}>
          <Button onPress={() => router.replace("/(tabs)")} block>Done</Button>
        </View>
      </>
    );
  }

  const slotIso = booking?.slot?.slot_time ?? booking?.trial_at;
  const slotDate = slotIso ? new Date(slotIso) : null;
  const academyName = booking?.academy?.name ?? "";
  const category = booking?.academy?.category ?? booking?.batch?.category ?? "music";
  const batchTitle = booking?.batch?.title ?? "Trial";
  const amountPaise = booking?.amount_paise ?? booking?.batch?.trial_fee_paise ?? 0;
  const images = booking?.academy?.images as string[] | undefined;
  const otp = (attendanceOtp ?? "").split("").join(" ");

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.color.paper }} edges={["top"]}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 18, paddingTop: 24, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <View style={{ alignItems: "center", marginBottom: 8 }}>
          <View style={[styles.tick, { backgroundColor: theme.color.jade }]}>
            <Text style={{ color: "#fff", fontSize: 40, marginTop: -2 }}>✓</Text>
          </View>
          <Text style={{ fontFamily: theme.font.serif, fontSize: 32, color: theme.color.ink }}>Trial booked!</Text>
          <Text style={{ fontFamily: theme.font.sans, fontSize: 14, color: theme.color.mist, marginTop: 6, textAlign: "center" }}>
            A confirmation is on its way to your phone.
          </Text>
        </View>

        <View style={{ marginTop: 18 }}>
          <Summary>
            <View style={styles.trialRow}>
              {images?.length ? (
                <Image source={{ uri: images[0] }} style={styles.thumb} contentFit="cover" />
              ) : (
                <BlockPrintCover category={category} variant={1} height={46} hideLetter style={{ width: 46, height: 46, borderRadius: 12, overflow: "hidden" }} />
              )}
              <View style={{ flex: 1 }}>
                <Text style={[styles.l, { fontFamily: theme.font.sansBold, color: theme.color.whisper }]}>TRIAL</Text>
                <Text style={[styles.v, { fontFamily: theme.font.sansBold, color: theme.color.ink }]}>
                  {batchTitle}{academyName ? ` · ${academyName}` : ""}
                </Text>
              </View>
            </View>
            <SummaryRow icon={<IconClock size={18} color={theme.color.persimmon} />} label="When" value={slotDate ? format(slotDate, "EEE d MMM · h:mm a") : "—"} />
            <SummaryRow
              icon={<Text style={{ color: theme.color.persimmon, fontFamily: theme.font.sansBold, fontSize: 15 }}>₹</Text>}
              label="Paid via Razorpay"
              value={`₹${Math.round(amountPaise / 100).toLocaleString("en-IN")}`}
              last
            />
          </Summary>
        </View>

        {otp ? (
          <View style={[styles.otpBox, { backgroundColor: theme.color.ink }]}>
            <Text style={styles.otpL}>SHOW THIS CODE AT THE ACADEMY</Text>
            <Text style={[styles.otpV, { fontFamily: theme.font.sansBold }]}>{otp}</Text>
          </View>
        ) : null}

        <View style={{ marginTop: 8, gap: 10 }}>
          <Button block variant="dark" onPress={() => router.replace("/(tabs)/classes")}>Go to My Classes</Button>
          <Button block variant="ghost" onPress={() => router.replace("/(tabs)")}>Explore more</Button>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  tick: {
    width: 84,
    height: 84,
    borderRadius: 42,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
    shadowColor: "#1E6F66",
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.35,
    shadowRadius: 30,
    elevation: 10,
},
  trialRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10 },
  thumb: { width: 46, height: 46, borderRadius: 12 },
  l: { fontSize: 11, letterSpacing: 1.1 },
  v: { fontSize: 14.5, marginTop: 1 },
  otpBox: { borderRadius: 18, padding: 16, marginVertical: 18, alignItems: "center" },
  otpL: { color: "rgba(255,255,255,0.6)", fontSize: 10, letterSpacing: 1.6, textTransform: "uppercase", fontWeight: "700" },
  otpV: { color: "#fff", fontSize: 30, letterSpacing: 8, marginTop: 6 },
});
