import type React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../ThemeProvider';

export type NavItem = {
  key: string;
  label: string;
  icon: React.ReactNode;
};

export function NavBar({
  items,
  active,
  onChange,
  height = NAV_BAR_HEIGHT,
}: {
  items: NavItem[];
  active: string;
  onChange: (key: string) => void;
  height?: number;
}) {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.bar,
        { height, backgroundColor: 'rgba(251,247,239,0.92)', borderTopColor: theme.color.hairline },
      ]}
    >
      {items.map((item) => {
        const isActive = item.key === active;
        return (
          <Pressable key={item.key} onPress={() => onChange(item.key)} style={styles.item}>
            {isActive && (
              <View style={[styles.indicator, { backgroundColor: theme.color.persimmon }]} />
            )}
            {item.icon}
            <Text
              style={{
                color: isActive ? theme.color.ink : theme.color.mist,
                fontFamily: theme.font.sans,
                fontSize: 10,
                fontWeight: '500',
                marginTop: 4,
                letterSpacing: 0.5,
              }}
            >
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export const NAV_BAR_HEIGHT = 84;

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    height: NAV_BAR_HEIGHT,
    borderTopWidth: 1,
    paddingBottom: 24,
    paddingTop: 12,
    paddingHorizontal: 8,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 4,
    position: 'relative',
  },
  indicator: {
    position: 'absolute',
    top: 0,
    width: 24,
    height: 2,
    borderRadius: 1,
  },
});
