import React, { useEffect, useState } from "react";
import { View, Text, Alert, Pressable, StyleSheet, ScrollView } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useTheme, BlockPrintCover, IconClock, IconMappin } from "@findemy/ui";
import { Image } from "expo-image";
import { useBooking } from "@/hooks/useBookings";
import { usePaymentOrder } from "@/hooks/usePayments";
import { useAuth } from "@/stores/auth";
import { ScreenHeader } from "@/components/ScreenHeader";
import { ErrorState } from "@/components/ErrorState";
import { SafeAreaView } from "react-native-safe-area-context";
import { format } from "date-fns";
import { formatRupees } from "@/lib/format";
import { PaySummaryCard } from "@/components/pay/PaySummaryCard";
import { PayContactCard } from "@/components/pay/PayContactCard";
import { PayFooter } from "@/components/pay/PayFooter";

let RazorpayCheckout: any;
try {
  RazorpayCheckout = require("react-native-razorpay").default;
} catch {
  RazorpayCheckout = null;
}

export default function BookingPayScreen() {
  const router = useRouter();
  const { booking_id } = useLocalSearchParams<{ booking_id: string }>();
  const theme = useTheme();
  const user = useAuth((s) => s.user);
  const [paying, setPaying] = useState(false);

  const booking = useBooking(booking_id);
  const order = usePaymentOrder(booking_id);

  // Countdown to the reservation expiry (reference: "Complete your booking in MM:SS").
  const b = booking.data?.booking as any;
  const expiresAt = b?.reservation_expires_at ? new Date(b.reservation_expires_at).getTime() : null;
  const [nowTs, setNowTs] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNowTs(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const remainingMs = expiresAt != null ? Math.max(0, expiresAt - nowTs) : null;
  const mmss = remainingMs != null
    ? `${String(Math.floor(remainingMs / 60000)).padStart(2, "0")}:${String(Math.floor((remainingMs % 60000) / 1000)).padStart(2, "0")}`
    : null;

  const onPay = async () => {
    if (!order.data) return;
    const isMockKey = !order.data.razorpay_key || order.data.razorpay_key === "rzp_test_xxx";
    if (!RazorpayCheckout || isMockKey) {
      Alert.alert("Dev mode", "Razorpay keys not configured. Simulate payment?", [
        {
          text: "Simulate success",
          onPress: async () => {
            try {
              await fetch(`${process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:8080"}/payments/webhook`, {
                method: "POST",
                headers: { "Content-Type": "application/json", "x-razorpay-signature": "" },
                body: JSON.stringify({
                  event: "payment.captured",
                  payload: { payment: { entity: { order_id: order.data!.razorpay_order_id, id: `pay_dev_${Date.now()}` } } },
                }),
              });
            } catch { /* non-fatal */ }
            router.replace(`/booking/confirmation?booking_id=${booking_id}`);
          },
        },
        { text: "Cancel", style: "cancel" },
      ]);
      return;
    }
    setPaying(true);
    try {
      const options = {
        key: order.data.razorpay_key,
        amount: String(order.data.amount_paise),
        currency: order.data.currency,
        name: "Findemy",
        description: "Trial class",
        order_id: order.data.razorpay_order_id,
        prefill: { contact: user?.phone ?? "", name: user?.name ?? "" },
        theme: { color: theme.color.persimmon.replace("#", "") },
      };
      await RazorpayCheckout.open(options);
      router.replace(`/booking/confirmation?booking_id=${booking_id}`);
    } catch (err: any) {
      Alert.alert("Payment failed", err?.description ?? "Something went wrong. Please try again.");
    } finally {
      setPaying(false);
    }
  };

  if (booking.error) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.color.paper }} edges={["top"]}>
        <ScreenHeader title="Review your booking" />
        <ErrorState code={(booking.error as any)?.code} onRetry={booking.refetch} />
      </SafeAreaView>
    );
  }

  const slotIso = b?.slot?.slot_time ?? b?.trial_at;
  const slotDate = slotIso ? new Date(slotIso) : null;
  const academyName = b?.academy?.name ?? "";
  const isOnline = b?.batch?.mode === "online";
  const academyAddress = isOnline ? "Online · Findemy room" : (b?.academy?.address ?? "");
  const category = b?.academy?.category ?? b?.batch?.category ?? "music";
  const batchTitle = b?.batch?.title ?? "Trial class";
  const images = b?.academy?.images as string[] | undefined;
  const breakdown = order.data?.breakdown as { base_paise: number; total_paise: number } | undefined;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.color.paper }} edges={["top"]}>
      <ScreenHeader title="Review your booking" />

      {/* Countdown banner */}
      {mmss ? (
        <View style={[styles.countdown, { backgroundColor: theme.color.paperWarm, borderColor: theme.color.hairline }]}>
          <Text style={{ fontFamily: theme.font.sansSemibold, fontSize: 13, color: theme.color.mist }}>
            Complete your booking in{" "}
            <Text style={{ fontFamily: theme.font.sansBold, color: remainingMs && remainingMs < 60000 ? theme.color.rose : theme.color.jade }}>
              {mmss}
            </Text>{" "}
            mins
          </Text>
        </View>
      ) : null}

      <ScrollView contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 130 }} showsVerticalScrollIndicator={false}>
        {/* Item card */}
        <View style={styles.itemRow}>
          {images?.length ? (
            <Image source={{ uri: images[0] }} style={styles.thumb} contentFit="cover" />
          ) : (
            <BlockPrintCover category={category} variant={1} height={62} hideLetter style={{ width: 62, height: 62, borderRadius: 14, overflow: "hidden" }} />
          )}
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ fontFamily: theme.font.sansBold, fontSize: 16, color: theme.color.ink }} numberOfLines={2}>
              {batchTitle}
            </Text>
            {academyName ? (
              <Text style={{ fontFamily: theme.font.sansSemibold, fontSize: 12.5, color: theme.color.mist, marginTop: 3 }} numberOfLines={1}>
                {academyName}
              </Text>
            ) : null}
          </View>
        </View>

        {/* Booking details card */}
        <View style={[styles.card, { backgroundColor: theme.color.paperWarm, borderColor: theme.color.hairline }]}>
          <View style={styles.dtRow}>
            <IconClock size={16} color={theme.color.persimmon} />
            <Text style={{ fontFamily: theme.font.sansBold, fontSize: 15, color: theme.color.ink }}>
              {slotDate ? format(slotDate, "EEE, d MMM · h:mm a") : "—"}
            </Text>
          </View>
          <View style={[styles.divider, { backgroundColor: theme.color.hairline }]} />
          <View style={styles.lineRow}>
            <Text style={{ fontFamily: theme.font.sansSemibold, fontSize: 14, color: theme.color.ink }}>1 × Trial class</Text>
            <Text style={{ fontFamily: theme.font.sansBold, fontSize: 14, color: theme.color.ink }}>
              {breakdown ? (breakdown.base_paise > 0 ? formatRupees(breakdown.base_paise) : "Free") : "—"}
            </Text>
          </View>
          <View style={[styles.divider, { backgroundColor: theme.color.hairline }]} />
          <View style={styles.dtRow}>
            <IconMappin size={15} color={theme.color.mist} />
            <Text style={{ fontFamily: theme.font.sansMedium, fontSize: 12.5, color: theme.color.mist, flex: 1 }} numberOfLines={2}>
              {[academyName, academyAddress].filter(Boolean).join(" · ") || "—"}
            </Text>
          </View>
          <View style={styles.dtRow}>
            <Text style={{ fontSize: 14 }}>🎟️</Text>
            <Text style={{ fontFamily: theme.font.sansMedium, fontSize: 12.5, color: theme.color.mist, flex: 1 }}>
              {isOnline ? "Join the live class from the app at class time" : "Show your attendance code at the class"}
            </Text>
          </View>
        </View>

        {/* Payment summary */}
        <PaySummaryCard basePaise={breakdown?.base_paise} totalPaise={breakdown?.total_paise} loading={order.isLoading} />
        {order.error ? (
          <Pressable onPress={() => order.refetch()} style={{ alignItems: "center", marginTop: 8 }}>
            <Text style={{ fontFamily: theme.font.sansBold, fontSize: 13, color: theme.color.persimmon }}>Couldn't load the price — retry</Text>
          </Pressable>
        ) : null}

        {/* Your details */}
        <PayContactCard />

        <Text style={{ fontFamily: theme.font.sans, fontSize: 11.5, color: theme.color.mist, textAlign: "center", marginTop: 16 }}>
          🔒 You won't be charged until your trial is confirmed.
        </Text>
      </ScrollView>

      <PayFooter totalPaise={breakdown?.total_paise} onPay={onPay} loading={order.isLoading || paying} disabled={!order.data} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  countdown: { marginHorizontal: 18, marginTop: 4, marginBottom: 4, borderWidth: 1, borderRadius: 12, paddingVertical: 10, alignItems: "center" },

  itemRow: { flexDirection: "row", alignItems: "center", gap: 13, paddingTop: 16, paddingBottom: 6 },
  thumb: { width: 62, height: 62, borderRadius: 14 },

  card: { borderWidth: 1, borderRadius: 18, padding: 16, marginTop: 14 },
  dtRow: { flexDirection: "row", alignItems: "center", gap: 8, marginVertical: 2 },
  lineRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 4 },
  divider: { height: 1, marginVertical: 10 },
});
