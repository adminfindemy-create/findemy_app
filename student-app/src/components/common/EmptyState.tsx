import { Button, useTheme } from '@findemy/ui';
import { StyleSheet, Text, View } from 'react-native';

export function EmptyState({
  message,
  actionLabel,
  onAction,
}: {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  const theme = useTheme();
  return (
    <View style={styles.container}>
      <Text
        style={{
          fontFamily: theme.font.sans,
          fontSize: theme.type.body.size,
          color: theme.color.mist,
          textAlign: 'center',
        }}
      >
        {message}
      </Text>
      {actionLabel && onAction ? (
        <View style={{ marginTop: 16 }}>
          <Button onPress={onAction}>{actionLabel}</Button>
        </View>
      ) : null}
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
