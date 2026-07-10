import React from "react";
import { View, Text } from "react-native";
import { useTheme } from "@findemy/ui";

export function CancellationPolicyCard({
  kind,
}: {
  kind: "trial" | "workshop";
}) {
  const theme = useTheme();
  const cutoffHours = kind === "trial" ? 4 : 24;
  const cutoffLabel = kind === "trial" ? "4 hours" : "24 hours";

  const row = (left: string, right: string, tone: "ok" | "warn") => (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 8,
      }}
    >
      <View
        style={{
          width: 6,
          height: 6,
          borderRadius: 3,
          marginRight: 10,
          backgroundColor: tone === "ok" ? theme.color.jade : theme.color.rose,
        }}
      />
      <Text
        style={{
          flex: 1,
          fontFamily: theme.font.sans,
          fontSize: 13,
          color: theme.color.inkSoft,
        }}
      >
        {left}
      </Text>
      <Text
        style={{
          fontFamily: theme.font.sans,
          fontSize: 13,
          fontWeight: "600",
          color: tone === "ok" ? theme.color.jade : theme.color.rose,
        }}
      >
        {right}
      </Text>
    </View>
  );

  return (
    <View
      style={{
        backgroundColor: theme.color.ivory,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: theme.color.hairline,
        padding: 16,
      }}
    >
      <Text
        style={{
          fontFamily: theme.font.sans,
          fontSize: 11,
          fontWeight: "700",
          letterSpacing: 1.2,
          color: theme.color.mist,
          marginBottom: 6,
        }}
      >
        CANCELLATION POLICY
      </Text>
      {row(`Cancel ≥ ${cutoffLabel} before`, "Full refund", "ok")}
      <View style={{ height: 1, backgroundColor: theme.color.hairline, opacity: 0.6 }} />
      {row(`Cancel < ${cutoffLabel} before`, "No refund", "warn")}
      {kind === "trial" && (
        <Text
          style={{
            marginTop: 10,
            fontFamily: theme.font.sans,
            fontSize: 11,
            color: theme.color.mist,
            lineHeight: 16,
          }}
        >
          Rescheduled trials cannot be cancelled.
        </Text>
      )}
    </View>
  );
}
