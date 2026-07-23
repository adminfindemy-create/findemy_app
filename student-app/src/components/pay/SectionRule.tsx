import { useTheme } from '@findemy/ui';
import { StyleSheet, Text, View } from 'react-native';

// Centered section label with a hairline rule on each side ("— PAYMENT SUMMARY —").
export function SectionRule({ label }: { label: string }) {
  const theme = useTheme();
  return (
    <View style={styles.row}>
      <View style={[styles.rule, { backgroundColor: theme.color.hairline }]} />
      <Text style={[styles.label, { color: theme.color.whisper }]}>{label}</Text>
      <View style={[styles.rule, { backgroundColor: theme.color.hairline }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 24, marginBottom: 12 },
  rule: { flex: 1, height: 1 },
  label: { fontSize: 11, letterSpacing: 1.6, textTransform: 'uppercase', fontWeight: '700' },
});
