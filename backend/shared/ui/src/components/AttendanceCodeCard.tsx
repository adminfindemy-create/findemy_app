import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../ThemeProvider';

// Prototype `.otp-box` — the dark card that shows a trial's 4-digit attendance
// code (student shows it to the instructor to be marked present).

export function AttendanceCodeCard({
  code,
  label = 'Attendance code',
  hint,
}: {
  code: string;
  label?: string;
  hint?: string;
}) {
  const theme = useTheme();
  return (
    <View style={[styles.box, { backgroundColor: theme.color.ink }]}>
      <Text style={[styles.label, { fontFamily: theme.font.sansBold }]}>{label.toUpperCase()}</Text>
      <Text style={[styles.value, { fontFamily: theme.font.sansBold }]}>{code.split('').join(' ')}</Text>
      {hint ? <Text style={[styles.hint, { fontFamily: theme.font.sansMedium }]}>{hint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginVertical: 18,
    alignItems: 'center',
  },
  label: {
    fontSize: 10,
    letterSpacing: 1.6,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.6)',
  },
  value: {
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: 8,
    color: '#fff',
    marginTop: 6,
  },
  hint: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.55)',
    marginTop: 8,
  },
});
