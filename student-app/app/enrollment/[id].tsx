import { EmptyState } from "@/components/common/EmptyState";
import { OptionRow } from "@/components/common/OptionRow";
import { ScreenHeader } from "@/components/common/ScreenHeader";
import { SkeletonLoader } from "@/components/common/SkeletonLoader";
import { useAcademy } from "@/hooks/useAcademy";
import {
	useCancelDiscontinuation,
	useDiscontinueEnrollment,
	useEnrollmentDetail,
	usePauseEnrollment,
	useResumePause,
	useSetPreferredPackage,
	useTransferEnrollment,
} from "@/hooks/useEnrollmentDetail";
import { useEnrollments } from "@/hooks/useEnrollments";
import { useRenewEnrollment, useRenewalOptions } from "@/hooks/useRenewal";
import { openWhatsApp } from "@/lib/whatsapp";
import {
	BlockPrintCover,
	Button,
	IconCal,
	IconCheck,
	IconClock,
	IconMappin,
	IconQr,
	IconUser,
	IconWa,
	MenuRow,
	SectionLabel,
	StatusBanner,
	Summary,
	SummaryRow,
	tokens,
	useTheme,
} from "@findemy/ui";
import { format } from "date-fns";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
	ActivityIndicator,
	Alert,
	Linking,
	Modal,
	Platform,
	Pressable,
	ScrollView,
	StyleSheet,
	Text,
	TextInput,
	View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

type Timing = { day_of_week: number; start_time: string; duration_min: number };

const PACKAGE_CONFIG: Record<
	string,
	{ label: string; months: number; badge?: string; badgeTone?: string }
> = {
	monthly: { label: "Monthly", months: 1 },
	quarterly: {
		label: "Quarterly",
		months: 3,
		badge: "Popular",
		badgeTone: "jade",
	},
	annual: {
		label: "Annual",
		months: 12,
		badge: "Best value",
		badgeTone: "persimmon",
	},
};

const DISCONTINUE_REASONS = [
	{
		key: "schedule_issue",
		label: "Schedule issue",
		desc: "The class timings don't work for me anymore",
	},
	{
		key: "financial",
		label: "Financial reasons",
		desc: "Budget constraints at the moment",
	},
	{ key: "moving_city", label: "Moving city", desc: "Relocating soon" },
	{
		key: "not_satisfied",
		label: "Not satisfied",
		desc: "The class didn't meet my expectations",
	},
	{
		key: "switching_academy",
		label: "Switching academy",
		desc: "Found a better fit elsewhere",
	},
	{ key: "other", label: "Other", desc: "Another reason not listed" },
];

const PAUSE_DURATIONS = [
	{ key: "one_week", label: "1 Week", days: 7 },
	{ key: "two_weeks", label: "2 Weeks", days: 14 },
	{ key: "one_month", label: "1 Month", days: 30 },
];

function getNextClass(timings: Timing[] | null | undefined): Date | null {
	if (!timings?.length) return null;
	const now = new Date();
	let closest: Date | null = null;
	for (const timing of timings) {
		const [hour, minute] = timing.start_time.split(":").map(Number);
		const candidateDate = new Date();
		candidateDate.setHours(hour, minute, 0, 0);
		let diff = timing.day_of_week - candidateDate.getDay();
		if (diff === 0) {
			const minutesPast = (now.getTime() - candidateDate.getTime()) / 60000;
			if (minutesPast > timing.duration_min) diff = 7;
		} else if (diff < 0) {
			diff += 7;
		}
		candidateDate.setDate(candidateDate.getDate() + diff);
		if (!closest || candidateDate < closest) closest = candidateDate;
	}
	return closest;
}

function formatTimeRange(timing: Timing): string {
	const [hour24, minute] = timing.start_time.split(":").map(Number);
	const startAmpm = hour24 >= 12 ? "PM" : "AM";
	const startHour = hour24 % 12 || 12;
	const startStr = `${startHour}:${String(minute).padStart(2, "0")} ${startAmpm}`;
	if (!timing.duration_min) return startStr;
	const endTotalMin = hour24 * 60 + minute + timing.duration_min;
	const endHour24 = Math.floor(endTotalMin / 60) % 24;
	const endMinute = endTotalMin % 60;
	const endAmpm = endHour24 >= 12 ? "PM" : "AM";
	const endHour = endHour24 % 12 || 12;
	return `${startStr} – ${endHour}:${String(endMinute).padStart(2, "0")} ${endAmpm}`;
}

function batchDayPattern(timings: Timing[] | undefined): string {
	if (!timings?.length) return "";
	return [...new Set(timings.map((timing) => timing.day_of_week))]
		.sort()
		.map((dayOfWeek) => DAY_LABELS[dayOfWeek])
		.join(" · ");
}

function BillRow({
	label,
	value,
	theme,
	last,
}: { label: string; value: string; theme: any; last?: boolean }) {
	return (
		<View
			style={{
				flexDirection: "row",
				alignItems: "center",
				justifyContent: "space-between",
				gap: 12,
				paddingVertical: 11,
				borderBottomColor: theme.color.hairline,
				borderBottomWidth: last ? 0 : 1,
			}}
		>
			<Text
				style={{
					fontFamily: theme.font.sansMedium,
					fontSize: 13,
					color: theme.color.mist,
				}}
			>
				{label}
			</Text>
			<Text
				style={{
					fontFamily: theme.font.sansBold,
					fontSize: 13.5,
					color: theme.color.ink,
					flex: 1,
					textAlign: "right",
				}}
				numberOfLines={1}
			>
				{value}
			</Text>
		</View>
	);
}

