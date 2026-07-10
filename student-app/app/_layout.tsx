import { useEffect } from "react";
import { Stack, useRouter, useSegments, useRootNavigationState } from "expo-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useFonts } from "expo-font";
import { ThemeProvider, PhoneStatusBar } from "@findemy/ui";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { ToastProvider } from "@/components/Toast";
import { useAuth } from "@/stores/auth";
import { nextOnboardingStep } from "@/lib/onboarding";

const qc = new QueryClient({
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
  const accessToken = useAuth((s) => s.accessToken);
  const user = useAuth((s) => s.user);

  useEffect(() => {
    // Wait for the root navigator to mount before any redirect.
    if (!navState?.key) return;

    // Defer the actual navigation to the next tick. Even when navState.key is
    // truthy, the navigator's child routes may not have finished registering
    // on the very first effect pass — calling router.replace synchronously
    // throws "Attempted to navigate before mounting the Root Layout component".
    const t = setTimeout(() => {
      const inAuthGroup = segments[0] === "(auth)";

      if (!accessToken) {
        if (!inAuthGroup) {
          router.replace("/(auth)");
        }
        return;
      }

      const step = nextOnboardingStep(user);
      if (step) {
        const currentPath = "/" + segments.join("/");
        if (currentPath !== step) {
          router.replace(step as any);
        }
        return;
      }

      if (inAuthGroup) {
        router.replace("/(tabs)");
      }
    }, 0);

    return () => clearTimeout(t);
  }, [accessToken, user, segments, router, navState?.key]);

  return null;
}

export default function RootLayout() {
  usePushNotifications();

  // Prototype-refresh typefaces. Family keys must match theme.font in
  // @findemy/ui (serif: 'LibreCaslonDisplay', sans: 'PlusJakartaSans'). The
  // weight-suffixed faces are registered so explicit fontFamily references can
  // pick an exact cut; the type ramp mostly drives weight via fontWeight.
  const [fontsLoaded, fontError] = useFonts({
    LibreCaslonDisplay: require("../assets/fonts/LibreCaslonDisplay-Regular.ttf"),
    LibreCaslonText: require("../assets/fonts/LibreCaslonText-Regular.ttf"),
    "LibreCaslonText-Italic": require("../assets/fonts/LibreCaslonText-Italic.ttf"),
    "LibreCaslonText-Bold": require("../assets/fonts/LibreCaslonText-Bold.ttf"),
    PlusJakartaSans: require("../assets/fonts/PlusJakartaSans-Regular.ttf"),
    "PlusJakartaSans-Medium": require("../assets/fonts/PlusJakartaSans-Medium.ttf"),
    "PlusJakartaSans-SemiBold": require("../assets/fonts/PlusJakartaSans-SemiBold.ttf"),
    "PlusJakartaSans-Bold": require("../assets/fonts/PlusJakartaSans-Bold.ttf"),
  });

  useEffect(() => {
    // TODO: Configure Sentry before production
    // import * as Sentry from 'sentry-expo';
    // Sentry.init({ dsn: process.env.EXPO_PUBLIC_SENTRY_DSN, enableInExpoDevelopment: false });
  }, []);

  // Hold the first paint until fonts are ready so screens don't flash in the
  // system fallback before swapping to Libre Caslon / Plus Jakarta Sans. If
  // loading errors, fall through and render with the system fallback rather
  // than blocking the app forever.
  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={qc}>
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
