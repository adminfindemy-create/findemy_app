import React, { useMemo, useState } from "react";
import { View, Text, ScrollView, Pressable, Alert, StyleSheet } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import {
  tokens,
  useTheme,
  Button,
  BlockPrintCover,
  Summary,
  SummaryRow,
  ActionBar,
  IconCal,
  IconClock,
} from "@findemy/ui";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { PLAN_MONTHS, DISCOUNT_BPS_CAP, type Plan } from "@findemy/types";
import { useProgram } from "@/hooks/useProgram";
import { enrichProgram } from "@/lib/programs";
import { useEnrollBatch } from "@/hooks/useEnroll";
import { ScreenHeader } from "@/components/ScreenHeader";
import { OptionRow } from "@/components/OptionRow";
import { ErrorState } from "@/components/ErrorState";
import { SkeletonLoader } from "@/components/SkeletonLoader";

const DAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// Indian-grouped rupees from paise (e.g. 3072000 -> "₹30,720").
function inr(paise: number): string {
  const n = Math.round((paise ?? 0) / 100);
  const s = String(n);
  if (s.length <= 3) return `₹${s}`;
  const last3 = s.slice(-3);
  const rest = s.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ",");
  return `₹${rest},${last3}`;
}

// S5: plan pricing computed client-side to mirror the server's getRenewalOptions
// (renewal-options requires an existing enrollment, so it can't be used pre-enroll).
type PlanPrice = {
  key: Plan;
  label: string;
  badge?: string;
  months: number;
  amount: number; // paise
  perMonth: number; // paise
  discountPct: number;
};

const PLAN_META: { key: Plan; label: string; badge?: string }[] = [
  { key: "monthly", label: "Monthly" },
  { key: "quarterly", label: "Quarterly", badge: "Popular" },
  { key: "annual", label: "Annual", badge: "Best value" },
];

function planPricing(monthlyPaise: number, qBps: number, aBps: number): PlanPrice[] {
  return PLAN_META.map(({ key, label, badge }) => {
    const months = PLAN_MONTHS[key];
    const rawBps = key === "quarterly" ? qBps : key === "annual" ? aBps : 0;
    const bps = Math.min(rawBps, DISCOUNT_BPS_CAP);
    const gross = monthlyPaise * months;
    const amount = gross - Math.floor((gross * bps) / 10000);
    return {
      key,
      label,
      badge,
      months,
      amount,
      perMonth: Math.floor(amount / months),
      discountPct: bps / 100,
    };
  });
}

function planSub(p: PlanPrice): string {
  if (p.key === "monthly") return `${inr(p.amount)}/mo · Billed monthly`;
  const term = p.months === 12 ? "yr" : `${p.months} mo`;
  const save = p.discountPct > 0 ? ` · save ${p.discountPct}%` : "";
  const badge = p.badge ? ` · ${p.badge}` : "";
  return `${inr(p.amount)} / ${term} · ${inr(p.perMonth)}/mo${save}${badge}`;
}

function formatBatchSummary(timings: any[]): { days: string; time: string } {
  if (!timings?.length) return { days: "", time: "" };
  const days = [...new Set(timings.map((t) => t.day_of_week))]
    .sort()
    .map((d) => DAY_SHORT[d])
    .join(" · ");
  const t = timings[0];
  if (!t.start_time) return { days, time: "" };
  const [h, m] = t.start_time.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  const startStr = `${hour}:${String(m).padStart(2, "0")} ${ampm}`;
  if (!t.duration_min) return { days, time: startStr };
  const endMin = h * 60 + m + t.duration_min;
  const endH = Math.floor(endMin / 60) % 24;
  const endM = endMin % 60;
  const endAmpm = endH >= 12 ? "PM" : "AM";
  const endHour = endH % 12 || 12;
  return {
    days,
    time: `${startStr} – ${endHour}:${String(endM).padStart(2, "0")} ${endAmpm}`,
  };
}

