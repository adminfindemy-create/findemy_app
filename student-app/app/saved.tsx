import React from "react";
import { View, ScrollView, StyleSheet, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import { useTheme } from "@findemy/ui";
import { SafeAreaView } from "react-native-safe-area-context";
import { ScreenHeader } from "@/components/common/ScreenHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { SkeletonCard } from "@/components/common/SkeletonLoader";
import { AcademyCard } from "@/components/academy/AcademyCard";
import { useSavedAcademies, useToggleSavedAcademy } from "@/hooks/useSaved";

export default function SavedScreen() {
  const router = useRouter();
  const theme = useTheme();
  const saved = useSavedAcademies();
  const toggleSave = useToggleSavedAcademy();

  const items = (saved.data as any)?.items ?? [];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.color.paper }} edges={["top"]}>
      <ScreenHeader title="Wishlist" />

      {saved.isLoading ? (
        <View style={styles.body}>
          <SkeletonCard />
          <View style={{ height: 12 }} />
          <SkeletonCard />
        </View>
      ) : items.length === 0 ? (
        <EmptyState
          message="No saved academies yet. Tap ♡ on any academy to add it here."
          actionLabel="Explore academies"
          onAction={() => router.push("/(tabs)")}
        />
      ) : (
        <ScrollView
          contentContainerStyle={styles.body}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={saved.isRefetching}
              onRefresh={() => saved.refetch()}
              tintColor={theme.color.persimmon}
            />
          }
        >
          {items.map((academy: any) => (
            <AcademyCard
              key={academy.id}
              academy={academy}
              onPress={() => router.push(`/academy/${academy.id}`)}
              isSaved
              onToggleSave={(id) => toggleSave.mutate(id)}
            />
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  body: {
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 48,
  },
});
