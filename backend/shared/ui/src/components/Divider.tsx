import { View } from 'react-native';
import { useTheme } from '../ThemeProvider';

export function Divider({ inset = 0 }: { inset?: number }) {
  const theme = useTheme();
  return (
    <View
      style={{
        height: 1,
        backgroundColor: theme.color.hairline,
        marginLeft: inset,
        marginRight: inset,
      }}
    />
  );
}
