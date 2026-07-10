import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, Pressable, StyleSheet, Modal, Alert } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  tokens,
  useTheme,
  Button,
  Summary,
  SummaryRow,
  IconChevL,
  IconCal,
  IconMappin,
  IconTrophy,
} from "@findemy/ui";
import { Image } from "expo-image";
import { useEvent } from "@/hooks/useEvents";
import { SafeAreaView } from "react-native-safe-area-context";
import { format } from "date-fns";
import { getEventImage } from "@/lib/eventImages";
import { ScreenHeader } from "@/components/ScreenHeader";
import { ErrorState } from "@/components/ErrorState";
import {
  useEventRegistrationStatus,
  useRegisterForEvent,
  useCancelEventRegistration,
} from "@/hooks/useEventRegistration";

function badgeFor(type: string, theme: any): { label: string; bg: string; fg: string } {
  switch (type) {
    case "competition":
      return { label: "Competition", bg: theme.color.persimmon, fg: "#fff" };
    case "talent_hunt":
      return { label: "Talent Hunt", bg: theme.color.persimmonSoft, fg: theme.color.persimmonDeep };
    case "meetup":
      return { label: "Meetup", bg: theme.color.jadeSoft, fg: theme.color.jade };
    default:
      return { label: (type ?? "Event").replace(/_/g, " "), bg: theme.color.persimmonSoft, fg: theme.color.persimmonDeep };
  }
}

function inr(paise?: number | null): string {
  const n = Math.round((paise ?? 0) / 100);
  const s = String(n);
  if (s.length <= 3) return `₹${s}`;
  const last3 = s.slice(-3);
  const rest = s.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ",");
  return `₹${rest},${last3}`;
}

function SheetHandle() {
  const theme = useTheme();
  return (
    <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: theme.color.hairline, alignSelf: "center", marginTop: 10, marginBottom: 6 }} />
  );
}

