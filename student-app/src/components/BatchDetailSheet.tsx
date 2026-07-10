import React, { useState } from "react";
import { View, Text, Modal, Pressable, ScrollView, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { tokens, useTheme, Button } from "@findemy/ui";
import { BottomSheet } from "@/components/BottomSheet";
import { useEnrollBatch, useEnrollmentStatus } from "@/hooks/useEnroll";

const DAY_FULL = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function formatTime(time: string) {
  if (!time) return "";
  const [hour24, minute] = time.split(":").map(Number);
  const ampm = hour24 >= 12 ? "PM" : "AM";
  const hour12 = hour24 % 12 || 12;
  return `${hour12}:${String(minute).padStart(2, "0")} ${ampm}`;
}

export type BatchDetailSheetBatch = {
  id: string;
  title?: string;
  level?: string;
  trial_fee_paise?: number;
  monthly_fee_paise?: number;
  // S2.3: academy-set discounts (S1.3) — drive the plan picker's % dynamically.
  quarterly_discount_bps?: number;
  annual_discount_bps?: number;
  capacity?: number;
  enrolled_count?: number;
  timings?: { day_of_week: number; start_time?: string; duration_min?: number }[];
};

type Props = {
  visible: boolean;
  onClose: () => void;
  batch: BatchDetailSheetBatch | null;
  coachName?: string;
  onEnrolled?: () => void;
};

// S2.3: plans = monthly | quarterly | annual (no biannual); discounts come from the batch.
function buildPackages(batch: BatchDetailSheetBatch | null) {
  const quarterlyDiscountBps = batch?.quarterly_discount_bps ?? 0;
  const annualDiscountBps = batch?.annual_discount_bps ?? 0;
  const pct = (bps: number) => (bps > 0 ? `${bps / 100}% off` : "");
  return [
    { key: "monthly", label: "Monthly", suffix: "", badge: "" },
    { key: "quarterly", label: "Quarterly", suffix: pct(quarterlyDiscountBps), badge: "Popular" },
    { key: "annual", label: "Annual", suffix: pct(annualDiscountBps), badge: "Best value" },
  ];
}

export function BatchDetailSheet({ visible, onClose, batch, coachName, onEnrolled }: Props) {
  const theme = useTheme();
  const router = useRouter();
  const enrollBatch = useEnrollBatch();
  const enrollmentStatus = useEnrollmentStatus(batch?.id ?? "");
  const isEnrolled = enrollmentStatus.data?.enrolled === true;
  const [selectedPackage, setSelectedPackage] = useState<string>("monthly");
  const PACKAGES = buildPackages(batch);

  if (!batch) {
    return (
      <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
        <Pressable style={styles.backdrop} onPress={onClose} />
      </Modal>
    );
  }

  const timings = batch.timings ?? [];
  const trialFee = `₹${Math.round(Number(batch.trial_fee_paise ?? 15000) / 100)}`;
  const monthlyFee = batch.monthly_fee_paise
    ? `₹${Math.round(Number(batch.monthly_fee_paise) / 100)}/mo`
    : null;
  const slotsLeft = Number(batch.capacity ?? 0) - Number(batch.enrolled_count ?? 0);
  const isFull = slotsLeft <= 0;

  const handleEnroll = async () => {
    try {
      const result = await enrollBatch.mutateAsync({ batchId: batch.id, package_type: selectedPackage });
      onClose();
      if (result.requires_payment) {
        router.push(
          `/enrollment/pay?enrollment_period_id=${result.enrollment_period_id}&razorpay_order_id=${result.razorpay_order_id}&razorpay_key=${result.razorpay_key}&amount_paise=${result.amount_paise}&batch_title=${encodeURIComponent(batch.title ?? "")}&package_type=${selectedPackage}&flow=enroll` as any
        );
      } else {
        onEnrolled?.();
      }
    } catch {
      // useEnrollBatch shows its own Alert
    }
  };

  return (
    <BottomSheet visible={visible} onClose={onClose}>
        <View style={styles.titleRow}>
          <Text
            style={{
              fontFamily: theme.font.serif,
              fontSize: 22,
              color: theme.color.ink,
              flex: 1,
            }}
          >
            {batch.title ?? "Cohort details"}
          </Text>
          <Pressable onPress={onClose} hitSlop={10}>
            <Text style={{ fontSize: 18, color: theme.color.mist }}>✕</Text>
          </Pressable>
        </View>

        <ScrollView style={{ maxHeight: 460 }} contentContainerStyle={{ paddingBottom: 8 }}>
          {batch.level ? (
            <View style={[styles.pill, { backgroundColor: theme.color.paperWarm, marginTop: 4 }]}>
              <Text
                style={{
                  fontFamily: tokens.font.sans,
                  fontSize: 11,
                  fontWeight: "600",
                  color: theme.color.mist,
                  letterSpacing: 0.4,
                }}
              >
                {batch.level.toUpperCase()}
              </Text>
            </View>
          ) : null}

          {coachName ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 16 }}>
              <View style={[styles.coachAvatar, { backgroundColor: theme.color.persimmon }]}>
                <Text style={{ color: theme.color.ivory, fontWeight: "700", fontSize: 12 }}>
                  {coachName[0]}
                </Text>
              </View>
              <Text style={{ fontFamily: tokens.font.sans, fontSize: 13, color: theme.color.ink, fontWeight: "500" }}>
                {coachName}
              </Text>
            </View>
          ) : null}

          {timings.length > 0 ? (
            <View style={[styles.section, { borderColor: theme.color.hairline }]}>
              <Text style={[styles.sectionLabel, { color: theme.color.mist }]}>SCHEDULE</Text>
              {timings.map((timing, index) => (
                <View key={index} style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 8 }}>
                  <Text style={{ fontFamily: tokens.font.sans, fontSize: 14, color: theme.color.ink, fontWeight: "500" }}>
                    {DAY_FULL[timing.day_of_week] ?? `Day ${timing.day_of_week}`}
                  </Text>
                  <Text style={{ fontFamily: tokens.font.sans, fontSize: 14, color: theme.color.mist }}>
                    {timing.start_time ? formatTime(timing.start_time) : ""}
                    {timing.duration_min ? ` · ${timing.duration_min} min` : ""}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}

          <View style={[styles.section, { borderColor: theme.color.hairline }]}>
            <Text style={[styles.sectionLabel, { color: theme.color.mist }]}>FEES</Text>
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 10 }}>
              <View>
                <Text style={{ fontFamily: theme.font.serif, fontSize: 22, color: theme.color.persimmon, fontStyle: "italic" }}>
                  {trialFee}
                </Text>
                <Text style={{ fontFamily: tokens.font.sans, fontSize: 11, color: theme.color.mist, marginTop: 3, letterSpacing: 0.4 }}>
                  TRIAL CLASS
                </Text>
              </View>
              {monthlyFee ? (
                <View>
                  <Text style={{ fontFamily: theme.font.serif, fontSize: 22, color: theme.color.ink }}>
                    {monthlyFee}
                  </Text>
                  <Text style={{ fontFamily: tokens.font.sans, fontSize: 11, color: theme.color.mist, marginTop: 3, letterSpacing: 0.4 }}>
                    MONTHLY
                  </Text>
                </View>
              ) : null}
            </View>
          </View>

          {!isEnrolled && (
            <View style={[styles.section, { borderColor: theme.color.hairline }]}>
              <Text style={[styles.sectionLabel, { color: theme.color.mist }]}>PACKAGE</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
                {PACKAGES.map((pkg) => {
                  const active = selectedPackage === pkg.key;
                  return (
                    <Pressable
                      key={pkg.key}
                      onPress={() => setSelectedPackage(pkg.key)}
                      style={{
                        paddingHorizontal: 10,
                        paddingVertical: 6,
                        borderRadius: 999,
                        borderWidth: 1,
                        borderColor: active ? theme.color.persimmon : theme.color.hairline,
                        backgroundColor: active ? theme.color.persimmonSoft : "transparent",
                      }}
                    >
                      <Text
                        style={{
                          fontFamily: tokens.font.sans,
                          fontSize: 11,
                          fontWeight: "600",
                          color: active ? theme.color.persimmon : theme.color.mist,
                        }}
                      >
                        {pkg.label}
                        {pkg.suffix ? ` · ${pkg.suffix}` : ""}
                        {pkg.badge ? ` · ${pkg.badge}` : ""}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )}

          <View style={[styles.section, { borderColor: theme.color.hairline }]}>
            <Text style={[styles.sectionLabel, { color: theme.color.mist }]}>AVAILABILITY</Text>
            <Text
              style={{
                fontFamily: tokens.font.sans,
                fontSize: 14,
                color: isFull ? theme.color.mist : theme.color.jade,
                fontWeight: "600",
                marginTop: 8,
              }}
            >
              {isFull ? "Cohort full" : `${slotsLeft} spot${slotsLeft === 1 ? "" : "s"} left`}
            </Text>
          </View>
        </ScrollView>

        <View style={{ marginTop: 16 }}>
          {isEnrolled ? (
            <Button disabled block>
              Enrolled ✓
            </Button>
          ) : (
            <Button
              onPress={handleEnroll}
              disabled={enrollBatch.isPending || isFull}
              loading={enrollBatch.isPending}
              block
            >
              Enroll in this batch
            </Button>
          )}
        </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(20,16,14,0.45)",
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 6,
    paddingBottom: 12,
  },
  pill: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  coachAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  section: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
  },
  sectionLabel: {
    fontFamily: tokens.font.sans,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.4,
  },
});
