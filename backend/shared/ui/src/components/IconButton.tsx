import type React from 'react';
import { Pressable } from 'react-native';
import { useTheme } from '../ThemeProvider';

// Prototype `.icon-btn`: 46px white circle, hairline border, soft shadow.
// `.icon-btn.solid` inverts to an ink fill with a white icon.
export function IconButton({
  icon,
  onPress,
  tone,
  solid,
  size = 46,
  accessibilityLabel,
}: {
  icon: React.ReactNode;
  onPress?: () => void;
  /** Legacy: any theme colour key tints the background at 15% opacity. */
  tone?: string;
  /** Ink-filled variant (`.icon-btn.solid`). */
  solid?: boolean;
  size?: number;
  accessibilityLabel?: string;
}) {
  const theme = useTheme();
  const bg = solid
    ? theme.color.ink
    : tone
      ? `${(theme.color as Record<string, string>)[tone]}15`
      : '#fff';
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: bg,
        borderWidth: solid ? 0 : 1,
        borderColor: theme.color.hairline,
        ...theme.shadow.sm,
      }}
    >
      {icon}
    </Pressable>
  );
}
