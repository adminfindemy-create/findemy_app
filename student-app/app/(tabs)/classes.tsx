import { ErrorState } from "@/components/common/ErrorState";
import { SkeletonLoader } from "@/components/common/SkeletonLoader";
import { useClasses } from "@/hooks/useClasses";
import { useUpcomingSessions } from "@/hooks/useSessions";
import type { ClassItem, UpcomingSession } from "@findemy/types";
import { BlockPrintCover, Button, Icon, useTheme } from "@findemy/ui";
import {
	differenceInCalendarDays,
	differenceInCalendarMonths,
	format,
} from "date-fns";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
	Pressable,
	RefreshControl,
	ScrollView,
	StyleSheet,
	Text,
	View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const DAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// M1.3: renewal-due nudge — show the card from 7 days out through the grace
// window, matching the first threshold of the existing renewal-reminder push
// (backend/api/src/workers/renewal-reminder.ts), so the in-app card and the
// background push agree on when a period first counts as "due soon."
const RENEWAL_WINDOW_DAYS = 7;

// M2.1: the "Pending Classes" preview shows only the nearest few upcoming sessions
// (the endpoint itself returns up to 10 per batch) — this is a glanceable feed, not
// a full schedule.
const PENDING_SESSIONS_PREVIEW_COUNT = 5;

function inr(paise?: number | null): string {
	const n = Math.round((paise ?? 0) / 100);
	const s = String(n);
	if (s.length <= 3) return `₹${s}`;
	const last3 = s.slice(-3);
	const rest = s.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ",");
	return `₹${rest},${last3}`;
}

function timeOf(time?: string) {
	if (!time) return "";
	const [hour, minute] = time.split(":").map(Number);
	const ampm = hour >= 12 ? "PM" : "AM";
	return `${hour % 12 || 12}:${String(minute).padStart(2, "0")} ${ampm}`;
}

function scheduleSummary(
	timings?: { day_of_week: number; start_time?: string }[],
) {
	if (!timings?.length) return "";
	const days = [...new Set(timings.map((timing) => timing.day_of_week))]
		.sort()
		.map((dayOfWeek) => DAY_SHORT[dayOfWeek])
		.join("·");
	return `${days}${timings[0]?.start_time ? ` · ${timeOf(timings[0].start_time)}` : ""}`;
}

// Prototype past row shows how long the class ran ("4 months").
function durationLabel(startIso?: string, endIso?: string) {
	if (!startIso || !endIso) return undefined;
	const start = new Date(startIso);
	const end = new Date(endIso);
	if (isNaN(start.getTime()) || isNaN(end.getTime())) return undefined;
	const months = Math.max(1, differenceInCalendarMonths(end, start));
	return `${months} month${months === 1 ? "" : "s"}`;
}

function RowCard({
	category,
	title,
	badge,
	subText,
	footLeft,
	footRight,
	footRightJade,
	onPress,
}: {
	category: string;
	title: string;
	badge: { label: string; bg: string; fg: string };
	subText: string;
	footLeft: string;
	footRight?: string;
	footRightJade?: boolean;
	onPress: () => void;
}) {
	const theme = useTheme();
	return (
		<Pressable
			onPress={onPress}
			style={({ pressed }) => [
				styles.card,
				{
					backgroundColor: "#fff",
					borderColor: theme.color.hairline,
					...theme.shadow.sm,
				},
				pressed && { transform: [{ scale: 0.978 }] },
			]}
		>
			<BlockPrintCover
				category={category as any}
				variant={1}
				height={74}
				hideLetter
				style={styles.thumb}
			/>
			<View style={styles.body}>
				<Text
					style={[
						styles.ttl,
						{ fontFamily: theme.font.sansBold, color: theme.color.ink },
					]}
					numberOfLines={1}
				>
					{title}
				</Text>
				<View style={styles.subRow}>
					<View style={[styles.badge, { backgroundColor: badge.bg }]}>
						<Text
							style={[
								styles.badgeText,
								{ fontFamily: theme.font.sansBold, color: badge.fg },
							]}
						>
							{badge.label}
						</Text>
					</View>
					<Text
						style={[
							styles.sub,
							{ fontFamily: theme.font.sansMedium, color: theme.color.mist },
						]}
						numberOfLines={1}
					>
						{`· ${subText}`}
					</Text>
				</View>
				<View style={styles.foot}>
					<Text
						style={[
							styles.footText,
							{ fontFamily: theme.font.sansMedium, color: theme.color.mist },
						]}
						numberOfLines={1}
					>
						{footLeft}
					</Text>
					{footRight ? (
						<Text
							style={[
								styles.price,
								{
									fontFamily: theme.font.sansBold,
									color: footRightJade ? theme.color.jade : theme.color.ink,
								},
							]}
						>
							{footRight}
						</Text>
					) : null}
				</View>
			</View>
		</Pressable>
	);
}

