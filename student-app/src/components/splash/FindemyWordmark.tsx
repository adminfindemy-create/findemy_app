import { View, Text, StyleSheet } from "react-native";
import { useTheme } from "@findemy/ui";

type Props = {
  size?: number;
};

export function FindemyWordmark({ size = 56 }: Props) {
  const theme = useTheme();
  const base = {
    fontFamily: theme.font.sans,
    fontSize: size,
    lineHeight: size * 1.05,
    letterSpacing: -1,
    fontWeight: "600" as const,
  };
  return (
    <View style={styles.row}>
      <Text style={[base, { color: theme.color.ivory }]}>Find</Text>
      <Text style={[base, { color: theme.color.persimmon }]}>emy</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "baseline",
  },
});
