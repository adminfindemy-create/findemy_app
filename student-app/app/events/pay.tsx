import React, { useEffect, useState } from "react";
import { View, Text, Alert, StyleSheet, ScrollView } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useTheme, Button, Summary, SummaryRow, IconCheck, IconCal, IconClock, IconMappin } from "@findemy/ui";
import { Image } from "expo-image";
import { useAuth } from "@/stores/auth";
import { ScreenHeader } from "@/components/common/ScreenHeader";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { api } from "@/lib/api";
import { useEvent } from "@/hooks/useEvents";
import { useEventRegistrationStatus } from "@/hooks/useEventRegistration";
import { getEventImage } from "@/lib/eventImages";
import { PaySummaryCard } from "@/components/pay/PaySummaryCard";
import { PayContactCard } from "@/components/pay/PayContactCard";
import { PayFooter } from "@/components/pay/PayFooter";
import { formatRupees } from "@/lib/format";

let RazorpayCheckout: any;
try {
  RazorpayCheckout = require("react-native-razorpay").default;
} catch {
  RazorpayCheckout = null;
}

export default function EventPayScreen() {
  const router = useRouter();
  const theme = useTheme();
  const user = useAuth((state) => state.user);
  const [paying, setPaying] = useState(false);
  const [paid, setPaid] = useState(false);
  const [timedOut, setTimedOut] = useState(false);

  const { registration_id, event_id, title, amount_paise } = useLocalSearchParams<{
    registration_id: string;
    event_id: string;
    title: string;
    amount_paise: string;
  }>();

  const regStatus = useEventRegistrationStatus(paid ? event_id : "");
  const confirmed = (regStatus.data as any)?.status === "confirmed";

  useEffect(() => {
    if (!paid || confirmed) return;
    const interval = setInterval(() => regStatus.refetch(), 2000);
    const timeout = setTimeout(() => {
      clearInterval(interval);
      setTimedOut(true);
    }, 30_000);
    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [paid, confirmed, regStatus.refetch]);

  const eventQ = useEvent(event_id);
  const event = (eventQ.data as any)?.event;
  const eventTitle = event?.title ?? title ?? "Event";
  const start = event?.start_at ? new Date(event.start_at) : null;
  const whenLabel = start && !isNaN(start.getTime()) ? format(start, "EEE, d MMM · h:mm a") : null;
  const where = event?.location ?? "";
  const organizer = event?.organizer_name ?? "";
  const cover = getEventImage(event?.type);

  const order = useQuery({
    queryKey: ["event-order", registration_id],
    queryFn: () => api.payments.createEventOrder(registration_id),
    enabled: !!registration_id,
    staleTime: Infinity,
  });

  const amountPaise = order.data?.amount_paise ?? Number(amount_paise ?? 0);

  const onPay = async () => {
    if (!order.data) return;
    const isMockKey = !order.data.razorpay_key || order.data.razorpay_key === "rzp_test_xxx";
    if (!RazorpayCheckout || isMockKey) {
      Alert.alert("Dev mode", "Razorpay keys not configured. Simulate payment?", [
        {
          text: "Simulate success",
          onPress: async () => {
            const apiUrl = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:8080";
            try {
              const response = await fetch(`${apiUrl}/payments/webhook`, {
                method: "POST",
                headers: { "Content-Type": "application/json", "x-razorpay-signature": "" },
                body: JSON.stringify({
                  event: "payment.captured",
                  payload: { payment: { entity: { order_id: order.data!.razorpay_order_id, id: `pay_dev_${Date.now()}`, notes: { payment_type: "event" } } } },
                }),
              });
              if (!response.ok) { Alert.alert("Webhook failed", `API returned ${response.status}.`); return; }
            } catch (error: any) {
              Alert.alert("Cannot reach API", `Webhook URL ${apiUrl} unreachable. ${error?.message ?? ""}`);
              return;
            }
            setPaid(true);
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
        amount: String(amountPaise),
        currency: order.data.currency,
        name: "Findemy",
        description: eventTitle,
        order_id: order.data.razorpay_order_id,
        prefill: { contact: (user as any)?.phone ?? "", name: (user as any)?.name ?? "" },
        theme: { color: theme.color.persimmon.replace("#", "") },
      };
      await RazorpayCheckout.open(options);
      setPaid(true);
    } catch (error: any) {
      Alert.alert("Payment failed", error?.description ?? "Something went wrong. Please try again.");
    } finally {
      setPaying(false);
    }
  };

  // ── Confirming (polling) ──
  if (paid && !confirmed && !timedOut) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.color.paper }}>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24 }}>
          <Text style={{ fontFamily: theme.font.sans, fontSize: 15, color: theme.color.mist }}>Confirming your entry…</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── Still processing (timeout) ──
  if (paid && timedOut && !confirmed) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.color.paper }}>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24 }}>
          <Text style={{ fontFamily: theme.font.sans, fontSize: 15, color: theme.color.mist, textAlign: "center", lineHeight: 21 }}>
            Still processing. You'll receive a notification when your entry is confirmed.
          </Text>
          <View style={{ marginTop: 24, alignSelf: "stretch", paddingHorizontal: 20 }}>
            <Button onPress={() => router.replace("/bookings")} block>Done</Button>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // ── Confirmed ──
  if (confirmed) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.color.paper }}>
        <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }}>
          <View style={styles.confirmHero}>
            <View style={[styles.mark, { backgroundColor: theme.color.jade }]}>
              <IconCheck size={30} color={theme.color.ivory} />
            </View>
            <Text style={{ fontFamily: theme.font.serif, fontSize: 34, color: theme.color.ink, lineHeight: 38, letterSpacing: -0.5, textAlign: "center", marginTop: 18 }}>
              {"You're "}
              <Text style={{ fontFamily: theme.font.serifItalic, color: theme.color.jade }}>in</Text>
              {"!"}
            </Text>
            <Text style={{ fontFamily: theme.font.sans, fontSize: 13.5, color: theme.color.inkSoft, textAlign: "center", lineHeight: 20, marginTop: 10 }}>
              Your entry is confirmed. Good luck!
            </Text>
          </View>

          <Summary>
            <ThumbRow cover={cover} label="Event" value={eventTitle} />
            {whenLabel ? <SummaryRow icon={<IconCal size={18} color={theme.color.jade} />} label="When" value={whenLabel} last /> : null}
          </Summary>

          <View style={{ marginTop: 24, gap: 10 }}>
            <Button onPress={() => router.replace("/bookings")} block variant="dark">View my bookings</Button>
            <Button onPress={() => router.replace("/(tabs)/events")} block variant="ghost">Back to events</Button>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── Review & pay ──
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.color.paper }} edges={["top"]}>
      <ScreenHeader title="Review your booking" />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 130 }} showsVerticalScrollIndicator={false}>
        {/* Item */}
        <View style={styles.itemRow}>
          <Image source={{ uri: cover }} style={styles.thumb} contentFit="cover" transition={150} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ fontFamily: theme.font.sansBold, fontSize: 16, color: theme.color.ink }} numberOfLines={2}>{eventTitle}</Text>
            <Text style={{ fontFamily: theme.font.sansSemibold, fontSize: 12.5, color: theme.color.mist, marginTop: 3 }}>
              {organizer ? `By ${organizer}` : "Event"}
            </Text>
          </View>
        </View>

        {/* Details */}
        <View style={[styles.card, { backgroundColor: theme.color.paperWarm, borderColor: theme.color.hairline }]}>
          <View style={styles.dtRow}>
            <IconClock size={16} color={theme.color.persimmon} />
            <Text style={{ fontFamily: theme.font.sansBold, fontSize: 15, color: theme.color.ink }}>{whenLabel ?? "—"}</Text>
          </View>
          <View style={[styles.divider, { backgroundColor: theme.color.hairline }]} />
          <View style={styles.lineRow}>
            <Text style={{ fontFamily: theme.font.sansSemibold, fontSize: 14, color: theme.color.ink }}>1 × Event entry</Text>
            <Text style={{ fontFamily: theme.font.sansBold, fontSize: 14, color: theme.color.ink }}>
              {amountPaise > 0 ? formatRupees(amountPaise) : "Free"}
            </Text>
          </View>
          {where ? (
            <>
              <View style={[styles.divider, { backgroundColor: theme.color.hairline }]} />
              <View style={styles.dtRow}>
                <IconMappin size={15} color={theme.color.mist} />
                <Text style={{ fontFamily: theme.font.sansMedium, fontSize: 12.5, color: theme.color.mist, flex: 1 }} numberOfLines={2}>{where}</Text>
              </View>
            </>
          ) : null}
        </View>

        <PaySummaryCard basePaise={amountPaise} totalPaise={amountPaise} loading={order.isLoading} />
        <PayContactCard />

        <Text style={{ fontFamily: theme.font.sans, fontSize: 11.5, color: theme.color.mist, textAlign: "center", marginTop: 16 }}>
          🔒 Your entry is confirmed once payment succeeds.
        </Text>
      </ScrollView>

      <PayFooter totalPaise={amountPaise} onPay={onPay} loading={order.isLoading || paying} disabled={!order.data} />
    </SafeAreaView>
  );

  function ThumbRow({ cover, label, value, last }: { cover: string; label: string; value: string; last?: boolean }) {
    return (
      <View style={[styles.thumbRow, { borderBottomColor: theme.color.hairline, borderBottomWidth: last ? 0 : 1 }]}>
        <Image source={{ uri: cover }} style={styles.thumbSm} contentFit="cover" transition={150} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ fontFamily: theme.font.sansBold, fontSize: 11, letterSpacing: 1.1, color: theme.color.whisper }}>{label.toUpperCase()}</Text>
          <Text style={{ fontFamily: theme.font.sansBold, fontSize: 14.5, color: theme.color.ink, marginTop: 1 }} numberOfLines={2}>{value}</Text>
        </View>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  confirmHero: { alignItems: "center", paddingTop: 48, paddingBottom: 28 },
  mark: { width: 60, height: 60, borderRadius: 30, alignItems: "center", justifyContent: "center" },
  thumbRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10 },
  thumbSm: { width: 46, height: 46, borderRadius: 12 },
  itemRow: { flexDirection: "row", alignItems: "center", gap: 13, paddingTop: 16, paddingBottom: 6 },
  thumb: { width: 62, height: 62, borderRadius: 14, overflow: "hidden" },
  card: { borderWidth: 1, borderRadius: 18, padding: 16, marginTop: 14 },
  dtRow: { flexDirection: "row", alignItems: "center", gap: 8, marginVertical: 2 },
  lineRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 4 },
  divider: { height: 1, marginVertical: 10 },
});
