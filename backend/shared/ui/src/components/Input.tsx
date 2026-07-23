import type React from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { useTheme } from '../ThemeProvider';

// Prototype `.field` (label) + `.input` / `.input-group` (with a `.pre` prefix).
export function Input({
  value,
  onChangeText,
  placeholder,
  label,
  required,
  prefix,
  error,
  multiline = false,
  keyboardType,
  secureTextEntry,
  autoFocus,
  editable,
  maxLength,
  numberOfLines,
}: {
  value?: string;
  onChangeText?: (text: string) => void;
  placeholder?: string;
  /** Field label rendered above the input (`.field label`). */
  label?: string;
  /** Appends a persimmon required asterisk to the label. */
  required?: boolean;
  prefix?: React.ReactNode;
  error?: string;
  multiline?: boolean;
  keyboardType?: 'default' | 'number-pad' | 'phone-pad' | 'decimal-pad';
  numberOfLines?: number;
  secureTextEntry?: boolean;
  autoFocus?: boolean;
  editable?: boolean;
  maxLength?: number;
}) {
  const theme = useTheme();
  return (
    <View style={styles.wrapper}>
      {label ? (
        <Text
          style={[styles.label, { color: theme.color.inkSoft, fontFamily: theme.font.sansBold }]}
        >
          {label}
          {required ? <Text style={{ color: theme.color.persimmon }}> *</Text> : null}
        </Text>
      ) : null}
      <View
        style={[
          styles.container,
          {
            borderColor: error ? theme.color.rose : theme.color.hairline,
            backgroundColor: '#fff',
          },
        ]}
      >
        {prefix ? (
          <View
            style={[
              styles.prefix,
              { borderRightColor: theme.color.hairline, backgroundColor: theme.color.paperWarm },
            ]}
          >
            {prefix}
          </View>
        ) : null}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          multiline={multiline}
          numberOfLines={numberOfLines}
          keyboardType={keyboardType}
          secureTextEntry={secureTextEntry}
          autoFocus={autoFocus}
          editable={editable}
          maxLength={maxLength}
          style={[
            styles.input,
            {
              color: theme.color.ink,
              fontFamily: theme.font.sans,
              minHeight: multiline ? 80 : 50,
              paddingHorizontal: prefix ? 15 : 15,
            },
          ]}
          placeholderTextColor={theme.color.whisper}
        />
      </View>
      {error ? (
        <Text style={[styles.error, { color: theme.color.rose, fontFamily: theme.font.sans }]}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { width: '100%' },
  label: {
    fontSize: 12.5,
    fontWeight: '700',
    marginBottom: 7,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 14,
    overflow: 'hidden',
  },
  prefix: {
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRightWidth: 1,
    alignSelf: 'stretch',
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 14,
  },
  error: {
    fontSize: 12,
    marginTop: 6,
  },
});
