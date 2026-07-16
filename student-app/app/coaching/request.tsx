import React, { useState } from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useTheme, Button, Chip, Input, DateTimePicker } from "@findemy/ui";
import { SafeAreaView } from "react-native-safe-area-context";
import { ScreenHeader } from "@/components/common/ScreenHeader";
import { ErrorState } from "@/components/common/ErrorState";
import { useCreateCoachBookingRequest } from "@/hooks/useCoaching";

// M4.2: 1:1 booking request form — mode selector + the new shared-ui
// DateTimePicker + a duration input. Submits via M4.1a's create-request
// endpoint; the academy quotes a price and the student pays only after
// acceptance (see app/coaching/[id].tsx).
export default function CoachingRequestScreen() {
	const router = useRouter();
	const theme = useTheme();
	const { coachId, coachName, academyName } = useLocalSearchParams<{
		coachId: string;
		coachName?: string;
		academyName?: string;
	}>();

	const [mode, setMode] = useState<"online" | "offline">("online");
	const [proposedAt, setProposedAt] = useState<Date | null>(null);
	const [duration, setDuration] = useState("60");

	const createRequest = useCreateCoachBookingRequest();

	const durationMin = Number(duration);
	const canSubmit =
		!!coachId &&
		!!proposedAt &&
		proposedAt.getTime() > Date.now() &&
		Number.isFinite(durationMin) &&
		durationMin > 0;

	const handleSubmit = async () => {
		if (!canSubmit || !proposedAt || !coachId) return;
		try {
			const response = await createRequest.mutateAsync({
				coach_id: coachId,
				mode,
				proposed_at: proposedAt.toISOString(),
				duration_min: durationMin,
			});
			router.replace(`/coaching/${response.booking.id}` as any);
		} catch {
			/* onError in the hook shows the Alert */
		}
	};

	if (!coachId) {
		return (
			<SafeAreaView style={{ flex: 1, backgroundColor: theme.color.paper }} edges={["top"]}>
				<ScreenHeader title="Request a session" />
				<ErrorState code="NOT_FOUND" />
			</SafeAreaView>
		);
	}

	return (
		<SafeAreaView style={{ flex: 1, backgroundColor: theme.color.paper }} edges={["top"]}>
			<ScreenHeader title="Request a 1:1 session" />
			<ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
				{coachName ? (
					<View style={styles.coachRow}>
						<View style={[styles.coachPic, { backgroundColor: theme.color.persimmon }]}>
							<Text style={{ color: "#fff", fontFamily: theme.font.serifItalic, fontSize: 18 }}>
								{coachName[0]?.toUpperCase() ?? "?"}
							</Text>
						</View>
						<View style={{ flex: 1, minWidth: 0 }}>
							<Text style={{ fontFamily: theme.font.sansBold, fontSize: 16, color: theme.color.ink }} numberOfLines={1}>
								{coachName}
							</Text>
							{academyName ? (
								<Text style={{ fontFamily: theme.font.sansMedium, fontSize: 12.5, color: theme.color.mist, marginTop: 2 }} numberOfLines={1}>
									{academyName}
								</Text>
							) : null}
						</View>
					</View>
				) : null}

				<Text style={[styles.sectionLabel, { fontFamily: theme.font.sansBold, color: theme.color.whisper }]}>MODE</Text>
				<View style={{ flexDirection: "row", gap: 10, marginBottom: 22 }}>
					<Chip label="Online" selected={mode === "online"} onPress={() => setMode("online")} />
					<Chip label="Offline" selected={mode === "offline"} onPress={() => setMode("offline")} />
				</View>

				<Text style={[styles.sectionLabel, { fontFamily: theme.font.sansBold, color: theme.color.whisper }]}>DATE &amp; TIME</Text>
				<DateTimePicker value={proposedAt} onChange={setProposedAt} style={{ marginBottom: 22 }} />

				<Input
					label="Duration (minutes)"
					value={duration}
					onChangeText={setDuration}
					keyboardType="number-pad"
					placeholder="60"
				/>

				<Text
					style={{
						fontFamily: theme.font.sans,
						fontSize: 12,
						color: theme.color.mist,
						lineHeight: 17,
						marginTop: 16,
					}}
				>
					The academy will review your request and quote a price for the session. You'll only be asked to
					pay once they accept.
				</Text>

				<View style={{ marginTop: 24 }}>
					<Button block onPress={handleSubmit} disabled={!canSubmit} loading={createRequest.isPending}>
						Send request
					</Button>
				</View>
			</ScrollView>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	coachRow: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 14, marginBottom: 24 },
	coachPic: { width: 46, height: 46, borderRadius: 23, alignItems: "center", justifyContent: "center" },
	sectionLabel: { fontSize: 11, letterSpacing: 1.1, fontWeight: "700", marginBottom: 10 },
});
