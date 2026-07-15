import React from "react";
import { View, Text, ScrollView, Pressable, StyleSheet, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import { useTheme } from "@findemy/ui";
import { SafeAreaView } from "react-native-safe-area-context";
import { formatDistanceToNow } from "date-fns";
import { ScreenHeader } from "@/components/common/ScreenHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { SkeletonLoader } from "@/components/common/SkeletonLoader";
import {
  useNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
} from "@/hooks/useNotifications";

// M5.1: notification inbox. Deep-linking by `data.screen` is intentionally
// limited to routes that already exist in this app — anything else just marks
// read without navigating away.
const SCREEN_ROUTES: Record<string, string> = {
  classes: "/(tabs)/classes",
  batches: "/(tabs)/classes",
  enrollments: "/(tabs)/classes",
  trials: "/bookings",
  bookings: "/bookings",
  events: "/(tabs)/events",
  workshops: "/(tabs)/events",
  reviews: "/(tabs)/classes",
};

export default function NotificationsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const notifications = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  const items = (notifications.data as any)?.items ?? [];
  const unreadCount = (notifications.data as any)?.unread_count ?? 0;

  const handlePress = (item: any) => {
    if (!item.read) markRead.mutate(item.id);
    const screen = item?.data?.screen;
    const route = screen ? SCREEN_ROUTES[screen] : undefined;
    if (route) router.push(route as any);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.color.paper }} edges={["top"]}>
      <ScreenHeader
        title="Notifications"
        rightAction={
          unreadCount > 0 ? (
            <Pressable onPress={() => markAllRead.mutate()} hitSlop={8}>
              <Text style={{ fontFamily: theme.font.sansSemibold, fontSize: 13, color: theme.color.persimmon }}>
                Mark all read
              </Text>
            </Pressable>
          ) : null
        }
      />

      {notifications.isLoading ? (
        <View style={{ paddingHorizontal: 20, gap: 12 }}>
          {[0, 1, 2].map((index) => (
            <SkeletonLoader key={index} height={72} borderRadius={16} />
          ))}
        </View>
      ) : notifications.isError ? (
        <ErrorState onRetry={() => notifications.refetch()} />
      ) : items.length === 0 ? (
        <EmptyState message="No notifications yet. Class reminders and renewal alerts will show up here." />
      ) : (
        <ScrollView
          contentContainerStyle={styles.body}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={notifications.isRefetching}
              onRefresh={() => notifications.refetch()}
              tintColor={theme.color.persimmon}
            />
          }
        >
          {items.map((item: any) => (
            <Pressable
              key={item.id}
              onPress={() => handlePress(item)}
              style={[
                styles.row,
                {
                  backgroundColor: item.read ? theme.color.paper : theme.color.ivory,
                  borderColor: theme.color.hairline,
                },
              ]}
            >
              {!item.read && (
                <View style={[styles.dot, { backgroundColor: theme.color.persimmon }]} />
              )}
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontFamily: item.read ? theme.font.sansMedium : theme.font.sansBold,
                    fontSize: 14.5,
                    color: theme.color.ink,
                  }}
                  numberOfLines={2}
                >
                  {item.title}
                </Text>
                <Text
                  style={{
                    fontFamily: theme.font.sans,
                    fontSize: 13,
                    color: theme.color.mist,
                    marginTop: 3,
                  }}
                  numberOfLines={3}
                >
                  {item.body}
                </Text>
                <Text
                  style={{
                    fontFamily: theme.font.sans,
                    fontSize: 11,
                    color: theme.color.whisper,
                    marginTop: 6,
                  }}
                >
                  {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                </Text>
              </View>
            </Pressable>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  body: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 48,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
  },
});
