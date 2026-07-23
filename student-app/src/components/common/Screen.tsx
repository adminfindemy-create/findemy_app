import { useTheme } from '@findemy/ui';
import type React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function Screen({
  children,
  header,
  scroll = true,
  style,
}: {
  children: React.ReactNode;
  header?: React.ReactNode;
  scroll?: boolean;
  style?: any;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const Wrapper = scroll ? ScrollView : View;

  return (
    <View style={[styles.root, { backgroundColor: theme.color.ivory, paddingTop: insets.top }]}>
      {header}
      <Wrapper style={[{ flex: 1 }, style]} contentContainerStyle={scroll && { paddingBottom: 24 }}>
        {children}
      </Wrapper>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
