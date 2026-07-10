import { useEffect, useRef } from "react";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
import { Platform } from "react-native";
import { useRouter } from "expo-router";
import { api } from "@/lib/api";
import { useAuth } from "@/stores/auth";
import { tokens } from "@findemy/ui";

// Not supported in Expo Go SDK 53+
const isExpoGo = Constants.appOwnership === "expo";

if (!isExpoGo) {
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
  const accessToken = useAuth((s) => s.accessToken);
  const notificationListener = useRef<Notifications.Subscription | null>(null);
  const responseListener = useRef<Notifications.Subscription | null>(null);

  useEffect(() => {
    if (!accessToken || isExpoGo) return;

    registerForPushNotificationsAsync()
      .then((token) => {
        if (token) {
          useAuth.getState().setPushPermissionDenied(false);
          api.push
            .register({ expo_token: token, platform: Platform.OS as "ios" | "android" })
            .catch((err) => {
              console.warn("[push] token registration failed:", err);
            });
        } else {
          // Device returned no token → permission denied or unsupported.
          useAuth.getState().setPushPermissionDenied(true);
        }
      })
      .catch((err) => {
        console.warn("[push] permission request failed:", err);
        useAuth.getState().setPushPermissionDenied(true);
      });

    notificationListener.current = Notifications.addNotificationReceivedListener(
      (notification) => {
        const data = notification.request.content.data;
        console.log("[push] received:", data);
      }
    );

    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data;
        if (data?.screen === "trials" || data?.screen === "bookings") {
          // S5.1: the orphaned /trials index was removed; trials live under /bookings.
          router.push("/bookings");
        } else if (data?.screen === "classes") {
          router.push("/(tabs)/classes");
        } else if (data?.screen === "academy" && data?.academyId) {
          router.push(`/academy/${data.academyId}`);
        }
      }
    );

    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, [accessToken]);
}

async function registerForPushNotificationsAsync() {
  if (!Device.isDevice) return null;

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== "granted") return null;

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: tokens.color.persimmon,
    });
  }

  try {
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      (Constants as any).easConfig?.projectId;
    const expoPushToken = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    );
    return expoPushToken.data;
  } catch {
    return null;
  }
}
