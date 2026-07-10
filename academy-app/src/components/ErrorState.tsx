import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme, Button } from '@findemy/ui';

const MESSAGES: Record<string, string> = {
  OTP_MISMATCH: 'Wrong code. Try again.',
  RATE_LIMITED: 'Too many attempts. Please wait.',
  UNAUTHORIZED: 'Session expired. Please log in again.',
  NOT_FOUND: 'Not found.',
  VALIDATION: 'Please check your input.',
  INTERNAL: 'Something went wrong. Try again.',
};

export function ErrorState({
  code,
  message,
  onRetry,
}: {
  code?: string;
  /** Explicit human message; wins over the code map. Use for server messages or screen-specific copy. */
  message?: string;
  onRetry?: () => void;
}) {
  const theme = useTheme();
  const resolved = message || (code && MESSAGES[code]) || MESSAGES.INTERNAL;

  return (
    <View style={styles.container}>
      <Text style={{ color: theme.color.ink, fontFamily: theme.font.sans, fontSize: 15, marginBottom: 12 }}>
        {resolved}
      </Text>
      {onRetry && <Button onPress={onRetry}>Retry</Button>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