function SheetHandle() {
	const theme = useTheme();
	return (
		<View
			style={{
				width: 36,
				height: 4,
				borderRadius: 2,
				backgroundColor: theme.color.hairline,
				alignSelf: "center",
				marginTop: 10,
				marginBottom: 6,
			}}
		/>
	);
}

// ─── Renew Sheet ─────────────────────────────────────────────────────────────

function RenewSheet({
	enrollment,
	onClose,
}: { enrollment: any; onClose: () => void }) {
	const theme = useTheme();
	const router = useRouter();
	const [selected, setSelected] = useState("monthly");
	const renewOptions = useRenewalOptions(enrollment.batch_id);
	const renewMut = useRenewEnrollment();
	const setPkgMut = useSetPreferredPackage();
	const [makeDefault, setMakeDefault] = useState(false);
	const options = renewOptions.data?.options ?? [];

	const selectedOption = options.find(
		(option: any) => option.package_type === selected,
	);

	const handleRenew = async () => {
		try {
			// S5: fold the old "preferred package" action in here — optionally set the
			// chosen plan as the default for future auto-renewals before paying.
			if (makeDefault) {
				try {
					await setPkgMut.mutateAsync({
						id: enrollment.id,
						package_type: selected,
					});
				} catch {
					/* non-fatal — onError alerts */
				}
			}
			const response = await renewMut.mutateAsync({
				batchId: enrollment.batch_id,
				package_type: selected,
			});
			onClose();
			router.push(
				`/enrollment/pay?enrollment_id=${response.enrollment_id}&enrollment_period_id=${response.enrollment_period_id}&razorpay_order_id=${response.razorpay_order_id}&razorpay_key=${response.razorpay_key}&amount_paise=${response.amount_paise}&batch_title=${encodeURIComponent(enrollment.batch_title)}&package_type=${selected}&batch_id=${enrollment.batch_id}&category=${enrollment.category}&flow=renewal` as any,
			);
		} catch {
			/* onError handles */
		}
	};

	return (
		<View style={{ paddingHorizontal: 24, paddingBottom: 40 }}>
			<SheetHandle />
			<View style={sheetStyles.titleRow}>
				<Text
					style={[
						sheetStyles.title,
						{ fontFamily: theme.font.serif, color: theme.color.ink },
					]}
				>
					Renew or change plan
				</Text>
				<Pressable onPress={onClose} hitSlop={12}>
					<Text style={{ fontSize: 20, color: theme.color.mist }}>✕</Text>
				</Pressable>
			</View>

			{renewOptions.isLoading ? (
				<ActivityIndicator
					color={theme.color.persimmon}
					style={{ marginVertical: 24 }}
				/>
			) : (
				<View style={{ marginTop: 4 }}>
					{options.map((option: any) => {
						const pkg = PACKAGE_CONFIG[option.package_type];
						if (!pkg) return null;
						const amountRs = Math.round(option.amount_paise / 100);
						const badge = pkg.badge ? ` · ${pkg.badge}` : "";
						const off =
							option.discount_bps > 0
								? ` · ${option.discount_bps / 100}% off`
								: "";
						return (
							<OptionRow
								key={option.package_type}
								selected={selected === option.package_type}
								onPress={() => setSelected(option.package_type)}
								title={`${pkg.label} · ₹${amountRs.toLocaleString("en-IN")}`}
								sub={`${pkg.months} month${pkg.months > 1 ? "s" : ""}${off}${badge}`}
							/>
						);
					})}
				</View>
			)}

			<Pressable
				onPress={() => setMakeDefault((prev) => !prev)}
				style={{
					flexDirection: "row",
					alignItems: "center",
					gap: 8,
					marginTop: 4,
					marginBottom: 4,
				}}
			>
				<View
					style={[
						renewStyles.check,
						{
							borderColor: makeDefault
								? theme.color.persimmon
								: theme.color.hairline,
							backgroundColor: makeDefault
								? theme.color.persimmon
								: "transparent",
						},
					]}
				>
					{makeDefault ? (
						<Text style={{ color: theme.color.ivory, fontSize: 11 }}>✓</Text>
					) : null}
				</View>
				<Text
					style={{
						fontFamily: theme.font.sansMedium,
						fontSize: 12.5,
						color: theme.color.inkSoft,
					}}
				>
					Set this as my default plan for future renewals
				</Text>
			</Pressable>

			<View style={{ marginTop: 14 }}>
				<Button
					onPress={handleRenew}
					loading={renewMut.isPending}
					disabled={!selectedOption || renewMut.isPending}
					block
				>
					{selectedOption
						? `Confirm & pay ₹${Math.round(selectedOption.amount_paise / 100).toLocaleString("en-IN")}`
						: "Select a plan"}
				</Button>
			</View>
		</View>
	);
}

// ─── Discontinue Sheet ───────────────────────────────────────────────────────

