import { ErrorState } from "@/components/common/ErrorState";
import { useMe } from "@/hooks/useMe";
import { api } from "@/lib/api";
import { useAuth } from "@/stores/auth";
import {
	IconArrowR,
	IconBell,
	IconCheck,
	IconChevR,
	IconClock,
	IconHeart,
	IconHelp,
	IconShield,
	IconUser,
	IconUsers,
	useTheme,
} from "@findemy/ui";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
	Alert,
	Pressable,
	ScrollView,
	StyleSheet,
	Text,
	View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

function formatPhone(phone: string | undefined): string {
	if (!phone) return "";
	const digits = phone.replace(/\D/g, "");
	if (digits.length === 10)
		return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
	if (digits.length === 12 && digits.startsWith("91"))
		return `+91 ${digits.slice(2, 7)} ${digits.slice(7)}`;
	return phone;
}

export default function ProfileScreen() {
	const router = useRouter();
	const theme = useTheme();
	const { user, clear } = useAuth();
	const me = useMe();
	const pushDenied = useAuth((state) => state.pushPermissionDenied);
	const [bannerDismissed, setBannerDismissed] = useState(false);

	const handleLogout = () => {
		Alert.alert("Log out", "Are you sure you want to log out?", [
			{ text: "Cancel", style: "cancel" },
			{
				text: "Log out",
				style: "destructive",
				onPress: async () => {
					try {
						const refreshToken = useAuth.getState().refreshToken;
						if (refreshToken)
							await api.auth.logout({ refresh_token: refreshToken });
					} catch {
						/* ignore */
					}
					clear();
					router.replace("/(auth)");
				},
			},
		]);
	};

	if (me.error) {
		return <ErrorState code={(me.error as any)?.code} onRetry={me.refetch} />;
	}

	const profile = (me.data?.user ?? user) as any;
	const initial = (profile?.name?.trim()?.[0] ?? "S").toUpperCase();
	const contact2 = [
		profile?.phone ? formatPhone(profile.phone) : null,
		profile?.location,
	]
		.filter(Boolean)
		.join(" · ");

	const quick = [
		{
			label: "My classes",
			icon: <IconClock size={19} color={theme.color.persimmon} />,
			onPress: () => router.push("/(tabs)/classes" as any),
		},
		{
			label: "Your Bookings",
			icon: <IconCheck size={19} color={theme.color.persimmon} />,
			onPress: () => router.push("/bookings" as any),
		},
		{
			label: "Wishlist",
			icon: <IconHeart size={19} color={theme.color.persimmon} />,
			onPress: () => router.push("/saved" as any),
		},
	];

	const info = [
		{
			label: "My classes",
			icon: <IconClock size={20} color={theme.color.persimmon} />,
			onPress: () => router.push("/(tabs)/classes" as any),
		},
		{
			label: "Your Bookings",
			icon: <IconCheck size={20} color={theme.color.persimmon} />,
			onPress: () => router.push("/bookings" as any),
		},
		{
			label: "Payment history",
			icon: <IconShield size={20} color={theme.color.persimmon} />,
			onPress: () => router.push("/payments" as any),
		},
		{
			label: "1:1 Sessions",
			icon: <IconUsers size={20} color={theme.color.persimmon} />,
			onPress: () => router.push("/coaching/history" as any),
		},
		{
			label: "Wishlist",
			icon: <IconHeart size={20} color={theme.color.persimmon} />,
			onPress: () => router.push("/saved" as any),
		},
		{
			label: "Profile details",
			icon: <IconUser size={20} color={theme.color.persimmon} />,
			onPress: () => router.push("/profile/edit" as any),
		},
		{
			label: "General info",
			icon: <IconHelp size={20} color={theme.color.persimmon} />,
			onPress: () => router.push("/profile/general-info" as any),
		},
		{
			label: "Refunds",
			icon: <IconArrowR size={20} color={theme.color.persimmon} />,
			onPress: () => Alert.alert("Refunds", "Refund requests coming soon."),
		},
	];

	return (
		<SafeAreaView
			style={{ flex: 1, backgroundColor: theme.color.paper }}
			edges={["top"]}
		>
			<ScrollView
				contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 120 }}
				showsVerticalScrollIndicator={false}
			>
				{/* Hero */}
				<View style={styles.headRow}>
					<Text
						style={{
							fontFamily: theme.font.serif,
							fontSize: 40,
							color: theme.color.ink,
							letterSpacing: -0.5,
						}}
					>
						Profile.
					</Text>
					<Pressable
						onPress={() => router.push("/profile/edit" as any)}
						style={[
							styles.seeAll,
							{ borderColor: theme.color.hairline, ...theme.shadow.sm },
						]}
					>
						<Text
							style={{
								fontFamily: theme.font.sansBold,
								fontSize: 12.5,
								color: theme.color.ink,
							}}
						>
							Edit
						</Text>
					</Pressable>
				</View>

				{/* Notification notice */}
				{pushDenied && !bannerDismissed ? (
					<View
						style={[
							styles.notice,
							{ backgroundColor: theme.color.marigoldSoft },
						]}
					>
						<IconBell size={18} color={theme.color.marigold} />
						<Text
							style={{
								flex: 1,
								fontFamily: theme.font.sansMedium,
								fontSize: 12.5,
								color: theme.color.inkSoft,
								lineHeight: 17,
							}}
						>
							Notifications are off. Turn them on so you don't miss a trial.
						</Text>
						<Pressable
							onPress={() => setBannerDismissed(true)}
							accessibilityLabel="Dismiss"
						>
							<Text style={{ fontSize: 15, color: theme.color.marigold }}>
								✕
							</Text>
						</Pressable>
					</View>
				) : null}

				{/* Avatar row */}
				<View style={styles.avatarRow}>
					<View
						style={[
							styles.avatar,
							{
								backgroundColor: theme.color.persimmon,
								borderColor: theme.color.hairline,
							},
						]}
					>
						<Text
							style={{
								fontFamily: theme.font.serifItalic,
								fontSize: 28,
								color: "#fff",
							}}
						>
							{initial}
						</Text>
					</View>
					<View style={{ flex: 1, minWidth: 0 }}>
						<Text
							style={{
								fontFamily: theme.font.sansBold,
								fontSize: 21,
								color: theme.color.ink,
							}}
							numberOfLines={1}
						>
							{profile?.name ?? "Student"}
						</Text>
						{profile?.email ? (
							<Text
								style={{
									fontFamily: theme.font.sansMedium,
									fontSize: 13.5,
									color: theme.color.mist,
									marginTop: 2,
								}}
								numberOfLines={1}
							>
								{profile.email}
							</Text>
						) : null}
						{contact2 ? (
							<Text
								style={{
									fontFamily: theme.font.sansMedium,
									fontSize: 13.5,
									color: theme.color.mist,
									marginTop: 2,
								}}
								numberOfLines={1}
							>
								{contact2}
							</Text>
						) : null}
					</View>
				</View>

				{/* Quick grid */}
				<View style={styles.quickGrid}>
					{quick.map((quickItem) => (
						<Pressable
							key={quickItem.label}
							onPress={quickItem.onPress}
							style={[
								styles.quick,
								{
									backgroundColor: "#fff",
									borderColor: theme.color.hairline,
									...theme.shadow.sm,
								},
							]}
						>
							<View
								style={[
									styles.qic,
									{ backgroundColor: theme.color.persimmonSoft },
								]}
							>
								{quickItem.icon}
							</View>
							<Text
								style={{
									fontFamily: theme.font.sansBold,
									fontSize: 11.5,
									color: theme.color.ink,
									textAlign: "center",
								}}
							>
								{quickItem.label}
							</Text>
						</Pressable>
					))}
				</View>

				{/* Your information */}
				<Text
					style={[
						styles.blockLabel,
						{ fontFamily: theme.font.sansBold, color: theme.color.whisper },
					]}
				>
					YOUR INFORMATION
				</Text>
				<View
					style={[
						styles.pmenu,
						{ borderColor: theme.color.hairline, ...theme.shadow.sm },
					]}
				>
					{info.map((infoItem, index) => (
						<Pressable
							key={infoItem.label}
							onPress={infoItem.onPress}
							style={[
								styles.prow,
								index < info.length - 1 && {
									borderBottomWidth: 1,
									borderBottomColor: theme.color.hairline,
								},
							]}
						>
							{infoItem.icon}
							<Text
								style={{
									flex: 1,
									fontFamily: theme.font.sansSemibold,
									fontSize: 14.5,
									color: theme.color.ink,
								}}
							>
								{infoItem.label}
							</Text>
							<IconChevR size={18} color={theme.color.whisper} />
						</Pressable>
					))}
				</View>

				{/* Account */}
				<View
					style={[
						styles.pmenu,
						{
							borderColor: theme.color.hairline,
							...theme.shadow.sm,
							marginTop: 12,
						},
					]}
				>
					<Pressable onPress={handleLogout} style={styles.prow}>
						<IconArrowR size={20} color={theme.color.rose} />
						<Text
							style={{
								flex: 1,
								fontFamily: theme.font.sansSemibold,
								fontSize: 14.5,
								color: theme.color.rose,
							}}
						>
							Log out
						</Text>
					</Pressable>
				</View>
			</ScrollView>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	headRow: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		paddingTop: 12,
		marginBottom: 14,
	},
	seeAll: {
		backgroundColor: "#fff",
		borderWidth: 1,
		borderRadius: 999,
		paddingHorizontal: 16,
		paddingVertical: 9,
	},
	notice: {
		flexDirection: "row",
		alignItems: "center",
		gap: 11,
		borderRadius: 16,
		padding: 13,
		marginBottom: 16,
	},
	avatarRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: 14,
		marginVertical: 6,
	},
	avatar: {
		width: 64,
		height: 64,
		borderRadius: 32,
		borderWidth: 1,
		alignItems: "center",
		justifyContent: "center",
		overflow: "hidden",
	},
	quickGrid: { flexDirection: "row", gap: 10, marginVertical: 18 },
	quick: {
		flex: 1,
		borderWidth: 1,
		borderRadius: 20,
		alignItems: "center",
		paddingVertical: 16,
		paddingHorizontal: 8,
	},
	qic: {
		width: 40,
		height: 40,
		borderRadius: 12,
		alignItems: "center",
		justifyContent: "center",
		marginBottom: 8,
	},
	blockLabel: {
		fontSize: 11,
		letterSpacing: 1.1,
		marginTop: 8,
		marginBottom: 10,
	},
	pmenu: {
		backgroundColor: "#fff",
		borderWidth: 1,
		borderRadius: 20,
		overflow: "hidden",
	},
	prow: { flexDirection: "row", alignItems: "center", gap: 14, padding: 16 },
});
