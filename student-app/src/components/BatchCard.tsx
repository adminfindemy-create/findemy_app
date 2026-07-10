import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { useTheme, Tag, Button } from "@findemy/ui";

export function BatchCard({
  batch,
  coachName,
  onBook,
}: {
  batch: {
    id: string;
    title: string;
    level: string;
    capacity: number;
    trial_fee_paise: number;
    timings: { day_of_week: number; start_time: string; duration_min: number }[];
  };
  coachName?: string;
  onBook: () => void;
}) {
  const theme = useTheme();
  const fee = batch.trial_fee_paise ? `₹${(batch.trial_fee_paise / 100).toFixed(0)}` : "Free";
  const timingSummary = (batch.timings ?? [])
    .map((t) => {
      const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      return `${days[t.day_of_week]} · ${t.start_time} · ${t.duration_min}m`;
    })
    .join(", ");

  return (
    <View style={[styles.container, { backgroundColor: theme.color.ivory, borderColor: theme.color.hairline }]}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: theme.font.sans, fontSize: theme.type.subtitle.size, fontWeight: "600", color: theme.color.ink }}>
            {batch.title}
          </Text>
          <View style={{ flexDirection: "row", gap: 6, marginTop: 4 }}>
            <Tag label={batch.level} tone="ink" />
            <Tag label={fee} tone="persimmon" />
          </View>
        </View>
        <Button size="sm" onPress={onBook}>
          Book Trial
        </Button>
      </View>
      <Text style={{ fontFamily: theme.font.sans, fontSize: theme.type.small.size, color: theme.color.mist, marginTop: 8 }}>
        {timingSummary}
      </Text>
      {coachName ? (
        <Text style={{ fontFamily: theme.font.sans, fontSize: theme.type.small.size, color: theme.color.inkSoft, marginTop: 4 }}>
          Coach: {coachName}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
  },
});