function RenewalDueCard({
	classItem,
	onPay,
	onDismiss,
}: {
	classItem: ClassItem;
	onPay: () => void;
	onDismiss: () => void;
}) {
	const theme = useTheme();
	const daysRemaining = differenceInCalendarDays(
		new Date(classItem.current_period_end as string),
		new Date(),
	);
	const inGrace = daysRemaining < 0;
	const dueLabel = inGrace
		? "Grace period — renew to keep your spot"
		: daysRemaining === 0
			? "Renewal due today"
			: daysRemaining === 1
				? "Renewal due tomorrow"
				: `Renews in ${daysRemaining} days`;

	return (
		<View
			style={[
				styles.renewalCard,
				{
					backgroundColor: theme.color.marigoldSoft,
					borderColor: theme.color.marigold,
				},
			]}
		>
			<View style={{ flex: 1, minWidth: 0 }}>
				<Text
					style={[
						styles.renewalTitle,
						{ fontFamily: theme.font.sansBold, color: theme.color.ink },
					]}
					numberOfLines={1}
				>
					{classItem.batch_title}
				</Text>
				<Text
					style={[
						styles.renewalSub,
						{ fontFamily: theme.font.sansMedium, color: theme.color.marigold },
					]}
				>
					{dueLabel}
				</Text>
			</View>
			<View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
				<Button size="sm" onPress={onPay}>
					Pay now
				</Button>
				<Pressable
					onPress={onDismiss}
					hitSlop={10}
					accessibilityLabel="Dismiss renewal reminder"
					accessibilityRole="button"
				>
					<Text style={{ fontSize: 16, color: theme.color.mist }}>✕</Text>
				</Pressable>
			</View>
		</View>
	);
}

// M2.1: one row in the "Pending Classes" feed — a concrete upcoming session
// projected from the batch's weekly timings (date/time/subject/instructor).
function PendingSessionRow({ session }: { session: UpcomingSession }) {
	const theme = useTheme();
	const start = new Date(session.start_at);
	const subText = [format(start, "EEE, d MMM · h:mm a"), session.coach_name]
		.filter(Boolean)
		.join(" · ");

	return (
		<View
			style={[
				styles.pendingRow,
				{ backgroundColor: "#fff", borderColor: theme.color.hairline },
			]}
		>
			<View
				style={[styles.pendingDate, { backgroundColor: theme.color.paperWarm }]}
			>
				<Text
					style={[
						styles.pendingDateDay,
						{ fontFamily: theme.font.sansBold, color: theme.color.ink },
					]}
				>
					{format(start, "d")}
				</Text>
				<Text
					style={[
						styles.pendingDateMonth,
						{ fontFamily: theme.font.sansMedium, color: theme.color.mist },
					]}
				>
					{format(start, "MMM")}
				</Text>
			</View>
			<View style={{ flex: 1, minWidth: 0 }}>
				<Text
					style={[
						styles.pendingTitle,
						{ fontFamily: theme.font.sansBold, color: theme.color.ink },
					]}
					numberOfLines={1}
				>
					{session.batch_title}
				</Text>
				<Text
					style={[
						styles.pendingSub,
						{ fontFamily: theme.font.sansMedium, color: theme.color.mist },
					]}
					numberOfLines={1}
				>
					{subText}
				</Text>
			</View>
		</View>
	);
}