export default function EnrollSelectScreen() {
  const router = useRouter();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { id, batch_id } = useLocalSearchParams<{
    id: string;
    academy_id?: string;
    batch_id: string;
  }>();

  const { data, error, isLoading, refetch } = useProgram(id);
  const enrollBatch = useEnrollBatch();

  const [selectedPlan, setSelectedPlan] = useState<Plan>("quarterly");
  const [paying, setPaying] = useState(false);

  const academy = data?.academy as any;

  const program = useMemo(
    () => (data?.program ? enrichProgram(data.program) : null),
    [data]
  );

  const batch = useMemo(
    () => program?.batches.find((b: any) => b.id === batch_id) ?? null,
    [program, batch_id]
  );

  const coachName = (batch as any)?.coach_name ?? null;

  const monthlyPaise = batch?.monthly_fee_paise
    ? Number(batch.monthly_fee_paise)
    : program?.monthly_fee_paise_from
    ? Number(program.monthly_fee_paise_from)
    : 0;

  const plans = useMemo(
    () =>
      planPricing(
        monthlyPaise,
        Number((batch as any)?.quarterly_discount_bps ?? 0),
        Number((batch as any)?.annual_discount_bps ?? 0)
      ),
    [monthlyPaise, batch]
  );

  const selected = plans.find((p) => p.key === selectedPlan) ?? plans[0];
  const { days, time } = formatBatchSummary(batch?.timings ?? []);

  const handlePay = async () => {
    if (!batch) return;
    setPaying(true);
    try {
      const result = await enrollBatch.mutateAsync({ batchId: batch.id, package_type: selectedPlan });
      if (result.requires_payment) {
        router.push(
          `/enrollment/pay?enrollment_id=${result.enrollment_id}&enrollment_period_id=${result.enrollment_period_id}&razorpay_order_id=${result.razorpay_order_id}&razorpay_key=${result.razorpay_key}&amount_paise=${result.amount_paise}&batch_title=${encodeURIComponent(batch.title ?? "")}&package_type=${selectedPlan}&flow=enroll` as any
        );
      } else {
        router.replace("/enrollments");
      }
    } catch (e: any) {
      Alert.alert("Enrollment failed", e?.message ?? "Please try again.");
    } finally {
      setPaying(false);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.color.paper }} edges={["top"]}>
        <ScreenHeader title="Enrol" />
        <View style={{ padding: 20, gap: 12 }}>
          <SkeletonLoader height={90} borderRadius={20} />
          <SkeletonLoader height={64} borderRadius={16} />
          <SkeletonLoader height={64} borderRadius={16} />
          <SkeletonLoader height={64} borderRadius={16} />
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.color.paper }} edges={["top"]}>
        <ScreenHeader title="Enrol" />
        <ErrorState code={(error as any)?.code} onRetry={refetch} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.color.paper }} edges={["top"]}>
      <ScreenHeader title="Enrol" />

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 130 }}>
        {/* Read-only batch card */}
        <View
          style={[
            styles.batchCard,
            { backgroundColor: "#fff", borderColor: theme.color.hairline, ...theme.shadow.sm },
          ]}
        >
          <BlockPrintCover
            category={(academy?.category ?? program?.category ?? "music") as any}
            variant={1}
            height={48}
            hideLetter
            style={{ width: 48, height: 48, borderRadius: 12, overflow: "hidden" }}
          />
          <View style={{ flex: 1, marginLeft: 12, minWidth: 0 }}>
            <Text
              style={{ fontFamily: theme.font.serif, fontSize: 16, color: theme.color.ink }}
              numberOfLines={1}
            >
              {program?.title ?? "Program"}
            </Text>
            <Text
              style={{ fontFamily: theme.font.sansMedium, fontSize: 12, color: theme.color.mist, marginTop: 2 }}
              numberOfLines={1}
            >
              {[academy?.name, coachName].filter(Boolean).join(" · ")}
            </Text>
          </View>
        </View>

        {/* Your batch (read-only) + Change */}
        <View style={styles.sectionHead}>
          <Text style={[styles.sectionLabel, { color: theme.color.whisper, fontFamily: theme.font.sansBold }]}>
            YOUR BATCH
          </Text>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <Text style={{ fontFamily: theme.font.sansBold, fontSize: 12.5, color: theme.color.persimmon }}>
              Change
            </Text>
          </Pressable>
        </View>
        <Summary>
          <SummaryRow
            icon={<IconCal size={18} color={theme.color.persimmon} />}
            label="Batch"
            value={days || "—"}
          />
          <SummaryRow
            icon={<IconClock size={18} color={theme.color.persimmon} />}
            label="Timing"
            value={time || "—"}
            last
          />
        </Summary>

        {/* Choose a plan */}
        <Text
          style={[
            styles.sectionLabel,
            { color: theme.color.whisper, fontFamily: theme.font.sansBold, marginTop: 22, marginBottom: 10 },
          ]}
        >
          CHOOSE A PLAN
        </Text>
        {plans.map((p) => (
          <OptionRow
            key={p.key}
            selected={selectedPlan === p.key}
            onPress={() => setSelectedPlan(p.key)}
            title={p.label}
            sub={planSub(p)}
          />
        ))}

        {/* Policy */}
        <View style={[styles.policy, { backgroundColor: theme.color.paperWarm }]}>
          <Text style={{ fontFamily: theme.font.sans, fontSize: 12.5, lineHeight: 19, color: theme.color.inkSoft }}>
            <Text style={{ fontFamily: theme.font.sansBold, color: theme.color.ink }}>Auto-renews each cycle. </Text>
            Pause, transfer or discontinue anytime from Your Classes. Cancel before renewal to avoid charges.
          </Text>
        </View>
      </ScrollView>

      <ActionBar priceLabel="TOTAL" priceValue={inr(selected?.amount ?? 0)} bottomInset={insets.bottom}>
        <Button
          block
          onPress={handlePay}
          loading={paying || enrollBatch.isPending}
          disabled={paying || enrollBatch.isPending || !batch}
        >
          Proceed to payment
        </Button>
      </ActionBar>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  batchCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 20,
    borderWidth: 1,
    padding: 14,
    marginTop: 4,
  },
  sectionHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 22,
    marginBottom: 10,
  },
  sectionLabel: {
    fontSize: 11,
    letterSpacing: 1.1,
    fontWeight: "700",
  },
  policy: { borderRadius: 16, padding: 14, marginTop: 18 },
});
