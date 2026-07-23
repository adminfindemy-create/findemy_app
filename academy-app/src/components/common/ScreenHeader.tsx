import { useTheme } from '@findemy/ui';
import { useRouter } from 'expo-router';
import type React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export function ScreenHeader({
  title,
  showBack = false,
  rightAction,
}: {
  title: string;
  showBack?: boolean;
  rightAction?: React.ReactNode;
}) {
  const theme = useTheme();
  const router = useRouter();

  return (
    <View style={[styles.header, { backgroundColor: theme.color.paperWarm }]}>
      {showBack ? (
        <Pressable
          onPress={() => router.back()}
          style={styles.back}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Text style={{ color: theme.color.ink, fontSize: 22 }}>←</Text>
        </Pressable>
      ) : (
        <View style={styles.back} />
      )}
      <Text style={[styles.title, { color: theme.color.ink, fontFamily: theme.font.serif }]}>
        {title}
      </Text>
      <View style={styles.back}>{rightAction}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'transparent',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  back: {
    width: 40,
    alignItems: 'center',
  },
});
