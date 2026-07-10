import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '../ThemeProvider';
import { IconChevR } from '../icons';

// Prototype `.opt` — a bordered white card row with a bold title, a muted
// subtitle and a trailing chevron. Used by MANAGE CLASS / MANAGE BOOKING /
// SUPPORT lists. `tone="rose"` is the destructive variant (Discontinue /
// Cancel), `tone="jade"` the affirmative one (Resume class).

export type MenuRowTone = 'default' | 'rose' | 'jade';

export function MenuRow({
  title,
  sub,
  tone = 'default',
  onPress,
  disabled,
  disabledReason,
  right,
}: {
  title: string;
  sub?: string;
  tone?: MenuRowTone;
  onPress?: () => void;
  disabled?: boolean;
  disabledReason?: string;
  right?: React.ReactNode;
}) {
  const theme = useTheme();
  const accent =
    tone === 'rose' ? theme.color.rose : tone === 'jade' ? theme.color.jade : theme.color.ink;
  const border =
    tone === 'rose' ? theme.color.roseSoft : theme.color.hairline;

  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      style={({ pressed }) => [
        styles.row,
        { borderColor: border, backgroundColor: '#fff', opacity: disabled ? 0.45 : 1 },
        pressed && !disabled && { transform: [{ scale: 0.985 }] },
      ]}
    >
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[styles.title, { color: accent, fontFamily: theme.font.sansBold }]}>{title}</Text>
        {sub || (disabled && disabledReason) ? (
          <Text style={[styles.sub, { color: theme.color.mist, fontFamily: theme.font.sansMedium }]}>
            {disabled && disabledReason ? disabledReason : sub}
          </Text>
        ) : null}
      </View>
      {right ?? <IconChevR size={18} color={tone === 'default' ? theme.color.whisper : accent} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1.5,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
  },
  title: { fontSize: 14.5, fontWeight: '700' },
  sub: { fontSize: 12, marginTop: 2 },
});
