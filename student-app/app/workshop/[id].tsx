import React, { useState } from "react";
import { View, Text, ScrollView, Pressable, StyleSheet, Alert, ToastAndroid, Platform } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useTheme, Button, Tag, Summary, SummaryRow, IconCal, IconMappin, IconUsers, IconChevL, IconHeart } from "@findemy/ui";
import { Image } from "expo-image";
import { SafeAreaView } from "react-native-safe-area-context";
import { format } from "date-fns";
import {
  useWorkshop,
  useWorkshopRegistrationStatus,
  useRegisterWorkshop,
  useCancelWorkshopRegistration,
} from "@/hooks/useWorkshops";
import { CancelSheet, type CancelSheetTarget } from "@/components/CancelSheet";
import { getWorkshopImage } from "@/lib/eventImages";

function formatRupees(paise: number): string {
  const rupees = paise / 100;
  return rupees % 1 === 0 ? `₹${rupees.toFixed(0)}` : `₹${rupees.toFixed(2)}`;
}

function showCancelToast(message: string) {
  if (Platform.OS === "android") {
    ToastAndroid.show(message, ToastAndroid.LONG);
  } else {
    Alert.alert("Registration cancelled", message);
  }
}

export default function WorkshopDetailScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [showCancelSheet, setShowCancelSheet] = useState(false);
  const [saved, setSaved] = useState(false);

  const workshopQ = useWorkshop(id);
  const regStatusQ = useWorkshopRegistrationStatus(id);
  const registerMut = useRegisterWorkshop();
  const cancelRegMut = useCancelWorkshopRegistration();

  const w = workshopQ.data?.workshop as any;
  const regStatus = regStatusQ.data;

  const isRegistered = regStatus?.registered && regStatus?.status === "confirmed";
  const isPending = regStatus?.registered && regStatus?.status === "pending";

  const handleRegister = async () => {
    try {
      const result = await registerMut.mutateAsync(id);
      if (result.requires_payment) {
        router.push(
          `/workshop/pay?registration_id=${result.registration_id}&workshop_id=${id}&title=${encodeURIComponent(w?.title ?? "")}&amount_paise=${result.amount_paise}`
        );
      } else {
        Alert.alert("Booked!", "Your spot for this workshop is confirmed.", [
          { text: "OK", onPress: () => regStatusQ.refetch() },
        ]);
      }
    } catch {
      // onError in hook handles alert
    }
  };

  const handlePayNow = async () => {
    try {
      const result = await registerMut.mutateAsync(id);
      if (result.requires_payment) {
        router.push(
          `/workshop/pay?registration_id=${result.registration_id}&workshop_id=${id}&title=${encodeURIComponent(w?.title ?? "")}&amount_paise=${result.amount_paise}`
        );
      }
    } catch { /* onError in hook handles alert */ }
  };

  if (workshopQ.isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.color.paper }}>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ fontFamily: theme.font.sans, fontSize: 13, color: theme.color.mist }}>Loading…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!w) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.color.paper }}>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 24 }}>
          <Text style={{ fontFamily: theme.font.sans, fontSize: 14, color: theme.color.mist }}>Workshop not found.</Text>
          <Pressable onPress={() => router.back()} style={{ marginTop: 16 }}>
            <Text style={{ fontFamily: theme.font.sansBold, fontSize: 14, color: theme.color.persimmon }}>Go back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const startAt = w.start_at ? new Date(w.start_at) : null;
  const dateValid = startAt && !isNaN(startAt.getTime());
  const canCancelRegistration = isRegistered && !!regStatus?.registration_id;

  const cancelTarget: CancelSheetTarget | null = startAt && w
    ? {
        title: w.title,
        subtitle: w.academy_name,
        whenLabel: format(startAt, "EEE, d MMM yyyy · h:mm a"),
        scheduledAt: startAt,
        amountPaise: w.price_paise ?? 0,
      }
    : null;

  const handleCancelRegistration = async ({
    acknowledgeNoRefund,
    reason,
  }: {
    acknowledgeNoRefund: boolean;
    reason?: string;
  }) => {
    if (!regStatus?.registration_id) return;
    try {
      const res = await cancelRegMut.mutateAsync({
        registrationId: regStatus.registration_id,
        workshopId: id,
        acknowledgeNoRefund,
        reason,
      });
      setShowCancelSheet(false);
      if (res.refund_initiated) {
        showCancelToast(`Refund of ${formatRupees(res.refund_amount_paise)} initiated — arrives in 5–7 business days.`);
      } else {
        showCancelToast("Your registration has been cancelled.");
      }
    } catch { /* onError handles */ }
  };

  const price = w.price_paise === 0 ? "Free" : `₹${Math.round(w.price_paise / 100).toLocaleString("en-IN")}`;
  const spotsLeft = (w.capacity ?? 0) - (w.registered_count ?? 0);
  const isFull = spotsLeft <= 0;
  const typeLabel = w.type === "masterclass" ? "Masterclass" : "Workshop";

  const isJoinable =
    isRegistered &&
    w.type === "online" &&
    dateValid &&
    (() => {
      const durationMin: number = w.duration_min ?? 60;
      const now = Date.now();
      return now >= startAt!.getTime() - 10 * 60 * 1000 && now <= startAt!.getTime() + durationMin * 60 * 1000;
    })();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.color.paper }} edges={["top"]}>
      <ScrollView contentContainerStyle={{ paddingBottom: 130 }}>
        {/* Hero image */}
        <View style={styles.hero}>
          <Image source={{ uri: getWorkshopImage(w.type) }} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} />
          <View style={styles.scrimTop} pointerEvents="none" />
          <View style={styles.heroBar}>
            <Pressable onPress={() => router.back()} style={[styles.roundBtn, { backgroundColor: "rgba(255,255,255,0.92)" }]}>
              <IconChevL size={20} color={theme.color.ink} />
            </Pressable>
            <Pressable onPress={() => setSaved((s) => !s)} style={[styles.roundBtn, { backgroundColor: "rgba(255,255,255,0.92)" }]}>
              <IconHeart size={19} color={saved ? theme.color.persimmon : theme.color.ink} />
            </Pressable>
          </View>
        </View>

        <View style={{ paddingHorizontal: 20, marginTop: 16 }}>
          <View style={{ flexDirection: "row", gap: 8, marginBottom: 10 }}>
            <Tag label={typeLabel} tone="marigold" />
            {w.type === "online" ? <Tag label="Online" tone="jade" /> : null}
          </View>

          {/* Title */}
          <Text style={{ fontFamily: theme.font.serif, fontSize: 32, color: theme.color.ink, lineHeight: 34, letterSpacing: -0.4 }}>
            {w.title}
          </Text>
          <Text style={{ fontFamily: theme.font.sansMedium, fontSize: 13.5, color: theme.color.mist, marginTop: 6 }}>
            {w.academy_name}
          </Text>

          {/* Key facts */}
          <Summary style={{ marginTop: 16 }}>
            <SummaryRow
              icon={<IconCal size={18} color={theme.color.persimmon} />}
              label="When"
              value={dateValid ? `${format(startAt!, "EEE, d MMM · h:mm a")}${w.duration_min ? ` · ${w.duration_min} min` : ""}` : "—"}
            />
            {w.location ? (
              <SummaryRow icon={<IconMappin size={18} color={theme.color.persimmon} />} label="Where" value={w.location} />
            ) : null}
            <SummaryRow
              icon={<IconUsers size={18} color={theme.color.persimmon} />}
              label="Spots left"
              value={isFull ? "Fully booked" : `${spotsLeft} of ${w.capacity ?? 0}`}
              last
            />
          </Summary>

          {/* About */}
          {w.description ? (
            <View style={{ marginTop: 22 }}>
              <Text style={[styles.blockLabel, { fontFamily: theme.font.sansBold, color: theme.color.whisper }]}>
                About this workshop
              </Text>
              <Text style={{ fontFamily: theme.font.sans, fontSize: 14.5, lineHeight: 23, color: theme.color.inkSoft }}>
                {w.description}
              </Text>
            </View>
          ) : null}

          {/* Cancellation policy (real: non-refundable per S4.4) */}
          <View style={[styles.policy, { backgroundColor: theme.color.paperWarm }]}>
            <Text style={{ fontFamily: theme.font.sans, fontSize: 12.5, lineHeight: 19, color: theme.color.inkSoft }}>
              <Text style={{ fontFamily: theme.font.sansBold, color: theme.color.ink }}>Cancellation: </Text>
              you can cancel any time before it starts, but workshop fees are non-refundable.
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Sticky action bar */}
      <SafeAreaView edges={["bottom"]} style={[styles.actionBar, { backgroundColor: "rgba(255,255,255,0.97)", borderTopColor: theme.color.hairline }]}>
        {regStatusQ.isLoading ? (
          <View style={{ flex: 1 }}>
            <Button disabled block>Loading…</Button>
          </View>
        ) : isJoinable ? (
          <View style={{ flex: 1 }}>
            <Button onPress={() => router.push(`/live/workshop_${id}` as any)} block variant="jade">
              Join Workshop →
            </Button>
          </View>
        ) : isRegistered ? (
          <View style={{ flex: 1 }}>
            <Button disabled block>Booked ✓</Button>
            {canCancelRegistration && (
              <Pressable onPress={() => setShowCancelSheet(true)} style={{ alignItems: "center", marginTop: 10 }}>
                <Text style={{ fontFamily: theme.font.sansBold, fontSize: 13, color: theme.color.rose }}>
                  Cancel registration
                </Text>
              </Pressable>
            )}
          </View>
        ) : isPending && w.price_paise > 0 ? (
          <View style={{ flex: 1 }}>
            <Button onPress={handlePayNow} block>Complete payment · {price}</Button>
          </View>
        ) : (
          <>
            <View style={styles.priceLead}>
              <Text style={[styles.priceL, { fontFamily: theme.font.sansBold, color: theme.color.whisper }]}>FEE</Text>
              <Text style={[styles.priceV, { fontFamily: theme.font.sansBold, color: theme.color.ink }]}>{price}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Button
                onPress={handleRegister}
                loading={registerMut.isPending}
                disabled={registerMut.isPending || isFull}
                block
              >
                {isFull ? "Workshop full" : "Register"}
              </Button>
            </View>
          </>
        )}
      </SafeAreaView>

      <CancelSheet
        visible={showCancelSheet}
        kind="workshop"
        target={cancelTarget}
        onClose={() => setShowCancelSheet(false)}
        onConfirm={handleCancelRegistration}
        submitting={cancelRegMut.isPending}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  hero: {
    height: 250,
    width: "100%",
    backgroundColor: "#E5DDC9",
    position: "relative",
  },
  scrimTop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 110,
    backgroundColor: "rgba(0,0,0,0.18)",
  },
  heroBar: {
    position: "absolute",
    top: 12,
    left: 16,
    right: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    zIndex: 3,
  },
  roundBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  blockLabel: {
    fontSize: 11,
    letterSpacing: 1.1,
    fontWeight: "700",
    marginBottom: 8,
  },
  policy: { borderRadius: 16, padding: 14, marginTop: 18 },
  actionBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 18,
    paddingTop: 14,
    borderTopWidth: 1,
  },
  priceLead: { flexShrink: 0 },
  priceL: { fontSize: 9.5, letterSpacing: 1.2, fontWeight: "700" },
  priceV: { fontSize: 19, fontWeight: "800" },
});
