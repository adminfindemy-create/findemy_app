import { IconButton, IconChevL, useTheme } from '@findemy/ui';
import { useRouter } from 'expo-router';
import type React from 'react';
import { Text, View } from 'react-native';

// Prototype `.topbar`: a round icon-button back, a left-aligned sans title
// (20/800), then an optional right action pushed to the end.
export function ScreenHeader({
  title,
  showBack = true,
  rightAction,
}: {
  title: string;
  showBack?: boolean;
  rightAction?: React.ReactNode;
}) {
  const theme = useTheme();
  const router = useRouter();

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingHorizontal: 18,
        paddingVertical: 8,
      }}
    >
      {showBack ? (
        <IconButton
          accessibilityLabel="Back"
          onPress={() => router.back()}
          icon={<IconChevL size={20} color={theme.color.ink} />}
        />
      ) : null}
      <Text
        style={{
          flex: 1,
          fontFamily: theme.font.sansBold,
          fontSize: 20,
          fontWeight: '800',
          letterSpacing: -0.2,
          color: theme.color.ink,
        }}
      >
        {title}
      </Text>
      {rightAction ?? null}
    </View>
  );
}
