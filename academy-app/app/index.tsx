import { useAuth } from '@/stores/auth';
import { useTheme } from '@findemy/ui';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';

export default function SplashScreen() {
  const router = useRouter();
  const theme = useTheme();
  const accessToken = useAuth((state) => state.accessToken);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (accessToken) {
        router.replace('/(tabs)/studio');
      } else {
        router.replace('/(auth)');
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [accessToken, router]);

  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.color.ivory,
      }}
    >
      <ActivityIndicator color={theme.color.persimmon} />
    </View>
  );
}
