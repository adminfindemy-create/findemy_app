import type React from 'react';
import { type StyleProp, StyleSheet, View, type ViewStyle } from 'react-native';
import { useTheme } from '../ThemeProvider';

export function Card({
  children,
  padding = 16,
  style,
}: {
  children: React.ReactNode;
  padding?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.color.ivory,
          borderRadius: theme.radius.lg,
          padding,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
  },
});
