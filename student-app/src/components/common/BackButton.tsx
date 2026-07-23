import { useTheme } from '@findemy/ui';
import { useRouter } from 'expo-router';
import { Pressable, type StyleProp, StyleSheet, Text, type ViewStyle } from 'react-native';

export function BackButton({
  onPress,
  color,
  size = 18,
  bare = false,
  style,
}: {
  /** Defaults to router.back(). */
  onPress?: () => void;
  /** Glyph color. Defaults to theme.color.ink. */
  color?: string;
  /** Glyph font size. */
  size?: number;
  /** Drop the circular chrome (for plain text-row back links). */
  bare?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  const router = useRouter();
  return (
    <Pressable
      onPress={onPress ?? (() => router.back())}
      accessibilityRole="button"
      accessibilityLabel="Go back"
      hitSlop={8}
      style={[bare ? undefined : styles.circle, style]}
    >
      <Text style={{ fontSize: size, color: color ?? theme.color.ink }}>‹</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  circle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
