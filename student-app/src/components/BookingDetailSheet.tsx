import React from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Alert,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useTheme, Button } from "@findemy/ui";
import { BottomSheet } from "@/components/BottomSheet";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { api } from "@/lib/api";
import { format } from "date-fns";
import { WORKSHOP_TYPE_COLORS } from "@/lib/typeColors";

export type BookingType = "trial" | "workshop" | "enrollment";

export type BookingItem = {
  key: string;
  type: BookingType;
  sortDate: number;
  data: any;
};

function paise(amountPaise: number | null | undefined): string | null {
  if (amountPaise == null || isNaN(amountPaise)) return null;
  return `₹${Math.round(amountPaise / 100).toLocaleString("en-IN")}`;
}

function SectionDivider() {
  const theme = useTheme();
  return <View style={[styles.divider, { backgroundColor: theme.color.hairline }]} />;
}

function RowLabel({ label, theme }: { label: string; theme: any }) {
  return (
    <Text style={[styles.rowLabel, { fontFamily: theme.font.sans, color: theme.color.mist }]}>
      {label}
    </Text>
  );
}

function SLabel({ text, theme }: { text: string; theme: any }) {
  return (
    <Text style={[styles.sLabel, { fontFamily: theme.font.sans, color: theme.color.mist }]}>
      {text}
    </Text>
  );
}

type Props = {
  visible: boolean;
  onClose: () => void;
  item: BookingItem | null;
};

