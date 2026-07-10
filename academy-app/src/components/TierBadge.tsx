import React from 'react';
import { View, Text } from 'react-native';
import { useTheme, sansFor } from '@findemy/ui';

// Prototype `.tier` pill: attendance tier chip. active=jade, irregular=gold,
// inactive=neutral. `New` covers students too recent to score.
export function TierBadge({ tier }: { tier?: string | null }) {
  const theme = useTheme();
  const map = {
    active: { label: 'Active', bg: theme.color.jadeSoft, fg: theme.color.jade },
    irregular: { label: 'Irregular', bg: theme.color.marigoldSoft, fg: theme.color.marigold },
    inactive: { label: 'Inactive', bg: theme.color.paperWarm, fg: theme.color.whisper },
  } as const;
  const matchedTier = tier ? (map as any)[tier] : null;
  if (!matchedTier) {
    // Too recent to score.
    return (
      <View style={{ backgroundColor: theme.color.paperWarm, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 }}>
        <Text style={{ fontFamily: sansFor(800), fontSize: 10.5, letterSpacing: 0.3, textTransform: 'uppercase', color: theme.color.whisper }}>
          New
        </Text>
      </View>
    );
  }
  return (
    <View style={{ backgroundColor: matchedTier.bg, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 }}>
      <Text style={{ fontFamily: sansFor(800), fontSize: 10.5, letterSpacing: 0.3, textTransform: 'uppercase', color: matchedTier.fg }}>
        {matchedTier.label}
      </Text>
    </View>
  );
}
