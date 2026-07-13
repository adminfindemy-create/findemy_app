import React from "react";
import { View, Text, Dimensions } from "react-native";
import { useTheme } from "@findemy/ui";

export function AcademyMap({ address }: { lat: number; lng: number; name: string; address?: string }) {
  const theme = useTheme();
  return (
    <View
      style={{
        width: Dimensions.get("window").width - 32,
        height: 180,
        backgroundColor: "#e5e5e5",
        borderRadius: 12,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text style={{ color: "#666", fontFamily: theme.font.sans, fontSize: 14 }}>
        📍 {address}
      </Text>
    </View>
  );
}
