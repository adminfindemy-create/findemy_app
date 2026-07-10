import React, { useEffect, useRef } from 'react';
import { Animated } from 'react-native';
import type { ViewStyle } from 'react-native';
import { useTheme } from '@findemy/ui';

export function SkeletonLoader({
  width,
  height = 16,
  borderRadius,
  style,
}: {
  width?: number | `${number}%`;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}) {
  const theme = useTheme();
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 600, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => {
      anim.stop();
      opacity.setValue(0.4);
    };
  }, [opacity]);

  return (
    <Animated.View
      style={[
        {
          width: (width ?? '100%') as any,
          height,
          borderRadius: borderRadius ?? theme.radius.md,
          backgroundColor: theme.color.hairline,
          opacity,
        },
        style,
      ]}
    />
  );
}
