import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { useTheme } from "@findemy/ui";

// Prototype `.opt`: a radio option row used for batch/plan/method selection.
export function OptionRow({
  title,
  sub,
  selected,
  onPress,
  disabled,
  right,
}: {
  title: string;
  sub?: string;
  selected: boolean;
  onPress?: () => void;
  disabled?: boolean;
  /** Overrides the radio with a custom right element (e.g. a "Soon" tag). */
  right?: React.ReactNode;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected, disabled }}
      style={[
        styles.opt,
        {
          borderColor: selected ? theme.color.persimmon : theme.color.hairline,
          backgroundColor: "#fff",
          opacity: disabled ? 0.5 : 1,
        },
      ]}
    >
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ fontFamily: theme.font.sansBold, fontSize: 14.5, color: theme.color.ink }}>{title}</Text>
        {sub ? (
          <Text style={{ fontFamily: theme.font.sansMedium, fontSize: 12, color: theme.color.mist, marginTop: 2 }}>{sub}</Text>
        ) : null}
      </View>
      {right ?? (
        <View style={[styles.radio, { borderColor: selected ? theme.color.persimmon : theme.color.hairline }]}>
          {selected ? <View style={[styles.radioDot, { backgroundColor: theme.color.persimmon }]} /> : null}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  opt: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1.5,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  radioDot: { width: 10, height: 10, borderRadius: 5 },
});
