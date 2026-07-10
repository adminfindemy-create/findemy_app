import React, { useState } from "react";
import { View, Text, Pressable, TextInput, ScrollView, StyleSheet } from "react-native";
import { useTheme, IconLoc, IconMappin, IconSearch } from "@findemy/ui";
import { BottomSheet } from "@/components/BottomSheet";

export type Area = { name: string; sub: string; lat: number; lng: number };

// Delhi-NCR presets (the launch market). Coordinates are approximate area
// centroids — enough to drive the distance sort in Discover.
const POPULAR_AREAS: Area[] = [
  { name: "Hauz Khas", sub: "New Delhi", lat: 28.5494, lng: 77.2001 },
  { name: "Saket", sub: "New Delhi", lat: 28.5245, lng: 77.2066 },
  { name: "Connaught Place", sub: "Central Delhi", lat: 28.6315, lng: 77.2167 },
  { name: "Lajpat Nagar", sub: "New Delhi", lat: 28.5677, lng: 77.2433 },
  { name: "Gurugram", sub: "Haryana", lat: 28.4595, lng: 77.0266 },
  { name: "Noida", sub: "Uttar Pradesh", lat: 28.5355, lng: 77.391 },
];

export function LocationSheet({
  visible,
  onClose,
  onPickArea,
  onUseCurrent,
}: {
  visible: boolean;
  onClose: () => void;
  onPickArea: (area: Area) => void;
  onUseCurrent: () => void;
}) {
  const theme = useTheme();
  const [q, setQ] = useState("");

  const filtered = POPULAR_AREAS.filter(
    (a) => a.name.toLowerCase().includes(q.trim().toLowerCase()) || a.sub.toLowerCase().includes(q.trim().toLowerCase())
  );

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <View style={styles.head}>
        <Text style={{ fontFamily: theme.font.serifItalic, fontSize: 28, color: theme.color.ink }}>Change location</Text>
        <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Close">
          <Text style={{ fontSize: 18, color: theme.color.mist }}>✕</Text>
        </Pressable>
      </View>

      <View style={[styles.search, { borderColor: theme.color.hairline }]}>
        <IconSearch size={18} color={theme.color.whisper} />
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder="Search area, city or pincode…"
          placeholderTextColor={theme.color.whisper}
          style={{ flex: 1, fontFamily: theme.font.sans, fontSize: 15, color: theme.color.ink, paddingVertical: 0 }}
        />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <Pressable
          onPress={() => {
            onUseCurrent();
            onClose();
          }}
          style={[styles.opt, { borderColor: theme.color.persimmonSoft }]}
        >
          <View style={[styles.optIc, { backgroundColor: theme.color.persimmonSoft }]}>
            <IconLoc size={18} color={theme.color.persimmon} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: theme.font.sansBold, fontSize: 15, color: theme.color.persimmonDeep }}>Use my current location</Text>
            <Text style={{ fontFamily: theme.font.sans, fontSize: 12, color: theme.color.mist }}>Detect automatically via GPS</Text>
          </View>
        </Pressable>

        {filtered.length ? (
          <Text style={[styles.blockLabel, { fontFamily: theme.font.sansBold, color: theme.color.whisper }]}>POPULAR AREAS</Text>
        ) : (
          <Text style={{ fontFamily: theme.font.sans, fontSize: 13, color: theme.color.mist, paddingVertical: 16, textAlign: "center" }}>
            No areas match “{q}”.
          </Text>
        )}

        {filtered.map((a) => (
          <Pressable
            key={a.name}
            onPress={() => {
              onPickArea(a);
              onClose();
            }}
            style={[styles.opt, { borderColor: theme.color.hairline }]}
          >
            <View style={[styles.optIc, { backgroundColor: theme.color.paperWarm }]}>
              <IconMappin size={16} color={theme.color.persimmon} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: theme.font.sansBold, fontSize: 15, color: theme.color.ink }}>{a.name}</Text>
              <Text style={{ fontFamily: theme.font.sans, fontSize: 12, color: theme.color.mist }}>{a.sub}</Text>
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  head: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  search: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 15,
    paddingVertical: 12,
    marginBottom: 14,
  },
  blockLabel: {
    fontSize: 11,
    letterSpacing: 1.6,
    marginTop: 6,
    marginBottom: 8,
  },
  opt: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1.5,
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
  },
  optIc: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
});
