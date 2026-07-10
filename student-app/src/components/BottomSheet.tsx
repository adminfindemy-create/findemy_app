import React from "react";
import { Modal, View, Pressable, StyleSheet } from "react-native";
import { tokens, useTheme } from "@findemy/ui";

export function BottomSheet({
  visible,
  onClose,
  children,
  heightPct = 82,
}: {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  /** Max sheet height as a percentage of screen height. */
  heightPct?: number;
}) {
  const theme = useTheme();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View
        style={[
          styles.sheet,
          { backgroundColor: theme.color.paper, maxHeight: `${heightPct}%` },
        ]}
      >
        <View style={[styles.handle, { backgroundColor: theme.color.hairline }]} />
        {children}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(20,16,14,0.45)",
  },
  sheet: {
    // Prototype `.sheet`: 30px top radius, generous padding.
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: 22,
    paddingBottom: 40,
    shadowColor: tokens.shadow.md.shadowColor,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 10,
  },
  handle: {
    width: 44,
    height: 5,
    borderRadius: 99,
    alignSelf: "center",
    marginTop: 8,
    marginBottom: 16,
  },
});
