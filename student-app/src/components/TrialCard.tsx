import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { useTheme, Tag, Button } from "@findemy/ui";
import { format } from "date-fns";
import { formatTrialDate } from "@/lib/format";

export function TrialCard({
  trial,
  onPress,
  onCancel,
  onReschedule,
}: {
  trial: {
    id: string;
    batch_title: string;
    status: string;
    trial_at?: string;
    scheduled_at?: string;
    coach_name?: string;
  };
  onPress?: () => void;
  onCancel?: () => void;
  onReschedule?: () => void;
}) {
  const theme = useTheme();
  const date = new Date(trial.trial_at ?? trial.scheduled_at ?? "");
  const toneMap: Record<string, any> = {
    upcoming: "marigold",
    confirmed: "jade",
    attended: "jade",
    cancelled: "rose",
    completed: "ink",
    new: "persimmon",
    pending: "marigold",
  };

  return (
    <Pressable onPress={onPress} style={styles.card}>
      <View style={[styles.container, { backgroundColor: theme.color.ivory, borderColor: theme.color.hairline }]}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text style={{ fontFamily: theme.font.sans, fontSize: theme.type.subtitle.size, fontWeight: "600", color: theme.color.ink }}>
            {trial.batch_title}
          </Text>
          <Tag label={trial.status} tone={toneMap[trial.status] || "ink"} />
        </View>
        <Text style={{ fontFamily: theme.font.sans, fontSize: theme.type.body.size, color: theme.color.mist, marginTop: 4 }}>
          {`${formatTrialDate(trial.trial_at ?? trial.scheduled_at ?? "")} · ${format(date, "h:mm a")}`}
        </Text>
        {trial.coach_name ? (
          <Text style={{ fontFamily: theme.font.sans, fontSize: theme.type.small.size, color: theme.color.inkSoft, marginTop: 2 }}>
            Coach: {trial.coach_name}
          </Text>
        ) : null}
        {(onCancel || onReschedule) && trial.status !== "cancelled" && trial.status !== "attended" && trial.status !== "completed" ? (
          <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
            {onReschedule ? (
              <Button variant="soft" size="sm" onPress={onReschedule}>
                Reschedule
              </Button>
            ) : null}
            {onCancel ? (
              <Button variant="rose" size="sm" onPress={onCancel}>
                Cancel
              </Button>
            ) : null}
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 12,
  },
  container: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
  },
});
