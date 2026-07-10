import React from 'react';
import { View, Text, StyleSheet, type ViewStyle, type StyleProp } from 'react-native';
import { useTheme } from '../ThemeProvider';

// Prototype `.summary` card + `.sum-row` rows — a labelled key/value list used
// across the pay / confirm / detail screens.

export function Summary({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: '#fff', borderColor: theme.color.hairline, ...theme.shadow.sm },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function SummaryRow({
  icon,
  label,
  value,
  last = false,
}: {
  icon?: React.ReactNode;
  label: string;
  value: React.ReactNode;
  /** Drop the bottom hairline (use on the final row). */
  last?: boolean;
}) {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.row,
        { borderBottomColor: theme.color.hairline, borderBottomWidth: last ? 0 : 1 },
      ]}
    >
      {icon ? (
        <View style={[styles.ic, { backgroundColor: theme.color.persimmonSoft }]}>{icon}</View>
      ) : null}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[styles.l, { color: theme.color.whisper, fontFamily: theme.font.sansBold }]}>
          {label.toUpperCase()}
        </Text>
        {typeof value === 'string' ? (
          <Text style={[styles.v, { color: theme.color.ink, fontFamily: theme.font.sansBold }]}>
            {value}
          </Text>
        ) : (
          value
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
  },
  ic: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  l: {
    fontSize: 11,
    letterSpacing: 1.1,
    fontWeight: '700',
  },
  v: {
    fontSize: 14.5,
    fontWeight: '700',
    marginTop: 1,
  },
});
