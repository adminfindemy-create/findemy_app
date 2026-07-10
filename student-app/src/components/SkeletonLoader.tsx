import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, View } from "react-native";
import type { ViewStyle } from "react-native";
import { useTheme } from "@findemy/ui";

type Props = {
  width?: number | string;
  height: number;
  borderRadius?: number;
  style?: ViewStyle;
};

export function SkeletonLoader({ width = "100%", height, borderRadius = 8, style }: Props) {
  const theme = useTheme();
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 900, useNativeDriver: false }),
        Animated.timing(shimmer, { toValue: 0, duration: 900, useNativeDriver: false }),
      ])
    ).start();
  }, [shimmer]);

  const backgroundColor = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: [theme.color.bone, theme.color.hairline],
  });

  return (
    <Animated.View
      style={[
        { width: width as any, height, borderRadius, backgroundColor },
        style,
      ]}
    />
  );
}

export function SkeletonCard({ style }: { style?: ViewStyle }) {
  return (
    <View style={[styles.card, style]}>
      <SkeletonLoader height={130} borderRadius={0} />
      <View style={styles.cardBody}>
        <SkeletonLoader height={14} width="70%" borderRadius={6} />
        <SkeletonLoader height={11} width="50%" borderRadius={6} style={{ marginTop: 6 }} />
        <SkeletonLoader height={12} width="35%" borderRadius={6} style={{ marginTop: 8 }} />
      </View>
    </View>
  );
}

export function SkeletonCompactCard({ style }: { style?: ViewStyle }) {
  return (
    <View style={[styles.compactCard, style]}>
      <SkeletonLoader height={120} borderRadius={0} />
      <View style={styles.cardBody}>
        <SkeletonLoader height={13} width="80%" borderRadius={6} />
        <SkeletonLoader height={11} width="55%" borderRadius={6} style={{ marginTop: 5 }} />
        <SkeletonLoader height={12} width="40%" borderRadius={6} style={{ marginTop: 6 }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
    marginBottom: 12,
  },
  compactCard: {
    width: 220,
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
  },
  cardBody: {
    padding: 12,
  },
});
