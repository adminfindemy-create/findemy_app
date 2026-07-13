import React, { useState } from "react";
import { View, Text, StyleSheet, Modal, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { useTheme, Button, Chip } from "@findemy/ui";
import { AuthScaffold, AuthHeading, AuthSub, Em } from "@/components/auth/AuthScaffold";
import { api } from "@/lib/api";
import { useAuth } from "@/stores/auth";
import type { Category } from "@findemy/types";

type CategoryDef = { key: Category; label: string };

// Only the four real Category values are wired to the API. (The prototype also
// shows Pottery/Theatre/Singing/Drums chips, but those aren't in the data model.)
const CATEGORIES: CategoryDef[] = [
  { key: "music", label: "🎵 Music" },
  { key: "dance", label: "💃 Dance" },
  { key: "arts",  label: "🎨 Arts" },
  { key: "yoga",  label: "🧘 Yoga" },
];

export default function InterestsScreen() {
  const router = useRouter();
  const theme = useTheme();
  const [selected, setSelected] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [showOtp, setShowOtp] = useState(false);
  const attendanceOtp = useAuth((state) => state.attendanceOtp);
  const setUser = useAuth((state) => state.setUser);

  const toggle = (key: Category) => {
    setSelected((prev) =>
      prev.includes(key) ? prev.filter((selectedKey) => selectedKey !== key) : [...prev, key]
    );
  };

  const canContinue = selected.length >= 2;

  const handleContinue = async () => {
    if (!canContinue) return;
    setLoading(true);
    try {
      await api.me.updateInterests({ interests: selected });
      setUser({ interests: selected });
      if (attendanceOtp) {
        setShowOtp(true);
      } else {
        router.replace("/(tabs)");
      }
    } catch {
      // error toast (TODO)
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthScaffold
      footer={
        <View style={[styles.footer, { backgroundColor: theme.color.paperWarm, borderTopColor: theme.color.hairline }]}>
          <Text style={{ flex: 1, fontFamily: theme.font.sans, fontSize: 12, color: theme.color.mist }}>
            {selected.length} of {CATEGORIES.length} selected
          </Text>
          <Pressable onPress={() => router.replace("/(tabs)")} style={{ paddingHorizontal: 12, paddingVertical: 10 }}>
            <Text style={{ fontFamily: theme.font.sansSemibold, fontSize: 13, color: theme.color.mist }}>
              Skip
            </Text>
          </Pressable>
          <Button variant="dark" loading={loading} disabled={!canContinue} onPress={handleContinue}>
            Start exploring
          </Button>
        </View>
      }
    >
      <View style={{ marginTop: 8 }}>
        <AuthHeading size={34}>
          What do you <Em>love?</Em>
        </AuthHeading>
        <AuthSub>Pick a few — we'll tailor your discovery.</AuthSub>
      </View>

      <View style={styles.chips}>
        {CATEGORIES.map((cat) => (
          <Chip
            key={cat.key}
            label={cat.label}
            selected={selected.includes(cat.key)}
            onPress={() => toggle(cat.key)}
          />
        ))}
      </View>

      <Modal visible={showOtp} transparent animationType="fade">
        <View style={[styles.modalOverlay, { backgroundColor: "rgba(0,0,0,0.5)" }]}>
          <View style={[styles.modalContent, { backgroundColor: theme.color.ivory }]}>
            <Text style={{ fontFamily: theme.font.serif, fontSize: 30, color: theme.color.ink, marginBottom: 8 }}>
              Your trial code
            </Text>
            <Text
              style={{
                fontFamily: theme.font.sans,
                fontSize: 13,
                color: theme.color.mist,
                textAlign: "center",
                marginBottom: 24,
                lineHeight: 18,
              }}
            >
              Show this to academies when you arrive at trials. You can find it later in your profile.
            </Text>
            <Text
              style={{
                fontFamily: theme.font.serif,
                fontSize: 40,
                fontStyle: "italic",
                color: theme.color.persimmon,
                letterSpacing: 6,
                marginBottom: 28,
              }}
            >
              {attendanceOtp ?? "——————"}
            </Text>
            <Button
              block
              onPress={() => {
                setShowOtp(false);
                router.replace("/(tabs)");
              }}
            >
              Got it
            </Button>
          </View>
        </View>
      </Modal>
    </AuthScaffold>
  );
}

const styles = StyleSheet.create({
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 24,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 22,
    paddingTop: 14,
    paddingBottom: 36,
    borderTopWidth: 1,
  },
  modalOverlay: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  modalContent: {
    width: "100%",
    borderRadius: 28,
    padding: 28,
    alignItems: "center",
  },
});
