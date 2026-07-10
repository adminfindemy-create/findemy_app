import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Image } from "expo-image";
import { useTheme, IconChevR } from "@findemy/ui";
import { format } from "date-fns";
import { getWorkshopImage } from "@/lib/eventImages";

// Prototype `.row-card`: thumb + title + "Workshop · date" sub + fee/seats foot.
// Tapping the card opens the detail screen (register happens there).
export function WorkshopRowCard({ w, onPress }: { w: any; onPress: () => void }) {
  const theme = useTheme();

  const rawStart = w.start_at ?? w.startAt;
  const date = rawStart ? new Date(rawStart) : null;
  const dateValid = date && !isNaN(date.getTime());

  const pricePaise = w.price_paise ?? w.pricePaise ?? 0;
  const price = pricePaise === 0 ? "Free" : `₹${Math.round(pricePaise / 100).toLocaleString("en-IN")}`;

  const capacity = w.capacity ?? 0;
  const registered = w.registered_count ?? w.registeredCount ?? 0;
  const spotsLeft = capacity - registered;
  const isFull = spotsLeft <= 0;

  return (
    <Pressable
      onPress={onPress}
      style={[styles.card, { backgroundColor: "#fff", borderColor: theme.color.hairline, ...theme.shadow.sm }]}
    >
      <Image source={{ uri: getWorkshopImage(w.type) }} style={styles.thumb} contentFit="cover" transition={150} />

      <View style={styles.body}>
        <Text style={[styles.ttl, { fontFamily: theme.font.sansBold, color: theme.color.ink }]} numberOfLines={1}>
          {w.title}
        </Text>

        <View style={styles.subRow}>
          <View style={[styles.badge, { backgroundColor: theme.color.persimmonSoft }]}>
            <Text style={[styles.badgeText, { color: theme.color.persimmon }]}>
              {w.type === "online" ? "Online" : "Workshop"}
            </Text>
          </View>
          {dateValid ? (
            <Text style={[styles.sub, { fontFamily: theme.font.sansMedium, color: theme.color.mist }]} numberOfLines={1}>
              {format(date!, "EEE d MMM · h:mm a")}
            </Text>
          ) : null}
        </View>

        <View style={styles.foot}>
          <Text style={[styles.footText, { fontFamily: theme.font.sansMedium, color: theme.color.mist }]} numberOfLines={1}>
            {price}
            {isFull ? "  ·  Full" : spotsLeft <= 5 ? `  ·  ${spotsLeft} left` : ""}
          </Text>
          <IconChevR size={18} color={theme.color.whisper} />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderRadius: 18,
    padding: 12,
    marginBottom: 12,
  },
  thumb: { width: 66, height: 66, borderRadius: 14 },
  body: { flex: 1, minWidth: 0 },
  ttl: { fontSize: 15, letterSpacing: -0.1, lineHeight: 17 },
  subRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
  badgeText: { fontSize: 9.5, fontWeight: "700", letterSpacing: 0.5 },
  sub: { fontSize: 12, flexShrink: 1 },
  foot: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 7,
  },
  footText: { fontSize: 12, flex: 1 },
});
