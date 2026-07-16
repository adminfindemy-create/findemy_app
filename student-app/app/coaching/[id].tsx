import React from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useTheme, Button, Summary, SummaryRow, StatusBanner, IconCal, IconClock, IconMappin, IconWa, IconCheck, IconX } from "@findemy/ui";
import { SafeAreaView } from "react-native-safe-area-context";
import { format } from "date-fns";
import { ScreenHeader } from "@/components/common/ScreenHeader";
import { ErrorState } from "@/components/common/ErrorState";
import { SkeletonLoader } from "@/components/common/SkeletonLoader";
import { useCoachBooking } from "@/hooks/useCoaching";
import { formatRupees } from "@/lib/format";
import { openWhatsApp } from "@/lib/whatsapp";

// M4.2: request detail/status screen — pending, accepted (→ pay), rejected,
// and completed (outcome + refund, from M4.1b, landing concurrently).

// Soft UX nudge, not a hard business rule — brief calls this "a short window".
const WAITING_NUDGE_MS = 15 * 60 * 1000;

const END_REASON_LABEL: Record<string, string> = {
	completed: "Completed",
	student_left: "You left early",
	coach_left: "Coach left early",
	no_show: "No-show",
	academy_no_fulfill: "Academy couldn't fulfil",
};

export default function CoachingDetailScreen() {
	const router = useRouter();
	const theme = useTheme();
	const { id, coachPhone } = useLocalSearchParams<{ id: string; coachPhone?: string }>();
	const { data, isLoading, error, refetch } = useCoachBooking(id ?? "");
	const booking = (data as any)?.booking;

	if (isLoading) {
		return (
			<SafeAreaView style={{ flex: 1, backgroundColor: theme.color.paper }} edges={["top"]}>
				<ScreenHeader title="Session request" />
				<View style={{ padding: 20, gap: 12 }}>
					<SkeletonLoader height={60} borderRadius={16} />
					<SkeletonLoader height={180} borderRadius={20} />
				</View>
			</SafeAreaView>
		);
	}

	if (error || !booking) {
		return (
			<SafeAreaView style={{ flex: 1, backgroundColor: theme.color.paper }} edges={["top"]}>
				<ScreenHeader title="Session request" />
				<ErrorState code={(error as any)?.code} onRetry={refetch} />
			</SafeAreaView>
		);
	}

	const proposedDate = new Date(booking.proposed_at);
	const createdAt = new Date(booking.created_at);
	const waitingLongEnough = Date.now() - createdAt.getTime() > WAITING_NUDGE_MS;

	// M4.1b fields (check-in/check-out/refund) — not on the CoachBooking wire
	// type yet, since that slice is landing concurrently. Read loosely and
	// fall back to "—" per the brief for this slice.
	const checkedOutAt: string | null = booking.checked_out_at ?? null;
	const endReason: string | null = booking.end_reason ?? null;
	const refundStatus: string | null = booking.refund_status ?? null;
	const refundAmountPaise: number | null = booking.refund_amount_paise ?? null;
	const isCompleted = !!checkedOutAt;

	const paymentStatus: string | undefined = booking.payment?.status;
	const isPaid = paymentStatus === "captured";

	const handlePay = () => {
		const razorpayOrderId = booking.payment?.razorpay_order_id ?? "";
		// `razorpay_key` isn't on the CoachBookingPayment wire shape today (only
		// `status` / `razorpay_order_id` / `amount_paise` are) — read loosely in
		// case it lands later; until then this falls back to the same "dev mode
		// simulate payment" path every other pay screen uses when the key's missing.
		const razorpayKey = (booking.payment as any)?.razorpay_key ?? "";
		const amountPaise = booking.payment?.amount_paise ?? booking.amount_paise ?? 0;
		router.push(
			`/coaching/pay?booking_id=${booking.id}&razorpay_order_id=${encodeURIComponent(razorpayOrderId)}&razorpay_key=${encodeURIComponent(razorpayKey)}&amount_paise=${amountPaise}&coach_name=${encodeURIComponent(booking.coach_name ?? "")}&mode=${booking.mode}&proposed_at=${encodeURIComponent(booking.proposed_at)}` as any,
		);
	};

	const handleWhatsApp = () => {
		if (!coachPhone) return;
		openWhatsApp(
			coachPhone,
			`Hi! I'm still waiting to hear back on my 1:1 session request${booking.coach_name ? ` with ${booking.coach_name}` : ""} — could you let me know the status?`,
		);
	};

	return (
		<SafeAreaView style={{ flex: 1, backgroundColor: theme.color.paper }} edges={["top"]}>
			<ScreenHeader title="Session request" />
			<ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
				{booking.status === "requested" ? (
					<StatusBanner tone="gold" icon={<IconClock size={16} color={theme.color.marigold} />}>
						Waiting for the coach to respond
					</StatusBanner>
				) : booking.status === "rejected" ? (
					<StatusBanner tone="rose" icon={<IconX size={16} color={theme.color.rose} />}>
						{booking.rejected_reason ? `Declined — ${booking.rejected_reason}` : "This request was declined"}
					</StatusBanner>
				) : isCompleted ? (
					<StatusBanner tone="neutral" icon={<IconCheck size={16} color={theme.color.inkSoft} />}>
						{`Session ended · ${END_REASON_LABEL[endReason ?? ""] ?? "Completed"}`}
					</StatusBanner>
				) : isPaid ? (
					<StatusBanner tone="jade" icon={<IconCheck size={16} color={theme.color.jade} />}>
						Session confirmed
					</StatusBanner>
				) : (
					<StatusBanner tone="gold" icon={<IconClock size={16} color={theme.color.marigold} />}>
						Accepted — pay to confirm your session
					</StatusBanner>
				)}

				<Summary>
					<SummaryRow
						icon={<IconCal size={18} color={theme.color.persimmon} />}
						label="Date & time"
						value={format(proposedDate, "EEE, d MMM · h:mm a")}
					/>
					<SummaryRow
						icon={<IconMappin size={18} color={theme.color.persimmon} />}
						label="Mode"
						value={booking.mode === "online" ? "Online" : "Offline"}
					/>
					<SummaryRow icon={<IconClock size={18} color={theme.color.persimmon} />} label="Duration" value={`${booking.duration_min} min`} />
					{booking.coach_name ? <SummaryRow label="Coach" value={booking.coach_name} /> : null}
					{booking.academy_name ? <SummaryRow label="Academy" value={booking.academy_name} /> : null}
					<SummaryRow
						label="Amount"
						value={booking.amount_paise != null ? formatRupees(booking.amount_paise) : "Quoted on acceptance"}
						last
					/>
				</Summary>

				{isCompleted ? (
					<Summary style={{ marginTop: 14 }}>
						<SummaryRow label="Outcome" value={END_REASON_LABEL[endReason ?? ""] ?? "—"} />
						<SummaryRow
							label="Refund"
							value={refundStatus ? `${refundAmountPaise != null ? formatRupees(refundAmountPaise) : "—"} · ${refundStatus}` : "—"}
							last
						/>
					</Summary>
				) : null}

				{booking.status === "accepted" && !isPaid && !isCompleted ? (
					<View style={{ marginTop: 20 }}>
						<Button block onPress={handlePay}>
							Pay now
						</Button>
					</View>
				) : null}

				{booking.status === "requested" && waitingLongEnough ? (
					<View style={[styles.waitCard, { backgroundColor: theme.color.paperWarm, borderColor: theme.color.hairline }]}>
						<Text style={{ fontFamily: theme.font.sansSemibold, fontSize: 13, color: theme.color.inkSoft, lineHeight: 18 }}>
							Still waiting? It's been a little while since you sent this request.
						</Text>
						{coachPhone ? (
							<View style={{ marginTop: 12 }}>
								<Button variant="soft" icon={<IconWa size={16} color={theme.color.persimmonDeep} />} onPress={handleWhatsApp}>
									Message on WhatsApp
								</Button>
							</View>
						) : null}
					</View>
				) : null}
			</ScrollView>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	waitCard: { borderWidth: 1, borderRadius: 16, padding: 14, marginTop: 18 },
});
