import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../ThemeProvider';

export function Avatar({
  initial,
  tone = 'persimmon',
  size = 'md',
}: {
  initial: string;
  tone?: 'persimmon' | 'jade' | 'marigold' | 'rose' | 'plum' | 'ink';
  size?: 'sm' | 'md' | 'lg' | 'xl';
}) {
  const theme = useTheme();
  const sizeMap = { sm: 28, md: 40, lg: 56, xl: 72 };
  const fontMap = { sm: 12, md: 16, lg: 22, xl: 28 };
  const toneMap: Record<string, string> = {
    persimmon: theme.color.persimmon,
    jade: theme.color.jade,
    marigold: theme.color.marigold,
    rose: theme.color.rose,
    plum: theme.color.plum,
    ink: theme.color.ink,
  };
  const sizePx = sizeMap[size];

  return (
    <View
      style={[
        styles.circle,
        {
          width: sizePx,
          height: sizePx,
          borderRadius: sizePx / 2,
          backgroundColor: toneMap[tone] + '20',
        },
      ]}
    >
      <Text style={{ color: toneMap[tone], fontSize: fontMap[size], fontWeight: '600', fontFamily: theme.font.sans }}>
        {initial.slice(0, 1).toUpperCase()}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  circle: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
