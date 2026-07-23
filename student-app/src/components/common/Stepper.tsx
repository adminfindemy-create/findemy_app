import { useTheme } from '@findemy/ui';
import { StyleSheet, Text, View } from 'react-native';

// Prototype `.step-label` + `.stepbar`: an uppercase caption over a row of
// progress dots (filled up to the current step).
export function Stepper({ step, total, label }: { step: number; total: number; label: string }) {
  const theme = useTheme();
  return (
    <View style={{ marginBottom: 18 }}>
      <Text style={[styles.label, { fontFamily: theme.font.sansBold, color: theme.color.mist }]}>
        {label}
      </Text>
      <View style={styles.bar}>
        {Array.from({ length: total }).map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              { backgroundColor: i < step ? theme.color.persimmon : theme.color.hairline },
            ]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 11, letterSpacing: 1.4, textTransform: 'uppercase', marginBottom: 8 },
  bar: { flexDirection: 'row', gap: 6 },
  dot: { flex: 1, height: 5, borderRadius: 99 },
});
