import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { useTheme } from "@findemy/ui";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export type TabBarItem = {
  key: string;
  label: string;
  /** Renders the tab glyph in the supplied colour. */
  renderIcon: (color: string) => React.ReactNode;
};

// Prototype `.tabbar.dark`: a floating dark pill. Inactive tabs are icon-only in
// translucent white; the active tab expands to a persimmon pill with its label.
export function TabBar({
  items,
  active,
  onChange,
}: {
  items: TabBarItem[];
  active: string;
  onChange: (key: string) => void;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View pointerEvents="box-none" style={[styles.wrap, { paddingBottom: insets.bottom + 12 }]}>
      <View style={[styles.bar, theme.shadow.lg]}>
        {items.map((item) => {
          const isActive = item.key === active;
          const iconColor = isActive ? "#fff" : "rgba(255,255,255,0.55)";
          return (
            <Pressable
              key={item.key}
              onPress={() => onChange(item.key)}
              accessibilityRole="button"
              accessibilityState={{ selected: isActive }}
              accessibilityLabel={item.label}
              style={[
                styles.tab,
                isActive && { backgroundColor: theme.color.persimmon, paddingHorizontal: 20 },
              ]}
            >
              {item.renderIcon(iconColor)}
              {isActive ? (
                <Text style={[styles.lbl, { fontFamily: theme.font.sansBold }]}>{item.label}</Text>
              ) : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
  },
  bar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(22,18,15,0.95)",
    borderRadius: 999,
    padding: 6,
  },
  tab: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 999,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  lbl: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
  },
});
