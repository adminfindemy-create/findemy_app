import type React from 'react';
import {
  ActivityIndicator,
  Pressable,
  type StyleProp,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from 'react-native';
import { useTheme } from '../ThemeProvider';

// Prototype refresh: pill buttons (border-radius:999). Matches `.btn`/`.cta-*`
// in ai-usage/prototypes. Base is a full-width pill, sans 15/700.
export type ButtonVariant =
  | 'primary'
  | 'jade'
  | 'ghost'
  | 'ink'
  | 'dark'
  | 'rose'
  | 'soft'
  | 'pill'
  | 'compact';

export function Button({
  children,
  onPress,
  variant = 'primary',
  size = 'default',
  block = false,
  loading = false,
  disabled = false,
  icon,
  style,
}: {
  children: React.ReactNode;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: 'default' | 'sm';
  block?: boolean;
  loading?: boolean;
  disabled?: boolean;
  /** Optional leading icon node, rendered before the label with an 9px gap. */
  icon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  [key: string]: unknown;
}) {
  const theme = useTheme();
  const isDisabled = disabled || loading;

  const bgMap: Record<ButtonVariant, string> = {
    primary: theme.color.persimmon,
    jade: theme.color.jade,
    ghost: '#fff',
    ink: theme.color.ink,
    dark: theme.color.ink,
    rose: theme.color.rose,
    soft: theme.color.persimmonSoft,
    pill: '#fff',
    compact: theme.color.persimmonSoft,
  };

  const textMap: Record<ButtonVariant, string> = {
    primary: '#fff',
    jade: '#fff',
    ghost: theme.color.ink,
    ink: '#fff',
    dark: '#fff',
    rose: '#fff',
    soft: theme.color.persimmonDeep,
    pill: theme.color.ink,
    compact: theme.color.persimmonDeep,
  };

  // .btn-ghost / .btn-pill carry a hairline border; others are borderless.
  const bordered = variant === 'ghost' || variant === 'pill';
  // .btn-primary carries a persimmon glow.
  const glow = variant === 'primary' && !isDisabled;
  const isCompactPill = variant === 'pill' || variant === 'compact';
  const small = size === 'sm' || isCompactPill;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      style={[
        styles.base,
        small ? styles.sm : styles.lg,
        {
          backgroundColor: bgMap[variant],
          opacity: isDisabled ? 0.45 : 1,
          borderWidth: bordered ? 1 : 0,
          borderColor: theme.color.hairline,
        },
        glow && {
          shadowColor: theme.color.persimmon,
          shadowOffset: { width: 0, height: 12 },
          shadowOpacity: 0.5,
          shadowRadius: 16,
          elevation: 6,
        },
        block && styles.block,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={textMap[variant]} />
      ) : (
        <View style={styles.inner}>
          {icon}
          <Text
            style={[
              small ? styles.textSm : styles.textLg,
              { color: textMap[variant], fontFamily: theme.font.sansBold },
            ]}
          >
            {children}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lg: {
    paddingVertical: 15,
    paddingHorizontal: 20,
  },
  sm: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  block: {
    width: '100%',
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
  },
  textLg: {
    fontSize: 15,
    fontWeight: '700',
  },
  textSm: {
    fontSize: 13.5,
    fontWeight: '700',
  },
});
