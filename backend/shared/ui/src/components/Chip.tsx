import { Pressable, StyleSheet, Text } from 'react-native';
import { useTheme } from '../ThemeProvider';

export function Chip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        {
          backgroundColor: selected ? theme.color.persimmon : theme.color.ivory,
          borderColor: selected ? theme.color.persimmon : theme.color.hairline,
        },
      ]}
    >
      <Text
        style={{
          color: selected ? '#fff' : theme.color.inkSoft,
          fontFamily: theme.font.sansSemibold,
          fontSize: 14,
          fontWeight: '600',
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

// Prototype `.chip`: 1.5px hairline pill, sans 14/600, persimmon when `.sel`.
const styles = StyleSheet.create({
  chip: {
    paddingVertical: 11,
    paddingHorizontal: 16,
    borderRadius: 999,
    borderWidth: 1.5,
  },
});
