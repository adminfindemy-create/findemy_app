import React, { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/stores/auth';
import { useTheme } from '@findemy/ui';

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
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.color.ivory }}>
      <ActivityIndicator color={theme.color.persimmon} />
    </View>
  );
}
