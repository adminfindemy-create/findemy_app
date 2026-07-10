import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../ThemeProvider';

// Prototype `.bk-banner` — the status strip below the summary card
// ("Your enrolment is active.", "Paused — resumes …", "This booking was
// cancelled.").

export type StatusBannerTone = 'jade' | 'gold' | 'rose' | 'neutral';

export function StatusBanner({
  tone,
  icon,
  children,
  right,
}: {
  tone: StatusBannerTone;
  icon?: React.ReactNode;
  children: React.ReactNode;
  right?: React.ReactNode;
}) {
  const theme = useTheme();
  const map = {
    jade: { bg: theme.color.jadeSoft, fg: theme.color.jade },
    gold: { bg: theme.color.marigoldSoft, fg: theme.color.marigold },
    rose: { bg: theme.color.roseSoft, fg: theme.color.rose },
    neutral: { bg: theme.color.paperWarm, fg: theme.color.inkSoft },
  }[tone];

  return (
    <View style={[styles.banner, { backgroundColor: map.bg }]}>
      {icon}
      <Text style={[styles.text, { color: map.fg, fontFamily: theme.font.sansBold }]}>
        {children}
      </Text>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 16,
    paddingVertical: 13,
    paddingHorizontal: 15,
    marginVertical: 14,
  },
  text: { flex: 1, fontSize: 13, fontWeight: '700', lineHeight: 18 },
});
