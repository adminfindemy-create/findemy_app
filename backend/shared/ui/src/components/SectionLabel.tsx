import { type StyleProp, StyleSheet, Text, type TextStyle } from 'react-native';
import { useTheme } from '../ThemeProvider';

// Prototype `.block h3` — the small uppercase grey heading that labels each
// section (CLASS DETAILS, PLAN & BILLING, MANAGE CLASS, …).

export function SectionLabel({
  children,
  style,
}: {
  children: string;
  style?: StyleProp<TextStyle>;
}) {
  const theme = useTheme();
  return (
    <Text
      style={[styles.label, { color: theme.color.whisper, fontFamily: theme.font.sansBold }, style]}
    >
      {children.toUpperCase()}
    </Text>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: 11,
    letterSpacing: 1.1,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginTop: 18,
    marginBottom: 10,
  },
});
