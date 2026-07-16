import React from "react";
import { View, Pressable, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { useTheme, Summary, SummaryRow, IconCal, IconClock } from "@findemy/ui";
import { SafeAreaView } from "react-native-safe-area-context";
import { format } from "date-fns";
import { ScreenHeader } from "@/components/common/ScreenHeader";
import { ErrorState } from "@/components/common/ErrorState";
import { EmptyState } from "@/components/common/EmptyState";
import { SkeletonLoader } from "@/components/common/SkeletonLoader";
import { useMyCoachBookings } from "@/hooks/useCoaching";
import { formatRupees } from "@/lib/format";

// M4.2: 1:1 session list — doubles as "my requests" (pending) and
// "past-session history" (resolved), using Summary/SummaryRow the same way
// payments.tsx's receipt view does, per the brief. Each row is tappable into
// app/coaching/[id].tsx for full status/detail.

const END_REASON_LABEL: Record<string, string> = {
	completed: "Completed",
	student_left: "You left early",
	coach_left: "Coach left early",
	no_show: "No-show",
	academy_no_fulfill: "Academy couldn't fulfil",
};

function statusLabel(booking: any): string {
	if (booking.status === "requested") return "Pending";
	if (booking.status === "rejected") return "Declined";
	if (booking.checked_out_at) return "Completed";
	if (booking.payment?.status === "captured") return "Confirmed";
	if (booking.status === "accepted") return "Accepted — payment pending";
	return booking.status;
}

function HistoryRow({ booking, onPress }: { booking: any; onPress: () => void }) {
	const theme = useTheme();
	const proposedDate = new Date(booking.proposed_at);
	// M4.1b fields — not on the CoachBooking wire type yet (landing
	// concurrently in a separate slice); read loosely, default to "—".
	const endReason: string | null = booking.end_reason ?? null;
	const refundStatus: string | null = booking.refund_status ?? null;
	const refundAmountPaise: number | null = booking.refund_amount_paise ?? null;
	const isResolved = booking.status === "rejected" || !!booking.checked_out_at;

	return (
		<Pressable onPress={onPress} style={{ marginBottom: 14 }} accessibilityRole="button">
			<Summary>
				<SummaryRow
					icon={<IconCal size={18} color={theme.color.persimmon} />}
					label="Date & time"
					value={format(proposedDate, "EEE, d MMM · h:mm a")}
				/>
				<SummaryRow
					icon={<IconClock size={18} color={theme.color.persimmon} />}
					label="Status"
					value={statusLabel(booking)}
					last={!isResolved}
				/>
				{isResolved ? (
					<SummaryRow
						label="Outcome / refund"
						value={
							booking.checked_out_at
								? `${END_REASON_LABEL[endReason ?? ""] ?? "Completed"}${
										refundStatus ? ` · ${refundAmountPaise != null ? formatRupees(refundAmountPaise) : "—"} refund` : ""
									}`
								: "—"
						}
						last
					/>
				) : null}
			</Summary>
		</Pressable>
	);
}

export default function CoachingHistoryScreen() {
	const router = useRouter();
	const theme = useTheme();
	const { data, isLoading, error, refetch } = useMyCoachBookings();
	const items = ((data as any)?.items ?? []) as any[];
	const sorted = [...items].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

	return (
		<SafeAreaView style={{ flex: 1, backgroundColor: theme.color.paper }} edges={["top"]}>
			<ScreenHeader title="1:1 sessions" />
			{isLoading ? (
				<View style={{ paddingHorizontal: 20, paddingTop: 8, gap: 14 }}>
					<SkeletonLoader height={128} borderRadius={20} />
					<SkeletonLoader height={128} borderRadius={20} />
				</View>
			) : error ? (
				<ErrorState code={(error as any)?.code} onRetry={refetch} />
			) : sorted.length === 0 ? (
				<EmptyState message="No 1:1 session requests yet. Book one from a coach's profile on an academy page." />
			) : (
				<ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
					{sorted.map((booking) => (
						<HistoryRow key={booking.id} booking={booking} onPress={() => router.push(`/coaching/${booking.id}` as any)} />
					))}
				</ScrollView>
			)}
		</SafeAreaView>
	);
}