function DiscontinueSheet({
	enrollment,
	onClose,
}: { enrollment: any; onClose: () => void }) {
	const theme = useTheme();
	const [step, setStep] = useState<"reason" | "confirm">("reason");
	const [reason, setReason] = useState("");
	const discontinueMut = useDiscontinueEnrollment();

	const handleConfirm = async () => {
		try {
			await discontinueMut.mutateAsync({
				id: enrollment.id,
				immediate: false,
				reason,
			});
			onClose();
			Alert.alert(
				"Discontinuation scheduled",
				"Your access continues until the end of your current paid period.",
			);
		} catch {
			/* onError handles */
		}
	};

	if (step === "confirm") {
		return (
			<View style={{ paddingHorizontal: 24, paddingBottom: 40 }}>
				<SheetHandle />
				<View style={sheetStyles.titleRow}>
					<Text
						style={[
							sheetStyles.title,
							{ fontFamily: theme.font.serif, color: theme.color.ink },
						]}
					>
						Confirm discontinuation
					</Text>
					<Pressable onPress={onClose} hitSlop={12}>
						<Text style={{ fontSize: 20, color: theme.color.mist }}>✕</Text>
					</Pressable>
				</View>
				<View
					style={[
						discStyles.infoBox,
						{
							backgroundColor: theme.color.marigoldSoft,
							borderColor: theme.color.marigold,
						},
					]}
				>
					<Text
						style={{
							fontFamily: theme.font.sans,
							fontSize: 13,
							color: theme.color.inkSoft,
							lineHeight: 19,
						}}
					>
						Your access to{" "}
						<Text style={{ fontFamily: theme.font.sansBold }}>
							{enrollment.batch_title}
						</Text>{" "}
						will continue until the end of your current paid period.
					</Text>
				</View>
				<Text
					style={{
						fontFamily: theme.font.sans,
						fontSize: 12,
						color: theme.color.mist,
						marginTop: 10,
						marginBottom: 20,
						lineHeight: 17,
					}}
				>
					After that, your enrollment will be marked as ended. You can re-enroll
					anytime.
				</Text>
				<View style={{ gap: 10 }}>
					<Button
						variant="rose"
						block
						onPress={handleConfirm}
						loading={discontinueMut.isPending}
					>
						Confirm discontinuation
					</Button>
					<Button variant="ghost" block onPress={() => setStep("reason")}>
						Go back
					</Button>
				</View>
			</View>
		);
	}

	return (
		<View style={{ paddingHorizontal: 24, paddingBottom: 40 }}>
			<SheetHandle />
			<View style={sheetStyles.titleRow}>
				<Text
					style={[
						sheetStyles.title,
						{ fontFamily: theme.font.serif, color: theme.color.ink },
					]}
				>
					Why are you leaving?
				</Text>
				<Pressable onPress={onClose} hitSlop={12}>
					<Text style={{ fontSize: 20, color: theme.color.mist }}>✕</Text>
				</Pressable>
			</View>
			<Text
				style={{
					fontFamily: theme.font.sans,
					fontSize: 13,
					color: theme.color.mist,
					marginBottom: 14,
					lineHeight: 18,
				}}
			>
				Your feedback helps academies improve. This is kept private.
			</Text>
			<View>
				{DISCONTINUE_REASONS.map((reasonOption) => (
					<OptionRow
						key={reasonOption.key}
						selected={reason === reasonOption.key}
						onPress={() => setReason(reasonOption.key)}
						title={reasonOption.label}
						sub={reasonOption.desc}
					/>
				))}
			</View>
			<View style={{ marginTop: 8 }}>
				<Button
					variant="rose"
					block
					disabled={!reason}
					onPress={() => setStep("confirm")}
				>
					Continue
				</Button>
			</View>
		</View>
	);
}

// ─── Pause Sheet ─────────────────────────────────────────────────────────────

function PauseSheet({
	enrollment,
	onClose,
}: { enrollment: any; onClose: () => void }) {
	const theme = useTheme();
	const [duration, setDuration] = useState("one_week");
	const [reason, setReason] = useState("");
	const pauseMut = usePauseEnrollment();

	const handlePause = async () => {
		try {
			const response = await pauseMut.mutateAsync({
				id: enrollment.id,
				duration,
				reason: reason.trim() || undefined,
			});
			onClose();
			const isPending = response.status === "pending";
			Alert.alert(
				isPending ? "Pause requested" : "Enrollment paused",
				isPending
					? "Your request has been sent to the academy for approval."
					: `Your enrollment is paused. It will resume automatically.`,
			);
		} catch {
			/* onError handles */
		}
	};

	return (
		<View style={{ paddingHorizontal: 24, paddingBottom: 40 }}>
			<SheetHandle />
			<View style={sheetStyles.titleRow}>
				<Text
					style={[
						sheetStyles.title,
						{ fontFamily: theme.font.serif, color: theme.color.ink },
					]}
				>
					Pause class
				</Text>
				<Pressable onPress={onClose} hitSlop={12}>
					<Text style={{ fontSize: 20, color: theme.color.mist }}>✕</Text>
				</Pressable>
			</View>
			<Text
				style={{
					fontFamily: theme.font.sans,
					fontSize: 13,
					color: theme.color.mist,
					marginBottom: 16,
					lineHeight: 18,
				}}
			>
				Your spot is held and your paid period is extended by the pause duration
				when you resume.
			</Text>

			<View style={{ flexDirection: "row", gap: 10, marginBottom: 18 }}>
				{PAUSE_DURATIONS.map((durationOption) => {
					const isSelected = duration === durationOption.key;
					return (
						<Pressable
							key={durationOption.key}
							onPress={() => setDuration(durationOption.key)}
							style={[
								pauseStyles.durationPill,
								{
									flex: 1,
									backgroundColor: isSelected ? theme.color.ink : "#fff",
									borderColor: isSelected
										? theme.color.ink
										: theme.color.hairline,
								},
							]}
						>
							<Text
								style={{
									fontFamily: theme.font.sansBold,
									fontSize: 13,
									color: isSelected ? theme.color.ivory : theme.color.inkSoft,
									textAlign: "center",
								}}
							>
								{durationOption.label}
							</Text>
						</Pressable>
					);
				})}
			</View>

			<TextInput
				value={reason}
				onChangeText={setReason}
				placeholder="Add a note (optional)"
				placeholderTextColor={theme.color.mist}
				style={[
					pauseStyles.input,
					{
						fontFamily: theme.font.sans,
						color: theme.color.ink,
						backgroundColor: "#fff",
						borderColor: theme.color.hairline,
					},
				]}
			/>

			<View style={{ marginTop: 18 }}>
				<Button block onPress={handlePause} loading={pauseMut.isPending}>
					Pause class
				</Button>
			</View>
		</View>
	);
}

