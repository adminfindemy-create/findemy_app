import { sansFor, useTheme } from '@findemy/ui';
import type React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export type TabBarItem = {
  key: string;
  label: string;
  /** Renders the tab glyph in the supplied colour. */
  renderIcon: (color: string) => React.ReactNode;
  /** Optional numeric badge (e.g. new-inbox count on Home). */
  badge?: number;
};

// Prototype `.tabbar.light`: a floating white pill. Inactive tabs are icon-only
// in muted ink; the active tab expands to a persimmon pill with its label.
export function TabBar({
  items,
  active,
  onChange,
}: {
  items: TabBarItem[];
  active: string;
  onChange: (key: string) => void;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View pointerEvents="box-none" style={[styles.wrap, { paddingBottom: insets.bottom + 12 }]}>
      <View style={[styles.bar, { borderColor: theme.color.hairline }, theme.shadow.lg]}>
        {items.map((item) => {
          const isActive = item.key === active;
          const iconColor = isActive ? '#fff' : theme.color.whisper;
          return (
            <Pressable
              key={item.key}
              onPress={() => onChange(item.key)}
              accessibilityRole="button"
              accessibilityState={{ selected: isActive }}
              accessibilityLabel={item.label}
              style={[
                styles.tab,
                isActive && { backgroundColor: theme.color.persimmon, paddingHorizontal: 20 },
              ]}
            >
              <View>
                {item.renderIcon(iconColor)}
                {!isActive && item.badge ? (
                  <View
                    style={[
                      styles.badge,
                      { backgroundColor: theme.color.persimmon, borderColor: theme.color.paper },
                    ]}
                  >
                    <Text style={[styles.badgeTxt, { fontFamily: sansFor(700) }]}>
                      {item.badge > 9 ? '9+' : item.badge}
                    </Text>
                  </View>
                ) : null}
              </View>
              {isActive ? (
                <Text style={[styles.lbl, { fontFamily: sansFor(700) }]}>{item.label}</Text>
              ) : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderRadius: 999,
    borderWidth: 1,
    padding: 6,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 999,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  lbl: {
    color: '#fff',
    fontSize: 13,
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -8,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeTxt: {
    color: '#fff',
    fontSize: 9,
    lineHeight: 12,
  },
});
