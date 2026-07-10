import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTheme } from "@findemy/ui";

export function OTPDisplay({ value, large = false }: { value: string; large?: boolean }) {
  const theme = useTheme();
  const digits = value.split("");
  return (
    <View style={styles.row}>
      {Array.from({ length: 4 }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.cell,
            {
              borderColor: theme.color.hairline,
              backgroundColor: theme.color.bone,
              width: large ? 52 : 44,
              height: large ? 64 : 52,
            },
          ]}
        >
          <Text
            style={{
              color: theme.color.ink,
              fontFamily: theme.font.sans,
              fontSize: large ? 28 : 20,
              fontWeight: "700",
            }}
          >
            {digits[i] || ""}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
  },
  cell: {
    borderWidth: 1.5,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
});
