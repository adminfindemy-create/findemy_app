import { View } from "react-native";

export function BlockPrint() {
  return (
    <View
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        opacity: 0.04,
        backgroundColor: "#000",
      }}
    />
  );
}
