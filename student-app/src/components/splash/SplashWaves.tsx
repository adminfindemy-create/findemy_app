import { View, StyleSheet } from "react-native";
import { useTheme } from "@findemy/ui";

/**
 * Organic corner washes (top-left plum→brown, bottom-right olive→jade).
 *
 * View-based fallback — SVG path tracing of the exact blob curves from
 * ai-usage/splash_screen.jpeg is deferred. Oversized soft-radius rectangles
 * read as organic corner waves against the navy backdrop.
 */
export function SplashWaves() {
  const theme = useTheme();
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* top-left: plum wash */}
      <View
        style={[
          styles.blob,
          {
            backgroundColor: theme.color.plum,
            opacity: 0.55,
            width: 460,
            height: 380,
            top: -200,
            left: -180,
            borderBottomRightRadius: 320,
            transform: [{ rotate: "-12deg" }],
          },
        ]}
      />
      {/* top-left accent: warm brown */}
      <View
        style={[
          styles.blob,
          {
            backgroundColor: theme.color.waveBrown,
            opacity: 0.35,
            width: 300,
            height: 240,
            top: -150,
            left: -120,
            borderBottomRightRadius: 220,
            transform: [{ rotate: "-8deg" }],
          },
        ]}
      />
      {/* bottom-right: olive wash */}
      <View
        style={[
          styles.blob,
          {
            backgroundColor: theme.color.waveOlive,
            opacity: 0.5,
            width: 460,
            height: 400,
            bottom: -220,
            right: -160,
            borderTopLeftRadius: 320,
            transform: [{ rotate: "-10deg" }],
          },
        ]}
      />
      {/* bottom-right accent: persimmon-deep / brown */}
      <View
        style={[
          styles.blob,
          {
            backgroundColor: theme.color.waveBrown,
            opacity: 0.4,
            width: 320,
            height: 280,
            bottom: -180,
            right: -120,
            borderTopLeftRadius: 240,
            transform: [{ rotate: "-6deg" }],
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  blob: {
    position: "absolute",
  },
});
