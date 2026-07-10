import React, { useState } from "react";
import { View, Text, Alert, StyleSheet, ScrollView } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useTheme, IconClock, IconMappin } from "@findemy/ui";
import { Image } from "expo-image";
import { useAuth } from "@/stores/auth";
import { ScreenHeader } from "@/components/ScreenHeader";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { api } from "@/lib/api";
import { useWorkshop } from "@/hooks/useWorkshops";
import { getWorkshopImage } from "@/lib/eventImages";
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

export default function WorkshopPayScreen() {
  const router = useRouter();
  const theme = useTheme();
  const user = useAuth((state) => state.user);
  const [paying, setPaying] = useState(false);

  const { registration_id, workshop_id, title, amount_paise } = useLocalSearchParams<{
    registration_id: string;
    workshop_id: string;
    title: string;
    amount_paise: string;
  }>();

  const workshopQ = useWorkshop(workshop_id);
  const workshop = (workshopQ.data as any)?.workshop;
  const wsTitle = workshop?.title ?? title ?? "Workshop";
  const start = workshop?.start_at ? new Date(workshop.start_at) : null;
  const whenLabel = start && !isNaN(start.getTime()) ? format(start, "EEE, d MMM · h:mm a") : null;
  const online = (workshop?.type ?? "") === "online";
  const where = online ? "Online" : (workshop?.location ?? "");
  const cover = getWorkshopImage(workshop?.type);

  const order = useQuery({
    queryKey: ["workshop-order", registration_id],
    queryFn: () => api.payments.createWorkshopOrder(registration_id),
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
                  payload: { payment: { entity: { order_id: order.data!.razorpay_order_id, id: `pay_dev_${Date.now()}`, notes: { workshop_registration_id: registration_id } } } },
                }),
              });
              if (!response.ok) { Alert.alert("Webhook failed", `API returned ${response.status}. Cannot confirm registration.`); return; }
            } catch (error: any) {
              Alert.alert("Cannot reach API", `Webhook URL ${apiUrl} unreachable from device. ${error?.message ?? ""}`);
              return;
            }
            router.replace(`/workshop/confirmation?registration_id=${registration_id}&workshop_id=${workshop_id}&title=${encodeURIComponent(title ?? "")}`);
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
        description: wsTitle,
        order_id: order.data.razorpay_order_id,
        prefill: { contact: user?.phone ?? "", name: user?.name ?? "" },
        theme: { color: theme.color.persimmon.replace("#", "") },
      };
      await RazorpayCheckout.open(options);
      router.replace(`/workshop/confirmation?registration_id=${registration_id}&workshop_id=${workshop_id}&title=${encodeURIComponent(title ?? "")}`);
    } catch (error: any) {
      Alert.alert("Payment failed", error?.description ?? "Something went wrong. Please try again.");
    } finally {
      setPaying(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.color.paper }} edges={["top"]}>
      <ScreenHeader title="Review your booking" />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 130 }} showsVerticalScrollIndicator={false}>
        {/* Item */}
        <View style={styles.itemRow}>
          <Image source={{ uri: cover }} style={styles.thumb} contentFit="cover" transition={150} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ fontFamily: theme.font.sansBold, fontSize: 16, color: theme.color.ink }} numberOfLines={2}>{wsTitle}</Text>
            <Text style={{ fontFamily: theme.font.sansSemibold, fontSize: 12.5, color: theme.color.mist, marginTop: 3 }}>
              {online ? "Online workshop" : "Workshop"}{workshop?.academy_name ? ` · ${workshop.academy_name}` : ""}
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
            <Text style={{ fontFamily: theme.font.sansSemibold, fontSize: 14, color: theme.color.ink }}>1 × Workshop entry</Text>
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
          🔒 Your spot is confirmed once payment succeeds.
        </Text>
      </ScrollView>

      <PayFooter totalPaise={amountPaise} onPay={onPay} loading={order.isLoading || paying} disabled={!order.data} />
    </SafeAreaView>
  );
}


const styles = StyleSheet.create({
  itemRow: { flexDirection: "row", alignItems: "center", gap: 13, paddingTop: 16, paddingBottom: 6 },
  thumb: { width: 62, height: 62, borderRadius: 14, overflow: "hidden" },
  card: { borderWidth: 1, borderRadius: 18, padding: 16, marginTop: 14 },
  dtRow: { flexDirection: "row", alignItems: "center", gap: 8, marginVertical: 2 },
  lineRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 4 },
  divider: { height: 1, marginVertical: 10 },
});
