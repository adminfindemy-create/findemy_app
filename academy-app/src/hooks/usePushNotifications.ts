import { useEffect, useRef } from 'react';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { api } from '@/lib/api';
import { useAuth } from '@/stores/auth';
import { useInbox } from '@/stores/inbox';

// appOwnership is deprecated in SDK 53+; executionEnvironment is reliable
const isExpoGo =
  Constants.appOwnership === 'expo' ||
  (Constants as any).executionEnvironment === 'storeClient';

// Dynamically import notifications only in dev/prod builds (not Expo Go)
const Notifications = isExpoGo ? null : (() => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  return require('expo-notifications') as typeof import('expo-notifications');
})();

if (!isExpoGo && Notifications) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

export function usePushNotifications() {
  const router = useRouter();
  // Gate on the stable account id, NOT the access token: the token rotates on
  // every refresh, which would otherwise re-trigger registration each refresh.
  const accountId = useAuth((s) => s.account?.id ?? null);
  const notificationListener = useRef<any>(null);
  const responseListener = useRef<any>(null);
  const registeredToken = useRef<string | null>(null);

  useEffect(() => {
    if (!accountId || isExpoGo || !Notifications) return;

    registerForPushNotificationsAsync().then((token) => {
      if (token) {
        registeredToken.current = token;
        api.push
          .register({ expo_token: token, platform: Platform.OS as 'ios' | 'android' })
          .catch(() => {});
      }
    });

    notificationListener.current = Notifications.addNotificationReceivedListener(
      (notification) => {
        const data = notification.request.content.data;
        console.log('[push] received:', data);
        if (data?.type === 'trial:new') {
          // Bump the unread tab badge. We use the zustand store (not query
          // invalidation) because this hook mounts OUTSIDE QueryClientProvider.
          // The inbox screen's 30s poll + on-focus refetch reconciles the list.
          useInbox.getState().bumpNew();
        }
      }
    );

    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data;
        if (data?.screen === 'inbox') {
          router.push('/(tabs)/inbox');
        } else if (data?.screen === 'reviews') {
          router.push('/reviews');
        }
      }
    );

    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
      const token = registeredToken.current;
      if (token) {
        // Detach this device from the now-logged-out account so it stops
        // receiving push. Best-effort: ignore failures (offline logout).
        api.push.unregister(token).catch(() => {});
        registeredToken.current = null;
      }
    };
  }, [accountId, router]);
}

async function registerForPushNotificationsAsync() {
  if (!Notifications) return null;
  let token;
  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      return null;
    }
    try {
      const projectId =
        Constants.expoConfig?.extra?.eas?.projectId ??
        (Constants as any).easConfig?.projectId;
      const expoPushToken = await Notifications.getExpoPushTokenAsync(
        projectId ? { projectId } : undefined
      );
      token = expoPushToken.data;
    } catch {
      return null;
    }
  }
  if (Platform.OS === 'android') {
    Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#D8492A',
    });
  }
  return token ?? null;
}
