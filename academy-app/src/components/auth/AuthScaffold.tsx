import { IconButton, IconChevL, useTheme } from '@findemy/ui';
import { useRouter } from 'expo-router';
import type React from 'react';
import { ScrollView, type StyleProp, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Academy-local twin of the student-app AuthScaffold: a `.topbar` back button
// over a scrolling body on warm paper. Mirrors the prototype auth flow. Kept
// academy-local (not shared) so the student screens are never disturbed.
export function AuthScaffold({
  showBack = true,
  onBack,
  scroll = true,
  contentStyle,
  footer,
  children,
}: {
  showBack?: boolean;
  onBack?: () => void;
  scroll?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
  /** Pinned bottom bar (rendered outside the scroller). */
  footer?: React.ReactNode;
  children: React.ReactNode;
}) {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const Body = scroll ? ScrollView : View;

  return (
    <View style={[styles.root, { backgroundColor: theme.color.paperWarm, paddingTop: insets.top }]}>
      {showBack ? (
        <View style={styles.topbar}>
          <IconButton
            accessibilityLabel="Back"
            onPress={
              onBack ?? (() => (router.canGoBack() ? router.back() : router.replace('/(auth)')))
            }
            icon={<IconChevL size={20} color={theme.color.ink} />}
          />
        </View>
      ) : null}
      <Body
        style={{ flex: 1 }}
        contentContainerStyle={[
          { paddingHorizontal: 22, paddingBottom: 32 },
          !showBack && { paddingTop: 12 },
          contentStyle,
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {children}
      </Body>
      {footer}
    </View>
  );
}

/** Big serif display heading (prototype auth `h1`). */
export function AuthHeading({ children, size = 32 }: { children: React.ReactNode; size?: number }) {
  const theme = useTheme();
  return (
    <Text
      style={{
        fontFamily: theme.font.serif,
        fontSize: size,
        lineHeight: size * 1.04,
        fontWeight: '400',
        color: theme.color.ink,
      }}
    >
      {children}
    </Text>
  );
}

/** Italic-persimmon emphasis span inside an AuthHeading. */
export function Em({ children }: { children: React.ReactNode }) {
  const theme = useTheme();
  return (
    <Text style={{ fontFamily: theme.font.serifItalic, color: theme.color.persimmon }}>
      {children}
    </Text>
  );
}

/** Muted body paragraph under a heading. */
export function AuthSub({ children }: { children: React.ReactNode }) {
  const theme = useTheme();
  return (
    <Text
      style={{
        fontFamily: theme.font.sans,
        fontSize: 14,
        lineHeight: 20,
        color: theme.color.mist,
        marginTop: 10,
      }}
    >
      {children}
    </Text>
  );
}

/** Small uppercase dark pill kicker (prototype `.badge.b-ink`, e.g. STUDIO). */
export function AuthBadge({ children }: { children: React.ReactNode }) {
  const theme = useTheme();
  return (
    <View style={[styles.badge, { backgroundColor: theme.color.ink }]}>
      <Text
        style={{
          fontFamily: theme.font.sansBold,
          fontSize: 10,
          letterSpacing: 1.6,
          textTransform: 'uppercase',
          color: theme.color.marigold,
        }}
      >
        {children}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  topbar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingTop: 6,
    paddingBottom: 2,
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
});
