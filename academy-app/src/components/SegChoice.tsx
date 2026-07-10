import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTheme, sansFor } from '@findemy/ui';

// Prototype `.seg-choice`: full-width equal segments, ink active fill, sans 700/13.
// Distinct from the shared pill `Tabs` — this is the academy's segmented control.
export function SegChoice<T extends string>({
  items,
  value,
  onChange,
}: {
  items: { key: T; label: string }[];
  value: T;
  onChange: (key: T) => void;
}) {
  const theme = useTheme();
  return (
    <View style={styles.row}>
      {items.map((item) => {
        const active = item.key === value;
        return (
          <Pressable
            key={item.key}
            onPress={() => onChange(item.key)}
            style={[
              styles.seg,
              {
                backgroundColor: active ? theme.color.ink : theme.color.ivory,
                borderColor: active ? theme.color.ink : theme.color.hairline,
              },
            ]}
          >
            <Text style={{ fontFamily: sansFor(700), fontSize: 13, color: active ? theme.color.ivory : theme.color.inkSoft }}>
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8 },
  seg: { flex: 1, borderWidth: 1.5, borderRadius: 12, paddingVertical: 11, alignItems: 'center' },
});
