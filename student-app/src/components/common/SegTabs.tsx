import { useTheme } from '@findemy/ui';
import { Pressable, StyleSheet, Text, View } from 'react-native';

// Prototype `.seg`: a pill segmented control on a paper-warm track; the active
// segment is a white pill with a soft shadow.
export function SegTabs<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { key: T; label: string }[];
  value: T;
  onChange: (key: T) => void;
}) {
  const theme = useTheme();
  return (
    <View style={[styles.track, { backgroundColor: theme.color.paperWarm }]}>
      {options.map((option) => {
        const active = option.key === value;
        return (
          <Pressable
            key={option.key}
            onPress={() => onChange(option.key)}
            style={[styles.seg, active && { backgroundColor: '#fff', ...theme.shadow.sm }]}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
          >
            <Text
              style={{
                fontFamily: theme.font.sansBold,
                fontSize: 13.5,
                color: active ? theme.color.ink : theme.color.inkSoft,
              }}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    gap: 8,
    borderRadius: 999,
    padding: 5,
  },
  seg: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    paddingVertical: 11,
  },
});