// ─── Transfer Sheet (sibling-batch list) ─────────────────────────────────────

function TransferSheet({
	enrollment,
	onClose,
}: { enrollment: any; onClose: () => void }) {
	const theme = useTheme();
	const [reason, setReason] = useState("");
	const [targetBatchId, setTargetBatchId] = useState("");
	const transferMut = useTransferEnrollment();
	const academy = useAcademy(enrollment.academy_id);

	// S5: pick from the academy's other batches (same discipline), not a pasted ID.
	const siblings = useMemo(() => {
		const batches = (academy.data?.batches ?? []) as any[];
		return batches.filter(
			(batch) =>
				batch.id !== enrollment.batch_id &&
				(!enrollment.category || batch.category === enrollment.category),
		);
	}, [academy.data, enrollment.batch_id, enrollment.category]);

	const handleTransfer = async () => {
		if (!targetBatchId) {
			Alert.alert("Pick a batch", "Please choose a batch to transfer to.");
			return;
		}
		try {
			const response = await transferMut.mutateAsync({
				id: enrollment.id,
				target_batch_id: targetBatchId,
				reason: reason.trim() || undefined,
			});
			onClose();
			const isPending = response.status === "pending";
			Alert.alert(
				isPending ? "Transfer requested" : "Transfer approved",
				isPending
					? "Your transfer request has been sent to the academy."
					: "You've been transferred to the new batch.",
			);
		} catch {
			/* onError handles */
		}
	};

	return (
		<View style={{ paddingHorizontal: 24, paddingBottom: 40 }}>
			<SheetHandle />
			<View style={sheetStyles.titleRow}>
				<Text
					style={[
						sheetStyles.title,
						{ fontFamily: theme.font.serif, color: theme.color.ink },
					]}
				>
					Transfer batch
				</Text>
				<Pressable onPress={onClose} hitSlop={12}>
					<Text style={{ fontSize: 20, color: theme.color.mist }}>✕</Text>
				</Pressable>
			</View>
			<Text
				style={{
					fontFamily: theme.font.sans,
					fontSize: 13,
					color: theme.color.mist,
					marginBottom: 16,
					lineHeight: 18,
				}}
			>
				Move your remaining paid days to another timing for the same program.
			</Text>

			{academy.isLoading ? (
				<ActivityIndicator
					color={theme.color.persimmon}
					style={{ marginVertical: 24 }}
				/>
			) : siblings.length === 0 ? (
				<Text
					style={{
						fontFamily: theme.font.sans,
						fontSize: 13,
						color: theme.color.mist,
						marginVertical: 16,
						lineHeight: 19,
					}}
				>
					No other batches are available to transfer to right now.
				</Text>
			) : (
				<View>
					{siblings.map((siblingBatch: any) => {
						const days = batchDayPattern(siblingBatch.timings);
						const firstTiming = (siblingBatch.timings ?? [])[0];
						const time = firstTiming ? formatTimeRange(firstTiming) : "";
						const seats =
							siblingBatch.capacity != null
								? Number(siblingBatch.capacity) -
									Number(siblingBatch.enrolled_count ?? 0)
								: null;
						const parts = [
							time,
							seats != null
								? `${Math.max(seats, 0)} seat${seats === 1 ? "" : "s"} left`
								: "",
						].filter(Boolean);
						return (
							<OptionRow
								key={siblingBatch.id}
								selected={targetBatchId === siblingBatch.id}
								disabled={seats != null && seats <= 0}
								onPress={() => setTargetBatchId(siblingBatch.id)}
								title={
									days || siblingBatch.title || siblingBatch.level || "Batch"
								}
								sub={parts.join(" · ")}
							/>
						);
					})}
				</View>
			)}

			<TextInput
				value={reason}
				onChangeText={setReason}
				placeholder="Reason (optional)"
				placeholderTextColor={theme.color.mist}
				style={[
					pauseStyles.input,
					{
						fontFamily: theme.font.sans,
						color: theme.color.ink,
						backgroundColor: "#fff",
						borderColor: theme.color.hairline,
						marginTop: 4,
					},
				]}
			/>
			<View style={{ marginTop: 18 }}>
				<Button
					block
					onPress={handleTransfer}
					loading={transferMut.isPending}
					disabled={!targetBatchId}
				>
					Confirm transfer
				</Button>
			</View>
		</View>
	);
}

// ─── Sub-sheet host ──────────────────────────────────────────────────────────

type SubSheet = "renew" | "discontinue" | "pause" | "transfer" | null;

// ─── Join Class (online only) ─────────────────────────────────────────────────