function CancelRegistrationSheet({
  visible,
  eventType,
  registrationId,
  eventId,
  onClose,
}: {
  visible: boolean;
  eventType: string;
  registrationId: string;
  eventId: string;
  onClose: () => void;
}) {
  const theme = useTheme();
  const cancelMut = useCancelEventRegistration();
  const isCompetition = eventType === "competition" || eventType === "talent_hunt";

  const handleCancel = async () => {
    try {
      await cancelMut.mutateAsync({ registrationId, eventId });
      onClose();
      Alert.alert(
        "Registration cancelled",
        isCompetition
          ? "Your registration has been cancelled."
          : "Your registration has been cancelled. Any refund will be processed within 5–7 business days."
      );
    } catch { /* onError handles */ }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={[styles.sheet, { backgroundColor: theme.color.paper }]}>
        <SheetHandle />
        <View style={{ paddingHorizontal: 24, paddingBottom: 40 }}>
          <View style={styles.titleRow}>
            <Text style={[styles.sheetTitle, { fontFamily: theme.font.serif, color: theme.color.ink }]}>
              Cancel registration?
            </Text>
            <Pressable onPress={onClose} hitSlop={12}>
              <Text style={{ fontSize: 20, color: theme.color.mist }}>✕</Text>
            </Pressable>
          </View>
          <View
            style={[
              styles.infoBox,
              {
                backgroundColor: isCompetition ? theme.color.roseSoft : theme.color.jadeSoft,
                borderColor: isCompetition ? theme.color.rose : theme.color.jade,
              },
            ]}
          >
            <Text style={{ fontFamily: theme.font.sans, fontSize: 13, color: isCompetition ? theme.color.rose : theme.color.jade, lineHeight: 19 }}>
              {isCompetition
                ? "This registration is non-refundable. You will not receive a refund for competition entries."
                : "You'll receive a full refund within 5–7 business days."}
            </Text>
          </View>
          <View style={{ gap: 10, marginTop: 18 }}>
            <Button variant="rose" block onPress={handleCancel} loading={cancelMut.isPending}>
              Cancel registration
            </Button>
            <Button variant="ghost" block onPress={onClose}>
              Keep my spot
            </Button>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const theme = useTheme();
  const { data, isLoading, error, refetch } = useEvent(id);
  const regStatus = useEventRegistrationStatus(id);
  const registerMut = useRegisterForEvent();
  const [showCancelSheet, setShowCancelSheet] = useState(false);
  const [now, setNow] = useState<number>(() => Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(interval);
  }, []);

  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.color.paper }} edges={["top"]}>
        <ScreenHeader title="Event" />
        <View style={{ padding: 24 }}>
          <Text style={{ color: theme.color.mist, fontFamily: theme.font.sans }}>Loading…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.color.paper }} edges={["top"]}>
        <ScreenHeader title="Event" />
        <ErrorState code={(error as any)?.code} onRetry={refetch} />
      </SafeAreaView>
    );
  }

  const event = (data as any)?.event ?? {};
  const start = event.start_at ? new Date(event.start_at) : null;
  const end = event.end_at ? new Date(event.end_at) : null;
  const startValid = start && !isNaN(start.getTime());
  const spotsLeft: number | null = event.spots_left ?? null;
  const pricePaise: number = event.price_paise ?? 0;
  const isFree = pricePaise === 0;
  const isCompetition = event.type === "competition" || event.type === "talent_hunt";
  const divisions: string[] = event.divisions ?? [];
  const badge = badgeFor(event.type, theme);

  const reg = regStatus.data;
  const isRegistered = reg?.registered && reg?.status === "confirmed";
  const isPending = reg?.registered && reg?.status === "pending";
  const isCancelled = reg?.registered && reg?.status === "cancelled";

  const registrationDeadline = event.registration_deadline
    ? new Date(event.registration_deadline)
    : start
    ? new Date(start.getTime() - (isCompetition ? 48 : 2) * 60 * 60 * 1000)
    : null;
  const isDeadlinePassed = registrationDeadline ? now > registrationDeadline.getTime() : false;
  const isFull = spotsLeft !== null && spotsLeft <= 0;
  const canRegister = !isRegistered && !isPending && !isDeadlinePassed && !isFull && !isCancelled;

  const handleRegister = async () => {
    try {
      const res = await registerMut.mutateAsync(id);
      if (res.requires_payment) {
        router.push(
          `/events/pay?registration_id=${res.registration_id}&event_id=${id}&title=${encodeURIComponent(event.title ?? "")}&amount_paise=${res.amount_paise}` as any
        );
      } else {
        Alert.alert("Registered!", "Your spot is confirmed.", [{ text: "OK", onPress: () => regStatus.refetch() }]);
      }
    } catch { /* onError handles */ }
  };

  const handlePayNow = () => {
    if (!reg?.registration_id) return;
    router.push(
      `/events/pay?registration_id=${reg.registration_id}&event_id=${id}&title=${encodeURIComponent(event.title ?? "")}&amount_paise=${pricePaise}` as any
    );
  };

  const canCancel = (isRegistered || isPending) && !isDeadlinePassed && !!reg?.registration_id;
  const hasBar = canRegister || isRegistered || isPending || isCancelled;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.color.paper }} edges={["top"]}>
      <ScrollView contentContainerStyle={{ paddingBottom: hasBar ? 120 : 40 }}>
        {/* Hero */}
        <View style={styles.hero}>
          <Image source={{ uri: getEventImage(event.type) }} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} />
          <View style={[StyleSheet.absoluteFill, styles.heroScrim]} pointerEvents="none" />
          <Pressable onPress={() => router.back()} style={[styles.heroBack, { backgroundColor: "rgba(255,255,255,0.92)" }]}>
            <IconChevL size={20} color={theme.color.ink} />
          </Pressable>
          <View style={styles.heroCaption}>
            <View style={[styles.badge, { backgroundColor: badge.bg }]}>
              <Text style={[styles.badgeText, { color: badge.fg }]}>{badge.label}</Text>
            </View>
            <Text style={[styles.heroTitle, { fontFamily: theme.font.serif }]}>{event.title}</Text>
          </View>
        </View>

        <View style={{ paddingHorizontal: 20, marginTop: 14 }}>
          {event.organizer_name ? (
            <Text style={{ fontFamily: theme.font.sansMedium, fontSize: 13, color: theme.color.mist }}>
              By {event.organizer_name}
            </Text>
          ) : null}

          {/* Key facts */}
          <Summary style={{ marginTop: 16 }}>
            <SummaryRow
              icon={<IconCal size={18} color={theme.color.persimmon} />}
              label="When"
              value={
                startValid
                  ? `${format(start!, "EEE, d MMM · h:mm a")}${end && !isNaN(end.getTime()) ? ` – ${format(end, "h:mm a")}` : ""}`
                  : "—"
              }
            />
            {event.location ? (
              <SummaryRow icon={<IconMappin size={18} color={theme.color.persimmon} />} label="Where" value={event.location} last={event.prize_paise == null} />
            ) : null}
            {event.prize_paise != null ? (
              <SummaryRow icon={<IconTrophy size={18} color={theme.color.persimmon} />} label="Top prize" value={inr(event.prize_paise)} last />
            ) : null}
          </Summary>

          {/* About */}
          {event.description ? (
            <View style={{ marginTop: 22 }}>
              <Text style={[styles.blockLabel, { fontFamily: theme.font.sansBold, color: theme.color.whisper }]}>About</Text>
              <Text style={{ fontFamily: theme.font.sans, fontSize: 13.5, lineHeight: 21, color: theme.color.inkSoft }}>
                {event.description}
              </Text>
            </View>
          ) : null}

          {/* Categories / divisions */}
          {divisions.length > 0 ? (
            <View style={{ marginTop: 22 }}>
              <Text style={[styles.blockLabel, { fontFamily: theme.font.sansBold, color: theme.color.whisper }]}>Categories</Text>
              <View style={styles.chips}>
                {divisions.map((d) => (
                  <View key={d} style={[styles.chip, { borderColor: theme.color.hairline }]}>
                    <Text style={{ fontFamily: theme.font.sansMedium, fontSize: 13, color: theme.color.inkSoft }}>{d}</Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          {/* Spots note (real data) */}
          {spotsLeft != null ? (
            <Text style={{ fontFamily: theme.font.sansMedium, fontSize: 12.5, color: spotsLeft <= 5 ? theme.color.persimmon : theme.color.mist, marginTop: 18 }}>
              {spotsLeft > 0 ? `${spotsLeft} spot${spotsLeft === 1 ? "" : "s"} left` : "Fully booked"}
            </Text>
          ) : null}
        </View>
      </ScrollView>

      {/* Action bar */}
      {hasBar && (
        <SafeAreaView edges={["bottom"]} style={[styles.actionBar, { backgroundColor: "rgba(255,255,255,0.97)", borderTopColor: theme.color.hairline }]}>
          {isRegistered ? (
            <View style={{ flex: 1 }}>
              <Button variant="jade" block disabled>Registered ✓</Button>
              {canCancel && (
                <Pressable onPress={() => setShowCancelSheet(true)} style={{ alignItems: "center", marginTop: 10 }}>
                  <Text style={{ fontFamily: theme.font.sansBold, fontSize: 13, color: theme.color.rose }}>Cancel registration</Text>
                </Pressable>
              )}
            </View>
          ) : isPending && !isFree ? (
            <View style={{ flex: 1 }}>
              <Button onPress={handlePayNow} block>Complete payment · {inr(pricePaise)}</Button>
            </View>
          ) : isCancelled ? (
            <View style={[styles.cancelledBadge, { backgroundColor: theme.color.bone, borderColor: theme.color.hairline }]}>
              <Text style={{ fontFamily: theme.font.sans, fontSize: 13, color: theme.color.mist }}>Registration cancelled</Text>
            </View>
          ) : isDeadlinePassed || isFull ? (
            <View style={{ flex: 1 }}>
              <Button disabled block>{isFull ? "Event full" : "Registration closed"}</Button>
            </View>
          ) : (
            <>
              <View style={styles.priceLead}>
                <Text style={[styles.priceL, { fontFamily: theme.font.sansBold, color: theme.color.whisper }]}>ENTRY</Text>
                <Text style={[styles.priceV, { fontFamily: theme.font.sansBold, color: theme.color.ink }]}>{isFree ? "Free" : inr(pricePaise)}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Button onPress={handleRegister} loading={registerMut.isPending} disabled={registerMut.isPending} block>
                  Register
                </Button>
              </View>
            </>
          )}
        </SafeAreaView>
      )}

      {reg?.registration_id && (
        <CancelRegistrationSheet
          visible={showCancelSheet}
          eventType={event.type}
          registrationId={reg.registration_id}
          eventId={id}
          onClose={() => setShowCancelSheet(false)}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  hero: { height: 270, width: "100%", backgroundColor: "#E5DDC9", position: "relative", justifyContent: "flex-end" },
  heroScrim: { backgroundColor: "rgba(0,0,0,0.28)" },
  heroBack: {
    position: "absolute",
    top: 12,
    left: 16,
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  heroCaption: { padding: 18, position: "relative", zIndex: 2 },
  badge: { alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  badgeText: { fontSize: 10.5, fontWeight: "700", letterSpacing: 0.6 },
  heroTitle: {
    color: "#fff",
    fontSize: 30,
    lineHeight: 32,
    marginTop: 8,
    textShadowColor: "rgba(0,0,0,0.6)",
    textShadowRadius: 12,
    textShadowOffset: { width: 0, height: 2 },
  },
  blockLabel: { fontSize: 11, letterSpacing: 1.1, fontWeight: "700", marginBottom: 8 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  chip: { borderWidth: 1.5, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 9, backgroundColor: "#fff" },
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
  backdrop: { flex: 1, backgroundColor: "rgba(20,16,14,0.45)" },
  sheet: {
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    shadowColor: tokens.shadow.md.shadowColor,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 10,
  },
  titleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 14 },
  sheetTitle: { fontSize: 22 },
  infoBox: { borderRadius: 12, borderWidth: 1, padding: 14 },
  cancelledBadge: { flex: 1, borderWidth: 1, borderRadius: 12, paddingVertical: 14, alignItems: "center" },
});
