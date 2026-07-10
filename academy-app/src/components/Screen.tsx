import React from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, NAV_BAR_HEIGHT } from '@findemy/ui';
export { ScreenHeader } from './ScreenHeader';

export function Screen({
  children,
  header,
  footer,
  bottomTab,
  scroll = true,
}: {
  children: React.ReactNode;
  header?: React.ReactNode;
  /** Optional sticky bottom action bar (prototype `.action-bar`). Clears the home indicator. */
  footer?: React.ReactNode;
  bottomTab?: 'inbox' | 'studio' | 'schedule' | 'students' | 'workshops' | 'settings' | null;
  scroll?: boolean;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  // When this screen sits under the floating NavBar (a tab name), reserve the
  // bar's height so content/buttons aren't hidden behind it. Otherwise just
  // clear the home indicator with the bottom safe-area inset (+ a little slack).
  const bottomPad = bottomTab ? NAV_BAR_HEIGHT + 8 : insets.bottom + 16;
  const containerStyle = [
    styles.content,
    { backgroundColor: theme.color.paperWarm },
  ];
  const padStyle = { paddingBottom: bottomPad };

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: theme.color.paperWarm }]} edges={['top']}>
      {header}
      {scroll ? (
        <ScrollView style={containerStyle} contentContainerStyle={padStyle}>
          {children}
        </ScrollView>
      ) : (
        <View style={[containerStyle, padStyle]}>{children}</View>
      )}
      {footer ? (
        <View
          style={[
            styles.footer,
            { backgroundColor: theme.color.paperWarm, borderTopColor: theme.color.hairline, paddingBottom: insets.bottom + 10 },
          ]}
        >
          {footer}
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 10,
    borderTopWidth: 1,
  },
});
