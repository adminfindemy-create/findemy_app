import React, { useState } from "react";
import { View, Text, Alert, StyleSheet, ScrollView } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useTheme, BlockPrintCover, IconCal, IconShield } from "@findemy/ui";
import { useAuth } from "@/stores/auth";
import { ScreenHeader } from "@/components/ScreenHeader";
import { SafeAreaView } from "react-native-safe-area-context";
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

const PACKAGE_LABELS: Record<string, { label: string; months: number }> = {
  monthly: { label: "Monthly", months: 1 },
  quarterly: { label: "Quarterly", months: 3 },
  annual: { label: "Annual", months: 12 },
};

export default function EnrollmentPayScreen() {
  const router = useRouter();
  const theme = useTheme();
  const user = useAuth((s) => s.user);
  const [paying, setPaying] = useState(false);

  const {
    enrollment_id,
    enrollment_period_id,
    razorpay_order_id,
    razorpay_key,
    amount_paise,
    batch_title,
    package_type,
    category,
    flow,
  } = useLocalSearchParams<{
    enrollment_id: string;
    enrollment_period_id: string;
    razorpay_order_id: string;
    razorpay_key: string;
    amount_paise: string;
    batch_title: string;
    package_type: string;
    batch_id: string;
    category: string;
    flow: string;
  }>();

  const amountNum = Number(amount_paise ?? 0);
  const pkgInfo = PACKAGE_LABELS[package_type ?? "monthly"] ?? PACKAGE_LABELS.monthly;
  const isRenewal = flow === "renewal";

  const onPay = async () => {
    const isMockKey = !razorpay_key || razorpay_key === "rzp_test_xxx";
    if (!RazorpayCheckout || isMockKey) {
      Alert.alert("Dev mode", "Razorpay keys not configured. Simulate payment?", [
        {
          text: "Simulate success",
          onPress: async () => {
            const apiUrl = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:8080";
            try {
              const res = await fetch(`${apiUrl}/payments/webhook`, {
                method: "POST",
                headers: { "Content-Type": "application/json", "x-razorpay-signature": "" },
                body: JSON.stringify({
                  event: "payment.captured",
                  payload: { payment: { entity: { order_id: razorpay_order_id, id: `pay_dev_${Date.now()}`, notes: { payment_type: "enrollment" } } } },
                }),
              });
              if (!res.ok) { Alert.alert("Webhook failed", `API returned ${res.status}.`); return; }
            } catch (e: any) {
              Alert.alert("Cannot reach API", `Webhook URL ${apiUrl} unreachable. ${e?.message ?? ""}`);
              return;
            }
            router.replace(`/enrollment/confirmation?enrollment_id=${enrollment_id}&enrollment_period_id=${enrollment_period_id}&batch_title=${encodeURIComponent(batch_title ?? "")}`);
          },
        },
        { text: "Cancel", style: "cancel" },
      ]);
      return;
    }

    setPaying(true);
    try {
      const options = {
        key: razorpay_key,
        amount: String(amountNum),
        currency: "INR",
        name: "Findemy",
        description: `${pkgInfo.label} enrollment — ${batch_title}`,
        order_id: razorpay_order_id,
        prefill: { contact: (user as any)?.phone ?? "", name: (user as any)?.name ?? "" },
        theme: { color: theme.color.persimmon.replace("#", "") },
      };
      await RazorpayCheckout.open(options);
      router.replace(`/enrollment/confirmation?enrollment_id=${enrollment_id}&enrollment_period_id=${enrollment_period_id}&batch_title=${encodeURIComponent(batch_title ?? "")}`);
    } catch (err: any) {
      Alert.alert("Payment failed", err?.description ?? "Something went wrong. Please try again.");
    } finally {
      setPaying(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.color.paper }} edges={["top"]}>
      <ScreenHeader title="Review your enrolment" />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 130 }} showsVerticalScrollIndicator={false}>
        {/* Item */}
        <View style={styles.itemRow}>
          <BlockPrintCover category={(category as any) ?? "music"} variant={1} height={62} hideLetter style={styles.thumb} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ fontFamily: theme.font.sansBold, fontSize: 16, color: theme.color.ink }} numberOfLines={2}>
              {batch_title ?? "Class"}
            </Text>
            <Text style={{ fontFamily: theme.font.sansSemibold, fontSize: 12.5, color: theme.color.mist, marginTop: 3 }}>
              {isRenewal ? "Renewal" : "Enrolment"}
            </Text>
          </View>
        </View>

        {/* Details */}
        <View style={[styles.card, { backgroundColor: theme.color.paperWarm, borderColor: theme.color.hairline }]}>
          <View style={styles.dtRow}>
            <IconCal size={16} color={theme.color.persimmon} />
            <Text style={{ fontFamily: theme.font.sansBold, fontSize: 15, color: theme.color.ink }}>
              {pkgInfo.label} plan · auto-renews
            </Text>
          </View>
          <View style={[styles.divider, { backgroundColor: theme.color.hairline }]} />
          <View style={styles.lineRow}>
            <Text style={{ fontFamily: theme.font.sansSemibold, fontSize: 14, color: theme.color.ink }}>
              {pkgInfo.months} month{pkgInfo.months > 1 ? "s" : ""} of classes
            </Text>
            <Text style={{ fontFamily: theme.font.sansBold, fontSize: 14, color: theme.color.ink }}>{formatRupees(amountNum)}</Text>
          </View>
          <View style={[styles.divider, { backgroundColor: theme.color.hairline }]} />
          <View style={styles.dtRow}>
            <IconShield size={15} color={theme.color.mist} />
            <Text style={{ fontFamily: theme.font.sansMedium, fontSize: 12.5, color: theme.color.mist, flex: 1 }}>
              Recurring payment set up via Razorpay. Pause or cancel anytime from Your Classes.
            </Text>
          </View>
        </View>

        <PaySummaryCard basePaise={amountNum} totalPaise={amountNum} />
        <PayContactCard />

        <Text style={{ fontFamily: theme.font.sans, fontSize: 11.5, color: theme.color.mist, textAlign: "center", marginTop: 16 }}>
          🔒 Secure checkout · you won't be charged until confirmed.
        </Text>
      </ScrollView>

      <PayFooter totalPaise={amountNum} onPay={onPay} loading={paying} ctaLabel={isRenewal ? "Pay & renew" : "Pay & enrol"} />
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