function JoinClassButton({
	enrollment,
	theme,
}: { enrollment: any; theme: any }) {
	const router = useRouter();
	if (enrollment.status !== "active") return null;
	// In-studio active classes: scan the academy's QR to mark attendance.
	if (enrollment.mode !== "online") {
		return (
			<Pressable
				onPress={() =>
					router.push(
						`/checkin-scan?class_name=${encodeURIComponent(enrollment.batch_title ?? "")}&academy_name=${encodeURIComponent(enrollment.academy_name ?? "")}` as any,
					)
				}
				style={[
					joinStyles.btn,
					{
						backgroundColor: theme.color.jade,
						flexDirection: "row",
						justifyContent: "center",
						gap: 9,
					},
				]}
			>
				<IconQr size={18} color={theme.color.ivory} />
				<Text style={[joinStyles.btnText, { color: theme.color.ivory }]}>
					Scan to check in
				</Text>
			</Pressable>
		);
	}
	const timings: Timing[] = enrollment.timings ?? [];
	const nextClass = getNextClass(timings);
	if (!nextClass) return null;
	const duration = timings[0]?.duration_min ?? 60;
	const minutesUntil = (nextClass.getTime() - Date.now()) / 60000;
	if (minutesUntil <= -duration) return null;
	if (minutesUntil > 10) {
		const mins = Math.round(minutesUntil);
		return (
			<View style={[joinStyles.pill, { backgroundColor: theme.color.bone }]}>
				<Text style={[joinStyles.pillText, { color: theme.color.mist }]}>
					Starts in {mins < 60 ? `${mins}m` : `${Math.round(mins / 60)}h`}
				</Text>
			</View>
		);
	}
	return (
		<Pressable
			onPress={() => router.push(`/live/${enrollment.batch_id}`)}
			style={[joinStyles.btn, { backgroundColor: theme.color.jade }]}
		>
			<Text style={[joinStyles.btnText, { color: theme.color.ivory }]}>
				Join Class →
			</Text>
		</Pressable>
	);
}

