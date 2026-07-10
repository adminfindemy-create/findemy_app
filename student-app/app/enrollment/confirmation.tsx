import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useTheme, Button, Summary, SummaryRow, IconCheck, IconCal, IconClock } from "@findemy/ui";
import { SafeAreaView } from "react-native-safe-area-context";
import { useEnrollmentDetail } from "@/hooks/useEnrollmentDetail";

const PACKAGE_LABELS: Record<string, { label: string; months: number }> = {
  monthly: { label: "Monthly", months: 1 },
  quarterly: { label: "Quarterly", months: 3 },
  annual: { label: "Annual", months: 12 },
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// YYYY-MM-DD (or ISO) -> "22 Jun 2026"; avoids Hermes Intl locale gaps.
function formatDate(iso: string | null | undefined) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export default function EnrollmentConfirmationScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { enrollment_id, batch_title } = useLocalSearchParams<{
    enrollment_id: string;
    batch_title: string;
  }>();
  const [timedOut, setTimedOut] = useState(false);

  const detail = useEnrollmentDetail(enrollment_id ?? "");
  const enrollment = (detail.data as any)?.enrollment;
  const isActive = enrollment?.status === "active";

  useEffect(() => {
    if (isActive) return;
    const interval = setInterval(() => detail.refetch(), 2000);
    const timeout = setTimeout(() => {
      clearInterval(interval);
      setTimedOut(true);
    }, 30_000);
    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [isActive, detail.refetch]);

  if (!isActive && !timedOut) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.color.paper }}>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24 }}>
          <Text style={{ fontFamily: theme.font.sans, fontSize: 15, color: theme.color.mist }}>
            Confirming your enrollment…
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (timedOut && !isActive) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.color.paper }}>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24 }}>
          <Text
            style={{
              fontFamily: theme.font.sans,
              fontSize: 15,
              color: theme.color.mist,
              textAlign: "center",
              lineHeight: 21,
            }}
          >
            Still processing. You'll receive a notification when your enrollment is confirmed.
          </Text>
          <View style={{ marginTop: 24, alignSelf: "stretch", paddingHorizontal: 20 }}>
            <Button onPress={() => router.replace("/(tabs)/classes")} block>
              Done
            </Button>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  const period = enrollment?.current_period ?? enrollment?.periods?.[0];
  const packageType = period?.package_type ?? "monthly";
  const pkgInfo = PACKAGE_LABELS[packageType] ?? PACKAGE_LABELS.monthly;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.color.paper }}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }}>
        {/* Success hero */}
        <View style={styles.hero}>
          <View style={[styles.mark, { backgroundColor: theme.color.jade }]}>
            <IconCheck size={30} color={theme.color.ivory} />
          </View>
          <Text
            style={{
              fontFamily: theme.font.serif,
              fontSize: 34,
              color: theme.color.ink,
              lineHeight: 38,
              letterSpacing: -0.5,
              textAlign: "center",
              marginTop: 18,
            }}
          >
            {"You're "}
            <Text style={{ fontFamily: theme.font.serifItalic, color: theme.color.jade }}>enrolled</Text>
            {"!"}
          </Text>
          <Text
            style={{
              fontFamily: theme.font.sans,
              fontSize: 13.5,
              color: theme.color.inkSoft,
              textAlign: "center",
              lineHeight: 20,
              marginTop: 10,
              paddingHorizontal: 20,
            }}
          >
            Welcome to{" "}
            <Text style={{ fontFamily: theme.font.sansBold, color: theme.color.ink }}>
              {batch_title ?? "your class"}
            </Text>
            . Find your schedule and join classes under Classes.
          </Text>
        </View>

        <Summary>
          <SummaryRow
            icon={<IconCal size={18} color={theme.color.jade} />}
            label="Class"
            value={batch_title ?? "—"}
          />
          {period?.start_date ? (
            <SummaryRow
              icon={<IconCal size={18} color={theme.color.jade} />}
              label="Starts"
              value={formatDate(period.start_date)}
            />
          ) : null}
          <SummaryRow
            icon={<IconClock size={18} color={theme.color.jade} />}
            label="Plan"
            value={`${pkgInfo.label} · ${pkgInfo.months} month${pkgInfo.months > 1 ? "s" : ""} · auto-renews`}
            last
          />
        </Summary>

        {/* Actions */}
        <View style={{ marginTop: 24, gap: 10 }}>
          <Button onPress={() => router.replace("/(tabs)/classes")} block variant="jade">
            View my classes
          </Button>
          <Button onPress={() => router.replace("/(tabs)")} block variant="ghost">
            Back to discover
          </Button>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  hero: {
    alignItems: "center",
    paddingTop: 48,
    paddingBottom: 28,
  },
  mark: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
  },
});
