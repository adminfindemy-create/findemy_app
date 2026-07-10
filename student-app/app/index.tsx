import { useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useTheme } from "@findemy/ui";
import { useAuth } from "@/stores/auth";
import { SplashWaves } from "@/components/splash/SplashWaves";
import { FindemyLogoMark } from "@/components/splash/FindemyLogoMark";
import { FindemyWordmark } from "@/components/splash/FindemyWordmark";

export default function SplashScreen() {
  const router = useRouter();
  const theme = useTheme();
  const accessToken = useAuth((state) => state.accessToken);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (accessToken) {
        router.replace("/(tabs)");
      } else {
        router.replace("/(auth)");
      }
    }, 1200);
    return () => clearTimeout(timer);
  }, [accessToken, router]);

  return (
    <View style={[styles.root, { backgroundColor: theme.color.navy }]}>
      <SplashWaves />

      <View style={styles.column}>
        <FindemyLogoMark size={140} />

        <View style={styles.wordmarkWrap}>
          <FindemyWordmark size={56} />
        </View>

        <View
          style={[styles.rule, { backgroundColor: theme.color.persimmon }]}
        />

        <Text
          style={[
            styles.discover,
            { color: theme.color.ivory, fontFamily: theme.font.sans },
          ]}
        >
          DISCOVER YOUR ART
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
    overflow: "hidden",
  },
  column: {
    alignItems: "center",
  },
  wordmarkWrap: {
    marginTop: 28,
  },
  rule: {
    width: 56,
    height: 1,
    marginTop: 18,
    marginBottom: 14,
    opacity: 0.9,
  },
  discover: {
    fontSize: 11,
    letterSpacing: 4,
    opacity: 0.7,
    textAlign: "center",
  },
});
