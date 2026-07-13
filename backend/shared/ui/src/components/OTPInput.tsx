import { useRef, useEffect } from 'react';
import { View, TextInput, StyleSheet } from 'react-native';
import { useTheme } from '../ThemeProvider';

export function OTPInput({
  length = 6,
  value,
  onChange,
  autoFocus = false,
  keyboardType = 'number-pad',
}: {
  length?: number;
  value: string;
  onChange: (val: string) => void;
  autoFocus?: boolean;
  keyboardType?: 'default' | 'number-pad';
}) {
  const theme = useTheme();
  const inputs = useRef<(TextInput | null)[]>([]);

  useEffect(() => {
    if (autoFocus) {
      setTimeout(() => inputs.current[0]?.focus(), 100);
    }
  }, [autoFocus]);

  const handleChange = (text: string, index: number) => {
    const cleaned = text.replace(/\D/g, '');
    const next = value.split('');
    if (cleaned.length === 0) {
      next[index] = '';
    } else if (cleaned.length >= 1) {
      next[index] = cleaned.slice(-1);
    }
    const newValue = next.join('').slice(0, length);
    onChange(newValue);

    if (cleaned.length >= 1 && index < length - 1) {
      inputs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (event: any, index: number) => {
    if (event.nativeEvent.key === 'Backspace' && !value[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  };

  return (
    <View style={styles.row}>
      {Array.from({ length }).map((_, index) => (
        <TextInput
          key={index}
          ref={(el) => { inputs.current[index] = el; }}
          value={value[index] || ''}
          onChangeText={(text) => handleChange(text, index)}
          onKeyPress={(event) => handleKeyPress(event, index)}
          keyboardType={keyboardType}
          maxLength={2}
          selectTextOnFocus
          accessibilityLabel={`Digit ${index + 1} of ${length}`}
          style={[
            styles.cell,
            {
              borderColor: value[index] ? theme.color.persimmon : theme.color.hairline,
              backgroundColor: theme.color.ivory,
              color: theme.color.ink,
              fontFamily: theme.font.sansBold,
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  cell: {
    // Prototype `.otp-input input`: 48×56 pill-ish cell, big bold tabular figure.
    flex: 1,
    maxWidth: 52,
    height: 56,
    borderWidth: 1.5,
    borderRadius: 14,
    textAlign: 'center',
    fontSize: 22,
    fontWeight: '800',
  },
});
