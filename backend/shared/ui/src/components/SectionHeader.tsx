import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../ThemeProvider';

export function SectionHeader({
  title,
  actionLabel,
  onAction,
}: {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  const theme = useTheme();
  return (
    <View style={styles.row}>
      <Text
        style={{
          fontFamily: theme.font.sans,
          fontSize: 16,
          fontWeight: '600',
          color: theme.color.ink,
        }}
      >
        {title}
      </Text>
      {actionLabel && onAction ? (
        <Pressable onPress={onAction}>
          <Text
            style={{
              fontFamily: theme.font.sans,
              fontSize: 13,
              fontWeight: '500',
              color: theme.color.persimmon,
            }}
          >
            {actionLabel}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
});
