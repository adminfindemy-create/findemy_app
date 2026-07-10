import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../ThemeProvider';

export function Tag({
  label,
  tone = 'ink',
}: {
  label: string;
  tone?: 'jade' | 'marigold' | 'persimmon' | 'rose' | 'ink' | 'bone';
}) {
  const theme = useTheme();
  const bgMap: Record<string, string> = {
    jade: '#1E6F6620',
    marigold: '#C8862A20',
    persimmon: '#EC5A2B20',
    rose: '#C0392B20',
    ink: '#1A161120',
    bone: '#EFE8DA',
  };
  const textMap: Record<string, string> = {
    jade: theme.color.jade,
    marigold: theme.color.marigold,
    persimmon: theme.color.persimmon,
    rose: theme.color.rose,
    ink: theme.color.ink,
    bone: theme.color.inkSoft,
  };

  return (
    <View style={[styles.tag, { backgroundColor: bgMap[tone] }]}>
      <Text style={{ color: textMap[tone], fontFamily: theme.font.sans, fontSize: 11, fontWeight: '600' }}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tag: {
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
});
