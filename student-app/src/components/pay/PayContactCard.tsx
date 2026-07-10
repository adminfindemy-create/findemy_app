import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTheme, IconUser } from "@findemy/ui";
import { useAuth } from "@/stores/auth";
import { SectionRule } from "./SectionRule";

// "Your details" card — the logged-in learner's name + phone/location.
export function PayContactCard() {
  const theme = useTheme();
  const user = useAuth((s) => s.user) as any;
  return (
    <>
      <SectionRule label="YOUR DETAILS" />
      <View style={[styles.card, { backgroundColor: theme.color.paperWarm, borderColor: theme.color.hairline }]}>
        <View style={[styles.ic, { backgroundColor: theme.color.persimmonSoft }]}>
          <IconUser size={18} color={theme.color.persimmon} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: theme.font.sansBold, fontSize: 14.5, color: theme.color.ink }}>{user?.name ?? "You"}</Text>
          <Text style={{ fontFamily: theme.font.sansMedium, fontSize: 12.5, color: theme.color.mist, marginTop: 2 }}>
            {[user?.phone ? `+91 ${user.phone}` : null, user?.location].filter(Boolean).join(" · ") || "Findemy learner"}
          </Text>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 18, padding: 16, flexDirection: "row", alignItems: "center", gap: 12 },
  ic: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center" },
});
