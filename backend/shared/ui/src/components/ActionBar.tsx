import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../ThemeProvider';

// Prototype `.action-bar`: a sticky bottom bar with an optional price lead and
// a flex CTA. Render it as the last child of a screen (outside the scroller).
export function ActionBar({
  priceLabel,
  priceValue,
  bottomInset = 0,
  children,
}: {
  /** Small uppercase caption above the price (e.g. "TOTAL"). */
  priceLabel?: string;
  /** Bold price value shown at the start of the bar. */
  priceValue?: string;
  /** Safe-area bottom inset from the consumer (react-native-safe-area-context). */
  bottomInset?: number;
  /** Action(s) — typically a single <Button block /> which flexes to fill. */
  children: React.ReactNode;
}) {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.bar,
        {
          backgroundColor: 'rgba(255,255,255,0.97)',
          borderTopColor: theme.color.hairline,
          paddingBottom: 16 + bottomInset,
        },
      ]}
    >
      {priceValue ? (
        <View style={styles.priceLead}>
          {priceLabel ? (
            <Text style={[styles.l, { color: theme.color.whisper, fontFamily: theme.font.sansBold }]}>
              {priceLabel.toUpperCase()}
            </Text>
          ) : null}
          <Text style={[styles.v, { color: theme.color.ink, fontFamily: theme.font.sansBold }]}>
            {priceValue}
          </Text>
        </View>
      ) : null}
      <View style={styles.action}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderTopWidth: 1,
    paddingHorizontal: 18,
    paddingTop: 14,
  },
  priceLead: { flexShrink: 0 },
  l: {
    fontSize: 9.5,
    letterSpacing: 1.2,
    fontWeight: '700',
  },
  v: {
    fontSize: 19,
    fontWeight: '800',
  },
  action: { flex: 1 },
});