const joinStyles = StyleSheet.create({
	btn: {
		borderRadius: 14,
		paddingVertical: 14,
		alignItems: "center",
		marginHorizontal: 24,
		marginBottom: 16,
	},
	btnText: { fontSize: 15, fontWeight: "700", letterSpacing: 0.2 },
	pill: {
		alignSelf: "flex-start",
		marginHorizontal: 24,
		marginBottom: 16,
		paddingHorizontal: 12,
		paddingVertical: 6,
		borderRadius: 999,
	},
	pillText: { fontSize: 12, fontWeight: "600" },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function EnrollmentDetailScreen() {
	const theme = useTheme();
	const router = useRouter();
	const { id, openRenew } = useLocalSearchParams<{
		id: string;
		openRenew?: string;
	}>();
	const enrollments = useEnrollments();
	const detailQ = useEnrollmentDetail(id);
	const [subSheet, setSubSheet] = useState<SubSheet>(null);
	const cancelDiscMut = useCancelDiscontinuation();
	const resumeMut = useResumePause();

	const enrollment = useMemo(
		() => (enrollments.data?.items ?? []).find((item: any) => item.id === id),
		[enrollments.data, id],
	);
	// Called unconditionally (before the loading/not-found early returns below)
	// to satisfy the rules of hooks; enabled:!!id in useAcademy holds off the
	// fetch until enrollment.academy_id is known.
	const academy = useAcademy(enrollment?.academy_id ?? "");

	// M1.3: the Classes-tab "Renewal due" card deep-links here with ?openRenew=1
	// to jump straight into the existing RenewSheet. A ref (not just checking
	// subSheet===null) guards this so a later data refetch — which changes the
	// `enrollment` reference and would otherwise re-run this effect — can't
	// reopen the sheet after the student has already closed it.
	const autoOpenedRenewal = useRef(false);
	useEffect(() => {
		if (openRenew === "1" && enrollment && !autoOpenedRenewal.current) {
			autoOpenedRenewal.current = true;
			setSubSheet("renew");
		}
	}, [openRenew, enrollment]);
	const detail = (detailQ.data as any)?.enrollment;
	const period = detail?.current_period;

	if (enrollments.isLoading) {
		return (
			<SafeAreaView
				style={{ flex: 1, backgroundColor: theme.color.paper }}
				edges={["top"]}
			>
				<ScreenHeader title="Class details" />
				<View style={{ paddingHorizontal: 24, paddingTop: 12, gap: 12 }}>
					<SkeletonLoader height={28} width="70%" borderRadius={8} />
					<SkeletonLoader height={14} width="50%" borderRadius={6} />
					<SkeletonLoader
						height={80}
						borderRadius={14}
						style={{ marginTop: 8 }}
					/>
					<SkeletonLoader height={80} borderRadius={14} />
					<SkeletonLoader height={100} borderRadius={14} />
				</View>
			</SafeAreaView>
		);
	}

	if (!enrollment) {
		return (
			<SafeAreaView
				style={{ flex: 1, backgroundColor: theme.color.paper }}
				edges={["top"]}
			>
				<ScreenHeader title="Class details" />
				<EmptyState message="Enrollment not found." />
			</SafeAreaView>
		);
	}

	const catColors =
		theme.category[enrollment.category as keyof typeof theme.category] ??
		theme.category.music;
	const nextClass = getNextClass(enrollment.timings);
	const nextTiming = nextClass
		? enrollment.timings?.find(
				(timing: Timing) => timing.day_of_week === nextClass.getDay(),
			)
		: null;
	const fee = enrollment.monthly_fee_paise
		? `₹${Math.round(enrollment.monthly_fee_paise / 100).toLocaleString("en-IN")}/mo`
		: null;
	const attendedCount: number = enrollment.attended_count ?? 0;
	const DOT_COUNT = 10;
	const filledDots = Math.min(attendedCount, DOT_COUNT);
	const timings: Timing[] = enrollment.timings ?? [];
	const isOnline = enrollment.mode === "online";

	// The list serializer omits pause/discontinue/period fields; the detail
	// endpoint carries them, so prefer `detail` and fall back to the list item.
	const pausedUntil = detail?.paused_until ?? enrollment.paused_until ?? null;
	const isPaused = !!pausedUntil;
	const isDiscontinuePending = !!(
		detail?.discontinue_requested_at ?? enrollment.discontinue_requested_at
	);
	const isInactive = enrollment.status !== "active";
	// Batch being discontinued — renewals are blocked; existing term serves out.
	const isBatchClosing =
		detail?.batch_status === "closing" || detail?.batch_status === "ended";
	const activePauseId = detail?.active_pause?.id ?? null;

	// Plan & billing (from the detail endpoint's current period).
	const planLabel = period?.package_type
		? (PACKAGE_CONFIG[period.package_type]?.label ?? period.package_type)
		: null;
	const nextRenewal = period?.grace_period_end ?? period?.end_date ?? null;
	const scheduleLine = [
		isOnline ? "Online" : null,
		batchDayPattern(timings),
		timings[0] ? formatTimeRange(timings[0]) : null,
	]
		.filter(Boolean)
		.join(" · ");
	const nextClassLabel = nextClass
		? `${format(nextClass, "EEE, d MMM")}${nextTiming ? ` · ${formatTimeRange(nextTiming).split(" – ")[0]}` : ""}`
		: "No upcoming classes scheduled";

	const statusConfig = (() => {
		if (isPaused)
			return {
				label: "● Paused",
				bg: theme.color.marigoldSoft,
				fg: theme.color.marigold,
			};
		if (isDiscontinuePending)
			return {
				label: "● Ending",
				bg: theme.color.roseSoft,
				fg: theme.color.rose,
			};
		if (enrollment.status === "active")
			return {
				label: "● Active",
				bg: theme.color.jadeSoft,
				fg: theme.color.jade,
			};
		if (enrollment.status === "grace")
			return {
				label: "● Grace period",
				bg: theme.color.marigoldSoft,
				fg: theme.color.marigold,
			};
		return { label: "● Inactive", bg: theme.color.bone, fg: theme.color.mist };
	})();

	// The academy's own coach is this app's support contact — there's no
	// separate central Findemy support line. Matched by name since the
	// enrollment/classes list only carries coach_name, not a coach id.
	const coach = ((academy.data as any)?.coaches ?? []).find(
		(c: any) => c.name === enrollment.coach_name,
	);
	const coachPhone: string | undefined = coach?.phone ?? undefined;
	const handleNeedHelp = () => {
		if (!coachPhone) return;
		openWhatsApp(
			coachPhone,
			`Hi, I need help with my ${enrollment.batch_title} class — billing, timings, or another issue.`,
		);
	};
	const handleChatSupport = () => {
		if (!coachPhone) return;
		openWhatsApp(
			coachPhone,
			`Hi! I have a question about my ${enrollment.batch_title} class at ${enrollment.academy_name}.`,
		);
	};

	const handleCancelDiscontinue = async () => {
		try {
			await cancelDiscMut.mutateAsync(enrollment.id);
			Alert.alert(
				"Discontinuation cancelled",
				"Your enrollment will continue as normal.",
			);
		} catch {
			/* onError handles */
		}
	};

	const handleResume = async () => {
		if (!activePauseId) return;
		try {
			await resumeMut.mutateAsync({
				enrollmentId: enrollment.id,
				pauseId: activePauseId,
			});
			Alert.alert("Class resumed", "Your enrolment is active again.");
		} catch {
			/* onError handles */
		}
	};

	const handleDirections = () => {
		const address = encodeURIComponent(
			enrollment.academy_address ?? enrollment.academy_name ?? "",
		);
		Linking.openURL(
			Platform.OS === "ios" ? `maps://?q=${address}` : `geo:0,0?q=${address}`,
		).catch(() => Linking.openURL(`https://maps.google.com/?q=${address}`));
	};

	const closeSheet = () => setSubSheet(null);

	return (
		<SafeAreaView
			style={{ flex: 1, backgroundColor: theme.color.paper }}
			edges={["top"]}
		>
			<ScreenHeader title="Class details" />

			<ScrollView
				contentContainerStyle={styles.body}
				showsVerticalScrollIndicator={false}
			>
				{/* ── Summary card ── */}
				<View
					style={[
						styles.sumCard,
						{ borderColor: theme.color.hairline, ...theme.shadow.sm },
					]}
				>
					<BlockPrintCover
						category={enrollment.category as any}
						variant={1}
						height={74}
						hideLetter
						style={styles.sumThumb}
					/>
					<View style={{ flex: 1, minWidth: 0 }}>
						<Text
							style={[
								styles.sumTtl,
								{ fontFamily: theme.font.sansBold, color: theme.color.ink },
							]}
							numberOfLines={1}
						>
							{enrollment.batch_title}
						</Text>
						<Text
							style={[
								styles.sumSub,
								{ fontFamily: theme.font.sansMedium, color: theme.color.mist },
							]}
							numberOfLines={1}
						>
							{[enrollment.academy_name, enrollment.coach_name]
								.filter(Boolean)
								.join(" · ")}
						</Text>
						<View style={styles.sumFoot}>
							<Text
								style={[
									styles.sumSchedule,
									{
										fontFamily: theme.font.sansMedium,
										color: theme.color.mist,
									},
								]}
								numberOfLines={1}
							>
								{scheduleLine}
							</Text>
							{fee ? (
								<Text
									style={[
										styles.sumFee,
										{ fontFamily: theme.font.sansBold, color: theme.color.ink },
									]}
								>
									{fee}
								</Text>
							) : null}
						</View>
					</View>
				</View>

				{/* ── Status banner ── */}
				{isDiscontinuePending ? (
					<StatusBanner
						tone="rose"
						right={
							<Pressable onPress={handleCancelDiscontinue} hitSlop={8}>
								{cancelDiscMut.isPending ? (
									<ActivityIndicator size="small" color={theme.color.rose} />
								) : (
									<Text
										style={{
											fontFamily: theme.font.sansBold,
											fontSize: 12.5,
											color: theme.color.rose,
										}}
									>
										Undo
									</Text>
								)}
							</Pressable>
						}
					>
						Discontinuation scheduled — access ends with this period.
					</StatusBanner>
				) : isPaused ? (
					<StatusBanner tone="gold">
						{`Paused — resumes ${format(new Date(pausedUntil), "d MMMM")}.`}
					</StatusBanner>
				) : enrollment.status === "active" ? (
					<StatusBanner
						tone="jade"
						icon={<IconCheck size={18} color={theme.color.jade} />}
					>
						Your enrolment is active.
					</StatusBanner>
				) : null}

				{/* ── Action buttons ── */}
				<JoinClassButton enrollment={enrollment} theme={theme} />
				{enrollment.status === "active" && !isOnline ? (
					<View style={{ marginBottom: 4 }}>
						<Button variant="ghost" block onPress={handleDirections}>
							Get directions
						</Button>
					</View>
				) : null}

				{/* ── Class details ── */}
				<SectionLabel>Class details</SectionLabel>
				<Summary>
					{enrollment.coach_name ? (
						<SummaryRow
							icon={<IconUser size={18} color={theme.color.persimmon} />}
							label="Coach"
							value={enrollment.coach_name}
						/>
					) : null}
					<SummaryRow
						icon={<IconCal size={18} color={theme.color.persimmon} />}
						label="Schedule"
						value={scheduleLine || "—"}
					/>
					{isOnline ? (
						<SummaryRow
							icon={<IconMappin size={18} color={theme.color.persimmon} />}
							label="Mode"
							value="Online · link active 10 min before"
						/>
					) : (
						<SummaryRow
							icon={<IconMappin size={18} color={theme.color.persimmon} />}
							label="Venue"
							value={
								enrollment.academy_address ?? enrollment.academy_name ?? "—"
							}
						/>
					)}
					<SummaryRow
						icon={<IconClock size={18} color={theme.color.persimmon} />}
						label="Next class"
						value={nextClassLabel}
						last
					/>
				</Summary>

				{/* ── Plan & billing ── */}
				<SectionLabel>Plan &amp; billing</SectionLabel>
				<Summary>
					<BillRow label="Class" value={enrollment.batch_title} theme={theme} />
					{planLabel ? (
						<BillRow label="Plan" value={planLabel} theme={theme} />
					) : null}
					{fee ? <BillRow label="Fee" value={fee} theme={theme} /> : null}
					{nextRenewal ? (
						<BillRow
							label="Next renewal"
							value={format(new Date(nextRenewal), "d MMM yyyy")}
							theme={theme}
						/>
					) : null}
					<BillRow
						label="Payment method"
						value="UPI · Razorpay"
						theme={theme}
					/>
					<BillRow
						label="Member since"
						value={
							enrollment.started_at
								? format(new Date(enrollment.started_at), "MMM yyyy")
								: "—"
						}
						theme={theme}
						last
					/>
				</Summary>

				{/* ── Attendance (extra) ── */}
				<SectionLabel>Your attendance</SectionLabel>
				<Summary>
					<Text
						style={{
							fontFamily: theme.font.serif,
							fontSize: 22,
							color: theme.color.ink,
						}}
					>
						{attendedCount > 0
							? `${attendedCount} ${attendedCount === 1 ? "class" : "classes"}`
							: "No classes yet"}
					</Text>
					{attendedCount > 0 ? (
						<>
							<View style={styles.dotTrack}>
								{Array.from({ length: DOT_COUNT }).map((_, index) => (
									<View
										key={index}
										style={[
											styles.dot,
											{
												backgroundColor:
													index < filledDots
														? catColors.accent
														: theme.color.hairline,
											},
										]}
									/>
								))}
								{attendedCount > DOT_COUNT ? (
									<Text
										style={[
											styles.dotOverflow,
											{ fontFamily: theme.font.sans, color: theme.color.mist },
										]}
									>
										+{attendedCount - DOT_COUNT} more
									</Text>
								) : null}
							</View>
							<View
								style={[
									styles.progressTrack,
									{ backgroundColor: theme.color.hairline },
								]}
							>
								<View
									style={[
										styles.progressFill,
										{
											backgroundColor: catColors.accent,
											width: `${(filledDots / DOT_COUNT) * 100}%`,
										},
									]}
								/>
							</View>
						</>
					) : null}
				</Summary>

				{/* ── Study material (M5.2) ── */}
				<SectionLabel>Study material</SectionLabel>
				<MenuRow
					title="Resources"
					sub="Notes & files shared by your teacher"
					onPress={() =>
						router.push(`/resources/${enrollment.batch_id}` as any)
					}
				/>

				{/* ── Manage class ── */}
				<SectionLabel>Manage class</SectionLabel>
				<MenuRow
					title="Renew or change plan"
					sub="Switch monthly / quarterly / annual"
					disabled={isInactive || isBatchClosing}
					disabledReason={
						isBatchClosing
							? "This batch is being discontinued"
							: "Enrollment ended"
					}
					onPress={() => setSubSheet("renew")}
				/>
				{isPaused ? (
					<MenuRow
						title="Resume class"
						sub="Restart your paused enrolment"
						tone="jade"
						disabled={!activePauseId || resumeMut.isPending}
						onPress={handleResume}
					/>
				) : (
					<MenuRow
						title="Pause class"
						sub="Going away? Hold for up to a month"
						disabled={isInactive}
						disabledReason="Enrollment ended"
						onPress={() => setSubSheet("pause")}
					/>
				)}
				<MenuRow
					title="Transfer batch"
					sub="Move to a different timing"
					disabled={isPaused || isInactive}
					disabledReason={isPaused ? "Resume first" : "Enrollment ended"}
					onPress={() => setSubSheet("transfer")}
				/>
				<MenuRow
					title="Discontinue"
					sub="Cancel this enrolment"
					tone="rose"
					disabled={isDiscontinuePending || isInactive}
					disabledReason={
						isDiscontinuePending ? "Already ending" : "Enrollment ended"
					}
					onPress={() => setSubSheet("discontinue")}
				/>

				{/* ── Support ── */}
				<SectionLabel>Support</SectionLabel>
				<MenuRow
					title="Need help with this class"
					sub="Billing, timings & issues"
					disabled={!coachPhone}
					disabledReason="No contact number on file for this class"
					right={
						coachPhone ? (
							<IconWa size={18} color={theme.color.jade} />
						) : undefined
					}
					onPress={handleNeedHelp}
				/>
				<MenuRow
					title="Chat with support"
					sub="Typically replies in a few minutes"
					disabled={!coachPhone}
					disabledReason="No contact number on file for this class"
					right={
						coachPhone ? (
							<IconWa size={18} color={theme.color.jade} />
						) : undefined
					}
					onPress={handleChatSupport}
				/>
				<MenuRow
					title="Terms & conditions"
					sub="Billing & cancellation policy"
					onPress={() => router.push("/profile/general-info" as any)}
				/>
			</ScrollView>

			{/* ── Sub-sheet host ── */}
			<Modal
				visible={!!subSheet}
				transparent
				animationType="slide"
				onRequestClose={closeSheet}
			>
				<Pressable style={sheetStyles.backdrop} onPress={closeSheet} />
				<View
					style={[sheetStyles.sheet, { backgroundColor: theme.color.paper }]}
				>
					{subSheet === "renew" && (
						<RenewSheet enrollment={enrollment} onClose={closeSheet} />
					)}
					{subSheet === "discontinue" && (
						<DiscontinueSheet enrollment={enrollment} onClose={closeSheet} />
					)}
					{subSheet === "pause" && (
						<PauseSheet enrollment={enrollment} onClose={closeSheet} />
					)}
					{subSheet === "transfer" && (
						<TransferSheet enrollment={enrollment} onClose={closeSheet} />
					)}
				</View>
			</Modal>
		</SafeAreaView>
	);
}

const sheetStyles = StyleSheet.create({
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
	titleRow: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		paddingVertical: 14,
	},
	title: { fontSize: 22 },
});

const renewStyles = StyleSheet.create({
	check: {
		width: 20,
		height: 20,
		borderRadius: 6,
		borderWidth: 2,
		alignItems: "center",
		justifyContent: "center",
	},
});

const discStyles = StyleSheet.create({
	infoBox: {
		borderRadius: 12,
		borderWidth: 1,
		padding: 14,
		marginBottom: 4,
		marginTop: 4,
	},
});

const pauseStyles = StyleSheet.create({
	durationPill: {
		paddingVertical: 14,
		borderRadius: 12,
		borderWidth: 1,
		alignItems: "center",
	},
	input: {
		borderWidth: 1,
		borderRadius: 12,
		paddingHorizontal: 14,
		paddingVertical: 12,
		fontSize: 14,
	},
});

const styles = StyleSheet.create({
	body: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 48 },
	// Summary row-card (prototype `.row-card`)
	sumCard: {
		flexDirection: "row",
		alignItems: "center",
		gap: 13,
		backgroundColor: "#fff",
		borderWidth: 1,
		borderRadius: 20,
		padding: 14,
	},
	sumThumb: { width: 74, height: 74, borderRadius: 15, overflow: "hidden" },
	sumTtl: { fontSize: 16, letterSpacing: -0.16, lineHeight: 18 },
	sumSub: { fontSize: 13, marginTop: 3 },
	sumFoot: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		gap: 8,
		marginTop: 8,
	},
	sumSchedule: { fontSize: 12.5, flexShrink: 1, paddingRight: 8 },
	sumFee: { fontSize: 15, fontVariant: ["tabular-nums"] },
	// Attendance progress (extra section, inside a Summary card)
	dotTrack: {
		flexDirection: "row",
		alignItems: "center",
		gap: 5,
		marginTop: 12,
		marginBottom: 10,
	},
	dot: { width: 9, height: 9, borderRadius: 999 },
	dotOverflow: { fontSize: 11, marginLeft: 4 },
	progressTrack: { height: 5, borderRadius: 999, overflow: "hidden" },
	progressFill: { height: 5, borderRadius: 999 },
});