export function BookingDetailSheet({ visible, onClose, item }: Props) {
  const theme = useTheme();
  const router = useRouter();

  const type = item?.type;
  const data = item?.data ?? {};

  // Lazy fetch: trial booking detail for bill breakdown
  const bookingId: string =
    type === "trial" ? (data.booking_id ?? data.bookingId ?? "") : "";
  const { data: bookingRes, isLoading: bookingLoading } = useQuery({
    queryKey: ["booking", bookingId],
    queryFn: () => api.bookings.get({ id: bookingId }),
    enabled: type === "trial" && visible && !!bookingId,
    staleTime: 5 * 60 * 1000,
  });
  const booking = (bookingRes as any)?.booking as any;

  // Lazy fetch: workshop detail for location
  const workshopId: string =
    type === "workshop" ? (data.workshop_id ?? "") : "";
  const { data: workshopRes } = useQuery({
    queryKey: ["workshops", workshopId],
    queryFn: () => api.workshops.get(workshopId),
    enabled: type === "workshop" && visible && !!workshopId,
    staleTime: 5 * 60 * 1000,
  });
  const workshop = (workshopRes as any)?.workshop as any;

  // ── Derived display values ────────────────────────────────────────
  let typePillBg: string;
  let typePillFg: string;
  let typePillLabel: string;

  if (type === "trial") {
    typePillBg = theme.color.persimmonSoft;
    typePillFg = theme.color.persimmon;
    typePillLabel = "TRIAL";
  } else if (type === "enrollment") {
    typePillBg = theme.color.jadeSoft;
    typePillFg = theme.color.jade;
    typePillLabel = "ENROLLMENT";
  } else {
    const workshopType = (data.workshop_type ?? "demo").toLowerCase();
    const workshopTypeColor = WORKSHOP_TYPE_COLORS[workshopType] ?? WORKSHOP_TYPE_COLORS.demo;
    typePillBg = workshopTypeColor.bg;
    typePillFg = workshopTypeColor.fg;
    typePillLabel = (data.workshop_type ?? "WORKSHOP").toUpperCase();
  }

  const status: string = data.status ?? "";
  let statusBg: string;
  let statusFg: string;
  const statusLower = status.toLowerCase();
  if (["booked", "confirmed", "active"].includes(statusLower)) {
    statusBg = theme.color.jadeSoft;
    statusFg = theme.color.jade;
  } else if (["attended", "completed"].includes(statusLower)) {
    statusBg = theme.color.bone;
    statusFg = theme.color.mist;
  } else if (["missed", "cancelled"].includes(statusLower)) {
    statusBg = theme.color.roseSoft;
    statusFg = theme.color.rose;
  } else {
    statusBg = theme.color.bone;
    statusFg = theme.color.mist;
  }

  let title = "";
  let subtitle = "";
  let dateStr = "";
  let location = "";
  let coachName = "";
  let orderId = "";

  if (type === "trial") {
    title = data.batch_title ?? "—";
    subtitle = data.academy_name ?? "";
    const at = data.scheduled_at ?? data.trial_at ?? data.trialAt;
    dateStr = at ? format(new Date(at), "EEE, d MMM yyyy · h:mm a") : "";
    location = data.academy_address ?? "";
    coachName = data.coach_name ?? "";
    orderId = booking?.booking_code ?? booking?.razorpay_order_id ?? "";
  } else if (type === "workshop") {
    title = data.workshop_title ?? "—";
    subtitle = `By ${data.academy_name ?? ""}`;
    dateStr = data.start_at ? format(new Date(data.start_at), "EEE, d MMM yyyy · h:mm a") : "";
    location =
      workshop?.location ??
      (data.workshop_type === "online" ? "Online" : "");
    orderId = `WS-${data.id?.slice(-6)?.toUpperCase() ?? ""}`;
  } else if (type === "enrollment") {
    title = data.batch_title ?? "—";
    subtitle = data.academy_name ?? "";
    dateStr = data.started_at ? `Enrolled ${format(new Date(data.started_at), "d MMM yyyy")}` : "";
    location = data.academy_address ?? "";
    coachName = data.coach_name ?? "";
    orderId = data.id ?? "";
  }

  // Bill values
  const trialFee = booking?.trial_fee_paise ?? booking?.fee_paise ?? null;
  const discount = booking?.discount_paise ?? null;
  const totalPaid =
    booking?.total_paise ??
    booking?.amount_paise ??
    (type === "workshop" && data.price_paise > 0 ? data.price_paise : null) ??
    null;
  const workshopIsFree = type === "workshop" && (data.price_paise ?? 0) === 0;

  // Payment fields
  const paidAt = booking?.paid_at ?? booking?.created_at ?? null;
  const paymentMethod = booking?.payment_method ?? (booking?.razorpay_order_id ? "Razorpay" : null);
  const showPayment =
    type === "enrollment"
      ? false
      : workshopIsFree
      ? false
      : true;

  return (
    <BottomSheet visible={visible} onClose={onClose} heightPct={85}>
        {/* Close */}
        <Pressable onPress={onClose} style={styles.closeBtn} hitSlop={10}>
          <Text style={{ fontSize: 16, color: theme.color.mist }}>✕</Text>
        </Pressable>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* ── Header ── */}
          <View style={styles.headerRow}>
            <View style={[styles.pill, { backgroundColor: typePillBg }]}>
              <Text style={[styles.pillText, { color: typePillFg }]}>{typePillLabel}</Text>
            </View>
            <View style={[styles.pill, { backgroundColor: statusBg, marginLeft: 8 }]}>
              <Text style={[styles.pillText, { color: statusFg }]}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </Text>
            </View>
          </View>

          <Text style={[styles.title, { fontFamily: theme.font.serif, color: theme.color.ink }]}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={[styles.subtitle, { fontFamily: theme.font.sans, color: theme.color.mist }]}>
              {subtitle}
            </Text>
          ) : null}

          {/* ── When & Where ── */}
          {(dateStr || location || coachName) && (
            <>
              <SectionDivider />
              <SLabel text="WHEN & WHERE" theme={theme} />
              {dateStr ? (
                <Text style={[styles.infoLine, { fontFamily: theme.font.sans, color: theme.color.inkSoft }]}>
                  {dateStr}
                </Text>
              ) : null}
              {location ? (
                <View style={styles.locationRow}>
                  <Text style={{ fontSize: 12, color: theme.color.mist }}>📍</Text>
                  <Text
                    style={[styles.locationText, { fontFamily: theme.font.sans, color: theme.color.mist }]}
                    numberOfLines={2}
                  >
                    {location}
                  </Text>
                </View>
              ) : null}
              {coachName ? (
                <View style={styles.detailRow}>
                  <RowLabel label="Coach" theme={theme} />
                  <Text style={[styles.detailVal, { fontFamily: theme.font.sans, color: theme.color.inkSoft }]}>
                    {coachName}
                  </Text>
                </View>
              ) : null}
            </>
          )}

          {/* ── Bill Summary ── */}
          {type === "enrollment" ? (
            <>
              <SectionDivider />
              <SLabel text="FEE" theme={theme} />
              <View style={styles.detailRow}>
                <RowLabel label="Monthly fee" theme={theme} />
                <Text style={[styles.detailVal, { fontFamily: theme.font.sans, color: theme.color.inkSoft }]}>
                  {data.monthly_fee_paise
                    ? `₹${Math.round(data.monthly_fee_paise / 100).toLocaleString("en-IN")}/mo`
                    : "—"}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <RowLabel label="Status" theme={theme} />
                <Text style={[styles.detailVal, { fontFamily: theme.font.sans, color: theme.color.jade, fontWeight: "600" }]}>
                  Active Enrollment
                </Text>
              </View>
            </>
          ) : workshopIsFree ? (
            <>
              <SectionDivider />
              <View style={[styles.freeBadge, { backgroundColor: theme.color.jadeSoft }]}>
                <Text style={[styles.freeText, { fontFamily: theme.font.sans, color: theme.color.jade }]}>
                  Free — no payment required
                </Text>
              </View>
            </>
          ) : (
            <>
              <SectionDivider />
              <SLabel text="BILL SUMMARY" theme={theme} />
              {bookingLoading ? (
                <View style={{ paddingVertical: 14, alignItems: "center" }}>
                  <ActivityIndicator size="small" color={theme.color.mist} />
                </View>
              ) : (
                <>
                  {type === "trial" && trialFee != null ? (
                    <View style={styles.billRow}>
                      <RowLabel label="Trial class fee" theme={theme} />
                      <Text style={[styles.billAmt, { fontFamily: theme.font.sans, color: theme.color.inkSoft }]}>
                        {paise(trialFee)}
                      </Text>
                    </View>
                  ) : null}
                  {type === "workshop" && data.price_paise > 0 ? (
                    <View style={styles.billRow}>
                      <RowLabel label="Workshop fee" theme={theme} />
                      <Text style={[styles.billAmt, { fontFamily: theme.font.sans, color: theme.color.inkSoft }]}>
                        {paise(data.price_paise)}
                      </Text>
                    </View>
                  ) : null}
                  {discount != null && discount > 0 ? (
                    <View style={styles.billRow}>
                      <RowLabel label="Discount" theme={theme} />
                      <Text style={[styles.billAmt, { fontFamily: theme.font.sans, color: theme.color.jade }]}>
                        − {paise(discount)}
                      </Text>
                    </View>
                  ) : null}
                  {totalPaid != null ? (
                    <>
                      <View style={[styles.billDivider, { backgroundColor: theme.color.hairline }]} />
                      <View style={styles.billRow}>
                        <Text style={[styles.totalLabel, { fontFamily: theme.font.sans, color: theme.color.ink }]}>
                          Total paid
                        </Text>
                        <Text style={[styles.totalAmt, { fontFamily: theme.font.serif, color: theme.color.persimmon }]}>
                          {paise(totalPaid)}
                        </Text>
                      </View>
                    </>
                  ) : null}
                </>
              )}
            </>
          )}

          {/* ── Payment ── */}
          {showPayment && (
            <>
              <SectionDivider />
              <SLabel text="PAYMENT" theme={theme} />
              <View style={styles.detailRow}>
                <RowLabel label="Status" theme={theme} />
                <Text
                  style={[
                    styles.detailVal,
                    {
                      fontFamily: theme.font.sans,
                      color: ["confirmed", "active", "attended", "completed"].includes(statusLower)
                        ? theme.color.jade
                        : theme.color.mist,
                      fontWeight: "600",
                    },
                  ]}
                >
                  {["confirmed", "active", "attended", "completed"].includes(statusLower) ? "✓ Paid" : status}
                </Text>
              </View>
              {orderId ? (
                <View style={styles.detailRow}>
                  <RowLabel label="Order ID" theme={theme} />
                  <Text
                    style={[styles.detailVal, { fontFamily: theme.font.sans, color: theme.color.inkSoft }]}
                    numberOfLines={1}
                  >
                    {orderId}
                  </Text>
                </View>
              ) : null}
              {paidAt ? (
                <View style={styles.detailRow}>
                  <RowLabel label="Paid on" theme={theme} />
                  <Text style={[styles.detailVal, { fontFamily: theme.font.sans, color: theme.color.inkSoft }]}>
                    {format(new Date(paidAt), "d MMM yyyy, h:mm a")}
                  </Text>
                </View>
              ) : null}
              {paymentMethod ? (
                <View style={styles.detailRow}>
                  <RowLabel label="Method" theme={theme} />
                  <Text style={[styles.detailVal, { fontFamily: theme.font.sans, color: theme.color.inkSoft }]}>
                    {paymentMethod}
                  </Text>
                </View>
              ) : null}
            </>
          )}

          {/* ── Manage / Get Help ── */}
          {(() => {
            const isTerminal = ["cancelled", "attended", "completed", "missed"].includes(statusLower);
            if (isTerminal) return null;

            if (type === "trial" && data.id && statusLower === "booked") {
              return (
                <View style={styles.helpBtn}>
                  <Button
                    onPress={() => {
                      onClose();
                      router.push(`/trials/${data.id}` as any);
                    }}
                    block
                  >
                    Manage trial
                  </Button>
                </View>
              );
            }

            if (type === "workshop" && workshopId && (statusLower === "confirmed" || statusLower === "pending")) {
              return (
                <View style={styles.helpBtn}>
                  <Button
                    onPress={() => {
                      onClose();
                      router.push(`/workshop/${workshopId}` as any);
                    }}
                    block
                  >
                    {statusLower === "pending" ? "Complete registration" : "Manage registration"}
                  </Button>
                </View>
              );
            }

            return null;
          })()}

          <View style={styles.helpBtn}>
            <Button
              variant="ghost"
              onPress={() =>
                Alert.alert(
                  "Help & Support",
                  "Raise a support request — coming soon. You can also reach us at support@findemy.in.",
                  [{ text: "OK" }]
                )
              }
              block
              style={{ borderWidth: 1, borderColor: theme.color.hairline }}
            >
              Get Help
            </Button>
          </View>
        </ScrollView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  closeBtn: {
    position: "absolute",
    top: 20,
    right: 24,
    zIndex: 10,
  },
  scrollContent: {
    paddingTop: 4,
    paddingBottom: 8,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    marginBottom: 10,
  },
  pill: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
  },
  pillText: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.6,
  },
  title: {
    fontSize: 22,
    lineHeight: 26,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    marginBottom: 2,
  },
  divider: {
    height: 1,
    marginVertical: 16,
  },
  sLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginBottom: 10,
  },
  infoLine: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 6,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 5,
    marginBottom: 6,
  },
  locationText: {
    fontSize: 12,
    lineHeight: 17,
    flex: 1,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  rowLabel: {
    fontSize: 13,
  },
  detailVal: {
    fontSize: 13,
    maxWidth: "55%",
    textAlign: "right",
  },
  billRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  billAmt: {
    fontSize: 13,
  },
  billDivider: {
    height: 1,
    marginVertical: 10,
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: "600",
  },
  totalAmt: {
    fontSize: 20,
    lineHeight: 24,
  },
  freeBadge: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: "center",
    marginVertical: 8,
  },
  freeText: {
    fontSize: 13,
    fontWeight: "600",
  },
  helpBtn: {
    marginTop: 20,
  },
});
