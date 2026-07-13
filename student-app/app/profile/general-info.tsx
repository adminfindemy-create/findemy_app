import React from "react";
import { View, Text, Pressable, Alert, StyleSheet } from "react-native";
import { useTheme, IconEdit, IconShield, IconSparkle, IconHelp, IconChevR } from "@findemy/ui";
import { SafeAreaView } from "react-native-safe-area-context";
import { ScreenHeader } from "@/components/common/ScreenHeader";
import Constants from "expo-constants";

const appVersion = Constants.expoConfig?.version ?? "1.0.0";

export default function GeneralInfoScreen() {
  const theme = useTheme();

  const items = [
    { label: "Terms & Conditions", icon: <IconEdit size={20} color={theme.color.persimmon} />, onPress: () => Alert.alert("Terms & Conditions", "Our terms of service will be available soon.") },
    { label: "Privacy Policy", icon: <IconShield size={20} color={theme.color.persimmon} />, onPress: () => Alert.alert("Privacy Policy", "Our privacy policy will be available soon.") },
    { label: "About Findemy", icon: <IconSparkle size={20} color={theme.color.persimmon} />, onPress: () => Alert.alert("About Findemy", "Findemy connects students with top music, dance, yoga, and art academies near them.") },
    { label: "Help & Support", icon: <IconHelp size={20} color={theme.color.persimmon} />, onPress: () => Alert.alert("Help & Support", "Our support team is here for you. Coming soon.") },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.color.paper }} edges={["top"]}>
      <ScreenHeader title="General info" />
      <View style={{ paddingHorizontal: 20, paddingTop: 8 }}>
        <View style={[styles.pmenu, { borderColor: theme.color.hairline, ...theme.shadow.sm }]}>
          {items.map((item, index) => (
            <Pressable key={item.label} onPress={item.onPress} style={[styles.prow, index < items.length - 1 && { borderBottomWidth: 1, borderBottomColor: theme.color.hairline }]}>
              {item.icon}
              <Text style={{ flex: 1, fontFamily: theme.font.sansSemibold, fontSize: 14.5, color: theme.color.ink }}>{item.label}</Text>
              <IconChevR size={18} color={theme.color.whisper} />
            </Pressable>
          ))}
        </View>

        <Text style={{ fontFamily: theme.font.sans, fontSize: 12, color: theme.color.mist, textAlign: "center", marginTop: 24 }}>
          Findemy · v{appVersion} · Delhi-NCR
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  pmenu: { backgroundColor: "#fff", borderWidth: 1, borderRadius: 20, overflow: "hidden" },
  prow: { flexDirection: "row", alignItems: "center", gap: 14, padding: 16 },
});
