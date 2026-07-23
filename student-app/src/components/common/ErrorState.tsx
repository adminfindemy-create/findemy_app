import { Button, useTheme } from '@findemy/ui';
import { StyleSheet, Text, View } from 'react-native';

const MESSAGES: Record<string, string> = {
  OTP_INVALID: 'Invalid code. Please try again.',
  OTP_EXPIRED: 'Code expired. Please request a new one.',
  RATE_LIMITED: 'Too many attempts. Try again later.',
  UNAUTHORIZED: 'Session expired. Please log in again.',
  NOT_FOUND: 'Not found.',
  INTERNAL: 'Something went wrong. Please try again.',
};

export function ErrorState({
  code,
  onRetry,
}: {
  code?: string;
  onRetry?: () => void;
}) {
  const theme = useTheme();
  const message = (code && MESSAGES[code]) || MESSAGES.INTERNAL;
  return (
    <View style={styles.container}>
      <Text
        style={{
          fontFamily: theme.font.sans,
          fontSize: theme.type.body.size,
          color: theme.color.mist,
          textAlign: 'center',
          marginBottom: 16,
        }}
      >
        {message}
      </Text>
      {onRetry ? <Button onPress={onRetry}>Retry</Button> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
});
