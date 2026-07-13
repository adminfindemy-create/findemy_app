import React, { useState } from "react";
import {
  View, Text, TextInput, ScrollView,
  StyleSheet, Share, Alert, ActivityIndicator,
} from "react-native";
import { useTheme, Button } from "@findemy/ui";
import { SafeAreaView } from "react-native-safe-area-context";
import { ScreenHeader } from "@/components/common/ScreenHeader";
import { useReferral, useReferralHistory, useClaimReferral } from "@/hooks/useReferral";
import * as Clipboard from "expo-clipboard";

export default function ReferScreen() {
  const theme = useTheme();
  const { data: referral, isLoading } = useReferral();
  const { data: historyData } = useReferralHistory();
  const claimMutation = useClaimReferral();
  const [claimCode, setClaimCode] = useState("");

  const code = (referral as any)?.code ?? "------";
  const points = (referral as any)?.points ?? 0;
  const history = (historyData as any)?.history ?? [];

  const handleCopy = async () => {
    await Clipboard.setStringAsync(code);
    Alert.alert("Copied!", "Referral code copied to clipboard.");
  };

  const handleShare = () => {
    Share.share({
      message: `Join me on Findemy! Use my referral code ${code} when you sign up and get 50 points.\nhttps://findemy.app/join?ref=${code}`,
    });
  };

  const handleClaim = async () => {
    const trimmedCode = claimCode.trim().toUpperCase();
    if (!trimmedCode) return;
    try {
      const response = await claimMutation.mutateAsync(trimmedCode);
      setClaimCode("");
      Alert.alert("Referral claimed!", `You earned ${(response as any).points_earned} points!`);
    } catch (error: any) {
      Alert.alert("Error", error.message || "Invalid or already used code");
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.color.paper }} edges={["top"]}>
      <ScreenHeader title="Refer & earn" />

      <ScrollView contentContainerStyle={{ paddingBottom: 60 }}>
        <View style={styles.head}>
          <Text style={{ fontFamily: theme.font.sans, fontSize: 13, color: theme.color.mist }}>
            Invite friends and earn points when they book their first trial.
          </Text>
        </View>

        {/* Points balance */}
        <View style={[styles.pointsCard, { backgroundColor: theme.color.persimmon }]}>
          <Text style={{ fontFamily: theme.font.sansBold, fontSize: 11, color: "rgba(255,255,255,0.75)", letterSpacing: 1.2, textTransform: "uppercase" }}>
            Your points
          </Text>
          {isLoading ? (
            <ActivityIndicator color="#fff" style={{ marginTop: 8 }} />
          ) : (
            <Text style={{ fontFamily: theme.font.serif, fontSize: 52, color: "#fff", lineHeight: 56, marginTop: 4 }}>
              {points}
            </Text>
          )}
          <Text style={{ fontFamily: theme.font.sans, fontSize: 12, color: "rgba(255,255,255,0.75)", marginTop: 4 }}>
            +100 pts per referral (you) · +50 pts for new friends
          </Text>
        </View>

        {/* Code card */}
        <View style={[styles.codeCard, { backgroundColor: theme.color.ivory, borderColor: theme.color.hairline }]}>
          <Text style={{ fontFamily: theme.font.sans, fontSize: 12, color: theme.color.mist, marginBottom: 8 }}>
            Your referral code
          </Text>
          <Text style={{ fontFamily: theme.font.serif, fontSize: 36, color: theme.color.ink, letterSpacing: 8, lineHeight: 40 }}>
            {code}
          </Text>
          <View style={{ flexDirection: "row", gap: 10, marginTop: 16 }}>
            <Button variant="ink" size="sm" onPress={handleShare} style={{ minWidth: 100 }}>Share</Button>
            <Button variant="ghost" size="sm" onPress={handleCopy} style={{ minWidth: 100 }}>Copy</Button>
          </View>
        </View>

        {/* Claim a code */}
        <View style={[styles.claimCard, { backgroundColor: theme.color.ivory, borderColor: theme.color.hairline }]}>
          <Text style={{ fontFamily: theme.font.sansSemibold, fontSize: 14, color: theme.color.ink, marginBottom: 8 }}>
            Got a referral code?
          </Text>
          <View style={{ flexDirection: "row", gap: 8, alignItems: "stretch" }}>
            <TextInput
              value={claimCode}
              onChangeText={setClaimCode}
              placeholder="Enter code"
              placeholderTextColor={theme.color.mist}
              autoCapitalize="characters"
              style={[styles.codeInput, { borderColor: theme.color.hairline, color: theme.color.ink, fontFamily: theme.font.sans }]}
            />
            <Button
              size="sm"
              onPress={handleClaim}
              loading={claimMutation.isPending}
              disabled={!claimCode.trim()}
            >
              Claim
            </Button>
          </View>
        </View>

        {/* History */}
        {history.length > 0 && (
          <View style={{ paddingHorizontal: 24, marginTop: 24 }}>
            <Text style={{ fontFamily: theme.font.serif, fontSize: 20, color: theme.color.ink, marginBottom: 12 }}>
              Referrals
            </Text>
            {history.map((referral: any) => (
              <View key={referral.id} style={[styles.histRow, { backgroundColor: theme.color.ivory, borderColor: theme.color.hairline }]}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: theme.font.sans, fontSize: 14, color: theme.color.ink }}>{referral.referree_name}</Text>
                  {referral.claimed_at && (
                    <Text style={{ fontFamily: theme.font.sans, fontSize: 11, color: theme.color.mist, marginTop: 2 }}>
                      {new Date(referral.claimed_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    </Text>
                  )}
                </View>
                <Text style={{ fontFamily: theme.font.sansBold, fontSize: 14, color: theme.color.jade }}>+100</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  head: {
    paddingHorizontal: 24,
    paddingTop: 4,
    paddingBottom: 16,
  },
  pointsCard: {
    marginHorizontal: 24,
    borderRadius: 20,
    padding: 24,
    marginBottom: 16,
  },
  codeCard: {
    marginHorizontal: 24,
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    alignItems: "center",
    marginBottom: 16,
  },
  claimCard: {
    marginHorizontal: 24,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  codeInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    letterSpacing: 4,
  },
  histRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
});
