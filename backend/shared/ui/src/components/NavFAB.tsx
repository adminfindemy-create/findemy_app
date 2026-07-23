import { TouchableOpacity, View } from 'react-native';
import { useTheme } from '../ThemeProvider';

export function NavFAB({ onPress }: { onPress?: () => void }) {
  const theme = useTheme();
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={{
        position: 'absolute',
        bottom: 32,
        alignSelf: 'center',
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: theme.color.persimmon,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: theme.color.ink,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 4,
      }}
    >
      <View
        style={{
          width: 20,
          height: 20,
          borderRadius: 10,
          backgroundColor: '#fff',
        }}
      />
    </TouchableOpacity>
  );
}
