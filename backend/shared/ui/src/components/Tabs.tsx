import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { useTheme } from '../ThemeProvider';

export function Tabs({
  items,
  value,
  onChange,
  variant = 'underline',
}: {
  items: { key: string; label: string }[];
  value: string;
  onChange: (key: string) => void;
  variant?: 'underline' | 'pill';
}) {
  const theme = useTheme();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {items.map((item) => {
        const active = item.key === value;
        return (
          <Pressable
            key={item.key}
            onPress={() => onChange(item.key)}
            style={[
              styles.tab,
              variant === 'pill' && [
                styles.pill,
                {
                  backgroundColor: active ? theme.color.persimmon : theme.color.ivory,
                  borderColor: active ? theme.color.persimmon : theme.color.hairline,
                },
              ],
              variant === 'underline' && {
                borderBottomWidth: active ? 2 : 0,
                borderBottomColor: theme.color.persimmon,
              },
            ]}
          >
            <Text
              style={{
                color:
                  variant === 'pill'
                    ? active
                      ? '#fff'
                      : theme.color.inkSoft
                    : active
                      ? theme.color.persimmon
                      : theme.color.inkSoft,
                fontFamily: theme.font.sans,
                fontSize: 13,
                fontWeight: '600',
              }}
            >
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8, paddingHorizontal: 4 },
  tab: { paddingVertical: 8, paddingHorizontal: 12 },
  pill: { borderRadius: 999, borderWidth: 1 },
});