export default function ClassesScreen() {
	const theme = useTheme();
	const router = useRouter();
	const classesQ = useClasses();
	// M2.1: "Pending Classes" — best-effort, additive feed; never blocks the
	// main Classes loading/error states below.
	const sessionsQ = useUpcomingSessions();
	const pendingSessions = (sessionsQ.data?.items ?? []).slice(
		0,
		PENDING_SESSIONS_PREVIEW_COUNT,
	);
	// Session-local only — resets on next screen mount, no backend field.
	// Matches the "Not now" acceptance criterion: dismiss, don't persist.
	const [dismissedRenewals, setDismissedRenewals] = useState<Set<string>>(
		new Set(),
	);

	const active = (classesQ.data?.active ?? []) as ClassItem[];
	const past = (classesQ.data?.past ?? []) as ClassItem[];

	const isLoading = classesQ.isLoading;
	const isError = classesQ.isError;
	const refetch = () => {
		classesQ.refetch();
	};
	const fetching = classesQ.isFetching;

	const hasAny = active.length > 0 || past.length > 0;

	const SectionLabel = ({ children }: { children: string }) => (
		<Text
			style={[
				styles.sectionLabel,
				{ fontFamily: theme.font.sansBold, color: theme.color.whisper },
			]}
		>
			{children}
		</Text>
	);

	const coachFirst = (name?: string) => (name ?? "").split(" ")[0];
	const footFor = (classItem: ClassItem) =>
		[classItem.academy_name, coachFirst(classItem.coach_name)]
			.filter(Boolean)
			.join(" · ");

	// M1.3: renewal-due nudge — paused/closing batches are excluded (paused
	// mirrors the reminder push's own skip rule; closing batches are winding
	// down, so "renew" doesn't apply there).
	const renewalDue = active.filter((classItem) => {
		if (classItem.status === "paused" || classItem.batch_status === "closing")
			return false;
		if (!classItem.current_period_end) return false;
		if (dismissedRenewals.has(classItem.enrollment_id)) return false;
		return (
			differenceInCalendarDays(
				new Date(classItem.current_period_end),
				new Date(),
			) <= RENEWAL_WINDOW_DAYS
		);
	});
	const dismissRenewal = (enrollmentId: string) =>
		setDismissedRenewals((prev) => new Set(prev).add(enrollmentId));

	return (
		<SafeAreaView
			style={{ flex: 1, backgroundColor: theme.color.paper }}
			edges={["top"]}
		>
			<View style={styles.head}>
				<View
					style={[
						styles.hlWrap,
						{ backgroundColor: theme.color.persimmonSoft },
					]}
				>
					<Text
						style={{
							fontFamily: theme.font.serif,
							fontSize: 40,
							color: theme.color.ink,
							letterSpacing: -0.5,
						}}
					>
						My Classes.
					</Text>
				</View>
			</View>

			{isLoading ? (
				<View style={{ padding: 20, gap: 12 }}>
					<SkeletonLoader height={102} borderRadius={20} />
					<SkeletonLoader height={102} borderRadius={20} />
				</View>
			) : isError ? (
				<ErrorState onRetry={refetch} />
			) : !hasAny ? (
				<View style={styles.empty}>
					<View
						style={[
							styles.emptyIcon,
							{ backgroundColor: theme.color.paperWarm },
						]}
					>
						<Icon name="sparkle" size={28} color={theme.color.whisper} />
					</View>
					<Text
						style={{
							fontFamily: theme.font.serif,
							fontSize: 25,
							color: theme.color.ink,
							marginBottom: 6,
						}}
					>
						No classes yet
					</Text>
					<Text
						style={{
							fontFamily: theme.font.sans,
							fontSize: 14,
							lineHeight: 22,
							color: theme.color.mist,
							maxWidth: 262,
							textAlign: "center",
							marginBottom: 18,
						}}
					>
						Enroll in a class to get started — your enrolled classes will show
						up here. Trials, workshops and events live in Your Bookings.
					</Text>
					<Button onPress={() => router.replace("/(tabs)" as any)}>
						Explore academies
					</Button>
				</View>
			) : (
				<ScrollView
					contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 120 }}
					refreshControl={
						<RefreshControl
							refreshing={fetching}
							onRefresh={refetch}
							tintColor={theme.color.persimmon}
						/>
					}
					showsVerticalScrollIndicator={false}
				>
					{renewalDue.length > 0 ? (
						<View style={{ gap: 10, marginBottom: 6 }}>
							{renewalDue.map((classItem) => (
								<RenewalDueCard
									key={classItem.enrollment_id}
									classItem={classItem}
									onPay={() =>
										router.push(
											`/enrollment/${classItem.enrollment_id}?openRenew=1` as any,
										)
									}
									onDismiss={() => dismissRenewal(classItem.enrollment_id)}
								/>
							))}
						</View>
					) : null}

					{pendingSessions.length > 0 ? (
						<>
							<SectionLabel>Pending Classes</SectionLabel>
							<View style={{ gap: 10, marginBottom: 6 }}>
								{pendingSessions.map((session) => (
									<PendingSessionRow key={session.id} session={session} />
								))}
							</View>
						</>
					) : null}

					{active.length > 0 ? (
						<>
							<SectionLabel>Enrolled</SectionLabel>
							{active.map((classItem) => {
								const paused = classItem.status === "paused";
								const closing = classItem.batch_status === "closing";
								const online = classItem.mode === "online";
								const resumes =
									paused && classItem.paused_until
										? `Resumes ${format(new Date(classItem.paused_until), "d MMMM")}`
										: undefined;
								const schedule = [
									online ? "Online" : undefined,
									scheduleSummary(classItem.timings),
								]
									.filter(Boolean)
									.join(" · ");
								// A closing batch is being discontinued: student is covered until their paid term ends.
								const closingSub =
									closing && classItem.current_period_end
										? `Closing — active until ${format(new Date(classItem.current_period_end), "d MMM yyyy")}`
										: undefined;
								const badge = closing
									? {
											label: "Closing",
											bg: theme.color.roseSoft,
											fg: theme.color.rose,
										}
									: paused
										? {
												label: "On hold",
												bg: theme.color.marigoldSoft,
												fg: theme.color.marigold,
											}
										: {
												label: "Active",
												bg: theme.color.jadeSoft,
												fg: theme.color.jade,
											};
								return (
									<RowCard
										key={classItem.enrollment_id}
										category={classItem.category ?? "music"}
										title={classItem.batch_title}
										badge={badge}
										subText={closingSub ?? resumes ?? schedule}
										footLeft={footFor(classItem)}
										footRight={
											classItem.monthly_fee_paise
												? `${inr(classItem.monthly_fee_paise)}/mo`
												: undefined
										}
										onPress={() =>
											router.push(
												`/enrollment/${classItem.enrollment_id}` as any,
											)
										}
									/>
								);
							})}
						</>
					) : null}

					{past.length > 0 ? (
						<>
							<SectionLabel>Past</SectionLabel>
							{past.map((classItem) => (
								<RowCard
									key={classItem.enrollment_id}
									category={classItem.category ?? "music"}
									title={classItem.batch_title}
									badge={{
										label: "Ended",
										bg: theme.color.paperWarm,
										fg: theme.color.inkSoft,
									}}
									subText={format(
										new Date(
											classItem.current_period_end ?? classItem.started_at,
										),
										"MMM yyyy",
									)}
									footLeft={footFor(classItem)}
									footRight={durationLabel(
										classItem.started_at,
										classItem.current_period_end,
									)}
									onPress={() =>
										router.push(`/enrollment/${classItem.enrollment_id}` as any)
									}
								/>
							))}
						</>
					) : null}
				</ScrollView>
			)}
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	head: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 10 },
	hlWrap: { alignSelf: "flex-start", borderRadius: 5, paddingHorizontal: 4 },
	sectionLabel: {
		fontSize: 13,
		letterSpacing: 1.3,
		textTransform: "uppercase",
		marginTop: 18,
		marginBottom: 10,
	},
	renewalCard: {
		flexDirection: "row",
		alignItems: "center",
		gap: 12,
		borderWidth: 1,
		borderRadius: 16,
		padding: 14,
	},
	renewalTitle: { fontSize: 14, letterSpacing: -0.1 },
	renewalSub: { fontSize: 12, marginTop: 2 },
	pendingRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: 13,
		borderWidth: 1,
		borderRadius: 16,
		padding: 12,
	},
	pendingDate: {
		width: 48,
		height: 48,
		borderRadius: 12,
		alignItems: "center",
		justifyContent: "center",
	},
	pendingDateDay: { fontSize: 17, lineHeight: 19 },
	pendingDateMonth: {
		fontSize: 10.5,
		letterSpacing: 0.6,
		textTransform: "uppercase",
	},
	pendingTitle: { fontSize: 14.5, letterSpacing: -0.1 },
	pendingSub: { fontSize: 12.5, marginTop: 2 },
	card: {
		flexDirection: "row",
		alignItems: "center",
		gap: 13,
		borderWidth: 1,
		borderRadius: 20,
		padding: 14,
		marginBottom: 12,
	},
	thumb: { width: 74, height: 74, borderRadius: 15, overflow: "hidden" },
	body: { flex: 1, minWidth: 0 },
	ttl: { fontSize: 16, letterSpacing: -0.16, lineHeight: 18 },
	subRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: 6,
		marginTop: 3,
		flexWrap: "wrap",
	},
	badge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
	badgeText: {
		fontSize: 10.5,
		letterSpacing: 0.84,
		textTransform: "uppercase",
	},
	sub: { fontSize: 12.5, flexShrink: 1 },
	foot: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		marginTop: 8,
	},
	footText: { fontSize: 12.5, flexShrink: 1, paddingRight: 8 },
	price: { fontSize: 15, fontVariant: ["tabular-nums"] },
	empty: {
		alignItems: "center",
		paddingTop: 56,
		paddingHorizontal: 24,
		paddingBottom: 40,
	},
	emptyIcon: {
		width: 66,
		height: 66,
		borderRadius: 20,
		alignItems: "center",
		justifyContent: "center",
		marginBottom: 16,
	},
});
