import { ToastProvider } from '@/components/common/Toast';
import { useAuth } from '@/stores/auth';
import { PhoneStatusBar, ThemeProvider } from '@findemy/ui';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { Stack, useRootNavigationState, useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
      gcTime: 5 * 60_000,
    },
  },
});

function AuthGuard() {
  const router = useRouter();
  const segments = useSegments();
  const navState = useRootNavigationState();
  const accessToken = useAuth((state) => state.accessToken);
  const academy = useAuth((state) => state.academy);
  const hasHydrated = useAuth((state) => state._hasHydrated);

  useEffect(() => {
    if (!navState?.key) return;
    // Don't route off a not-yet-rehydrated store: SecureStore is async and
    // accessToken reads null on first frame, which would falsely log the user out.
    if (!hasHydrated) return;

    const timer = setTimeout(() => {
      const inAuthGroup = segments[0] === '(auth)';
      const onOnboarding = (segments as string[]).includes('onboarding');

      if (!accessToken) {
        if (!inAuthGroup) {
          router.replace('/(auth)');
        }
        return;
      }

      // Mirror exactly what onboarding requires of the user: an academy with a
      // name and category. (address is derived server-side from city and is not
      // a user-entered required field, so it must not gate the guard.)
      const academyComplete = !!(academy?.name && academy.category);

      if (!academyComplete) {
        if (!onOnboarding) {
          router.replace('/(auth)/onboarding');
        }
        return;
      }

      if (inAuthGroup) {
        router.replace('/(tabs)/studio');
      }
    }, 0);

    return () => clearTimeout(timer);
  }, [accessToken, academy, segments, router, navState?.key, hasHydrated]);

  return null;
}

export default function RootLayout() {
  // Prototype-refresh typefaces. Family keys must match theme.font in
  // @findemy/ui (serif: 'LibreCaslonDisplay', sans: 'PlusJakartaSans'). Without
  // this the whole admin app silently renders in the system fallback.
  const [fontsLoaded, fontError] = useFonts({
    LibreCaslonDisplay: require('../assets/fonts/LibreCaslonDisplay-Regular.ttf'),
    LibreCaslonText: require('../assets/fonts/LibreCaslonText-Regular.ttf'),
    'LibreCaslonText-Italic': require('../assets/fonts/LibreCaslonText-Italic.ttf'),
    'LibreCaslonText-Bold': require('../assets/fonts/LibreCaslonText-Bold.ttf'),
    PlusJakartaSans: require('../assets/fonts/PlusJakartaSans-Regular.ttf'),
    'PlusJakartaSans-Medium': require('../assets/fonts/PlusJakartaSans-Medium.ttf'),
    'PlusJakartaSans-SemiBold': require('../assets/fonts/PlusJakartaSans-SemiBold.ttf'),
    'PlusJakartaSans-Bold': require('../assets/fonts/PlusJakartaSans-Bold.ttf'),
  });

  // Hold the first paint until fonts are ready so screens don't flash in the
  // system fallback. On load error, fall through rather than block forever.
  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider mode="light">
          <ToastProvider>
            <PhoneStatusBar />
            <Stack screenOptions={{ headerShown: false }} />
            <AuthGuard />
          </ToastProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
